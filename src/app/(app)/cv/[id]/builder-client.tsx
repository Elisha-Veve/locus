"use client";

import Link from "next/link";
import { useCallback, useMemo, useState, useTransition } from "react";
import {
  reorderCvBullets,
  reorderCvEntries,
  reorderCvSections,
  reorderCvSkills,
  setAutoOrder,
  setBulletIncluded,
  setBulletOverride,
  setEntryIncluded,
  setSectionIncluded,
  setSectionSelectionBulk,
  setSkillGroupIncluded,
  setSkillIncluded,
  updateCvMeta,
} from "@/lib/actions";
import {
  AutoField,
  Checkbox,
  SortableList,
  SortableRow,
} from "@/components/ui";
import { CvPreview } from "@/components/CvPreview";
import { CV_STYLES, DEFAULT_CV_STYLE } from "@/lib/cvStyles";
import { VersionList, useDownload } from "./versions";
import { formatRange } from "@/lib/dates";
import { resolveCv } from "@/lib/resolve";
import type {
  BuilderCv,
  BuilderEntry,
  BuilderSection,
  BuilderSkillGroup,
  ExportSummary,
} from "@/lib/types";

/* ------------------------------------------------------------------ */
/* Local state helpers                                                 */
/* ------------------------------------------------------------------ */

type Updater = (draft: BuilderCv) => BuilderCv;

function mapSection(
  cv: BuilderCv,
  sectionId: number,
  fn: (s: BuilderSection) => BuilderSection,
): BuilderCv {
  return {
    ...cv,
    sections: cv.sections.map((s) => (s.id === sectionId ? fn(s) : s)),
  };
}

function reorderBy<T extends { id: number }>(items: T[], ids: number[]): T[] {
  const index = new Map(ids.map((id, i) => [id, i]));
  return [...items].sort(
    (a, b) => (index.get(a.id) ?? 0) - (index.get(b.id) ?? 0),
  );
}

/* ------------------------------------------------------------------ */
/* Builder                                                             */
/* ------------------------------------------------------------------ */

