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
const apertureExport = readFileSync('src/visual-aperture-export.mjs', 'utf8');
const apertureWorkspaceRuntime = readFileSync('src/visual-aperture-workspace-runtime.js', 'utf8');
const apertureExportRuntime = readFileSync('src/visual-aperture-export-runtime.js', 'utf8');
const apertureLoader = readFileSync('src/visual-aperture.js', 'utf8');
const apertureUi = [
  apertureWorkspaceRuntime,
  apertureExportRuntime,
  ...Array.from({ length: 11 }, (_, index) => readFileSync(`src/visual-aperture-part-${index + 1}.js`, 'utf8'))
].join('\n');
const apertureCss = ['layout', 'svg', 'responsive', 'workspace', 'export']
  .map(part => readFileSync(`src/visual-aperture-${part}.css`, 'utf8'))
  .join('\n');
const thesisManifest = readFileSync('data/research/theses/synthetic-population-infrastructure.json', 'utf8');
const thesisEvidence = readFileSync('data/research/thesis-evidence/synthetic-population-infrastructure.json', 'utf8');
const thesisReviews = readFileSync('data/research/thesis-reviews/synthetic-population-infrastructure.json', 'utf8');
const thesisCore = readFileSync('tools/lib/thesis.mjs', 'utf8');
const thesisCompiler = readFileSync('tools/compile-thesis.mjs', 'utf8');
const thesisValidator = readFileSync('tools/validate-thesis.mjs', 'utf8');
const thesisDoc = readFileSync('docs/thesis-assembly.md', 'utf8');
const socialCard = readFileSync('assets/social-card.svg', 'utf8');
const deployWorkflow = readFileSync('.github/workflows/deploy.yml', 'utf8');
const ciWorkflow = readFileSync('.github/workflows/ci.yml', 'utf8');
const pagesBuilder = readFileSync('tools/build-pages.mjs', 'utf8');
const standaloneBuilder = readFileSync('tools/build-standalone.mjs', 'utf8');
const staticServer = readFileSync('tools/serve-static.mjs', 'utf8');

