# Choosing a provider and getting a key

Locus needs no key at all. Everything works at the **Local** level, offline —
this page is only for turning on **Assisted**, which uses one short model call
to improve a job Locus can already do on its own.

## Start with Groq

**Groq is the one to try first.** Three reasons:

- Its free tier is generous enough for this. Reading a CV is one call on a few
  thousand tokens, which is nowhere near the limits.
- A Groq key works on its own. Anthropic keys issued through an identity
  provider also need the workspace they act in, which is one more thing to get
  right.
- It is fast, which matters when you are watching a spinner after pasting a CV.

OpenAI and Anthropic both work and are worth using if you already have a key or
prefer their models. Nothing in Locus depends on which you pick.

## Getting a key

Whichever you choose, the last step is the same: open **Settings** in Locus,
pick the provider, paste the key, and press **Save key**. It is written to
`.env.local`, which is gitignored, and never goes into the database — so a
backup of your data never contains it. You are never shown it again.

### Groq

1. Sign in at [console.groq.com](https://console.groq.com).
2. Go to [**API Keys**](https://console.groq.com/keys) and create one.
3. Copy it — it starts `gsk_`. It is shown once.

[console.groq.com/docs/models](https://console.groq.com/docs/models) lists what
your account can reach, which matters if you hit the 404 below.

### OpenAI

1. Sign in at [platform.openai.com](https://platform.openai.com).
2. Go to [**API keys**](https://platform.openai.com/api-keys) and create one.
3. Copy it — it starts `sk-`. It is shown once.

OpenAI has no free tier for the API; a key needs credit on the account even for
small jobs.

### Anthropic

1. Sign in at [console.anthropic.com](https://console.anthropic.com).
2. Go to [**API keys**](https://console.anthropic.com/settings/keys) and create
   one.
3. Copy it — it starts `sk-ant-`. It is shown once.

**If your key is identity-linked** — issued through single sign-on rather than
created directly in the console — it must also say which workspace it acts in.
Locus shows a **Workspace ID** field once you pick Anthropic. Find the id under
**Settings → Workspaces** in the console: open the workspace and read it from
the page or the URL. It looks like `wrkspc_…`, and it has to be a workspace
that key can actually reach, or the call fails with *workspace not found*.

An ordinary console key needs none of this. Leave the field blank.

## If a model returns 404

Each provider ships with a default model, and a default is a guess about your
account. Models get retired, renamed, and limited by tier, so a perfectly
reasonable default can be one your account cannot reach:

> The model `…` does not exist or you do not have access to it.

Settings has a **Model** field beside the key. Put in one your account can use
and press **Save**; **Default** puts back the shipped value. You do not need to
wait for a release, and you do not need to edit any files.

The safest fallbacks, if the default fails:

| Provider | Try |
| --- | --- |
| Groq | `llama-3.1-8b-instant` |
| OpenAI | `gpt-4o-mini` |
| Anthropic | `claude-haiku-4-5` |

A smaller model reads a CV more roughly. That costs less than it sounds: the
offline reader still does the structural work, and you review everything before
any of it is saved.

## If something else goes wrong

Locus reports what the provider said rather than just a status code, so the
message usually names the problem — a missing workspace, a model you cannot
reach, a key with no credit. Whatever the reason, the import falls back to the
offline reading and tells you it did. Nothing is lost and nothing breaks; you
get the rougher parse and the same review screen.

To stop using a provider entirely, set the level back to **Local** in Settings.
Locus then makes no network calls at all, and the key can be removed with
**Remove key**.
