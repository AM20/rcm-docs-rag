import { Stagehand } from "@browserbasehq/stagehand";
import StagehandConfig from "../stagehand.config.js";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";

/* ─────────────────────────  MAIN  ───────────────────────── */

async function main() {
  /* 0. launch Stagehand → gives us a Playwright Page */
  const stagehand = new Stagehand({ ...StagehandConfig });
  await stagehand.init();
  const page = stagehand.page;

  /* 1. open the Medicare Coverage Database */
  await page.goto("https://www.cms.gov/medicare-coverage-database", {
    waitUntil: "networkidle",
  });

  /* 2. accept disclaimer if it appears */
  try {
    await page.getByRole("button", { name: /Accept/i }).click({ timeout: 10_000 });
  } catch {
    console.log("✓ Disclaimer already accepted or not found");
  }

  /* 3. find and click the first PDF link (href contains .pdf, case‑insensitive) */
  await page.mouse.wheel(0, 1000);                                      // scroll so links load
  const pdfLink   = await page.waitForSelector('a[href*=".pdf" i]', { timeout: 60_000 });
  const dlPromise = page.waitForEvent("download");
  await pdfLink.click();

  /* 4. save the PDF */
  const download   = await dlPromise;
  const filename   = download.suggestedFilename();
  const targetPath = path.join("data", "raw", filename);
  await download.saveAs(targetPath);
  console.log(`✓ Saved PDF ➜ ${targetPath}`);

  /* 5. compute SHA‑256 */
  const buf    = await fs.readFile(targetPath);
  const sha256 = crypto.createHash("sha256").update(buf).digest("hex");
  console.log(`SHA256: ${sha256}`);

  await fs.writeFile(`${targetPath}.sha256`, sha256);

  /* 6. close browser */
  await stagehand.close();
}

/* ────────────────────────  run it  ──────────────────────── */
main().catch(err => {
  console.error("❌ Script failed:", err);
  process.exit(1);
});
