import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

const databaseUrl = process.env.DATABASE_URL;

const globalForDb = globalThis as typeof globalThis & {
  __arenaNextJsPostgresqlPool?: Pool;
};

export const hasDatabase = Boolean(databaseUrl);

export const pool =
  hasDatabase
    ? globalForDb.__arenaNextJsPostgresqlPool ??
      new Pool({
        connectionString: databaseUrl,
      })
    : null;

if (hasDatabase && process.env.NODE_ENV !== "production" && pool) {
  globalForDb.__arenaNextJsPostgresqlPool = pool;
}

// Route handlers already gate database access with `hasDatabase` where needed.
// Keep the exported type non-null so TypeScript doesn't force every query site
// to repeat null checks that are handled higher up.
export const db = (pool ? drizzle(pool) : null) as ReturnType<typeof drizzle>;
