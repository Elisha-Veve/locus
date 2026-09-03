import { NextResponse } from "next/server";
import { getCv, getRenderDoc } from "@/lib/queries";
import { renderCvPdf } from "@/lib/pdf";
import { recordExport } from "@/lib/exports";

function fileName(cvName: string, personName: string): string {
  const base = [personName, cvName].filter(Boolean).join(" - ") || "CV";
  return `${base.replace(/[^\w\s.-]/g, "").replace(/\s+/g, " ").trim()}.pdf`;
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const cvId = Number(id);
  const cv = getCv(cvId);
  const doc = getRenderDoc(cvId);
  if (!cv || !doc) {
    return NextResponse.json({ error: "CV not found" }, { status: 404 });
  }

  const { origin } = new URL(request.url);
  const { pdf, pageCount } = await renderCvPdf(origin, cvId);
  const name = fileName(cv.name, doc.profile.full_name);

  // Keep a copy of every version that leaves the app, along with a snapshot of
  // what it said — the library moves on, the archive should not.
  const saved = recordExport({
    cvId,
    cvName: cv.name,
    company: cv.company,
    role: cv.role,
    fileName: name,
    pdf,
    pageCount,
    doc,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
      // Lets the builder refresh its version list without a second request.
      "X-Locus-Export-Id": String(saved.id),
    },
  });
}
