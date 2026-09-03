import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { LATEST_VERSION, runMigrations } from "./migrations";

const DATA_DIR = path.join(process.cwd(), "data");
const DB_PATH = process.env.LOCUS_DB ?? path.join(DATA_DIR, "locus.db");

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;

  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  const conn = new Database(DB_PATH);

  // schema.sql describes the current shape. A brand new database gets it whole
  // and is stamped as fully migrated; an existing one gets whatever migrations
  // it has not seen. Keeping both in step is what check:migrations verifies.
  const isNew =
    (conn
      .prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type = 'table'")
      .get() as { n: number }).n === 0;

  const schema = fs.readFileSync(
    path.join(process.cwd(), "src", "lib", "schema.sql"),
    "utf8",
  );
  conn.exec(schema);

  if (isNew) {
    conn.pragma(`user_version = ${LATEST_VERSION}`);
  } else {
    runMigrations(conn);
  }

  conn.prepare("INSERT OR IGNORE INTO profile (id) VALUES (1)").run();

  _db = conn;
  return conn;
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
