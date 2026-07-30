#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
function readJson(relative) { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
function writeJson(relative, value) { fs.mkdirSync(path.dirname(full(relative)), { recursive: true }); fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`); }
function writeCompactJson(relative, value) { fs.mkdirSync(path.dirname(full(relative)), { recursive: true }); fs.writeFileSync(full(relative), `${JSON.stringify(value)}\n`); }
function sha256(value) { return crypto.createHash('sha256').update(value).digest('hex'); }
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value) { return sha256(JSON.stringify(stable(value))); }
function stableId(prefix, parts) { return `${prefix}-${sha256(Buffer.from(parts.join('\0'))).slice(0, 24)}`; }
function unique(values) { return [...new Set(values)].sort((a, b) => a.localeCompare(b)); }
function increment(map, key) { map.set(key, (map.get(key) ?? 0) + 1); }
function asObject(map) { return Object.fromEntries([...map.entries()].sort(([a], [b]) => a.localeCompare(b))); }
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}
function sourceOccurrence(occurrence) {
  return !projectionOccurrence(occurrence)
    && !['documentation', 'report_product', 'briefing_product'].includes(occurrence.role);
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
  if (file.startsWith('data/intake/')) return `data/intake/${parts[2] ?? 'root'}`;
  if (file.startsWith('data/research-tracks/')) return `data/research-tracks/${parts[2] ?? 'root'}`;
  if (file.startsWith('data/research/')) return 'data/research';
  if (file.startsWith('data/project/')) return 'data/project';
  if (file.startsWith('data/canonical/')) return 'data/canonical';
  if (file.startsWith('data/ledger/')) return 'data/ledger';
  if (file.startsWith('cases/')) return `cases/${parts[1] ?? 'root'}`;
  if (file.startsWith('reports/')) return `reports/${parts[1] ?? 'root'}`;
  if (file.startsWith('docs/')) return `docs/${parts[1] ?? 'root'}`;
  if (file.startsWith('estates/')) return 'estates';
  if (file.startsWith('gametrails/')) return 'gametrails';
  if (file.startsWith('briefs/')) return 'briefs';
  return parts[0] || 'root';
}

const controlKeyPattern = /(?:^|_)(?:action|adjudication|candidate|decision|gap|issue|observation|queue|registry|resolution|route|routing|supersession|task|validation|work_item|workstream)_id$/;
const domainKeys = new Set([
  'actor_id', 'award_id', 'canonical_actor_id', 'case_id', 'claim_id', 'committee_id',
  'company_id', 'contract_id', 'event_id', 'filing_history_dataset_id', 'interest_id',
  'organization_id', 'participant_id', 'person_id', 'program_id', 'receipt_id', 'report_id',
  'source_id', 'surface_id'
]);
const estateKeys = new Set(['estate_id', 'from_estate_id', 'origin_estate_id', 'target_estate_id', 'to_estate_id']);
const lineageKeys = new Set(['predicate_id', 'record_id', 'source_record_id']);
const graphNodeKeys = new Set(['node_id', 'object_node_id', 'subject_node_id', 'target_node_id']);
const contextualPointerPattern = /\/(?:aliases|case_pairs|cases|claims|classification|corridors|crosswalks|custody_runs|decisions|directed_overlap_pairs|edges|evidence|explicit_exact_equality_references|fanout|hops|identity_resolutions|legacy_runs|mentions|objects|observations|participation_receipt_links|query_executions|records|relations|resolution_observations|resolutions|rows|seed_events|shared_surfaces|source_route_runs|source_snapshot|subject_object_observations|subject_objects|surfaces|threads|trails|unresolved_observations|unresolved_subjects)\//;

function sourceOnlyDecision(object) {
  const sourceOccurrences = object.occurrences.filter(sourceOccurrence);
  const families = unique(sourceOccurrences.map(item => pathFamily(item.path)));
  const roles = unique(sourceOccurrences.map(item => item.role));
  if (controlKeyPattern.test(object.id_key)) return {
    final_classification: 'intentional_source_only_control_identifier',
    final_disposition: 'retain_source_only_as_control_identifier'
  };
  if (estateKeys.has(object.id_key)) return {
    final_classification: 'estate_identifier_projection_candidate',
    final_disposition: 'retain_source_only_and_open_typed_estate_consumer_contract_action'
  };
  if (domainKeys.has(object.id_key)) return {
    final_classification: 'external_or_domain_identifier_source_only',
    final_disposition: 'retain_source_only_until_named_domain_consumer_requires_projection'
  };
  if (lineageKeys.has(object.id_key)) return {
    final_classification: 'lineage_record_or_vocabulary_identifier_source_only',
    final_disposition: 'retain_source_only_as_lineage_or_schema_vocabulary'
  };
  if (graphNodeKeys.has(object.id_key)) return {
    final_classification: 'legacy_or_analytic_graph_node_identifier_source_only',
    final_disposition: 'retain_source_only_and_forbid_automatic_graph_promotion'
  };
  if (families.length && families.every(family => family.startsWith('data/intake/'))) return {
    final_classification: 'intake_source_identifier_not_yet_promoted',
    final_disposition: 'retain_intake_only_until_explicit_promotion_or_nonpromotion'
  };
  if (families.length && families.every(family => family.startsWith('cases/'))) return {
    final_classification: 'case_local_source_identifier_without_global_projection',
    final_disposition: 'retain_case_scoped_without_cross_case_projection'
  };
  if (roles.length && roles.every(role => ['project_governance', 'repository_root', 'test'].includes(role))) return {
    final_classification: 'governance_or_fixture_identifier_source_only',
    final_disposition: 'retain_source_only_in_control_plane'
  };
  return {
    final_classification: 'post_freeze_source_only_identifier_without_named_consumer',
    final_disposition: 'retain_source_only_until_explicit_consumer_contract'
  };
}

function divergenceDecision(object) {
  const projections = object.occurrences.filter(projectionOccurrence);
  const hashesByFamily = new Map();
  const hashesByPath = new Map();
  const occurrencesByPath = new Map();
  for (const occurrence of projections) {
    const family = pathFamily(occurrence.path);
    if (!hashesByFamily.has(family)) hashesByFamily.set(family, new Set());
    hashesByFamily.get(family).add(occurrence.object_hash);
    if (!hashesByPath.has(occurrence.path)) hashesByPath.set(occurrence.path, new Set());
    hashesByPath.get(occurrence.path).add(occurrence.object_hash);
    const list = occurrencesByPath.get(occurrence.path) ?? [];
    list.push(occurrence);
    occurrencesByPath.set(occurrence.path, list);
  }
  const conflictingPaths = [...hashesByPath].filter(([, hashes]) => hashes.size > 1).map(([file]) => file);
  const conflictingFamilies = [...hashesByFamily].filter(([, hashes]) => hashes.size > 1).map(([family]) => family);
  if (conflictingPaths.length) {
    let action = false;
    for (const file of conflictingPaths) {
      const templates = unique((occurrencesByPath.get(file) ?? []).map(item => pointerTemplate(item.pointer)));
      const contextual = templates.length > 1 || templates.every(template => contextualPointerPattern.test(template));
      if (!contextual) action = true;
    }
    return action ? {
      final_classification: 'same_path_generator_contract_candidates',
      final_disposition: 'retain_without_join_and_open_generator_uniqueness_or_version_action',
      generator_contract_action_open: true
    } : {
      final_classification: 'same_path_contextual_projection_repetition',
      final_disposition: 'retain_contextual_repetitions_without_definition_conflict',
      generator_contract_action_open: false
    };
  }
  if (conflictingFamilies.length && hashesByFamily.size === 1) return {
    final_classification: 'single_family_schema_or_version_variants',
    final_disposition: 'retain_versions_and_require_declared_generator_schema_boundary',
    generator_contract_action_open: true
  };
  if (conflictingFamilies.length) return {
    final_classification: 'mixed_typed_views_and_intra_family_variants',
    final_disposition: 'retain_typed_views_and_open_intra_family_generator_contract_action',
    generator_contract_action_open: true
  };
  return {
    final_classification: 'typed_cross_family_projection_views',
    final_disposition: 'retain_typed_views_without_hash_equality_join',
    generator_contract_action_open: false
  };
}

const policy = readJson('data/project/lake-identifier-topology-wave-18-policy.json');
const registry = readJson(policy.paths.registry);
const liveObjectIndex = readJson('build/lake-object-index.json');
const lakePolicy = readJson('data/project/lake-index-policy.json');
const existing = new Set(registry.records.map(row => `${row.id_key}:${row.id_value}`));
const candidates = (liveObjectIndex.objects ?? [])
  .filter(object => !existing.has(`${object.id_key}:${object.id_value}`))
  .filter(object => !object.indexed || object.source_without_projection || object.divergent_projections || object.projection_without_source)
  .sort((a, b) => `${a.id_key}:${a.id_value}`.localeCompare(`${b.id_key}:${b.id_value}`));

if (!candidates.length) {
  console.log('identifier topology Wave 18 expansion: fixed point reached (0 additions)');
  process.exit(0);
}

const additions = candidates.map(object => {
  const states = ['post_freeze_delta'];
  if (!object.indexed) states.push('unindexed');
  if (object.source_without_projection) states.push('source_without_projection');
  if (object.divergent_projections) states.push('divergent_projections');
  if (object.projection_without_source) states.push('projection_without_source');
  return {
    topology_decision_id: stableId('LAKEW18TOPO', [policy.program_id, object.id_key, object.id_value]),
    id_key: object.id_key,
    id_value: object.id_value,
    topology_source_object: { [object.id_key]: object.id_value },
    baseline_states: states,
    indexing: {
      baseline_indexed: object.indexed,
      final_disposition: object.indexed ? 'already_indexed' : 'index_in_wave_18_topology_registry_without_asserting_identity_or_truth'
    },
    ...(object.source_without_projection ? { source_only: sourceOnlyDecision(object) } : {}),
    ...(object.divergent_projections ? { divergence: divergenceDecision(object) } : {}),
    review_required_to_decide: false,
    cross_key_join_authorized: false,
    graph_effect: 'none'
  };
});

registry.records.push(...additions);
registry.records.sort((a, b) => `${a.id_key}:${a.id_value}`.localeCompare(`${b.id_key}:${b.id_value}`));
assert.equal(new Set(registry.records.map(row => `${row.id_key}:${row.id_value}`)).size, registry.records.length);

const sourceOnlyCounts = new Map();
const divergenceCounts = new Map();
let generatorActions = 0;
let contextual = 0;
for (const row of registry.records) {
  if (row.source_only) increment(sourceOnlyCounts, row.source_only.final_classification);
  if (row.divergence) {
    increment(divergenceCounts, row.divergence.final_classification);
    if (row.divergence.generator_contract_action_open) generatorActions += 1;
    if (row.divergence.final_classification === 'same_path_contextual_projection_repetition') contextual += 1;
  }
}
registry.counts = {
  ...registry.counts,
  records: registry.records.length,
  post_freeze_records: (registry.counts.post_freeze_records ?? 0) + additions.length,
  source_only_classifications: asObject(sourceOnlyCounts),
  divergence_classifications: asObject(divergenceCounts),
  generator_contract_actions: generatorActions,
  same_path_contextual_repetitions: contextual,
  unclassified_source_only_rows: 0,
  unadjudicated_divergence_rows: 0,
  decisions_requiring_human_permission: 0
};
writeCompactJson(policy.paths.registry, registry);

const projection = {
  schema_version: 'lake-identifier-topology-wave-18@1',
  program_id: policy.program_id,
  baseline_source_fingerprint_sha256: policy.baseline.lake_source_fingerprint_sha256,
  registry_sha256: digest(registry),
  graph_digests: registry.graph_digests,
  counts: registry.counts,
  topology_decisions: registry.records.map(row => ({
    topology_decision_id: row.topology_decision_id,
    id_key: row.id_key,
    id_value: row.id_value,
    index_disposition: row.indexing.final_disposition,
    source_only_disposition: row.source_only?.final_classification ?? null,
    divergence_disposition: row.divergence?.final_classification ?? null,
    generator_contract_action_open: row.divergence?.generator_contract_action_open ?? false,
    graph_effect: 'none'
  })),
  completion: {
    every_frozen_identifier_has_a_topology_decision: true,
    every_observed_post_freeze_delta_has_a_topology_decision: true,
    every_source_only_row_has_a_bounded_projection_disposition: true,
    every_divergent_row_has_a_typed_view_or_generator_contract_disposition: true,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeCompactJson(policy.paths.projection, projection);
writeJson(policy.paths.receipt, {
  schema_version: 'lake-identifier-topology-wave-18-receipt@1',
  program_id: policy.program_id,
  registry_sha256: projection.registry_sha256,
  graph_digests: registry.graph_digests,
  counts: registry.counts,
  post_execution_reconciliation_complete: false,
  after_counts: null,
  boundaries: policy.boundaries
});

const ceiling = Number(lakePolicy.max_text_bytes ?? 8_000_000);
const registryBytes = fs.statSync(full(policy.paths.registry)).size;
const projectionBytes = fs.statSync(full(policy.paths.projection)).size;
assert.ok(registryBytes <= ceiling, `expanded registry exceeds parser ceiling: ${registryBytes} > ${ceiling}`);
assert.ok(projectionBytes <= ceiling, `expanded projection exceeds parser ceiling: ${projectionBytes} > ${ceiling}`);

console.log(`identifier topology Wave 18 expansion: ${additions.length} post-freeze decisions added`);
console.log(`  records / bytes: ${registry.records.length} / ${registryBytes}`);
