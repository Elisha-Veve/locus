import React from "react";
import { DEFAULT_CV_STYLE } from "@/lib/cvStyles";
import type { RenderDoc, RenderEntry, RenderSection } from "@/lib/types";
import { RichText } from "./RichText";

/**
 * The CV itself. Rendered both into the live preview and, via
 * renderToStaticMarkup, into the HTML that Puppeteer prints — so the preview
 * and the PDF can never drift apart.
 */
export function CvDocument({ doc }: { doc: RenderDoc }) {
  const { profile, sections } = doc;
  const contact: Array<[string, string]> = [
    ["Email:", profile.email],
    ["LinkedIn:", profile.linkedin],
    ["Phone:", profile.phone],
    ["Website:", profile.website],
    ["Location:", profile.location],
  ];

  return (
    <div className="cv-page" data-style={doc.style || DEFAULT_CV_STYLE}>
      <div className="cv-head">
        <h1 className="cv-name">{profile.full_name || "Your Name"}</h1>
        {contact
          .filter(([, value]) => value.trim() !== "")
          .map(([label, value]) => (
            <p className="cv-contact" key={label}>
              <span className="label">{label}</span> {value}
            </p>
          ))}
      </div>

      {sections.map((section, i) => (
        <SectionBlock key={i} section={section} />
      ))}

      {sections.length === 0 && (
        <p className="cv-empty" style={{ marginTop: "24pt" }}>
          Nothing selected yet — pick some records on the left.
        </p>
      )}
    </div>
  );
}

function SectionBlock({ section }: { section: RenderSection }) {
  return (
    <section className="cv-section" data-dates={section.dateMode}>
      <h2 className="cv-section-title">{section.title}</h2>

      <div className="cv-section-body">
        {section.kind === "prose"
          ? section.prose.map((text, i) => (
              <p className="cv-prose" key={i}>
                <RichText text={text} />
              </p>
            ))
          : section.kind === "skills"
          ? section.skillGroups.map((group, i) => (
              <p className="cv-skill-group" key={i}>
                <span className="dot">•</span>
                <span className="cv-skill-label">{group.label}: </span>
                {group.skills.join(", ")}
              </p>
            ))
          : section.entries.map((entry, i) => (
              <EntryBlock key={i} entry={entry} />
            ))}
      </div>
    </section>
  );
}

function EntryBlock({ entry }: { entry: RenderEntry }) {
  const heading = [entry.org, entry.location].filter(Boolean).join(", ");
  return (
    <div className="cv-entry">
      <div className="cv-entry-head">
        {/* Organisation and role are separate spans, and the separator is drawn
            in CSS, so a style can reorder them — Slate puts the role on top. */}
        <div className="cv-entry-title">
          <span className="cv-entry-org">{heading}</span>
          {entry.role && <span className="cv-entry-role">{entry.role}</span>}
        </div>
        {entry.dates && <div className="cv-entry-dates">{entry.dates}</div>}
      </div>

      {entry.subtitle && <div className="cv-entry-subtitle">{entry.subtitle}</div>}

      {entry.bullets.length > 0 && (
        <ul className="cv-bullets">
          {entry.bullets.map((text, i) => (
            <li className="cv-bullet" key={i}>
              <span className="dot">•</span>
              <RichText text={text} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
