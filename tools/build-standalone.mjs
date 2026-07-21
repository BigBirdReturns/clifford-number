#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const escapeScript = value => value.replace(/<\/script/gi, '<\\/script');
const faviconData = Buffer.from(read('assets/favicon.svg')).toString('base64');

const catalog = readJson('build/public-catalog.json');
const dataPaths = [
  'build/surface-graph.json',
  'build/hop-graph.json',
  'build/scores.json',
  'graph.json',
  'build/scout-report.json',
  'build/receipt-graph.json',
  'build/public-catalog.json',
  ...(catalog.cases ?? []).map(item => item.href),
  ...(catalog.tracks ?? []).map(item => item.href)
];
const embedded = Object.fromEntries([...new Set(dataPaths)].map(file => [file, readJson(file)]));

const helpers = [read('src/ui-utils.js'), read('src/i18n.js')]
  .join('\n\n')
  .replace(/^export\s+/gm, '');
const apertureCoreSource = read('src/visual-aperture-core.mjs');
const apertureCoreNames = [...apertureCoreSource.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm)].map(match => match[1]);
const apertureCore = apertureCoreSource.replace(/^export\s+/gm, '');
const apertureParts = Array.from({ length: 11 }, (_, index) => read(`src/visual-aperture-part-${index + 1}.js`)).join('\n\n');
const apertureBundle = `(function visualApertureBundle() {\n${apertureCore}\nObject.assign(globalThis, { ${apertureCoreNames.join(', ')} });\n(function visualApertureRuntime() {\nconst { ${apertureCoreNames.join(', ')} } = globalThis;\n${apertureParts}\n})();\n})();`;
let app = read('app.js')
  .replace(/^import .*?;\r?\n/gm, '')
  .replace(
    /async function loadJson\(path\) \{[\s\S]*?\n\}/,
    `async function loadJson(path) {\n  if (!Object.hasOwn(EMBEDDED_DATA, path)) throw new Error(\`embedded release does not contain \${path}\`);\n  return structuredClone(EMBEDDED_DATA[path]);\n}`
  );
const inlineApp = escapeScript(`globalThis.__CLIFFORD_APERTURE_BUNDLED__ = true;\nconst EMBEDDED_DATA = ${JSON.stringify(embedded)};\n${helpers}\n${app}\n${apertureBundle}`);
const inlineCss = [read('styles.css'), read('src/visual-aperture-layout.css'), read('src/visual-aperture-svg.css'), read('src/visual-aperture-responsive.css')].join('\n\n');

let html = read('index.html')
  .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com">/, '')
  .replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin>/, '')
  .replace(/\s*<link href="https:\/\/fonts\.googleapis\.com\/css2\?[^\"]+" rel="stylesheet">/, '')
  .replace('href="assets/favicon.svg"', `href="data:image/svg+xml;base64,${faviconData}"`)
  .replace(/  <link rel="stylesheet" href="styles\.css(?:\?[^\"]*)?">/, `  <style>\n${inlineCss}\n  </style>`)
  .replace(
    /  <script src="app\.js(?:\?[^\"]*)?" type="module"><\/script>/,
    `  <script>\n${inlineApp}\n  </script>`
  )
  .replace(/\s*<script src="src\/aperture-bootstrap\.js(?:\?[^\"]*)?" type="module"><\/script>/, '')
  .replace('<body>', '<body data-portable-release="true">');

const output = path.join(root, 'dist', 'Clifford-Number-standalone.html');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, html);
console.log(`build-standalone: ${path.relative(root, output)} (${fs.statSync(output).size} bytes, ${dataPaths.length} embedded records)`);