export function Builder({
  initial,
  initialExports,
}: {
  initial: BuilderCv;
  initialExports: ExportSummary[];
}) {
  // The builder owns its state so the preview reacts instantly; every change
  // is also fired at the server, which persists it without pushing back.
  const [cv, setCv] = useState<BuilderCv>(initial);
  const [, startTransition] = useTransition();
  const [pages, setPages] = useState(1);
  const [exports, setExports] = useState(initialExports);
  const [showVersions, setShowVersions] = useState(false);

  const cvId = cv.cv.id;
  const { download, busy, error } = useDownload(cvId, (next) => {
    setExports(next);
    setShowVersions(true);
  });

  const apply = useCallback(
    (updater: Updater, persist: () => Promise<unknown>) => {
      setCv(updater);
      startTransition(() => {
        void persist();
      });
    },
    [],
  );

  const doc = useMemo(() => resolveCv(cv), [cv]);

  const setStyle = (style: string) =>
    apply(
      (draft) => ({ ...draft, cv: { ...draft.cv, style } }),
      () => updateCvMeta(cvId, { style }),
    );
  const sectionIds = cv.sections.map((s) => s.id);

  const counts = useMemo(() => {
    let entries = 0;
    let bullets = 0;
    for (const section of cv.sections) {
      if (!section.included) continue;
      for (const entry of section.entries) {
        if (!entry.included) continue;
        entries += 1;
        bullets += entry.bullets.filter((b) => b.included).length;
      }
    }
    return { entries, bullets };
  }, [cv]);

  return (
    <main className="mx-auto grid max-w-[1600px] grid-cols-[minmax(520px,1fr)_minmax(560px,780px)] gap-8 px-6 py-7">
      {/* ---------------- selection ---------------- */}
      <div className="min-w-0">
        <div className="mb-5">
          <Link href="/" className="text-[13px] muted hover:text-ink">
            ← All CVs
          </Link>
          <div className="mt-2 grid gap-2">
            <AutoField
              value={cv.cv.name}
              bold
              ariaLabel="CV name"
              className="!text-[19px] !py-2"
              onSave={(name) => updateCvMeta(cvId, { name })}
            />
            <div className="grid grid-cols-2 gap-2">
              <AutoField
                value={cv.cv.company}
                placeholder="Company"
                ariaLabel="Company"
                onSave={(company) => updateCvMeta(cvId, { company })}
              />
              <AutoField
                value={cv.cv.role}
                placeholder="Role applied for"
                ariaLabel="Role"
                onSave={(role) => updateCvMeta(cvId, { role })}
              />
            </div>
          </div>
          <p className="mt-2.5 text-[13px] muted">
            {counts.entries} records · {counts.bullets} bullets selected ·{" "}
            <Link href="/library" className="underline underline-offset-2">
              edit the library
            </Link>
          </p>
        </div>

        <SortableList
          ids={sectionIds}
          onReorder={(ids) =>
            apply(
              (draft) => ({ ...draft, sections: reorderBy(draft.sections, ids) }),
              () => reorderCvSections(cvId, ids),
            )
          }
        >
          <div className="grid gap-3">
            {cv.sections.map((section) => (
              <SortableRow key={section.id} id={section.id}>
                {(handle) => (
                  <SectionPanel
                    cvId={cvId}
                    section={section}
                    handle={handle}
                    apply={apply}
                  />
                )}
              </SortableRow>
            ))}
          </div>
        </SortableList>
      </div>

      {/* ---------------- preview ---------------- */}
      <div className="min-w-0">
        <div className="sticky top-[70px]">
          <div className="mb-3 flex items-center gap-3">
            <span
              className={`text-[13px] ${pages > 1 ? "text-danger" : "muted"}`}
            >
              {pages === 1 ? "Fits on one page" : `Runs to ${pages} pages`}
            </span>
            <div className="ml-auto flex gap-2">
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Document style</span>
                <select
                  className="field w-[132px] !py-[3px] text-[12.5px]"
                  aria-label="Document style"
                  value={cv.cv.style || DEFAULT_CV_STYLE}
                  onChange={(e) => setStyle(e.target.value)}
                >
                  {CV_STYLES.map((style) => (
                    <option key={style.id} value={style.id} title={style.hint}>
                      {style.label}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="btn btn-sm"
                aria-pressed={showVersions}
                onClick={() => setShowVersions((v) => !v)}
              >
                {showVersions ? "Hide versions" : `Versions (${exports.length})`}
              </button>
              <a
                className="btn btn-sm"
                href={`/print/${cvId}`}
                target="_blank"
                rel="noreferrer"
              >
                Open print page
              </a>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => void download()}
                disabled={busy}
              >
                {busy ? "Exporting…" : "Download PDF"}
              </button>
            </div>
          </div>

          {error && (
            <p className="mb-3 rounded-md border border-danger-line bg-danger-soft px-3 py-2 text-[13px] text-danger">
              {error}
            </p>
          )}

          <div className="max-h-[calc(100vh-130px)] overflow-y-auto rounded-lg bg-mat p-5">
            {showVersions && (
              <div className="mb-5">
                <p className="eyebrow mb-2">
                  Saved versions · every download is kept
                </p>
                <VersionList
                  cvId={cvId}
                  exports={exports}
                  onChange={setExports}
                />
              </div>
            )}
            <CvPreview doc={doc} onPageCount={setPages} />
          </div>
        </div>
      </div>
    </main>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

function SectionPanel({
  cvId,
  section,
  handle,
  apply,
}: {
  cvId: number;
  section: BuilderSection;
  handle: React.ReactNode;
  apply: (updater: Updater, persist: () => Promise<unknown>) => void;
}) {
  const [open, setOpen] = useState(true);

  const children =
    section.kind === "skills"
      ? section.skillGroups.flatMap((g) => g.skills)
      : section.entries;
  const chosen = children.filter((c) => c.included).length;
  const partial = chosen > 0 && chosen < children.length;

  const toggleSection = (included: boolean) =>
    apply(
      (draft) => mapSection(draft, section.id, (s) => ({ ...s, included })),
      () => setSectionIncluded(cvId, section.id, included),
    );

  const selectAll = (included: boolean) =>
    apply(
      (draft) =>
        mapSection(draft, section.id, (s) => ({
          ...s,
          included: true,
          entries: s.entries.map((e) => ({
            ...e,
            included,
            bullets: e.bullets.map((b) => ({ ...b, included })),
          })),
          skillGroups: s.skillGroups.map((g) => ({
            ...g,
            included,
            skills: g.skills.map((sk) => ({ ...sk, included })),
          })),
        })),
      () => setSectionSelectionBulk(cvId, section.id, included),
    );

  return (
    <section className={`card overflow-hidden ${section.included ? "" : "dimmed"}`}>
      <header className="flex items-center gap-2.5 border-b border-line-2 px-3.5 py-2.5">
        {handle}
        <Checkbox
          checked={section.included}
          ariaLabel={`Include ${section.title}`}
          onChange={toggleSection}
        />
        <button
          type="button"
          className="btn btn-ghost btn-sm min-w-0 flex-1 justify-start gap-2 px-1 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <Chevron open={open} />
          <span className="truncate text-[14px] font-semibold text-ink">
            {section.title}
          </span>
          <span className="flex-none text-[12px] font-normal muted">
            {chosen}/{children.length}
          </span>
        </button>

        {section.kind === "entries" && section.entries.length > 1 && (
          <OrderToggle
            auto={section.autoOrder}
            onChange={(auto) =>
              apply(
                (draft) =>
                  mapSection(draft, section.id, (s) => ({ ...s, autoOrder: auto })),
                () => setAutoOrder(cvId, section.id, auto),
              )
            }
          />
        )}
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => selectAll(true)}>
          All
        </button>
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => selectAll(false)}>
          None
        </button>
      </header>

      {open && (
        <div className="px-3.5 py-3">
          {section.kind === "skills" ? (
            <div className="grid gap-3">
              {section.skillGroups.map((group) => (
                <SkillGroupPanel
                  key={group.id}
                  cvId={cvId}
                  sectionId={section.id}
                  group={group}
                  apply={apply}
                />
              ))}
              {section.skillGroups.length === 0 && <EmptyHint />}
            </div>
          ) : (
            <EntryList cvId={cvId} section={section} apply={apply} />
          )}
        </div>
      )}
    </section>
  );
}

function OrderToggle({
  auto,
  onChange,
}: {
  auto: boolean;
  onChange: (auto: boolean) => void;
}) {
  return (
    <button
      type="button"
      className="btn btn-ghost btn-sm"
      title={
        auto
          ? "Ordered newest-first by end date. Click to order manually, or just drag a record."
          : "Manual order. Click to go back to newest-first."
      }
      onClick={() => onChange(!auto)}
    >
      {auto ? "↕ Auto by date" : "↕ Manual order"}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Entries                                                             */
/* ------------------------------------------------------------------ */

function EntryList({
  cvId,
  section,
  apply,
}: {
  cvId: number;
  section: BuilderSection;
  apply: (updater: Updater, persist: () => Promise<unknown>) => void;
}) {
  if (section.entries.length === 0) return <EmptyHint />;
  const ids = section.entries.map((e) => e.id);

  return (
    <SortableList
      ids={ids}
      onReorder={(next) =>
        apply(
          (draft) =>
            mapSection(draft, section.id, (s) => ({
              ...s,
              autoOrder: false,
              entries: reorderBy(s.entries, next),
            })),
          () => reorderCvEntries(cvId, section.id, next),
        )
      }
    >
      <div className="grid gap-2">
        {section.entries.map((entry) => (
          <SortableRow key={entry.id} id={entry.id}>
            {(handle) => (
              <EntryPanel
                cvId={cvId}
                sectionId={section.id}
                entry={entry}
                handle={handle}
                apply={apply}
              />
            )}
          </SortableRow>
        ))}
      </div>
    </SortableList>
  );
}

function EntryPanel({
  cvId,
  sectionId,
  entry,
  handle,
  apply,
}: {
  cvId: number;
  sectionId: number;
  entry: BuilderEntry;
  handle: React.ReactNode;
  apply: (updater: Updater, persist: () => Promise<unknown>) => void;
}) {
  const chosen = entry.bullets.filter((b) => b.included).length;

  const mapEntry = (
    draft: BuilderCv,
    fn: (e: BuilderEntry) => BuilderEntry,
  ): BuilderCv =>
    mapSection(draft, sectionId, (s) => ({
      ...s,
      entries: s.entries.map((e) => (e.id === entry.id ? fn(e) : e)),
    }));

  const toggleEntry = (included: boolean) =>
    apply(
      (draft) => mapEntry(draft, (e) => ({ ...e, included })),
      () => setEntryIncluded(cvId, entry.id, included),
    );

  return (
    <div
      className={`rounded-lg border border-line bg-surface-2/60 ${entry.included ? "" : "dimmed"}`}
    >
      <div className="flex items-center gap-2.5 px-2.5 py-2">
        {handle}
        <Checkbox
          checked={entry.included}
          ariaLabel={`Include ${entry.org}`}
          onChange={toggleEntry}
        />
        <div className="min-w-0 flex-1">
          <div className="truncate text-[13.5px]">
            <span className="font-semibold">{entry.org}</span>
            {entry.role && <span className="muted"> — {entry.role}</span>}
          </div>
        </div>
        <span className="flex-none text-[12px] muted">
          {formatRange(entry.start_date, entry.end_date)}
        </span>
        <span className="flex-none text-[12px] muted">
          {chosen}/{entry.bullets.length}
        </span>
      </div>

      {entry.bullets.length > 0 && (
        <div className="border-t border-line-2 px-2.5 py-2">
          <SortableList
            ids={entry.bullets.map((b) => b.id)}
            onReorder={(next) =>
              apply(
                (draft) =>
                  mapEntry(draft, (e) => ({
                    ...e,
                    bullets: reorderBy(e.bullets, next),
                  })),
                () => reorderCvBullets(cvId, next),
              )
            }
          >
            <div className="grid gap-1">
              {entry.bullets.map((bullet) => (
                <SortableRow key={bullet.id} id={bullet.id}>
                  {(bulletHandle) => (
                    <BulletRow
                      cvId={cvId}
                      bullet={bullet}
                      handle={bulletHandle}
                      onToggle={(included) =>
                        apply(
                          (draft) =>
                            mapEntry(draft, (e) => ({
                              ...e,
                              bullets: e.bullets.map((b) =>
                                b.id === bullet.id ? { ...b, included } : b,
                              ),
                            })),
                          () => setBulletIncluded(cvId, bullet.id, included),
                        )
                      }
                      onOverride={(text) =>
                        apply(
                          (draft) =>
                            mapEntry(draft, (e) => ({
                              ...e,
                              bullets: e.bullets.map((b) =>
                                b.id === bullet.id
                                  ? {
                                      ...b,
                                      overrideText: text,
                                      effectiveText: text ?? b.text,
                                    }
                                  : b,
                              ),
                            })),
                          () => setBulletOverride(cvId, bullet.id, text),
                        )
                      }
                    />
                  )}
                </SortableRow>
              ))}
            </div>
          </SortableList>
        </div>
      )}
    </div>
  );
}

function BulletRow({
  bullet,
  handle,
  onToggle,
  onOverride,
}: {
  cvId: number;
  bullet: BuilderEntry["bullets"][number];
  handle: React.ReactNode;
  onToggle: (included: boolean) => void;
  onOverride: (text: string | null) => void;
}) {
  const [editing, setEditing] = useState(false);
  const overridden = bullet.overrideText !== null;

  return (
    <div className={`rounded-md px-1 py-1 hover:bg-line-2/60 ${bullet.included ? "" : "dimmed"}`}>
      <div className="flex items-start gap-2.5">
        <span className="pt-[3px]">{handle}</span>
        <span className="pt-[1px]">
          <Checkbox
            checked={bullet.included}
            ariaLabel="Include bullet"
            onChange={onToggle}
          />
        </span>
        <p className="min-w-0 flex-1 text-[13px] leading-[1.45] text-ink-2">
          {bullet.effectiveText || (
            <span className="italic muted">Empty bullet</span>
          )}
          {overridden && (
            <span className="ml-1.5 rounded bg-accent-soft px-1.5 py-px text-[11px] font-medium text-accent">
              edited
            </span>
          )}
        </p>
        <button
          type="button"
          className="btn btn-ghost btn-sm flex-none"
          onClick={() => setEditing((v) => !v)}
        >
          {editing ? "Done" : "Tailor"}
        </button>
      </div>

      {editing && (
        <div className="mt-1.5 pl-[52px]">
          <AutoField
            value={bullet.effectiveText}
            multiline
            rows={3}
            placeholder="Reword this bullet for this application only"
            ariaLabel="Tailored bullet text"
            onSave={(text) => onOverride(text === bullet.text ? null : text)}
          />
          <div className="mt-1.5 flex items-center gap-2">
            <span className="text-[12px] muted">
              Only affects this CV — the library keeps its own wording.
            </span>
            {overridden && (
              <button
                type="button"
                className="btn btn-ghost btn-sm ml-auto"
                onClick={() => {
                  onOverride(null);
                  setEditing(false);
                }}
              >
                Reset to library
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Skills                                                              */
/* ------------------------------------------------------------------ */

function SkillGroupPanel({
  cvId,
  sectionId,
  group,
  apply,
}: {
  cvId: number;
  sectionId: number;
  group: BuilderSkillGroup;
  apply: (updater: Updater, persist: () => Promise<unknown>) => void;
}) {
  const mapGroup = (
    draft: BuilderCv,
    fn: (g: BuilderSkillGroup) => BuilderSkillGroup,
  ): BuilderCv =>
    mapSection(draft, sectionId, (s) => ({
      ...s,
      skillGroups: s.skillGroups.map((g) => (g.id === group.id ? fn(g) : g)),
    }));

  return (
    <div className={`rounded-lg border border-line bg-surface-2/60 px-2.5 py-2 ${group.included ? "" : "dimmed"}`}>
      <div className="mb-2 flex items-center gap-2.5">
        <Checkbox
          checked={group.included}
          ariaLabel={`Include ${group.label}`}
          onChange={(included) =>
            apply(
              (draft) => mapGroup(draft, (g) => ({ ...g, included })),
              () => setSkillGroupIncluded(cvId, group.id, included),
            )
          }
        />
        <span className="text-[13.5px] font-semibold">{group.label}</span>
        <span className="text-[12px] muted">
          {group.skills.filter((s) => s.included).length}/{group.skills.length}
        </span>
      </div>

      <SortableList
        ids={group.skills.map((s) => s.id)}
        onReorder={(next) =>
          apply(
            (draft) =>
              mapGroup(draft, (g) => ({ ...g, skills: reorderBy(g.skills, next) })),
            () => reorderCvSkills(cvId, next),
          )
        }
      >
        <div className="flex flex-wrap gap-1.5">
          {group.skills.map((skill) => (
            <SortableRow key={skill.id} id={skill.id}>
              {(handle) => (
                /* Handle and label are sibling buttons, never nested: dragging
                   a chip and toggling it are two different gestures. */
                <span
                  className={`flex items-center rounded-full border pl-1 pr-0.5 transition-colors ${
                    skill.included
                      ? "border-accent bg-accent-soft"
                      : "border-line bg-surface"
                  }`}
                >
                  <span className="opacity-55">{handle}</span>
                  <button
                    type="button"
                    aria-pressed={skill.included}
                    onClick={() =>
                      apply(
                        (draft) =>
                          mapGroup(draft, (g) => ({
                            ...g,
                            skills: g.skills.map((s) =>
                              s.id === skill.id
                                ? { ...s, included: !s.included }
                                : s,
                            ),
                          })),
                        () => setSkillIncluded(cvId, skill.id, !skill.included),
                      )
                    }
                    className={`rounded-full px-1.5 py-1 text-[12.5px] ${
                      skill.included ? "font-medium text-accent" : "muted"
                    }`}
                  >
                    {skill.name}
                  </button>
                </span>
              )}
            </SortableRow>
          ))}
        </div>
      </SortableList>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function EmptyHint() {
  return (
    <p className="py-1.5 text-[13px] muted">
      Nothing in this section yet —{" "}
      <Link href="/library" className="underline underline-offset-2">
        add records in the library
      </Link>
      .
    </p>
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
