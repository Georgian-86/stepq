// Writes every member email as standalone HTML.
//   pnpm export:html            -> out/<name>.html with sample data (for review and screenshots)
//   pnpm export:html --supabase -> supabase-auth/<name>.html with Supabase's {{ .Variables }},
//                                  ready to paste into Supabase → Authentication → Email Templates
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { catalog, render, type TemplateName } from '../src/index';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const siteUrl = process.env.SITE_URL ?? 'https://stepq.in';
const supabase = process.argv.includes('--supabase');

const outDir = resolve(root, supabase ? 'supabase-auth' : 'out');
mkdirSync(outDir, { recursive: true });
const index: string[] = [];
for (const e of catalog) {
  if (supabase && e.sender !== 'supabase') continue;
  const props = supabase ? {} : e.sample;
  const r = await render(e.name as TemplateName, props as never, { siteUrl });
  writeFileSync(resolve(outDir, `${e.name}.html`), r.html);
  index.push(`${e.name}\t${r.subject}`);
}
writeFileSync(resolve(outDir, 'subjects.tsv'), index.join('\n') + '\n');
console.log(`wrote ${index.length} templates to ${outDir}`);
