# TL;DR
Defog converts your natural language text queries into SQL and other machine readable code

# Installation
`npm i defog`

# Getting your API Key
You can get your API key by going to [https://defog.ai/account](https://defog.ai/account) and creating an account.

# Usage

## Postgres
```
import Defog from defog

const defog = new Defog(
  "YOUR_API_KEY",
  "postgres", 
  {
    user: "YOUR_POSTGRES_USERNAME",
    host: "YOUR_POSTGRES_HOST",
    database: "YOUR_POSTGRES_DB",
    password: "YOUR_POSTGRES_PW",
    port: 5432
  }
);

const tables = ["YOUR_TABLE_NAME_1"];
defog.generatePostgresSchema(tables).then(gsheet_url => {
  console.log(gsheet_url);
  defog.updatePostgresSchema(gsheet_url).then(res => {
    console.log(res);
    const question = "";
    defog.runQuery(question).then(res => {
      console.log(res);
    });
  });
});
```

## Mongo
TODO

## BigQuery
TODO