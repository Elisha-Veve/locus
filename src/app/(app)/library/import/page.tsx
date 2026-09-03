import Link from "next/link";
import { getAiCapabilities } from "@/lib/ai";
import { ImportClient } from "./import-client";

export const dynamic = "force-dynamic";

export default function ImportPage() {
  // Read on the server: whether a key exists is an environment question.
  const capabilities = getAiCapabilities();

  return (
    <main className="mx-auto max-w-[900px] px-6 py-10">
      <div className="mb-8">
        <Link href="/library" className="text-[12.5px] muted underline">
          ← Library
        </Link>
        <h1 className="mt-2 text-[26px] font-semibold tracking-tight">
          Read a CV into the library
        </h1>
        <p className="mt-1 muted">
          Paste a CV or choose a file. Nothing is added until you have looked
          at what it found and said so.
        </p>
      </div>

      <ImportClient level={capabilities.level} provider={capabilities.provider?.label ?? null} />
    </main>
  );
}
