// Email clients block SVG, so Piko is rasterised at build time (144 px = 72 px @2x).
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import { pikoSvg } from '../../brand/src/generated.ts';

const outDir = resolve(dirname(fileURLToPath(import.meta.url)), '../../../apps/web/public/email');
mkdirSync(outDir, { recursive: true });
for (const mood of ['happy', 'cheer']) {
  const png = new Resvg(pikoSvg[mood], { fitTo: { mode: 'width', value: 144 } }).render().asPng();
  writeFileSync(resolve(outDir, `piko-${mood}.png`), png);
  console.log(`wrote piko-${mood}.png (${png.length} bytes)`);
}
