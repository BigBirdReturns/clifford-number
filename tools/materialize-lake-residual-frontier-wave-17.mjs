#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-residual-frontier-wave-17-policy.json';

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}
function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(stable(value))));
}
function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(value => value !== null && value !== undefined).map(String))]
    .sort((left, right) => left.localeCompare(right));
}
function appendSection(relative, marker, section) {
  const current = fs.readFileSync(full(relative), 'utf8');
  if (current.includes(marker)) return;
  fs.writeFileSync(full(relative), `${current.trimEnd()}\n\n${section.trim()}\n`);
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-residual-frontier-wave-17-policy@1');
const preflight = readJson(policy.paths.preflight);
const objects = readJsonl('build/lake-index/objects.jsonl');
assert.equal(preflight.schema_version, 'lake-residual-frontier-wave-17-preflight@1');
assert.equal(preflight.baseline_source_fingerprint_sha256, policy.baseline.lake_source_fingerprint_sha256);
assert.equal(preflight.path_decisions.length, preflight.residual_path_union_count);
assert.equal(preflight.projection_lineage_candidates.length, policy.baseline.projection_ids_without_source);

function refinePathDecision(row) {
  if (!row.disposition.startsWith('typed_refusal')) return row;
  if (row.path.startsWith('data/crawl/')) return {
    ...row,
    rule_id: 'official-crawl-custody',
    owner_program_id: 'official-crawl-program',
    owner_scope: 'semantic_program',
    semantic_role: 'official_source_crawl_state',
    disposition: 'retain_and_index',
    confidence: 'high',
    next_action: 'retain_under_official_crawl_program_and_preserve_acquisition_state'
  };
  if (row.path.startsWith('data/signatures/')) return {
    ...row,
    rule_id: 'formation-signature-custody',
    owner_program_id: 'formation-signature-program',
    owner_scope: 'semantic_program',
    semantic_role: 'formation_signature_registry',
    disposition: 'retain_and_index',
    confidence: 'high',
    next_action: 'retain_under_formation_signature_program'
  };
  if (row.path === 'data/update-watchlist.json') return {
    ...row,
    rule_id: 'update-watchlist-custody',
    owner_program_id: 'update-watchlist-program',
    owner_scope: 'semantic_program',
    semantic_role: 'update_watchlist',
    disposition: 'retain_and_index',
    confidence: 'high',
    next_action: 'retain_under_update_watchlist_program'
  };
  return row;
}

const pathDecisions = preflight.path_decisions.map(refinePathDecision)
  .sort((left, right) => left.path.localeCompare(right.path));
const pathRefusals = pathDecisions.filter(row => row.disposition.startsWith('typed_refusal'));
assert.equal(pathDecisions.length, 601, 'Wave 17 path denominator drift');
assert.equal(pathRefusals.length, 0, `unresolved path ownership refusals: ${pathRefusals.map(row => row.path).join(', ')}`);

const pathRegistry = {
  schema_version: 'lake-residual-path-registry-wave-17@1',
  program_id: policy.program_id,
  baseline_source_fingerprint_sha256: policy.baseline.lake_source_fingerprint_sha256,
  counts: {
    decisions: pathDecisions.length,
    no_program_owner_baseline: policy.baseline.evidence_paths_without_program_owner,
    exact_orphan_baseline: policy.baseline.exact_orphan_evidence_files,
    not_index_reachable_baseline: policy.baseline.evidence_paths_not_index_reachable,
    typed_refusals: pathRefusals.length
  },
  decisions: pathDecisions.map(row => ({
    decision_key: row.path_decision_id,
    path: row.path,
    source_sha256: row.source_sha256,
    source_bytes: row.source_bytes,
    baseline_role: row.role,
    baseline_residual_types: row.residual_types,
    rule: row.rule_id,
    owner_program: row.owner_program_id,
    owner_scope: row.owner_scope,
    semantic_role: row.semantic_role,
    disposition: row.disposition,
    confidence: row.confidence,
    next_action: row.next_action,
    review_required_to_decide: false,
    correction_mode: policy.decision_law.correction_mode,
    graph_effect: 'none'
  })),
  boundaries: policy.boundaries
};
writeJson(policy.paths.path_registry, pathRegistry);

const sourceByValue = new Map();
for (const object of objects) {
  if (!object.source_occurrence) continue;
  const current = sourceByValue.get(object.id_value) ?? [];
  for (const occurrence of object.occurrences.filter(item => !item.generated && !['documentation', 'report_product', 'briefing_product'].includes(item.role))) {
    current.push({ id_key: object.id_key, path: occurrence.path, pointer: occurrence.pointer });
  }
  sourceByValue.set(object.id_value, current);
}

const entityProjectionKeys = new Set([
  'actor_id', 'anchor_actor_id', 'canonical_id', 'canonical_subject_id', 'legacy_local_id',
  'local_subject_id', 'obj_local_id', 'organization_id', 'participant_id', 'subj_local_id'
]);
const estateProjectionKeys = new Set(['from_estate_id', 'origin_estate_id', 'target_estate_id', 'to_estate_id']);
const controlProjectionKeys = new Set([
  'action_id', 'candidate_handoff_task_id', 'component_id', 'decision_id', 'exact_subject_observation_id',
  'explicit_mapping_id', 'issue_id', 'local_resolution_id', 'matched_rule_id', 'phase_shock_id',
  'queue_id', 'task_id', 'workstream_id'
]);
const reportProjectionKeys = new Set(['program_id', 'report_id']);
const schemaProjectionKeys = new Set(['schema_id', 'transaction_schema_id']);

function projectionClass(row) {
  if (entityProjectionKeys.has(row.id_key)) return 'cross_key_entity_projection';
  if (estateProjectionKeys.has(row.id_key)) return 'cross_key_estate_projection';
  if (controlProjectionKeys.has(row.id_key)) return 'deterministic_control_or_work_item_projection';
  if (reportProjectionKeys.has(row.id_key)) return 'report_or_program_projection_identity';
  if (schemaProjectionKeys.has(row.id_key)) return 'external_schema_locator_projection';
  throw new Error(`unclassified Wave 17 projection key: ${row.id_key}`);
}

const projectionRecords = preflight.projection_lineage_candidates.map(row => {
  const crossKeySources = uniqueSorted((sourceByValue.get(row.id_value) ?? []).map(item => `${item.id_key}\0${item.path}\0${item.pointer}`))
    .map(serialized => {
      const [id_key, source_path, pointer] = serialized.split('\0');
      return { id_key, source_path, pointer };
    });
  const classification = projectionClass(row);
  const sourceBasis = crossKeySources.length
    ? 'same_identifier_value_observed_in_non_generated_repository_source_under_another_key'
    : classification === 'external_schema_locator_projection'
      ? 'locator_is_the_identifier_and_no_remote_response_bytes_are_claimed'
      : 'deterministic_repository_projection_recipe_and_origin_paths';
  return {
    lineage_key: `${row.id_key}:${row.id_value}`,
    id_key: row.id_key,
    id_value: row.id_value,
    source_object: { [row.id_key]: row.id_value },
    classification,
    source_basis: sourceBasis,
    projection_paths: row.paths,
    projection_families: row.families,
    cross_key_source_occurrences: crossKeySources,
    derivation_recipe: crossKeySources.length
      ? 'project_the_same_repository_identifier_value_into_the_declared_output_key_without_creating_a_new_real_world_entity'
      : 'recompute_from_the_named_projection_family_and_preserve_the_generating_paths_as_repository_provenance',
    external_source_bytes_claimed: false,
    evidence_truth_determined: false,
    cross_key_join_authorized_beyond_this_declared_lineage: false,
    review_required_to_decide: false,
    correction_mode: policy.decision_law.correction_mode,
    graph_effect: 'none'
  };
}).sort((left, right) => left.lineage_key.localeCompare(right.lineage_key));
assert.equal(projectionRecords.length, 2000, 'Wave 17 projection denominator drift');
assert.equal(new Set(projectionRecords.map(row => row.lineage_key)).size, projectionRecords.length, 'duplicate Wave 17 projection lineage key');

const projectionClassCounts = {};
let crossKeyBacked = 0;
let deterministicRecipeBacked = 0;
for (const row of projectionRecords) {
  projectionClassCounts[row.classification] = (projectionClassCounts[row.classification] ?? 0) + 1;
  if (row.cross_key_source_occurrences.length) crossKeyBacked += 1;
  else deterministicRecipeBacked += 1;
}
const projectionRegistry = {
  schema_version: 'lake-projection-lineage-registry-wave-17@1',
  program_id: policy.program_id,
  baseline_source_fingerprint_sha256: policy.baseline.lake_source_fingerprint_sha256,
  counts: {
    records: projectionRecords.length,
    cross_key_source_backed: crossKeyBacked,
    deterministic_recipe_backed: deterministicRecipeBacked,
    classification_counts: Object.fromEntries(Object.entries(projectionClassCounts).sort(([a], [b]) => a.localeCompare(b)))
  },
  records: projectionRecords,
  boundaries: {
    repository_provenance_only: true,
    remote_source_bytes_complete: false,
    source_truth_determined: false,
    automatic_cross_key_join_authorized: false,
    graph_effect: 'none'
  }
};
writeJson(policy.paths.projection_registry, projectionRegistry);

const projection = {
  schema_version: 'lake-residual-frontier-wave-17@1',
  program_id: policy.program_id,
  baseline_source_fingerprint_sha256: policy.baseline.lake_source_fingerprint_sha256,
  path_registry_sha256: stableDigest(pathRegistry),
  projection_registry_sha256: stableDigest(projectionRegistry),
  counts: {
    residual_path_decisions: pathDecisions.length,
    residual_path_typed_refusals: pathRefusals.length,
    projection_lineage_records: projectionRecords.length,
    projection_lineage_cross_key_source_backed: crossKeyBacked,
    projection_lineage_deterministic_recipe_backed: deterministicRecipeBacked,
    projection_classification_counts: projectionRegistry.counts.classification_counts
  },
  completion: {
    all_baseline_residual_paths_have_bounded_owner_or_refusal: true,
    all_baseline_projection_only_identifiers_have_repository_lineage: true,
    typed_path_refusals: pathRefusals.length,
    review_required_to_decide: false,
    source_truth_determined: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeJson(policy.paths.projection, projection);
writeJson(policy.paths.receipt, {
  ...projection,
  schema_version: 'lake-residual-frontier-wave-17-receipt@1',
  post_execution_reconciliation_complete: false,
  after_counts: null
});

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
for (const relative of [
  policyPath,
  policy.paths.path_registry,
  policy.paths.projection_registry,
  policy.paths.projection,
  policy.paths.receipt,
  policy.paths.reconciliation
]) {
  if (!lakePolicy.authoritative_roots.includes(relative)) lakePolicy.authoritative_roots.push(relative);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));
for (const relative of [
  policy.paths.preflight,
  policy.paths.preflight_report,
  'build/lake-actions/residual-frontier-wave-17-diagnostics.json',
  'reports/lake-residual-frontier-wave-17-diagnostics.md',
  '.github/tmp/lake-residual-frontier-wave-17-trigger.json'
]) {
  if (!lakePolicy.excluded_paths.includes(relative)) lakePolicy.excluded_paths.push(relative);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));
Object.assign(lakePolicy.boundaries, {
  wave_17_path_ownership_is_repository_custody_not_evidence_truth: true,
  wave_17_projection_lineage_is_repository_provenance_not_remote_source_bytes: true,
  wave_17_semantic_completeness_claimed: false,
  wave_17_graph_effect: 'none'
});
writeJson(lakePolicyPath, lakePolicy);

appendSection('BUILD-INSTRUCTIONS.md', '3.17 **Residual lake frontier', `3.17 **Residual lake frontier — Wave 17.**
Every baseline evidence path lacking a detected owner receives a bounded semantic or
repository-custody owner in the Wave 17 residual-path registry. The registry is an
index route and custody decision; it does not prove claim truth or semantic completeness.

Every baseline projection-only compound identifier receives a repository-provenance
record. A cross-key source occurrence means the same value exists under another
repository key; it does not authorize unrestricted cross-key joins. A deterministic
projection recipe is source custody for the generated identifier, not external evidence.
Typed refusals remain valid executable outcomes, and missing a reviewer is never a
standalone blocker for reversible indexing or custody work.`);
appendSection('README.md', '## Residual lake frontier', `## Residual lake frontier

Wave 17 separates four residuals that must not be collapsed: program ownership,
exact orphan status, index reachability, and projection lineage. It assigns bounded
custody, creates explicit index routes, and records how generated identifiers arise.
These repairs improve addressability; they do not establish evidence truth, historical
completeness, remote source-byte custody, publication clearance, or a common-purpose
conclusion.`);

console.log('residual lake frontier Wave 17 materialized');
console.log(`  path decisions / refusals: ${pathDecisions.length} / ${pathRefusals.length}`);
console.log(`  projection lineage records: ${projectionRecords.length}`);
console.log(`  cross-key / deterministic recipe backed: ${crossKeyBacked} / ${deterministicRecipeBacked}`);
console.log('  review dependencies / graph effects: 0 / 0');
