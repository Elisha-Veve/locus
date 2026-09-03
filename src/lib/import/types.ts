import type { DateMode, SectionKind } from "../types.ts";

/**
 * What reading a CV produces, before any of it reaches the library.
 *
 * This is deliberately its own shape rather than the library's. Everything
 * here is a *proposal*: it carries no ids, it is allowed to be wrong, and it
 * has a `chosen` flag on every part so the person importing can drop the bits
 * that are. Nothing is written until they say so.
 *
 * Both paths produce this — the offline parser guessing from layout, and the
 * AI refinement when a key is configured — so the review screen and the commit
 * step never need to know which one ran.
 */

export interface ImportedBullet {
  text: string;
  chosen: boolean;
}

export interface ImportedEntry {
  org: string;
  role: string;
  subtitle: string;
  location: string;
  /** "YYYY-MM", the same format the library stores. Empty when unknown. */
  start_date: string;
  end_date: string;
  bullets: ImportedBullet[];
  chosen: boolean;
}

export interface ImportedSkillGroup {
  label: string;
  skills: string[];
  chosen: boolean;
}

export interface ImportedProse {
  label: string;
  body: string;
  chosen: boolean;
}

export interface ImportedSection {
  title: string;
  kind: SectionKind;
  dateMode: DateMode;
  entries: ImportedEntry[];
  groups: ImportedSkillGroup[];
  prose: ImportedProse[];
  chosen: boolean;
}

/** Contact details found in the header. Applied to the profile, not a section. */
export interface ImportedProfile {
  full_name: string;
  email: string;
  phone: string;
  linkedin: string;
  website: string;
  location: string;
}

export interface ImportedCv {
  profile: ImportedProfile;
  sections: ImportedSection[];
  /** Which path produced this, so the review screen can say so honestly. */
  source: "offline" | "assisted";
  /**
   * Anything the reader could not place. Kept rather than dropped: a line the
   * parser did not understand is the person's own history, and silently losing
   * it is worse than showing it and letting them decide.
   */
  leftovers: string[];
}

export const EMPTY_PROFILE: ImportedProfile = {
  full_name: "",
  email: "",
  phone: "",
  linkedin: "",
  website: "",
  location: "",
};

export function emptyEntry(): ImportedEntry {
  return {
    org: "",
    role: "",
    subtitle: "",
    location: "",
    start_date: "",
    end_date: "",
    bullets: [],
    chosen: true,
  };
}

export function emptySection(title: string, kind: SectionKind): ImportedSection {
  return {
    title,
    kind,
    dateMode: kind === "entries" ? "range" : "none",
    entries: [],
    groups: [],
    prose: [],
    chosen: true,
  };
}

/** True when a section would put nothing on the page. */
export function sectionIsEmpty(section: ImportedSection): boolean {
  return (
    section.entries.length === 0 &&
    section.groups.length === 0 &&
    section.prose.length === 0
  );
}
