import puppeteer, { type Browser } from "puppeteer";

let browserPromise: Promise<Browser> | null = null;

/** One warm browser for the whole session — a cold launch per export is slow. */
async function getBrowser(): Promise<Browser> {
  if (!browserPromise) {
    browserPromise = puppeteer.launch({
      headless: true,
      args: ["--no-sandbox", "--font-render-hinting=none"],
    });
  }
  const browser = await browserPromise;
  if (!browser.connected) {
    browserPromise = null;
    return getBrowser();
  }
  return browser;
}

/**
 * Print /print/<cvId> to A4. Going through the real page means the PDF comes
 * from the same React component and stylesheet as the on-screen preview, so
 * the two cannot drift apart.
 */
export interface RenderedPdf {
  pdf: Uint8Array;
  pageCount: number;
}

export async function renderCvPdf(
  origin: string,
  cvId: number,
): Promise<RenderedPdf> {
  const browser = await getBrowser();
  const page = await browser.newPage();
  try {
    const response = await page.goto(`${origin}/print/${cvId}`, {
      waitUntil: "networkidle0",
      timeout: 30_000,
    });
    if (!response || !response.ok()) {
      throw new Error(
        `Print page returned ${response ? response.status() : "no response"}`,
      );
    }
    // A missing webfont silently falls back to a substitute and the PDF comes
    // out looking wrong but plausible, so fail loudly instead. Which family to
    // check depends on the document style, so ask the page what it resolved to
    // rather than hardcoding one.
    const fonts = await page.evaluate(async () => {
      const doc = document.querySelector(".cv-page");
      if (!doc) return { family: "", ok: false, pageCount: 1 };

      const family = getComputedStyle(doc)
        .fontFamily.split(",")[0]
        .replace(/["']/g, "")
        .trim();
      const faces = [`12pt "${family}"`, `italic 12pt "${family}"`, `700 12pt "${family}"`];

      // load() first: a face the page never paints is not fetched on its own,
      // and check() would report it missing.
      await Promise.all(faces.map((face) => document.fonts.load(face)));
      await document.fonts.ready;

      const A4_HEIGHT_PX = 841.89 * (96 / 72);
      return {
        family,
        ok: faces.every((face) => document.fonts.check(face)),
        pageCount: Math.max(1, Math.ceil((doc.scrollHeight - 1) / A4_HEIGHT_PX)),
      };
    });
    const { pageCount } = fonts;
    if (!fonts.ok) {
      throw new Error(
        `The document font (${fonts.family || "unknown"}) did not load on the ` +
          "print page, so the PDF would fall back to a substitute. Try " +
          "restarting the dev server.",
      );
    }

    const pdf = await page.pdf({
      format: "a4",
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: "0", right: "0", bottom: "0", left: "0" },
    });
    return { pdf, pageCount };
  } finally {
    await page.close();
  }
}
