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

## Keys

At the `assisted` and `full` levels Locus reads a provider key. Where it lives
and what protects it:

- The key goes in `.env.local`, which is gitignored and written `0600`. It is
  never written to `data/locus.db`, so backing up or exporting your data cannot
  carry it with them.
- The app never hands it back. `getAiClient` captures the key in a closure and
  attaches the auth header itself; nothing returns the value, and Settings
  reports only whether a key is configured. It never appears in a page served
  to the browser.
- If you set the variable in your own environment instead, Locus reads it and
  Settings refuses to edit it, rather than appearing to save and doing nothing.

**If a key is ever exposed — pasted somewhere, committed by accident, or read
into a log — rotate it at the provider.** Revoking is the only reliable
remedy; deleting the file or the message it landed in is not. Both providers
let you revoke a single key without disturbing the others:

- [Anthropic](https://console.anthropic.com/settings/keys)
- [OpenAI](https://platform.openai.com/api-keys)

Once rotated, paste the new key into Settings, or update `.env.local` and
reload.

## Things worth knowing before you report

- The dev server binds to localhost. Anyone else on your machine can reach it;
  it is not intended to be exposed to a network.
- Bullet text supports `**bold**` and is rendered as React elements, not raw
  HTML, so the document does not evaluate markup you type into it.
- The PDF route drives headless Chrome over a page this app serves, on
  localhost only. It does not fetch remote URLs.
- `data/locus.db` and `data/exports/` are ordinary files with your filesystem's
  permissions. Locus does not encrypt them.
