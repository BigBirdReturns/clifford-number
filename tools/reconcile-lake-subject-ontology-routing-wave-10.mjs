#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-subject-ontology-routing-wave-10-policy.json';
const full = relative => path.join(root, relative);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}

function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
}

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function manifestFingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}

function sortObject(object) {
  return Object.fromEntries(Object.entries(object).sort(([left], [right]) => left.localeCompare(right)));
}

const policy = readJson(policyPath);
const plan = readJson(policy.plan_path);
const receipt = readJson(policy.receipt_path);
const routingRows = readJsonl(policy.routing_registry_path);
const canonicalRows = readJsonl(policy.canonical_acquisition_queue_path);
const noncanonicalRows = readJsonl(policy.noncanonical_routing_registry_path);
const projection = readJson(policy.projection_path);
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
const summary = readJson('build/lake-index/summary.json');
const hopGraph = readJson('build/hop-graph.json');
const actors = readJson('data/canonical/actors.json').actors ?? [];
const organizations = readJson('data/canonical/organizations.json').organizations ?? [];

assert.equal(policy.schema_version, 'lake-subject-ontology-routing-wave-10-policy@1');
assert.equal(plan.schema_version, 'lake-subject-ontology-routing-wave-10-plan@1');
assert.equal(receipt.schema_version, 'lake-subject-ontology-routing-wave-10@1');
assert.equal(plan.program_key, policy.program_key);
assert.equal(receipt.program_key, policy.program_key);
assert.equal(plan.source_fingerprint_sha256, manifestFingerprint(plan.input_manifest), 'Wave 10 plan fingerprint mismatch');
assert.equal(receipt.source_fingerprint_sha256, plan.source_fingerprint_sha256, 'Wave 10 receipt and plan fingerprints disagree');

const orderedRouting = [...routingRows].sort((left, right) => (right.priority_score - left.priority_score)
  || `${left.case_id}\0${left.identity_value}`.localeCompare(`${right.case_id}\0${right.identity_value}`));
const orderedCanonical = [...canonicalRows].sort((left, right) => (right.priority_score - left.priority_score)
  || left.acquisition_id.localeCompare(right.acquisition_id));
const orderedNoncanonical = [...noncanonicalRows].sort((left, right) => (right.priority_score - left.priority_score)
  || left.route_id.localeCompare(right.route_id));
assert.equal(projection.schema_version, 'subject-ontology-routing-index-wave-10@1');
assert.equal(projection.program_key, policy.program_key);
assert.equal(projection.source_paths.routing_registry, policy.routing_registry_path);
assert.equal(projection.source_paths.canonical_acquisition_queue, policy.canonical_acquisition_queue_path);
assert.equal(projection.source_paths.noncanonical_routing_registry, policy.noncanonical_routing_registry_path);
assert.deepEqual(projection.routing_rows, orderedRouting, 'Wave 10 routing projection disagrees with source registry');
assert.deepEqual(projection.canonical_acquisition_queue, orderedCanonical, 'Wave 10 canonical projection disagrees with source registry');
assert.deepEqual(projection.noncanonical_routing_rows, orderedNoncanonical, 'Wave 10 noncanonical projection disagrees with source registry');

assert.equal(routingRows.length, policy.expected.target_rows, 'Wave 10 routing denominator drift');
assert.equal(canonicalRows.length + noncanonicalRows.length, routingRows.length, 'Wave 10 canonical/noncanonical partition is incomplete');
assert.equal(new Set(routingRows.map(row => row.routing_id)).size, routingRows.length, 'duplicate Wave 10 routing ID');
assert.equal(new Set(canonicalRows.map(row => row.acquisition_id)).size, canonicalRows.length, 'duplicate Wave 10 acquisition ID');
assert.equal(new Set(noncanonicalRows.map(row => row.route_id)).size, noncanonicalRows.length, 'duplicate Wave 10 noncanonical route ID');

