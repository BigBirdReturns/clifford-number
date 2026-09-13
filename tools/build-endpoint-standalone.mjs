#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const escapeScript = value => value.replace(/<\/script/gi, '<\\/script');
const faviconData = Buffer.from(read('assets/favicon.svg')).toString('base64');

// The endpoint release ships the same four datasets the live homepage consumes, keyed by
// endpoint name. An operator points CLIFFORD_GRAPH_CONFIG.endpoints at an API serving the
// same shapes; unconfigured endpoints fall back to this embedded demo copy.
const datasets = {
  research: readJson('graph.json'),
  hops: readJson('build/hop-graph.json'),
  surfaces: readJson('build/surface-graph.json'),
  receipts: readJson('build/receipt-graph.json')
};

const prelude = `globalThis.CLIFFORD_GRAPH_CONFIG = globalThis.CLIFFORD_GRAPH_CONFIG ?? {
  // Point any of these at an API returning the same dataset shape the homepage consumes
  // (research: graph.json, hops: hop-graph, surfaces: surface-graph, receipts: receipt-graph).
  // An empty value uses the embedded demo copy of the published corpus.
  endpoints: { research: '', hops: '', surfaces: '', receipts: '' },
  demoFallback: true
};
globalThis.CLIFFORD_DEMO_DATA = ${JSON.stringify({ schema_version: 'clifford-datasets@1', datasets })};
`;

let app = read('home.js').replace(
  /async function loadJson\(path\) \{[\s\S]*?\n\}/,
  `async function loadJson(path) {
  const key = Object.entries(DEFAULT_ENDPOINTS).find(([, value]) => value === path)?.[0] ?? path;
  const configured = (globalThis.CLIFFORD_GRAPH_CONFIG?.endpoints ?? {})[key];
  if (configured) {
    const response = await fetch(configured, { cache: 'no-cache' });
    if (!response.ok) throw new Error(\`Could not load \${configured}\`);
    return response.json();
  }
  const demo = globalThis.CLIFFORD_DEMO_DATA?.datasets ?? {};
  if (!Object.hasOwn(demo, key)) throw new Error(\`Endpoint release has no demo dataset for \${key}\`);
  return structuredClone(demo[key]);
}`
);
if (!app.includes('CLIFFORD_DEMO_DATA')) throw new Error('endpoint loadJson replacement did not apply');

// The endpoint build overrides no endpoints in PATHS, so home.js still calls loadJson with
// the DEFAULT_ENDPOINTS values; the replaced loadJson resolves them back to dataset keys.
let html = read('index.html')
  .replace('href="assets/favicon.svg"', `href="data:image/svg+xml;base64,${faviconData}"`)
  .replace(/  <link rel="stylesheet" href="home\.css(?:\?[^\"]*)?">/, `  <style>\n${read('home.css')}\n  </style>`)
  .replace(/  <script src="home\.js(?:\?[^\"]*)?" type="module"><\/script>/, `  <script>\n${escapeScript(prelude + app)}\n  </script>`)
  .replace('<body>', '<body data-portable-release="endpoint">');
if (!html.includes('data-portable-release="endpoint"') || /src="home\.js/.test(html)) {
  throw new Error('endpoint HTML patching did not apply cleanly');
}

const output = path.join(root, 'dist', 'Clifford-Number-endpoint.html');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(`build-endpoint-standalone: ${path.relative(root, output)} (${fs.statSync(output).size} bytes, ${Object.keys(datasets).length} endpoint datasets)`);
