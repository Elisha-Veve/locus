import { db } from "./db";
import { byReverseChrono } from "./dates";
import { resolveCv } from "./resolve";
import type {
  BuilderCv,
  BuilderEntry,
  BuilderSection,
  BuilderSkillGroup,
  Bullet,
  Cv,
  Entry,
  Library,
  LibrarySection,
  Prose,
  Profile,
  RenderDoc,
  Section,
  Skill,
  SkillGroup,
} from "./types";

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export function getProfile(): Profile {
  return db()
    .prepare(
      "SELECT full_name, email, phone, linkedin, website, location FROM profile WHERE id = 1",
    )
    .get() as Profile;
}

export function updateProfile(p: Partial<Profile>): void {
  const current = getProfile();
  const next = { ...current, ...p };
  db()
    .prepare(
      `UPDATE profile SET full_name = @full_name, email = @email, phone = @phone,
       linkedin = @linkedin, website = @website, location = @location WHERE id = 1`,
    )
    .run(next);
}

/* ------------------------------------------------------------------ */
/* Library (master records)                                            */
/* ------------------------------------------------------------------ */

export function getLibrary(): Library {
  const conn = db();
  const sections = conn
    .prepare("SELECT * FROM section WHERE archived = 0 ORDER BY sort_order, id")
    .all() as Section[];
  const entries = conn
    .prepare("SELECT * FROM entry WHERE archived = 0 ORDER BY sort_order, id")
    .all() as Entry[];
  const bullets = conn
    .prepare("SELECT * FROM bullet WHERE archived = 0 ORDER BY sort_order, id")
    .all() as Bullet[];
  const groups = conn
    .prepare("SELECT * FROM skill_group WHERE archived = 0 ORDER BY sort_order, id")
    .all() as SkillGroup[];
  const skills = conn
    .prepare("SELECT * FROM skill WHERE archived = 0 ORDER BY sort_order, id")
    .all() as Skill[];
  const prose = conn
    .prepare("SELECT * FROM prose WHERE archived = 0 ORDER BY sort_order, id")
    .all() as Prose[];

  const bulletsByEntry = groupBy(bullets, (b) => b.entry_id);
  const skillsByGroup = groupBy(skills, (s) => s.group_id);
  const entriesBySection = groupBy(entries, (e) => e.section_id);
  const groupsBySection = groupBy(groups, (g) => g.section_id);
  const proseBySection = groupBy(prose, (p) => p.section_id);

  const librarySections: LibrarySection[] = sections.map((s) => ({
    ...s,
    entries: (entriesBySection.get(s.id) ?? []).map((e) => ({
      ...e,
      bullets: bulletsByEntry.get(e.id) ?? [],
    })),
    skillGroups: (groupsBySection.get(s.id) ?? []).map((g) => ({
      ...g,
      skills: skillsByGroup.get(g.id) ?? [],
    })),
    prose: proseBySection.get(s.id) ?? [],
  }));

  return { profile: getProfile(), sections: librarySections };
}

/* ------------------------------------------------------------------ */
/* CVs                                                                 */
/* ------------------------------------------------------------------ */

export function listCvs(): Cv[] {
  return db()
    .prepare("SELECT * FROM cv ORDER BY updated_at DESC, id DESC")
    .all() as Cv[];
}

export function getCv(id: number): Cv | undefined {
  return db().prepare("SELECT * FROM cv WHERE id = ?").get(id) as Cv | undefined;
}

export function touchCv(id: number): void {
  db().prepare("UPDATE cv SET updated_at = datetime('now') WHERE id = ?").run(id);
}

/**
 * Library + this CV's overlay. A missing overlay row means "library default":
 * included, in library order. That way records added later show up in old CVs
 * instead of silently vanishing.
 */
