# Security

## What Locus is

Locus runs on your own machine and stores everything in a local SQLite file. It
has no accounts, no server you sign in to, and it sends nothing anywhere. The
main risk surface is therefore small — but it does render your CV in headless
Chrome, and it does read and write files.

## Supported versions

The latest release is the supported one. This is a small project; there are no
backported fixes.

## Reporting a vulnerability

Use GitHub's private reporting, which is enabled on this repository:
**[Report a vulnerability](https://github.com/Elisha-Veve/locus/security/advisories/new)**.
It reaches the maintainer without anything becoming public.

Please do not open a normal issue for anything exploitable.

You can expect an acknowledgement within about a week. If the finding is valid
you will be credited in the release notes unless you would rather not be.

## Things worth knowing before you report

- The dev server binds to localhost. Anyone else on your machine can reach it;
  it is not intended to be exposed to a network.
- Bullet text supports `**bold**` and is rendered as React elements, not raw
  HTML, so the document does not evaluate markup you type into it.
- The PDF route drives headless Chrome over a page this app serves, on
  localhost only. It does not fetch remote URLs.
- `data/locus.db` and `data/exports/` are ordinary files with your filesystem's
  permissions. Locus does not encrypt them.
