"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  createBullet,
  createEntry,
  createProse,
  createSection,
  createSkill,
  createSkillGroup,
  deleteBullet,
  deleteEntry,
  deleteProse,
  deleteSection,
  deleteSkill,
  deleteSkillGroup,
  reorderBullets,
  reorderEntries,
  reorderProse,
  reorderSections,
  reorderSkills,
  saveProfile,
  updateBullet,
  updateEntry,
  updateProse,
  updateSection,
  updateSkill,
  updateSkillGroup,
} from "@/lib/actions";
import {
  AutoField,
  ConfirmButton,
  SortableList,
  SortableRow,
} from "@/components/ui";
import { MONTH_NAMES, formatRange } from "@/lib/dates";
import type {
  DateMode,
  Library,
  LibraryEntry,
  LibrarySection,
  LibrarySkillGroup,
  Prose,
  SectionKind,
} from "@/lib/types";


/**
 * Which sections are open, remembered between visits.
 *
 * Sections start collapsed: a library of any size renders hundreds of fields
 * at once otherwise, and the page becomes something to scroll rather than
 * read. Collapsed, the headers are an index — title, kind and how much is
 * inside — which is most of what a contents list would have given.
 *
 * The choice is kept in localStorage because losing it on every navigation
 * would make "expand all" pointless. Read after mount rather than during
 * render, so the server and the first client render agree.
 */
const OPEN_SECTIONS_KEY = "locus.library.open";

function readOpenSections(): Set<number> {
  try {
    const raw = localStorage.getItem(OPEN_SECTIONS_KEY);
    if (!raw) return new Set();
    const ids = JSON.parse(raw) as unknown;
    return new Set(Array.isArray(ids) ? ids.filter((n) => typeof n === "number") : []);
  } catch {
    return new Set();
  }
}

function writeOpenSections(ids: Set<number>): void {
  try {
    localStorage.setItem(OPEN_SECTIONS_KEY, JSON.stringify([...ids]));
  } catch {
    // Private window, or storage disabled — the page still works, it just
    // forgets. Not worth failing over.
  }
}

