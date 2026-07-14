import assert from 'node:assert/strict';
import { loadCliffordThielTrumpWrapUp, validateCliffordThielTrumpWrapUp } from '../tools/lib/clifford-thiel-trump-wrap-up.mjs';

const baseline = loadCliffordThielTrumpWrapUp();
assert.deepEqual(validateCliffordThielTrumpWrapUp(baseline), []);

function expectFailure(label, mutate, pattern) {
  const bundle = structuredClone(baseline);
  mutate(bundle);
  const errors = validateCliffordThielTrumpWrapUp(bundle);
  assert.match(errors.join('\n'), pattern, label);
}

expectFailure('dense Dialog roster cannot become a hop', bundle => {
  bundle.surfaces.find(row => row.surface_id === 'dialog-society-membership').hop_eligible = true;
}, /Dialog dense roster must remain non-hop context/);

expectFailure('unsupported Faculty shortcut cannot return', bundle => {
  bundle.participation.push({
    surface_id: 'faculty-investor-employee-2015-2019',
    actor_id: 'matt-clifford',
    participant_type: 'actor',
  });
}, /unsupported Matt Clifford Faculty participation must remain excluded/);

expectFailure('Peter cannot receive a fabricated Clifford Number', bundle => {
  bundle.scores.actors.find(row => row.actor_id === 'peter-thiel').clifford_number = 1;
}, /must not be assigned a Clifford path/);

expectFailure('Trump cannot be silently inserted into the surface ledger', bundle => {
  bundle.participation.push({ surface_id: 'dialog-society-membership', actor_id: 'donald-trump' });
}, /cannot be claimed as a surface-ledger participant/);

expectFailure('crossing count cannot be promoted without changing the conclusion', bundle => {
  bundle.coverage.coverage.crossing_matches = 1;
}, /expects zero promoted office-business crossings/);

expectFailure('the 8 x 5 matrix cannot hide a missing predicate cell', bundle => {
  bundle.dispositionMatrix.rows[0].cells.pop();
}, /must contain all 8 x 5 cells|must cover all five predicates/);

expectFailure('the matrix cannot promote a crossing', bundle => {
  bundle.dispositionMatrix.positive_crossing_count = 1;
}, /cannot promote a crossing/);

expectFailure('stale intake cannot overrule the authoritative Dialog surface', bundle => {
  bundle.candidates.candidates.find(row => row.id === 'candidate-dialog-roster-hop-weighting-audit').hop_eligible = true;
}, /topology-audit candidate contradicts/);

expectFailure('triple path remains rejected under current evidence', bundle => {
  bundle.wrap.evaluated_paths.find(row => row.path_id === 'clifford-thiel-trump-triple').disposition = 'finding';
}, /must remain no_material_three_person_path/);

console.log('clifford-thiel-trump-wrap-up.test.js: OK');
