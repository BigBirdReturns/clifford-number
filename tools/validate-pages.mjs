#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const destination = path.join(root, 'dist');
const required = [
  'index.html', 'Clifford-Number-standalone.html', 'app.js', 'styles.css', '.nojekyll',
  'build/surface-graph.json', 'build/hop-graph.json', 'build/receipt-graph.json',
  'build/public-catalog.json', 'build/cases/index.json', 'build/cases/field-autopsy-03.json',
  'build/cases/uk-ai-policy.json',
  'build/thesis/synthetic-population-infrastructure.json',
  'build/thesis/synthetic-population-infrastructure.md',
  'data/research/theses/synthetic-population-infrastructure.json',
  'data/research/thesis-evidence/synthetic-population-infrastructure.json',
  'data/research/thesis-reviews/synthetic-population-infrastructure.json',
  'legacy/graph.edge-model.json', 'legacy/uk-ai-policy.edge-model.json',
  'src/ui-utils.js', 'src/i18n.js', 'src/aperture-bootstrap.js', 'src/visual-aperture-core.mjs',
  'src/visual-aperture-state.mjs', 'src/visual-aperture-workspace.mjs',
  'src/visual-aperture-export.mjs',
  'src/visual-aperture-workspace-runtime.js', 'src/visual-aperture-export-runtime.js', 'src/visual-aperture.js',
  ...Array.from({ length: 11 }, (_, index) => `src/visual-aperture-part-${index + 1}.js`),
  'src/visual-aperture.css', 'src/visual-aperture-layout.css', 'src/visual-aperture-svg.css',
  'src/visual-aperture-responsive.css', 'src/visual-aperture-workspace.css', 'src/visual-aperture-export.css',
  'assets/social-card.png', 'docs/methodology.md', 'docs/thesis-assembly.md', 'cases/field-autopsy-03/case.json'
];
const missing = required.filter(file => !fs.existsSync(path.join(destination, file)));
if (missing.length) {
  console.error(`validate-pages failed: missing ${missing.join(', ')}`);
  process.exit(1);
}
for (const forbidden of ['data/crawl', 'data/intake', 'data/local', 'receipts/crawl']) {
  if (fs.existsSync(path.join(destination, forbidden))) {
    console.error(`validate-pages failed: intake path ${forbidden} must not be published`);
    process.exit(1);
  }
}
const html = fs.readFileSync(path.join(destination, 'index.html'), 'utf8');
const app = fs.readFileSync(path.join(destination, 'app.js'), 'utf8');
const i18n = fs.readFileSync(path.join(destination, 'src', 'i18n.js'), 'utf8');
const apertureBootstrap = fs.readFileSync(path.join(destination, 'src', 'aperture-bootstrap.js'), 'utf8');
const apertureEntry = fs.readFileSync(path.join(destination, 'src', 'visual-aperture.js'), 'utf8');
const apertureState = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-state.mjs'), 'utf8');
const apertureWorkspace = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-workspace.mjs'), 'utf8');
const apertureExport = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-export.mjs'), 'utf8');
const apertureWorkspaceRuntime = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-workspace-runtime.js'), 'utf8');
const apertureExportRuntime = fs.readFileSync(path.join(destination, 'src', 'visual-aperture-export-runtime.js'), 'utf8');
const aperture = [
  apertureWorkspaceRuntime,
  apertureExportRuntime,
  ...Array.from({ length: 11 }, (_, index) => fs.readFileSync(path.join(destination, 'src', `visual-aperture-part-${index + 1}.js`), 'utf8'))
].join('\n');
const standalone = fs.readFileSync(path.join(destination, 'Clifford-Number-standalone.html'), 'utf8');
const thesisBuild = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'thesis', 'synthetic-population-infrastructure.json'), 'utf8'));
const thesisMarkdown = fs.readFileSync(path.join(destination, 'build', 'thesis', 'synthetic-population-infrastructure.md'), 'utf8');
const ukAiCase = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'cases', 'uk-ai-policy.json'), 'utf8'));
const hopGraph = JSON.parse(fs.readFileSync(path.join(destination, 'build', 'hop-graph.json'), 'utf8'));
const legacyGraph = JSON.parse(fs.readFileSync(path.join(destination, 'graph.json'), 'utf8'));
const legacyEdgeModels = [
  JSON.parse(fs.readFileSync(path.join(destination, 'legacy', 'graph.edge-model.json'), 'utf8')),
  JSON.parse(fs.readFileSync(path.join(destination, 'legacy', 'uk-ai-policy.edge-model.json'), 'utf8')),
];
if (!html.includes('id="main-content"') || !app.includes('build/public-catalog.json')) {
  console.error('validate-pages failed: public entrypoint does not expose the explorer and compiled cases');
  process.exit(1);
}
if (!apertureBootstrap.includes("import('./visual-aperture.js")
  || !html.includes('src="src/aperture-bootstrap.js')
  || !apertureEntry.includes("import * as addressState from './visual-aperture-state.mjs'")
  || !apertureEntry.includes("import * as workspaceModel from './visual-aperture-workspace.mjs'")
  || !apertureEntry.includes("import * as exportModel from './visual-aperture-export.mjs'")
  || !apertureEntry.includes('visual-aperture-workspace-runtime.js')
  || !apertureEntry.includes('visual-aperture-export-runtime.js')
  || !apertureEntry.includes('visual-aperture-part-${index + 1}.js')
  || !aperture.includes('Map the system. Keep the receipt attached.')) {
  console.error('validate-pages failed: integrated visual aperture is not wired into the public runtime');
  process.exit(1);
}
if (!apertureState.includes("APERTURE_STATE_VERSION = '1'")
  || !apertureState.includes('buildApertureUrl')
  || !aperture.includes('Copy exact view')
  || !aperture.includes("addEventListener('popstate'")) {
  console.error('validate-pages failed: aperture exact-view URL contract is missing');
  process.exit(1);
}
if (!apertureWorkspace.includes("APERTURE_WORKSPACE_VERSION = '1'")
  || !apertureWorkspace.includes("APERTURE_WORKSPACE_STORAGE_KEY = 'clifford-aperture-workspace'")
  || !apertureWorkspaceRuntime.includes('Save the view, not a new finding.')
  || !apertureWorkspaceRuntime.includes('Route results are always recomputed from the current compiled graph.')
  || !aperture.includes('Reset local workspace')) {
  console.error('validate-pages failed: local operator workspace contract is missing');
  process.exit(1);
}
if (!apertureExport.includes("APERTURE_EXPORT_SCHEMA_VERSION = 'clifford-aperture-export@1'")
  || !apertureExport.includes('buildApertureExportPacket')
  || !apertureExport.includes('graph_effect: \'none\'')
  || !apertureExportRuntime.includes('Export the view with its limits attached.')
  || !apertureExportRuntime.includes('Copy evidence JSON')
  || !apertureExportRuntime.includes('Print packet')
  || !apertureExportRuntime.includes('temporal_input_valid')) {
  console.error('validate-pages failed: caveated aperture publication export contract is missing');
  process.exit(1);
}
if (i18n.includes('visual-aperture')) {
  console.error('validate-pages failed: localization module must stay free of aperture bootstrap side effects');
  process.exit(1);
}
if (!standalone.includes('data-portable-release="true"') || !standalone.includes('const EMBEDDED_DATA =') || /src="app\.js(?:\?[^\"]*)?"/.test(standalone)) {
  console.error('validate-pages failed: standalone release is not self-contained');
  process.exit(1);
}
if (!standalone.includes('globalThis.__CLIFFORD_APERTURE_BUNDLED__ = true')
  || !standalone.includes('Map the system. Keep the receipt attached.')
  || !standalone.includes("APERTURE_STATE_VERSION = '1'")
  || !standalone.includes("APERTURE_WORKSPACE_VERSION = '1'")
  || !standalone.includes("APERTURE_EXPORT_SCHEMA_VERSION = 'clifford-aperture-export@1'")
  || !standalone.includes('Local operator workspace')
  || !standalone.includes('Export the view with its limits attached.')
  || !standalone.includes('Copy exact view')
  || /<(?:script|link)[^>]+(?:src|href)="[^"]*visual-aperture/.test(standalone)) {
  console.error('validate-pages failed: standalone release omits or externally references the operator aperture');
  process.exit(1);
}
if (thesisBuild.schema_version !== 'clifford-thesis-build@1'
  || thesisBuild.thesis_id !== 'synthetic-population-infrastructure'
  || thesisBuild.graph_effect !== 'none'
  || thesisBuild.conclusion_generated !== false
  || thesisBuild.bottom_line_generated !== false
  || thesisBuild.machine_synthesis_ceiling !== 'eligible_for_human_synthesis'
  || thesisBuild.counts?.case_contracts !== 18
  || thesisBuild.counts?.propositions !== 6
  || !thesisMarkdown.includes('Machine conclusion generated: false')) {
  console.error('validate-pages failed: compiled thesis dossier exceeds or omits its assembly contract');
  process.exit(1);
}
if (!standalone.includes('href="data:image/svg+xml;base64,') || standalone.includes('href="assets/favicon.svg"')) {
  console.error('validate-pages failed: standalone favicon is not embedded');
  process.exit(1);
}
if (!standalone.includes('legacy-uk-ai-policy@1') || !standalone.includes('all 50 recommendations')) {
  console.error('validate-pages failed: standalone release omits the public UK AI policy case');
  process.exit(1);
}
if (ukAiCase.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.') {
  console.error('validate-pages failed: UK AI case framing exceeds the published evidence model');
  process.exit(1);
}
if (legacyGraph.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.'
  || legacyEdgeModels.some(item => item.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.')
  || standalone.includes('Seven degrees of UK AI state capture, with receipts.')) {
  console.error('validate-pages failed: stale state-capture framing remains in the public payload');
  process.exit(1);
}
const refusal = (hopGraph.rejected_hop_pairs ?? []).find(item => item.actor_a === 'dan-rosenfield' && item.actor_b === 'dominic-cummings');
if (refusal?.actor_a_window?.valid_from !== '2021-01-01'
  || refusal?.actor_b_window?.valid_from !== '2019-01-01'
  || !Array.isArray(refusal?.receipt_ids)
  || refusal.receipt_ids.length === 0
  || refusal.publication_status !== 'review_required'
  || refusal.actor_a_window_reverifiable !== false
  || refusal.actor_b_window_reverifiable !== false) {
  console.error('validate-pages failed: Rosenfield/Cummings refusal is misattributed or improperly promoted');
  process.exit(1);
}
console.log(`validate-pages: OK (${required.length} required artifacts)`);
