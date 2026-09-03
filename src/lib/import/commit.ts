import { db } from "../db";
import type { ImportedCv } from "./types.ts";
import { sectionIsEmpty } from "./types.ts";

/**
 * Write a reviewed import into the library.
 *
 * Only what is still ticked is written — `chosen` is the person's decision and
 * this respects it at every level, so unticking a single bullet drops that
 * bullet and nothing else. The whole thing runs in one transaction: a partial
 * import that half-fills the library would be worse than none, because the
 * only way back is finding and deleting the half that landed.
 *
 * Sections are appended, never merged into existing ones. Merging means
 * guessing that "Experience" and "Work experience" are the same section, and
 * guessing wrong silently rearranges someone's library. Appending is visible
 * and undoable by hand.
 */

/** What replacing would destroy, so it can be said before it happens. */
export interface LibraryWeight {
  sections: number;
  entries: number;
  bullets: number;
  skills: number;
  prose: number;
  /** CVs whose selections are made of these records. */
  cvs: number;
}

export interface ImportSummary {
  sections: number;
  entries: number;
  bullets: number;
  groups: number;
  skills: number;
  prose: number;
  profileUpdated: boolean;
  /** True when the library was emptied first. */
  replaced: boolean;
}

/** How much is in the library now, and how many CVs are built on it. */
export function weighLibrary(): LibraryWeight {
  const conn = db();
  const count = (sql: string) => (conn.prepare(sql).get() as { n: number }).n;
  return {
    sections: count("SELECT COUNT(*) AS n FROM section"),
    entries: count("SELECT COUNT(*) AS n FROM entry"),
    bullets: count("SELECT COUNT(*) AS n FROM bullet"),
    skills: count("SELECT COUNT(*) AS n FROM skill"),
    prose: count("SELECT COUNT(*) AS n FROM prose"),
    cvs: count("SELECT COUNT(*) AS n FROM cv"),
  };
}

export function commitImport(
  cv: ImportedCv,
  options: { applyProfile: boolean; replace?: boolean },
): ImportSummary {
  const conn = db();
  const summary: ImportSummary = {
    sections: 0, entries: 0, bullets: 0, groups: 0, skills: 0, prose: 0,
    profileUpdated: false, replaced: false,
  };

  const insertSection = conn.prepare(
    "INSERT INTO section (title, kind, date_mode, sort_order) VALUES (?, ?, ?, ?)",
  );
  const insertEntry = conn.prepare(
    `INSERT INTO entry (section_id, org, role, subtitle, location, start_date, end_date, sort_order)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  );
  const insertBullet = conn.prepare(
    "INSERT INTO bullet (entry_id, text, sort_order) VALUES (?, ?, ?)",
  );
  const insertGroup = conn.prepare(
    "INSERT INTO skill_group (section_id, label, sort_order) VALUES (?, ?, ?)",
  );
  const insertSkill = conn.prepare(
    "INSERT INTO skill (group_id, name, sort_order) VALUES (?, ?, ?)",
  );
  const insertProse = conn.prepare(
    "INSERT INTO prose (section_id, label, body, sort_order) VALUES (?, ?, ?, ?)",
  );

  const apply = conn.transaction(() => {
    if (options.replace) {
      // Deleting sections cascades through entry, bullet, prose, skill_group
      // and skill, and through every cv_* overlay built on them — so existing
      // CVs survive as records but lose their selections. Saved exports are
      // untouched: those hold their own snapshot, so an old PDF stays true.
      // Inside the transaction, so a failure leaves the library as it was.
      conn.prepare("DELETE FROM section").run();
      summary.replaced = true;
    }

    if (options.applyProfile) {
      // Only fill blanks. An import must not overwrite details already there.
      const current = conn
        .prepare("SELECT * FROM profile WHERE id = 1")
        .get() as Record<string, string>;
      const patch: Record<string, string> = {};
      for (const [key, value] of Object.entries(cv.profile)) {
        if (value && !String(current[key] ?? "").trim()) patch[key] = value;
      }
      if (Object.keys(patch).length > 0) {
        const sets = Object.keys(patch).map((k) => `${k} = @${k}`).join(", ");
        conn.prepare(`UPDATE profile SET ${sets} WHERE id = 1`).run(patch);
        summary.profileUpdated = true;
      }
    }

    // Imported sections land after whatever is already in the library.
    let order = (
      conn
        .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS n FROM section")
        .get() as { n: number }
    ).n;

    for (const section of cv.sections) {
      if (!section.chosen) continue;

      const entries = section.entries.filter((e) => e.chosen);
      const groups = section.groups.filter((g) => g.chosen);
      const prose = section.prose.filter((p) => p.chosen);
      if (sectionIsEmpty({ ...section, entries, groups, prose })) continue;

      const sectionId = Number(
        insertSection.run(section.title, section.kind, section.dateMode, order++).lastInsertRowid,
      );
      summary.sections += 1;

      entries.forEach((entry, i) => {
        const entryId = Number(
          insertEntry.run(
            sectionId, entry.org, entry.role, entry.subtitle, entry.location,
            entry.start_date, entry.end_date, i,
          ).lastInsertRowid,
        );
        summary.entries += 1;
        entry.bullets.filter((b) => b.chosen).forEach((bullet, j) => {
          insertBullet.run(entryId, bullet.text, j);
          summary.bullets += 1;
        });
      });

      groups.forEach((group, i) => {
        const groupId = Number(insertGroup.run(sectionId, group.label, i).lastInsertRowid);
        summary.groups += 1;
        group.skills.forEach((name, j) => {
          insertSkill.run(groupId, name, j);
          summary.skills += 1;
        });
      });

      prose.forEach((p, i) => {
        insertProse.run(sectionId, p.label, p.body, i);
        summary.prose += 1;
      });
    }
  });

  apply();
  return summary;
}
