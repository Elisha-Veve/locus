"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { saveAiSettings } from "@/lib/actions";
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

  // Whether a key is present is decided by the environment, so re-read from
  // the server after every change rather than guessing here.
  const save = (patch: { level?: AiLevel; provider?: string }) =>
    startTransition(async () => {
      await saveAiSettings(patch);
      router.refresh();
    });

  const needsProvider = capabilities.chosen !== "local";

  return (
    <div className="grid gap-5" aria-busy={pending}>
      <section className="card p-5">
        <h2 className="eyebrow mb-3">Level</h2>
        <div className="grid gap-2">
          {levels.map((level) => (
            <label
              key={level.id}
              className="flex cursor-pointer gap-3 rounded-md border border-[var(--color-line)] p-3"
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
        </div>
      </section>

      {needsProvider && (
        <section className="card p-5">
          <h2 className="eyebrow mb-3">Provider</h2>
          <label className="grid gap-1.5">
            <span className="text-[12.5px] muted">Which service to call</span>
            <select
              className="field"
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

          {capabilities.provider && (
            <div className="mt-4 grid gap-2">
              <p className="text-[12.5px]">
                {capabilities.hasKey ? (
                  <span className="font-medium">Key found. Ready to use.</span>
                ) : (
                  <span className="font-medium">No key found.</span>
                )}
              </p>
              {!capabilities.hasKey && (
                <p className="text-[12.5px] muted">
                  Put your key in{" "}
                  <code className="rounded bg-[var(--color-surface-2)] px-1">
                    .env.local
                  </code>{" "}
                  as{" "}
                  <code className="rounded bg-[var(--color-surface-2)] px-1">
                    {capabilities.provider.envVar}=…
                  </code>{" "}
                  and restart the app.{" "}
                  <a
                    className="underline"
                    href={capabilities.provider.keysUrl}
                    target="_blank"
                    rel="noreferrer noopener"
                  >
                    Get a key
                  </a>
                  .
                </p>
              )}
              <p className="text-[12.5px] muted">
                Keys are read from the environment and never written to the
                database, so backing up your data never backs up a secret.
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
