declare module "sql.js" {
  export interface Statement {
    bind(values?: unknown[]): boolean;
    step(): boolean;
    getAsObject(): Record<string, unknown>;
    run(values?: unknown[]): void;
    free(): void;
  }

  export interface Database {
    exec(sql: string): void;
    prepare(sql: string): Statement;
    export(): Uint8Array;
    close(): void;
  }

  export interface SqlJsStatic {
    Database: new (data?: Uint8Array | Buffer) => Database;
  }

  export default function initSqlJs(config?: {
    locateFile?: (file: string) => string;
  }): Promise<SqlJsStatic>;
}
