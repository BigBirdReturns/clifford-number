import assert from 'node:assert/strict';
import { buildProduct, TARGET_STATES } from '../tools/build-status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-capture-adjudication.mjs';
import { validateObjectSet } from '../tools/validate-status-sovereignty-rd-wave03-rd04-ar-ga-md-nc-pa-ri-wv-capture-adjudication.mjs';

const { objects: baseline } = await buildProduct(process.cwd());
validateObjectSet(baseline);

let refused = 0;
function expectRefusal(mutator, label) {
  const candidate = structuredClone(baseline);
  mutator(candidate);
  let rejected = false;
  try {
    validateObjectSet(candidate);
  } catch {
    rejected = true;
  }
  assert(rejected, `mutation was not refused: ${label}`);
  refused += 1;
}

const routeMutations = [
  (route) => { route.route_decision_ordinal += 100; },
  (route) => { route.state_scope = 'ZZ'; },
  (route) => { route.route_category = `${route.route_category}-drift`; },
  (route) => { route.final_url = route.final_url ? `${route.final_url}#drift` : 'https://invalid.example/drift'; },
  (route) => { route.final_host = route.final_host ? `${route.final_host}.invalid` : 'invalid.example'; },
  (route) => { route.http_status = route.http_status === null ? 200 : route.http_status + 1; },
  (route) => { route.body_bytes += 1; },
  (route) => { route.body_sha256 = '0'.repeat(64); },
  (route) => { route.headers_sha256 = 'f'.repeat(64); },
  (route) => { route.capture_state_before = `${route.capture_state_before}-drift`; },
];

for (let i = 0; i < baseline.decisions.route_decisions.length; i += 1) {
  for (let j = 0; j < routeMutations.length; j += 1) {
    expectRefusal(
      (candidate) => routeMutations[j](candidate.decisions.route_decisions[i]),
      `route-${i + 1}-mutation-${j + 1}`,
    );
  }
}

const fieldMutations = [
  (field) => { field.field_decision_ordinal += 100; },
  (field) => { field.target_cell_id = `${field.target_cell_id}-drift`; },
  (field) => { field.postal_code = 'ZZ'; },
  (field) => { field.field_id = 'invented_field'; },
  (field) => { field.state_before = 'observed'; },
  (field) => { field.terminal_state = 'invented_terminal_state'; },
  (field) => { field.terminal_after = false; },
  (field) => { field.evidence_route_ids = ['RD04-W03-MF7-001']; },
  (field) => { field.typed_gap = field.terminal_state === 'observed' ? 'invented_gap' : null; },
  (field) => { field.publication_effect = 'publish'; },
];

for (let i = 0; i < baseline.decisions.field_decisions.length; i += 1) {
  for (let j = 0; j < fieldMutations.length; j += 1) {
    expectRefusal(
      (candidate) => fieldMutations[j](candidate.decisions.field_decisions[i]),
      `field-${i + 1}-mutation-${j + 1}`,
    );
  }
}

const globalMutations = [
  (candidate, n) => { candidate.decisions.counts.route_decisions = 30 + n; },
  (candidate, n) => { candidate.captureCustody.counts.fixed_routes = 30 + n; },
  (candidate, n) => { candidate.visualReview.pdf_routes = 4 + n; },
  (candidate, n) => { candidate.summary.composition.terminal_cells_after = 211 + n; },
  (candidate) => { candidate.summary.class_closed = true; },
  (candidate, n) => { candidate.matrix.counts.terminal_cells = 211 + n; },
  (candidate, n) => { candidate.matrix.current_result.still_open_substantive_cells = 192 + n; },
  (candidate, n) => { candidate.census.counts.still_open_cells = 239 + n; },
  (candidate, n) => { candidate.index.counts.target_cells = 21 + n; },
  (candidate, n) => { candidate.terminalLedger.counts.target_cells = 21 + n; },
  (candidate, n) => { candidate.manifest.manifest_entries = 11 + n; },
  (candidate) => { candidate.routeAdjudications.pop(); },
  (candidate) => { candidate.matrix.rows.pop(); },
  (candidate, n) => {
    const row = candidate.matrix.rows.find((entry) => entry.postal_code === TARGET_STATES[0]);
    row.terminal_fields = 8 + n;
  },
  (candidate) => {
    const row = candidate.matrix.rows.find((entry) => entry.postal_code === TARGET_STATES[1]);
    row.cells.find((cell) => cell.field_id === 'field_and_row_terminal_state').typed_gap = 'invented_row_gap';
  },
  (candidate) => { candidate.decisions.authority.outside_human_dependency = true; },
  (candidate, n) => { candidate.manifest.file_set_combined_sha256 = String(n).repeat(64).slice(0, 64); },
];

for (let round = 1; round <= 9; round += 1) {
  for (let i = 0; i < globalMutations.length; i += 1) {
    expectRefusal(
      (candidate) => globalMutations[i](candidate, round),
      `global-round-${round}-mutation-${i + 1}`,
    );
  }
}

assert.equal(refused, 663);
console.log(`adversarial_mutations_refused=${refused}`);
