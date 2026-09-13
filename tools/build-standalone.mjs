#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const escapeScript = value => value.replace(/<\/script/gi, '<\\/script');
const faviconData = Buffer.from(read('assets/favicon.svg')).toString('base64');
const dataPaths = ['graph.json', 'build/hop-graph.json', 'build/surface-graph.json', 'build/receipt-graph.json', 'build/public-data-boundary.json'];
const embedded = Object.fromEntries(dataPaths.map(file => [file, readJson(file)]));

let app = read('home.js').replace(
  /async function loadJson\(path\) \{[\s\S]*?\n\}/,
  `async function loadJson(path) {\n  if (!Object.hasOwn(EMBEDDED_DATA, path)) throw new Error(\`Embedded release does not contain \${path}\`);\n  return structuredClone(EMBEDDED_DATA[path]);\n}`
);
const inlineApp = escapeScript(`const EMBEDDED_DATA = ${JSON.stringify(embedded)};\n${app}`);

let html = read('index.html')
  .replace('href="assets/favicon.svg"', `href="data:image/svg+xml;base64,${faviconData}"`)
  .replace(/  <link rel="stylesheet" href="home\.css(?:\?[^\"]*)?">/, `  <style>\n${read('home.css')}\n  </style>`)
  .replace(/  <script src="home\.js(?:\?[^\"]*)?" type="module"><\/script>/, () => `  <script>\n${inlineApp}\n  </script>`)
  .replace('<body>', '<body data-portable-release="true">');

const output = path.join(root, 'dist', 'Clifford-Number-standalone.html');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(`build-standalone: ${path.relative(root, output)} (${fs.statSync(output).size} bytes, ${dataPaths.length} embedded datasets)`);

// --- Topology explorer standalone -----------------------------------------
// Recovers the pre-rewrite embedding mechanism (see f39d9e3's build-standalone.mjs):
// strip app.js's ES module imports, inline src/ui-utils.js + src/i18n.js as plain
// functions, replace loadJson with a lookup into a JSON blob embedded in the page,
// and expand the public catalog's case/track hrefs so every lazily-loaded record
// a click could reach is already on the page. Unlike the Pages release (which
// fetches live), the standalone must have zero network dependency.
const explorerCatalog = readJson('build/public-catalog.json');
const explorerDataPaths = [
  'build/surface-graph.json',
  'build/hop-graph.json',
  'build/scores.json',
  'graph.json',
  'build/scout-report.json',
  'build/receipt-graph.json',
  'build/public-catalog.json',
  // Ladder step 6: the corridor overlay's data artifact is embedded so the
  // standalone renders corridors offline too. build/atlas-projection-baseline.json
  // is deliberately NOT embedded here (it does not exist yet) — app.js's
  // loadJson().catch(() => null) then resolves it to null exactly as it does
  // for a live 404, so the standalone renders the honest absent-baseline line.
  'build/atlas-projection.json',
  'build/public-data-boundary.json',
  ...(explorerCatalog.cases ?? []).map(item => item.href),
  ...(explorerCatalog.tracks ?? []).map(item => item.href)
];
const explorerEmbedded = Object.fromEntries([...new Set(explorerDataPaths)].map(file => [file, readJson(file)]));

// src/route-projections.js and src/release-delta.js each declare their own
// module-private top-level helpers (e.g. both independently define their own
// `evidenceRank`; route-projections.js and app.js both independently define
// `periodStart`/`periodEnd`/`EVIDENCE_RANK` with different bodies). In real
// ES modules those stay isolated per file; flattened into one plain <script>
// they would collide as duplicate top-level declarations. isolateModule
// wraps a module's body in its own IIFE and returns only its `export`ed
// bindings, exactly recovering per-file scoping without touching the
// checked-in source files themselves.
function isolateModule(source) {
  const exportedNames = [...source.matchAll(/^export\s+(?:function|const|class)\s+([A-Za-z0-9_$]+)/gm)].map(match => match[1]);
  // Imports are satisfied by the shared top-scope inlines below (the IIFE
  // body closes over them), so the statements themselves must go.
  const body = source.replace(/^import .*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
  return `(() => {\n${body}\nreturn { ${exportedNames.join(', ')} };\n})()`;
}
// src/evidence-rank.js is inlined FIRST at top scope: app.js indexes its
// EVIDENCE_RANK table directly, and both isolated engines close over its
// evidenceRank/meetsEvidenceFloor.
const explorerHelpers = [read('src/evidence-rank.js'), read('src/ui-utils.js'), read('src/i18n.js')]
  .join('\n\n')
  .replace(/^export\s+/gm, '')
  + `\nconst { shortestRoute, strongestEvidenceRoute, bestDatedRoute, officialOnlyRoute, asOfRoute, blockedSegments, routeProjections } = ${isolateModule(read('src/route-projections.js'))};\n`
  + `const { releaseDelta, summarizeDelta } = ${isolateModule(read('src/release-delta.js'))};\n`;
let explorerApp = read('app.js')
  .replace(/^import .*?;\r?\n/gm, '')
  .replace(
    /async function loadJson\(path\) \{[\s\S]*?\n\}/,
    `async function loadJson(path) {\n  if (!Object.hasOwn(EMBEDDED_DATA, path)) throw new Error(\`embedded release does not contain \${path}\`);\n  return structuredClone(EMBEDDED_DATA[path]);\n}`
  );
const apertureModuleFiles = [
  'src/visual-aperture-core.mjs',
  'src/visual-aperture-state.mjs',
  'src/visual-aperture-workspace.mjs',
  'src/visual-aperture-export.mjs',
  'src/visual-aperture-windowing.mjs'
];
const apertureModuleRecords = apertureModuleFiles.map(file => {
  const source = read(file);
  const names = [...source.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm)].map(match => match[1]);
  const body = source.replace(/^export\s+/gm, '');
  return { names, body };
});
const apertureNames = [...new Set(apertureModuleRecords.flatMap(record => record.names))];
const apertureModules = apertureModuleRecords
  .map(record => `(function apertureModule() {\n${record.body}\nObject.assign(globalThis, { ${record.names.join(', ')} });\n})();`)
  .join('\n');
