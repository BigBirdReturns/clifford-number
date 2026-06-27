import assert from 'node:assert/strict';
import fs from 'node:fs';
import { findNode, pathToText, shortestPath } from '../src/graph.js';
import { computePathScore, confidenceLabel } from '../src/scoring.js';

const graph = JSON.parse(fs.readFileSync(new URL('../graph.json', import.meta.url), 'utf8'));

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

console.log('Tests OK.');
