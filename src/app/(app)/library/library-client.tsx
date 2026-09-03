"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  createBullet,
  createEntry,
  createSection,
  createSkill,
  createSkillGroup,
  deleteBullet,
  deleteEntry,
  deleteSection,
  deleteSkill,
  deleteSkillGroup,
  reorderBullets,
  reorderEntries,
  reorderSections,
  reorderSkills,
  saveProfile,
  updateBullet,
  updateEntry,
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
  Library,
  LibraryEntry,
  LibrarySection,
  LibrarySkillGroup,
  SectionKind,
} from "@/lib/types";

export function LibraryEditor({ library }: { library: Library }) {
  const [, startTransition] = useTransition();
  const sectionIds = library.sections.map((s) => s.id);

  return (
    <div className="grid gap-4">
      <ProfileCard profile={library.profile} />

      <SortableList
        ids={sectionIds}
        onReorder={(ids) => startTransition(() => void reorderSections(ids))}
      >
        <div className="grid gap-4">
          {library.sections.map((section) => (
            <SortableRow key={section.id} id={section.id}>
              {(handle) => <SectionCard section={section} handle={handle} />}
            </SortableRow>
          ))}
        </div>
      </SortableList>

      <AddSectionForm />
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
}: {
  section: LibrarySection;
  handle: React.ReactNode;
}) {
  const [, startTransition] = useTransition();
  const [open, setOpen] = useState(true);

  const childCount =
    section.kind === "skills"
      ? section.skillGroups.reduce((n, g) => n + g.skills.length, 0)
      : section.entries.length;

  return (
    <section className="card overflow-hidden">
      <header className="flex items-center gap-2 border-b border-line-2 px-4 py-3">
        {handle}
        <button
          type="button"
          className="btn btn-ghost btn-sm w-6 px-0"
          aria-label={open ? "Collapse section" : "Expand section"}
          onClick={() => setOpen((v) => !v)}
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
          {childCount} {section.kind === "skills" ? "skills" : "records"}
        </span>
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
          ) : (
            <EntriesBody section={section} />
          )}

          <button
            type="button"
            className="btn btn-sm mt-3"
            onClick={() =>
              startTransition(() =>
                void (section.kind === "skills"
                  ? createSkillGroup(section.id)
                  : createEntry(section.id)),
              )
            }
          >
            + {section.kind === "skills" ? "Add skill group" : "Add record"}
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
            {(handle) => <EntryCard entry={entry} handle={handle} />}
          </SortableRow>
        ))}
      </div>
    </SortableList>
  );
}

function EntryCard({
  entry,
  handle,
}: {
  entry: LibraryEntry;
  handle: React.ReactNode;
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

          <DateRow entry={entry} />

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

function DateRow({ entry }: { entry: LibraryEntry }) {
  const [, startTransition] = useTransition();
  const ongoing = entry.end_date === "";

  const save = (patch: { start_date?: string; end_date?: string }) =>
    startTransition(() => void updateEntry(entry.id, patch));

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

function AddSectionForm() {
  const [title, setTitle] = useState("");
  const [kind, setKind] = useState<SectionKind>("entries");
  const [, startTransition] = useTransition();

  return (
    <form
      className="card flex items-end gap-3 p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (!title.trim()) return;
        const next = title;
        setTitle("");
        startTransition(() => void createSection(next, kind));
      }}
    >
      <label className="grid flex-1 gap-1.5">
        <span className="text-[12.5px] muted">New section</span>
        <input
          className="field"
          placeholder="Certifications, Publications, Awards…"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </label>
      <label className="grid gap-1.5">
        <span className="text-[12.5px] muted">Layout</span>
        <select
          className="field w-52"
          value={kind}
          onChange={(e) => setKind(e.target.value as SectionKind)}
        >
          <option value="entries">Dated records with bullets</option>
          <option value="skills">Inline skill lists</option>
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
