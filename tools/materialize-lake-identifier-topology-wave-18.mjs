#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-identifier-topology-wave-18-policy.json';

function readJson(relative) { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
function readJsonl(relative) { return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line)); }
function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value) { return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex'); }
function unique(values) { return [...new Set(values)].sort((a, b) => a.localeCompare(b)); }
function increment(map, key) { map.set(key, (map.get(key) ?? 0) + 1); }
function asObject(map) { return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b))); }
function appendSection(relative, marker, section) {
  const current = fs.readFileSync(full(relative), 'utf8');
  if (current.includes(marker)) return;
  fs.writeFileSync(full(relative), `${current.trimEnd()}\n\n${section.trim()}\n`);
}
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}
function pointerTemplate(pointer) {
  return String(pointer ?? '')
    .replace(/\/line-\d+(?=\/|$)/g, '/line-*')
    .replace(/\/\d+(?=\/|$)/g, '/*');
}
function pathFamily(file) {
  const parts = String(file).split('/');
  if (file.startsWith('build/lake-index/')) return 'build/lake-index';
  if (file.startsWith('build/lake-actions/')) return 'build/lake-actions';
  if (file.startsWith('build/cases/')) return 'build/cases';
  if (file.startsWith('build/briefings/')) return 'build/briefings';
  if (file.startsWith('build/core-thesis/')) return 'build/core-thesis';
  if (file.startsWith('build/estate-game-trails/')) return 'build/estate-game-trails';
  if (file.startsWith('build/estate-frontier/')) return 'build/estate-frontier';
  if (file.startsWith('build/estate-closures/')) return 'build/estate-closures';
  if (file.startsWith('build/')) return `build/${parts[1] ?? 'root'}`;
  if (file.startsWith('reports/')) return `reports/${parts[1] ?? 'root'}`;
  if (file.startsWith('estates/')) return 'estates';
  if (file.startsWith('gametrails/')) return 'gametrails';
  if (file.startsWith('briefs/')) return 'briefs';
  return parts[0] || 'root';
}

const externalDomainKeys = new Set([
  'award_id', 'canonical_actor_id', 'committee_id', 'company_id', 'contract_id',
  'filing_history_dataset_id', 'interest_id', 'person_id'
]);
const lineageOrVocabularyKeys = new Set(['predicate_id', 'record_id', 'source_record_id']);
const legacyGraphKeys = new Set(['node_id', 'object_node_id', 'subject_node_id', 'target_node_id']);
const analyticalControlKeys = new Set([
  'active_dataset_id', 'alternative_id', 'assistant_id', 'attack_id', 'audit_id', 'author_id',
  'cohort_id', 'content_id', 'corpus_id', 'correction_id', 'coverage_id', 'generated_internal_id',
  'generated_unique_award_id', 'lane_id', 'manifest_id', 'metric_id', 'outcome_id', 'packet_id',
  'path_id', 'portfolio_id', 'review_id', 'run_id', 'seed_id', 'selection_review_id', 'signal_id',
  'source_wave_id', 'target_id', 'test_id', 'wave_id'
]);
const contextualPointerPattern = /\/(?:aliases|case_pairs|cases|claims|classification|corridors|crosswalks|custody_runs|decisions|directed_overlap_pairs|edges|evidence|explicit_exact_equality_references|fanout|hops|identity_resolutions|legacy_runs|mentions|objects|observations|participation_receipt_links|query_executions|records|relations|resolution_observations|resolutions|rows|seed_events|shared_surfaces|source_route_runs|source_snapshot|subject_object_observations|subject_objects|surfaces|threads|trails|unresolved_observations|unresolved_subjects)\//;

