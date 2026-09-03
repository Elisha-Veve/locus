import { DEFAULT_CV_STYLE } from "./cvStyles";
import { formatMonth, formatRange } from "./dates";
import type { DateMode } from "./types";

/**
 * Experience runs over a range; a certificate or award is earned on one date,
 * and some sections (referees, interests) carry none at all.
 *
 * A single date is held in start_date with end_date left empty, which also
 * keeps reverse-chronological sorting right: every such entry ties on the
 * "ongoing" end key and then falls back to start date, newest first.
 */
function entryDates(mode: DateMode, start: string, end: string): string {
  if (mode === "none") return "";
  if (mode === "single") return formatMonth(start || end);
  return formatRange(start, end);
}
import type { BuilderCv, RenderDoc, RenderSection } from "./types";

/**
 * Strip everything not selected and flatten to what the renderer needs.
 * Pure — no database — so the builder can run it in the browser for an instant
 * preview while the server persists the same selection in the background.
 */
export function resolveCv(builder: BuilderCv): RenderDoc {
  const sections: RenderSection[] = builder.sections
    .filter((s) => s.included)
    .map((s) => ({
      title: s.title,
      kind: s.kind,
      dateMode: s.date_mode,
      entries: s.entries
        .filter((e) => e.included)
        .map((e) => ({
          org: e.org,
          role: e.role,
          subtitle: e.subtitle,
          location: e.location,
          dates: entryDates(s.date_mode, e.start_date, e.end_date),
          bullets: e.bullets.filter((b) => b.included).map((b) => b.effectiveText),
        }))
        // A record with nothing in it — half-created and never filled — would
        // otherwise put a bare section heading on the page.
        .filter(
          (e) =>
            e.org.trim() !== "" ||
            e.role.trim() !== "" ||
            e.subtitle.trim() !== "" ||
            e.bullets.length > 0,
        ),
      skillGroups: s.skillGroups
        .filter((g) => g.included)
        .map((g) => ({
          label: g.label,
          skills: g.skills.filter((sk) => sk.included).map((sk) => sk.name),
        }))
        .filter((g) => g.skills.length > 0),
      prose: s.prose
        .filter((p) => p.included && p.effectiveText.trim() !== "")
        .map((p) => p.effectiveText),
    }))
    .filter((s) => {
      if (s.kind === "skills") return s.skillGroups.length > 0;
      if (s.kind === "prose") return s.prose.length > 0;
      return s.entries.length > 0;
    });

  return {
    profile: builder.profile,
    sections,
    style: builder.cv.style || DEFAULT_CV_STYLE,
  };
}
