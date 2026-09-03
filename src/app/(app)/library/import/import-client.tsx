"use client";

import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { applyImport, readCv } from "@/lib/actions";
import type { AiLevel } from "@/lib/types";
import type {
  ImportedCv,
  ImportedEntry,
  ImportedSection,
} from "@/lib/import/types";

/**
 * Read a CV, then review what was found before any of it is written.
 *
 * The review is the feature, not a formality. A parse of someone's career
 * history will get things wrong — dates on the wrong record, a role read as an
 * employer — and the cost of a wrong guess landing silently in the library is
 * higher than the cost of a screen to check it on. Everything is editable and
 * everything can be unticked.
 */

type Draft = ImportedCv;

export function ImportClient({
  level,
  provider,
}: {
  level: AiLevel;
  provider: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [applyProfile, setApplyProfile] = useState(true);
  const [done, setDone] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (next: Draft) => setDraft({ ...next });

  const read = (file?: File) =>
    startTransition(async () => {
      setProblem(null);
      setNote(null);
      setDone(null);
      try {
        let payload: Parameters<typeof readCv>[0];
        if (file) {
          const bytes = new Uint8Array(await file.arrayBuffer());
          let binary = "";
          for (const b of bytes) binary += String.fromCharCode(b);
          payload = {
            file: { name: file.name, type: file.type, base64: btoa(binary) },
          };
        } else {
          payload = { text };
        }
        const result = await readCv(payload);
        if (result.problem) setProblem(result.problem);
        if (result.note) setNote(result.note);
        setDraft(result.cv);
      } catch {
        setProblem("Something went wrong reading that. Try pasting the text instead.");
      }
    });

  const commit = () =>
    startTransition(async () => {
      if (!draft) return;
      const summary = await applyImport(draft, applyProfile);
      const bits = [
        summary.sections && `${summary.sections} section${summary.sections === 1 ? "" : "s"}`,
        summary.entries && `${summary.entries} record${summary.entries === 1 ? "" : "s"}`,
        summary.bullets && `${summary.bullets} bullet${summary.bullets === 1 ? "" : "s"}`,
        summary.skills && `${summary.skills} skill${summary.skills === 1 ? "" : "s"}`,
        summary.prose && `${summary.prose} paragraph${summary.prose === 1 ? "" : "s"}`,
      ].filter(Boolean);
      setDone(
        bits.length
          ? `Added ${bits.join(", ")}${summary.profileUpdated ? ", and filled in blank contact details" : ""}.`
          : "Nothing was ticked, so nothing was added.",
      );
      setDraft(null);
      setText("");
      setFileName(null);
      router.refresh();
    });

  if (done) {
    return (
      <section className="card p-5 grid gap-3">
        <p className="text-[13.5px] font-medium">{done}</p>
        <div className="flex gap-2">
          <a className="btn" href="/library">Open the library</a>
          <button type="button" className="btn" onClick={() => setDone(null)}>
            Read another
          </button>
        </div>
      </section>
    );
  }

  if (!draft) {
    return (
      <div className="grid gap-5">
        <section className="card p-5 grid gap-3">
          <h2 className="eyebrow">Paste your CV</h2>
          <textarea
            className="field min-h-[240px] font-mono text-[12.5px]"
            placeholder="Paste the whole thing — headings, dates, bullets and all."
            value={text}
            disabled={pending}
            onChange={(event) => setText(event.target.value)}
          />
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn"
              disabled={pending || !text.trim()}
              onClick={() => read()}
            >
              {pending ? "Reading…" : "Read it"}
            </button>
            <span className="text-[12.5px] muted">or</span>
            <button
              type="button"
              className="btn"
              disabled={pending}
              onClick={() => fileRef.current?.click()}
            >
              Choose a file
            </button>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,.txt,.md,text/plain,application/pdf"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  setFileName(file.name);
                  read(file);
                }
                event.target.value = "";
              }}
            />
            {fileName && <span className="text-[12.5px] muted">{fileName}</span>}
          </div>

          <p className="text-[12.5px] muted">
            {level === "local" ? (
              <>
                Reading happens on this machine, using layout alone. Turning on
                an AI level in{" "}
                <a className="underline" href="/settings">Settings</a> makes the
                reading better; it is not needed for this to work.
              </>
            ) : (
              <>
                {provider ?? "Your provider"} will be asked to improve the
                reading. If that fails, the offline reading is used instead and
                you will be told.
              </>
            )}
          </p>
        </section>

        {problem && (
          <section className="card p-5">
            <p className="text-[13px]">{problem}</p>
          </section>
        )}
      </div>
    );
  }

  const counts = draft.sections.reduce(
    (acc, s) => {
      if (!s.chosen) return acc;
      acc.entries += s.entries.filter((e) => e.chosen).length;
      acc.bullets += s.entries
        .filter((e) => e.chosen)
        .reduce((n, e) => n + e.bullets.filter((b) => b.chosen).length, 0);
      acc.skills += s.groups.filter((g) => g.chosen).reduce((n, g) => n + g.skills.length, 0);
      acc.prose += s.prose.filter((p) => p.chosen).length;
      return acc;
    },
    { entries: 0, bullets: 0, skills: 0, prose: 0 },
  );

  return (
    <div className="grid gap-5" aria-busy={pending}>
      <section className="card p-5 grid gap-2">
        <h2 className="eyebrow">What it found</h2>
        <p className="text-[13px]">
          {draft.source === "assisted"
            ? `Read with help from ${provider ?? "your provider"}.`
            : "Read on this machine, from layout alone."}{" "}
          <span className="muted">
            Check it before adding. Untick anything wrong, or fix it here.
          </span>
        </p>
        {note && <p className="text-[12.5px] muted">{note}</p>}
        {problem && <p className="text-[12.5px]">{problem}</p>}
      </section>

      <ProfileCard draft={draft} update={update} applyProfile={applyProfile} setApplyProfile={setApplyProfile} />

      {draft.sections.map((section, si) => (
        <SectionCard
          key={si}
          section={section}
          onChange={(next) => {
            const sections = [...draft.sections];
            sections[si] = next;
            update({ ...draft, sections });
          }}
        />
      ))}

      {draft.leftovers.length > 0 && (
        <section className="card p-5 grid gap-2">
          <h2 className="eyebrow">Not placed</h2>
          <p className="text-[12.5px] muted">
            These lines were not understood, so they are not going anywhere.
            They are here so you can see nothing was quietly dropped.
          </p>
          <ul className="grid gap-1 text-[12.5px] muted">
            {draft.leftovers.slice(0, 20).map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </section>
      )}

      <section className="card p-5 flex flex-wrap items-center gap-3">
        <button type="button" className="btn" disabled={pending} onClick={commit}>
          {pending ? "Adding…" : "Add to library"}
        </button>
        <button
          type="button"
          className="btn"
          disabled={pending}
          onClick={() => {
            setDraft(null);
            setProblem(null);
            setNote(null);
          }}
        >
          Start over
        </button>
        <span className="text-[12.5px] muted">
          {counts.entries} record{counts.entries === 1 ? "" : "s"}, {counts.bullets} bullet
          {counts.bullets === 1 ? "" : "s"}, {counts.skills} skill
          {counts.skills === 1 ? "" : "s"}
          {counts.prose ? `, ${counts.prose} paragraph${counts.prose === 1 ? "" : "s"}` : ""} ticked
        </span>
      </section>
    </div>
  );
}

