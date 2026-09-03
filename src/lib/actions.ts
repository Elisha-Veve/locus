"use server";

import { revalidatePath } from "next/cache";
import { db, nextOrder } from "./db";
import { listExports, removeExport } from "./exports";
import { touchCv } from "./queries";
import type { Profile, SectionKind } from "./types";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function refreshLibrary() {
  revalidatePath("/library");
  revalidatePath("/", "layout");
}

/**
 * Selection changes do not revalidate the builder route: the builder owns its
 * own state for instant preview feedback, and re-pushing server props mid-edit
 * would fight the user's typing. We only bump updated_at for the CV list.
 */
function refreshCv(cvId: number) {
  touchCv(cvId);
  revalidatePath("/");
}

/** Write an overlay row, creating it only when this CV deviates from default. */
function upsertOverlay(
  table: string,
  keyColumn: string,
  cvId: number,
  keyId: number,
  fields: Record<string, unknown>,
) {
  const cols = Object.keys(fields);
  const setClause = cols.map((c) => `${c} = excluded.${c}`).join(", ");
  const insertCols = ["cv_id", keyColumn, ...cols].join(", ");
  const placeholders = ["?", "?", ...cols.map(() => "?")].join(", ");
  db()
    .prepare(
      `INSERT INTO ${table} (${insertCols}) VALUES (${placeholders})
       ON CONFLICT (cv_id, ${keyColumn}) DO UPDATE SET ${setClause}`,
    )
    .run(cvId, keyId, ...cols.map((c) => fields[c]));
}

/** Persist an explicit order for a list of ids in one overlay table. */
function persistOverlayOrder(
  table: string,
  keyColumn: string,
  cvId: number,
  ids: number[],
) {
  db().transaction(() => {
    ids.forEach((id, index) =>
      upsertOverlay(table, keyColumn, cvId, id, { sort_order: index }),
    );
  })();
}

/** Persist an explicit order in a library table. */
function persistLibraryOrder(table: string, ids: number[]) {
  const stmt = db().prepare(`UPDATE ${table} SET sort_order = ? WHERE id = ?`);
  db().transaction(() => ids.forEach((id, i) => stmt.run(i, id)))();
}

/* ------------------------------------------------------------------ */
/* Profile                                                             */
/* ------------------------------------------------------------------ */

export async function saveProfile(patch: Partial<Profile>) {
  const current = db()
    .prepare("SELECT * FROM profile WHERE id = 1")
    .get() as Profile;
  db()
    .prepare(
      `UPDATE profile SET full_name=@full_name, email=@email, phone=@phone,
       linkedin=@linkedin, website=@website, location=@location WHERE id=1`,
    )
    .run({ ...current, ...patch });
  refreshLibrary();
}

/* ------------------------------------------------------------------ */
/* Library: sections                                                   */
/* ------------------------------------------------------------------ */

export async function createSection(title: string, kind: SectionKind) {
  const row = db()
    .prepare("SELECT COALESCE(MAX(sort_order), -1) + 1 AS next FROM section")
    .get() as { next: number };
  const id = db()
    .prepare("INSERT INTO section (title, kind, sort_order) VALUES (?, ?, ?)")
    .run(title.trim() || "Untitled section", kind, row.next).lastInsertRowid;
  refreshLibrary();
  return Number(id);
}

export async function updateSection(id: number, patch: { title?: string }) {
  if (patch.title !== undefined) {
    db().prepare("UPDATE section SET title = ? WHERE id = ?").run(patch.title, id);
  }
  refreshLibrary();
}

export async function deleteSection(id: number) {
  db().prepare("DELETE FROM section WHERE id = ?").run(id);
  refreshLibrary();
}

export async function reorderSections(ids: number[]) {
  persistLibraryOrder("section", ids);
  refreshLibrary();
}

/* ------------------------------------------------------------------ */
/* Library: entries & bullets                                          */
/* ------------------------------------------------------------------ */

export async function createEntry(sectionId: number, org = "New record") {
  const id = db()
    .prepare(
      "INSERT INTO entry (section_id, org, sort_order) VALUES (?, ?, ?)",
    )
    .run(sectionId, org, nextOrder("entry", "section_id", sectionId))
    .lastInsertRowid;
  refreshLibrary();
  return Number(id);
}

export async function updateEntry(
  id: number,
  patch: Partial<{
    org: string;
    role: string;
    subtitle: string;
    location: string;
    start_date: string;
    end_date: string;
  }>,
) {
  const keys = Object.keys(patch) as Array<keyof typeof patch>;
  if (keys.length === 0) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  db()
    .prepare(`UPDATE entry SET ${set} WHERE id = ?`)
    .run(...keys.map((k) => patch[k]), id);
  refreshLibrary();
}

export async function deleteEntry(id: number) {
  db().prepare("DELETE FROM entry WHERE id = ?").run(id);
  refreshLibrary();
}

export async function reorderEntries(ids: number[]) {
  persistLibraryOrder("entry", ids);
  refreshLibrary();
}

