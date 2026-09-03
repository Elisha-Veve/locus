import Link from "next/link";
import { getLibrary } from "@/lib/queries";
import { seedIfEmpty } from "@/lib/seed";
import { LibraryEditor } from "./library-client";

export const dynamic = "force-dynamic";

export default function LibraryPage() {
  seedIfEmpty();
  const library = getLibrary();

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-10">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Library</h1>
          <p className="mt-1 muted">
            Every experience, bullet and skill you have on file. Edit here once;
            each CV then picks from this.
          </p>
        </div>
        <Link href="/library/import" className="btn whitespace-nowrap">
          Read a CV
        </Link>
      </div>
      <LibraryEditor library={library} />
    </main>
  );
}