function finalizeSourceOnly(row) {
  const prior = row.source_only;
  if (!prior) return null;
  if (prior.classification === 'intentional_source_only_control_identifier') return {
    ...prior,
    final_classification: 'intentional_source_only_control_identifier',
    final_disposition: 'retain_source_only_as_control_identifier',
    projection_required_now: false,
    named_consumer_required_for_projection: true
  };
  if (prior.classification === 'governance_or_fixture_identifier_source_only') return {
    ...prior,
    final_classification: 'governance_or_fixture_identifier_source_only',
    final_disposition: 'retain_source_only_in_control_plane',
    projection_required_now: false,
    named_consumer_required_for_projection: true
  };
  if (prior.classification === 'intake_source_identifier_not_yet_promoted') return {
    ...prior,
    final_classification: 'intake_source_identifier_not_yet_promoted',
    final_disposition: 'retain_intake_only_until_an_explicit_promotion_or_nonpromotion_decision',
    projection_required_now: false,
    named_consumer_required_for_projection: true
  };
  if (prior.classification === 'case_local_source_identifier_without_global_projection') return {
    ...prior,
    final_classification: 'case_local_source_identifier_without_global_projection',
    final_disposition: 'retain_case_scoped_without_cross_case_projection',
    projection_required_now: false,
    named_consumer_required_for_projection: true
  };
  if (prior.classification === 'estate_identifier_projection_candidate') return {
    ...prior,
    final_classification: 'estate_identifier_projection_candidate',
    final_disposition: 'retain_source_only_and_open_a_typed_estate_consumer_contract_action',
    projection_required_now: false,
    named_consumer_required_for_projection: true
  };
  if (prior.classification === 'domain_identifier_projection_candidate') return {
    ...prior,
    final_classification: 'domain_identifier_projection_candidate',
    final_disposition: 'retain_source_only_and_open_a_named_domain_consumer_contract_action',
    projection_required_now: false,
    named_consumer_required_for_projection: true
  };
  assert.equal(prior.classification, 'source_only_family_adjudication_required');
  if (externalDomainKeys.has(row.id_key)) return {
    ...prior,
    final_classification: 'external_or_domain_identifier_source_only',
    final_disposition: 'retain_source_only_until_a_named_domain_consumer_requires_projection',
    projection_required_now: false,
    named_consumer_required_for_projection: true,
    confidence: 'high'
  };
  if (lineageOrVocabularyKeys.has(row.id_key)) return {
    ...prior,
    final_classification: 'lineage_record_or_vocabulary_identifier_source_only',
    final_disposition: 'retain_source_only_as_lineage_or_schema_vocabulary',
    projection_required_now: false,
    named_consumer_required_for_projection: true,
    confidence: 'high'
  };
  if (legacyGraphKeys.has(row.id_key)) return {
    ...prior,
    final_classification: 'legacy_or_analytic_graph_node_identifier_source_only',
    final_disposition: 'retain_source_only_and_forbid_automatic_graph_promotion',
    projection_required_now: false,
    named_consumer_required_for_projection: true,
    confidence: 'high'
  };
  if (analyticalControlKeys.has(row.id_key) || row.source_roles.includes('test')) return {
    ...prior,
    final_classification: row.source_roles.includes('test')
      ? 'fixture_identifier_source_only'
      : 'research_analysis_or_control_identifier_source_only',
    final_disposition: 'retain_source_only_as_a_research_or_fixture_control',
    projection_required_now: false,
    named_consumer_required_for_projection: true,
    confidence: 'high'
  };
  return {
    ...prior,
    final_classification: 'bounded_source_only_identifier_without_named_consumer',
    final_disposition: 'retain_source_only_and_require_an_explicit_consumer_contract_before_projection',
    projection_required_now: false,
    named_consumer_required_for_projection: true,
    confidence: 'moderate'
  };
}