export function LibraryEditor({ library }: { library: Library }) {
  const [, startTransition] = useTransition();
  const sectionIds = library.sections.map((s) => s.id);
  const [openIds, setOpenIds] = useState<Set<number>>(new Set());

  // Adopt what was open last time. After mount, so the markup matches.
  useEffect(() => setOpenIds(readOpenSections()), []);

  const setOpen = (next: Set<number>) => {
    setOpenIds(next);
    writeOpenSections(next);
  };

  const toggle = (id: number) => {
    const next = new Set(openIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setOpen(next);
  };

  const openCount = library.sections.filter((s) => openIds.has(s.id)).length;
  const allOpen = openCount === library.sections.length && openCount > 0;

  return (
    <div className="grid gap-4">
      <ProfileCard profile={library.profile} />

      {library.sections.length > 1 && (
        <div className="flex items-center gap-3">
          <button
            type="button"
            className="btn btn-sm"
            onClick={() =>
              setOpen(allOpen ? new Set() : new Set(sectionIds))
            }
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
          <span className="text-[12px] muted">
            {openCount} of {library.sections.length} open
          </span>
        </div>
      )}

      <SortableList
        ids={sectionIds}
        onReorder={(ids) => startTransition(() => void reorderSections(ids))}
      >
        <div className="grid gap-4">
          {library.sections.map((section) => (
            <SortableRow key={section.id} id={section.id}>
              {(handle) => (
                <SectionCard
                  section={section}
                  handle={handle}
                  open={openIds.has(section.id)}
                  onToggle={() => toggle(section.id)}
                />
              )}
            </SortableRow>
          ))}
        </div>
      </SortableList>

      {/* A section you have just made is one you mean to fill in. */}
      <AddSectionForm onCreated={(id) => setOpen(new Set(openIds).add(id))} />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ProfileCard({ profile }: { profile: Library["profile"] }) {
  const fields: Array<[keyof Library["profile"], string]> = [
    ["full_name", "Full name"],
    ["email", "Email"],
    ["linkedin", "LinkedIn"],
    ["phone", "Phone"],
    ["website", "Website"],
    ["location", "Location"],
  ];

  return (
    <section className="card p-5">
      <h2 className="eyebrow mb-3">Header</h2>
      <div className="grid grid-cols-2 gap-3">
        {fields.map(([key, label]) => (
          <label key={key} className="grid gap-1.5">
            <span className="text-[12.5px] muted">{label}</span>
            <AutoField
              value={profile[key]}
              placeholder={label}
              ariaLabel={label}
              bold={key === "full_name"}
              onSave={(value) => saveProfile({ [key]: value })}
            />
          </label>
        ))}
      </div>
      <p className="mt-3 text-[12.5px] muted">
        Blank fields are left out of the CV entirely.
      </p>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function SectionCard({
  section,
  handle,
  open,
  onToggle,
}: {
  section: LibrarySection;
  handle: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  const [, startTransition] = useTransition();

  const childCount =
    section.kind === "skills"
      ? section.skillGroups.reduce((n, g) => n + g.skills.length, 0)
      : section.kind === "prose"
        ? section.prose.length
        : section.entries.length;
  const childNoun =
    section.kind === "skills"
      ? "skills"
      : section.kind === "prose"
        ? "versions"
        : "records";

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-2 border-b border-line-2 px-4 py-3">
        {handle}
        <button
          type="button"
          className="btn btn-ghost btn-sm w-6 px-0"
          aria-label={open ? "Collapse section" : "Expand section"}
          onClick={onToggle}
        >
          <Chevron open={open} />
        </button>
        <AutoField
          value={section.title}
          bold
          ariaLabel="Section title"
          className="max-w-xs"
          onSave={(title) => updateSection(section.id, { title })}
        />
        <span className="text-[12px] muted">
          {childCount} {childNoun}
        </span>
        {section.kind === "entries" && (
          <label className="flex items-center gap-1.5 text-[12px] muted">
            Dates
            <select
              className="field w-[104px] !py-[2px] text-[12px]"
              aria-label={`${section.title} date format`}
              value={section.date_mode}
              onChange={(e) =>
                startTransition(() =>
                  void updateSection(section.id, {
                    date_mode: e.target.value as DateMode,
                  }),
                )
              }
            >
              <option value="range">Range</option>
              <option value="single">Single</option>
              <option value="none">None</option>
            </select>
          </label>
        )}
        <div className="ml-auto">
          <ConfirmButton
            onConfirm={() => deleteSection(section.id)}
            label="Delete section"
            confirmLabel="Delete section and everything in it?"
          />
        </div>
      </header>

      {open && (
        <div className="px-4 py-4">
          {section.kind === "skills" ? (
            <SkillsBody section={section} />
          ) : section.kind === "prose" ? (
            <ProseBody section={section} />
          ) : (
            <EntriesBody section={section} />
          )}

          <button
            type="button"
            className="btn btn-sm mt-3"
            onClick={() =>
              startTransition(() => {
                if (section.kind === "skills") void createSkillGroup(section.id);
                else if (section.kind === "prose") void createProse(section.id);
                else void createEntry(section.id);
              })
            }
          >
            +{" "}
            {section.kind === "skills"
              ? "Add skill group"
              : section.kind === "prose"
                ? "Add a version"
                : "Add record"}
          </button>
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */

function EntriesBody({ section }: { section: LibrarySection }) {
  const [, startTransition] = useTransition();
  const ids = section.entries.map((e) => e.id);

  if (section.entries.length === 0) {
    return (
      <p className="py-2 text-[13px] muted">
        Nothing here yet — add a record to start filling this section.
      </p>
    );
  }

  return (
    <SortableList
      ids={ids}
      onReorder={(next) => startTransition(() => void reorderEntries(next))}
    >
      <div className="grid gap-3">
        {section.entries.map((entry) => (
          <SortableRow key={entry.id} id={entry.id}>
            {(handle) => (
              <EntryCard
                entry={entry}
                handle={handle}
                dateMode={section.date_mode}
              />
            )}
          </SortableRow>
        ))}
      </div>
    </SortableList>
  );
}

function EntryCard({
  entry,
  handle,
  dateMode,
}: {
  entry: LibraryEntry;
  handle: React.ReactNode;
  dateMode: DateMode;
}) {
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const bulletIds = entry.bullets.map((b) => b.id);

  return (
    <div className="rounded-lg border border-line bg-surface-2/60">
      <div className="flex items-center gap-2 px-3 py-2.5">
        {handle}
        <button
          type="button"
          className="btn btn-ghost btn-sm min-w-0 flex-1 justify-start gap-2 px-1 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <Chevron open={open} />
          <span className="truncate font-medium text-ink">
            {entry.org || "Untitled"}
          </span>
          {entry.role && (
            <span className="truncate font-normal muted">{entry.role}</span>
          )}
        </button>
        <span className="flex-none text-[12.5px] muted">
          {formatRange(entry.start_date, entry.end_date)}
        </span>
        <span className="flex-none text-[12.5px] muted">
          {entry.bullets.length} bullets
        </span>
        <ConfirmButton onConfirm={() => deleteEntry(entry.id)} />
      </div>

      {open && (
        <div className="grid gap-3 border-t border-line-2 px-3 py-3">
          <div className="grid grid-cols-2 gap-2.5">
            <LabelledField
              label="Organisation / school"
              value={entry.org}
              bold
              onSave={(org) => updateEntry(entry.id, { org })}
            />
            <LabelledField
              label="Role / title"
              value={entry.role}
              placeholder="Software Engineer (Contract)"
              onSave={(role) => updateEntry(entry.id, { role })}
            />
            <LabelledField
              label="Location"
              value={entry.location}
              placeholder="Accra, Ghana"
              onSave={(location) => updateEntry(entry.id, { location })}
            />
            <LabelledField
              label="Second line"
              value={entry.subtitle}
              placeholder="BSc Computer Engineering"
              onSave={(subtitle) => updateEntry(entry.id, { subtitle })}
            />
          </div>

          {dateMode !== "none" && (
            <DateRow entry={entry} dateMode={dateMode} />
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <span className="eyebrow">Bullets</span>
              <span className="text-[12px] muted">
                Wrap text in **double asterisks** to bold it
              </span>
            </div>
            <SortableList
              ids={bulletIds}
              onReorder={(next) =>
                startTransition(() => void reorderBullets(next))
              }
            >
              <div className="grid gap-2">
                {entry.bullets.map((bullet) => (
                  <SortableRow key={bullet.id} id={bullet.id}>
                    {(bulletHandle) => (
                      <div className="flex items-start gap-2">
                        <span className="pt-2">{bulletHandle}</span>
                        <AutoField
                          value={bullet.text}
                          multiline
                          rows={2}
                          placeholder="Describe the work and its impact"
                          ariaLabel="Bullet text"
                          onSave={(text) => updateBullet(bullet.id, text)}
                        />
                        <span className="pt-1">
                          <ConfirmButton
                            onConfirm={() => deleteBullet(bullet.id)}
                            label="×"
                            confirmLabel="Delete?"
                          />
                        </span>
                      </div>
                    )}
                  </SortableRow>
                ))}
              </div>
            </SortableList>
            <button
              type="button"
              className="btn btn-sm mt-2"
              onClick={() => startTransition(() => void createBullet(entry.id))}
            >
              + Add bullet
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function DateRow({
  entry,
  dateMode,
}: {
  entry: LibraryEntry;
  dateMode: DateMode;
}) {
  const [, startTransition] = useTransition();
  const ongoing = entry.end_date === "";

  const save = (patch: { start_date?: string; end_date?: string }) =>
    startTransition(() => void updateEntry(entry.id, patch));

  // A single date lives in start_date with end_date empty, which keeps
  // newest-first sorting working without a second field to fill in.
  if (dateMode === "single") {
    return (
      <div>
        <MonthYearField
          label="Date"
          value={entry.start_date}
          onCommit={(start_date) => save({ start_date, end_date: "" })}
        />
        <p className="-mt-1 text-[12.5px] muted">
          Awarded or issued on. Records sort newest first.
        </p>
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-start gap-4">
        <MonthYearField
          label="Start"
          value={entry.start_date}
          onCommit={(start_date) => save({ start_date })}
        />
        <MonthYearField
          label="End"
          value={entry.end_date}
          disabled={ongoing}
          onCommit={(end_date) => save({ end_date })}
        />
        <label className="flex items-center gap-2 pt-[26px] text-[13px]">
          <input
            type="checkbox"
            className="check"
            checked={ongoing}
            onChange={(e) =>
              save({ end_date: e.target.checked ? "" : todayMonth() })
            }
          />
          Ongoing (shows “Present”)
        </label>
      </div>
      <p className="-mt-1 text-[12.5px] muted">
        Sorting inside a CV uses the end date — ongoing roles come first.
      </p>
    </div>
  );
}

/**
 * Month and year as two plain controls.
 *
 * A native <input type="month"> reports an empty value for a half-typed date,
 * so typing the month before the year would save "no date" and — because the
 * field is fed from the server — snap back while you were still typing. This
 * keeps a local draft and only commits once the pair is actually complete.
 */
function MonthYearField({
  label,
  value,
  disabled,
  onCommit,
}: {
  label: string;
  value: string;
  disabled?: boolean;
  onCommit: (next: string) => void;
}) {
  const [year, setYear] = useState(() => value.slice(0, 4));
  const [month, setMonth] = useState(() => value.slice(5, 7));
  const committed = useRef(value);

  // Adopt server changes, but never while they would clobber a draft we made.
  useEffect(() => {
    if (value !== committed.current) {
      committed.current = value;
      setYear(value.slice(0, 4));
      setMonth(value.slice(5, 7));
    }
  }, [value]);

  const commit = (nextMonth: string, nextYear: string) => {
    let next: string | null = null;
    if (!nextMonth && !nextYear) next = "";
    else if (nextMonth && /^\d{4}$/.test(nextYear)) next = `${nextYear}-${nextMonth}`;
    if (next === null || next === committed.current) return;
    committed.current = next;
    onCommit(next);
  };

  const incomplete =
    (month !== "" || year !== "") && !(month !== "" && /^\d{4}$/.test(year));

  return (
    <div className="grid gap-1.5">
      <span className="text-[12.5px] muted">{label}</span>
      <div className="flex gap-1.5">
        <select
          className="field w-[124px]"
          aria-label={`${label} month`}
          value={month}
          disabled={disabled}
          onChange={(e) => {
            setMonth(e.target.value);
            commit(e.target.value, year);
          }}
        >
          <option value="">Month</option>
          {MONTH_NAMES.map((name, index) => (
            <option key={name} value={String(index + 1).padStart(2, "0")}>
              {name}
            </option>
          ))}
        </select>
        <input
          className="field w-[76px]"
          aria-label={`${label} year`}
          inputMode="numeric"
          placeholder="Year"
          value={year}
          disabled={disabled}
          onChange={(e) => {
            const next = e.target.value.replace(/\D/g, "").slice(0, 4);
            setYear(next);
            commit(month, next);
          }}
          onBlur={() => commit(month, year)}
        />
      </div>
      <span
        className={`text-[12px] ${incomplete && !disabled ? "text-danger" : "invisible"}`}
      >
        {month === "" ? "Pick a month too" : "Needs a 4-digit year"}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * A prose section holds several versions of the same paragraph — one angled at
 * backend work, one at leadership — and each CV picks the one that fits.
 */
function ProseBody({ section }: { section: LibrarySection }) {
  const [, startTransition] = useTransition();
  const ids = section.prose.map((p) => p.id);

  if (section.prose.length === 0) {
    return (
      <p className="py-2 text-[13px] muted">
        Add a version to write your summary. Keep several if you angle it
        differently for different roles — each CV picks one.
      </p>
    );
  }

  return (
    <SortableList
      ids={ids}
      onReorder={(next) => startTransition(() => void reorderProse(next))}
    >
      <div className="grid gap-3">
        {section.prose.map((item) => (
          <SortableRow key={item.id} id={item.id}>
            {(handle) => <ProseCard item={item} handle={handle} />}
          </SortableRow>
        ))}
      </div>
    </SortableList>
  );
}

function ProseCard({
  item,
  handle,
}: {
  item: Prose;
  handle: React.ReactNode;
}) {
  const words = item.body.trim() ? item.body.trim().split(/\s+/).length : 0;

  return (
    <div className="rounded-lg border border-line bg-surface-2/60 px-3 py-3">
      <div className="mb-2 flex items-center gap-2">
        {handle}
        <AutoField
          value={item.label}
          bold
          placeholder="Name this version"
          ariaLabel="Version name"
          className="max-w-[260px]"
          onSave={(label) => updateProse(item.id, { label })}
        />
        <span className="text-[12px] muted">
          {words} {words === 1 ? "word" : "words"}
        </span>
        <div className="ml-auto">
          <ConfirmButton onConfirm={() => deleteProse(item.id)} />
        </div>
      </div>
      <AutoField
        value={item.body}
        multiline
        rows={4}
        placeholder="Two or three sentences on who you are and what you do."
        ariaLabel="Summary text"
        onSave={(body) => updateProse(item.id, { body })}
      />
      <p className="mt-1.5 text-[12px] muted">
        Wrap text in **double asterisks** to bold it.
      </p>
    </div>
  );
}

function SkillsBody({ section }: { section: LibrarySection }) {
  if (section.skillGroups.length === 0) {
    return (
      <p className="py-2 text-[13px] muted">
        Add a group such as “Languages” or “Tools”, then list the skills in it.
      </p>
    );
  }
  return (
    <div className="grid gap-3">
      {section.skillGroups.map((group) => (
        <SkillGroupCard key={group.id} group={group} />
      ))}
    </div>
  );
}

function SkillGroupCard({ group }: { group: LibrarySkillGroup }) {
  const [, startTransition] = useTransition();
  const [draft, setDraft] = useState("");
  const ids = group.skills.map((s) => s.id);

  const addSkills = () => {
    // Commas let you paste a whole list at once.
    const names = draft.split(",").map((n) => n.trim()).filter(Boolean);
    if (names.length === 0) return;
    setDraft("");
    startTransition(async () => {
      for (const name of names) await createSkill(group.id, name);
    });
  };

  return (
    <div className="rounded-lg border border-line bg-surface-2/60 px-3 py-3">
      <div className="mb-2.5 flex items-center gap-2">
        <AutoField
          value={group.label}
          bold
          ariaLabel="Skill group label"
          className="max-w-[220px]"
          onSave={(label) => updateSkillGroup(group.id, label)}
        />
        <div className="ml-auto">
          <ConfirmButton
            onConfirm={() => deleteSkillGroup(group.id)}
            label="Delete group"
          />
        </div>
      </div>

      <SortableList
        ids={ids}
        onReorder={(next) => startTransition(() => void reorderSkills(next))}
      >
        <div className="grid gap-1.5">
          {group.skills.map((skill) => (
            <SortableRow key={skill.id} id={skill.id}>
              {(handle) => (
                <div className="flex items-center gap-2">
                  {handle}
                  <AutoField
                    value={skill.name}
                    ariaLabel="Skill"
                    onSave={(name) => updateSkill(skill.id, name)}
                  />
                  <ConfirmButton
                    onConfirm={() => deleteSkill(skill.id)}
                    label="×"
                    confirmLabel="Delete?"
                  />
                </div>
              )}
            </SortableRow>
          ))}
        </div>
      </SortableList>

      <div className="mt-2 flex gap-2">
        <input
          className="field"
          placeholder="Add skills, comma separated"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              addSkills();
            }
          }}
        />
        <button type="button" className="btn" onClick={addSkills} disabled={!draft.trim()}>
          Add
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/**
 * The layout choice bundles kind and date format, because the combinations
 * people actually want are few and naming them is clearer than two dropdowns.
 */
const SECTION_PRESETS: Array<{
  id: string;
  label: string;
  kind: SectionKind;
  dateMode: DateMode;
}> = [
  { id: "dated", label: "Dated records with bullets", kind: "entries", dateMode: "range" },
  { id: "awarded", label: "Records with one date", kind: "entries", dateMode: "single" },
  { id: "undated", label: "Records with no dates", kind: "entries", dateMode: "none" },
  { id: "skills", label: "Inline skill lists", kind: "skills", dateMode: "range" },
  { id: "prose", label: "A paragraph (summary)", kind: "prose", dateMode: "none" },
];

function AddSectionForm({ onCreated }: { onCreated: (id: number) => void }) {
  const [title, setTitle] = useState("");
  const [preset, setPreset] = useState(SECTION_PRESETS[0].id);
  const [, startTransition] = useTransition();

  return (
    <form
      className="card flex items-end gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const next = title;
        const chosen =
          SECTION_PRESETS.find((p) => p.id === preset) ?? SECTION_PRESETS[0];
        setTitle("");
        startTransition(async () => {
          const id = await createSection(next, chosen.kind, chosen.dateMode);
          if (typeof id === "number") onCreated(id);
        });
      }}
    >
      <label className="grid flex-1 gap-1.5">
        <span className="text-[12.5px] muted">New section</span>
        <input
          className="field"
          placeholder="Summary, Certifications, Awards…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-[12.5px] muted">Layout</span>
        <select
          className="field w-60"
          value={preset}
          onChange={(e) => setPreset(e.target.value)}
        >
          {SECTION_PRESETS.map((p) => (
            <option key={p.id} value={p.id}>
              {p.label}
            </option>
          ))}
        </select>
      </label>
      <button type="submit" className="btn btn-primary" disabled={!title.trim()}>
        Add section
      </button>
    </form>
  );
}

/* ------------------------------------------------------------------ */

function LabelledField({
  label,
  value,
  placeholder,
  bold,
  onSave,
}: {
  label: string;
  value: string;
  placeholder?: string;
  bold?: boolean;
  onSave: (value: string) => void | Promise<unknown>;
}) {
  return (
    <label className="grid gap-1.5">
      <span className="text-[12.5px] muted">{label}</span>
      <AutoField
        value={value}
        bold={bold}
        placeholder={placeholder ?? label}
        ariaLabel={label}
        onSave={onSave}
      />
    </label>
  );
}

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 16 16"
      aria-hidden="true"
      style={{
        transform: open ? "rotate(90deg)" : "none",
        transition: "transform .15s",
        flex: "none",
      }}
    >
      <path
        d="M6 3.5 10.5 8 6 12.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function todayMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}