export async function createBullet(entryId: number, text = "") {
  const id = db()
    .prepare("INSERT INTO bullet (entry_id, text, sort_order) VALUES (?, ?, ?)")
    .run(entryId, text, nextOrder("bullet", "entry_id", entryId)).lastInsertRowid;
  refreshLibrary();
  return Number(id);
}

export async function updateBullet(id: number, text: string) {
  db().prepare("UPDATE bullet SET text = ? WHERE id = ?").run(text, id);
  refreshLibrary();
}

export async function deleteBullet(id: number) {
  db().prepare("DELETE FROM bullet WHERE id = ?").run(id);
  refreshLibrary();
}

export async function reorderBullets(ids: number[]) {
  persistLibraryOrder("bullet", ids);
  refreshLibrary();
}

/* ------------------------------------------------------------------ */
/* Library: skills                                                     */
/* ------------------------------------------------------------------ */

export async function createSkillGroup(sectionId: number, label = "New group") {
  const id = db()
    .prepare(
      "INSERT INTO skill_group (section_id, label, sort_order) VALUES (?, ?, ?)",
    )
    .run(sectionId, label, nextOrder("skill_group", "section_id", sectionId))
    .lastInsertRowid;
  refreshLibrary();
  return Number(id);
}

export async function updateSkillGroup(id: number, label: string) {
  db().prepare("UPDATE skill_group SET label = ? WHERE id = ?").run(label, id);
  refreshLibrary();
}

export async function deleteSkillGroup(id: number) {
  db().prepare("DELETE FROM skill_group WHERE id = ?").run(id);
  refreshLibrary();
}

export async function createSkill(groupId: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  const id = db()
    .prepare("INSERT INTO skill (group_id, name, sort_order) VALUES (?, ?, ?)")
    .run(groupId, trimmed, nextOrder("skill", "group_id", groupId)).lastInsertRowid;
  refreshLibrary();
  return Number(id);
}

export async function updateSkill(id: number, name: string) {
  db().prepare("UPDATE skill SET name = ? WHERE id = ?").run(name, id);
  refreshLibrary();
}

export async function deleteSkill(id: number) {
  db().prepare("DELETE FROM skill WHERE id = ?").run(id);
  refreshLibrary();
}

export async function reorderSkills(ids: number[]) {
  persistLibraryOrder("skill", ids);
  refreshLibrary();
}

/* ------------------------------------------------------------------ */
/* CVs                                                                 */
/* ------------------------------------------------------------------ */

export async function createCv(name: string, company = "", role = "") {
  const id = db()
    .prepare("INSERT INTO cv (name, company, role) VALUES (?, ?, ?)")
    .run(name.trim() || "Untitled CV", company.trim(), role.trim())
    .lastInsertRowid;
  revalidatePath("/");
  return Number(id);
}

export async function updateCvMeta(
  cvId: number,
  patch: Partial<{
    name: string;
    company: string;
    role: string;
    notes: string;
    style: string;
  }>,
) {
  const keys = Object.keys(patch) as Array<keyof typeof patch>;
  if (keys.length === 0) return;
  const set = keys.map((k) => `${k} = ?`).join(", ");
  db()
    .prepare(`UPDATE cv SET ${set}, updated_at = datetime('now') WHERE id = ?`)
    .run(...keys.map((k) => patch[k]), cvId);
  revalidatePath("/");
  revalidatePath(`/cv/${cvId}`);
}

export async function deleteCv(cvId: number) {
  // The cv_export rows cascade, but their files would not — clear them first.
  for (const saved of listExports(cvId)) removeExport(saved.id);
  db().prepare("DELETE FROM cv WHERE id = ?").run(cvId);
  revalidatePath("/");
}

/** Copy a CV's whole selection — the fast path for a similar application. */
export async function duplicateCv(cvId: number, name: string) {
  const conn = db();
  let newId = 0;
  conn.transaction(() => {
    const source = conn.prepare("SELECT * FROM cv WHERE id = ?").get(cvId) as
      | { company: string; role: string; notes: string; style: string }
      | undefined;
    if (!source) return;
    newId = Number(
      conn
        .prepare(
          "INSERT INTO cv (name, company, role, notes, style) VALUES (?, ?, ?, ?, ?)",
        )
        .run(
          name.trim() || "Copy",
          source.company,
          source.role,
          source.notes,
          source.style,
        ).lastInsertRowid,
    );
    for (const [table, cols] of [
      ["cv_section", "section_id, included, sort_order, auto_order"],
      ["cv_entry", "entry_id, included, sort_order"],
      ["cv_bullet", "bullet_id, included, sort_order, override_text"],
      ["cv_skill_group", "group_id, included, sort_order"],
      ["cv_skill", "skill_id, included, sort_order"],
    ] as const) {
      conn
        .prepare(
          `INSERT INTO ${table} (cv_id, ${cols})
           SELECT ?, ${cols} FROM ${table} WHERE cv_id = ?`,
        )
        .run(newId, cvId);
    }
  })();
  revalidatePath("/");
  return newId;
}

