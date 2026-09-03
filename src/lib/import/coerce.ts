import type { DateMode, SectionKind } from "../types.ts";
import { sectionIsEmpty, type ImportedSection } from "./types.ts";

/**
 * The barrier between what a model returns and what reaches the library.
 *
 * Everything here is pure and depends on nothing but the types, so it can be
 * exercised without a database, a network or a key — see
 * `npm run check:import`. That matters more here than anywhere else in the
 * codebase: this is the last place a plausible-looking invention can be caught
 * before it is filed as someone's career history.
 *
 * The rule throughout is keep-what-is-valid, drop-what-is-not. Nothing is cast
 * and hoped over.
 */

const KINDS: SectionKind[] = ["entries", "skills", "prose"];
const DATE_MODES: DateMode[] = ["range", "single", "none"];

export function str(value: unknown, max = 400): string {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}

/** "YYYY-MM", or empty. Anything else the model offers is dropped. */
export function monthOrEmpty(value: unknown): string {
  const s = str(value, 7);
  if (/^\d{4}-(0[1-9]|1[0-2])$/.test(s)) return s;
  if (/^\d{4}$/.test(s)) return `${s}-01`;
  return "";
}

export function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

/** Exported for testing: this is the barrier hallucinated data must not cross. */
export function coerceSection(raw: unknown): ImportedSection | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const title = str(r.title, 80);
  if (!title) return null;

  const kind = KINDS.includes(r.kind as SectionKind) ? (r.kind as SectionKind) : "entries";
  const dateMode = DATE_MODES.includes(r.dateMode as DateMode)
    ? (r.dateMode as DateMode)
    : kind === "entries"
      ? "range"
      : "none";

  const section: ImportedSection = {
    title,
    kind,
    dateMode,
    chosen: true,
    entries: [],
    groups: [],
    prose: [],
  };

  if (kind === "entries") {
    for (const e of list(r.entries)) {
      if (!e || typeof e !== "object") continue;
      const x = e as Record<string, unknown>;
      const bullets = list(x.bullets)
        .map((b) => str(b, 600))
        .filter(Boolean)
        .map((text) => ({ text, chosen: true }));
      const entry = {
        org: str(x.org, 120),
        role: str(x.role, 120),
        subtitle: str(x.subtitle, 200),
        location: str(x.location, 80),
        start_date: monthOrEmpty(x.start_date),
        end_date: dateMode === "range" ? monthOrEmpty(x.end_date) : "",
        bullets,
        chosen: true,
      };
      if (entry.org || entry.role || bullets.length) section.entries.push(entry);
    }
  } else if (kind === "skills") {
    for (const g of list(r.groups)) {
      if (!g || typeof g !== "object") continue;
      const x = g as Record<string, unknown>;
      const skills = list(x.skills).map((s) => str(s, 60)).filter(Boolean);
      if (skills.length) section.groups.push({ label: str(x.label, 60), skills, chosen: true });
    }
  } else {
    for (const p of list(r.prose)) {
      if (!p || typeof p !== "object") continue;
      const x = p as Record<string, unknown>;
      const body = str(x.body, 2000);
      if (body) section.prose.push({ label: str(x.label, 60) || "From your CV", body, chosen: true });
    }
  }

  return sectionIsEmpty(section) ? null : section;
}

/** The model is asked for bare JSON; a fenced block is tolerated regardless. */
export function extractJson(reply: string): unknown {
  const fenced = reply.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : reply).trim();
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end <= start) throw new Error("No JSON object in the reply.");
  return JSON.parse(candidate.slice(start, end + 1));
}

