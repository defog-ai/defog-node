class Defog {
  constructor(api_key, db_type = "postgres", db_creds = null) {
    this.api_key = api_key;
    this.db_type = db_type;
    this.db_creds = db_creds;
  }

  async generatePostgresSchema(tables) {
    const pg = require('pg');
    const client = new pg.Client(this.db_creds);
    await client.connect();
    const schemas = {};

    console.log("Getting schema for each tables in your database...");
    for (const table_name of tables) {
      const generated_query = `SELECT column_name, data_type FROM information_schema.columns WHERE table_name = '${table_name}';`;
      const res = await client.query(generated_query);
      let rows = res.rows;
      rows = rows.map(row => {
        return { column_name: row.column_name, data_type: row.data_type };
      });
      schemas[table_name] = rows;
    }
    client.end();

    console.log("Sending the schema to the defog servers and generating a Google Sheet. This might take up to 2 minutes...");
    const res = fetch("https://api.defog.ai/get_postgres_schema_gsheets", {
      method: "POST",
      body: JSON.stringify({
        api_key: this.api_key,
        schemas: schemas
      }),
      headers: { "Content-Type": "application/json" }
    })
    const resp = await res.json();
    try {
      const gsheet_url = resp.sheet_url;
      return gsheet_url;
    } catch (e) {
      console.log(resp);
      throw resp.message;
    }
  }

  async generateMongoSchema(collections) {
    const MongoClient = require('mongodb').MongoClient;
    const client = new MongoClient(this.db_creds['connection_string'], { useNewUrlParser: true });
    try {
      await client.connect();
      const db = client.db();
      const schemas = {};
      console.log("Getting schema for each collections in your database...");
      for (const collectionName of collections) {
        const collection = db.collection(collectionName);
        const rows = await collection.findOne();
        const rowsData =[];
        for(const i in rows) {
          rowsData.push({"field_name": i, "data_type": Array.isArray(rows[i]) ? 'array' : typeof rows[i]});
        }
        schemas[collection_name] = rowsData;
      }
      client.close();
      console.log("Sending the schema to the defog servers and generating a Google Sheet. This might take up to 2 minutes...");
      request.post("https://api.defog.ai/get_mongo_schema_gsheets", {
        json: {
          "api_key": this.api_key,
          "schemas": schemas
        }
      }, (error, response, body) => {
        if (!error && response.statusCode === 200) {
          const resp = JSON.parse(body);
          try {
            const gsheet_url = resp['sheet_url'];
            return gsheet_url;
          } catch (e) {
            console.log(resp);
            throw new Error(resp['message']);
          }
        } else {
          console.log(error);
        }
      });
    } catch (err) {
      console.log(err.stack);
    }
}

  async updatePostgresSchema(gsheet_url) {
    const res = fetch("https://api.defog.ai/update_postgres_schema", {
      method: "POST",
      body: JSON.stringify({
        api_key: this.api_key,
        gsheet_url: gsheet_url
      }),
      headers: { "Content-Type": "application/json" }
    });
    const resp = await res.json();
    console.log("Postgres schema updated!");
  }

  async updateMongoSchema(gsheet_url) {
    const res = fetch("https://api.defog.ai/update_mongo_schema", {
      method: "POST",
      body: JSON.stringify({
        api_key: this.api_key,
        gsheet_url: gsheet_url
      }),
      headers: { "Content-Type": "application/json" }
    });
    const resp = await res.json();
    console.log("MongoDB schema updated!");
  }

  async getQuery(question, hard_filters = null) {
    try {
      const res = await fetch("https://api.defog.ai/generate_query", {
        method: "POST",
        body: JSON.stringify({
          question: question,
          api_key: this.api_key,
          hard_filters: hard_filters,
          db_type: this.db_type,
          client: "node"
        }),
        headers: { "Content-Type": "application/json" }
      });
      const resp = await res.json();
      return {
          query_generated: resp.query_generated,
          ran_successfully: resp.ran_successfully,
          error_message: resp.error_message,
          query_db: resp.query_db || 'postgres'
      };
    } catch (err) {
      console.log(err);
    }
  }
  
  async runQuery(question, hard_filters = null) {
    console.log("generating the query for your question...");
    const query = await this.getQuery(question, hard_filters);
    
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
          query_generated: query.query_generated,
          ran_successfully: true
        };
      } else if (query.query_db === "mongo") {
        const MongoClient = require('mongodb').MongoClient;
        const client = new MongoClient(this.db_creds['connection_string'], { useNewUrlParser: true });
        await client.connect();
        const db = client.db();
        const res = await eval(query['query_generated']);
        const colnames = Object.keys(res[0]);
        const data = res;
        client.close();
        return {
          columns: colnames,
          data: data,
          query_generated: query["query_generated"],
          ran_successfully: True
        };
      }
    } else {
      console.log("We could not generate the query...");
      return {
        ran_successfully: false,
        error_message: query.error_message,
      }
    }
  }
}

module.exports = Defog;