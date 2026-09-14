import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildSocialFieldModel, buildEcologyEventModel, activeEcologyEvents, ecologyEventsForNode, ecologyPlayheadLabel, isSurfaceNode, socialFieldNeighbors } from '../src/social-field.js';

const nodes = [
  { id: 'a', label: 'Actor A', type: 'person', cluster: 'policy' },
  { id: 'b', label: 'Actor B', type: 'person', cluster: 'policy' },
  { id: 'c', label: 'Actor C', type: 'person', cluster: 'capital' },
  { id: 'surface-one', label: 'Surface One', type: 'surface', cluster: 'policy' },
  { id: 'surface-two', label: 'Surface Two', type: 'surface', cluster: 'policy' }
];
const edges = [
  ['a', 'surface-one'], ['b', 'surface-one'], ['c', 'surface-one'],
  ['a', 'surface-two'], ['b', 'surface-two']
].map(([from, to], index) => ({
  id: `edge-${index}`, from, to, type: 'topology', topology: true,
  evidence_class: 'official'
}));
const model = { mode: 'research', nodes, edges, nodeById: new Map(nodes.map(node => [node.id, node])) };
const first = buildSocialFieldModel(model);
const second = buildSocialFieldModel(model);

assert.equal(first.nodes.length, nodes.length);
assert.equal(first.links.length, edges.length);
assert.deepEqual(first.links.map(link => [link.source, link.target]), edges.map(edge => [edge.from, edge.to]));
assert.equal(first.metrics.topology_link_count, edges.length);
assert.equal(first.metrics.surface_count, 2);
assert.equal(isSurfaceNode(first.nodes.find(node => node.id === 'surface-one')), true);
const a = first.nodes.find(node => node.id === 'a');
const b = first.nodes.find(node => node.id === 'b');
const c = first.nodes.find(node => node.id === 'c');
const aAgain = second.nodes.find(node => node.id === 'a');
assert.equal(a.strongest_repeat, 2);
assert.equal(b.strongest_repeat, 2);
assert.equal(c.strongest_repeat, 1);
assert.ok(a.heat > c.heat);
assert.deepEqual([a.x, a.y, a.z, a.heat], [aAgain.x, aAgain.y, aAgain.z, aAgain.heat]);

const neighbors = socialFieldNeighbors(first, 'a');
assert.equal(neighbors.has('surface-one'), true);
assert.equal(neighbors.has('surface-two'), true);
assert.equal(neighbors.has('b'), false, 'projection must not synthesize actor-to-actor adjacency');

for (const node of first.nodes) {
  const radius = Math.hypot(node.x, node.y, node.z);
  assert.ok(radius > 180 && radius < 200, `node ${node.id} must seed on the spherical shell`);
}
console.log('social-field.test: PASS');


const surfaceGraph = {
  surfaces: [
    {
      surface_id: 'one', surface_label: 'Surface One', surface_type: 'board_advisory_surface',
      time_start: '2024-01-01', time_end: '2024-12-31', receipt_ids: ['surface-r1'],
      participants: [
        { actor_id: 'a', participation_type: 'director_appointment', role: 'Director', time_start: '2024-02-01', time_end: '2024-12-31', evidence_class: 'official', receipt_ids: ['a-r1'] },
        { actor_id: 'b', participation_type: 'government_adviser', role: 'Adviser', time_start: '2024-03-01', time_end: '2024-04-01', evidence_class: 'primary_public', receipt_ids: ['b-r1'] }
      ]
    },
    {
      surface_id: 'two', surface_label: 'Dense Directory', surface_type: 'directory_roster_surface',
      time_start: '2026-06-16', time_end: '2026-06-16', receipt_ids: ['directory-r1'],
      participants: Array.from({ length: 40 }, (_, index) => ({ actor_id: index ? `missing-${index}` : 'c', participation_type: 'listed_in_directory', role: 'Directory entry', time_start: '2026-06-16', time_end: '2026-06-16', evidence_class: 'primary_public', receipt_ids: ['directory-r1'] }))
    }
  ]
};
const eventModel = buildEcologyEventModel(surfaceGraph, model);assert.equal(eventModel.schema_version, 'clifford-ecology-events@1');
assert.equal(eventModel.graph_effect, 'none');
assert.equal(eventModel.canonical_for_clifford_number, false);
assert.equal(eventModel.counts.events, 3);
assert.equal(eventModel.counts.dense_surface_events, 1);
assert.equal(eventModel.counts.suppressed_dense_participations, 40);
assert.equal(eventModel.events.filter(event => event.event_kind === 'participation').length, 2);
assert.equal(eventModel.events.filter(event => event.dense_roster_contained).length, 1);
assert.deepEqual(eventModel.events.filter(event => event.event_kind === 'participation').map(event => event.channel).sort(), ['governance', 'policy']);
assert.equal(ecologyEventsForNode(eventModel, 'a').length, 1);
assert.equal(ecologyEventsForNode(eventModel, 'surface-one').length, 2);
assert.match(ecologyPlayheadLabel(eventModel, 0), /^2024-/);
assert.match(ecologyPlayheadLabel(eventModel, 1), /^2026-/);
assert.ok(activeEcologyEvents(eventModel, 0).length >= 1);

console.log('ecology event projection: PASS');
const rendererSource = readFileSync('src/atlas-webgl.js', 'utf8');
assert.match(rendererSource, /enableNodeDrag\?\.|enableNodeDrag/);
assert.match(rendererSource, /enableNodeDrag\(false\)/, 'individual field nodes must not advertise meaningless drag agency');
assert.doesNotMatch(rendererSource, /particleCount|updateParticles/, 'ambient particles without dated evidence must not animate links');
assert.match(rendererSource, /setEcologyPosition/);
assert.match(rendererSource, /ecologyPlayheadDay/);
assert.ok(eventModel.events.every(event => event.graph_effect == null), 'display events remain graph-inert objects inside a graph-inert projection');
assert.ok(eventModel.events.filter(event => event.event_kind === 'participation').every(event => event.surface_node_id.startsWith('surface-')));
console.log('ecology renderer contract: PASS');
