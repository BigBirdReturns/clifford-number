import assert from 'node:assert/strict';
import { readFileSync, statSync } from 'node:fs';

const html = readFileSync('index.html', 'utf8');
const css = readFileSync('styles.css', 'utf8');
const app = readFileSync('app.js', 'utf8');
const i18n = readFileSync('src/i18n.js', 'utf8');
const apertureBootstrap = readFileSync('src/aperture-bootstrap.js', 'utf8');
const apertureCore = readFileSync('src/visual-aperture-core.mjs', 'utf8');
const apertureState = readFileSync('src/visual-aperture-state.mjs', 'utf8');
const apertureWorkspace = readFileSync('src/visual-aperture-workspace.mjs', 'utf8');
const apertureWorkspaceRuntime = readFileSync('src/visual-aperture-workspace-runtime.js', 'utf8');
const apertureLoader = readFileSync('src/visual-aperture.js', 'utf8');
const apertureUi = [apertureWorkspaceRuntime, ...Array.from({ length: 11 }, (_, index) => readFileSync(`src/visual-aperture-part-${index + 1}.js`, 'utf8'))].join('\n');
const apertureCss = ['layout', 'svg', 'responsive', 'workspace'].map(part => readFileSync(`src/visual-aperture-${part}.css`, 'utf8')).join('\n');
const socialCard = readFileSync('assets/social-card.svg', 'utf8');
const deployWorkflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const pagesBuilder = readFileSync('tools/build-pages.mjs', 'utf8');
const standaloneBuilder = readFileSync('tools/build-standalone.mjs', 'utf8');

// Durable metadata and first-run semantics.
assert.match(html, /<meta name="description"/);
assert.match(html, /<meta property="og:title"/);
assert.match(html, /assets\/social-card\.png/);
assert.match(html, /<meta property="og:image:width" content="1200"/);
assert.match(html, /<link rel="icon" href="assets\/favicon\.svg"/);
assert.match(html, /class="skip-link" href="#main-content"/);
assert.match(html, /id="app-status"[^>]+role="status"/);
assert.match(html, /id="preferences-menu"/);
for (const id of ['theme-select', 'language-select', 'reading-select', 'density-select', 'contrast-toggle', 'preferences-reset']) {
  assert.match(html, new RegExp(`id="${id}"`), `${id} must ship in the display menu`);
}
assert.match(html, /The machine is already in the records/);
assert.match(html, /id="network-atlas"/);
assert.match(html, /id="network-svg"/);
assert.match(html, /data-network-mode="research"/);
assert.match(html, /data-network-mode="hops"/);
assert.match(html, /data-network-focus="dialog"/);
assert.match(html, /id="purpose-title"/);
for (const key of ['purposeSurfaceTitle', 'purposeFlowTitle', 'purposeOutcomeTitle']) assert.match(html, new RegExp(`data-i18n="${key}"`));
assert.match(html, /id="browse-all"/);
assert.match(html, /clifford-preferences/);

// The tab pattern must expose state and relationships before JavaScript runs.
assert.match(html, /id="tab-map"[^>]+role="tab"[^>]+aria-selected="true"[^>]+aria-controls="view-map"/);
assert.match(html, /id="tab-desk"[^>]+role="tab"[^>]+aria-selected="false"[^>]+aria-controls="view-desk"/);
assert.match(html, /id="view-map" role="tabpanel" aria-labelledby="tab-map"/);
assert.match(html, /id="view-desk" role="tabpanel" aria-labelledby="tab-desk"/);

// Every desk input has a durable visible label; placeholders are not labels.
for (const id of ['desk-from', 'desk-to', 'desk-asof']) {
  assert.match(html, new RegExp(`<label for="${id}"(?:\\s[^>]*)?>`));
}

