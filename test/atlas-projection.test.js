import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import test from 'node:test';
import { root, readJson } from '../tools/lib/ledger.mjs';

const BUILDER = path.join(root, 'tools', 'build-atlas-projection.mjs');
const ARTIFACT_PATH = path.join(root, 'build', 'atlas-projection.json');

// Build once up front so every test below sees a fresh artifact.
execFileSync(process.execPath, [BUILDER], { cwd: root, stdio: 'inherit' });

const projection = readJson('build/atlas-projection.json');
const surfaceGraph = readJson('build/surface-graph.json');
const receiptGraph = readJson('build/receipt-graph.json');

const surfaceById = new Map(surfaceGraph.surfaces.map(s => [s.surface_id, s]));
const actorById = new Map(surfaceGraph.actors.map(a => [a.id, a]));
const orgById = new Map(surfaceGraph.organizations.map(o => [o.id, o]));
const receiptIds = new Set(receiptGraph.receipts.map(r => r.receipt_id));
const EVIDENCE_CLASSES = ['official', 'primary_public', 'reported', 'derived', 'judgment', 'open'];
const GRAPH_EFFECTS = new Set(['hop-eligible', 'context-only', 'scout-only', 'none']);

// ---- structural shape --------------------------------------------------

test('artifact has the top-level shape from the design note', () => {
  for (const key of ['scheme', 'regions', 'machines', 'surface_clusters', 'surface_nodes', 'actor_brackets', 'corridors', 'route_index', 'aggregate_metrics']) {
    assert.ok(key in projection, `projection must have top-level key "${key}"`);
  }
  assert.ok(Array.isArray(projection.regions));
  assert.ok(Array.isArray(projection.machines));
  assert.ok(Array.isArray(projection.surface_clusters));
  assert.ok(Array.isArray(projection.surface_nodes));
  assert.ok(Array.isArray(projection.actor_brackets));
  assert.ok(Array.isArray(projection.corridors));
  assert.equal(typeof projection.route_index, 'object');
  assert.equal(typeof projection.aggregate_metrics, 'object');
});

// ---- invariant 7: scheme states disposability --------------------------

test('invariant 7: scheme block declares this is disposable display projection, never canonical truth', () => {
  const scheme = projection.scheme;
  assert.ok(scheme, 'scheme block must exist');
  assert.match(scheme.disposability_notice, /disposable/i);
  assert.match(scheme.disposability_notice, /never canonical truth|never.*canonical/i);
  assert.ok(Array.isArray(scheme.source_artifacts) && scheme.source_artifacts.length > 0, 'scheme must name its source artifacts');
  assert.ok(scheme.generator, 'scheme must name the generator');
});

// ---- invariant 1 + 2: every aggregate names its denominator and carries ----
// an evidence composition breakdown with source ids -------------------------

function assertDenominatedCount(count, label) {
  assert.ok(count, `${label}: must carry a count object`);
  assert.equal(typeof count.metric, 'string', `${label}.count.metric must name what is counted`);
  assert.ok(count.metric.length > 0, `${label}.count.metric must not be empty`);
  assert.equal(typeof count.count, 'number', `${label}.count.count must be numeric`);
  assert.equal(typeof count.denominator, 'number', `${label}.count.denominator must be numeric (the counted population)`);
  assert.ok(count.count <= count.denominator, `${label}: count must not exceed its own denominator`);
  assert.ok(Array.isArray(count.source_ids), `${label}.count.source_ids must be an array (spot-checkable)`);
}

function assertEvidenceComposition(composition, label) {
  assert.ok(composition, `${label}: must carry evidence_composition`);
  assert.equal(typeof composition.population, 'number', `${label}.evidence_composition.population must be numeric`);
  assert.ok(composition.by_class, `${label}.evidence_composition.by_class must exist`);
  let sum = 0;
  for (const cls of EVIDENCE_CLASSES) {
    assert.equal(typeof composition.by_class[cls], 'number', `${label}.evidence_composition.by_class.${cls} must be numeric`);
    sum += composition.by_class[cls];
  }
  assert.equal(sum, composition.population, `${label}: evidence_composition.by_class must sum to population`);
  assert.ok(Array.isArray(composition.source_ids), `${label}.evidence_composition.source_ids must be an array`);
}

