/**
 * The CV document stylesheet. This is the single source of truth: the on-screen
 * preview and the Puppeteer PDF inject this exact string, so what you see is
 * what gets exported.
 *
 * Base metrics are lifted from the original Word document:
 *   A4, 45.35pt left/right margins, 23.7pt top
 *   Garamond 12pt body / 17pt name / 12pt small-caps section headings
 *   bullets flush to the left margin (no hanging indent)
 *
 * Vertical rhythm is shared. The base declares --cv-lead and the --cv-gap-*
 * spacing on .cv-page, and a style overrides those variables rather than
 * setting margins of its own, so the styles stay comparable in density. The
 * leading multiplier differs per face on purpose: Garamond's x-height is ~40%
 * of its em against ~55% for the sans faces, so it needs a smaller multiplier
 * to read at the same apparent spacing.
 *
 * Styles are variants layered on that base and selected by a data-style
 * attribute on .cv-page, so switching one is a single attribute change with no
 * separate stylesheets to keep in sync. Every style is black on white: this is
 * a printed page, and the app's colour themes deliberately do not reach it.
 */
export const PAGE = {
  widthPt: 595.28,
  heightPt: 841.89,
  marginXPt: 45.35,
  marginTopPt: 23.7,
  marginBottomPt: 28,
};

export interface CvStyleOption {
  id: string;
  label: string;
  hint: string;
}

export const CV_STYLES: CvStyleOption[] = [
  { id: "classic", label: "Classic", hint: "Garamond with hairline rules" },
  { id: "quiet", label: "Quiet", hint: "Centred, rule-free, more air" },
  { id: "modern", label: "Modern", hint: "Inter, tracked capitals" },
  { id: "margin", label: "Margin", hint: "Headings set in the left margin" },
  { id: "ledger", label: "Ledger", hint: "Garamond, ruled headings, roomier" },
  { id: "open", label: "Open", hint: "Open Sans, centred, lots of air" },
  { id: "slate", label: "Slate", hint: "Merriweather, role above employer" },
];

export const DEFAULT_CV_STYLE = "classic";

const SERIF = `"EB Garamond", Garamond, "Adobe Garamond Pro", Georgia,
    "Times New Roman", serif`;
const SANS = `"Inter", ui-sans-serif, -apple-system, "Segoe UI", Roboto,
    Helvetica, Arial, sans-serif`;
const HUMANIST = `"Open Sans", "Segoe UI", Helvetica, Arial, sans-serif`;
const SLAB = `"Merriweather", Georgia, "Times New Roman", serif`;

