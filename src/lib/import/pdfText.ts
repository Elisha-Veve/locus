import { getDocumentProxy } from "unpdf";

/**
 * Get text out of a PDF, with its line structure intact.
 *
 * This used to shell out to `pdftotext`, which meant PDF reading only worked
 * for people who had installed poppler — a system dependency, not an npm one,
 * and one most people do not have. `unpdf` bundles a PDF engine with no native
 * parts, so this now works everywhere on `npm install` alone.
 *
 * The catch is that a plain text extraction throws away vertical space, and
 * vertical space is exactly what the parser reads: records are separated by
 * blank lines. So rather than take the flattened text, this works from the
 * positioned text items and rebuilds the layout — items grouped into lines by
 * their y, a blank line wherever the gap between two lines is markedly bigger
 * than the usual one, and wide horizontal gaps preserved as runs of spaces so
 * "Employer            Role" still splits into columns.
 *
 * Server-side only.
 */

interface Positioned {
  str: string;
  x: number;
  y: number;
}

/** Two items belong to the same line if their baselines are this close. */
const SAME_LINE = 2.5;
/** A horizontal gap this many times the character width reads as a column. */
const COLUMN_GAP = 2.2;
/** A vertical gap this much bigger than usual reads as a blank line. */
const PARAGRAPH_GAP = 1.6;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

/** Group items sharing a baseline, in reading order. */
function toLines(items: Positioned[]): Array<{ y: number; text: string }> {
  const kept = items.filter((i) => i.str.trim() !== "");
  if (kept.length === 0) return [];

  kept.sort((a, b) => (Math.abs(a.y - b.y) <= SAME_LINE ? a.x - b.x : b.y - a.y));

  const lines: Array<{ y: number; parts: Positioned[] }> = [];
  for (const item of kept) {
    const line = lines[lines.length - 1];
    if (line && Math.abs(line.y - item.y) <= SAME_LINE) line.parts.push(item);
    else lines.push({ y: item.y, parts: [item] });
  }

  // A wide gap between two pieces on one line is a column boundary, not a
  // space. Two spaces is what the parser reads as a split.
  const widths = kept.map((i) => i.str.length).filter((n) => n > 0);
  const charWidth = median(widths) > 0 ? 6 : 6;

  return lines.map(({ y, parts }) => {
    let text = "";
    let cursor: number | null = null;
    for (const part of parts) {
      if (cursor !== null) {
        const gap = part.x - cursor;
        text += gap > charWidth * COLUMN_GAP ? "   " : gap > 1 ? " " : "";
      }
      text += part.str;
      cursor = part.x + part.str.length * charWidth;
    }
    return { y, text: text.replace(/\s+$/, "") };
  });
}

/** Put the blank lines back, using the usual line spacing as the yardstick. */
function withBlankLines(lines: Array<{ y: number; text: string }>): string[] {
  if (lines.length <= 1) return lines.map((l) => l.text);

  const gaps: number[] = [];
  for (let i = 1; i < lines.length; i += 1) gaps.push(lines[i - 1].y - lines[i].y);
  const usual = median(gaps.filter((g) => g > 0));

  const out: string[] = [lines[0].text];
  for (let i = 1; i < lines.length; i += 1) {
    const gap = lines[i - 1].y - lines[i].y;
    if (usual > 0 && gap > usual * PARAGRAPH_GAP) out.push("");
    out.push(lines[i].text);
  }
  return out;
}

export async function pdfToText(bytes: Uint8Array): Promise<string> {
  const pdf = await getDocumentProxy(bytes);
  const pages: string[] = [];

  for (let n = 1; n <= pdf.numPages; n += 1) {
    const page = await pdf.getPage(n);
    const content = await page.getTextContent();

    const items: Positioned[] = [];
    for (const raw of content.items) {
      const item = raw as { str?: string; transform?: number[] };
      if (typeof item.str !== "string" || !item.transform) continue;
      items.push({ str: item.str, x: item.transform[4], y: item.transform[5] });
    }

    const text = withBlankLines(toLines(items)).join("\n");
    if (text.trim()) pages.push(text);
  }

  // A page break is a break between records as surely as a blank line is.
  return pages.join("\n\n");
}
