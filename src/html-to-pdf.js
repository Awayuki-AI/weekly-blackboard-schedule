import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const htmlPath = path.join(root, "public", "index.html");
const pdfPath = path.join(root, "public", "weekly-schedule.pdf");

async function main() {
  if (!fs.existsSync(htmlPath)) {
    throw new Error(`HTMLがありません: ${htmlPath}\n先に npm run generate を実行してください。`);
  }

  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "networkidle" });
  fs.mkdirSync(path.dirname(pdfPath), { recursive: true });
  await page.pdf({
    path: pdfPath,
    format: "A4",
    printBackground: true,
    margin: { top: "12mm", right: "12mm", bottom: "12mm", left: "12mm" },
  });
  await browser.close();
  console.log(`PDF: ${pdfPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