function finalizeDivergence(row, object) {
  const prior = row.divergence;
  if (!prior) return null;
  if (prior.classification === 'cross_family_projection_views') return {
    ...prior,
    final_classification: 'typed_cross_family_projection_views',
    final_disposition: 'retain_typed_views_and_forbid_hash_equality_as_a_join_requirement',
    definition_collision_observed: false,
    generator_contract_action_open: false
  };
  if (prior.classification === 'single_family_projection_variants') return {
    ...prior,
    final_classification: 'single_family_schema_or_version_variants',
    final_disposition: 'retain_versions_separately_and_require_the_generator_to_declare_schema_or_version_boundaries',
    definition_collision_observed: false,
    generator_contract_action_open: true
  };
  if (prior.classification === 'mixed_cross_family_and_intra_family_variants') return {
    ...prior,
    final_classification: 'mixed_typed_views_and_intra_family_variants',
    final_disposition: 'retain_cross_family_views_and_open_generator_contract_actions_for_intra_family_variants',
    definition_collision_observed: false,
    generator_contract_action_open: true
  };
  assert.equal(prior.classification, 'same_path_projection_variants');
  const projections = object.occurrences.filter(projectionOccurrence);
  const byPath = new Map();
  for (const occurrence of projections) {
    const list = byPath.get(occurrence.path) ?? [];
    list.push(occurrence);
    byPath.set(occurrence.path, list);
  }
  const pathAssessments = [];
  let generatorContractActionOpen = false;
  for (const [file, occurrences] of [...byPath.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    const hashes = unique(occurrences.map(item => item.object_hash));
    if (hashes.length <= 1) continue;
    const templates = unique(occurrences.map(item => pointerTemplate(item.pointer)));
    const contextual = templates.length > 1 || templates.every(template => contextualPointerPattern.test(template));
    if (!contextual) generatorContractActionOpen = true;
    pathAssessments.push({
      path: file,
      family: pathFamily(file),
      occurrence_count: occurrences.length,
      hash_count: hashes.length,
      pointer_templates: templates,
      assessment: contextual
        ? 'contextual_repetition_or_multiple_typed_views'
        : 'generator_contract_required_for_repeated_same_template'
    });
  }
  return {
    ...prior,
    final_classification: generatorContractActionOpen
      ? 'same_path_generator_contract_candidates'
      : 'same_path_contextual_projection_repetition',
    final_disposition: generatorContractActionOpen
      ? 'retain_without_join_and_open_a_generator_specific_uniqueness_or_version_contract_action'
      : 'retain_contextual_repetitions_without_treating_object_hash_difference_as_a_definition_conflict',
    path_assessments: pathAssessments,
    definition_collision_observed: false,
    generator_contract_action_open: generatorContractActionOpen
  };
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-identifier-topology-wave-18-policy@1');
const preflight = readJson(policy.paths.preflight);
const objects = readJsonl('build/lake-index/objects.jsonl');
const objectByCompound = new Map(objects.map(row => [`${row.id_key}:${row.id_value}`, row]));
assert.equal(preflight.schema_version, 'lake-identifier-topology-wave-18-diagnostics@1');
assert.equal(preflight.counts.frozen_union, preflight.topology_rows.length);

const sourceOnlyCounts = new Map();
const divergenceCounts = new Map();
let generatorContractActions = 0;
let samePathContextual = 0;
const records = preflight.topology_rows.map(row => {
  const object = objectByCompound.get(`${row.id_key}:${row.id_value}`);
  assert.ok(object, `missing Wave 18 source object ${row.id_key}:${row.id_value}`);
  const sourceOnly = finalizeSourceOnly(row);
  const divergence = finalizeDivergence(row, object);
  if (sourceOnly) increment(sourceOnlyCounts, sourceOnly.final_classification);
  if (divergence) {
    increment(divergenceCounts, divergence.final_classification);
    if (divergence.generator_contract_action_open) generatorContractActions += 1;
    if (divergence.final_classification === 'same_path_contextual_projection_repetition') samePathContextual += 1;
  }
  return {
    topology_decision_id: row.topology_decision_id,
    id_key: row.id_key,
    id_value: row.id_value,
    topology_source_object: { [row.id_key]: row.id_value },
    baseline_states: row.states,
    baseline_occurrence_count: row.occurrence_count,
    baseline_source_paths: row.source_paths,
    baseline_projection_paths: row.projection_paths,
    indexing: {
      baseline_indexed: row.indexed,
      final_disposition: row.indexing_disposition,
      index_via_this_registry: !row.indexed
    },
    source_only: sourceOnly,
    divergence,
    review_required_to_decide: false,
    correction_mode: policy.decision_law.correction_mode,
    cross_key_join_authorized: false,
    relationship_created: false,
    participation_created: false,
    graph_effect: 'none'
  };
}).sort((a, b) => `${a.id_key}:${a.id_value}`.localeCompare(`${b.id_key}:${b.id_value}`));

assert.equal(records.length, preflight.counts.frozen_union);
assert.equal(new Set(records.map(row => `${row.id_key}:${row.id_value}`)).size, records.length);
assert.equal(records.filter(row => row.source_only?.final_classification === 'source_only_family_adjudication_required').length, 0);
assert.equal(records.filter(row => row.review_required_to_decide).length, 0);
assert.equal(records.filter(row => row.graph_effect !== 'none').length, 0);

const graphDigests = {
  participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
  active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
  hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
  rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
};

const registry = {
  schema_version: 'lake-identifier-topology-registry-wave-18@1',
  program_id: policy.program_id,
  baseline_source_fingerprint_sha256: policy.baseline.lake_source_fingerprint_sha256,
  graph_digests: graphDigests,
  counts: {
    records: records.length,
    baseline_unindexed: policy.baseline.unindexed_machine_ids,
    baseline_source_without_projection: policy.baseline.source_ids_without_projection,
    baseline_divergent_projections: policy.baseline.divergent_identifier_projections,
    source_only_classifications: asObject(sourceOnlyCounts),
    divergence_classifications: asObject(divergenceCounts),
    generator_contract_actions: generatorContractActions,
    same_path_contextual_repetitions: samePathContextual,
    unclassified_source_only_rows: 0,
    unadjudicated_divergence_rows: 0,
    decisions_requiring_human_permission: 0
  },
  records,
  boundaries: policy.boundaries
};
writeJson(policy.paths.registry, registry);

const projection = {
  schema_version: 'lake-identifier-topology-wave-18@1',
  program_id: policy.program_id,
  baseline_source_fingerprint_sha256: policy.baseline.lake_source_fingerprint_sha256,
  registry_sha256: digest(registry),
  graph_digests: graphDigests,
  counts: registry.counts,
  topology_decisions: records.map(row => ({
    topology_decision_id: row.topology_decision_id,
    id_key: row.id_key,
    id_value: row.id_value,
    baseline_states: row.baseline_states,
    indexing_disposition: row.indexing.final_disposition,
    source_only_classification: row.source_only?.final_classification ?? null,
    source_only_disposition: row.source_only?.final_disposition ?? null,
    divergence_classification: row.divergence?.final_classification ?? null,
    divergence_disposition: row.divergence?.final_disposition ?? null,
    generator_contract_action_open: row.divergence?.generator_contract_action_open ?? false,
    review_required_to_decide: false,
    cross_key_join_authorized: false,
    graph_effect: 'none'
  })),
  completion: {
    every_frozen_identifier_has_a_topology_decision: true,
    every_source_only_row_has_a_bounded_projection_disposition: true,
    every_divergent_row_has_a_typed_view_or_generator_contract_disposition: true,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeJson(policy.paths.projection, projection);
writeJson(policy.paths.receipt, {
  ...projection,
  schema_version: 'lake-identifier-topology-wave-18-receipt@1',
  post_execution_reconciliation_complete: false,
  after_counts: null
});

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
for (const relative of [
  policyPath,
  policy.paths.registry,
  policy.paths.projection,
  policy.paths.receipt,
  policy.paths.reconciliation
]) {
  if (!lakePolicy.authoritative_roots.includes(relative)) lakePolicy.authoritative_roots.push(relative);
}
lakePolicy.authoritative_roots.sort((a, b) => a.localeCompare(b));
for (const relative of [
  policy.paths.preflight,
  policy.paths.preflight_report,
  policy.paths.diagnostics,
  policy.paths.diagnostics_report,
  'build/lake-actions/identifier-topology-wave-18-family-diagnostics.json',
  'reports/lake-identifier-topology-wave-18-family-diagnostics.md',
  '.github/tmp/lake-identifier-topology-wave-18-preflight-trigger.json',
  '.github/tmp/lake-identifier-topology-wave-18-trigger.json'
]) {
  if (!lakePolicy.excluded_paths.includes(relative)) lakePolicy.excluded_paths.push(relative);
}
lakePolicy.excluded_paths.sort((a, b) => a.localeCompare(b));
Object.assign(lakePolicy.boundaries, {
  wave_18_indexing_is_addressability_not_identity_or_truth: true,
  wave_18_source_only_disposition_does_not_require_public_projection: true,
  wave_18_divergence_adjudication_does_not_authorize_cross_key_joins: true,
  wave_18_semantic_completeness_claimed: false,
  wave_18_graph_effect: 'none'
});
writeJson(lakePolicyPath, lakePolicy);

appendSection('BUILD-INSTRUCTIONS.md', '3.18 **Identifier topology', `3.18 **Identifier topology — Wave 18.**
Every identifier in the frozen unindexed, source-only, or divergent topology union receives
an append-preserving decision. Indexing creates addressability, not identity, truth,
publication status, or graph semantics. Source-only identifiers remain source-only unless a
named consumer contract justifies a typed projection. Cross-family projection views may be
valid; same-family variants retain explicit generator-contract actions rather than being
forced into byte equality.

The topology registry is an index and custody surface. It does not authorize automatic
cross-key joins, create relationships or participation, or establish semantic completeness.
Missing a reviewer never blocks reversible classification, indexing, or projection refusal.`);
appendSection('README.md', '## Identifier topology', `## Identifier topology

Wave 18 makes the residual machine-identifier topology addressable without collapsing
indexing, projection, identity, truth, or publication. Every frozen identifier receives a
bounded index, source-only, and divergence disposition. Source-only controls, intake IDs,
case-local IDs, and domain IDs do not acquire a public projection merely to lower a count.
Typed cross-family views remain distinct, and same-family variants carry generator-contract
repair actions. No topology decision creates a relationship, participation row, graph edge,
or automatic cross-key join.`);

console.log('identifier topology Wave 18 source controls materialized');
console.log(`  records / source-only / divergent: ${records.length} / ${policy.baseline.source_ids_without_projection} / ${policy.baseline.divergent_identifier_projections}`);
console.log(`  generator actions / contextual same-path: ${generatorContractActions} / ${samePathContextual}`);
console.log('  review dependencies / graph effects: 0 / 0');
