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

  // 'prose' was added to section.kind, and date_mode alongside it. SQLite
  // cannot alter a CHECK constraint, so the table has to be rebuilt — this is
  // the recipe from the SQLite docs, with foreign keys off so dropping the old
  // table does not cascade into entry and skill_group.
  const sectionSql = (
    conn
      .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='section'")
      .get() as { sql: string } | undefined
  )?.sql;

  if (sectionSql && !sectionSql.includes("'prose'")) {
    conn.pragma("foreign_keys = OFF");
    try {
      conn.exec(`
        BEGIN;
        CREATE TABLE section_migrated (
          id         INTEGER PRIMARY KEY AUTOINCREMENT,
          title      TEXT NOT NULL,
          kind       TEXT NOT NULL CHECK (kind IN ('entries','skills','prose')) DEFAULT 'entries',
          date_mode  TEXT NOT NULL CHECK (date_mode IN ('range','single','none')) DEFAULT 'range',
          sort_order INTEGER NOT NULL DEFAULT 0,
          archived   INTEGER NOT NULL DEFAULT 0
        );
        INSERT INTO section_migrated (id, title, kind, sort_order, archived)
          SELECT id, title, kind, sort_order, archived FROM section;
        DROP TABLE section;
        ALTER TABLE section_migrated RENAME TO section;
        COMMIT;
      `);
    } catch (cause) {
      conn.exec("ROLLBACK");
      throw cause;
    } finally {
      conn.pragma("foreign_keys = ON");
    }

    const broken = conn.pragma("foreign_key_check") as unknown[];
    if (broken.length > 0) {
      throw new Error(
        `Rebuilding the section table left ${broken.length} dangling reference(s).`,
      );
    }
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