function ProfileCard({
  draft,
  update,
  applyProfile,
  setApplyProfile,
}: {
  draft: Draft;
  update: (d: Draft) => void;
  applyProfile: boolean;
  setApplyProfile: (v: boolean) => void;
}) {
  const fields: Array<[keyof Draft["profile"], string]> = [
    ["full_name", "Name"],
    ["email", "Email"],
    ["phone", "Phone"],
    ["location", "Location"],
    ["linkedin", "LinkedIn"],
    ["website", "Website"],
  ];
  const anything = Object.values(draft.profile).some(Boolean);
  if (!anything) return null;

  return (
    <section className="card p-5 grid gap-3">
      <label className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={applyProfile}
          onChange={(event) => setApplyProfile(event.target.checked)}
        />
        <span className="eyebrow">Contact details</span>
      </label>
      <p className="text-[12.5px] muted">
        Only blank fields on your profile are filled. Nothing already there is
        overwritten.
      </p>
      <div className="grid gap-2 sm:grid-cols-2">
        {fields.map(([key, label]) => (
          <label key={key} className="grid gap-1">
            <span className="text-[12px] muted">{label}</span>
            <input
              className="field"
              value={draft.profile[key]}
              disabled={!applyProfile}
              onChange={(event) =>
                update({ ...draft, profile: { ...draft.profile, [key]: event.target.value } })
              }
            />
          </label>
        ))}
      </div>
    </section>
  );
}

