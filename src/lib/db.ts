import fs from "node:fs";
import path from "node:path";

/**
 * Database access. With DATABASE_URL set (Supabase in production) it uses
 * Postgres over the network. Without it (local playtesting) it uses PGlite,
 * an in-process Postgres stored in ./.data, so no setup is needed.
 */
export interface Db {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<T[]>;
}

const g = globalThis as unknown as { __hrDb?: Promise<Db> };

async function connect(): Promise<Db> {
  const schema = fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");
  if (process.env.DATABASE_URL) {
    const postgres = (await import("postgres")).default;
    const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 5, onnotice: () => {} });
    await sql.unsafe(schema);
    return {
      async query<T>(text: string, params: unknown[] = []) {
        return (await sql.unsafe(text, params as never[])) as unknown as T[];
      },
    };
  }
  const { PGlite } = await import("@electric-sql/pglite");
  const dir = process.env.PGLITE_DIR ?? path.join(process.cwd(), ".data", "pglite");
  fs.mkdirSync(dir, { recursive: true });
  const pg = new PGlite(dir);
  await pg.exec(schema);
  return {
    async query<T>(text: string, params: unknown[] = []) {
      const res = await pg.query(text, params);
      return res.rows as T[];
    },
  };
}

export function db(): Promise<Db> {
  if (!g.__hrDb) g.__hrDb = connect();
  return g.__hrDb;
}

export async function q<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await db()).query<T>(sql, params);
}

export async function one<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T | null> {
  const rows = await q<T>(sql, params);
  return rows[0] ?? null;
}

export function newId(prefix = ""): string {
  return prefix + crypto.randomUUID().replace(/-/g, "").slice(0, 16);
}
