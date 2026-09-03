import type Database from "better-sqlite3";

/**
 * Schema changes, applied in order and recorded in SQLite's own user_version
 * pragma so each one runs exactly once.
 *
 * Two rules for anything added here:
 *
 * 1. Make the change in `schema.sql` as well. `schema.sql` is what a brand new
 *    database gets; migrations are what an existing one gets. `npm run
 *    check:migrations` proves the two paths end up with the same schema.
 * 2. Keep each `up` idempotent — guard it so re-running is harmless. Databases
 *    created before this ledger existed sit at user_version 0 with the changes
 *    already applied, and must survive a replay.
 */
export interface Migration {
  version: number;
  name: string;
  up: (conn: Database.Database) => void;
}

function columns(conn: Database.Database, table: string): Set<string> {
  return new Set(
    (
      conn.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>
    ).map((row) => row.name),
  );
}

function tableSql(conn: Database.Database, table: string): string {
  const row = conn
    .prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name = ?")
    .get(table) as { sql: string } | undefined;
  return row?.sql ?? "";
}

export const MIGRATIONS: Migration[] = [
  {
    version: 1,
    name: "cv.style — per-CV document style",
    up(conn) {
      if (!columns(conn, "cv").has("style")) {
        conn.exec(
          "ALTER TABLE cv ADD COLUMN style TEXT NOT NULL DEFAULT 'classic'",
        );
      }
    },
  },
  {
    version: 2,
    name: "section.kind gains 'prose', plus section.date_mode",
    up(conn) {
      // SQLite cannot alter a CHECK constraint, so the table is rebuilt. This
      // is the recipe from the SQLite docs, with foreign keys off so dropping
      // the old table does not cascade into entry, skill_group and prose.
      if (tableSql(conn, "section").includes("'prose'")) return;

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
    },
  },
];

export const LATEST_VERSION = MIGRATIONS.reduce(
  (max, m) => Math.max(max, m.version),
  0,
);

/** Apply everything newer than the database's recorded version. */
export function runMigrations(conn: Database.Database): number {
  let version = conn.pragma("user_version", { simple: true }) as number;
  for (const migration of MIGRATIONS) {
    if (migration.version <= version) continue;
    migration.up(conn);
    conn.pragma(`user_version = ${migration.version}`);
    version = migration.version;
  }
  return version;
}
