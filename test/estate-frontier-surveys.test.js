import assert from 'node:assert/strict';
import { buildEstateFrontierSurveys } from '../tools/build-estate-frontier-surveys.mjs';
const first = buildEstateFrontierSurveys();
const second = buildEstateFrontierSurveys({ write: false });
assert.deepEqual(second, first, 'frontier survey build must be deterministic');
assert.deepEqual(first.manifest.counts, {
  estates: 10,
  source_route_uses: 68,
  unique_route_labels: 50,
  canonical_source_families: 50,
  raw_records_acquired: 0,
  overlap_hypotheses: 40,
});
assert.equal(first.manifest.waterline.current, 'surveyed_and_prepared');
assert.equal(first.manifest.waterline.next, 'bounded_source_acquisition');
for (const packet of first.packets) {
  assert.equal(packet.status, 'surveyed_and_prepared');
  assert.equal(packet.preparation_state.raw_records_acquired, 0);
  assert.ok(packet.source_routes.length >= 6);
  assert.ok(packet.denominator_contract.required_null_controls.length >= 3);
  assert.equal(packet.graph_effect, 'none');
  assert.equal(packet.conclusion_generated, false);
}
console.log('estate-frontier-surveys.test: OK');
