import { MysqlDialect } from '@tbd54566975/dwn-sql-store';
import { PostgresDialect } from '@tbd54566975/dwn-sql-store';
import { SqliteDialect } from '@tbd54566975/dwn-sql-store';
import { createPool } from 'mysql2';
import pg from 'pg';
import Cursor from 'pg-cursor';
import Database from 'better-sqlite3';

export const testMysqlDialect = new MysqlDialect({
  pool: async () => createPool({
    host     : 'localhost',
    port     : 3306,
    database : '***',
    user     : '***',
    password : '***'
  })
});

export const testPostgresDialect = new PostgresDialect({
  pool: async () => new pg.Pool({
    host     : process.env.DWN_PG_HOST,
    port     : Number(process.env.DWN_PG_PORT),
    database : process.env.DWN_PG_DB,
    user     : process.env.DWN_PG_USER,
    password : process.env.DWN_PG_PWD
  }),
  cursor: Cursor
});

export const testSqliteDialect = new SqliteDialect({
  database: async () => new Database(
    'dwn.sqlite',
    {
      fileMustExist: true,
    }
  )
});
