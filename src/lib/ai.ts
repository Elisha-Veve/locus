import { db } from "./db";
import { readEnvValue } from "./envFile";
import type {
  AiCapabilities,
  AiLevel,
  AiProviderInfo,
  AiRequirement,
} from "./types";

/**
 * What Locus is allowed to do, and the only way to reach a provider key.
 *
 * The level is a runtime setting, not a build flag: one binary serves all
 * three, and switching costs a page refresh rather than a reinstall. Features
 * ask `canUseAi` what is available and decide for themselves whether to fall
 * back or stay hidden — nothing here dictates that choice.
 *
 * The key is deliberately not exported. It is reachable only through the
 * client returned by `getAiClient`, which refuses to exist unless the level
 * permits it and attaches the auth header itself. That makes "local means no
 * network" enforceable rather than a promise: with no key in the environment
 * there is no client, and with no client there is nothing to call.
 *
 * Server-side only. Never import this from a client component — pass the
 * result of `getAiCapabilities` down as a prop instead.
 */

export const AI_LEVELS: Array<{
  id: AiLevel;
  label: string;
  blurb: string;
}> = [
  {
    id: "local",
    label: "Local",
    blurb:
      "Everything Locus does today, with no network calls and no key. This is the default.",
  },
  {
    id: "assisted",
    label: "Assisted",
    blurb:
      "One-shot jobs on text you already have, such as reading an existing CV into the library. Small enough to sit inside the free tier most providers offer.",
  },
  {
    id: "full",
    label: "Full",
    blurb:
      "Everything above, plus features that call out as you work — tailoring a CV against a job posting, drafting from captured context.",
  },
];

export const AI_PROVIDERS: AiProviderInfo[] = [
  {
    id: "anthropic",
    label: "Anthropic",
    envVar: "LOCUS_AI_ANTHROPIC",
    keysUrl: "https://console.anthropic.com/settings/keys",
    endpoint: "https://api.anthropic.com/v1/messages",
    wire: "anthropic",
    maxTokensParam: "max_tokens",
    // The id is complete as written — model ids carry no date suffix, and an
    // invented one is a 400 rather than a helpful "no such model".
    model: "claude-haiku-4-5",
    extra: {
      envVar: "LOCUS_AI_ANTHROPIC_WORKSPACE",
      label: "Workspace ID",
      hint: "Only for identity-linked keys, which must say which workspace they act in. If you are not sure, leave it blank — Locus will tell you if it is needed.",
    },
  },
  {
    id: "openai",
    label: "OpenAI",
    envVar: "LOCUS_AI_OPENAI",
    keysUrl: "https://platform.openai.com/api-keys",
    endpoint: "https://api.openai.com/v1/chat/completions",
    wire: "openai",
    maxTokensParam: "max_completion_tokens",
    model: "gpt-4o-mini",
  },
  {
    id: "groq",
    label: "Groq",
    envVar: "LOCUS_AI_GROQ",
    keysUrl: "https://console.groq.com/keys",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
    wire: "openai",
    // Groq is OpenAI-compatible but predates the rename.
    maxTokensParam: "max_tokens",
    model: "openai/gpt-oss-120b",
  },
];

/**
 * Auth is provider-specific and stays in this module with the key.
 *
 * `extra` is the non-secret companion some accounts need — for Anthropic, the
 * workspace an identity-linked key acts in. Sent only when set, since an
 * ordinary key does not want it.
 */
const AUTH_HEADERS: Record<
  string,
  (key: string, extra: string | null) => Record<string, string>
> = {
  anthropic: (key, workspace) => ({
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
    ...(workspace ? { "anthropic-workspace-id": workspace } : {}),
  }),
  openai: (key) => ({ authorization: `Bearer ${key}` }),
  groq: (key) => ({ authorization: `Bearer ${key}` }),
};

/**
 * Which model to ask for.
 *
 * The per-provider default is a starting point, not a fact: a model can be
 * retired, renamed, or simply not enabled on a given account, and the failure
 * is a 404 that only the account holder can resolve. `LOCUS_AI_<PROVIDER>_MODEL`
 * overrides it, so that is a ten-second fix in Settings rather than a code
 * change. Twice now a hardcoded id has been wrong for the person using it.
 */
export function readModel(provider: AiProviderInfo): string {
  const name = `${provider.envVar}_MODEL`;
  const fromFile = readEnvValue(name);
  if (fromFile) return fromFile;
  const fromEnv = process.env[name]?.trim();
  return fromEnv ? fromEnv : provider.model;
}

/** The provider's extra value, from .env.local first then the environment. */
export function readExtra(provider: AiProviderInfo): string | null {
  if (!provider.extra) return null;
  const fromFile = readEnvValue(provider.extra.envVar);
  if (fromFile) return fromFile;
  const fromEnv = process.env[provider.extra.envVar]?.trim();
  return fromEnv ? fromEnv : null;
}

export function providerById(id: string): AiProviderInfo | null {
  return AI_PROVIDERS.find((p) => p.id === id) ?? null;
}

/**
 * The key, and where it came from.
 *
 * .env.local is consulted before process.env because process.env is only
 * populated at boot: a key saved in Settings has to work without a restart,
 * and after one the two agree anyway. A key exported in the shell and never
 * saved here still works — it is simply the fallback rather than the winner.
 */
