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
  'legacy/graph.edge-model.json', 'legacy/uk-ai-policy.edge-model.json',
  'src/ui-utils.js', 'src/i18n.js', 'assets/social-card.png',
  'docs/methodology.md', 'cases/field-autopsy-03/case.json'
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
const standalone = fs.readFileSync(path.join(destination, 'Clifford-Number-standalone.html'), 'utf8');
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
if (!standalone.includes('data-portable-release="true"') || !standalone.includes('const EMBEDDED_DATA =') || /src="app\.js(?:\?[^\"]*)?"/.test(standalone)) {
  console.error('validate-pages failed: standalone release is not self-contained');
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
