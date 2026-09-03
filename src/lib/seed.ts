import { db } from "./db";

interface SeedEntry {
  org: string;
  role?: string;
  subtitle?: string;
  location?: string;
  start: string;
  end?: string;
  bullets: string[];
}
interface SeedSection {
  title: string;
  kind: "entries" | "skills" | "prose";
  dateMode?: "range" | "single" | "none";
  entries?: SeedEntry[];
  skillGroups?: Array<{ label: string; skills: string[] }>;
  prose?: Array<{ label: string; body: string }>;
}

/*
 * Sample data for a fresh database, so the app has something to show on first
 * run. It is fictional on purpose — this file ships in the repository, so no
 * real personal details belong in it. Delete or edit any of it in the library;
 * your own records live only in data/locus.db, which is gitignored.
 *
 * Contact details use the reserved example.com domain and the +1 555 01xx
 * number range, both set aside for documentation.
 */
const PROFILE = {
  full_name: "Sam Rivera",
  email: "sam.rivera@example.com",
  linkedin: "linkedin.com/in/sam-rivera-example",
  phone: "+1 555 0142",
  website: "",
  location: "",
};

const SECTIONS: SeedSection[] = [
  {
    title: "Summary",
    kind: "prose",
    prose: [
      {
        label: "Backend focus",
        body: "Backend engineer of eight years, most of it on systems that move data between other systems. I like the unglamorous work — the batch job nobody wants to touch, the migration that has to happen without downtime — and I care about leaving things easier to change than I found them.",
      },
      {
        label: "Broader / product",
        body: "Engineer of eight years across backend and product work. Happiest close to the people using what I build, and comfortable owning something end to end: the schema, the API, the interface, and the on-call rotation that follows.",
      },
    ],
  },
  {
    title: "Professional Experience",
    kind: "entries",
    entries: [
      {
        org: "Northwind Logistics",
        role: "Senior Backend Engineer",
        start: "2023-02",
        bullets: [
          "Rebuilt the shipment tracking pipeline in **Go** and **Kafka**, cutting end-to-end latency from 40 seconds to under 3 and removing a nightly batch job the team had maintained for six years.",
          "Introduced contract testing across 14 internal services, which took integration failures in staging from roughly 20 a week to fewer than 2.",
          "Mentored four engineers through their first on-call rotations and wrote the runbooks the team still uses.",
        ],
      },
      {
        org: "Bellhaven Studio",
        role: "Full-stack Engineer",
        start: "2021-06",
        end: "2023-01",
        bullets: [
          "Built the studio's client portal in **TypeScript** and **Next.js**, replacing a manual email workflow that had been consuming about a day of account-manager time each week.",
          "Designed the billing integration against **Stripe**, including proration and dunning, and took payment failures down by 35%.",
          "Ran the migration from a single **Postgres** instance to read replicas with zero downtime.",
        ],
      },
      {
        org: "Corvus Analytics",
        role: "Software Engineer (Contract)",
        start: "2020-09",
        end: "2021-05",
        bullets: [
          "Wrote a **Python** ingestion service that consolidated 11 client data feeds into one warehouse schema.",
          "Automated a reporting process that had been done by hand each month, saving roughly 20 hours per cycle.",
        ],
      },
    ],
  },
  {
    title: "Projects",
    kind: "entries",
    entries: [
      {
        org: "Tideline",
        role: "Open-source tide prediction library",
        start: "2022-03",
        bullets: [
          "Small **Rust** crate for harmonic tide prediction, used by a handful of sailing apps. Around 400 stars.",
        ],
      },
      {
        org: "Fieldnote",
        role: "Offline-first note taking",
        start: "2021-01",
        end: "2021-11",
        bullets: [
          "Local-first notes app with CRDT sync, built to learn conflict resolution properly rather than to ship.",
        ],
      },
    ],
  },
  {
    title: "Skills",
    kind: "skills",
    skillGroups: [
      {
        label: "Languages",
        skills: ["Go", "TypeScript", "Python", "Rust", "SQL"],
      },
      {
        label: "Tools",
        skills: ["Postgres", "Kafka", "Docker", "Terraform", "AWS"],
      },
    ],
  },
  {
    title: "Certifications",
    kind: "entries",
    dateMode: "single",
    entries: [
      {
        org: "Certified Kubernetes Administrator",
        role: "Cloud Native Computing Foundation",
        start: "2024-04",
        bullets: [],
      },
      {
        org: "AWS Solutions Architect — Associate",
        role: "Amazon Web Services",
        start: "2022-08",
        bullets: [],
      },
    ],
  },
  {
    title: "Awards",
    kind: "entries",
    dateMode: "single",
    entries: [
      {
        org: "Engineering Excellence Award",
        role: "Northwind Logistics",
        start: "2024-11",
        bullets: [],
      },
    ],
  },
  {
    title: "Education and Qualifications",
    kind: "entries",
    entries: [
      {
        org: "School of Computing, Northfield University",
        location: "Northfield",
        subtitle: "BSc, Computer Science",
        start: "2016-09",
        end: "2020-06",
        bullets: ["First class honours"],
      },
    ],
  },
  {
    title: "Community Engagement",
    kind: "entries",
    entries: [
      {
        org: "Northfield Code Club",
        location: "Volunteer",
        start: "2021-04",
        bullets: [
          "Teach a weekly introductory programming session for teenagers.",
          "Rewrote the club's curriculum around small finished projects rather than isolated exercises.",
        ],
      },
    ],
  },
];

/** Populate an empty database with the sample. No-op if anything exists. */
export function seedIfEmpty(): void {
  const conn = db();
  const { n } = conn.prepare("SELECT COUNT(*) AS n FROM section").get() as {
    n: number;
  };
  if (n > 0) return;

  const insertSection = conn.prepare(
    "INSERT INTO section (title, kind, date_mode, sort_order) VALUES (?, ?, ?, ?)",
  );
  const insertProse = conn.prepare(
    "INSERT INTO prose (section_id, label, body, sort_order) VALUES (?, ?, ?, ?)",
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

  conn.transaction(() => {
    conn
      .prepare(
        `UPDATE profile SET full_name=@full_name, email=@email, phone=@phone,
         linkedin=@linkedin, website=@website, location=@location WHERE id=1`,
      )
      .run(PROFILE);

    SECTIONS.forEach((section, si) => {
      const sectionId = Number(
        insertSection.run(
          section.title,
          section.kind,
          section.dateMode ?? "range",
          si,
        ).lastInsertRowid,
      );
      section.prose?.forEach((item, pi) =>
        insertProse.run(sectionId, item.label, item.body, pi),
      );
      section.entries?.forEach((entry, ei) => {
        const entryId = Number(
          insertEntry.run(
            sectionId,
            entry.org,
            entry.role ?? "",
            entry.subtitle ?? "",
            entry.location ?? "",
            entry.start,
            entry.end ?? "",
            ei,
          ).lastInsertRowid,
        );
        entry.bullets.forEach((text, bi) => insertBullet.run(entryId, text, bi));
      });
      section.skillGroups?.forEach((group, gi) => {
        const groupId = Number(
          insertGroup.run(sectionId, group.label, gi).lastInsertRowid,
        );
        group.skills.forEach((name, ki) => insertSkill.run(groupId, name, ki));
      });
    });
  })();
}
