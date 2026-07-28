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

const normalizedDatabaseUrl = (() => {
  const url = new URL(databaseUrl);
  url.searchParams.delete("sslmode");
  return url.toString();
})();

const shouldUseSsl = /supabase\.(co|in|net|com)$/.test(normalizedDatabaseUrl);

const pool = new Pool({
  connectionString: normalizedDatabaseUrl,
  ssl: shouldUseSsl ? { rejectUnauthorized: false } : false,
  max: 10,
  connectionTimeoutMillis: 15000,
});

export const db = drizzle(pool, { schema });
export type DbClient = typeof db;
