## What this changes

<!-- And why. If it closes an issue, say "Closes #12". -->

## Checks

- [ ] `npx tsc --noEmit`
- [ ] `npm run build`
- [ ] `npm run check:migrations`

## If it touches the schema

- [ ] Changed `src/lib/schema.sql` (what a new database gets)
- [ ] Added a migration in `src/lib/migrations.ts` (what an existing one gets)

## If it touches the document

- [ ] Exported a PDF and looked at it
- [ ] Checked the styles the change could affect
- [ ] The document is still near-black on white in every theme
