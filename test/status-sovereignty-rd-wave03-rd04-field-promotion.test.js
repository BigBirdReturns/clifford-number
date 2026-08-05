#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  loadInputs,
  validateInputs,
  deriveProducts,
  validateProducts,
  cloneInputs,
  EXPECTED_CANDIDATE_IDS,
} from '../tools/build-status-sovereignty-rd-wave03-rd04-field-promotion.mjs';

const inputs = loadInputs();
validateInputs(inputs);
const products = deriveProducts(inputs);
validateProducts(products, inputs);

let refusals = 0;
function mustRefuseInput(name, mutate) {
  const changed = cloneInputs(inputs);
  mutate(changed);
  assert.throws(() => validateInputs(changed), undefined, name);
  refusals += 1;
}
function mustRefuseProduct(name, mutate) {
  const changed = structuredClone(products);
  mutate(changed);
  assert.throws(() => validateProducts(changed, inputs), undefined, name);
  refusals += 1;
}

// 38 candidates × 10 exact-custody and authority mutations = 380 refusals.
for (let index = 0; index < 38; index += 1) {
  const candidateMutations = [
    (x) => { x.candidates.rows[index].source_decision_id = 'RD04-W03-FIELD-999'; },
    (x) => { x.candidates.rows[index].route_id = 'RD04-W03-LINK-999'; },
    (x) => { x.candidates.rows[index].unit_id = 'US-STATE-ZZ'; },
    (x) => { x.candidates.rows[index].field_id = 'invented_field'; },
    (x) => { x.candidates.rows[index].candidate_bounded_finding = 'too short'; },
    (x) => { x.candidates.rows[index].source_locator.body_sha256 = '0'.repeat(64); },
    (x) => { x.candidates.rows[index].source_locator.review_text_lines = 0; },
    (x) => { x.candidates.rows[index].promotion_authority = true; },
    (x) => { x.candidates.rows[index].matrix_effect = 'promoted_without_review'; },
    (x) => { delete x.candidates.rows[index].current_matrix_cell; },
  ];
  for (let mutation = 0; mutation < candidateMutations.length; mutation += 1) {
    mustRefuseInput(`candidate-${index + 1}-mutation-${mutation + 1}`, candidateMutations[mutation]);
  }
}

// 38 promotion decisions × 14 authority/custody mutations = 532 refusals.
for (let index = 0; index < 38; index += 1) {
  const decisionMutations = [
    (x) => { x.promotionDecisions.decisions[index].promotion_decision_ordinal += 100; },
    (x) => { x.promotionDecisions.decisions[index].candidate_decision_id = 'RD04-W03-FIELD-999'; },
    (x) => { x.promotionDecisions.decisions[index].route_id = 'RD04-W03-LINK-999'; },
    (x) => { x.promotionDecisions.decisions[index].unit_id = 'US-STATE-ZZ'; },
    (x) => { x.promotionDecisions.decisions[index].candidate_field = 'invented_field'; },
    (x) => { x.promotionDecisions.decisions[index].finding_code += '_tampered'; },
    (x) => { x.promotionDecisions.decisions[index].source_body_sha256 = 'f'.repeat(64); },
    (x) => { x.promotionDecisions.decisions[index].evidence_locators = []; },
    (x) => { x.promotionDecisions.decisions[index].field_cell_state_before = 'evidence_complete'; },
    (x) => { x.promotionDecisions.decisions[index].promotion_outcome = 'promote_everything'; },
    (x) => { x.promotionDecisions.decisions[index].promotion_reason_code = 'identity_heat'; },
    (x) => { x.promotionDecisions.decisions[index].promotion_reason_summary = 'too short'; },
    (x) => { x.promotionDecisions.decisions[index].field_cell_state_after = 'closed'; },
    (x) => { x.promotionDecisions.decisions[index].field_terminalization_effect = 'national_prevalence'; },
  ];
  for (let mutation = 0; mutation < decisionMutations.length; mutation += 1) {
    mustRefuseInput(`decision-${index + 1}-mutation-${mutation + 1}`, decisionMutations[mutation]);
  }
}

