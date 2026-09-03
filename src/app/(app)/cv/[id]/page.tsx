import Link from "next/link";
import { notFound } from "next/navigation";
import { listExports } from "@/lib/exports";
import { getBuilderCv } from "@/lib/queries";
import { Builder } from "./builder-client";

export const dynamic = "force-dynamic";

export default async function CvPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const builder = getBuilderCv(Number(id));
  if (!builder) notFound();

  const empty =
    builder.sections.length === 0 ||
    builder.sections.every(
      (s) => s.entries.length === 0 && s.skillGroups.length === 0,
    );

  if (empty) {
    return (
      <main className="mx-auto max-w-[640px] px-6 py-20 text-center">
        <h1 className="text-[20px] font-semibold">Your library is empty</h1>
        <p className="mt-2 muted">
          Add some experiences before building a CV from them.
        </p>
        <Link href="/library" className="btn btn-primary mt-5">
          Go to library
        </Link>
      </main>
    );
  }

  return <Builder initial={builder} initialExports={listExports(Number(id))} />;
}
