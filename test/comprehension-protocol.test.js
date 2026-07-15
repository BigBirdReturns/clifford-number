import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateComprehensionSession } from '../tools/validate-comprehension-session.mjs';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').trim().split(/\r?\n/).filter(Boolean).map(JSON.parse);

for (const [file, expected] of [
  ['comprehension/fixtures/valid-ready.json', 'READY_FOR_ADJUDICATION'],
  ['comprehension/fixtures/missing-precommit.json', 'INCONCLUSIVE'],
  ['comprehension/fixtures/contaminated.json', 'INADMISSIBLE'],
  ['comprehension/fixtures/semantic-failure.json', 'FAIL']
]) {
  assert.equal(validateComprehensionSession(readJson(file)).state, expected, file);
}

const route = readJson('comprehension/routes/dialog-structural-context.json');
const claim = readJson('comprehension/claims/dialog-structural-context-c2-c3.json');
assert.equal(route.status, 'phase_0_internal_harness');
assert.equal(route.public_exposure, false);
assert.equal(route.expected_result.state, 'bounded_structural_context');
assert.equal(route.expected_result.graph_effect, 'none');
for (const key of ['may_create_pairwise_hop', 'may_change_clifford_number', 'may_enter_pathfinding', 'may_enter_printable_output', 'may_emit_newsroom_narration']) {
  assert.equal(route.expected_result[key], false, `${key} must remain false`);
}
assert.deepEqual(route.neighboring_evidence_audit.referenced_hops, []);
assert.deepEqual(route.neighboring_evidence_audit.referenced_controls, []);
assert.equal(claim.public_claim_authorized, false);
assert.equal(claim.threshold.validator_may_award_pass, false);

const surfaces = readJsonl('data/ledger/surfaces.jsonl');
const directoryRosters = surfaces.filter(surface => surface.surface_type === 'directory_roster_surface' && surface.hop_eligible === false);
assert.equal(directoryRosters.length, 1, 'Route selection universe changed; review the declared selection rule.');
assert.equal(directoryRosters[0].surface_id, route.surface_id);
assert.equal(directoryRosters[0].hop_eligible, false);

const receipts = new Map(readJsonl('data/ledger/receipts.jsonl').map(receipt => [receipt.receipt_id, receipt]));
for (const source of route.evidence) {
  const receipt = receipts.get(source.receipt_id);
  assert.ok(receipt, `missing route receipt: ${source.receipt_id}`);
  assert.equal(receipt.evidence_class, source.required_evidence_class, `${source.receipt_id} evidence class changed`);
}

const graph = readJson('build/hop-graph.json');
assert.ok(graph.rejected_hop_surfaces.some(surface => surface.surface_id === route.surface_id), 'Dialog must remain an explicit rejected hop surface.');
for (const edge of graph.edges) {
  assert.equal(edge.surfaces.some(surface => surface.surface_id === route.surface_id), false, 'Dialog roster must not enter a compiled edge.');
}

console.log('comprehension-protocol.test.js: OK');
