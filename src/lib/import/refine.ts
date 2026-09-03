import { canUseAi, getAiClient } from "../ai";
import { coerceSection, extractJson, list, str } from "./coerce.ts";
import { EMPTY_PROFILE, type ImportedCv, type ImportedSection } from "./types.ts";

/**
 * Improve a parsed CV with one model call, when a key is configured.
 *
 * Two rules shape everything here.
 *
 * The model improves the parse; it never enables the feature. If no key is
 * set, if the call fails, if the reply is not JSON, or if the JSON is not the
 * shape we asked for, the offline parse is returned unchanged. A provider
 * having a bad afternoon must not cost anyone their import.
 *
 * Nothing the model returns is trusted structurally. Every field is read back
 * through `coerce*` below, which keeps what is valid and discards what is not,
 * rather than casting the reply and hoping. A CV is someone's career history —
 * a plausible-looking hallucination that reaches the library unchallenged is
 * worse than a rough parse they can see is rough.
 */

const MAX_INPUT_CHARS = 24_000;

const PROMPT = `You are reading a CV so it can be filed into a structured library.

Return ONLY a JSON object, no prose and no code fence, of this shape:

{
  "profile": { "full_name": "", "email": "", "phone": "", "linkedin": "", "website": "", "location": "" },
  "sections": [
    {
      "title": "Experience",
      "kind": "entries" | "skills" | "prose",
      "dateMode": "range" | "single" | "none",
      "entries": [
        { "org": "", "role": "", "subtitle": "", "location": "",
          "start_date": "YYYY-MM", "end_date": "YYYY-MM", "bullets": ["", ""] }
      ],
      "groups": [ { "label": "", "skills": ["", ""] } ],
      "prose": [ { "label": "", "body": "" } ]
    }
  ]
}

Rules:
- Use ONLY what the CV says. Never invent an employer, a date, a number or an
  achievement. If a field is not in the text, leave it as an empty string.
- "entries" is for dated records: jobs, degrees, certifications, awards.
  "skills" is for grouped lists. "prose" is for a summary or profile paragraph.
- dateMode: "range" for jobs and study, "single" for something earned on one
  date such as a certification, "none" where dates do not apply.
- end_date is an empty string for anything ongoing.
- Dates are "YYYY-MM". If only a year is known use "YYYY-01".
- Keep bullet wording as written. Fix obvious line-break damage and hyphenation
  from PDF extraction, nothing else. Do not rewrite, summarise, or improve.
- Put a section's records in "entries", "groups" or "prose" according to its
  kind, and leave the other two as empty arrays.

CV text follows.

---
`;

export interface RefineOutcome {
  cv: ImportedCv;
  /** Why the offline parse was kept, when it was. Shown to the person. */
  note?: string;
}

export async function refineCv(text: string, offline: ImportedCv): Promise<RefineOutcome> {
  if (!(await canUseAi("assisted"))) return { cv: offline };

  const client = getAiClient("assisted");
  if (!client) return { cv: offline };

  try {
    const reply = await client.complete(PROMPT + text.slice(0, MAX_INPUT_CHARS));
    const parsed = extractJson(reply) as Record<string, unknown>;

    const sections = list(parsed.sections)
      .map(coerceSection)
      .filter((s): s is ImportedSection => s !== null);

    // A reply that yields nothing usable is a failure, not an empty CV.
    if (sections.length === 0) {
      return {
        cv: offline,
        note: `${client.provider.label} did not return anything usable, so this is the offline reading.`,
      };
    }

    const p = (parsed.profile ?? {}) as Record<string, unknown>;
    const profile = {
      full_name: str(p.full_name, 120) || offline.profile.full_name,
      email: str(p.email, 120) || offline.profile.email,
      phone: str(p.phone, 40) || offline.profile.phone,
      linkedin: str(p.linkedin, 200) || offline.profile.linkedin,
      website: str(p.website, 200) || offline.profile.website,
      location: str(p.location, 80) || offline.profile.location,
    };

    return {
      cv: {
        profile: { ...EMPTY_PROFILE, ...profile },
        sections,
        source: "assisted",
        // The model works from the whole text, so nothing is left unplaced.
        leftovers: [],
      },
    };
  } catch (cause) {
    const why = cause instanceof Error ? cause.message : "the call failed";
    return { cv: offline, note: `Kept the offline reading — ${why}` };
  }
}
