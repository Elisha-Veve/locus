import { DEFAULT_CV_STYLE } from "./cvStyles";
import { formatRange } from "./dates";
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
      entries: s.entries
        .filter((e) => e.included)
        .map((e) => ({
          org: e.org,
          role: e.role,
          subtitle: e.subtitle,
          location: e.location,
          dates: formatRange(e.start_date, e.end_date),
          bullets: e.bullets.filter((b) => b.included).map((b) => b.effectiveText),
        })),
      skillGroups: s.skillGroups
        .filter((g) => g.included)
        .map((g) => ({
          label: g.label,
          skills: g.skills.filter((sk) => sk.included).map((sk) => sk.name),
        }))
        .filter((g) => g.skills.length > 0),
    }))
    .filter((s) =>
      s.kind === "skills" ? s.skillGroups.length > 0 : s.entries.length > 0,
    );

  return {
    profile: builder.profile,
    sections,
    style: builder.cv.style || DEFAULT_CV_STYLE,
  };
}
