import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

const databaseUrl =
  process.env.DATABASE_URL ??
  process.env.SUPABASE_DB_URL ??
  process.env.POSTGRES_URL;

if (!databaseUrl) {
  throw new Error("Missing database connection string. Set DATABASE_URL for Supabase Postgres.");
}

const shouldUseSsl = /supabase\.(co|in|net|com)$|sslmode=require/i.test(databaseUrl);

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  connectionTimeoutMillis: 15000,
});

export const db = drizzle(pool, { schema });
export type DbClient = typeof db;
