/**
 * Proves the two ways a database can come into existence agree.
 *
 *   fresh     — schema.sql, run once, stamped as fully migrated
 *   upgraded  — an older release's schema, then every migration in order
 *
 * If those diverge, people who installed earlier end up on a subtly different
 * schema from people who installed today, and nothing else would catch it.
 *
 *   npm run check:migrations
 */
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import Database from "better-sqlite3";
import { LATEST_VERSION, MIGRATIONS, runMigrations } from "../src/lib/migrations.ts";

const SCHEMA = fs.readFileSync("src/lib/schema.sql", "utf8");
const BASELINES = "test/baselines";
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "locus-migrations-"));

/**
 * Compare meaning, not text. A rebuilt table comes back with its name quoted
 * and its comments gone, which is noise rather than drift.
 */
function shape(conn: Database.Database): string {
  return (
    conn
      .prepare(
        "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type, name",
      )
      .all() as Array<{ type: string; name: string; sql: string }>
  )
    .map(({ type, name, sql }) => {
      const normalised = sql
        .replace(/--[^\n]*/g, " ")
        .replace(/"([A-Za-z_][A-Za-z0-9_]*)"/g, "$1")
        .replace(/\s+/g, " ")
        .replace(/\s*([(),])\s*/g, "$1")
        .trim();
      return `${type} ${name}\n  ${normalised}`;
    })
    .join("\n");
}

// Every handle opened here, so they can all be closed before the temp
// directory goes. better-sqlite3 finalises statements in a native destructor;
// left to the garbage collector, that can run after Node has torn down the
// environment and abort the process (SIGABRT, exit 134) on Linux.
const opened: Database.Database[] = [];

function open(name: string): Database.Database {
  const conn = new Database(path.join(tmp, `${name}.db`));
  opened.push(conn);
  return conn;
}

function closeAll(): void {
  for (const conn of opened) {
    try {
      conn.close();
    } catch {
      // Already closed, or never opened cleanly — nothing to salvage.
    }
  }
  opened.length = 0;
}

const failures: string[] = [];
function check(label: string, ok: boolean, detail = "") {
  console.log(`${ok ? "  ok  " : "  FAIL"}  ${label}`);
  if (!ok) failures.push(`${label}${detail ? `\n${detail}` : ""}`);
}

// --- fresh install -------------------------------------------------------
const fresh = open("fresh");
fresh.exec(SCHEMA);
fresh.pragma(`user_version = ${LATEST_VERSION}`);
const freshShape = shape(fresh);

console.log(`Latest migration: ${LATEST_VERSION} (${MIGRATIONS.length} total)\n`);

// --- every released baseline, upgraded ------------------------------------
for (const file of fs.readdirSync(BASELINES).sort()) {
  const release = file.replace(/\.sql$/, "");
  const upgraded = open(`upgraded-${release}`);
  upgraded.exec(fs.readFileSync(path.join(BASELINES, file), "utf8"));
  // startup always replays schema.sql first; CREATE TABLE IF NOT EXISTS makes
  // that a no-op for tables that exist and creates any that are new.
  upgraded.exec(SCHEMA);
  const reached = runMigrations(upgraded);

  check(`${release} → reaches version ${LATEST_VERSION}`, reached === LATEST_VERSION);

  const upgradedShape = shape(upgraded);
  const same = upgradedShape === freshShape;
  let detail = "";
  if (!same) {
    const a = freshShape.split("\n");
    const b = upgradedShape.split("\n");
    detail = a
      .map((line, i) => (line === b[i] ? null : `    fresh:    ${line}\n    upgraded: ${b[i] ?? "(missing)"}`))
      .filter(Boolean)
      .slice(0, 6)
      .join("\n");
  }
  check(`${release} → same schema as a fresh install`, same, detail);

  // replaying must be harmless: existing databases predate the ledger
  upgraded.pragma("user_version = 0");
  runMigrations(upgraded);
  check(`${release} → migrations are idempotent`, shape(upgraded) === freshShape);

  const broken = upgraded.pragma("foreign_key_check") as unknown[];
  check(`${release} → no dangling references`, broken.length === 0);
}

closeAll();
fs.rmSync(tmp, { recursive: true, force: true });

if (failures.length > 0) {
  console.error(`\n${failures.length} check(s) failed:\n`);
  for (const f of failures) console.error(f);
  process.exit(1);
}
console.log("\nAll migration checks passed.");
