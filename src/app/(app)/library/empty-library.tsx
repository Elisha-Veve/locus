"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useSampleLibrary } from "@/lib/actions";

/**
 * What a new library offers instead of filling itself in.
 *
 * Locus used to seed the sample on first load, so an empty database quietly
 * became someone else's invented career and the first task was deleting it.
 * Both routes in are now a choice: read a CV you already have, or take the
 * sample deliberately because you want something to click.
 */
export function EmptyLibrary() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const useSample = () =>
    startTransition(async () => {
      setError(null);
      try {
        await useSampleLibrary();
        router.refresh();
      } catch (cause) {
        setError(
          cause instanceof Error ? cause.message : "That did not work.",
        );
      }
    });

  return (
    <div className="mb-8">
      <p className="muted">
        Nothing on file yet. The library holds every experience, bullet and
        skill you have; each CV is then a selection from it, so a wording fix
        here reaches every CV that used it.
      </p>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <section className="card p-5 grid gap-3">
          <h2 className="text-[15px] font-medium">Read a CV you already have</h2>
          <p className="text-[12.5px] muted">
            Paste one or choose a PDF. Locus turns it into sections, records and
            bullets for you to check — nothing is saved until you say so.
          </p>
          <Link href="/library/import" className="btn justify-self-start">
            Read a CV
          </Link>
        </section>

        <section className="card p-5 grid gap-3">
          <h2 className="text-[15px] font-medium">Start with sample data</h2>
          <p className="text-[12.5px] muted">
            A fictional CV to click around before committing anything of your
            own. Delete it whenever you like.
          </p>
          <button
            type="button"
            className="btn justify-self-start"
            disabled={pending}
            onClick={useSample}
          >
            {pending ? "Adding…" : "Use the sample"}
          </button>
        </section>
      </div>

      <p className="mt-5 text-[12.5px] muted">
        Or start from nothing — add a section below and fill it in by hand.
      </p>

      {error && <p className="mt-3 text-[12.5px] font-medium">{error}</p>}
    </div>
  );
}
