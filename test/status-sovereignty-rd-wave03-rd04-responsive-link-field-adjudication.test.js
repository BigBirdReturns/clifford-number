#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  loadInputs, validateInputs, deriveProduct,
} from '../tools/build-status-sovereignty-rd-wave03-rd04-responsive-link-field-adjudication.mjs';

function clone(value) {
  return structuredClone(value);
}
function mustRefuse(name, mutate) {
  const inputs = clone(BASE);
  mutate(inputs);
  assert.throws(() => validateInputs(inputs), undefined, name);
  refusals += 1;
}

const BASE = loadInputs();
validateInputs(clone(BASE));
const derived = deriveProduct(clone(BASE));
const index = JSON.parse(derived['index.json']);
const promotion = JSON.parse(derived['promotion-candidate-protocol.json']);
assert.equal(index.counts.candidate_source_field_pairs, 127);
assert.equal(index.counts.evidence_complete_bounded_finding, 38);
assert.equal(index.counts.partial_support_hold_open, 18);
assert.equal(index.counts.temporal_or_scope_ambiguity_hold_open, 19);
assert.equal(index.counts.no_relevant_support_hold_open, 52);
assert.equal(index.counts.matrix_updates, 0);
assert.equal(index.counts.terminal_field_cells_after, 100);
assert.equal(promotion.rows.length, 38);
assert(promotion.rows.every((row) => row.current_matrix_cell.state === 'still_open' && row.matrix_effect === 'none'));

let refusals = 0;
for (let i = 0; i < 127; i += 1) {
  const label = `decision-${String(i + 1).padStart(3, '0')}`;
  const mutations = [
    ['id', (x) => { x.authored.decisions[i].decision_id += '-tampered'; }],
    ['ordinal', (x) => { x.authored.decisions[i].decision_ordinal += 1; }],
    ['route', (x) => { x.authored.decisions[i].route_id += '-tampered'; }],
    ['unit', (x) => { x.authored.decisions[i].unit_id = 'US-STATE-ZZ'; }],
    ['field', (x) => { x.authored.decisions[i].field_id = 'tampered_field'; }],
    ['disposition', (x) => { x.authored.decisions[i].disposition = 'tampered_disposition'; }],
    ['basis', (x) => { x.authored.decisions[i].evidence_basis = ''; }],
    ['limitation', (x) => { x.authored.decisions[i].counterevidence_or_limitation = ''; }],
    ['body-sha', (x) => { x.authored.decisions[i].source_locator.body_sha256 = '0'.repeat(64); }],
    ['review-sha', (x) => { x.authored.decisions[i].source_locator.review_text_sha256 = '0'.repeat(64); }],
    ['promotion-candidate', (x) => { x.authored.decisions[i].promotion_candidate = !x.authored.decisions[i].promotion_candidate; }],
    ['promotion-authority', (x) => { x.authored.decisions[i].promotion_authority = true; }],
    ['matrix-effect', (x) => { x.authored.decisions[i].matrix_effect = 'changed'; }],
    ['terminalization', (x) => { x.authored.decisions[i].field_terminalization_effect = 'changed'; }],
    ['outside-human', (x) => { x.authored.decisions[i].outside_human_dependency = true; }],
    ['graph-effect', (x) => { x.authored.decisions[i].graph_effect = 'changed'; }],
  ];
  for (const [suffix, mutate] of mutations) mustRefuse(`${label}-${suffix}`, mutate);
}

const globals = [
  ['remove-decision', (x) => { x.authored.decisions.pop(); }],
  ['duplicate-decision-id', (x) => { x.authored.decisions[1].decision_id = x.authored.decisions[0].decision_id; }],
  ['reorder-decisions', (x) => { [x.authored.decisions[0], x.authored.decisions[1]] = [x.authored.decisions[1], x.authored.decisions[0]]; }],
  ['remove-review-source', (x) => { x.authored.review_sources.pop(); }],
  ['duplicate-review-route', (x) => { x.authored.review_sources[1].route_id = x.authored.review_sources[0].route_id; }],
  ['authored-pair-count', (x) => { x.authored.counts.candidate_source_field_pairs = 126; }],
  ['protocol-review-order', (x) => { [x.protocol.review_rows[0], x.protocol.review_rows[1]] = [x.protocol.review_rows[1], x.protocol.review_rows[0]]; }],
  ['matrix-terminal-count', (x) => { x.partialMatrix.counts.terminal_cells = 101; }],
  ['capture-final-url', (x) => { x.captureRoutes.routes.find((row) => row.route_id === x.authored.review_sources[0].route_id).final_url += '?tampered=1'; }],
  ['source-index-review-count', (x) => { x.sourceIndex.counts.offline_field_review_sources = 35; }],
  ['matrix-update-authority', (x) => { x.authored.authority.matrix_update_authority = true; }],
  ['spawned-request-count', (x) => { x.authored.counts.result_spawned_requests = 1; }],
  ['publication-effect', (x) => { x.authored.authority.publication_effect = 'changed'; }],
  ['prevalence-effect', (x) => { x.authored.authority.national_prevalence_effect = 'changed'; }],
  ['predecessor-merge', (x) => { x.authored.predecessor_source_adjudication_merge = '0'.repeat(40); }],
  ['schema', (x) => { x.authored.schema_version = 'tampered'; }],
];
for (const [name, mutate] of globals) mustRefuse(name, mutate);

assert.equal(refusals, 2048);
console.log('responsive_link_field_adjudication_tests=pass');
console.log(`adversarial_mutations_refused=${refusals}`);
console.log('review_sources=36');
console.log('candidate_source_field_pairs=127');
console.log('evidence_complete_bounded_finding=38');
console.log('partial_support_hold_open=18');
console.log('temporal_or_scope_ambiguity_hold_open=19');
console.log('no_relevant_support_hold_open=52');
console.log('matrix_updates=0');
console.log('class_closed=false');
