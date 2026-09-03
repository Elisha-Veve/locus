# Contributing

Thanks for looking. Locus is a small project and the bar for a useful change is
low — a typo fix is welcome.

## Getting set up

```bash
npm install
npm run dev
```

Open <http://localhost:3210>. On first run the database is seeded with a
fictional sample so there is something to click.

Requires Node 22.18 or newer. `npm run check:migrations` runs a `.mts` file
directly and older versions cannot strip the types, so the check fails on Node
20 even though the app itself runs. `npm install` downloads a Chromium build
for Puppeteer, which is what renders the PDF.

Your own data lives in `data/locus.db` and is gitignored. If you would rather
not mix it with development, `npm run dev:demo` runs against a throwaway
`data/demo.db` on port 3211.

## Opening a pull request

1. **Say something first** for anything beyond a small fix. An issue, or a
   comment on an existing one, saves you writing code that turns out not to be
   wanted. Issues labelled [good first
   issue](https://github.com/Elisha-Veve/locus/labels/good%20first%20issue) are
   already agreed.
2. **Fork and branch.** Branch from `main`, one topic per branch. Name it for
   what it does — `mobile-builder-layout`, `fix-empty-record-heading`.
3. **Keep the diff to its subject.** Unrelated reformatting hides the change
   inside noise. If you spot something else worth doing, say so in the PR and
   leave it for its own change.
4. **Write the message for someone reading it in a year.** Say why, not just
   what. If it closes an issue, put `Closes #12` in the description.
5. **Open the PR against `main`** and fill in the checklist. CI runs the three
   checks below on Node 22.18 and 24; a red run is the fastest way to find out
   something needs another look.
6. **Expect a review.** Comments are about the code. Push follow-up commits to
   the same branch rather than force-pushing, so the review stays readable —
   it all squashes on merge anyway.

Merges are squashed, so your branch arrives as one commit on `main`. Write the
PR title as the commit subject you want.

## Before you open a pull request

```bash
npx tsc --noEmit          # types
npm run build             # production build
npm run check:migrations  # schema and migrations agree
npm run check:import      # reading a CV still works
```

There is no test framework yet; these four are what stands in for one, and CI
runs them on every pull request. Adding tests would be a genuinely useful
contribution — see
[#4](https://github.com/Elisha-Veve/locus/issues/4).

## Three things that are easy to get wrong

**Schema changes need doing twice.** `src/lib/schema.sql` is what a new
database gets; `src/lib/migrations.ts` is what an existing one gets. Change
one without the other and people who installed earlier end up on a different
schema — invisibly, until something breaks. `npm run check:migrations` catches
it, so run it.

**Secrets belong in the environment.** API keys are read from `.env.local` and
never written to the database. If you add a provider, add its env var to
`AI_PROVIDERS` in `src/lib/ai.ts` and to `.env.example` — never a real key to
either. Do not export a way to read a key directly: `getAiClient` hands out a
request function with the key already attached, which is what makes "local
means no network" hold.

**The document is not themed.** The app's colour themes deliberately stop at
the edge of the page. A CV is a printed artefact: it stays near-black on white
in every palette, and the export must not depend on which theme is active.

## Reading a CV

`src/lib/import/` turns a pasted or uploaded CV into records for review. It has
two paths and the offline one is the floor: `parse.ts` reads layout alone and
must stay useful with no key at all, while `refine.ts` improves on it when one
is configured and falls back to it on any failure.

`coerce.ts` is the part to be careful with. Nothing a model returns is trusted
structurally — every field is read back and dropped if it is not the right
shape. It is pure and has no database or network dependency so that
`npm run check:import` can hammer it with malformed input; if you touch it, add
a case there. A parser bug shows up on the review screen, but a coercion bug
files an invention as somebody's career history.

Nothing is written until the person has reviewed it. That is the feature, not
a formality.

## Working on the document itself

`src/lib/cvStyles.ts` holds every style. They share one base and are selected
by a `data-style` attribute, so there are no separate templates to keep in
step. Spacing comes from the `--cv-lead` and `--cv-gap-*` variables rather
than per-style margins — that is what keeps the seven styles at a comparable
density.

Both the live preview and the PDF render `src/components/CvDocument.tsx`
through that one stylesheet, so they cannot drift apart. If you change either,
export a PDF and look at it; `/print/<id>` shows the bare document.

## Claude Code settings

`.claude/settings.json` is checked in, so anyone using Claude Code in this repo
picks it up. Beyond turning off commit attribution it does two things:

- Blocks reading and writing `.env.local`, which holds provider keys, so the
  contents cannot be read into a transcript. `.gitignore` only keeps the file
  out of commits; this covers the tool calls. It is a guard against accident,
  not a sandbox — anything running as you can still read a file you own, which
  is why [SECURITY.md](SECURITY.md) treats rotation as the remedy.
- Refuses a production build, or deleting `.next`, while a dev server is
  listening (`.claude/hooks/no-build-over-dev-server.sh`). Building over
  `.next` leaves the running server with half a build and every route 500s on
  "Cannot find module" — a failure whose message points nowhere near its cause.
  Stop the server, then build.

  That guard matches text rather than parsing a shell, so it sometimes refuses
  a command that only mentions a build — quoting one inside a longer command,
  say. That is deliberate: it errs toward refusing, never toward letting a
  clobbering build through. If it stops something harmless, stop the dev server
  and carry on rather than removing the hook.

Personal overrides go in `.claude/settings.local.json`, which is gitignored.

## Screenshots

Documentation images must never contain real data. With `npm run dev:demo`
running, `npm run screenshots` regenerates everything in `docs/screenshots`
from the fictional sample.

## Commits and releases

Commit messages explain why, not just what. Every release gets an entry in
[CHANGELOG.md](CHANGELOG.md); see the top of that file for what counts as
major, minor and patch.

## Where to start

Issues labelled [good first
issue](https://github.com/Elisha-Veve/locus/labels/good%20first%20issue) are
small and self-contained. If you are unsure whether something is wanted, open
an issue before writing the code.
