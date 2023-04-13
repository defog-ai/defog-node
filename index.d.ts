declare class Defog {
  constructor(api_key: string, db_type?: string, db_creds?: object);

  generatePostgresSchema(tables: string[]): Promise<string>;
  generateMySQLSchema(tables: string[]): Promise<string>;
  generateMongoSchema(collections: string[]): Promise<string>;

  updatePostgresSchema(gsheet_url: string): Promise<void>;
  updateMongoSchema(gsheetUrl: string): Promise<void>;
  updateMySQLSchema(gsheet_url: string): Promise<void>;

  getQuery(question: string, hard_filters?: object): Promise<{
    query_generated: string;
    ran_successfully: boolean;
    error_message: string;
    query_db: string;
  }>;

  runQuery(question: string, hard_filters?: object): Promise<{
    columns: string[];
    data: any[];
    query_generated: string;
    ran_successfully: boolean;
  }>;
}

export = Defog;