import fs from 'node:fs/promises';
import path from 'node:path';

const BASE = 'https://websiteiq.xyz';
const OUT = 'websiteiq-contract';
await fs.mkdir(OUT, { recursive: true });

const targets = [
  '/',
  '/.well-known/api-catalog',
  '/methodology/',
  '/crawler/',
  '/sample-report/',
  '/privacy/',
  '/terms/',
];

async function save(url, filename) {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      'user-agent': 'BigBirdReturns-WebsiteIQ-Contract-Inspector/1.0',
      accept: 'text/html, application/json, text/plain;q=0.9, */*;q=0.8',
    },
  });
  const body = await response.text();
  await fs.writeFile(path.join(OUT, filename), body);
  await fs.writeFile(
    path.join(OUT, `${filename}.headers.json`),
    `${JSON.stringify({
      requestedUrl: url,
      finalUrl: response.url,
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
    }, null, 2)}\n`,
  );
  return { response, body };
}

const home = await save(`${BASE}/`, 'home.html');
const scripts = [...home.body.matchAll(/<script\b[^>]*\bsrc=["']([^"']+)["'][^>]*>/gi)]
  .map((m) => new URL(m[1], BASE).toString());
const styles = [...home.body.matchAll(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/gi)]
  .map((m) => new URL(m[1], BASE).toString())
  .filter((url) => new URL(url).origin === BASE);

for (const [index, target] of targets.slice(1).entries()) {
  const clean = target.replace(/^\/+|\/+$/g, '').replace(/[^a-z0-9.-]+/gi, '-') || 'root';
  await save(`${BASE}${target}`, `${String(index + 1).padStart(2, '0')}-${clean}.txt`);
}

const assets = [...new Set([...scripts, ...styles])];
for (const [index, asset] of assets.entries()) {
  const ext = path.extname(new URL(asset).pathname) || '.txt';
  await save(asset, `asset-${String(index + 1).padStart(2, '0')}${ext}`);
}

await fs.writeFile(
  path.join(OUT, 'asset-index.json'),
  `${JSON.stringify({ scripts, styles, assets }, null, 2)}\n`,
);
console.log(`Saved WebsiteIQ contract surface: ${targets.length} routes and ${assets.length} assets.`);