const routingById = new Map(routingRows.map(row => [row.routing_id, row]));
const canonicalRoutingIds = new Set();
for (const row of canonicalRows) {
  const source = routingById.get(row.source_routing_id);
  assert.ok(source, `${row.acquisition_id}: source routing row missing`);
  canonicalRoutingIds.add(row.source_routing_id);
  assert.ok(['actor_candidate', 'organization_candidate'].includes(source.semantic_type), `${row.acquisition_id}: non-identity type entered canonical acquisition`);
  assert.equal(source.canonical_acquisition_eligible, true, `${row.acquisition_id}: source route is not canonical-eligible`);
  assert.equal(source.source_custody_present, true, `${row.acquisition_id}: canonical acquisition lacks source custody`);
  assert.equal(row.candidate_kind, source.semantic_type === 'actor_candidate' ? 'actor' : 'organization', `${row.acquisition_id}: candidate kind drift`);
  assert.equal(row.source_custody_present, true, `${row.acquisition_id}: acquisition row lacks source custody`);
  assert.equal(row.canonical_mutation_applied, false, `${row.acquisition_id}: canonical mutation overclaimed`);
  assert.equal(row.accepted_identity_bridge, false, `${row.acquisition_id}: identity bridge overclaimed`);
  assert.equal(row.review_dependency?.required_to_decide, false, `${row.acquisition_id}: human-permission dependency remains`);
  assert.equal(row.reversibility?.mode, 'append_preserving_supersession', `${row.acquisition_id}: correction route missing`);
  assert.equal(row.graph_effect, 'none', `${row.acquisition_id}: graph effect created`);
}

const noncanonicalRoutingIds = new Set();
for (const row of noncanonicalRows) {
  const source = routingById.get(row.source_routing_id);
  assert.ok(source, `${row.route_id}: source routing row missing`);
  noncanonicalRoutingIds.add(row.source_routing_id);
  assert.equal(source.canonical_acquisition_eligible, false, `${row.route_id}: canonical-eligible row routed noncanonically`);
  assert.equal(row.semantic_type, source.semantic_type, `${row.route_id}: semantic type drift`);
  assert.equal(row.destination_registry, source.destination_registry, `${row.route_id}: destination drift`);
  assert.equal(row.canonical_mutation_applied, false, `${row.route_id}: canonical mutation overclaimed`);
  assert.equal(row.accepted_identity_bridge, false, `${row.route_id}: identity bridge overclaimed`);
  assert.equal(row.review_dependency?.required_to_decide, false, `${row.route_id}: human-permission dependency remains`);
  assert.equal(row.reversibility?.mode, 'append_preserving_supersession', `${row.route_id}: correction route missing`);
  assert.equal(row.graph_effect, 'none', `${row.route_id}: graph effect created`);
}
assert.equal(new Set([...canonicalRoutingIds, ...noncanonicalRoutingIds]).size, routingRows.length, 'Wave 10 partition lost or duplicated routing rows');

