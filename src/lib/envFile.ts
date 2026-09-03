import fs from "node:fs";
import path from "node:path";

/**
 * Read and write single values in `.env.local`.
 *
 * A key entered in Settings is written here rather than into the database.
 * That keeps one property worth keeping: `data/locus.db` never holds a
 * credential, so backing it up — or exporting the library — cannot leak one.
 * This is the same file you would edit by hand; the UI just does it for you.
 *
 * Values are read back from disk on demand rather than trusted from
 * `process.env`, which is only populated at boot. That is what lets a key
 * saved in the UI work immediately instead of after a restart.
 *
 * Server-side only.
 */

const ENV_PATH = path.join(process.cwd(), ".env.local");

const HEADER = `# Locus secrets. Gitignored — never commit this file.
# Written by Settings inside the app, and safe to edit by hand.
`;

/** Strip matching surrounding quotes from a value, if present. */
function unquote(raw: string): string {
  const value = raw.trim();
  if (value.length >= 2) {
    const first = value[0];
    if ((first === '"' || first === "'") && value.endsWith(first)) {
      return value.slice(1, -1);
    }
  }
  return value;
}

/** Every assignment in the file, last one winning, comments ignored. */
export function readEnvFile(): Record<string, string> {
  let text: string;
  try {
    text = fs.readFileSync(ENV_PATH, "utf8");
  } catch {
    return {};
  }

  const out: Record<string, string> = {};
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const name = trimmed.slice(0, eq).trim().replace(/^export\s+/, "");
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) continue;
    out[name] = unquote(trimmed.slice(eq + 1));
  }
  return out;
}

/** One value, or null when it is absent or empty. */
export function readEnvValue(name: string): string | null {
  const value = readEnvFile()[name]?.trim();
  return value ? value : null;
}

/**
 * Set or remove one assignment, leaving every other line — including comments
 * and spacing — exactly as it was. Pass null to remove.
 *
 * The file is written 0600: it holds a credential, and the default umask would
 * otherwise leave it readable by anyone else on the machine.
 */
export function writeEnvValue(name: string, value: string | null): void {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(name)) {
    throw new Error(`Refusing to write an invalid environment name: ${name}`);
  }

  let lines: string[];
  try {
    lines = fs.readFileSync(ENV_PATH, "utf8").split("\n");
  } catch {
    lines = HEADER.split("\n");
  }

  const isAssignment = (line: string) =>
    new RegExp(`^\\s*(export\\s+)?${name}\\s*=`).test(line);

  const kept = lines.filter((line) => !isAssignment(line));

  if (value !== null) {
    // A quoted value survives spaces and stray characters intact.
    kept.push(`${name}=${JSON.stringify(value)}`);
  }

  // Collapse the run of blank lines a removal can leave behind.
  const body = kept.join("\n").replace(/\n{3,}/g, "\n\n").replace(/\s*$/, "\n");

  fs.writeFileSync(ENV_PATH, body, { encoding: "utf8", mode: 0o600 });
  try {
    fs.chmodSync(ENV_PATH, 0o600);
  } catch {
    // Best effort: a pre-existing file may not be ours to chmod.
  }
}
