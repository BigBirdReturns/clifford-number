import assert from 'node:assert/strict';
import fs from 'node:fs';
import { buildEstateClosures } from '../tools/build-estate-closures.mjs';
import { readJson } from '../tools/lib/ledger.mjs';

const first = buildEstateClosures();
const second = buildEstateClosures({ write: false });
assert.deepEqual(second, first, 'estate closure compiler must be deterministic');
assert.equal(first.manifest.counts.estates, 14);
assert.equal(first.manifest.counts.tasks, 143);
assert.equal(first.manifest.counts.route_uses, 87);
assert.equal(first.manifest.counts.surface_complete_tasks, 14);
assert.equal(first.manifest.counts.partially_searched_tasks, 129);
assert.equal(first.apertureData.corridors.length, 34);
assert.ok(first.apertureData.corridors.every(row => row.graph_effect === 'none'));
assert.equal(first.apertureData.interpretation_contract.closure_is_not_estate_completion, true);

for (const packet of first.packets) {
  assert.equal(packet.pass_status, 'bounded_pass_complete');
  assert.equal(packet.estate_status, 'open_residual_fog');
  assert.equal(packet.graph_effect, 'none');
  assert.equal(packet.conclusion_generated, false);
  assert.equal(packet.tasks.filter(task => task.closure_state === 'surface_complete').length, 1);
  assert.equal(packet.tasks.at(-1).task_kind, 'candidate_packet');
  assert.equal(packet.tasks.at(-1).dependencies.length, packet.tasks.length - 1);
  assert.ok(fs.existsSync(`issue-handoffs/${String(packet.issue.number).padStart(2, '0')}-${packet.estate_id}.md`));
}

assert.deepEqual(readJson('build/estate-closures/manifest.json'), first.manifest);
assert.deepEqual(readJson('estates/data.json'), first.apertureData);
console.log('estate-closures.test: OK');