function readKeySource(
  provider: AiProviderInfo,
): { key: string; source: "env" | "file" } | null {
  const fromFile = readEnvValue(provider.envVar);
  if (fromFile) return { key: fromFile, source: "file" };

  const fromEnv = process.env[provider.envVar]?.trim();
  if (fromEnv) return { key: fromEnv, source: "env" };

  return null;
}

function readKey(provider: AiProviderInfo): string | null {
  return readKeySource(provider)?.key ?? null;
}

/**
 * Where a provider's key comes from, without revealing it. Settings needs this
 * to know whether it is allowed to edit the key or must defer to the
 * environment.
 */
export function keySourceFor(
  provider: AiProviderInfo,
): "env" | "file" | null {
  return readKeySource(provider)?.source ?? null;
}



/**
 * What is available right now. A level above local with no key in the
 * environment reports as degraded and behaves exactly like local, so a missing
 * key is a quiet fallback rather than a broken app.
 */
export function getAiCapabilities(): AiCapabilities {
  const row = db()
    .prepare("SELECT ai_level, ai_provider FROM profile WHERE id = 1")
    .get() as { ai_level: AiLevel; ai_provider: string } | undefined;

  const chosen: AiLevel = row?.ai_level ?? "local";
  const provider = row?.ai_provider ? providerById(row.ai_provider) : null;
  const found = provider ? readKeySource(provider) : null;
  const hasKey = found !== null;
  const degraded = chosen !== "local" && !hasKey;

  return {
    level: degraded ? "local" : chosen,
    chosen,
    provider,
    hasKey,
    keySource: found?.source ?? null,
    extraValue: provider ? readExtra(provider) : null,
    model: provider ? readModel(provider) : null,
    degraded,
  };
}

/** Whether a feature needing `need` can run. */
export function canUseAi(need: AiRequirement): boolean {
  const { level } = getAiCapabilities();
  if (level === "full") return true;
  return need === "assisted" && level === "assisted";
}

export interface AiClient {
  provider: AiProviderInfo;
  /**
   * A request to the provider with the key already attached. The key is not
   * returned anywhere, so a caller cannot route it somewhere else.
   */
  fetch: (url: string, init?: RequestInit) => Promise<Response>;
  /**
   * One prompt in, the model's text out. Providers disagree about request and
   * response shape and about nothing else that matters here, so that
   * disagreement is settled once rather than in every feature.
   *
   * Throws on a transport error or a non-2xx reply. Callers are expected to
   * catch and fall back — no feature should break because a provider is
   * having a bad afternoon.
   */
  complete: (prompt: string, opts?: { maxTokens?: number }) => Promise<string>;
}

/** The small models these features are sized for. Cheap enough for a free tier. */
function buildRequest(
  provider: AiProviderInfo,
  prompt: string,
  maxTokens: number,
): { url: string; body: string } {
  return {
    url: provider.endpoint,
    body: JSON.stringify({
      model: readModel(provider),
      [provider.maxTokensParam]: maxTokens,
      messages: [{ role: "user", content: prompt }],
    }),
  };
}

/**
 * What the provider said went wrong.
 *
 * An earlier version reported only the status code, on the theory that a body
 * might echo the request. It does not echo the key — providers return a
 * description, and withholding it made a wrong model id look like an
 * unexplained 400. The message is what turns a failure into a fix, so it is
 * passed through, trimmed.
 */
async function explain(response: Response): Promise<string> {
  try {
    const body = (await response.json()) as Record<string, unknown>;
    const error = body.error as { message?: string } | undefined;
    const message = error?.message ?? (body.message as string | undefined);
    if (typeof message === "string" && message.trim()) {
      return message.trim().slice(0, 300);
    }
  } catch {
    // Not JSON, or already consumed — the status alone will have to do.
  }
  return response.statusText || "No explanation was given.";
}

function readReply(provider: AiProviderInfo, payload: unknown): string {
  const data = payload as Record<string, unknown>;
  if (provider.wire === "anthropic") {
    const content = data.content as Array<{ type: string; text?: string }> | undefined;
    return (content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("");
  }
  const choices = data.choices as Array<{ message?: { content?: string } }> | undefined;
  return choices?.[0]?.message?.content ?? "";
}

/**
 * A client, or null when the level does not permit one. Callers must handle
 * null — that is the fallback path, and at local level it is the only path.
 */
export function getAiClient(need: AiRequirement): AiClient | null {
  if (!canUseAi(need)) return null;

  const { provider } = getAiCapabilities();
  if (!provider) return null;

  const key = readKey(provider);
  if (!key) return null;

  const auth = AUTH_HEADERS[provider.id];
  if (!auth) return null;

  const extra = readExtra(provider);

  const send: AiClient["fetch"] = (url, init) =>
    fetch(url, {
      ...init,
      headers: {
        "content-type": "application/json",
        ...auth(key, extra),
        ...(init?.headers ?? {}),
      },
    });

  return {
    provider,
    fetch: send,
    async complete(prompt, opts) {
      const { url, body } = buildRequest(provider, prompt, opts?.maxTokens ?? 16000);
      const response = await send(url, { method: "POST", body });
      if (!response.ok) {
        throw new Error(
          `${provider.label} returned ${response.status}. ${await explain(response)}`,
        );
      }
      return readReply(provider, await response.json());
    },
  };
}