const apertureRuntime = [
  read('src/visual-aperture-workspace-runtime.js'),
  read('src/visual-aperture-export-runtime.js'),
  ...Array.from({ length: 10 }, (_, index) => read(`src/visual-aperture-part-${index + 1}.js`)),
  read('src/visual-aperture-bounded-runtime.js'),
  read('src/visual-aperture-export-preview-runtime.js'),
  read('src/visual-aperture-part-11.js'),
  read('src/visual-aperture-bounded-address-runtime.js')
].join('\n\n');
const apertureBundle = `(function visualApertureBundle() {\n${apertureModules}\n(function visualApertureRuntime() {\nconst { ${apertureNames.join(', ')} } = globalThis;\n${apertureRuntime}\n})();\n})();`;
const inlineExplorerApp = escapeScript(`globalThis.__CLIFFORD_APERTURE_BUNDLED__ = true;\nconst EMBEDDED_DATA = ${JSON.stringify(explorerEmbedded)};\n${explorerHelpers}\n${explorerApp}\n${apertureBundle}`);
const inlineExplorerCss = [
  read('styles.css'),
  read('src/visual-aperture-layout.css'),
  read('src/visual-aperture-svg.css'),
  read('src/visual-aperture-responsive.css'),
  read('src/visual-aperture-workspace.css'),
  read('src/visual-aperture-export.css'),
  read('src/visual-aperture-bounded.css')
].join('\n\n');

let explorerHtml = read('explorer.html')
  .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/, '')
  .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/, '')
  .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^\"]+" rel="stylesheet">/, '')
  .replace('href="assets/favicon.svg"', `href="data:image/svg+xml;base64,${faviconData}"`)
  .replace(/  <link rel="stylesheet" href="styles\.css(?:\?[^\"]*)?">/, () => `  <style>\n${inlineExplorerCss}\n  </style>`)
  .replace(
    /  <script src="app\.js(?:\?[^\"]*)?" type="module"><\/script>/,
    () => `  <script>\n${inlineExplorerApp}\n  </script>`
  )
  .replace(/\s*<script src="src\/aperture-bootstrap\.js(?:\?[^\"]*)?" type="module"><\/script>/, '')
  .replace('<body>', '<body data-portable-release="explorer">');

const explorerOutput = path.join(root, 'dist', 'Clifford-Number-explorer-standalone.html');
fs.mkdirSync(path.dirname(explorerOutput), { recursive: true });
fs.writeFileSync(explorerOutput, explorerHtml);
const standaloneDocuments = [
  ['homepage', html],
  ['explorer', explorerHtml]
];
for (const [label, document] of standaloneDocuments) {
  const scripts = [...document.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  for (const [index, script] of scripts.entries()) {
    try { new Function(script); }
    catch (error) { throw new Error(`${label} standalone inline script ${index + 1} does not parse: ${error.message}`, { cause: error }); }
  }
}
console.log(`build-standalone: ${path.relative(root, explorerOutput)} (${fs.statSync(explorerOutput).size} bytes, ${explorerDataPaths.length} embedded records)`);

for (const [sourceRelative, outputName] of [
  ['estates/index.html', 'Clifford-Estate-Aperture-standalone.html'],
  ['gametrails/index.html', 'Clifford-Game-Trail-Aperture-standalone.html']
]) {
  const source = path.join(root, sourceRelative);
  if (!fs.existsSync(source)) throw new Error(`required aperture page is missing: ${sourceRelative}`);
  const target = path.join(root, 'dist', outputName);
  fs.copyFileSync(source, target);
  console.log(`build-standalone: ${path.relative(root, target)} (${fs.statSync(target).size} bytes)`);
}
