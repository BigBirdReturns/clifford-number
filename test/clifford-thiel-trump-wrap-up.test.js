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

expectFailure('Dialog directory listing cannot become a hop', bundle => {
  bundle.surfaces.find(row => row.surface_id === 'dialog-public-directory-exposure-2026-06-16').hop_eligible = true;
}, /Dialog directory must remain non-hop context/);

expectFailure('Dialog organization context cannot become an actor endpoint', bundle => {
  bundle.participation.find(row => row.surface_id === 'dialog-public-directory-exposure-2026-06-16'
    && row.organization_id === 'dialog').actor_id = 'peter-thiel';
}, /organization context cannot occupy an actor endpoint/);

expectFailure('the principal trail cannot drop the Austin-Israel corpus', bundle => {
  bundle.wrap.cross_corpus_infrastructure.required_lane_ids = bundle.wrap.cross_corpus_infrastructure.required_lane_ids
    .filter(id => id !== 'austin-israel-defense-vc-corridor');
}, /must link cross-corpus lane austin-israel-defense-vc-corridor/);

expectFailure('the official 2024 shareholding cannot be backdated onto the 2018 role surface', bundle => {
  bundle.participation.push({
    surface_id: 'faculty-science-officer-employee-overlap-2018-01-24',
    actor_id: 'matt-clifford',
    participant_type: 'actor',
  });
}, /cannot be backdated onto the 2018 role surface/);

expectFailure('the ASI Data Science role cannot become a hop without the explicit legal-entity join', bundle => {
  const surface = bundle.surfaces.find(row => row.surface_id === 'faculty-science-officer-employee-overlap-2018-01-24');
  surface.receipt_ids = surface.receipt_ids.filter(id => id !== 'faculty-asi-data-science-legal-identity-08873131');
}, /must carry the explicit ASI Data Science brand-to-company identity receipt/);

expectFailure('Peter cannot receive a fabricated Clifford Number', bundle => {
  bundle.scores.actors.find(row => row.actor_id === 'peter-thiel').clifford_number = 1;
}, /must not be assigned a Clifford path/);

expectFailure('Trump cannot be silently inserted into the surface ledger', bundle => {
  bundle.participation.push({ surface_id: 'dialog-public-directory-exposure-2026-06-16', actor_id: 'donald-trump' });
}, /cannot be claimed as a surface-ledger participant/);

expectFailure('crossing count cannot be promoted without changing the recorded state', bundle => {
  bundle.coverage.coverage.crossing_matches = 1;
}, /expects zero promoted office-business crossings/);

expectFailure('the 8 x 5 matrix cannot hide a missing predicate cell', bundle => {
  bundle.dispositionMatrix.rows[0].cells.pop();
}, /must contain all 8 x 5 cells|must cover all five predicates/);

expectFailure('the matrix cannot promote a crossing', bundle => {
  bundle.dispositionMatrix.positive_crossing_count = 1;
}, /cannot promote a crossing/);

expectFailure('the wrap-up cannot erase the Clifford-Starmer outcome', bundle => {
  bundle.wrap.surviving_outcomes = bundle.wrap.surviving_outcomes.filter(row => row.outcome_id !== 'clifford-starmer-action-plan');
}, /must preserve surviving outcome clifford-starmer-action-plan/);

expectFailure('the compiled graph cannot erase the Clifford-Starmer hop', bundle => {
  bundle.hopGraph.edges = bundle.hopGraph.edges.filter(edge => !([edge.actor_a, edge.actor_b].includes('matt-clifford') && [edge.actor_a, edge.actor_b].includes('keir-starmer')));
}, /compiled Clifford-Starmer Action Plan hop is missing/);

expectFailure('the policy-to-procurement corridor must retain its open join', bundle => {
  bundle.wrap.composite_trails.find(row => row.trail_id === 'policy-to-state-capacity-to-procurement-market').status = 'proven_causal_chain';
}, /must preserve both the structural corridor and its open join/);

expectFailure('uncertainty cannot hide an inferred signal', bundle => {
  bundle.wrap.signals_outside_hop_graph.find(row => row.signal_id === 'policy-market-convergence').visible = false;
}, /must stay visible and graph-inert/);

expectFailure('the legend cannot erase inferred edges', bundle => {
  bundle.wrap.rendering_legend.find(row => row.evidence_state === 'inferred').visible = false;
}, /must keep inferred signals visible/);

expectFailure('the machine cannot generate a public conclusion', bundle => {
  bundle.wrap.public_interpretation_contract.conclusion_generated = true;
}, /must leave conclusions open to public evaluation/);

expectFailure('the evidence trail cannot restore a bottom-line verdict', bundle => {
  bundle.wrap.bottom_line = { finding: 'case closed' };
}, /must not emit a bottom-line verdict/);

expectFailure('stale intake cannot overrule the authoritative Dialog surface', bundle => {
  bundle.candidates.candidates.find(row => row.id === 'candidate-dialog-roster-hop-weighting-audit').hop_eligible = true;
}, /topology-audit candidate contradicts/);

expectFailure('triple path remains rejected under current evidence', bundle => {
  bundle.wrap.evaluated_paths.find(row => row.path_id === 'clifford-thiel-trump-triple').disposition = 'finding';
}, /must remain no_material_three_person_path/);

console.log('clifford-thiel-trump-wrap-up.test.js: OK');
