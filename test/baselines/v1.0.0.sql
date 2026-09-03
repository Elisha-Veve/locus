PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS profile (
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  full_name  TEXT NOT NULL DEFAULT '',
  email      TEXT NOT NULL DEFAULT '',
  phone      TEXT NOT NULL DEFAULT '',
  linkedin   TEXT NOT NULL DEFAULT '',
  website    TEXT NOT NULL DEFAULT '',
  location   TEXT NOT NULL DEFAULT ''
);

-- A CV category: Professional Experience, Skills, Education, Projects, ...
CREATE TABLE IF NOT EXISTS section (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  title      TEXT NOT NULL,
  -- 'entries' renders org/role/date blocks with bullets; 'skills' renders grouped inline lists
  kind       TEXT NOT NULL CHECK (kind IN ('entries','skills')) DEFAULT 'entries',
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived   INTEGER NOT NULL DEFAULT 0
);

-- One job / school / project inside a section.
CREATE TABLE IF NOT EXISTS entry (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES section(id) ON DELETE CASCADE,
  org        TEXT NOT NULL,              -- Morgan Stanley / University of Ghana
  role       TEXT NOT NULL DEFAULT '',   -- Software Engineer (Contingent)
  subtitle   TEXT NOT NULL DEFAULT '',   -- second line, e.g. BSc Computer Engineering
  location   TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL DEFAULT '',   -- 'YYYY-MM'
  end_date   TEXT NOT NULL DEFAULT '',   -- 'YYYY-MM', or '' meaning Present
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_entry_section ON entry(section_id);

CREATE TABLE IF NOT EXISTS bullet (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  entry_id   INTEGER NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  text       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_bullet_entry ON bullet(entry_id);

-- Skills: "Languages: Java (Springboot), Scala, ..."  group = the label, skill = one item.
CREATE TABLE IF NOT EXISTS skill_group (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  section_id INTEGER NOT NULL REFERENCES section(id) ON DELETE CASCADE,
  label      TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_skillgroup_section ON skill_group(section_id);

CREATE TABLE IF NOT EXISTS skill (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  group_id   INTEGER NOT NULL REFERENCES skill_group(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  archived   INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS idx_skill_group ON skill(group_id);

-- A tailored CV for one application.
CREATE TABLE IF NOT EXISTS cv (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  name       TEXT NOT NULL,
  company    TEXT NOT NULL DEFAULT '',
  role       TEXT NOT NULL DEFAULT '',
  notes      TEXT NOT NULL DEFAULT '',
  -- Which document style this CV prints in; see cvStyles.ts
  style      TEXT NOT NULL DEFAULT 'classic',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Overlay tables. A MISSING row means "library default": included, in library order.
-- Rows are only written when this CV deviates from the default.
CREATE TABLE IF NOT EXISTS cv_section (
  cv_id      INTEGER NOT NULL REFERENCES cv(id) ON DELETE CASCADE,
  section_id INTEGER NOT NULL REFERENCES section(id) ON DELETE CASCADE,
  included   INTEGER,
  sort_order INTEGER,
  -- 1 = order entries automatically by end date (newest first); 0 = use cv_entry.sort_order
  auto_order INTEGER NOT NULL DEFAULT 1,
  PRIMARY KEY (cv_id, section_id)
);

CREATE TABLE IF NOT EXISTS cv_entry (
  cv_id      INTEGER NOT NULL REFERENCES cv(id) ON DELETE CASCADE,
  entry_id   INTEGER NOT NULL REFERENCES entry(id) ON DELETE CASCADE,
  included   INTEGER,
  sort_order INTEGER,
  PRIMARY KEY (cv_id, entry_id)
);

CREATE TABLE IF NOT EXISTS cv_bullet (
  cv_id         INTEGER NOT NULL REFERENCES cv(id) ON DELETE CASCADE,
  bullet_id     INTEGER NOT NULL REFERENCES bullet(id) ON DELETE CASCADE,
  included      INTEGER,
  sort_order    INTEGER,
  override_text TEXT,   -- NULL = use the library wording
  PRIMARY KEY (cv_id, bullet_id)
);

CREATE TABLE IF NOT EXISTS cv_skill_group (
  cv_id      INTEGER NOT NULL REFERENCES cv(id) ON DELETE CASCADE,
  group_id   INTEGER NOT NULL REFERENCES skill_group(id) ON DELETE CASCADE,
  included   INTEGER,
  sort_order INTEGER,
  PRIMARY KEY (cv_id, group_id)
);

CREATE TABLE IF NOT EXISTS cv_skill (
  cv_id      INTEGER NOT NULL REFERENCES cv(id) ON DELETE CASCADE,
  skill_id   INTEGER NOT NULL REFERENCES skill(id) ON DELETE CASCADE,
  included   INTEGER,
  sort_order INTEGER,
  PRIMARY KEY (cv_id, skill_id)
);

-- Every PDF you download is kept, so there is a record of exactly what was
-- sent to whom and when. The snapshot matters as much as the file: the library
-- keeps changing underneath, and this is how you see what a version said.
CREATE TABLE IF NOT EXISTS cv_export (
  id                 INTEGER PRIMARY KEY AUTOINCREMENT,
  cv_id              INTEGER NOT NULL REFERENCES cv(id) ON DELETE CASCADE,
  cv_name            TEXT NOT NULL,      -- the CV's name at export time
  company            TEXT NOT NULL DEFAULT '',
  role               TEXT NOT NULL DEFAULT '',
  file_name          TEXT NOT NULL,      -- the name it downloaded as
  stored_name        TEXT NOT NULL,      -- the file under data/exports
  byte_size          INTEGER NOT NULL,
  page_count         INTEGER NOT NULL,
  doc_hash           TEXT NOT NULL,      -- identifies identical re-exports
  doc_json           TEXT NOT NULL,      -- the resolved document, as printed
  created_at         TEXT NOT NULL DEFAULT (datetime('now')),
  last_downloaded_at TEXT NOT NULL DEFAULT (datetime('now')),
  download_count     INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX IF NOT EXISTS idx_export_cv ON cv_export(cv_id, created_at DESC);
