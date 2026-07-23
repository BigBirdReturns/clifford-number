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
assert.equal(first.apertureData.registry.scope, 'closed_m01_estates_only');
assert.equal(first.apertureData.registry.counts.estates, 14);
assert.equal(first.apertureData.registry.counts.frontier_estates, 0);
assert.equal(first.manifest.source_registry_scope, 'closed_m01_estates_only');
assert.equal(first.manifest.route_registry_scope, 'closed_m01_routes_only');

const closedEstateIds = new Set(first.packets.map(packet => packet.estate_id));
const frontierEstateIds = new Set(
  readJson('build/estates/index.json').estates
    .filter(estate => estate.generation === 'frontier')
    .map(estate => estate.estate_id),
);
assert.equal([...closedEstateIds].some(estateId => frontierEstateIds.has(estateId)), false);
assert.equal(
  first.packets.some(packet => packet.source_routes.some(route =>
    (route.used_by_estate_ids ?? []).some(estateId => !closedEstateIds.has(estateId)))),
  false,
  'M-01 packets must not expose frontier estate use through shared source routes',
);
assert.equal(
  JSON.stringify(first).includes('surveyed_frontier_corpus'),
  false,
  'M-01 closure products must remain semantically isolated from M-02 frontier estates',
);

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
