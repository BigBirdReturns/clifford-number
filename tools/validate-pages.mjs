#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const destination = path.join(root, 'dist');
const required = [
  'index.html', 'Clifford-Number-standalone.html', 'Clifford-Number-endpoint.html', 'home.js', 'home.css', '.nojekyll',
  'graph.json', 'build/hop-graph.json', 'build/surface-graph.json', 'build/receipt-graph.json',
  'assets/favicon.svg', 'assets/social-card.png',
  // The topology explorer ships publicly as a second page.
  'explorer.html', 'app.js', 'styles.css', 'src/ui-utils.js', 'src/i18n.js', 'build/scores.json',
  'Clifford-Number-explorer-standalone.html',
  // Ladder steps 5-6: route projections, release deltas, and the corridor overlay.
  'src/route-projections.js', 'src/release-delta.js', 'build/atlas-projection.json',
  // Canonical evidence ranking — imported by app.js and both engines.
  'src/evidence-rank.js'
];
const missing = required.filter(file => !fs.existsSync(path.join(destination, file)));
if (missing.length) {
  console.error(`validate-pages failed: missing ${missing.join(', ')}`);
  process.exit(1);
}
// app.js/styles.css/src are now a deliberate, required part of the release (the explorer),
// so only the never-shipped intake/legacy surfaces stay forbidden.
for (const forbidden of ['cases', 'docs', 'data', 'receipts']) {
  if (fs.existsSync(path.join(destination, forbidden))) {
    console.error(`validate-pages failed: legacy surface leaked into homepage release: ${forbidden}`);
    process.exit(1);
  }
}

const html = fs.readFileSync(path.join(destination, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(destination, 'home.js'), 'utf8');
const css = fs.readFileSync(path.join(destination, 'home.css'), 'utf8');
const standalone = fs.readFileSync(path.join(destination, 'Clifford-Number-standalone.html'), 'utf8');
const endpointStandalone = fs.readFileSync(path.join(destination, 'Clifford-Number-endpoint.html'), 'utf8');
const graph = JSON.parse(fs.readFileSync(path.join(destination, 'graph.json'), 'utf8'));
const hops = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'hop-graph.json'), 'utf8'));
const explorerHtml = fs.readFileSync(path.join(destination, 'explorer.html'), 'utf8');
const explorerApp = fs.readFileSync(path.join(destination, 'app.js'), 'utf8');
const explorerStandalone = fs.readFileSync(path.join(destination, 'Clifford-Number-explorer-standalone.html'), 'utf8');

