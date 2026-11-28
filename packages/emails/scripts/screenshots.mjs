// Screenshots of out/*.html (run `pnpm export:html` first) at desktop and phone width.
// Uses a local Playwright + Chromium. Piko images load from SITE_URL, or from apps/web/public
// when SITE_URL is a file URL.
import { readdirSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const inDir = resolve(root, 'out');
const outDir = resolve(process.argv[2] ?? resolve(root, 'out/png'));
mkdirSync(outDir, { recursive: true });

const browser = await chromium.launch();
for (const [suffix, width] of [
  ['', 680],
  ['-mobile', 390],
]) {
  const page = await browser.newPage({ viewport: { width, height: 800 }, deviceScaleFactor: 2 });
  for (const f of readdirSync(inDir).filter((n) => n.endsWith('.html'))) {
    await page.goto(pathToFileURL(resolve(inDir, f)).href, { waitUntil: 'networkidle' });
    await page.screenshot({
      path: resolve(outDir, f.replace('.html', `${suffix}.png`)),
      fullPage: true,
    });
  }
  await page.close();
}
await browser.close();
console.log(`screenshots in ${outDir}`);
