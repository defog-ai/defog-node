# TL;DR
Defog converts your natural language text queries into SQL and other machine readable code
![](defog-node.gif)

# Installation
`npm i defog`

# Getting your API Key
You can get your API key by going to [https://defog.ai/account](https://defog.ai/account) and creating an account.

# Usage

## Postgres
```javascript
import Defog from defog
// depending on your node version, you might have to use the following line instead
// const Defog = require("defog")

// set up Defog
const defog = new Defog(
  process.env.DEFOG_API_KEY,
  "postgres", 
  {
    user: "YOUR_POSTGRES_USERNAME",
    host: "YOUR_POSTGRES_HOST",
    database: "YOUR_POSTGRES_DB",
    password: "YOUR_POSTGRES_PW",
    port: 5432
  }
);

const question = "which 10 cities had the highest average pollution today?";
const answer = await defog.runQuery(question);
console.log(answer);
```

## MySQL
```javascript
// depending on your node version, you might have to use the following line instead
// const Defog = require("defog")

const defog = new Defog(
  api_key = process.env.DEFOG_API_KEY,
  db_type = "mysql",
  db_creds = {
    user: USERNAME,
    host: HOST,
    database: DBNAME,
    password: PASSWORD
  }
);

const question = "which 10 companies had the most layoffs?";
const query = await defog.runQuery(question);
console.log(query);
```

## BigQuery
```javascript
// depending on your node version, you might have to use the following line instead
// const Defog = require("defog")

const defog = new Defog(
  api_key = process.env.DEFOG_API_KEY,
  db_type = "bigquery",
  db_creds = {
    json_key_path: "/path/to/service_account.key"
  }
);

const question = "which 10 companies had the most layoffs?";
const query = await defog.runQuery(question);
console.log(query);
```