export const cvStyles = `
/* ---------------- base ---------------- */

.cv-page {
  box-sizing: border-box;
  width: ${PAGE.widthPt}pt;
  padding: ${PAGE.marginTopPt}pt ${PAGE.marginXPt}pt ${PAGE.marginBottomPt}pt;
  font-family: ${SERIF};
  font-size: 12pt;

  /* The shared vertical rhythm. Styles override these rather than setting
     margins directly, so the spacing stays comparable across all of them.
     Leading is tuned per face: Garamond has a much smaller x-height than the
     sans faces, so the same apparent spacing needs a smaller multiplier. */
  --cv-lead: 1.16;
  --cv-gap-bullet: 2pt;   /* between consecutive bullets */
  --cv-gap-entry: 10pt;   /* between records */
  --cv-gap-section: 13pt; /* between sections */
  --cv-gap-title: 4pt;    /* under a section heading */
  --cv-gap-head: 4pt;     /* under an entry heading, above its bullets */

  line-height: var(--cv-lead);
  color: #000;
  background: #fff;
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
}

.cv-page * { box-sizing: border-box; }

.cv-name {
  font-size: 17pt;
  font-weight: 700;
  line-height: 1.15;
  margin: 0 0 1pt;
}
.cv-contact {
  font-size: 11pt;
  line-height: 1.14;
  margin: 0;
}
.cv-contact .label { font-style: italic; }

.cv-section { margin-top: var(--cv-gap-section); }
.cv-section:first-of-type { margin-top: 13pt; }
.cv-section-title {
  font-size: 12pt;
  font-weight: 700;
  font-variant-caps: small-caps;
  font-variant: small-caps;
  letter-spacing: 0.15pt;
  line-height: 1.15;
  margin: 0 0 var(--cv-gap-title);
  padding-bottom: 1pt;
  border-bottom: 0.5pt solid #000;
}

.cv-entry { margin-top: var(--cv-gap-entry); break-inside: avoid; }
.cv-section-body > .cv-entry:first-child { margin-top: 0; }
.cv-entry-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 12pt;
  line-height: var(--cv-lead);
  padding-bottom: 1pt;
  margin-bottom: 1.5pt;
  border-bottom: 0.5pt solid #000;
}
.cv-entry-title { font-weight: 700; }
.cv-entry-org { font-weight: 700; }
.cv-entry-role { font-weight: 400; }
.cv-entry-role::before { content: " - "; }
.cv-entry-dates {
  font-weight: 700;
  font-style: italic;
  white-space: nowrap;
  flex: none;
}
.cv-entry-subtitle { line-height: var(--cv-lead); }

/* The original wraps flush to the left margin rather than hanging under the
   text, so the base style reproduces that instead of using a real list. */
.cv-bullets { margin: var(--cv-gap-head) 0 0; padding: 0; list-style: none; }
.cv-bullet { margin: 0; line-height: var(--cv-lead); }
.cv-bullet + .cv-bullet { margin-top: var(--cv-gap-bullet); }
.cv-bullet .dot { margin-right: 4pt; }

.cv-skill-group { line-height: var(--cv-lead); }
.cv-skill-group + .cv-skill-group { margin-top: var(--cv-gap-bullet); }
.cv-skill-group .dot { margin-right: 4pt; }
.cv-skill-label { font-weight: 700; }

.cv-empty { color: #999; font-style: italic; }

/* ---------------- quiet ---------------- */
/* Centred header, no rules anywhere, longer leading. */

.cv-page[data-style="quiet"] {
  --cv-lead: 1.22;
  --cv-gap-section: 14pt;
  --cv-gap-title: 5pt;
}
.cv-page[data-style="quiet"] .cv-head { text-align: center; margin-bottom: 4pt; }
.cv-page[data-style="quiet"] .cv-name {
  font-size: 19pt;
  letter-spacing: 0.4pt;
  margin-bottom: 3pt;
}
.cv-page[data-style="quiet"] .cv-contact {
  display: inline;
  font-size: 10.5pt;
}
.cv-page[data-style="quiet"] .cv-contact + .cv-contact::before {
  content: " · ";
}
.cv-page[data-style="quiet"] .cv-contact .label { display: none; }
.cv-page[data-style="quiet"] .cv-section-title {
  border-bottom: none;
  padding-bottom: 0;
  letter-spacing: 1pt;
  margin-bottom: 5pt;
}
.cv-page[data-style="quiet"] .cv-entry-head {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 1pt;
}
.cv-page[data-style="quiet"] .cv-entry-dates { font-weight: 400; }
.cv-page[data-style="quiet"] .cv-bullet .dot,
.cv-page[data-style="quiet"] .cv-skill-group .dot { display: none; }
.cv-page[data-style="quiet"] .cv-bullet,
.cv-page[data-style="quiet"] .cv-skill-group {
  padding-left: 10pt;
  text-indent: -10pt;
}
.cv-page[data-style="quiet"] .cv-bullet::before,
.cv-page[data-style="quiet"] .cv-skill-group::before {
  content: "– ";
}

/* ---------------- modern ---------------- */
/* Inter, tracked capitals for headings, one hairline per section. */

.cv-page[data-style="modern"] {
  font-family: ${SANS};
  font-size: 9.6pt;
  --cv-lead: 1.5;
  --cv-gap-title: 5pt;
}
.cv-page[data-style="modern"] .cv-name {
  font-size: 19pt;
  font-weight: 600;
  letter-spacing: -0.3pt;
  line-height: 1.2;
  margin-bottom: 2pt;
}
.cv-page[data-style="modern"] .cv-contact {
  display: inline;
  font-size: 9pt;
  color: #333;
}
.cv-page[data-style="modern"] .cv-contact + .cv-contact::before {
  content: "  ·  ";
}
.cv-page[data-style="modern"] .cv-contact .label { display: none; }
.cv-page[data-style="modern"] .cv-section-title {
  font-size: 8pt;
  font-weight: 600;
  font-variant: normal;
  font-variant-caps: normal;
  text-transform: uppercase;
  letter-spacing: 1.4pt;
  padding-bottom: 3pt;
  margin-bottom: 5pt;
  border-bottom: 0.5pt solid #000;
}
.cv-page[data-style="modern"] .cv-entry-head {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 1pt;
}
.cv-page[data-style="modern"] .cv-entry-title { font-weight: 600; }
.cv-page[data-style="modern"] .cv-entry-role { color: #333; }
.cv-page[data-style="modern"] .cv-entry-dates {
  font-weight: 400;
  font-style: normal;
  font-size: 9pt;
  color: #333;
  font-variant-numeric: tabular-nums;
}
.cv-page[data-style="modern"] .cv-bullet .dot,
.cv-page[data-style="modern"] .cv-skill-group .dot { display: none; }
.cv-page[data-style="modern"] .cv-bullet,
.cv-page[data-style="modern"] .cv-skill-group {
  padding-left: 9pt;
  text-indent: -9pt;
}
.cv-page[data-style="modern"] .cv-bullet::before,
.cv-page[data-style="modern"] .cv-skill-group::before {
  content: "– ";
}

/* ---------------- margin ---------------- */
/* Section headings sit out in the left margin, against the text block. */

.cv-page[data-style="margin"] .cv-section {
  display: flex;
  align-items: flex-start;
  gap: 14pt;
}
.cv-page[data-style="margin"] .cv-section-title {
  flex: 0 0 78pt;
  text-align: right;
  border-bottom: none;
  padding-bottom: 0;
  margin: 0;
  font-size: 11pt;
  letter-spacing: 0.4pt;
  /* Nudged to sit on the first baseline of the body beside it. */
  padding-top: 0.5pt;
}
.cv-page[data-style="margin"] .cv-section-body { flex: 1; min-width: 0; }
.cv-page[data-style="margin"] .cv-entry-head {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 1pt;
}
.cv-page[data-style="margin"] .cv-entry-dates { font-weight: 400; }
/* The text column is narrower here, so bullets hang rather than wrapping
   flush — otherwise the wrapped lines run together with the markers. */
.cv-page[data-style="margin"] .cv-bullet,
.cv-page[data-style="margin"] .cv-skill-group {
  padding-left: 10pt;
  text-indent: -10pt;
}

/* ---------------- ledger ---------------- */
/* Garamond with ruled section headings but no rules on entries, contacts on
   one line, and hanging bullets. */

.cv-page[data-style="ledger"] { --cv-gap-title: 5pt; }
.cv-page[data-style="ledger"] .cv-name {
  font-size: 20pt;
  margin-bottom: 3pt;
}
.cv-page[data-style="ledger"] .cv-contact { display: inline; }
.cv-page[data-style="ledger"] .cv-contact + .cv-contact::before {
  content: "  |  ";
}
.cv-page[data-style="ledger"] .cv-contact .label { display: none; }
.cv-page[data-style="ledger"] .cv-head { margin-bottom: 6pt; }
.cv-page[data-style="ledger"] .cv-entry-head {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 2pt;
}
.cv-page[data-style="ledger"] .cv-bullet,
.cv-page[data-style="ledger"] .cv-skill-group {
  padding-left: 11pt;
  text-indent: -11pt;
  margin-bottom: 1.5pt;
}

/* ---------------- open ---------------- */
/* Open Sans, centred header, no rules, and a lot of breathing room. Dates sit
   inline after the organisation rather than out at the right margin. */

.cv-page[data-style="open"] {
  font-family: ${HUMANIST};
  font-size: 9.6pt;
  --cv-lead: 1.48;
  --cv-gap-entry: 12pt;
  --cv-gap-section: 16pt;
  --cv-gap-title: 6pt;
  --cv-gap-head: 5pt;
}
.cv-page[data-style="open"] .cv-head {
  text-align: center;
  margin-bottom: 10pt;
}
.cv-page[data-style="open"] .cv-name {
  font-size: 13pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5pt;
  margin-bottom: 4pt;
}
.cv-page[data-style="open"] .cv-contact {
  display: inline;
  font-size: 9.2pt;
}
.cv-page[data-style="open"] .cv-contact + .cv-contact::before {
  content: "  |  ";
}
.cv-page[data-style="open"] .cv-contact .label { display: none; }
.cv-page[data-style="open"] .cv-section:first-of-type { margin-top: 14pt; }
.cv-page[data-style="open"] .cv-section-title {
  font-size: 10pt;
  font-weight: 700;
  font-variant: normal;
  font-variant-caps: normal;
  text-transform: uppercase;
  letter-spacing: 0.3pt;
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 7pt;
}
.cv-page[data-style="open"] .cv-entry-head {
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 4pt;
  justify-content: flex-start;
  gap: 0;
}
.cv-page[data-style="open"] .cv-entry-org { text-transform: uppercase; }
.cv-page[data-style="open"] .cv-entry-role::before {
  content: "|";
  margin: 0 5pt;
}
.cv-page[data-style="open"] .cv-entry-dates {
  font-weight: 400;
  font-style: normal;
}
.cv-page[data-style="open"] .cv-entry-dates::before {
  content: "|";
  margin: 0 5pt;
}
.cv-page[data-style="open"] .cv-bullet,
.cv-page[data-style="open"] .cv-skill-group {
  padding-left: 14pt;
  text-indent: -14pt;
  margin-bottom: 2pt;
}
.cv-page[data-style="open"] .cv-bullet .dot,
.cv-page[data-style="open"] .cv-skill-group .dot { margin-right: 7pt; }

/* ---------------- slate ---------------- */
/* Merriweather in a dark slate, ruled headings, and the entry inverted: the
   role reads first, the employer sits under it beside the dates. */

.cv-page[data-style="slate"] {
  font-family: ${SLAB};
  font-size: 8.8pt;
  --cv-lead: 1.52;
  color: #2e3d50;
}
.cv-page[data-style="slate"] .cv-head {
  text-align: center;
  margin-bottom: 9pt;
}
.cv-page[data-style="slate"] .cv-name {
  font-size: 16pt;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.1pt;
  line-height: 1.2;
  margin-bottom: 4pt;
}
.cv-page[data-style="slate"] .cv-contact {
  display: inline;
  font-size: 7.6pt;
}
.cv-page[data-style="slate"] .cv-contact + .cv-contact::before {
  content: "   ·   ";
}
.cv-page[data-style="slate"] .cv-contact .label { display: none; }
.cv-page[data-style="slate"] .cv-section-title {
  font-size: 11pt;
  font-weight: 400;
  font-variant: normal;
  font-variant-caps: normal;
  text-transform: uppercase;
  letter-spacing: 0.2pt;
  padding-bottom: 2pt;
  margin-bottom: 4pt;
  border-bottom: 0.75pt solid #c9d0d9;
}
/* flex-end aligns the dates with the employer line, not the role above it */
.cv-page[data-style="slate"] .cv-entry-head {
  align-items: flex-end;
  border-bottom: none;
  padding-bottom: 0;
  margin-bottom: 2pt;
}
.cv-page[data-style="slate"] .cv-entry-title {
  display: flex;
  flex-direction: column-reverse;
  min-width: 0;
}
.cv-page[data-style="slate"] .cv-entry-role {
  font-size: 10.5pt;
  font-weight: 400;
  line-height: 1.25;
}
.cv-page[data-style="slate"] .cv-entry-role::before { content: none; }
.cv-page[data-style="slate"] .cv-entry-org {
  font-size: 8.8pt;
  font-weight: 700;
}
.cv-page[data-style="slate"] .cv-entry-dates {
  font-size: 8.8pt;
  font-weight: 700;
  font-style: normal;
}
.cv-page[data-style="slate"] .cv-entry-subtitle { font-size: 8.8pt; }
.cv-page[data-style="slate"] .cv-bullet .dot,
.cv-page[data-style="slate"] .cv-skill-group .dot { display: none; }
.cv-page[data-style="slate"] .cv-bullet,
.cv-page[data-style="slate"] .cv-skill-group {
  padding-left: 6pt;
  text-indent: -6pt;
}
.cv-page[data-style="slate"] .cv-bullet::before,
.cv-page[data-style="slate"] .cv-skill-group::before { content: "· "; }
`;

/** Screen-only chrome around the page (drop shadow, centering). Not in the PDF. */
export const cvPreviewChrome = `
.cv-page {
  margin: 0 auto;
  box-shadow: 0 1px 3px rgba(0,0,0,.12), 0 12px 32px rgba(0,0,0,.14);
  border-radius: 2px;
}
`;