export function getBuilderCv(cvId: number): BuilderCv | null {
  const cv = getCv(cvId);
  if (!cv) return null;

  const conn = db();
  const library = getLibrary();

  const ovSection = indexBy(
    conn.prepare("SELECT * FROM cv_section WHERE cv_id = ?").all(cvId) as Array<{
      section_id: number;
      included: number | null;
      sort_order: number | null;
      auto_order: number;
    }>,
    (r) => r.section_id,
  );
  const ovEntry = indexBy(
    conn.prepare("SELECT * FROM cv_entry WHERE cv_id = ?").all(cvId) as Array<{
      entry_id: number;
      included: number | null;
      sort_order: number | null;
    }>,
    (r) => r.entry_id,
  );
  const ovBullet = indexBy(
    conn.prepare("SELECT * FROM cv_bullet WHERE cv_id = ?").all(cvId) as Array<{
      bullet_id: number;
      included: number | null;
      sort_order: number | null;
      override_text: string | null;
    }>,
    (r) => r.bullet_id,
  );
  const ovGroup = indexBy(
    conn.prepare("SELECT * FROM cv_skill_group WHERE cv_id = ?").all(cvId) as Array<{
      group_id: number;
      included: number | null;
      sort_order: number | null;
    }>,
    (r) => r.group_id,
  );
  const ovProse = indexBy(
    conn.prepare("SELECT * FROM cv_prose WHERE cv_id = ?").all(cvId) as Array<{
      prose_id: number;
      included: number | null;
      sort_order: number | null;
      override_text: string | null;
    }>,
    (r) => r.prose_id,
  );
  const ovSkill = indexBy(
    conn.prepare("SELECT * FROM cv_skill WHERE cv_id = ?").all(cvId) as Array<{
      skill_id: number;
      included: number | null;
      sort_order: number | null;
    }>,
    (r) => r.skill_id,
  );

  const sections: BuilderSection[] = library.sections
    .map((s) => {
      const o = ovSection.get(s.id);
      const autoOrder = o ? o.auto_order === 1 : true;

      const entries: BuilderEntry[] = s.entries
        .map((e) => {
          const oe = ovEntry.get(e.id);
          const bullets = e.bullets
            .map((b) => {
              const ob = ovBullet.get(b.id);
              const overrideText = ob?.override_text ?? null;
              return {
                ...b,
                included: ob?.included == null ? true : ob.included === 1,
                cvOrder: ob?.sort_order ?? b.sort_order,
                overrideText,
                effectiveText: overrideText ?? b.text,
              };
            })
            .sort(by((b) => b.cvOrder, (b) => b.id));
          return {
            ...e,
            included: oe?.included == null ? true : oe.included === 1,
            cvOrder: oe?.sort_order ?? e.sort_order,
            bullets,
          };
        })
        .sort(
          autoOrder
            ? (a, b) => byReverseChrono(a, b) || a.id - b.id
            : by((e) => e.cvOrder, (e) => e.id),
        );

      const skillGroups: BuilderSkillGroup[] = s.skillGroups
        .map((g) => {
          const og = ovGroup.get(g.id);
          const skills = g.skills
            .map((sk) => {
              const os = ovSkill.get(sk.id);
              return {
                ...sk,
                included: os?.included == null ? true : os.included === 1,
                cvOrder: os?.sort_order ?? sk.sort_order,
              };
            })
            .sort(by((sk) => sk.cvOrder, (sk) => sk.id));
          return {
            ...g,
            included: og?.included == null ? true : og.included === 1,
            cvOrder: og?.sort_order ?? g.sort_order,
            skills,
          };
        })
        .sort(by((g) => g.cvOrder, (g) => g.id));

      // Prose variants are alternatives, not a list: a section holding three
      // angles on the same summary should start with one ticked, not all
      // three stacked. Everything else defaults to included.
      const prose = s.prose
        .map((p, index) => {
          const op = ovProse.get(p.id);
          const overrideText = op?.override_text ?? null;
          return {
            ...p,
            included: op?.included == null ? index === 0 : op.included === 1,
            cvOrder: op?.sort_order ?? p.sort_order,
            overrideText,
            effectiveText: overrideText ?? p.body,
          };
        })
        .sort(by((p) => p.cvOrder, (p) => p.id));

      return {
        ...s,
        included: o?.included == null ? true : o.included === 1,
        cvOrder: o?.sort_order ?? s.sort_order,
        autoOrder,
        entries,
        skillGroups,
        prose,
      };
    })
    .sort(by((s) => s.cvOrder, (s) => s.id));

  return { cv, profile: library.profile, sections };
}

export { resolveCv };

export function getRenderDoc(cvId: number): RenderDoc | null {
  const builder = getBuilderCv(cvId);
  return builder ? resolveCv(builder) : null;
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function groupBy<T>(rows: T[], key: (row: T) => number): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const row of rows) {
    const k = key(row);
    const list = map.get(k);
    if (list) list.push(row);
    else map.set(k, [row]);
  }
  return map;
}

function indexBy<T>(rows: T[], key: (row: T) => number): Map<number, T> {
  return new Map(rows.map((r) => [key(r), r]));
}

function by<T>(...keys: Array<(row: T) => number>) {
  return (a: T, b: T): number => {
    for (const k of keys) {
      const diff = k(a) - k(b);
      if (diff !== 0) return diff;
    }
    return 0;
  };
}
