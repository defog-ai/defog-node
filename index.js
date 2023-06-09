class Defog {
  constructor(api_key, db_type = "postgres", db_creds = null) {
    this.api_key = api_key;
    this.db_type = db_type;
    this.db_creds = db_creds;
  }

  async updateGlossary(glossary) {
    const fetch = require('cross-fetch');
    const payload = {
      "api_key": this.api_key,
      "glossary": glossary,
    }
    const res = await fetch("https://api.defog.ai/update_glossary", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    const resp = await res.json();
    return resp;
  }

  async retryQuery(client, question, query, err_msg) {
    const fetch = require('cross-fetch');
    console.log("There was an error when running the previous query. Retrying with adaptive learning...")
    console.log(err_msg);

    // log the error to Defog servers for better error tracking
    try {
      const loggingPayload = {
        "api_key": this.api_key,
        "feedback": "bad",
        "text": err_msg,
        "db_type": this.db_type,
        "question": question,
        "query": query,
      };
      
      await fetch("https://api.defog.ai/feedback", {
        method: "POST",
        body: JSON.stringify(loggingPayload),
      });
    } catch (err) {
      // pass
    }

    const payload = {
      "api_key": this.api_key,
      "previous_query": query,
      "error": err_msg,
      "db_type": this.db_type,
      "question": question,
    }
    const res = await fetch("https://api.defog.ai/retry_query_after_error", {
      method: "POST",
      body: JSON.stringify(payload),
    })
    const resp = await res.json();
    const new_query = resp.new_query;
    try {
      if (this.db_type === "postgres" || this.db_type === "redshift") {
        const data = await client.query(new_query);
        return {data: data, newQuery: new_query};
      } else if (this.db_type === "mysql") {
        const queryAsync = util.promisify(client.query).bind(client);
        const data = await queryAsync(new_query);
        return {data: data, newQuery: new_query};
      } else if (this.db_type === "bigquery") {
        const [job] = await client.createQueryJob({
          query: new_query,
        });
        const [rows] = await job.getQueryResults();
        return {data: rows, newQuery: new_query};
      } else {
        throw new Error("This database is not yet supported in our node library. Sorry about that.");
      }
    } catch (err) {
      try {
        client.close()
      } catch (err) {
      }
      console.log("The generated query resulted in an error when run on your database.\n" + err.message);
      return {data: null, newQuery: null, error: err.message};
    }
  }

  async executeQuery(query, question) {
    if (query.ran_successfully) {
      console.log("Query generated, now running it on your database...");
      
      if (query.query_db === "postgres") {
        const pg = require('pg');
        let client;
        let res;

        // connect to the database
        try {
          client = new pg.Client(this.db_creds);
          await client.connect();
        } catch (err) {
          throw new Error("Unable to connect to your database. Please check your credentials and try again.");
        }
        
        try {
          res = await client.query(query.query_generated);
        } catch (error) {
          const {data, newQuery} = await this.retryQuery(client, question, query.query_generated, error.message);
          res = data;
          query.query_generated = newQuery;
          if (!query.query_generated) {
            return {
              ran_successfully: false,
              error_message: "The query could not be executed on your server",
              query_generated: query.query_generated,
            }
          }
        }
        
        const colnames = res.fields.map(f => f.name);
        const data = res.rows;
        client.end();
        
        return {
          columns: colnames,
          data: data,
          ran_successfully: true,
          ...query
        };
      } else if (query.query_db == "redshift") {
        let client;
        // connect to the database
        try {
          const pg = require('pg');
          client = new pg.Client(this.db_creds);
          await client.connect();
        } catch (err) {
          throw new Error("Unable to connect to your database. Please check your credentials and try again.");
        }

        // run the query
        let res;
        try {
          res = await client.query(query.query_generated);
        } catch(error) {
          const {data, newQuery} = await this.retryQuery(client, question, query.query_generated, error.message);
          res = data;
          query.query_generated = newQuery;
          if (!query.query_generated) {
            return {
              ran_successfully: false,
              error_message: "The query could not be executed on your server",
              query_generated: query.query_generated,
            }
          }
        }
        
        const colnames = res.fields.map(f => f.name);
        const data = res.rows;
        client.end();
        
        console.log("Query ran succesfully!");
        
        return {
          columns: colnames,
          data: data,
          ran_successfully: true,
          ...query
        };
      } else if (query.query_db === "mysql") {
        const mysql = require('mysql');
        const util = require('util');

        let connection;
        try {
          const connection = mysql.createConnection(this.db_creds);
          connection.connect();
        } catch (err) {
          throw new Error("Unable to connect to your database. Please check your credentials and try again.");
        }

        let res;
        let queryAsync;
        try {
          queryAsync = util.promisify(connection.query).bind(connection);
          res = await queryAsync(query.query_generated);
          connection.end();
        } catch (error) {
          const {data, newQuery} = await this.retryQuery(connection, question, query.query_generated, error.message);
          res = data;
          query.query_generated = newQuery;
          if (!query.query_generated) {
            return {
              ran_successfully: false,
              error_message: "The query could not be executed on your server",
              query_generated: query.query_generated,
            }
          }
        }
        
        let colnames;
        let data;

        if (res && res.length > 0) {
          colnames = Object.keys(res[0]);
          data = res.map(row => Object.values(row));
        } else {
          colnames = [];
          data = [];
        }
        return {
          columns: colnames,
          data: data,
          ran_successfully: true,
          ...query
        };
      } else if (query.query_db === "bigquery") {
        const bigquery = require('@google-cloud/bigquery');
        const client = new bigquery.BigQuery();
        
        let res;
        try {
          const [job] = await client.createQueryJob({
            query: query.query_generated,
          });
          const [rows] = await job.getQueryResults();
          res = rows;
        } catch(error) {
          const {data, newQuery} = await this.retryQuery(client, question, query.query_generated, error.message);
          res = data;
          query.query_generated = newQuery;
          if (!query.query_generated) {
            return {
              ran_successfully: false,
              error_message: "The query could not be executed on your server",
              query_generated: query.query_generated,
            }
          }
        }

        let colnames;
        let data;
        if (res && res.length > 0) {
          colnames = Object.keys(res[0]);
          data = res.map(row => Object.values(row));
        } else {
          colnames = [];
          data = [];
        }
        
        return {
          columns: colnames,
          data: data,
          ran_successfully: true,
          ...query
        };
      } else {
        console.log("This database is not yet supported in our node library. Sorry about that.");
        return {
          ran_successfully: false,
          error_message: "This database is not yet supported in our node library. Sorry about that.",
        }
      }
    } else {
      console.log(query.error_message);
    }
  }

  async getQuery(question, hard_filters = null, previous_context = null) {
    const fetch = require('cross-fetch');
    try {
      const res = await fetch("https://api.defog.ai/generate_query_chat", {
        method: "POST",
        body: JSON.stringify({
          question: question,
          api_key: this.api_key,
          hard_filters: hard_filters,
          db_type: this.db_type,
          previous_context: previous_context,
          client: "node"
        }),
        headers: { "Content-Type": "application/json" }
      });
      const resp = await res.json();
      const query_generated = resp.sql;
      return {
          query_generated: query_generated,
          ran_successfully: resp.ran_successfully,
          error_message: resp.error_message,
          previous_context: resp.previous_context,
          reason_for_query: resp.reason_for_query,
          query_db: this.db_type,
      };
    } catch (err) {
      return {
        "ran_successfully": false,
        "error_message": "Sorry :( Our server is at capacity right now and we are unable to process your query. Please try again in a few minutes?",
      };
    }
  }
  
  async runQuery(question, hard_filters = null, previous_context = null) {
    console.log("generating the query for your question...");
    const query = await this.getQuery(question, hard_filters, previous_context);
    console.log(query.query_generated);
    const results = await this.executeQuery(query, question);
    if (results && results.ran_successfully) {
      console.log("query ran successfully!");
    } else {
      console.log("query failed");
    }
    return results;
  }
}

module.exports = Defog;