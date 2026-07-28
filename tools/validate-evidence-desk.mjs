import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, 'build/evidence-desk');
const required = [
  'index.html', '404.html', 'robots.txt', 'sitemap.xml', 'llms.txt',
  'manifest.webmanifest', '_headers', '_redirects',
  'data/site.json', 'data/stories.json', 'data/audit.json',
  'stories/index.html', 'newsroom/index.html', 'methods/index.html',
  'trust/index.html', 'audit/index.html', 'evidence/index.html'
];
const errors = [];
for (const rel of required) {
  try { await fs.access(path.join(out, rel)); }
  catch { errors.push(`missing required file: ${rel}`); }
}

const htmlFiles = [];
async function walk(dir) {
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) await walk(full);
    else if (entry.name.endsWith('.html')) htmlFiles.push(full);
  }
}
await walk(out);

const links = [];
for (const file of htmlFiles) {
  const text = await fs.readFile(file, 'utf8');
  const rel = path.relative(out, file);
  const h1 = (text.match(/<h1\b/gi) || []).length;
  if (h1 !== 1) errors.push(`${rel}: expected one h1, observed ${h1}`);
  for (const token of ['<title>', 'name="description"', 'rel="canonical"', '<header', '<nav', '<main', '<footer', 'application/ld+json', 'class="skip"']) {
    if (!text.includes(token)) errors.push(`${rel}: missing ${token}`);
  }
  for (const match of text.matchAll(/(?:href|src)="([^"]+)"/g)) links.push({ file, href: match[1] });
}

for (const { file, href } of links) {
  if (/^(?:https?:|mailto:|tel:|#|data:|javascript:)/.test(href)) continue;
  const clean = href.split('#')[0].split('?')[0];
  if (!clean) continue;
  const target = clean.startsWith('/') ? path.join(out, clean.slice(1)) : path.resolve(path.dirname(file), clean);
  const candidates = [target, path.join(target, 'index.html'), `${target}.html`];
  let found = false;
  for (const candidate of candidates) {
    try { await fs.access(candidate); found = true; break; } catch {}
  }
  if (!found) errors.push(`${path.relative(out,file)}: broken local reference ${href}`);
}

const site = JSON.parse(await fs.readFile(path.join(out, 'data/site.json'), 'utf8'));
if (site.origin !== 'https://evidence.axm.tools') errors.push('site.json origin drift');
if (!site.contract?.standing_refusals?.includes('candidate is not finding')) errors.push('interpretation contract missing candidate refusal');
const audit = JSON.parse(await fs.readFile(path.join(out, 'data/audit.json'), 'utf8'));
if (!String(audit.measured_result).includes('404')) errors.push('audit ledger lost measured root failure');
if (!String(audit.corrected_result).includes('No second report was issued')) errors.push('audit ledger lost corrected-run limitation');

if (errors.length) {
  console.error(`Evidence Desk validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`Evidence Desk validation passed: ${htmlFiles.length} HTML routes, ${required.length} required files, 0 broken local references.`);