const semanticTypes = new Set(policy.semantic_types);
const typeCounts = {};
const confidenceCounts = {};
const routeCounts = {};
const priorityCounts = {};
for (const row of routingRows) {
  assert.ok(semanticTypes.has(row.semantic_type), `${row.routing_id}: unknown semantic type ${row.semantic_type}`);
  assert.equal(row.destination_registry, policy.routes[row.semantic_type], `${row.routing_id}: route does not match policy`);
  assert.ok(['high', 'medium', 'low'].includes(row.typing_confidence), `${row.routing_id}: invalid confidence`);
  assert.ok(row.typing_rule_id && row.typing_rationale, `${row.routing_id}: typing evidence missing`);
  assert.ok(Number.isInteger(row.priority_score) && row.priority_score > 0, `${row.routing_id}: priority score missing`);
  assert.ok(['P0', 'P1', 'P2', 'P3'].includes(row.priority_band), `${row.routing_id}: priority band invalid`);
  assert.equal(row.canonical_mutation_applied, false, `${row.routing_id}: canonical mutation overclaimed`);
  assert.equal(row.accepted_identity_bridge, false, `${row.routing_id}: identity bridge overclaimed`);
  assert.equal(row.review_dependency?.required_to_decide, false, `${row.routing_id}: human-permission dependency remains`);
  assert.equal(row.reversibility?.mode, 'append_preserving_supersession', `${row.routing_id}: correction route missing`);
  assert.equal(row.automatic_cross_case_join_authorized, false, `${row.routing_id}: automatic join authorized`);
  assert.equal(row.cross_case_graph_join_authorized, false, `${row.routing_id}: graph join authorized`);
  assert.equal(row.cross_case_hop_creation_authorized, false, `${row.routing_id}: hop creation authorized`);
  assert.equal(row.graph_effect, 'none', `${row.routing_id}: graph effect created`);
  typeCounts[row.semantic_type] = (typeCounts[row.semantic_type] ?? 0) + 1;
  confidenceCounts[row.typing_confidence] = (confidenceCounts[row.typing_confidence] ?? 0) + 1;
  routeCounts[row.destination_registry] = (routeCounts[row.destination_registry] ?? 0) + 1;
  priorityCounts[row.priority_band] = (priorityCounts[row.priority_band] ?? 0) + 1;
}
assert.deepEqual(projection.semantic_type_counts, sortObject(typeCounts), 'Wave 10 projected type counts drift');
assert.deepEqual(projection.confidence_counts, sortObject(confidenceCounts), 'Wave 10 projected confidence counts drift');
assert.deepEqual(projection.route_counts, sortObject(routeCounts), 'Wave 10 projected route counts drift');
assert.deepEqual(projection.priority_counts, sortObject(priorityCounts), 'Wave 10 projected priority counts drift');
assert.equal(projection.counts.routing_rows, routingRows.length);
assert.equal(projection.counts.canonical_acquisition_rows, canonicalRows.length);
assert.equal(projection.counts.noncanonical_routing_rows, noncanonicalRows.length);
assert.equal(projection.counts.canonical_mutations_applied, 0);
assert.equal(projection.counts.accepted_identity_bridges, 0);

const actorIds = new Set(actors.map(row => row.id));
const organizationIds = new Set(organizations.map(row => row.id));
for (const row of canonicalRows) {
  assert.equal(actorIds.has(row.identity_value) || organizationIds.has(row.identity_value), false,
    `${row.acquisition_id}: candidate already exists in canonical registry`);
}

const fileByPath = new Map(files.map(row => [row.path, row]));
const sourcePaths = [
  policy.routing_registry_path,
  policy.canonical_acquisition_queue_path,
  policy.noncanonical_routing_registry_path,
  policy.receipt_path
];
const sourceStates = sourcePaths.map(relative => {
  const row = fileByPath.get(relative);
  return {
    path: relative,
    present: Boolean(row),
    generated: row?.generated ?? null,
    index_file: row?.index_file ?? false,
    authoritative_reachable: row?.authoritative_reachable ?? false,
    public_reachable: row?.public_reachable ?? false
  };
});
assert.ok(sourceStates.every(row => row.present && row.generated === false && row.authoritative_reachable === true),
  'Wave 10 source controls are not authoritative-reachable');
for (const relative of [policy.routing_registry_path, policy.canonical_acquisition_queue_path, policy.noncanonical_routing_registry_path]) {
  assert.equal(fileByPath.get(relative)?.index_file, true, `${relative}: source registry is not an index surface`);
}
const projectionFile = fileByPath.get(policy.projection_path);
assert.ok(projectionFile, 'Wave 10 generated projection lake row missing');
assert.equal(projectionFile.generated, true, 'Wave 10 projection not marked generated');
assert.equal(projectionFile.index_file, true, 'Wave 10 projection is not an index surface');

