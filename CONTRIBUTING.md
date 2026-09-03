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

Requires Node 20 or newer. `npm install` downloads a Chromium build for
Puppeteer, which is what renders the PDF.

Your own data lives in `data/locus.db` and is gitignored. If you would rather
not mix it with development, `npm run dev:demo` runs against a throwaway
`data/demo.db` on port 3211.

## Before you open a pull request

```bash
npx tsc --noEmit          # types
npm run build             # production build
npm run check:migrations  # schema and migrations agree
```

There is no test framework yet; these three are what stands in for one.
Adding tests would be a genuinely useful contribution.

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

## Working on the document itself

`src/lib/cvStyles.ts` holds every style. They share one base and are selected
by a `data-style` attribute, so there are no separate templates to keep in
step. Spacing comes from the `--cv-lead` and `--cv-gap-*` variables rather
than per-style margins — that is what keeps the seven styles at a comparable
density.

Both the live preview and the PDF render `src/components/CvDocument.tsx`
through that one stylesheet, so they cannot drift apart. If you change either,
export a PDF and look at it; `/print/<id>` shows the bare document.

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
