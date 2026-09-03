export type SectionKind = "entries" | "skills" | "prose";
/** How an entries section prints its dates. */
export type DateMode = "range" | "single" | "none";

export interface Profile {
  full_name: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
  location: string;
}

export interface Section {
  id: number;
  title: string;
  kind: SectionKind;
  date_mode: DateMode;
  sort_order: number;
  archived: number;
}

/** One paragraph variant in a prose section (a summary, profile, objective). */
export interface Prose {
  id: number;
  section_id: number;
  label: string;
  body: string;
  sort_order: number;
  archived: number;
}

export interface Entry {
  id: number;
  section_id: number;
  org: string;
  role: string;
  subtitle: string;
  location: string;
  start_date: string;
  end_date: string;
  sort_order: number;
  archived: number;
}

export interface Bullet {
  id: number;
  entry_id: number;
  text: string;
  sort_order: number;
  archived: number;
}

export interface SkillGroup {
  id: number;
  section_id: number;
  label: string;
  sort_order: number;
  archived: number;
}

export interface Skill {
  id: number;
  group_id: number;
  name: string;
  sort_order: number;
  archived: number;
}

export interface Cv {
  id: number;
  name: string;
  company: string;
  role: string;
  notes: string;
  /** Document style id — see CV_STYLES in cvStyles.ts */
  style: string;
  created_at: string;
  updated_at: string;
}

export interface CvExport {
  id: number;
  cv_id: number;
  cv_name: string;
  company: string;
  role: string;
  file_name: string;
  stored_name: string;
  byte_size: number;
  page_count: number;
  doc_hash: string;
  doc_json: string;
  created_at: string;
  last_downloaded_at: string;
  download_count: number;
}

/** An export as the UI needs it, without the heavy or internal columns. */
export type ExportSummary = Omit<CvExport, "doc_json" | "stored_name">;

/* ---------- Library shapes (the master records) ---------- */

export interface LibraryEntry extends Entry {
  bullets: Bullet[];
}
export interface LibrarySkillGroup extends SkillGroup {
  skills: Skill[];
}
export interface LibrarySection extends Section {
  entries: LibraryEntry[];
  skillGroups: LibrarySkillGroup[];
  prose: Prose[];
}
export interface Library {
  profile: Profile;
  sections: LibrarySection[];
}

/* ---------- Builder shapes (library + this CV's overlay) ---------- */

export interface BuilderBullet extends Bullet {
  included: boolean;
  cvOrder: number;
  overrideText: string | null;
  effectiveText: string;
}
export interface BuilderEntry extends Entry {
  included: boolean;
  cvOrder: number;
  bullets: BuilderBullet[];
}
export interface BuilderSkill extends Skill {
  included: boolean;
  cvOrder: number;
}
export interface BuilderSkillGroup extends SkillGroup {
  included: boolean;
  cvOrder: number;
  skills: BuilderSkill[];
}
export interface BuilderProse extends Prose {
  included: boolean;
  cvOrder: number;
  overrideText: string | null;
  effectiveText: string;
}
export interface BuilderSection extends Section {
  included: boolean;
  cvOrder: number;
  autoOrder: boolean;
  entries: BuilderEntry[];
  skillGroups: BuilderSkillGroup[];
  prose: BuilderProse[];
}
export interface BuilderCv {
  cv: Cv;
  profile: Profile;
  sections: BuilderSection[];
}

/* ---------- Resolved shape handed to the renderer ---------- */

export interface RenderEntry {
  org: string;
  role: string;
  subtitle: string;
  location: string;
  dates: string;
  bullets: string[];
}
export interface RenderSkillGroup {
  label: string;
  skills: string[];
}
export interface RenderSection {
  title: string;
  kind: SectionKind;
  dateMode: DateMode;
  entries: RenderEntry[];
  skillGroups: RenderSkillGroup[];
  prose: string[];
}
export interface RenderDoc {
  profile: Profile;
  sections: RenderSection[];
  style: string;
}
