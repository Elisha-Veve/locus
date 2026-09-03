import { AI_LEVELS, AI_PROVIDERS, getAiCapabilities } from "@/lib/ai";
import { AiSettings } from "./settings-client";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  // Read on the server: whether a key exists is an environment question, and
  // the answer must not require shipping anything secret to the browser.
  const capabilities = getAiCapabilities();

  return (
    <main className="mx-auto max-w-[760px] px-6 py-10">
      <div className="mb-8">
        <h1 className="text-[26px] font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 muted">
          How much Locus is allowed to reach out. Everything works without this;
          the default makes no network calls at all.{" "}
          <a
            className="underline"
            href="https://github.com/Elisha-Veve/locus/blob/main/docs/providers.md"
            target="_blank"
            rel="noreferrer noopener"
          >
            Which provider should I use?
          </a>
        </p>
      </div>
      <AiSettings
        capabilities={capabilities}
        levels={AI_LEVELS}
        providers={AI_PROVIDERS}
      />
    </main>
  );
}
