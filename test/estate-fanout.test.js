import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildEstateFanout } from '../tools/build-estate-fanout.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const first = buildEstateFanout();
const second = buildEstateFanout({ write: false });
assert.deepEqual(second, first, 'estate fan-out must compile deterministically');

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'build/estate-fanout/manifest.json'), 'utf8'));
assert.deepEqual(manifest, first.manifest);
assert.equal(manifest.schema_version, 'estate-fanout-manifest@1');
assert.equal(manifest.graph_effect, 'none');
assert.equal(manifest.conclusion_generated, false);
assert.equal(manifest.promotes_to, 'candidate_only');
assert.equal(manifest.counts.estates, 14);
assert.equal(manifest.counts.existing_estates, 4);
assert.equal(manifest.counts.next_estates, 10);
assert.equal(manifest.counts.denominator_tasks, 14);
assert.equal(manifest.counts.identity_resolution_tasks, 14);
assert.equal(manifest.counts.temporal_and_null_control_tasks, 14);
assert.equal(manifest.counts.candidate_packet_tasks, 14);
assert.equal(manifest.packets.length, 14);
assert.equal(manifest.matrix.include.length, 14);

const registryById = new Map(first.registry.estates.map(estate => [estate.estate_id, estate]));
const packetById = new Map(first.packets.map(packet => [packet.estate_id, packet]));
for (const estate of first.registry.estates) {
  const packet = packetById.get(estate.estate_id);
  assert.ok(packet, `${estate.estate_id} lacks a fan-out packet`);
  assert.equal(packet.issue_title, `[estate fan-out] ${estate.label}`);
  assert.equal(packet.lane, `estate-${estate.estate_id}`);
  assert.equal(packet.task_count, estate.next_acquisition.source_routes.length + 4);
  assert.deepEqual(
    packet.tasks.filter(task => task.task_kind === 'source_acquisition').map(task => task.source_route),
    estate.next_acquisition.source_routes
  );
  assert.ok(packet.tasks.every(task => task.graph_effect === 'none'));
  assert.ok(packet.tasks.every(task => task.conclusion_generated === false));
  assert.ok(packet.tasks.every(task => task.promotes_to === 'candidate_only'));
  assert.ok(packet.tasks.every(task => task.candidate_status === 'intake_only'));
}

const dialog = packetById.get('dialog-estate');
assert.ok(dialog.source_routes.includes('Companies House'));
assert.ok(dialog.source_routes.includes('UK Find a Tender'));
assert.match(dialog.boundary, /listing proves only a listing/i);

const ukDefense = packetById.get('uk-defense-estate');
assert.ok(ukDefense.source_routes.includes('Contracts Finder'));
assert.ok(ukDefense.source_routes.includes('Find a Tender'));
assert.match(ukDefense.decisive_output, /unsuccessful-path controls/i);

const usDefense = packetById.get('us-defense-estate');
assert.equal(registryById.get('us-defense-estate').generation, 'existing');
assert.ok(usDefense.tasks.some(task => task.task_kind === 'identity_resolution'));
assert.ok(usDefense.tasks.some(task => task.task_kind === 'temporal_and_null_controls'));

const localDevelopment = packetById.get('local-development-estate');
assert.ok(localDevelopment.source_routes.includes('recorder and assessor systems'));
assert.ok(localDevelopment.source_routes.includes('bond disclosures'));

for (const id of [
  'transatlantic-defense-innovation-estate',
  'uk-state-market-estate',
  'us-executive-appointments-ethics-estate',
  'us-legislative-political-finance-estate',
  'state-municipal-authority-estate',
  'public-money-industrial-policy-estate',
  'regulatory-markets-estate',
  'venture-capital-corporate-control-estate',
  'offshore-beneficial-ownership-estate',
  'public-interest-crossing-estate'
]) {
  assert.equal(packetById.get(id)?.generation, 'next', `${id} must remain a next-generation estate lane`);
}

assert.equal(
  manifest.counts.source_acquisition_tasks,
  first.registry.estates.reduce((total, estate) => total + estate.next_acquisition.source_routes.length, 0)
);
assert.equal(
  manifest.counts.tasks,
  manifest.counts.source_acquisition_tasks + (first.registry.estates.length * 4)
);

const rendered = first.packets.map(packet => fs.readFileSync(path.join(root, `build/estate-fanout/${packet.estate_id}.md`), 'utf8')).join('\n');
assert.match(rendered, /failed route is not evidence of absence/i);
assert.match(rendered, /Stop before creating a canonical claim/i);
assert.doesNotMatch(rendered, /guilt score|risk score|probability score/i);

console.log(`estate-fanout.test.js: OK (${manifest.counts.estates} estates, ${manifest.counts.tasks} tasks, ${manifest.counts.source_acquisition_tasks} source routes)`);
