# Changelog

All notable changes to Locus are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **Major** — a change that requires manual work to adopt, such as a data
  migration you have to run or a document style that renders differently.
- **Minor** — new capability, backwards compatible.
- **Patch** — fixes only.

Schema changes ship with a migration in `src/lib/migrations.ts`, which runs on
startup; existing databases are upgraded in place. `npm run check:migrations`
verifies that upgrading an old database and installing a new one produce the
same schema.

## [Unreleased]

### Added

- A key can be pasted into Settings when one is not already in the
  environment. It is written to `.env.local` — never the database — so backing
  up or exporting your data still cannot carry a credential with it. The file
  is written `0600`, the key is never read back to the browser, and it takes
  effect without a restart.

### Fixed

- Changing the level twice in quick succession could leave the setting on
  whichever write landed last rather than the one chosen last. The controls are
  now disabled while a change is saving.

## [1.3.0] — 2026-09-03

### Added

- An AI level, chosen in a new Settings page: **Local** (the default, no
  network calls and no key), **Assisted** and **Full**. It is a runtime
  setting, so switching costs a page refresh rather than a reinstall, and one
  build serves all three.
- `src/lib/ai.ts`, which answers what is available and is the only route to a
  provider key. `getAiClient` returns nothing unless the level permits it and
  attaches the key itself, so a feature cannot reach a provider without passing
  the check.
- `.env.example`, and `.gitignore` now excludes `.env` files. Keys live in
  `.env.local` and are never written to the database — a backup of your data
  contains no secret, and losing the database does not lose the key.

### Notes

Choosing a level without setting a key is safe: Locus says so and keeps running
locally. No feature uses this yet; it is the groundwork that lets one be added
without making the offline path worse.

## [1.2.1] — 2026-09-03

### Added

- MIT licence. The repository was public but unlicensed, which under copyright
  means all rights reserved — nobody could legally use or modify it.
- `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md` and `SECURITY.md`.
- Issue forms and a pull request checklist under `.github/`.
- Credit for the four OFL typefaces the exports embed, and a note that
  embedding them carries no obligation on to you.

## [1.2.0] — 2026-09-03

Internal only — nothing changes in the app, and no action is needed to upgrade.

### Added

- `npm run check:migrations`, which builds one database from `schema.sql` and
  another from a released baseline plus every migration, then asserts the two
  end up with the same schema. Without it, adding a column to `schema.sql` and
  forgetting the migration is invisible until someone who installed earlier
  hits a missing column.
- `test/baselines/` holding each released schema, so upgrades keep being tested
  from the versions people actually have.

### Changed

- Migrations moved out of `db.ts` into `src/lib/migrations.ts` as a numbered,
  ordered list recorded in SQLite's `user_version`. Previously each migration
  detected whether it had already run in its own ad-hoc way — one checked for a
  column, another matched a string inside the table's SQL — and nothing
  recorded what had been applied.

## [1.1.0] — 2026-09-03

### Added

- **Summary / profile sections.** A new prose section layout for a paragraph
  rather than a list. A section can hold several versions of the same summary
  — one angled at backend work, one at leadership — and each CV picks the one
  that fits. They are alternatives, so a new CV starts with the first ticked
  rather than all of them stacked. Summaries support per-CV tailoring and
  `**bold**` the same way bullets do.
- **Single-date and undated record sections**, so certifications, awards and
  publications print one date instead of a range, and sections like referees
  print none. Set per section from the library. A single date is held in the
  start field, which keeps newest-first sorting working.
- Sample data now includes Summary, Certifications and Awards sections.

### Changed

- The Slate style inverts role and employer only in dated-role sections. In a
  certifications section the certificate is the headline, so those keep the
  normal order.

### Fixed

- A record created but never filled in no longer puts an empty section heading
  on the exported CV.

## [1.0.0] — 2026-09-03

First release.

### Added

- **Library** of reusable records — sections, dated entries, bullets and
  individually taggable skills. Add your own sections in either layout (dated
  records with bullets, or inline skill lists). `**Double asterisks**` bold
  text inside a bullet.
- **Per-application CVs** built as a selection over the library rather than a
  copy, so records added later appear in existing CVs and a wording fix
  propagates everywhere. Only deviations from the default are stored.
- **Fine-grained selection** — every section, record, bullet and skill has a
  checkbox, and all of them drag to reorder.
- **Ordering** that defaults to reverse-chronological by end date with ongoing
  roles first, switching to manual for that CV as soon as you drag a record.
- **Per-CV bullet tailoring** that rewords a bullet for one application without
  touching the library copy.
- **Live A4 preview** with a page-count read-out, driven by the same component
  and stylesheet as the export.
- **One-page PDF export** through headless Chrome, with fonts shipped as
  dependencies so output does not depend on what is installed locally.
- **Seven document styles** — Classic, Ledger, Quiet, Margin, Modern, Open and
  Slate — chosen per CV. All near-black on white.
- **Saved versions.** Every download is archived with a snapshot of what it
  said and the style it used, so an old export stays truthful after the library
  moves on. Re-downloading an unchanged CV bumps a counter instead of adding a
  duplicate.
- **Twelve interface themes** in light and dark pairs, plus System. Themes
  never reach the document.
- **Duplicate CV** for the second application to a similar role.
- `npm run dev:demo` and `npm run screenshots` for working with fictional data.

### Notes

- Desktop only; there is no mobile layout yet.
- Data lives in `data/locus.db` and is gitignored. Back it up yourself.
- Deleting a library record removes it from past CVs as well.

[Unreleased]: https://github.com/Elisha-Veve/locus/compare/v1.3.0...HEAD
[1.3.0]: https://github.com/Elisha-Veve/locus/releases/tag/v1.3.0
[1.2.1]: https://github.com/Elisha-Veve/locus/releases/tag/v1.2.1
[1.2.0]: https://github.com/Elisha-Veve/locus/releases/tag/v1.2.0
[1.1.0]: https://github.com/Elisha-Veve/locus/releases/tag/v1.1.0
[1.0.0]: https://github.com/Elisha-Veve/locus/releases/tag/v1.0.0
