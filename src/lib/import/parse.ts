import type { DateMode, SectionKind } from "../types.ts";
import {
  EMPTY_PROFILE,
  emptyEntry,
  emptySection,
  sectionIsEmpty,
  type ImportedCv,
  type ImportedEntry,
  type ImportedProfile,
  type ImportedSection,
} from "./types.ts";

/**
 * Read a CV from plain text using layout alone — no network, no key.
 *
 * This is the floor, not the ceiling. It reads the conventions almost every CV
 * follows and gives up gracefully on anything else, dropping unrecognised
 * lines into `leftovers` rather than discarding them. It will get things
 * wrong; that is what the review screen is for. What it must never do is lose
 * a line silently.
 *
 * The one structural assumption: records are separated by blank lines. An
 * earlier version treated "the line with the date" as the start of a record,
 * which split every job in half whenever the date sat on its own line — the
 * usual layout. Blank lines are the more reliable signal.
 *
 * With a key configured, `refine` in ./refine.ts improves on this. Without
 * one, this is the whole feature and still has to be worth using.
 */

const MONTHS: Record<string, number> = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, sept: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

/** Headings we recognise, and the shape each implies. */
const KNOWN_SECTIONS: Array<{
  match: RegExp;
  kind: SectionKind;
  dateMode: DateMode;
}> = [
  { match: /^(summary|profile|about|objective|personal statement)\b/i, kind: "prose", dateMode: "none" },
  { match: /^(technical skills?|skills?|technologies|competenc\w*)\b/i, kind: "skills", dateMode: "none" },
  { match: /^(professional experience|work experience|experience|employment|work history|career)\b/i, kind: "entries", dateMode: "range" },
  { match: /^(education|academic\w*)\b/i, kind: "entries", dateMode: "range" },
  { match: /^(projects?|selected work)\b/i, kind: "entries", dateMode: "range" },
  { match: /^(certifications?|licen[cs]es?|credentials?)\b/i, kind: "entries", dateMode: "single" },
  { match: /^(awards?|honou?rs?|achievements?)\b/i, kind: "entries", dateMode: "single" },
  { match: /^(publications?|talks?|speaking)\b/i, kind: "entries", dateMode: "single" },
  { match: /^(interests?|hobbies|volunteering|languages)\b/i, kind: "skills", dateMode: "none" },
  { match: /^(referees?|references?)\b/i, kind: "entries", dateMode: "none" },
];

const BULLET_MARK = /^\s*[•·▪‣◦\-–—*]\s+/;
/** "Languages: Go, Rust" — a labelled list, which is content, not a heading. */
const LABELLED_LIST = /^[A-Za-z][\w /&+-]{0,30}:\s*\S/;
/** Where a header line splits into org / role / location. */
const HEADER_SPLIT = /\s*[|·]\s*|\s+[—–]\s+|\s{2,}/;

function toMonth(name: string, year: string): string {
  const m = MONTHS[name.toLowerCase()];
  return m ? `${year}-${String(m).padStart(2, "0")}` : "";
}

/**
 * Pull a date range off a line, returning what it found and the line without
 * it. Handles "Feb 2023 – Present", "2019-2022", "March 2020 to June 2021".
 */
export function extractDates(line: string): {
  start: string;
  end: string;
  rest: string;
  found: boolean;
} {
  const sep = "(?:\\s*(?:[–—]|-{1,2}|to|until)\\s*)";
  const monthYear = "([A-Za-z]{3,9})\\.?\\s+(\\d{4})";
  const ending = "(present|now|current|to date|ongoing)";

  let m = line.match(new RegExp(`${monthYear}${sep}(?:${monthYear}|${ending})`, "i"));
  if (m) {
    const start = toMonth(m[1], m[2]);
    if (start) {
      const end = m[3] && m[4] ? toMonth(m[3], m[4]) : "";
      return { start, end, rest: line.replace(m[0], " ").trim(), found: true };
    }
  }

  m = line.match(new RegExp(`\\b(\\d{4})${sep}(?:(\\d{4})|${ending})\\b`, "i"));
  if (m) {
    return {
      start: `${m[1]}-01`,
      end: m[2] ? `${m[2]}-12` : "",
      rest: line.replace(m[0], " ").trim(),
      found: true,
    };
  }

  m = line.match(new RegExp(`\\b${monthYear}\\b`, "i"));
  if (m) {
    const start = toMonth(m[1], m[2]);
    if (start) return { start, end: "", rest: line.replace(m[0], " ").trim(), found: true };
  }

  m = line.match(/\b(?:19|20)\d{2}\b/);
  if (m) {
    return { start: `${m[0]}-01`, end: "", rest: line.replace(m[0], " ").trim(), found: true };
  }

  return { start: "", end: "", rest: line, found: false };
}