assert.match(staticServer, /['"]\.mjs['"]:\s*['"]text\/javascript['"]/, 'local server must serve ES modules with a browser-valid MIME type');

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
assert.match(app, /safeLocalReceiptPath/);
assert.match(app, /Open preserved extract/);
for (const field of ['source_published_at', 'source_updated_at', 'event_date']) assert.match(app, new RegExp(field));
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
assert.match(apertureLoader, /visual-aperture-export\.mjs/);
assert.match(apertureLoader, /visual-aperture-workspace-runtime\.js/);
assert.match(apertureLoader, /visual-aperture-export-runtime\.js/);
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

// Publication export carries the exact view, receipt IDs, temporal limits, and standing inference boundary.
assert.match(apertureExport, /APERTURE_EXPORT_SCHEMA_VERSION = 'clifford-aperture-export@1'/);
assert.match(apertureExport, /function buildApertureExportPacket/);
assert.match(apertureExport, /graph_effect:\s*'none'/);
assert.match(apertureExport, /Visual prominence is not an allegation/);
assert.match(apertureExport, /exact_view_url_required:\s*true/);
assert.match(apertureExportRuntime, /Export the view with its limits attached\./);
assert.match(apertureExportRuntime, /Copy evidence JSON/);
assert.match(apertureExportRuntime, /Download evidence JSON/);
assert.match(apertureExportRuntime, /Print packet/);
assert.match(apertureExportRuntime, /temporal_input_valid/);
assert.match(apertureExportRuntime, /receipt_ids/);
assert.match(apertureCss, /\.aperture-export\[hidden\]/);
assert.match(apertureCss, /\.aperture-print-export/);

// The thesis layer is a falsifiable assembly contract, never a machine-generated verdict.
assert.match(thesisManifest, /"schema_version": "clifford-thesis@1"/);
assert.match(thesisManifest, /"machine_synthesis_ceiling": "eligible_for_human_synthesis"/);
assert.match(thesisManifest, /"proposition_id": "P1-state-market-continuity"/);
assert.match(thesisManifest, /"proposition_id": "P6-infrastructure-synthesis"/);
assert.match(thesisManifest, /"falsifiers": \[/);
assert.match(thesisManifest, /"alternative_explanations": \[/);
assert.match(thesisManifest, /"graph_effect": "none"/);
assert.match(thesisEvidence, /"evidence_state": "no_case_packets_promoted"/);
assert.match(thesisEvidence, /"packets": \[\]/);
assert.match(thesisEvidence, /vendor-denominator-not-frozen/);
assert.match(thesisReviews, /CI success is not a review\./);
assert.match(thesisReviews, /No machine process may convert review absence into approval\./);
assert.match(thesisCore, /eligible_for_human_synthesis/);
assert.match(thesisCore, /contested_pending_human_synthesis/);
assert.match(thesisCore, /conclusion_generated:\s*false/);
assert.match(thesisCore, /bottom_line_generated:\s*false/);
assert.doesNotMatch(thesisCore, /machine_disposition:\s*['"](?:supported|proved|confirmed)/);
assert.match(thesisCompiler, /build', 'thesis'/);
assert.match(thesisCompiler, /renderThesisMarkdown/);
assert.match(thesisValidator, /compiled thesis JSON is stale/);
assert.match(thesisValidator, /no generated conclusion/);
assert.match(thesisDoc, /A case contract or GitHub issue is not an evidence packet\./);
assert.match(thesisDoc, /It cannot emit `supported`, `proved`, `confirmed thesis`/);

assert.match(apertureCss, /\.aperture-overview thead\s*\{[^}]*position:\s*sticky/s);
assert.match(apertureCss, /\.aperture-inspector\.is-open/);
assert.match(apertureCss, /\.aperture-workspace\[hidden\]/);
assert.match(apertureCss, /\.aperture-compare-grid/);
assert.match(apertureCss, /position:\s*fixed/);
assert.match(apertureCss, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(standaloneBuilder, /visual-aperture-core\.mjs/);
assert.match(standaloneBuilder, /visual-aperture-state\.mjs/);
assert.match(standaloneBuilder, /visual-aperture-workspace\.mjs/);
assert.match(standaloneBuilder, /visual-aperture-export\.mjs/);
assert.match(standaloneBuilder, /visual-aperture-workspace-runtime\.js/);
assert.match(standaloneBuilder, /visual-aperture-export-runtime\.js/);
assert.match(standaloneBuilder, /visual-aperture-workspace\.css/);
assert.match(standaloneBuilder, /visual-aperture-export\.css/);
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

// Exercise the actual surface renderer, not just the presence of a source string.
const { runInNewContext } = await import('node:vm');
const { partitionParticipantRows } = await import('../src/ui-utils.js');
const renderer = app.slice(app.indexOf('function renderSurface(id) {'), app.indexOf('/* ---------------- Claims Desk'));
for (const count of [0, 1, 18, 19, 112]) {
  const participants = Array.from({ length: count }, (_, i) => ({
    participant_type: i % 2 ? 'actor' : 'organization', actor_id: `actor-${i}`,
    organization_id: `org-${i}`, role: `row-${i}`, participation_type: 'listed',
  }));
  const fixture = { surface_id: 'test-roster', surface_label: 'Test roster', participants, hop_eligible: false };
  const slots = { '#summary': { innerHTML: '' }, '#detail': { innerHTML: '' } };
  runInNewContext(`${renderer}\nrenderSurface('test-roster');`, {
    surface: () => fixture, setDocumentTitle: () => {}, $: id => slots[id],
    metricPanel: () => '', partitionParticipantRows, labelActor: id => id,
    labelOrg: id => id, esc: value => String(value ?? ''), entityHeading: () => '',
    entityReceiptIds: () => [], renderReceiptGrid: () => '<div>receipt sentinel</div>',
  });
  const rendered = slots['#detail'].innerHTML;
  assert.equal((rendered.match(/<li>/g) ?? []).length, count, 'no participant record may disappear');
  assert.match(rendered, /receipt sentinel/, 'surface receipts remain accessible');
  if (count > 18) {
    const remainingCount = count - 18;
    const remainingNoun = remainingCount === 1 ? 'record' : 'records';
    assert.match(rendered, /<details class="participant-overflow"><summary>/);
    assert.ok(rendered.includes(`Show remaining ${remainingCount} participant ${remainingNoun}`));
    assert.equal((rendered.split('<details')[0].match(/<li>/g) ?? []).length, 18);
  } else assert.ok(!rendered.includes('participant-overflow'), 'small rosters need no disclosure');
}
console.log('participant disclosure renderer: five roster sizes retain every row');
