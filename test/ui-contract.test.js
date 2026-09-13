import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';
import test from 'node:test';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('home.css', 'utf8');
const app = readFileSync('home.js', 'utf8');
const explorerHtml = readFileSync('explorer.html', 'utf8');
const pagesBuilder = readFileSync('tools/build-pages.mjs', 'utf8');
const standaloneBuilder = readFileSync('tools/build-standalone.mjs', 'utf8');

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
  assert.match(app, /function\s+(open|toggle)EvidenceInspection|function\s+setInspectionMode/);
  assert.match(app, /\.focus\(\{\s*preventScroll:\s*true\s*\}\)/);
});

// Contract evolution: the operator decided the topology explorer ships publicly as a
// second page (explorer.html/app.js/styles.css). The original intent of this test —
// the homepage must never regress back into the old explorer bundle — is preserved by
// asserting index.html itself stays free of app.js/styles.css references, while the
// pagesBuilder and explorer.html assertions below cover the new, deliberate reality
// that the explorer is now a shipped public artifact in its own right.
test('the corrected homepage remains in every release artifact', () => {
  for (const file of ['index.html', 'home.js', 'home.css', 'graph.json']) {
    assert.match(pagesBuilder, new RegExp(`['"]${file.replace('.', '\\.')}['"]`));
  }
  // (a) the homepage document itself must never reference the explorer bundle.
  assert.doesNotMatch(html, /src="app\.js|href="styles\.css/);
  // (b) the explorer is a public promise now: the Pages builder must ship it.
  for (const file of ['explorer.html', 'app.js', 'styles.css']) {
    assert.match(pagesBuilder, new RegExp(`['"]${file.replace('.', '\\.')}['"]`));
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
