import fetch from 'node-fetch';

module.exports = class Defog {
  constructor(api_key, db_type = "postgres", db_creds = null) {
  this.api_key = api_key;
  this.db_type = db_type;
  this.db_creds = db_creds;
  }

  async generatePostgresSchema(tables) {
  try {
    const { Client } = require("pg");
  } catch {
    throw "pg not installed.";
  }

  const client = new Client(this.db_creds);
  await client.connect();
  const schemas = {};

  console.log("Getting schema for each tables in your database...");
  tables.forEach(table_name => {
    client.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = $1;", [table_name], (err, res) => {
      if (err) throw err;
      let rows = res.rows;
      rows = rows.map(row => {
        return { column_name: row.column_name, data_type: row.data_type };
      });
      schemas[table_name] = rows;
    });
  });
  client.end();

  console.log("Sending the schema to the defog servers and generating a Google Sheet. This might take up to 2 minutes...");
  return fetch("https://api.defog.ai/get_postgres_schema_gsheets", {
    method: "POST",
    body: JSON.stringify({
    api_key: this.api_key,
    schemas: schemas
    }),
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json())
    .then(resp => {
    try {
      var gsheet_url = resp.sheet_url;
      return gsheet_url;
    } catch (e) {
      console.log(resp);
      throw resp.message;
    }
    });
  }

  updatePostgresSchema(gsheet_url) {
  return fetch("https://api.defog.ai/update_postgres_schema", {
    method: "POST",
    body: JSON.stringify({
    api_key: this.api_key,
    gsheet_url: gsheet_url
    }),
    headers: { "Content-Type": "application/json" }
  })
    .then(res => res.json());
  }

  getQuery(question, hard_filters = null) {
    return fetch("https://api.defog.ai/generate_query", {
      method: "POST",
      body: JSON.stringify({
        question: question,
        api_key: this.api_key,
        hard_filters: hard_filters,
        db_type: this.db_type
      }),
      headers: { "Content-Type": "application/json" }
    })
      .then(res => res.json())
      .then(resp => {
        return {
          query_generated: resp.query_generated,
          ran_successfully: resp.ran_successfully,
          error_message: resp.error_message,
          query_db: resp.query_db || 'postgres'
        };
      });
  }
  
  runQuery(question, hard_filters = null) {
    console.log("generating the query for your question...");
    return this.getQuery(question, hard_filters).then(async(query) => {
      if (query.ran_successfully) {
        console.log("Query generated, now running it on your database...");
        if (query.query_db === "postgres") {
          var pg = require('pg');
          var client = new pg.Client(this.db_creds);
          await client.connect();
          return client.query(query.query_generated)
            .then(res => {
              var colnames = res.fields.map(f => f.name);
              var data = res.rows;
              client.end();
              console.log("Query ran succesfully!");
              return {
                columns: colnames,
                data: data,
                query_generated: query.query_generated,
                ran_successfully: true
              };
            })
            .catch(err => {
              console.log(`Query generated was: ${query.query_generated}`);
              console.log(`There was an error ${err} when running the previous query.`);
              return {
                ran_successfully: false,
                error_message: err,
              }
            });
        }
      } else {
        console.log("We could not generate the query...");
        return {
          ran_successfully: false,
          error_message: query.error_message,
        }
      }
    });
  }
}