/* ------------------------------------------------------------------ */
/* Exports                                                             */
/* ------------------------------------------------------------------ */

/** Read back the archive — the builder calls this after a download. */
export async function getExports(cvId: number) {
  return listExports(cvId);
}

export async function deleteExport(exportId: number, cvId: number) {
  removeExport(exportId);
  revalidatePath("/");
  return listExports(cvId);
}

/* ------------------------------------------------------------------ */
/* CV selection                                                        */
/* ------------------------------------------------------------------ */

export async function setSectionIncluded(
  cvId: number,
  sectionId: number,
  included: boolean,
) {
  upsertOverlay("cv_section", "section_id", cvId, sectionId, {
    included: included ? 1 : 0,
  });
  refreshCv(cvId);
}

export async function setAutoOrder(
  cvId: number,
  sectionId: number,
  auto: boolean,
) {
  upsertOverlay("cv_section", "section_id", cvId, sectionId, {
    auto_order: auto ? 1 : 0,
  });
  refreshCv(cvId);
}

export async function reorderCvSections(cvId: number, ids: number[]) {
  persistOverlayOrder("cv_section", "section_id", cvId, ids);
  refreshCv(cvId);
}

export async function setEntryIncluded(
  cvId: number,
  entryId: number,
  included: boolean,
) {
  upsertOverlay("cv_entry", "entry_id", cvId, entryId, {
    included: included ? 1 : 0,
  });
  refreshCv(cvId);
}

/** Dragging entries also switches the section off auto reverse-chronological. */
export async function reorderCvEntries(
  cvId: number,
  sectionId: number,
  ids: number[],
) {
  db().transaction(() => {
    upsertOverlay("cv_section", "section_id", cvId, sectionId, { auto_order: 0 });
    ids.forEach((id, index) =>
      upsertOverlay("cv_entry", "entry_id", cvId, id, { sort_order: index }),
    );
  })();
  refreshCv(cvId);
}

export async function setBulletIncluded(
  cvId: number,
  bulletId: number,
  included: boolean,
) {
  upsertOverlay("cv_bullet", "bullet_id", cvId, bulletId, {
    included: included ? 1 : 0,
  });
  refreshCv(cvId);
}

export async function reorderCvBullets(cvId: number, ids: number[]) {
  persistOverlayOrder("cv_bullet", "bullet_id", cvId, ids);
  refreshCv(cvId);
}

/** null clears the override and falls back to the library wording. */
export async function setBulletOverride(
  cvId: number,
  bulletId: number,
  text: string | null,
) {
  upsertOverlay("cv_bullet", "bullet_id", cvId, bulletId, {
    override_text: text,
  });
  refreshCv(cvId);
}

export async function setSkillGroupIncluded(
  cvId: number,
  groupId: number,
  included: boolean,
) {
  upsertOverlay("cv_skill_group", "group_id", cvId, groupId, {
    included: included ? 1 : 0,
  });
  refreshCv(cvId);
}

export async function setSkillIncluded(
  cvId: number,
  skillId: number,
  included: boolean,
) {
  upsertOverlay("cv_skill", "skill_id", cvId, skillId, {
    included: included ? 1 : 0,
  });
  refreshCv(cvId);
}

export async function reorderCvSkills(cvId: number, ids: number[]) {
  persistOverlayOrder("cv_skill", "skill_id", cvId, ids);
  refreshCv(cvId);
}

/** Select-all / select-none for one section, including its children. */
export async function setSectionSelectionBulk(
  cvId: number,
  sectionId: number,
  included: boolean,
) {
  const conn = db();
  const flag = included ? 1 : 0;
  conn.transaction(() => {
    upsertOverlay("cv_section", "section_id", cvId, sectionId, { included: 1 });
    const entries = conn
      .prepare("SELECT id FROM entry WHERE section_id = ? AND archived = 0")
      .all(sectionId) as Array<{ id: number }>;
    for (const { id } of entries) {
      upsertOverlay("cv_entry", "entry_id", cvId, id, { included: flag });
      const bullets = conn
        .prepare("SELECT id FROM bullet WHERE entry_id = ? AND archived = 0")
        .all(id) as Array<{ id: number }>;
      for (const b of bullets) {
        upsertOverlay("cv_bullet", "bullet_id", cvId, b.id, { included: flag });
      }
    }
    const groups = conn
      .prepare("SELECT id FROM skill_group WHERE section_id = ? AND archived = 0")
      .all(sectionId) as Array<{ id: number }>;
    for (const { id } of groups) {
      upsertOverlay("cv_skill_group", "group_id", cvId, id, { included: flag });
      const skills = conn
        .prepare("SELECT id FROM skill WHERE group_id = ? AND archived = 0")
        .all(id) as Array<{ id: number }>;
      for (const s of skills) {
        upsertOverlay("cv_skill", "skill_id", cvId, s.id, { included: flag });
      }
    }
  })();
  refreshCv(cvId);
}
