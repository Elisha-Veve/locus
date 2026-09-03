import { NextResponse } from "next/server";
import { readExportFile } from "@/lib/exports";

/** Re-download an archived version, byte for byte as it was first exported. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const stored = readExportFile(Number(id));
  if (!stored) {
    return NextResponse.json(
      { error: "That export is no longer on disk" },
      { status: 404 },
    );
  }

  return new NextResponse(Buffer.from(stored.bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${stored.fileName}"`,
      "Cache-Control": "no-store",
    },
  });
}
