#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const escapeScript = value => value.replace(/<\/script/gi, '<\\/script');
const faviconData = Buffer.from(read('assets/favicon.svg')).toString('base64');

function assertInlineScriptsParse(html, label) {
  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)].map(match => match[1]);
  for (const [index, script] of scripts.entries()) {
    try {
      new Function(script);
    } catch (error) {
      throw new Error(`${label} inline script ${index + 1} does not parse: ${error.message}`, { cause: error });
    }
  }
  return scripts.length;
}

function embeddedLoader(source, message = 'embedded release') {
  return source.replace(
    /async function loadJson\(path\) \{[\s\S]*?\n\}/,
    `async function loadJson(path) {\n  if (!Object.hasOwn(EMBEDDED_DATA, path)) throw new Error(\`${message} does not contain \${path}\`);\n  return structuredClone(EMBEDDED_DATA[path]);\n}`
  );
}

// ---------------------------------------------------------------------------
// Current-ledger homepage standalone

const homeDataPaths = ['graph.json', 'build/hop-graph.json', 'build/surface-graph.json', 'build/receipt-graph.json'];
const homeEmbedded = Object.fromEntries(homeDataPaths.map(file => [file, readJson(file)]));
const homeApp = embeddedLoader(read('home.js'), 'embedded homepage release');
const inlineHomeApp = escapeScript(`const EMBEDDED_DATA = ${JSON.stringify(homeEmbedded)};\n${homeApp}`);
let homeHtml = read('index.html')
  .replace('href="assets/favicon.svg"', () => `href="data:image/svg+xml;base64,${faviconData}"`)
  .replace(/  <link rel="stylesheet" href="home\.css(?:\?[^\"]*)?">/, () => `  <style>\n${read('home.css')}\n  </style>`)
  .replace(/  <script src="home\.js(?:\?[^\"]*)?" type="module"><\/script>/, () => `  <script>\n${inlineHomeApp}\n  </script>`)
  .replace('<body>', '<body data-portable-release="true">')
  .replaceAll('href="explorer.html"', 'href="Clifford-Number-explorer-standalone.html"')
  .replaceAll('href="estates/"', 'href="Clifford-Estate-Aperture-standalone.html"')
  .replaceAll('href="gametrails/"', 'href="Clifford-Game-Trail-Aperture-standalone.html"');
const homeScriptCount = assertInlineScriptsParse(homeHtml, 'homepage standalone');

const outputDir = path.join(root, 'dist');
fs.mkdirSync(outputDir, { recursive: true });
const homeOutput = path.join(outputDir, 'Clifford-Number-standalone.html');
fs.writeFileSync(homeOutput, homeHtml);

// ---------------------------------------------------------------------------
// Semantic topology explorer standalone

const explorerCatalog = readJson('build/public-catalog.json');
const explorerDataPaths = [
  'build/surface-graph.json',
  'build/hop-graph.json',
  'build/scores.json',
  'graph.json',
  'build/scout-report.json',
  'build/receipt-graph.json',
  'build/public-catalog.json',
  'build/atlas-projection.json',
  ...(explorerCatalog.cases ?? []).map(item => item.href),
  ...(explorerCatalog.tracks ?? []).map(item => item.href)
];
const explorerEmbedded = Object.fromEntries([...new Set(explorerDataPaths)].map(file => [file, readJson(file)]));

function isolateModule(source) {
  const exportedNames = [...source.matchAll(/^export\s+(?:function|const|class)\s+([A-Za-z0-9_$]+)/gm)].map(match => match[1]);
  const body = source.replace(/^import .*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
  return `(() => {\n${body}\nreturn { ${exportedNames.join(', ')} };\n})()`;
}

const explorerHelpers = [read('src/evidence-rank.js'), read('src/ui-utils.js'), read('src/i18n.js')]
  .join('\n\n')
  .replace(/^export\s+/gm, '')
  + `\nconst { shortestRoute, strongestEvidenceRoute, bestDatedRoute, officialOnlyRoute, asOfRoute, blockedSegments, routeProjections } = ${isolateModule(read('src/route-projections.js'))};\n`
  + `const { releaseDelta, summarizeDelta } = ${isolateModule(read('src/release-delta.js'))};\n`;

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
  return { file, names, body: source.replace(/^export\s+/gm, '') };
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

let explorerApp = embeddedLoader(
  read('app.js').replace(/^import .*?;\r?\n/gm, ''),
  'embedded explorer release'
);
const inlineExplorerApp = escapeScript(
  `globalThis.__CLIFFORD_APERTURE_BUNDLED__ = true;\nconst EMBEDDED_DATA = ${JSON.stringify(explorerEmbedded)};\n${explorerHelpers}\n${explorerApp}\n${apertureBundle}`
);
const explorerCss = [
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
  .replace('href="assets/favicon.svg"', () => `href="data:image/svg+xml;base64,${faviconData}"`)
  .replace(/  <link rel="stylesheet" href="styles\.css(?:\?[^\"]*)?">/, () => `  <style>\n${explorerCss}\n  </style>`)
  .replace(/  <script src="app\.js(?:\?[^\"]*)?" type="module"><\/script>/, () => `  <script>\n${inlineExplorerApp}\n  </script>`)
  .replace(/\s*<script src="src\/aperture-bootstrap\.js(?:\?[^\"]*)?" type="module"><\/script>/, '')
  .replace('<body>', '<body data-portable-release="explorer">')
  .replaceAll('href="estates/"', 'href="Clifford-Estate-Aperture-standalone.html"')
  .replaceAll('href="gametrails/"', 'href="Clifford-Game-Trail-Aperture-standalone.html"');
const explorerScriptCount = assertInlineScriptsParse(explorerHtml, 'explorer standalone');
const explorerOutput = path.join(outputDir, 'Clifford-Number-explorer-standalone.html');
fs.writeFileSync(explorerOutput, explorerHtml);

// ---------------------------------------------------------------------------
// Existing bounded aperture standalones

const estateApertureSource = path.join(root, 'estates', 'index.html');
const estateApertureOutput = path.join(outputDir, 'Clifford-Estate-Aperture-standalone.html');
const gameTrailSource = path.join(root, 'gametrails', 'index.html');
const gameTrailOutput = path.join(outputDir, 'Clifford-Game-Trail-Aperture-standalone.html');
if (!fs.existsSync(estateApertureSource)) throw new Error('Estate Aperture must be rendered before standalone packaging');
if (!fs.existsSync(gameTrailSource)) throw new Error('Game-Trail Aperture must be rendered before standalone packaging');
fs.copyFileSync(estateApertureSource, estateApertureOutput);
fs.copyFileSync(gameTrailSource, gameTrailOutput);

console.log([
  `build-standalone: ${path.relative(root, homeOutput)} (${fs.statSync(homeOutput).size} bytes, ${homeDataPaths.length} embedded datasets, ${homeScriptCount} parsed scripts)`,
  `${path.relative(root, explorerOutput)} (${fs.statSync(explorerOutput).size} bytes, ${explorerDataPaths.length} embedded records, ${explorerScriptCount} parsed scripts)`,
  `${path.relative(root, estateApertureOutput)} (${fs.statSync(estateApertureOutput).size} bytes)`,
  `${path.relative(root, gameTrailOutput)} (${fs.statSync(gameTrailOutput).size} bytes)`
].join('; '));
