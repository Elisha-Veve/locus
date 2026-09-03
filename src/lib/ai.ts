import { db } from "./db";
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
  },
  {
    id: "openai",
    label: "OpenAI",
    envVar: "LOCUS_AI_OPENAI",
    keysUrl: "https://platform.openai.com/api-keys",
  },
];

/** Auth is provider-specific and stays in this module with the key. */
const AUTH_HEADERS: Record<string, (key: string) => Record<string, string>> = {
  anthropic: (key) => ({
    "x-api-key": key,
    "anthropic-version": "2023-06-01",
  }),
  openai: (key) => ({ authorization: `Bearer ${key}` }),
};

export function providerById(id: string): AiProviderInfo | null {
  return AI_PROVIDERS.find((p) => p.id === id) ?? null;
}

function readKey(provider: AiProviderInfo): string | null {
  const value = process.env[provider.envVar]?.trim();
  return value ? value : null;
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
  const hasKey = provider ? readKey(provider) !== null : false;
  const degraded = chosen !== "local" && !hasKey;

  return {
    level: degraded ? "local" : chosen,
    chosen,
    provider,
    hasKey,
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

  return {
    provider,
    fetch: (url, init) =>
      fetch(url, {
        ...init,
        headers: {
          "content-type": "application/json",
          ...auth(key),
          ...(init?.headers ?? {}),
        },
      }),
  };
}