/**
 * A heading is short, unpunctuated, not a bullet, and not a labelled list.
 * That last guard matters: "Languages: Go, TypeScript" would otherwise match
 * the interests rule and turn a skill group's label into a section title.
 */
function looksLikeHeading(line: string): boolean {
  const t = line.trim();
  if (!t || t.length > 48) return false;
  if (BULLET_MARK.test(line)) return false;
  if (LABELLED_LIST.test(t)) return false;
  if (/[.;,]$/.test(t)) return false;
  if (KNOWN_SECTIONS.some((s) => s.match.test(t))) return true;
  const isCaps = t === t.toUpperCase() && /[A-Z]/.test(t);
  return isCaps && t.split(/\s+/).length <= 5;
}

function classify(title: string): { kind: SectionKind; dateMode: DateMode } {
  for (const s of KNOWN_SECTIONS) {
    if (s.match.test(title.trim())) return { kind: s.kind, dateMode: s.dateMode };
  }
  return { kind: "entries", dateMode: "range" };
}

/** Contact details from the header, before any section heading. */
export function extractProfile(lines: string[]): ImportedProfile {
  const p: ImportedProfile = { ...EMPTY_PROFILE };
  const head = lines.slice(0, 12).join("\n");

  const email = head.match(/[\w.+-]+@[\w-]+\.[\w.-]+/);
  if (email) p.email = email[0];

  const phone = head.match(/(\+?\d[\d\s().-]{7,}\d)/);
  if (phone) p.phone = phone[1].trim();

  const linkedin = head.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/[\w-]+/i);
  if (linkedin) p.linkedin = linkedin[0];

  const site = head.match(
    /(?:https?:\/\/)?(?:www\.)?(?!linkedin\.)[\w-]+\.(?:com|dev|io|me|net|org|co\.uk)(?:\/\S*)?/i,
  );
  if (site && !p.email.includes(site[0])) p.website = site[0];

  for (const raw of lines.slice(0, 5)) {
    const t = raw.trim();
    if (!t) continue;
    if (t.includes("@") || /\d{3}/.test(t) || /https?:|linkedin/i.test(t)) continue;
    if (t.split(/\s+/).length <= 5) {
      p.full_name = t;
      break;
    }
  }

  // A line that is only a place, near the top — "London, UK".
  for (const raw of lines.slice(0, 8)) {
    const t = raw.trim();
    if (!t || t === p.full_name) continue;
    if (/^[A-Z][\w.'-]+(?:[ ,]+[A-Z][\w.'-]+){0,3}$/.test(t) && /,/.test(t)) {
      p.location = t;
      break;
    }
  }

  return p;
}

/** Split a skills block into groups. "Languages: Go, Rust" becomes a group. */
function parseSkills(block: string[]): ImportedSection["groups"] {
  const groups: ImportedSection["groups"] = [];
  const loose: string[] = [];

  for (const raw of block) {
    const line = raw.replace(BULLET_MARK, "").trim();
    if (!line) continue;

    const labelled = line.match(/^([A-Za-z][\w /&+-]{0,30}):\s*(.+)$/);
    if (labelled) {
      const skills = labelled[2].split(/[,;|·•]/).map((s) => s.trim()).filter(Boolean);
      if (skills.length) {
        groups.push({ label: labelled[1].trim(), skills, chosen: true });
        continue;
      }
    }
    loose.push(...line.split(/[,;|·•]/).map((s) => s.trim()).filter(Boolean));
  }

  if (loose.length) groups.push({ label: "", skills: loose, chosen: true });
  return groups;
}

