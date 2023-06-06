class Defog {
  constructor(api_key, db_type = "postgres", db_creds = null) {
    this.api_key = api_key;
    this.db_type = db_type;
    this.db_creds = db_creds;
  }

  async executeQuery(query) {
    if (query.ran_successfully) {
      console.log("Query generated, now running it on your database...");
      if (query.query_db === "postgres") {
        const pg = require('pg');
        const client = new pg.Client(this.db_creds);
        await client.connect();
        const res = await client.query(query.query_generated);
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
      } else if (query.query_db == "redshift") {
        const pg = require('pg');
        const client = new pg.Client(this.db_creds);
        await client.connect();
        const res = await client.query(query.query_generated);
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
  
        const connection = mysql.createConnection(this.db_creds);
        connection.connect();
        const queryAsync = util.promisify(connection.query).bind(connection);
        const res = await queryAsync(query.query_generated);
        console.log("Query ran succesfully!")
        console.log(res);
        const colnames = Object.keys(res[0]);
        const rows = res;
        const data = rows.map(row => Object.values(row));
        connection.end();
        return {
          columns: colnames,
          data: data,
          ran_successfully: true,
          ...query
        };
      } else if (query.query_db === "bigquery") {
        const bigquery = require('@google-cloud/bigquery');
        process.env.GOOGLE_APPLICATION_CREDENTIALS = this.db_creds?.json_key_path;
        const client = new bigquery.BigQuery();
        const [job] = await client.createQueryJob({
          query: query.query_generated,
        });
        const [rows] = await job.getQueryResults();
        console.log(rows);
        const colnames = Object.keys(rows[0]);
        const data = rows.map(row => Object.values(row));
        
        console.log("Query ran succesfully!")
        return {
          columns: colnames,
          data: data,
          ran_successfully: true,
          ...query
        };
      }
    } else {
      console.log("This database is not yet supported in our node library. Sorry about that.");
      return {
        ran_successfully: false,
        error_message: "This database is not yet supported in our node library. Sorry about that.",
      }
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
        "ran_successfully": False,
        "error_message": "Sorry :( Our server is at capacity right now and we are unable to process your query. Please try again in a few minutes?",
      };
    }
  }
  
  async runQuery(question, hard_filters = null, previous_context = null) {
    console.log("generating the query for your question...");
    const query = await this.getQuery(question, hard_filters, previous_context);
    const results = await this.executeQuery(query);
    return results;
  }
}

module.exports = Defog;