if (!html.includes('id="causal-map"') || !html.includes('id="causal-map-legend"') || !html.includes('id="causal-route-summary"')) {
  console.error('validate-pages failed: homepage does not expose the four-lane causal instrument');
  process.exit(1);
}
if ((html.match(/data-lane="/g) ?? []).length !== 4 || !html.includes('id="causal-receipt-aperture"') || !html.includes('data-state="open"')) {
  console.error('validate-pages failed: the four causal lanes or the open receipt aperture are missing');
  process.exit(1);
}
if (!html.includes('id="evidence-inspection-toggle"') || !html.includes('data-provenance-plate="A"')) {
  console.error('validate-pages failed: the evidence inspection view is missing');
  process.exit(1);
}
if (!app.includes('function homepageModel') || !app.includes('function evidenceInspectionModel')) {
  console.error('validate-pages failed: the pure homepage/inspection model boundary is missing');
  process.exit(1);
}
if (app.includes('function planeMarkup') || app.includes("[0, 1, 2].map") || app.includes('requestAnimationFrame') || app.includes('getContext(')) {
  console.error('validate-pages failed: obsolete three-plane world-dive renderer regressed into the homepage');
  process.exit(1);
}
if (css.includes('world-dive') || !css.includes('prefers-reduced-motion') || !css.includes('.causal-lane') || !css.includes('.causal-receipt-aperture')) {
  console.error('validate-pages failed: causal-lane styling or reduced-motion fallback is missing, or world-dive styling regressed');
  process.exit(1);
}
if (!standalone.includes('data-portable-release="true"') || !standalone.includes('const EMBEDDED_DATA =') || /src="home\.js/.test(standalone) || /href="home\.css/.test(standalone)) {
  console.error('validate-pages failed: standalone release is not self-contained');
  process.exit(1);
}
if (!standalone.includes('href="data:image/svg+xml;base64,') || standalone.includes('href="assets/favicon.svg"')) {
  console.error('validate-pages failed: standalone favicon is not embedded');
  process.exit(1);
}
if (!endpointStandalone.includes('data-portable-release="endpoint"') || !endpointStandalone.includes('CLIFFORD_GRAPH_CONFIG') || !endpointStandalone.includes('CLIFFORD_DEMO_DATA') || !endpointStandalone.includes('clifford-datasets@1') || /src="home\.js/.test(endpointStandalone)) {
  console.error('validate-pages failed: endpoint standalone is not self-contained or lacks its dataset-endpoint contract');
  process.exit(1);
}
if (!app.includes('DEFAULT_ENDPOINTS') || !app.includes('CLIFFORD_GRAPH_CONFIG') || app.includes('requestAnimationFrame')) {
  console.error('validate-pages failed: configurable-endpoint contract is missing from the homepage app or regressed');
  process.exit(1);
}
if (graph.nodes.length !== 194 || graph.edges.length !== 223 || hops.edges.length !== 31) {
  console.error('validate-pages failed: published graph counts drifted from the current release');
  process.exit(1);
}
if (/network-atlas|hero-hotspots|research-queue|purpose-map|Interrogate the corpus/.test(html)) {
  console.error('validate-pages failed: legacy homepage draft markup remains in the new entrypoint');
  process.exit(1);
}
// index.html is the causal homepage only; it must never pull in the explorer bundle.
if (/src="app\.js|href="styles\.css/.test(html)) {
  console.error('validate-pages failed: the homepage entrypoint references the explorer bundle');
  process.exit(1);
}

// --- Topology explorer (second public page) --------------------------------
if (!explorerHtml.includes('id="network-svg"') || !explorerHtml.includes('id="view-desk"') || !explorerHtml.includes('id="view-map"')) {
  console.error('validate-pages failed: explorer.html does not expose the topology atlas or its explorer/desk views');
  process.exit(1);
}
if (!/src="app\.js/.test(explorerHtml) || !/href="styles\.css/.test(explorerHtml)) {
  console.error('validate-pages failed: explorer.html does not reference app.js/styles.css');
  process.exit(1);
}
if (!explorerApp.includes('function semanticLevel') || !explorerApp.includes('function atlasScale')) {
  console.error('validate-pages failed: the semantic-zoom atlas is missing from the shipped app.js');
  process.exit(1);
}
// Ladder step 5: the shipped app.js must actually wire in routeProjections()
// from src/route-projections.js, and its canonical-Clifford labeling for
// secondary projections must survive the build.
if (!explorerApp.includes('routeProjections')) {
  console.error('validate-pages failed: dist app.js does not reference routeProjections');
  process.exit(1);
}
if (!explorerApp.includes('does not redefine the Clifford Number')) {
  console.error('validate-pages failed: dist app.js/explorer.html do not carry the canonical-Clifford secondary-projection labeling');
  process.exit(1);
}
if (!explorerStandalone.includes('data-portable-release="explorer"') || !explorerStandalone.includes('const EMBEDDED_DATA =')
  || /src="app\.js/.test(explorerStandalone) || /href="styles\.css/.test(explorerStandalone)) {
  console.error('validate-pages failed: explorer standalone is not self-contained');
  process.exit(1);
}
console.log(`validate-pages: OK (${required.length} homepage artifacts)`);
