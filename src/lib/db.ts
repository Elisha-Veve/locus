import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.LOCUS_DB ?? path.join(DATA_DIR, "locus.db");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const conn = new Database(DB_PATH);
  const schema = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "schema.sql"),
    "utf8",
  );
  conn.exec(schema);
  conn
    .prepare("INSERT OR IGNORE INTO profile (id) VALUES (1)")
    .run();
  migrate(conn);

  _db = conn;
  return conn;
}

/**
 * Columns added after a database already exists. The schema file uses
 * CREATE TABLE IF NOT EXISTS, so it never alters a table that is already there.
 */
function migrate(conn: Database.Database): void {
  const columns = (table: string): Set<string> =>
    new Set(
      (conn.prepare(`PRAGMA table_info(${table})`).all() as Array<{
        name: string;
      }>).map((row) => row.name),
    );

  if (!columns("cv").has("style")) {
    conn.exec("ALTER TABLE cv ADD COLUMN style TEXT NOT NULL DEFAULT 'classic'");
  }
}

/** Next sort_order for a child list, so new rows land at the bottom. */
export function nextOrder(
  table: string,
  column: string,
  parentId: number,
): number {
  const row = db()
    .prepare(
      `SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM ${table} WHERE ${column} = ?`,
    )
    .get(parentId) as { next: number };
  return row.next;
}