test('invariant 1+2: regions name their denominator and carry evidence composition + source ids', () => {
  assert.ok(projection.regions.length > 0);
  for (const region of projection.regions) {
    assertDenominatedCount(region.surface_count, `region ${region.case_id}`);
    assertEvidenceComposition(region.evidence_composition, `region ${region.case_id}`);
  }
});

test('invariant 1+2: machines name their denominator and carry evidence composition + source ids', () => {
  assert.ok(projection.machines.length > 0);
  for (const machine of projection.machines) {
    assertDenominatedCount(machine.surface_count, `machine ${machine.organization_id}`);
    assertEvidenceComposition(machine.evidence_composition, `machine ${machine.organization_id}`);
    assert.ok(machine.surface_ids.length > 0, `machine ${machine.organization_id} must have generated at least one surface`);
  }
});

test('invariant 1+2: surface_clusters name their denominator and carry evidence composition + source ids', () => {
  assert.ok(projection.surface_clusters.length > 0);
  for (const cluster of projection.surface_clusters) {
    assertDenominatedCount(cluster.surface_count, `surface_cluster ${cluster.cluster_id}`);
    assertEvidenceComposition(cluster.evidence_composition, `surface_cluster ${cluster.cluster_id}`);
  }
});

test('invariant 1+2: aggregate_metrics entries name their denominator', () => {
  for (const [key, value] of Object.entries(projection.aggregate_metrics)) {
    if (key === 'corpus_evidence_composition') continue;
    assertDenominatedCount(value, `aggregate_metrics.${key}`);
  }
  assertEvidenceComposition(projection.aggregate_metrics.corpus_evidence_composition, 'aggregate_metrics.corpus_evidence_composition');
});

test('invariant 2: surface_nodes carry evidence composition with source ids', () => {
  assert.ok(projection.surface_nodes.length > 0);
  for (const node of projection.surface_nodes) {
    assertEvidenceComposition(node.evidence_composition, `surface_node ${node.surface_id}`);
    assertDenominatedCount(node.actor_participant_count, `surface_node ${node.surface_id}.actor_participant_count`);
    assertDenominatedCount(node.organization_participant_count, `surface_node ${node.surface_id}.organization_participant_count`);
  }
});

// ---- invariant 3: graph_effect copied faithfully -----------------------

test('invariant 3: every surface_nodes entry carries a valid graph_effect copied from the surface graph', () => {
  for (const node of projection.surface_nodes) {
    assert.ok(GRAPH_EFFECTS.has(node.graph_effect), `surface_node ${node.surface_id}: graph_effect "${node.graph_effect}" is not one of hop-eligible/context-only/scout-only/none`);
    const source = surfaceById.get(node.surface_id);
    assert.equal(node.graph_effect_basis.hop_eligible, source.hop_eligible, `surface_node ${node.surface_id}: graph_effect_basis.hop_eligible must faithfully copy the surface graph's own hop_eligible field`);
    if (source.hop_eligible === true && node.graph_effect_basis.rejected_hop_reason === null) {
      assert.equal(node.graph_effect, 'hop-eligible');
    }
    if (source.hop_eligible === false) {
      assert.notEqual(node.graph_effect, 'hop-eligible', `surface_node ${node.surface_id}: a surface the ledger declares hop_eligible=false can never be labelled "hop-eligible"`);
    }
  }
});

test('invariant 3: corridors are always graph_effect "none" and never carry a Clifford Number effect', () => {
  assert.ok(projection.corridors.length > 0, 'this corpus is expected to have at least one structural corridor (policy-to-deployment-synthetic-population)');
  for (const corridor of projection.corridors) {
    assert.equal(corridor.graph_effect, 'none');
    assert.equal(corridor.graph_effect_basis.source_clifford_number, null, `corridor ${corridor.chain_id}: a structural corridor's source chain must have a null clifford_number`);
  }
});