/**
 * One record from one blank-line-separated chunk. Dates may sit on any line;
 * whatever is left over becomes org / role / location in that order, which is
 * the common layout and is trivially corrected on the review screen.
 */
function parseChunk(chunk: string[], dateMode: DateMode): ImportedEntry | null {
  const entry = emptyEntry();
  const headerParts: string[] = [];

  for (const raw of chunk) {
    const line = raw.trim();
    if (!line) continue;

    if (BULLET_MARK.test(raw)) {
      const text = raw.replace(BULLET_MARK, "").trim();
      if (text) entry.bullets.push({ text, chosen: true });
      continue;
    }

    let rest = line;
    if (dateMode !== "none" && !entry.start_date) {
      const d = extractDates(line);
      if (d.found) {
        entry.start_date = d.start;
        entry.end_date = dateMode === "single" ? "" : d.end;
        rest = d.rest;
      }
    }

    rest = rest.replace(/^[\s|,·—–-]+|[\s|,·—–-]+$/g, "");
    if (!rest) continue;

    // A long unpunctuated-free line is prose about the role, not a header.
    if (headerParts.length >= 3 || rest.length > 90) {
      entry.bullets.push({ text: rest, chosen: true });
      continue;
    }
    headerParts.push(...rest.split(HEADER_SPLIT).map((s) => s.trim()).filter(Boolean));
  }

  entry.org = headerParts[0] ?? "";
  entry.role = headerParts[1] ?? "";
  entry.location = headerParts[2] ?? "";
  if (headerParts.length > 3) entry.subtitle = headerParts.slice(3).join(", ");

  const hasContent = entry.org || entry.role || entry.bullets.length > 0;
  return hasContent ? entry : null;
}

/** Split an entries block on blank lines, one record per chunk. */
function parseEntries(block: string[], dateMode: DateMode): ImportedEntry[] {
  const entries: ImportedEntry[] = [];
  let chunk: string[] = [];

  const flush = () => {
    if (chunk.some((l) => l.trim())) {
      const entry = parseChunk(chunk, dateMode);
      if (entry) {
        // A chunk of only bullets belongs to the record before it.
        const previous = entries[entries.length - 1];
        if (!entry.org && !entry.role && previous) previous.bullets.push(...entry.bullets);
        else entries.push(entry);
      }
    }
    chunk = [];
  };

  for (const line of block) {
    if (!line.trim()) flush();
    else chunk.push(line);
  }
  flush();
  return entries;
}

/** Read a whole CV. Never throws; an unreadable input yields no sections. */
export function parseCv(text: string): ImportedCv {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const profile = extractProfile(lines);

  const sections: ImportedSection[] = [];
  const leftovers: string[] = [];
  let currentTitle: string | null = null;
  let block: string[] = [];

  // Contact details are already on the profile; do not also report them as
  // unplaced, which would read as though something had been lost.
  const claimed = new Set(
    Object.values(profile).filter((v) => typeof v === "string" && v.length > 0),
  );
  const unclaimed = (l: string) => {
    const t = l.trim();
    if (!t) return false;
    if (claimed.has(t)) return false;
    return ![...claimed].some((c) => t.includes(c));
  };

  const flush = () => {
    if (currentTitle === null) {
      leftovers.push(...block.filter(unclaimed).map((l) => l.trim()));
      block = [];
      return;
    }
    const { kind, dateMode } = classify(currentTitle);
    const section = emptySection(currentTitle, kind);
    section.dateMode = dateMode;

    if (kind === "skills") {
      section.groups = parseSkills(block);
    } else if (kind === "prose") {
      const body = block.map((l) => l.replace(BULLET_MARK, "").trim()).filter(Boolean).join(" ");
      if (body) section.prose = [{ label: "From your CV", body, chosen: true }];
    } else {
      section.entries = parseEntries(block, dateMode);
    }

    if (sectionIsEmpty(section)) leftovers.push(...block.filter(unclaimed).map((l) => l.trim()));
    else sections.push(section);
    block = [];
  };

  for (const line of lines) {
    if (looksLikeHeading(line)) {
      flush();
      currentTitle = line.trim();
      continue;
    }
    block.push(line);
  }
  flush();

  return { profile, sections, source: "offline", leftovers };
}
