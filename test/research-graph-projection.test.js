import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const runBuilder = () => spawnSync(process.execPath, ['tools/build-graph.mjs'], { encoding: 'utf8' });

const graph = read('graph.json');
const contextBase = read('data/research/research-context-base.json');
const registeredCase = read('cases/uk-ai-policy.json');
const clock = read('data/project/build-clock.json');
const compiledCase = read('build/cases/uk-ai-policy.json');
const surfaceGraph = read('build/surface-graph.json');
const builderSource = fs.readFileSync('tools/build-graph.mjs', 'utf8');
const compileSource = fs.readFileSync('tools/compile.mjs', 'utf8');

assert.deepEqual(registeredCase, graph, 'registered UK case must remain byte-semantic equivalent to graph.json');
assert.equal(contextBase.projection_role, 'research_context_base');
assert.equal(contextBase.graph_effect, 'context_only');
assert.equal(contextBase.canonical_for_clifford_number, false);
assert.equal(contextBase.corpus_as_of, graph.context_base_as_of);
const outputNodeById = new Map(graph.nodes.map(node => [node.id, node]));
const outputEdgeById = new Map(graph.edges.map(edge => [edge.id, edge]));
const outputSourceById = new Map(graph.sources.map(source => [source.id, source]));
for (const node of contextBase.nodes) assert.deepEqual(outputNodeById.get(node.id), node, `context node drift: ${node.id}`);
for (const edge of contextBase.edges) assert.deepEqual(outputEdgeById.get(edge.id), edge, `context edge drift: ${edge.id}`);
for (const source of contextBase.sources) assert.deepEqual(outputSourceById.get(source.id), source, `context source drift: ${source.id}`);
assert.equal(graph.generated, clock.timestamp, 'Research projection must use the admitted deterministic build clock');
assert.match(graph.context_base_as_of, /^\d{4}-\d{2}-\d{2}$/u);
assert.notEqual(graph.context_base_as_of, graph.generated, 'context-base cutoff must remain distinct from projection time');
assert.equal(compiledCase.as_of, contextBase.corpus_as_of, 'public case as_of must describe frozen context-base coverage');
assert.equal(graph.canonical_surface_overlay.graph_effect, 'topology_only');
assert.equal(graph.canonical_surface_overlay.pairwise_actor_edges_added, 0);
const overlayEdges = graph.edges.filter(edge => edge.projection_layer === 'canonical_surface_overlay');
assert.equal(overlayEdges.length, graph.canonical_surface_overlay.rendered_participation_edges);
assert.ok(overlayEdges.every(edge => edge.topology === true && edge.type === 'topology'));
assert.ok(overlayEdges.every(edge => String(edge.to).startsWith('surface-')));
assert.equal(graph.canonical_surface_overlay.dense_surface_count, 1);
assert.equal(graph.canonical_surface_overlay.latest_observed_surface_date, '2026-08-12');
assert.equal(graph.canonical_surface_overlay.latest_receipt_retrieved_at, '2026-08-15');
assert.equal(graph.canonical_surface_overlay.recency_observations_do_not_prove_complete_coverage, true);
assert.equal(surfaceGraph.organizations.some(org => String(org.id).startsWith('surface-')), false);
assert.ok(graph.canonical_surface_overlay.dense_participation_rows_contained > 100);
assert.doesNotMatch(builderSource, /new Date\s*\(/u, 'Research graph builder must not read the wall clock');
assert.match(builderSource, /research-context-base\.json/u);
assert.doesNotMatch(builderSource, /readFileSync\(graphPath/u, 'Research builder must not use its own output as an input');
assert.match(builderSource, /buildTimestamp\(\)/u);
assert.match(compileSource, /build-research-graph/u, 'release compiler must rebuild the Research projection');

const beforeGraph = fs.readFileSync('graph.json');
const beforeCase = fs.readFileSync('cases/uk-ai-policy.json');
const first = runBuilder();
assert.equal(first.status, 0, first.stderr);
assert.deepEqual(fs.readFileSync('graph.json'), beforeGraph, 'first rebuild must be byte deterministic');
assert.deepEqual(fs.readFileSync('cases/uk-ai-policy.json'), beforeCase, 'registered case rebuild must be byte deterministic');

const second = runBuilder();
assert.equal(second.status, 0, second.stderr);
assert.deepEqual(fs.readFileSync('graph.json'), beforeGraph, 'repeated rebuild must be byte deterministic');
assert.deepEqual(fs.readFileSync('cases/uk-ai-policy.json'), beforeCase, 'repeated registered-case rebuild must be byte deterministic');

console.log('research-graph-projection.test: OK');
