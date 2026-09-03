import { notFound } from "next/navigation";
import { CvDocument } from "@/components/CvDocument";
import { cvStyles } from "@/lib/cvStyles";
import { readExportDoc } from "@/lib/exports";

export const dynamic = "force-dynamic";

/**
 * An archived version, rendered from its own snapshot rather than from the
 * current library — this is what that PDF actually said.
 */
export default async function ExportPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = readExportDoc(Number(id));
  if (!doc) notFound();

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `@page { size: A4; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
${cvStyles}`,
        }}
      />
      <CvDocument doc={doc} />
    </>
  );
}
