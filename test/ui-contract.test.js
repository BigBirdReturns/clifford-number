import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('home.css', 'utf8');
const app = readFileSync('home.js', 'utf8');
const explorerHtml = readFileSync('explorer.html', 'utf8');
const pagesBuilder = readFileSync('tools/build-pages.mjs', 'utf8');
const standaloneBuilder = readFileSync('tools/build-standalone.mjs', 'utf8');
const publicationPolicy = JSON.parse(readFileSync('data/project/publication-allowlist.json', 'utf8'));

const laneIds = [
  'model-production',
  'workflow-admission',
  'activation-spend',
  'measurement-feedback'
];

test('the homepage ships a durable, text-first evidence surface', () => {
  assert.match(html, /<meta name="description"/);
  assert.match(html, /assets\/social-card\.png/);
  assert.match(html, /class="skip-link" href="#causal-route-summary"/);
  assert.match(html, /id="causal-route-summary"/);
  assert.match(html, /id="causal-map"/);
  assert.match(html, /id="causal-map-legend"/);
  assert.match(html, /aria-describedby="[^"]*causal-map-legend[^"]*causal-route-summary[^"]*"|aria-describedby="[^"]*causal-route-summary[^"]*causal-map-legend[^"]*"/);
  assert.match(html, /Edge[^<]*allegation/);
});

test('the primary map is four stable face-on lanes', () => {
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

test('the obsolete three-plane world dive cannot satisfy the homepage contract', () => {
  assert.doesNotMatch(html, /graph-planes|3 depth planes|stop the dive/i);
  assert.doesNotMatch(app, /function\s+planeMarkup|\[0,\s*1,\s*2\]\.map/);
  assert.doesNotMatch(css, /world-dive|\.world-plane/);
  assert.doesNotMatch(app, /requestAnimationFrame|getContext\(|WebGL/);
});

test('keyboard and reduced-motion equivalents remain first-class', () => {
  assert.match(css, /:focus-visible\s*\{/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(css, /@media \(max-width: 600px\)/);
  assert.match(app, /function\s+closeReceipts/);
  assert.match(app, /event\.key !== 'Escape'/);
});

test('the lane table is explicit about overlay rows and unmapped edge types', () => {
  // The 169 topology-only overlay rows in graph.json are not documented
  // records of any lane, and an edge type missing from the table must be
  // reported rather than absorbed into workflow-admission by default.
  assert.match(app, /projection_layer === OVERLAY_PROJECTION_LAYER/);
  assert.match(app, /OVERLAY_PROJECTION_LAYER = 'canonical_surface_overlay'/);
  assert.match(app, /throw new Error\(`Unmapped research edge type/);
  assert.doesNotMatch(app, /\?\?\s*'workflow-admission'/);
  assert.doesNotMatch(app, /evidenceInspectionModel|data-provenance-plate|setInspectionMode/);
  assert.doesNotMatch(html, /evidence-inspection|provenance-plate|provenance-projection/);
});

test('projection boundaries are visible and explicitly separated from source freshness', () => {
  assert.match(html, /id="data-boundary"/);
  assert.match(html, /id="boundary-research-value"/);
  assert.match(html, /Build identity, not source freshness/);
  assert.match(app, /boundary:\s*'build\/public-data-boundary\.json'/);
  assert.match(app, /function\s+renderDataBoundary/);
  assert.match(explorerHtml, /id="public-data-boundary"/);
  assert.ok(publicationPolicy.paths.includes('build/public-data-boundary.json'));
});

// Contract evolution: the operator decided the topology explorer ships publicly as a
// second page (explorer.html/app.js/styles.css). The original intent of this test â€”
// the homepage must never regress back into the old explorer bundle â€” is preserved by
// asserting index.html itself stays free of app.js/styles.css references, while the
// pagesBuilder and explorer.html assertions below cover the new, deliberate reality
// that the explorer is now a shipped public artifact in its own right.
test('the corrected homepage remains in every release artifact', () => {
  assert.match(pagesBuilder, /readPublicationPolicy/);
  for (const file of ['index.html', 'home.js', 'home.css', 'graph.json']) {
    assert.ok(publicationPolicy.paths.includes(file), `publication allowlist must include ${file}`);
  }
  // (a) the homepage document itself must never reference the explorer bundle.
  assert.doesNotMatch(html, /src="app\.js|href="styles\.css/);
  // (b) the explorer is a public promise now: the Pages builder must ship it.
  for (const file of ['explorer.html', 'app.js', 'styles.css']) {
    assert.ok(publicationPolicy.paths.includes(file), `publication allowlist must include ${file}`);
  }
  // (c) explorer.html hosts app.js/styles.css and carries none of the homepage's
  // four-lane causal markup.
  assert.match(explorerHtml, /src="app\.js/);
  assert.match(explorerHtml, /href="styles\.css/);
  assert.doesNotMatch(explorerHtml, /data-lane=|causal-receipt-aperture|provenance-/);
  assert.match(standaloneBuilder, /read\('home\.js'\)/);
  assert.match(standaloneBuilder, /read\('home\.css'\)/);
  assert.ok(statSync('assets/social-card.png').size > 10_000);
});
