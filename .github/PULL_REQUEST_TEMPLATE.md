## What this changes

<!-- And why. If it closes an issue, say "Closes #12". -->

## How you checked it

<!-- CI runs typecheck, build and the migration check for you. Say what you
     did beyond that — the case you exercised, what you saw. -->

## If it touches the schema

- [ ] Changed `src/lib/schema.sql` (what a new database gets)
- [ ] Added a migration in `src/lib/migrations.ts` (what an existing one gets)

Both, or neither. `npm run check:migrations` fails if they disagree.

## If it touches the document

- [ ] Exported a PDF and looked at it
- [ ] Checked the styles the change could affect
- [ ] The document is still near-black on white in every theme
