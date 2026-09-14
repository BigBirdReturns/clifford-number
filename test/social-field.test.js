import assert from 'node:assert/strict';
import { buildSocialFieldModel, isSurfaceNode, socialFieldNeighbors } from '../src/social-field.js';

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
