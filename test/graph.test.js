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

const zones = findNode(graph, 'AI Growth Zones');
const zonesPath = shortestPath(graph, zones.id);
assert.equal(zonesPath.number, 2);

const score = computePathScore(thielPath);
assert.equal(typeof score, 'number');
assert.ok(['high', 'medium', 'low', 'audit first'].includes(confidenceLabel(score)));

const unknown = findNode(graph, 'zzzzqqqqnonexistent');
assert.equal(unknown, null);

const part5Start = masterDoc.indexOf('\n## Part 5:');
const part5End = masterDoc.indexOf('\n## Part 6:', part5Start);
const part5 = masterDoc.slice(part5Start, part5End === -1 ? undefined : part5End);
const dialogDirectoryRows = part5
  .split('\n')
  .map((line) => line.match(/^\|\s*(\d+)\s*\|\s*([^|]+?)\s*\|\s*([^|]+?)\s*\|$/))
  .filter((match) => match && !/above|unconfirmed|may be/i.test(match[3]))
  .map((match) => ({ name: match[2].trim(), title: match[3].trim() }));

// Count is dynamic — master doc grows as research expands. Don't hardcode.
assert.ok(dialogDirectoryRows.length > 0, 'Expected at least one confirmed Dialog directory row in Part 5.');

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

const topologyGraph = {
  target_node_id: 'target',
  nodes: [
    { id: 'source', label: 'Source', type: 'person' },
    { id: 'umbrella', label: 'Umbrella', type: 'context' },
    { id: 'target', label: 'Target', type: 'control-plane' }
  ],
  sources: [{ id: 's', label: 'S', url: 'https://example.com' }],
  edges: [
    { id: 't1', from: 'source', to: 'umbrella', type: 'topology', claim: 'Context only.', source_ids: ['s'], evidence_class: 'derived', status: 'derived' },
    { id: 't2', from: 'umbrella', to: 'target', type: 'topology', claim: 'Context only.', source_ids: ['s'], evidence_class: 'derived', status: 'derived' }
  ]
};
assert.equal(shortestPath(topologyGraph, 'source'), null, 'Topology-only edges should not produce default adjacency paths.');
assert.equal(shortestPath(topologyGraph, 'source', 'target', { includeTopology: true }).number, 2, 'Topology paths can be included explicitly.');
