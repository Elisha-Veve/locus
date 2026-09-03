/**
 * Checks the two halves of reading a CV that can fail quietly.
 *
 *   the offline parser — that a plainly-laid-out CV comes back with its dates
 *   on the right records, its skills grouped, and nothing lost
 *
 *   the coercion barrier — that whatever a model returns, only well-formed
 *   data gets past it
 *
 * The second matters most. A parser bug is visible on the review screen; a
 * coercion bug files an invention as somebody's career history. Both run with
 * no database, no network and no key.
 *
 *   npm run check:import
 */
import { parseCv } from "../src/lib/import/parse.ts";
import { coerceSection, extractJson } from "../src/lib/import/coerce.ts";

let pass = 0;
const failures: string[] = [];

function check(label: string, ok: boolean, detail = ""): void {
  console.log(`  ${ok ? "ok  " : "FAIL"}  ${label}`);
  if (ok) pass += 1;
  else failures.push(detail ? `${label}\n      ${detail}` : label);
}

/* ---------------------------------------------------------------- */
/* The offline parser                                                */
/* ---------------------------------------------------------------- */

const SAMPLE = `Ada Okonkwo
ada.okonkwo@example.com | +44 7700 900123 | linkedin.com/in/adaokonkwo
London, UK

SUMMARY

Backend engineer with eight years building payment and ledger systems.

EXPERIENCE

Northwind Financial | Staff Engineer | London
Feb 2023 – Present
• Led the migration of the settlement ledger to event sourcing
• Introduced consumer-driven contract tests across 14 services

Brightwell Payments | Senior Backend Engineer | Remote
June 2019 - January 2023
• Designed an idempotency layer that eliminated duplicate charges

EDUCATION

University of Manchester
BSc Computer Science, First Class
2015 – 2018

SKILLS

Languages: Go, TypeScript, Python, SQL
Infrastructure: Kubernetes, Terraform, AWS

CERTIFICATIONS

Certified Kubernetes Administrator
April 2024
`;

console.log("Offline parser\n");

const cv = parseCv(SAMPLE);
const byTitle = (t: string) => cv.sections.find((s) => s.title === t);

check("contact details read", cv.profile.full_name === "Ada Okonkwo" && cv.profile.email === "ada.okonkwo@example.com");
check("location read", cv.profile.location === "London, UK", cv.profile.location);
check("summary becomes prose", byTitle("SUMMARY")?.kind === "prose");
check("skills become groups", byTitle("SKILLS")?.groups.length === 2, String(byTitle("SKILLS")?.groups.length));
check(
  "a group label is not mistaken for a heading",
  byTitle("SKILLS")?.groups[0].label === "Languages",
  JSON.stringify(byTitle("SKILLS")?.groups[0].label),
);

const experience = byTitle("EXPERIENCE");
check("both jobs found", experience?.entries.length === 2, String(experience?.entries.length));

// The regression that mattered: a date on its own line used to start a new
// record, splitting every job in two and shifting every date by one.
const first = experience?.entries[0];
check("org, role and location split", first?.org === "Northwind Financial" && first?.role === "Staff Engineer" && first?.location === "London",
  JSON.stringify([first?.org, first?.role, first?.location]));
check("date on its own line binds to its own record", first?.start_date === "2023-02", String(first?.start_date));
check("ongoing role has no end date", first?.end_date === "");
check("its bullets stay with it", first?.bullets.length === 2, String(first?.bullets.length));

const second = experience?.entries[1];
check("second job keeps its own dates", second?.start_date === "2019-06" && second?.end_date === "2023-01",
  JSON.stringify([second?.start_date, second?.end_date]));

const certs = byTitle("CERTIFICATIONS");
check("certifications are single-date", certs?.dateMode === "single");
check("certification date read", certs?.entries[0].start_date === "2024-04", String(certs?.entries[0].start_date));

check("year-only range read", byTitle("EDUCATION")?.entries[0].start_date === "2015-01");
check("nothing left unplaced", cv.leftovers.length === 0, JSON.stringify(cv.leftovers));

check("empty input does not throw", parseCv("").sections.length === 0);
check("noise does not throw", parseCv("!!!\n\n???").sections.length >= 0);

/* ---------------------------------------------------------------- */
/* The coercion barrier                                              */
/* ---------------------------------------------------------------- */

console.log("\nCoercion barrier — what a model returns must not be trusted\n");

check("no title rejected", coerceSection({ kind: "entries", entries: [{ org: "X" }] }) === null);
check("non-object rejected", coerceSection("Experience") === null);
check("null rejected", coerceSection(null) === null);

check(
  "invented kind falls back to entries",
  coerceSection({ title: "T", kind: "wormhole", entries: [{ org: "A" }] })?.kind === "entries",
);

const dates = coerceSection({
  title: "Jobs",
  kind: "entries",
  dateMode: "range",
  entries: [
    { org: "A", start_date: "March 2023", end_date: "2024-13" },
    { org: "B", start_date: "2021", end_date: "2022-06" },
    { org: "C", start_date: { evil: true }, end_date: ["x"] },
  ],
});
check("free-text date dropped", dates?.entries[0].start_date === "");
check("impossible month dropped", dates?.entries[0].end_date === "");
check("bare year becomes January", dates?.entries[1].start_date === "2021-01");
check("well-formed month kept", dates?.entries[1].end_date === "2022-06");
check("non-string date dropped", dates?.entries[2].start_date === "" && dates?.entries[2].end_date === "");

check(
  "single-date section never carries an end date",
  coerceSection({
    title: "Certs", kind: "entries", dateMode: "single",
    entries: [{ org: "CKA", start_date: "2024-04", end_date: "2025-01" }],
  })?.entries[0].end_date === "",
);

check("wrong-typed collection rejected", coerceSection({ title: "T", kind: "skills", groups: "nope" }) === null);

const mixed = coerceSection({
  title: "S", kind: "skills",
  groups: [{ label: 7, skills: ["Go", 42, null, "  "] }],
});
check("non-string skills filtered out", JSON.stringify(mixed?.groups[0].skills) === '["Go"]', JSON.stringify(mixed?.groups[0].skills));
check("non-string label becomes empty", mixed?.groups[0].label === "");

check("record with no content rejected", coerceSection({ title: "T", kind: "entries", entries: [{ subtitle: "note" }] }) === null);
check(
  "oversized field truncated",
  coerceSection({ title: "T", kind: "entries", entries: [{ org: "x".repeat(5000) }] })?.entries[0].org.length === 120,
);

check("fenced JSON read", (extractJson('```json\n{"a":1}\n```') as { a: number }).a === 1);
check("bare JSON read", (extractJson('{"a":2}') as { a: number }).a === 2);
check("JSON surrounded by prose read", (extractJson('Sure! {"a":3} hope that helps') as { a: number }).a === 3);

let threw = false;
try {
  extractJson("no json here");
} catch {
  threw = true;
}
check("unparseable reply throws so the caller falls back", threw);

/* ---------------------------------------------------------------- */

console.log(`\n  ${pass} passed, ${failures.length} failed`);
if (failures.length > 0) {
  console.error(`\n${failures.map((f) => `  ${f}`).join("\n")}`);
  process.exit(1);
}