// Keyboard, motion, and visible-focus contracts.
assert.match(css, /:focus-visible\s*\{/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(app, /function onSearchKeydown/);
assert.match(app, /aria-activedescendant/);
assert.match(app, /function browseAll/);
assert.match(app, /function copyCitation/);
assert.match(app, /formatCitation/);
assert.match(app, /navigator\.share/);
assert.match(app, /function shareCitation/);
assert.match(html, /Translate page/);
assert.match(css, /\[data-reading="large"\]/);
assert.match(css, /\[data-contrast="high"\]/);

// Evidence is the primary UI object, and confirmed evidence is ranked explicitly.
assert.match(app, /function renderReceiptGrid/);
assert.match(app, /function renderTopologyMap/);
assert.match(app, /function renderCase/);
assert.match(app, /function researchNetworkModel/);
assert.match(app, /function hopNetworkModel/);
assert.match(app, /function initNetworkAtlas/);
assert.match(app, /function focusNetworkNode/);
assert.match(app, /function renderReceiptArchive/);
assert.match(app, /build\/public-catalog\.json/);
assert.match(app, /async function loadCase/);
assert.match(app, /async function loadTrackHarness/);
assert.match(app, /confirmed:\s*0/);
assert.match(app, /Shared context is not influence|does not establish contact/);

// The visual aperture upgrades the display projection without creating a second data plane.
assert.match(html, /<script src="src\/aperture-bootstrap\.js[^"]*" type="module"><\/script>/);
assert.match(apertureBootstrap, /import\('\.\/visual-aperture\.js/);
assert.match(apertureLoader, /visual-aperture-state\.mjs/);
assert.match(apertureLoader, /visual-aperture-workspace\.mjs/);
assert.match(apertureLoader, /visual-aperture-workspace-runtime\.js/);
assert.match(apertureLoader, /visual-aperture-part-\$\{index \+ 1\}\.js/);
assert.match(apertureBootstrap, /__CLIFFORD_APERTURE_BUNDLED__/);
assert.doesNotMatch(i18n, /visual-aperture|__CLIFFORD_APERTURE/);
assert.match(standaloneBuilder, /aperture-bootstrap\\\.js/);
for (const mode of ['map', 'route', 'surface']) assert.match(apertureUi, new RegExp(`data-ap-mode="${mode}"`));
assert.match(apertureUi, /Map the system\. Keep the receipt attached\./);
assert.match(apertureUi, /build\/surface-graph\.json/);
assert.match(apertureUi, /build\/hop-graph\.json/);
assert.match(apertureUi, /build\/receipt-graph\.json/);
assert.match(apertureUi, /Every actor line terminates at the bounded surface/);
assert.match(apertureUi, /no participant-to-participant lines are drawn/i);
assert.match(apertureUi, /data-open-receipt/);
assert.doesNotMatch(apertureUi, /sampleData|fixture fallback|embedded demonstration fixture/i);
assert.match(apertureCore, /function semanticLevelForScale\(scale, previousLevel/);
assert.match(apertureCore, /function diagnosePathFilters/);
assert.match(apertureCore, /function selectBudgetedParticipants/);
assert.match(apertureState, /APERTURE_STATE_VERSION = '1'/);
assert.match(apertureState, /function readApertureState/);
assert.match(apertureState, /function writeApertureState/);
assert.match(apertureUi, /Copy exact view/);
assert.match(apertureUi, /buildApertureUrl/);
assert.match(apertureUi, /addEventListener\('popstate'/);

// The operator workspace remains local, identifier-only, resettable, and graph-inert.
assert.match(apertureWorkspace, /APERTURE_WORKSPACE_VERSION = '1'/);
assert.match(apertureWorkspace, /APERTURE_WORKSPACE_STORAGE_KEY = 'clifford-aperture-workspace'/);
assert.match(apertureWorkspace, /function saveApertureWorkspaceView/);
assert.match(apertureWorkspace, /function recordApertureWorkspaceRoute/);
assert.match(apertureWorkspace, /function setApertureWorkspacePins/);
assert.match(apertureWorkspace, /function toggleApertureWorkspaceCompare/);
assert.match(apertureWorkspaceRuntime, /Save the view, not a new finding\./);
assert.match(apertureWorkspaceRuntime, /Evidence prose and derived claims are never copied into workspace storage\./);
assert.match(apertureWorkspaceRuntime, /Route results are always recomputed from the current compiled graph\./);
assert.match(apertureWorkspaceRuntime, /The tray does not create an edge, score, or finding\./);
assert.match(apertureWorkspaceRuntime, /Reset local workspace/);
assert.match(apertureWorkspaceRuntime, /localStorage\.removeItem\(APERTURE_WORKSPACE_STORAGE_KEY\)/);
assert.doesNotMatch(apertureWorkspace, /receipt_ids|evidence prose|plain:/i);

assert.match(apertureCss, /\.aperture-overview thead\s*\{[^}]*position:\s*sticky/s);
assert.match(apertureCss, /\.aperture-inspector\.is-open/);
assert.match(apertureCss, /\.aperture-workspace\[hidden\]/);
assert.match(apertureCss, /\.aperture-compare-grid/);
assert.match(apertureCss, /position:\s*fixed/);
assert.match(apertureCss, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(standaloneBuilder, /visual-aperture-core\.mjs/);
assert.match(standaloneBuilder, /visual-aperture-state\.mjs/);
assert.match(standaloneBuilder, /visual-aperture-workspace\.mjs/);
assert.match(standaloneBuilder, /visual-aperture-workspace-runtime\.js/);
assert.match(standaloneBuilder, /visual-aperture-workspace\.css/);
assert.match(standaloneBuilder, /__CLIFFORD_APERTURE_BUNDLED__/);

// The public shell must expose real research objects without upgrading exploratory work.
assert.match(html, /id="research-tracks"/);
assert.match(html, /id="evidence-dialog"/);
assert.match(app, /state\.catalogCounts/);
assert.match(app, /function renderTrackDirectory/);
assert.match(app, /function renderTrack/);
assert.match(app, /function openClaimDialog/);
assert.match(app, /public-indexed claims/);
assert.match(app, /function publicReceiptRecords/);
assert.match(app, /function publicReceiptCount/);
assert.doesNotMatch(app, /Open repository record/);
assert.doesNotMatch(html, /href="https:\/\/github\.com\/BigBirdReturns\/clifford-number\/blob\/main\/docs\/methodology\.md"/);
assert.match(html, /href="#method\/overview"/);
assert.match(html, /href="#receipts\/all"/);
assert.match(app, /Window and surface receipts/);
assert.match(app, /Refusal evidence under review/);
assert.match(app, /not published as a checked negative finding/);
assert.match(app, /publication_status === 'verified'/);
assert.doesNotMatch(app, /A refusal here is a checked fact/);
assert.doesNotMatch(app, /state\.receipts\.size \+ \(state\.catalogCounts\.receipts/);
assert.match(app, /No finding has been admitted by this harness/);
assert.match(app, /Sequence, proximity, or shared context does not establish intent/);
assert.match(css, /\[data-page="detail"\]/);
assert.match(css, /\.track-grid\s*\{/);
assert.match(css, /\.evidence-dialog\s*\{/);

// Editable social artwork keeps the expected large-card aspect and brand boundary language;
// metadata points at its rasterized PNG counterpart for crawler compatibility.
assert.match(socialCard, /width="1200" height="630"/);
assert.match(socialCard, /EVERY HOP IS A SHARED BOUNDED SURFACE/);
assert.ok(statSync('assets/social-card.png').size > 10_000, 'raster social card must be present and non-empty');

// Every runtime dependency and local receipt link must ship in the Pages artifact.
for (const directory of ['assets', 'docs', 'data', 'build', 'src', 'receipts']) {
  assert.match(pagesBuilder, new RegExp(`['"]${directory}['"]`), `Pages artifact must include ${directory}/`);
}
assert.match(deployWorkflow, /npm run release:check/);
assert.match(ciWorkflow, /pull_request:/);
assert.match(ciWorkflow, /npm run release:check/);

console.log('ui-contract.test.js: OK');