test('invariant 3: every region/machine/surface_cluster carries a graph_effect_composition drawn only from surface_nodes graph_effect values', () => {
  const effectBySurfaceId = new Map(projection.surface_nodes.map(n => [n.surface_id, n.graph_effect]));
  const collections = [
    ...projection.regions.map(r => ({ label: `region ${r.case_id}`, ids: r.surface_ids, composition: r.graph_effect_composition })),
    ...projection.machines.map(m => ({ label: `machine ${m.organization_id}`, ids: m.surface_ids, composition: m.graph_effect_composition })),
    ...projection.surface_clusters.map(c => ({ label: `surface_cluster ${c.cluster_id}`, ids: c.surface_ids, composition: c.graph_effect_composition })),
  ];
  for (const { label, ids, composition } of collections) {
    const expected = { 'hop-eligible': 0, 'context-only': 0, 'scout-only': 0, none: 0 };
    for (const id of ids) expected[effectBySurfaceId.get(id)] += 1;
    assert.deepEqual(composition, expected, `${label}: graph_effect_composition must match a faithful tally of its member surfaces' own graph_effect`);
  }
});

// ---- invariant 4: no pairwise actor-actor adjacency ---------------------

test('invariant 4: no pairwise actor-actor adjacency anywhere in the artifact', () => {
  const forbiddenKeys = new Set(['actor_a', 'actor_b', 'actor_pair', 'actor_to_actor', 'related_actors', 'co_participants']);
  function walk(value, path) {
    if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`));
      return;
    }
    if (value && typeof value === 'object') {
      for (const [key, child] of Object.entries(value)) {
        assert.ok(!forbiddenKeys.has(key), `${path}.${key}: the projection must never carry actor-to-actor adjacency fields`);
        walk(child, `${path}.${key}`);
      }
    }
  }
  walk(projection, 'projection');
});

test('invariant 4: dense surfaces appear only as aggregates with a participant count, never expanded into full rosters at the surface level', () => {
  const densePolicy = readJson('data/canonical/surface-types.json').density_policy;
  const denseNodes = projection.surface_nodes.filter(n => n.dense);
  assert.ok(denseNodes.length > 0, 'this corpus is expected to have at least one dense surface (dialog-society-membership)');
  for (const node of denseNodes) {
    assert.ok(node.distinct_actor_count > densePolicy.max_hop_actor_count);
    // the node still names its population/count, it just never becomes hop-eligible
    assert.notEqual(node.graph_effect, 'hop-eligible', `dense surface ${node.surface_id} must never be hop-eligible`);
  }
});

// ---- invariant 5: determinism -------------------------------------------

test('invariant 5: running the builder twice produces byte-identical output', () => {
  execFileSync(process.execPath, [BUILDER], { cwd: root, stdio: 'inherit' });
  const first = readFileSync(ARTIFACT_PATH, 'utf8');
  execFileSync(process.execPath, [BUILDER], { cwd: root, stdio: 'inherit' });
  const second = readFileSync(ARTIFACT_PATH, 'utf8');
  assert.equal(first, second, 'two consecutive builds of an unchanged input tree must be byte-identical');
});

// ---- invariant 6: ids resolve back to source artifacts -------------------

test('invariant 6: every surface_nodes id resolves to build/surface-graph.json and build/receipt-graph.json', () => {
  for (const node of projection.surface_nodes) {
    assert.ok(surfaceById.has(node.surface_id), `surface_node ${node.surface_id} must resolve in build/surface-graph.json`);
    for (const actorId of node.actor_ids) {
      assert.ok(actorById.has(actorId), `surface_node ${node.surface_id}: actor_id ${actorId} must resolve in build/surface-graph.json actors`);
    }
    for (const orgId of node.organization_ids) {
      assert.ok(orgById.has(orgId), `surface_node ${node.surface_id}: organization_id ${orgId} must resolve in build/surface-graph.json organizations`);
    }
    for (const receiptId of node.receipt_ids) {
      assert.ok(receiptIds.has(receiptId), `surface_node ${node.surface_id}: receipt ${receiptId} must resolve in build/receipt-graph.json`);
    }
    for (const receiptId of node.evidence_composition.source_ids) {
      assert.ok(receiptIds.has(receiptId), `surface_node ${node.surface_id}: evidence_composition source id ${receiptId} must resolve in build/receipt-graph.json`);
    }
  }
});

test('invariant 6: actor_brackets ids resolve to build/surface-graph.json actors and their surfaces exist', () => {
  assert.ok(projection.actor_brackets.length > 0);
  for (const bracket of projection.actor_brackets) {
    assert.ok(actorById.has(bracket.actor_id), `actor_bracket ${bracket.actor_id} must resolve in build/surface-graph.json actors`);
    for (const surfaceId of bracket.surface_ids) {
      assert.ok(surfaceById.has(surfaceId), `actor_bracket ${bracket.actor_id}: surface ${surfaceId} must resolve in build/surface-graph.json`);
    }
    for (const receiptId of bracket.receipt_ids) {
      assert.ok(receiptIds.has(receiptId), `actor_bracket ${bracket.actor_id}: receipt ${receiptId} must resolve in build/receipt-graph.json`);
    }
  }
});

test('invariant 6: corridors reference only real surfaces and receipts', () => {
  for (const corridor of projection.corridors) {
    for (const surfaceId of corridor.surface_ids) {
      assert.ok(surfaceById.has(surfaceId), `corridor ${corridor.chain_id}: surface ${surfaceId} must resolve`);
    }
    for (const receiptId of corridor.receipt_ids) {
      assert.ok(receiptIds.has(receiptId), `corridor ${corridor.chain_id}: receipt ${receiptId} must resolve`);
    }
  }
});

// ---- route_index sanity ---------------------------------------------------

test('route_index only lists hop-eligible surface memberships', () => {
  const effectBySurfaceId = new Map(projection.surface_nodes.map(n => [n.surface_id, n.graph_effect]));
  assert.ok(Object.keys(projection.route_index).length > 0, 'this corpus is expected to have hop-eligible route memberships');
  for (const [actorId, surfaceIds] of Object.entries(projection.route_index)) {
    assert.ok(actorById.has(actorId), `route_index actor ${actorId} must resolve in build/surface-graph.json actors`);
    assert.ok(surfaceIds.length > 0, `route_index entry for ${actorId} must not be empty`);
    for (const surfaceId of surfaceIds) {
      assert.equal(effectBySurfaceId.get(surfaceId), 'hop-eligible', `route_index for ${actorId}: surface ${surfaceId} must be hop-eligible`);
    }
  }
});

// ---- stable geography -----------------------------------------------------

test('regions and machines carry deterministic seeded positions independent of iteration order', () => {
  for (const region of projection.regions) {
    assert.equal(typeof region.position.x, 'number');
    assert.equal(typeof region.position.y, 'number');
  }
  for (const machine of projection.machines) {
    assert.equal(typeof machine.position.x, 'number');
    assert.equal(typeof machine.position.y, 'number');
  }
  // re-run and confirm identical ids produce identical positions even though
  // this is a completely fresh process invocation (no cached state).
  execFileSync(process.execPath, [BUILDER], { cwd: root, stdio: 'inherit' });
  const rebuilt = readJson('build/atlas-projection.json');
  const before = new Map(projection.regions.map(r => [r.case_id, r.position]));
  for (const region of rebuilt.regions) {
    assert.deepEqual(region.position, before.get(region.case_id), `region ${region.case_id} position must not move across rebuilds`);
  }
});

console.log('atlas-projection.test: all tests registered');
