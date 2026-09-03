# Changelog

All notable changes to Locus are recorded here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html):

- **Major** — a change that requires manual work to adopt, such as a data
  migration you have to run or a document style that renders differently.
- **Minor** — new capability, backwards compatible.
- **Patch** — fixes only.

Schema changes ship with a migration in `src/lib/db.ts`, which runs on startup;
existing databases are upgraded in place.

## [Unreleased]

Nothing yet.

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

[Unreleased]: https://github.com/Elisha-Veve/locus/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/Elisha-Veve/locus/releases/tag/v1.0.0
