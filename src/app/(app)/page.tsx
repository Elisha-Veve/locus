import Link from "next/link";
import { countExports } from "@/lib/exports";
import { getLibrary, listCvs } from "@/lib/queries";
import { CvListActions, NewCvForm } from "./cv-list-client";

export const dynamic = "force-dynamic";

export default function Home() {
  const cvs = listCvs();
  const library = getLibrary();

  const recordCount = library.sections.reduce(
    (total, s) =>
      total +
      s.entries.length +
      s.entries.reduce((n, e) => n + e.bullets.length, 0) +
      s.skillGroups.reduce((n, g) => n + g.skills.length, 0),
    0,
  );

  return (
    <main className="mx-auto max-w-[1000px] px-6 py-10">
      <div className="mb-8 flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight">Your CVs</h1>
          <p className="mt-1 muted">
            One tailored CV per application, built from{" "}
            <Link href="/library" className="text-accent underline underline-offset-2">
              {recordCount} records
            </Link>{" "}
            in your library.
          </p>
        </div>
        <NewCvForm />
      </div>

      {cvs.length === 0 ? (
        <div className="card px-6 py-14 text-center">
          <p className="font-medium">No CVs yet</p>
          <p className="mt-1 muted">
            Create one above, then pick which experiences it should carry.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {cvs.map((cv) => (
            <li key={cv.id} className="card flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <Link
                  href={`/cv/${cv.id}`}
                  className="block truncate text-[15px] font-medium hover:text-accent"
                >
                  {cv.name}
                </Link>
                <p className="mt-0.5 truncate text-[13px] muted">
                  {[cv.role, cv.company].filter(Boolean).join(" · ") || "No role set"}
                  <span className="mx-2 text-line">|</span>
                  edited {formatWhen(cv.updated_at)}
                  <span className="mx-2 text-line">|</span>
                  {exportLabel(countExports(cv.id))}
                </p>
              </div>
              <CvListActions cvId={cv.id} cvName={cv.name} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

function exportLabel(count: number): string {
  if (count === 0) return "never exported";
  return `${count} ${count === 1 ? "version" : "versions"} saved`;
}

function formatWhen(sqlDate: string): string {
  const date = new Date(sqlDate.replace(" ", "T") + "Z");
  if (Number.isNaN(date.getTime())) return sqlDate;
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000);
  if (days === 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return date.toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
