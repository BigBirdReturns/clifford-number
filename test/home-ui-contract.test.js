import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('home.css', 'utf8');
const app = readFileSync('home.js', 'utf8');
const explorerHtml = readFileSync('explorer.html', 'utf8');
const explorerApp = readFileSync('app.js', 'utf8');
const pagesBuilder = readFileSync('tools/build-pages.mjs', 'utf8');
const standaloneBuilder = readFileSync('tools/build-standalone.mjs', 'utf8');
const allowlist = JSON.parse(readFileSync('data/project/publication-allowlist.json', 'utf8'));

const laneIds = [
  'model-production',
  'workflow-admission',
  'activation-spend',
  'measurement-feedback'
];

test('the homepage ships a durable current-ledger evidence surface', () => {
  assert.match(html, /<meta name="description"/);
  assert.match(html, /current bounded-surface ledger/i);
  assert.match(html, /assets\/social-card\.png/);
  assert.match(html, /class="skip-link" href="#causal-route-summary"/);
  assert.match(html, /id="causal-route-summary"/);
  assert.match(html, /id="causal-map"/);
  assert.match(html, /id="causal-map-legend"/);
  assert.match(html, /aria-describedby="[^"]*causal-map-legend[^"]*causal-route-summary[^"]*"|aria-describedby="[^"]*causal-route-summary[^"]*causal-map-legend[^"]*"/);
  assert.match(html, /Adjacency[^<]*allegation/i);
  assert.match(app, /dataBoundary:\s*surfaceGraph\.generated/);
  assert.doesNotMatch(app, /const graph = state\.researchGraph/);
});

test('the primary homepage map remains four stable face-on lanes', () => {
  for (const laneId of laneIds) {
    assert.match(html, new RegExp(`data-lane="${laneId}"`), `${laneId} must be present before JavaScript runs`);
  }
  assert.equal((html.match(/data-lane="/g) ?? []).length, laneIds.length, 'the homepage must expose exactly four causal lanes');
  assert.match(css, /\.causal-lane/);
  const laneRuleBodies = [...css.matchAll(/[^{}]*\.causal-lane[^{}]*\{([^{}]*)\}/g)].map(match => match[1]).join('\n');
  assert.doesNotMatch(laneRuleBodies, /perspective\s*:|rotate[XYZ]?\s*\(/i, 'the homepage lanes must remain face-on');
});

test('the missing joined receipt is a physical, labelled open aperture', () => {
  assert.match(html, /id="causal-receipt-aperture"/);
  assert.match(html, /data-state="open"/);
  assert.match(html, /joined[^<]*receipt/i);
  assert.match(html, /not observed/i);
  assert.match(css, /\.causal-receipt-aperture/);
  assert.doesNotMatch(html, /data-speculative-bridge|data-aperture-bridge/);
  assert.doesNotMatch(app, /data-speculative-bridge|data-aperture-bridge/);
});

test('evidence inspection is explicit and separate from homepage reading', () => {
  assert.match(html, /id="evidence-inspection-toggle"/);
  assert.match(html, /id="evidence-inspection-toggle"[^>]+aria-controls="evidence-inspector"/);
  assert.match(html, /id="evidence-inspection-toggle"[^>]+aria-expanded="false"/);
  assert.match(html, /id="evidence-inspector"[^>]+hidden/);
  assert.match(html, /id="provenance-projection"/);
  assert.match(html, /id="provenance-labels"[^>]+data-location="outside-projection"/);
  assert.match(html, /data-provenance-plate="A"/);
  assert.match(html, /data-provenance-plate="B"/);
  assert.match(html, /data-provenance-plate="C"/);
});

test('the homepage remains text-first and does not regress into the topology renderer', () => {
  assert.doesNotMatch(html, /graph-planes|3 depth planes|stop the dive/i);
  assert.doesNotMatch(app, /function\s+planeMarkup|\[0,\s*1,\s*2\]\.map/);
  assert.doesNotMatch(css, /world-dive|\.world-plane/);
  assert.doesNotMatch(app, /requestAnimationFrame|getContext\(|WebGL/);
  assert.doesNotMatch(html, /src="app\.js|href="styles\.css/);
});

test('keyboard, mobile, and reduced-motion equivalents remain first-class', () => {
  assert.match(css, /:focus-visible\s*\{/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(app, /function\s+(open|toggle)EvidenceInspection|function\s+setInspectionMode/);
  assert.match(app, /\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);
});

test('the explorer exposes current topology, compiler hops, and legacy context as separate projections', () => {
  assert.match(explorerHtml, /data-network-mode="research"[^>]*>Current surface topology</);
  assert.match(explorerHtml, /data-network-mode="hops"[^>]*>Verified surface hops</);
  assert.match(explorerHtml, /data-network-mode="legacy"[^>]*>Legacy edge context</);
  assert.match(explorerApp, /function\s+researchNetworkModel\s*\(/);
  assert.match(explorerApp, /function\s+legacyNetworkModel\s*\(/);
  assert.match(explorerApp, /dataBoundary:\s*graph\.generated/);
  assert.match(explorerApp, /mode:\s*'legacy'/);
  assert.match(explorerApp, /type:\s*'bounded-surface-participation'/);
  assert.match(explorerApp, /function\s+semanticLevel\s*\(/);
  assert.match(explorerApp, /function\s+buildAtlasMachineContainers\s*\(/);
  assert.match(explorerApp, /function\s+buildEdgeLocalityModel\s*\(/);
  assert.match(explorerApp, /function\s+buildBipartiteExpansions\s*\(/);
});

test('the public boundary ships the complete homepage and semantic explorer', () => {
  const paths = new Set(allowlist.paths);
  for (const file of [
    'index.html', 'home.js', 'home.css', 'explorer.html', 'app.js', 'styles.css',
    'graph.json', 'build/surface-graph.json', 'build/hop-graph.json', 'build/receipt-graph.json',
    'build/atlas-projection.json', 'src/evidence-rank.js', 'src/release-delta.js',
    'src/roster-budget.js', 'src/route-diagnostics.js', 'src/route-projections.js',
    'src/aperture-bootstrap.js'
  ]) {
    assert.ok(paths.has(file), `${file} must be in the positive publication boundary`);
  }
  assert.match(pagesBuilder, /publication-allowlist\.json/);
  assert.match(explorerHtml, /src="app\.js/);
  assert.match(explorerHtml, /href="styles\.css/);
  assert.doesNotMatch(explorerHtml, /data-lane=|causal-receipt-aperture|provenance-plate/);
  assert.match(standaloneBuilder, /read\('home\.js'\)/);
  assert.match(standaloneBuilder, /read\('home\.css'\)/);
  assert.match(standaloneBuilder, /explorer\.html/);
  assert.ok(statSync('assets/social-card.png').size > 10_000);
});
