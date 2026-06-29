import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findNode, pathToText, shortestPath } from '../src/graph.js';
import { computePathScore, confidenceLabel } from '../src/scoring.js';

const graph = JSON.parse(fs.readFileSync(new URL('../graph.json', import.meta.url), 'utf8'));
const masterDoc = fs.readFileSync(new URL('../docs/clifford-number-master.md', import.meta.url), 'utf8');

const target = graph.target_node_id;
assert.equal(target, 'clifford-policy-machine');

const thiel = findNode(graph, 'Peter Thiel');
assert.equal(thiel.id, 'peter-thiel');

const thielPath = shortestPath(graph, thiel.id);
assert.ok(thielPath, 'Expected Peter Thiel to have a path.');
assert.ok(thielPath.number >= 2, 'Expected Peter Thiel path to need at least two hops.');
assert.match(pathToText(thielPath), /Peter Thiel/);
assert.match(pathToText(thielPath), /Clifford Policy Machine/);

const palantir = findNode(graph, 'Palantir');
const palantirPath = shortestPath(graph, palantir.id);
assert.ok(palantirPath, 'Expected Palantir to have a path.');
assert.ok(palantirPath.number >= 2, 'Expected Palantir path to have at least two hops.');

const karp = findNode(graph, 'Alex Karp');
assert.equal(karp.id, 'alex-karp');
const karpPath = shortestPath(graph, karp.id);
assert.ok(karpPath, 'Expected Alex Karp to have a path through Palantir.');
assert.match(pathToText(karpPath), /Alex Karp -> Palantir/);

const zones = findNode(graph, 'AI Growth Zones');
const zonesPath = shortestPath(graph, zones.id);
assert.equal(zonesPath.number, 2);

const score = computePathScore(thielPath);
assert.equal(typeof score, 'number');
assert.ok(['high', 'medium', 'low', 'audit first'].includes(confidenceLabel(score)));

const unknown = findNode(graph, 'zzzzqqqqnonexistent');
assert.equal(unknown, null);

const topologyFixture = {
  target_node_id: 'target',
  nodes: [
    { id: 'target', label: 'Target', type: 'target' },
    { id: 'start', label: 'Start', type: 'person' },
    { id: 'bridge', label: 'Bridge', type: 'office' },
    { id: 'umbrella', label: 'Umbrella', type: 'forum' }
  ],
  edges: [
    { id: 'e-direct-topology', from: 'start', to: 'target', type: 'topology-overlap', topology: true, claim: 'Topology-only shortcut.', evidence_class: 'derived', status: 'derived', source_ids: ['s'] },
    { id: 'e-start-bridge', from: 'start', to: 'bridge', type: 'public-role', claim: 'Public role.', evidence_class: 'confirmed', status: 'public-role', source_ids: ['s'] },
    { id: 'e-bridge-target', from: 'bridge', to: 'target', type: 'appointed', claim: 'Appointed role.', evidence_class: 'confirmed', status: 'appointed', source_ids: ['s'] }
  ],
  sources: [{ id: 's', label: 'Fixture source', url: 'docs/methodology.md' }]
};
assert.equal(shortestPath(topologyFixture, 'start').number, 2, 'Topology-only edge must not shorten the default path.');
assert.equal(shortestPath(topologyFixture, 'start', 'target', { includeTopology: true }).number, 1, 'Topology-only edge is available only when explicitly requested.');

const dialogDirectoryRows = masterDoc
  .split('\n')
  .map((line) => line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/))
  .filter((match) => match && Number(match[1]) >= 1 && Number(match[1]) <= 113)
  .map((match) => ({ name: match[2].trim(), title: match[3].trim() }));

assert.equal(dialogDirectoryRows.length, 113, 'Expected the master docs to contain 113 Dialog directory rows.');

for (const row of dialogDirectoryRows) {
  const node = findNode(graph, row.name);
  assert.ok(node, `Expected Dialog directory node for ${row.name}.`);
  const listingEdge = graph.edges.find((edge) => (
    edge.status === 'listed'
    && edge.evidence_class === 'primary_public'
    && edge.source_ids.includes('dialog-html-source')
    && ((edge.from === node.id && edge.to === 'dialog') || (edge.from === 'dialog' && edge.to === node.id))
  ));
  assert.ok(listingEdge, `Expected primary_public listing edge for ${row.name}.`);
  assert.match(listingEdge.notes, /does not prove attendance/i);
  assert.ok(shortestPath(graph, node.id), `Expected ${row.name} to have a Clifford path.`);
}

console.log('Tests OK.');