const objectByKey = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
function verifyIndexedRows(rows, idKey, idField, sourcePath) {
  let observed = 0;
  for (const row of rows) {
    const value = row[idField];
    const object = objectByKey.get(`${idKey}:${value}`);
    assert.ok(object, `${value}: lake object missing`);
    assert.equal(object.source_occurrence, true, `${value}: source occurrence missing`);
    assert.equal(object.projection_occurrence, true, `${value}: projection occurrence missing`);
    assert.equal(object.indexed, true, `${value}: index occurrence missing`);
    assert.ok(object.occurrences.some(item => item.path === sourcePath && item.generated === false), `${value}: source registry occurrence missing`);
    assert.ok(object.occurrences.some(item => item.path === policy.projection_path && item.generated === true), `${value}: generated projection occurrence missing`);
    observed += 1;
  }
  return observed;
}
const routingObserved = verifyIndexedRows(routingRows, 'routing_id', 'routing_id', policy.routing_registry_path);
const acquisitionsObserved = verifyIndexedRows(canonicalRows, 'acquisition_id', 'acquisition_id', policy.canonical_acquisition_queue_path);
const noncanonicalObserved = verifyIndexedRows(noncanonicalRows, 'route_id', 'route_id', policy.noncanonical_routing_registry_path);

const topologyText = JSON.stringify(hopGraph);
assert.ok(!/SUBJROUTE-|CANACQ-|NONCANON-|subject-ontology-routing/i.test(topologyText), 'Wave 10 routing identifiers leaked into active topology');

const reconciliationInputs = [
  policyPath,
  policy.routing_registry_path,
  policy.canonical_acquisition_queue_path,
  policy.noncanonical_routing_registry_path,
  policy.receipt_path,
  policy.projection_path,
  policy.plan_path,
  'data/canonical/actors.json',
  'data/canonical/organizations.json',
  'build/hop-graph.json',
  'build/lake-index/files.jsonl',
  'build/lake-index/objects.jsonl',
  'build/lake-index/summary.json'
].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((left, right) => left.path.localeCompare(right.path));
const reconciliationFingerprint = manifestFingerprint(reconciliationInputs);
const unresolved = routingRows.filter(row => row.semantic_type === 'unresolved_name_like').length;
const publiclyCustodiedCanonical = canonicalRows.filter(row => row.publicly_inspectable_custody_present).length;

