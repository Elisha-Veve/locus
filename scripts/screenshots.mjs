/**
 * Regenerates the screenshots in docs/screenshots.
 *
 * Point it at the demo server so the images never contain real data:
 *
 *   npm run dev:demo          # terminal 1 — seeds data/demo.db with the sample
 *   node scripts/screenshots.mjs
 *
 * Override the target with BASE_URL if you are running somewhere else.
 */
import fs from "node:fs";
import path from "node:path";
import puppeteer from "puppeteer";

const BASE = process.env.BASE_URL ?? "http://localhost:3211";
const OUT = path.join(process.cwd(), "docs", "screenshots");
const CV_ID = process.env.CV_ID ?? "1";

const STYLES = ["classic", "ledger", "quiet", "margin", "modern", "open", "slate"];

fs.mkdirSync(OUT, { recursive: true });

const browser = await puppeteer.launch({ headless: true, args: ["--no-sandbox"] });

async function shot(name, url, { scale = 1.5, width = 1440, height = 900, prepare } = {}) {
  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: scale });
  await page.goto(`${BASE}${url}`, { waitUntil: "networkidle0", timeout: 60_000 });
  await page.evaluate(async () => {
    // the dev-server overlay badge is not part of the app
    const hide = document.createElement("style");
    hide.textContent = "nextjs-portal{display:none!important}";
    document.head.appendChild(hide);
    await document.fonts.ready;
  });
  if (prepare) await prepare(page);
  await page.screenshot({ path: path.join(OUT, `${name}.png`) });
  await page.close();
  console.log(`  ${name}.png`);
}

/** Just the A4 document, for showing off a style. */
async function styleShot(style) {
  const page = await browser.newPage();
  await page.setViewport({ width: 900, height: 1200, deviceScaleFactor: 1.5 });
  await page.goto(`${BASE}/print/${CV_ID}`, { waitUntil: "networkidle0" });
  await page.evaluate(async (s) => {
    document.querySelector(".cv-page").dataset.style = s;
    await document.fonts.ready;
  }, style);
  const el = await page.$(".cv-page");
  await el.screenshot({ path: path.join(OUT, `style-${style}.png`) });
  await page.close();
  console.log(`  style-${style}.png`);
}

console.log("Capturing UI…");
await shot("builder", `/cv/${CV_ID}`);
await shot("library", "/library");
await shot("cvs", "/", { height: 620 });
await shot("versions", `/cv/${CV_ID}`, {
  prepare: async (page) => {
    await page.evaluate(() => {
      [...document.querySelectorAll("button")]
        .find((b) => /^Versions \(/.test(b.textContent))
        ?.click();
    });
    await new Promise((r) => setTimeout(r, 600));
  },
});
await shot("themes", "/", {
  height: 620,
  prepare: async (page) => {
    await page.evaluate(() => {
      document.querySelector('button[aria-haspopup="menu"]')?.click();
    });
    await new Promise((r) => setTimeout(r, 400));
  },
});

console.log("Capturing document styles…");
for (const style of STYLES) await styleShot(style);

await browser.close();
console.log(`\nWrote ${STYLES.length + 5} images to docs/screenshots/`);
