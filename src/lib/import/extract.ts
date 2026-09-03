import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { promisify } from "node:util";

const run = promisify(execFile);

/**
 * Get text out of an uploaded CV.
 *
 * PDF goes through `pdftotext -layout` when poppler is installed. That is a
 * system dependency rather than an npm one, so it is treated as a convenience:
 * when it is missing we say so plainly and point at pasting the text, which
 * needs nothing and works everywhere. Adding a JavaScript PDF engine to the
 * bundle to save one paste is not a trade worth making yet.
 *
 * Server-side only.
 */

export interface ExtractResult {
  text: string;
  /** Told to the person when extraction could not be done for them. */
  problem?: string;
}

async function havePdftotext(): Promise<boolean> {
  try {
    await run("pdftotext", ["-v"]);
    return true;
  } catch {
    return false;
  }
}

export async function extractText(
  file: { name: string; type: string; bytes: Buffer },
): Promise<ExtractResult> {
  const isPdf =
    file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");

  if (!isPdf) {
    // Anything else is treated as text. A .docx arrives as a zip and will look
    // like noise, which the message below explains rather than hides.
    const text = file.bytes.toString("utf8");
    const printable = text.replace(/[^\x20-\x7E\s]/g, "").length / (text.length || 1);
    if (printable < 0.8) {
      return {
        text: "",
        problem:
          "That file is not plain text or a PDF. Open it, copy the text, and paste it below.",
      };
    }
    return { text };
  }

  if (!(await havePdftotext())) {
    return {
      text: "",
      problem:
        "Reading PDFs needs `pdftotext`, which is not installed (it comes with poppler: `brew install poppler`, or `apt install poppler-utils`). Until then, open the PDF, copy the text, and paste it below.",
    };
  }

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "locus-import-"));
  const pdfPath = path.join(dir, "cv.pdf");
  try {
    fs.writeFileSync(pdfPath, file.bytes);
    // -layout keeps columns and date alignment, which the parser reads.
    const { stdout } = await run("pdftotext", ["-layout", pdfPath, "-"], {
      maxBuffer: 8 * 1024 * 1024,
    });
    if (!stdout.trim()) {
      return {
        text: "",
        problem:
          "No text came out of that PDF. It is probably a scan — an image of a page rather than text. Paste the text below instead.",
      };
    }
    return { text: stdout };
  } catch {
    return {
      text: "",
      problem: "That PDF could not be read. Paste the text below instead.",
    };
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}