const reconciliation = {
  schema_version: 'lake-subject-ontology-routing-wave-10-reconciliation@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: reconciliationFingerprint,
  input_manifest: reconciliationInputs,
  before: plan.before,
  after: {
    routing_rows: routingRows.length,
    canonical_acquisition_rows: canonicalRows.length,
    publicly_inspectable_canonical_acquisition_rows: publiclyCustodiedCanonical,
    noncanonical_routing_rows: noncanonicalRows.length,
    unresolved_rows: unresolved,
    semantic_type_counts: sortObject(typeCounts),
    confidence_counts: sortObject(confidenceCounts),
    route_counts: sortObject(routeCounts),
    priority_counts: sortObject(priorityCounts),
    routing_ids_source_projection_and_index_observed: routingObserved,
    acquisition_ids_source_projection_and_index_observed: acquisitionsObserved,
    noncanonical_route_ids_source_projection_and_index_observed: noncanonicalObserved,
    source_controls_authoritative_reachable: sourceStates.every(row => row.authoritative_reachable),
    source_control_states: sourceStates,
    projection_indexed: projectionFile.index_file,
    canonical_actor_count: actors.length,
    canonical_organization_count: organizations.length,
    canonical_mutations_applied: 0,
    accepted_identity_bridges: 0,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    routing_tokens_in_active_hop_graph: 0,
    global_machine_ids: summary.counts.distinct_machine_ids,
    unindexed_machine_ids: summary.counts.unindexed_machine_ids,
    exact_orphan_evidence_files: summary.counts.exact_orphan_evidence_files
  },
  deltas: {
    semantic_types_assigned: routingRows.length,
    canonical_acquisition_rows_created: canonicalRows.length,
    noncanonical_routes_created: noncanonicalRows.length,
    canonical_mutations_applied: 0,
    accepted_identity_bridges: 0,
    graph_effects_created: 0
  },
  decisions: [
    {
      decision_key: 'W10-RECONCILE-ONTOLOGY',
      judgment: 'the_wave09_noncovered_denominator_is_partitioned_into_identity_and_nonidentity_semantic_types',
      action: 'retain_all_routing_rows_with_confidence_rules_and_correction_paths',
      evidence_count: routingRows.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W10-RECONCILE-CANONICAL-ACQUISITION',
      judgment: 'only_custodied_actor_and_organization_candidates_enter_canonical_acquisition',
      action: 'retain_the_prioritized_acquisition_registry_without_mutating_canonical',
      evidence_count: canonicalRows.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W10-RECONCILE-NONIDENTITY-ROUTING',
      judgment: 'nonidentity_subjects_are_routed_to_typed_case_registries_or_bounded_acquisition',
      action: 'retain_noncanonical_routes_and_keep_identity_graph_and_hop_authority_false',
      evidence_count: noncanonicalRows.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    every_target_row_typed_and_routed: routingRows.length === policy.expected.target_rows,
    source_and_projection_registries_agree: true,
    every_routing_id_source_projection_and_index_observed: routingObserved === routingRows.length,
    every_acquisition_id_source_projection_and_index_observed: acquisitionsObserved === canonicalRows.length,
    every_noncanonical_route_id_source_projection_and_index_observed: noncanonicalObserved === noncanonicalRows.length,
    source_controls_authoritative_reachable: sourceStates.every(row => row.authoritative_reachable),
    canonical_acquisition_queue_present: true,
    noncanonical_routing_registry_present: true,
    unresolved_rows_preserved: true,
    canonical_mutations_applied: 0,
    accepted_identity_bridges: 0,
    post_execution_reconciliation_complete: true,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.reconciliation_path, reconciliation);

const report = `# Subject ontology routing Wave 10 reconciliation\n\nSource fingerprint: \`${reconciliationFingerprint}\`\n\n## Result\n\n\`\`\`text\nrouting rows:                                ${routingRows.length}\ncanonical acquisition rows:                 ${canonicalRows.length}\npublicly inspectable canonical candidates:  ${publiclyCustodiedCanonical}\nnoncanonical routing rows:                  ${noncanonicalRows.length}\nunresolved rows:                            ${unresolved}\nrouting IDs source/projection/indexed:      ${routingObserved}\nacquisition IDs source/projection/indexed:  ${acquisitionsObserved}\nnoncanonical IDs source/projection/indexed: ${noncanonicalObserved}\ncanonical mutations applied:                0\naccepted identity bridges:                  0\nrouting tokens in active hop graph:         0\ndecisions requiring human permission:       0\n\`\`\`\n\n## Judgment\n\nThe non-covered denominator is now operationally partitioned. Custodied person and organization candidates have a prioritized canonical-acquisition registry. Programs, products, procurement identifiers, legal instruments, places, infrastructure, projects, roles, internal analytical objects, and unresolved subjects are retained in separate routes rather than being laundered into identity.\n\n## Boundary\n\nNo canonical actor or organization file changed. No identity bridge, relationship, graph edge, or hop was created. Each type and route is a reversible evidence-grounded judgment, not a wait-for-human state and not proof of real-world identity.\n`;
fs.mkdirSync(path.dirname(full(policy.reconciliation_report_path)), { recursive: true });
fs.writeFileSync(full(policy.reconciliation_report_path), report);

console.log('subject ontology routing Wave 10 reconciled');
console.log(`  routing / canonical / noncanonical: ${routingRows.length} / ${canonicalRows.length} / ${noncanonicalRows.length}`);
console.log(`  routing / acquisition / noncanonical observed: ${routingObserved}/${routingRows.length} / ${acquisitionsObserved}/${canonicalRows.length} / ${noncanonicalObserved}/${noncanonicalRows.length}`);
console.log('  canonical mutations / identity bridges / graph effects: 0 / 0 / 0');