function SectionCard({
  section,
  onChange,
}: {
  section: ImportedSection;
  onChange: (s: ImportedSection) => void;
}) {
  return (
    <section className={`card p-5 grid gap-3 ${section.chosen ? "" : "opacity-55"}`}>
      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          checked={section.chosen}
          onChange={(event) => onChange({ ...section, chosen: event.target.checked })}
        />
        <input
          className="field flex-1"
          value={section.title}
          onChange={(event) => onChange({ ...section, title: event.target.value })}
        />
        <span className="text-[12px] muted whitespace-nowrap">
          {section.kind}
          {section.kind === "entries" ? ` · ${section.dateMode}` : ""}
        </span>
      </div>

      {section.entries.map((entry, i) => (
        <EntryRow
          key={i}
          entry={entry}
          dateMode={section.dateMode}
          onChange={(next) => {
            const entries = [...section.entries];
            entries[i] = next;
            onChange({ ...section, entries });
          }}
        />
      ))}

      {section.groups.map((group, i) => (
        <div key={i} className="rounded-md border border-[var(--color-line)] p-3 grid gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={group.chosen}
              onChange={(event) => {
                const groups = [...section.groups];
                groups[i] = { ...group, chosen: event.target.checked };
                onChange({ ...section, groups });
              }}
            />
            <input
              className="field flex-1"
              placeholder="Group label (optional)"
              value={group.label}
              onChange={(event) => {
                const groups = [...section.groups];
                groups[i] = { ...group, label: event.target.value };
                onChange({ ...section, groups });
              }}
            />
          </div>
          <input
            className="field text-[12.5px]"
            value={group.skills.join(", ")}
            onChange={(event) => {
              const groups = [...section.groups];
              groups[i] = {
                ...group,
                skills: event.target.value.split(",").map((s) => s.trim()).filter(Boolean),
              };
              onChange({ ...section, groups });
            }}
          />
        </div>
      ))}

      {section.prose.map((p, i) => (
        <div key={i} className="rounded-md border border-[var(--color-line)] p-3 grid gap-2">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={p.chosen}
              onChange={(event) => {
                const prose = [...section.prose];
                prose[i] = { ...p, chosen: event.target.checked };
                onChange({ ...section, prose });
              }}
            />
            <span className="text-[12.5px] muted">{p.label || "Paragraph"}</span>
          </label>
          <textarea
            className="field min-h-[90px] text-[12.5px]"
            value={p.body}
            onChange={(event) => {
              const prose = [...section.prose];
              prose[i] = { ...p, body: event.target.value };
              onChange({ ...section, prose });
            }}
          />
        </div>
      ))}
    </section>
  );
}

function EntryRow({
  entry,
  dateMode,
  onChange,
}: {
  entry: ImportedEntry;
  dateMode: ImportedSection["dateMode"];
  onChange: (e: ImportedEntry) => void;
}) {
  return (
    <div
      className={`rounded-md border border-[var(--color-line)] p-3 grid gap-2 ${
        entry.chosen ? "" : "opacity-55"
      }`}
    >
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          checked={entry.chosen}
          onChange={(event) => onChange({ ...entry, chosen: event.target.checked })}
        />
        <input
          className="field flex-1"
          placeholder="Organisation"
          value={entry.org}
          onChange={(event) => onChange({ ...entry, org: event.target.value })}
        />
        <input
          className="field flex-1"
          placeholder="Role"
          value={entry.role}
          onChange={(event) => onChange({ ...entry, role: event.target.value })}
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          className="field flex-1 min-w-[140px]"
          placeholder="Location"
          value={entry.location}
          onChange={(event) => onChange({ ...entry, location: event.target.value })}
        />
        {dateMode !== "none" && (
          <input
            className="field w-[120px]"
            placeholder="YYYY-MM"
            value={entry.start_date}
            onChange={(event) => onChange({ ...entry, start_date: event.target.value })}
          />
        )}
        {dateMode === "range" && (
          <input
            className="field w-[120px]"
            placeholder="YYYY-MM or blank"
            value={entry.end_date}
            onChange={(event) => onChange({ ...entry, end_date: event.target.value })}
          />
        )}
      </div>

      {entry.bullets.map((bullet, i) => (
        <div key={i} className="flex items-start gap-2">
          <input
            type="checkbox"
            className="mt-2"
            checked={bullet.chosen}
            onChange={(event) => {
              const bullets = [...entry.bullets];
              bullets[i] = { ...bullet, chosen: event.target.checked };
              onChange({ ...entry, bullets });
            }}
          />
          <textarea
            className="field flex-1 min-h-[52px] text-[12.5px]"
            value={bullet.text}
            onChange={(event) => {
              const bullets = [...entry.bullets];
              bullets[i] = { ...bullet, text: event.target.value };
              onChange({ ...entry, bullets });
            }}
          />
        </div>
      ))}
    </div>
  );
}
