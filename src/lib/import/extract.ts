import { pdfToText } from "./pdfText.ts";

/**
 * Get text out of an uploaded CV.
 *
 * PDF reading is bundled — `npm install` is the whole setup. It used to shell
 * out to `pdftotext`, which is a system dependency most people do not have, so
 * the feature quietly did not work for them. There is now one code path rather
 * than two, which also means a parse that goes wrong goes wrong the same way
 * for everyone rather than depending on what is installed.
 *
 * Server-side only.
 */

export interface ExtractResult {
  text: string;
  /** Told to the person when extraction could not be done for them. */
  problem?: string;
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

  try {
    const text = await pdfToText(new Uint8Array(file.bytes));
    if (!text.trim()) {
      return {
        text: "",
        problem:
          "No text came out of that PDF. It is probably a scan — an image of a page rather than text — which has no text to read. Paste the text below instead.",
      };
    }
    return { text };
  } catch (cause) {
    // Say what actually failed. Swallowing this turned a bad file into an
    // unexplained "could not be read", which is not something anyone can act on.
    const why = cause instanceof Error ? cause.message : String(cause);
    return {
      text: "",
      problem: `That PDF could not be read (${why.slice(0, 200)}). Paste the text below instead.`,
    };
  }
}
