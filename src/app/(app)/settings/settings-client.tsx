"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { saveAiExtra, saveAiKey, saveAiSettings } from "@/lib/actions";
import type { AiCapabilities, AiLevel, AiProviderInfo } from "@/lib/types";

export function AiSettings({
  capabilities,
  levels,
  providers,
}: {
  capabilities: AiCapabilities;
  levels: Array<{ id: AiLevel; label: string; blurb: string }>;
  providers: AiProviderInfo[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [keyDraft, setKeyDraft] = useState("");
  const [extraDraft, setExtraDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Whether a key is present is decided outside the browser, so re-read from
  // the server after every change rather than guessing here.
  const save = (patch: { level?: AiLevel; provider?: string }) =>
    startTransition(async () => {
      setError(null);
      await saveAiSettings(patch);
      router.refresh();
    });

  const submitKey = (value: string | null) =>
    startTransition(async () => {
      setError(null);
      try {
        await saveAiKey(capabilities.provider!.id, value);
        setKeyDraft("");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save that key.");
      }
    });

  const submitExtra = (value: string | null) =>
    startTransition(async () => {
      setError(null);
      try {
        await saveAiExtra(capabilities.provider!.id, value);
        setExtraDraft("");
        router.refresh();
      } catch (cause) {
        setError(cause instanceof Error ? cause.message : "Could not save that.");
      }
    });

  const needsProvider = capabilities.chosen !== "local";
  // One change at a time. Without this, two quick clicks race and the write
  // that lands last wins rather than the one chosen last.
  const busy = pending;

  return (
    <div className={`grid gap-5 ${busy ? "opacity-60" : ""}`} aria-busy={busy}>
      <section className="card p-5">
        <h2 className="eyebrow mb-3">Level</h2>
        <fieldset disabled={busy} className="grid gap-2 border-0 p-0 m-0">
          {levels.map((level) => (
            <label
              key={level.id}
              className={`flex gap-3 rounded-md border border-[var(--color-line)] p-3 ${
                busy ? "cursor-not-allowed" : "cursor-pointer"
              }`}
            >
              <input
                type="radio"
                name="ai-level"
                className="mt-1"
                checked={capabilities.chosen === level.id}
                onChange={() => save({ level: level.id })}
              />
              <span className="grid gap-1">
                <span className="text-[13.5px] font-medium">{level.label}</span>
                <span className="text-[12.5px] muted">{level.blurb}</span>
              </span>
            </label>
          ))}
        </fieldset>
      </section>

      {needsProvider && (
        <section className="card p-5">
          <h2 className="eyebrow mb-3">Provider</h2>
          <label className="grid gap-1.5">
            <span className="text-[12.5px] muted">Which service to call</span>
            <select
              className="field"
              disabled={busy}
              value={capabilities.provider?.id ?? ""}
              onChange={(event) => save({ provider: event.target.value })}
            >
              <option value="">Choose a provider…</option>
              {providers.map((provider) => (
                <option key={provider.id} value={provider.id}>
                  {provider.label}
                </option>
              ))}
            </select>
          </label>

          <p className="mt-2 text-[12.5px] muted">
            Get a key:{" "}
            {providers.map((provider, index) => (
              <span key={provider.id}>
                {index > 0 && " · "}
                <a
                  className="underline"
                  href={provider.keysUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  {provider.label}
                </a>
              </span>
            ))}
          </p>

          {capabilities.provider && (
            <div className="mt-4 grid gap-3">
              {capabilities.hasKey ? (
                <>
                  <p className="text-[12.5px]">
                    <span className="font-medium">Key found.</span>{" "}
                    <span className="muted">
                      {capabilities.keySource === "env"
                        ? `Set in the environment as ${capabilities.provider.envVar}.`
                        : "Saved in .env.local."}
                    </span>
                  </p>
                  {capabilities.keySource === "file" ? (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={() => submitKey(null)}
                      >
                        Remove key
                      </button>
                    </div>
                  ) : (
                    <p className="text-[12.5px] muted">
                      Change or remove it where you set it. Settings does not
                      edit the environment.
                    </p>
                  )}
                </>
              ) : (
                <>
                  <p className="text-[12.5px]">
                    <span className="font-medium">No key found.</span>
                  </p>
                  <label className="grid gap-1.5">
                    <span className="text-[12.5px] muted">
                      Paste a key to save it to{" "}
                      <code className="rounded bg-[var(--color-surface-2)] px-1">
                        .env.local
                      </code>
                      , or set{" "}
                      <code className="rounded bg-[var(--color-surface-2)] px-1">
                        {capabilities.provider.envVar}
                      </code>{" "}
                      yourself and reload.
                    </span>
                    <div className="flex gap-2">
                      <input
                        type="password"
                        className="field flex-1"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder={`${capabilities.provider.envVar}=…`}
                        value={keyDraft}
                        disabled={busy}
                        onChange={(event) => setKeyDraft(event.target.value)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter" && keyDraft.trim()) {
                            submitKey(keyDraft);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="btn"
                        disabled={busy || !keyDraft.trim()}
                        onClick={() => submitKey(keyDraft)}
                      >
                        Save key
                      </button>
                    </div>
                  </label>
                </>
              )}

              {capabilities.provider.extra && (
                <div className="grid gap-1.5 border-t border-[var(--color-line)] pt-3">
                  <span className="text-[12.5px]">
                    <span className="font-medium">
                      {capabilities.provider.extra.label}
                    </span>{" "}
                    <span className="muted">
                      {capabilities.hasExtra ? "— set." : "— not set."}
                    </span>
                  </span>
                  <span className="text-[12.5px] muted">
                    {capabilities.provider.extra.hint}
                  </span>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      className="field flex-1"
                      autoComplete="off"
                      spellCheck={false}
                      placeholder={capabilities.provider.extra.envVar}
                      value={extraDraft}
                      disabled={busy}
                      onChange={(event) => setExtraDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter" && extraDraft.trim()) {
                          submitExtra(extraDraft);
                        }
                      }}
                    />
                    <button
                      type="button"
                      className="btn"
                      disabled={busy || !extraDraft.trim()}
                      onClick={() => submitExtra(extraDraft)}
                    >
                      Save
                    </button>
                    {capabilities.hasExtra && (
                      <button
                        type="button"
                        className="btn"
                        disabled={busy}
                        onClick={() => submitExtra(null)}
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              )}

              {error && (
                <p className="text-[12.5px] font-medium">{error}</p>
              )}

              <p className="text-[12.5px] muted">
                Keys are kept in .env.local, which is gitignored, and never
                written to the database — so backing up or exporting your data
                never carries a secret with it. A saved key is never shown
                again.
              </p>
            </div>
          )}
        </section>
      )}

      <section className="card p-5">
        <h2 className="eyebrow mb-3">In force</h2>
        <p className="text-[13.5px]">
          {capabilities.level === "local"
            ? "Local — no network calls."
            : `${capabilities.level === "full" ? "Full" : "Assisted"} — calls ${capabilities.provider?.label ?? "a provider"}.`}
        </p>
        {capabilities.degraded && (
          <p className="mt-2 text-[12.5px] muted">
            You chose {capabilities.chosen}, but no key was found, so Locus is
            running locally. Nothing is broken — features that would have used a
            key are using their offline path instead.
          </p>
        )}
      </section>
    </div>
  );
}