// 50 predecessor rows × 7 denominator/state mutations = 350 refusals.
for (let index = 0; index < 50; index += 1) {
  const rowMutations = [
    (x) => { x.baseMatrix.rows[index].unit_id = 'US-STATE-ZZ'; },
    (x) => { x.baseMatrix.rows[index].postal_code = 'ZZ'; },
    (x) => { x.baseMatrix.rows[index].state_name += ' tampered'; },
    (x) => { x.baseMatrix.rows[index].unit_ordinal += 100; },
    (x) => { x.baseMatrix.rows[index].row_state = 'closed'; },
    (x) => { x.baseMatrix.rows[index].terminal_fields = 3; },
    (x) => { x.baseMatrix.rows[index].cells[1].field_id = 'invented_field'; },
  ];
  for (let mutation = 0; mutation < rowMutations.length; mutation += 1) {
    mustRefuseInput(`base-row-${index + 1}-mutation-${mutation + 1}`, rowMutations[mutation]);
  }
}

// 50 successor rows and 37 promotion-ledger cells must remain byte-derived.
for (let index = 0; index < 50; index += 1) {
  mustRefuseProduct(`promoted-matrix-row-${index + 1}`, (x) => {
    x['promoted-partial-field-matrix.json'].rows[index].open_fields += 1;
  });
}
for (let index = 0; index < 37; index += 1) {
  mustRefuseProduct(`promotion-ledger-cell-${index + 1}`, (x) => {
    x['cell-promotion-ledger.json'].cells[index].promotion_outcome = 'promoted_by_identity_heat';
  });
}

// Eight global custody/ordering/authority mutations complete the 1,357-case corpus.
const globalMutations = [
  (x) => { x.promotionCustody.schema_version = 'tampered'; },
  (x) => { x.baseMatrix.counts.terminal_cells = 101; },
  (x) => { x.candidates.candidate_rows = 37; },
  (x) => { x.promotionDecisions.schema_version = 'tampered'; },
  (x) => { [x.promotionDecisions.decisions[0], x.promotionDecisions.decisions[1]] = [x.promotionDecisions.decisions[1], x.promotionDecisions.decisions[0]]; },
  (x) => { [x.candidates.rows[0], x.candidates.rows[1]] = [x.candidates.rows[1], x.candidates.rows[0]]; },
  (x) => { [x.baseMatrix.rows[0], x.baseMatrix.rows[1]] = [x.baseMatrix.rows[1], x.baseMatrix.rows[0]]; },
  (x) => { x.promotionCustody.empirical_requests = 1; },
];
for (let index = 0; index < globalMutations.length; index += 1) {
  mustRefuseInput(`global-mutation-${index + 1}`, globalMutations[index]);
}

assert.equal(refusals, 1357);
assert.equal(EXPECTED_CANDIDATE_IDS.length, 38);
assert.equal(products['cell-promotion-ledger.json'].counts.promoted_cells, 31);
assert.equal(products['cell-promotion-ledger.json'].counts.held_cells, 6);
assert.equal(products['promoted-partial-field-matrix.json'].counts.terminal_cells, 131);
assert.equal(products['remaining-open-field-census.json'].counts.substantive_fields_still_open, 269);
assert.equal(products['promotion-summary.json'].current_result.class_closed, false);

console.log('rd04_field_promotion_tests=pass');
console.log(`adversarial_mutations_refused=${refusals}`);
console.log('candidate_findings=38');
console.log('promoted_candidate_findings=32');
console.log('held_candidate_findings=6');
console.log('unique_cells_terminalized=31');
console.log('terminal_cells=131/450');
console.log('still_open_substantive_fields=269');
console.log('terminal_units=0');
console.log('class_closed=false');
