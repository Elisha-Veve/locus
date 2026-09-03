import { notFound } from "next/navigation";
import { CvDocument } from "@/components/CvDocument";
import { cvStyles } from "@/lib/cvStyles";
import { getRenderDoc } from "@/lib/queries";

export const dynamic = "force-dynamic";

/**
 * The print target. Nothing but the document itself at true A4 size — this is
 * the page Puppeteer turns into the PDF, and it is also viewable directly if
 * you want to inspect the exact output in a browser.
 */
export default async function PrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = getRenderDoc(Number(id));
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
