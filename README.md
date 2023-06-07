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

const question = "how many users do we have?";
const answer = await defog.runQuery(question);
console.log(answer);
```

## MySQL
```javascript
import Defog from defog
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

const question = "how many users do we have";
const query = await defog.runQuery(question);
console.log(query);
```

## BigQuery
```javascript
import Defog from defog
// depending on your node version, you might have to use the following line instead
// const Defog = require("defog")

// before initializing Defog, please ensure that the path to your Service Account JSON
// is in your environment variable
// process.env.GOOGLE_APPLICATION_CREDENTIALS = '/path/to/json.key';

const defog = new Defog(
  api_key = process.env.DEFOG_API_KEY,
  db_type = "bigquery"
);

const question = "how many users do we have";
const query = await defog.runQuery(question);
console.log(query);
```