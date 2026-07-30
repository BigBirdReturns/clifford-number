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
  return fs.readFileSync(full(relative), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableId(prefix, parts) {
  return `${prefix}-${sha256(Buffer.from(parts.join('\0'))).slice(0, 24)}`;
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(value => value !== null && value !== undefined).map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function increment(map, key, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}

function asObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}

function firstSegmentAfter(file, prefix) {
  const rest = file.slice(prefix.length);
  return rest.split('/')[0] || 'root';
}

function classifyPath(row) {
  const file = row.path;
  const result = {
    owner_program_id: null,
    owner_scope: null,
    semantic_role: row.role,
    disposition: 'retain_and_index',
    confidence: 'high',
    rule_id: null,
    next_action: 'retain_under_assigned_owner_and_preserve_source_bytes'
  };

  const assign = (ruleId, owner, role = row.role, scope = 'semantic_program', confidence = 'high') => ({
    ...result,
    rule_id: ruleId,
    owner_program_id: owner,
    owner_scope: scope,
    semantic_role: role,
    confidence
  });

  if (file.startsWith('data/canonical/')) return assign('canonical-registry', 'canonical-registry-program', 'canonical_registry');
  if (file.startsWith('data/ledger/')) return assign('canonical-ledger', 'surface-hop-ledger-program', 'canonical_ledger');
  if (file.startsWith('cases/')) return assign('case-source', `case-program:${firstSegmentAfter(file, 'cases/')}`, 'case_source');
  if (file.startsWith('receipts/')) return assign('receipt-custody', `receipt-custody:${firstSegmentAfter(file, 'receipts/')}`, 'receipt_artifact');
  if (file.startsWith('data/intake/')) return assign('intake-family', `intake-program:${firstSegmentAfter(file, 'data/intake/')}`, 'intake');
  if (file.startsWith('data/research-tracks/')) return assign('research-track', `research-track:${firstSegmentAfter(file, 'data/research-tracks/')}`, 'research_track');
  if (file.startsWith('data/research/')) return assign('research-record', 'research-record-program', 'research_record');
  if (file.startsWith('data/project/')) return assign('project-governance', 'project-governance-program', 'project_governance');
  if (file.startsWith('data/estates/')) return assign('estate-source', 'estate-program', 'estate_source');
  if (file.startsWith('data/gametrails/')) return assign('gametrail-source', 'gametrail-program', 'gametrail_source');
  if (file.startsWith('data/milestones/')) return assign('milestone-source', 'milestone-history-program', 'milestone_source');
  if (file.startsWith('data/import-queues/')) return assign('import-queue', 'import-queue-program', 'import_queue');
  if (file.startsWith('reports/core-thesis/')) return assign('core-thesis-report', 'core-thesis-program', 'report_product');
  if (file.startsWith('reports/')) return assign('report-product', 'reporting-program', 'report_product');
  if (file.startsWith('docs/milestones/')) return assign('milestone-documentation', 'milestone-history-program', 'documentation');
  if (file.startsWith('docs/methods/')) return assign('method-documentation', 'methodology-program', 'documentation');
  if (file.startsWith('docs/')) return assign('documentation', 'documentation-program', 'documentation');
  if (file.startsWith('build/core-thesis/')) return assign('core-thesis-generated', 'core-thesis-program', 'generated_artifact');
  if (file.startsWith('build/estate-game-trails/')) return assign('gametrail-generated', 'gametrail-program', 'generated_artifact');
  if (file.startsWith('build/estate-closures/')) return assign('estate-closure-generated', 'estate-closure-program', 'generated_artifact');
  if (file.startsWith('build/estate-frontier/')) return assign('estate-frontier-generated', 'estate-frontier-program', 'generated_artifact');
  if (file.startsWith('build/lake-actions/')) return assign('lake-action-generated', 'lake-index-program', 'generated_artifact');
  if (file.startsWith('build/lake-index/')) return assign('lake-index-generated', 'lake-index-program', 'generated_artifact');
  if (file.startsWith('build/briefings/')) return assign('briefing-generated', 'reporter-briefing-program', 'briefing_product');
  if (file.startsWith('build/cases/')) return assign('case-generated', 'case-compilation-program', 'generated_artifact');
  if (file.startsWith('build/')) return assign('generated-product', 'generated-product-custody', 'generated_artifact', 'repository_custody', 'moderate');
  if (file.startsWith('briefs/')) return assign('briefing-product', 'reporter-briefing-program', 'briefing_product');
  if (file.startsWith('estates/')) return assign('estate-projection', 'estate-program', 'estate_projection');
  if (file.startsWith('gametrails/')) return assign('gametrail-projection', 'gametrail-program', 'gametrail_projection');
  if (file.startsWith('contributions/')) return assign('contribution-pipeline', 'contribution-pipeline', 'contribution_surface');
  if (file.startsWith('legacy/')) return assign('legacy-archive', 'legacy-archive-program', 'legacy_artifact', 'repository_custody', 'moderate');
  if (file.startsWith('comprehension/')) return assign('comprehension-protocol', 'comprehension-protocol', 'method_and_fixture');
  if (file.startsWith('.github/')) return assign('github-control', 'repository-operations-program', row.role, 'repository_custody', 'moderate');
  if (file.startsWith('tools/') || file.startsWith('test/')) return assign('implementation-control', 'repository-operations-program', row.role, 'repository_custody', 'moderate');
  if (!file.includes('/')) return assign('repository-root', 'project-governance-program', 'repository_root', 'repository_custody', 'moderate');

  return {
    ...result,
    rule_id: 'typed-refusal-unclassified-path',
    owner_program_id: policy.program_id,
    owner_scope: 'custody_only',
    semantic_role: 'unclassified_residual_path',
    disposition: 'typed_refusal_semantic_owner_not_inferable_from_current_repository_shape',
    confidence: 'low',
    next_action: 'retain_bytes_and_append_a_more_specific_owner_rule_when_new_lineage_evidence_appears'
  };
}

const deterministicControlKeys = new Set([
  'adjudication_id', 'candidate_id', 'decision_id', 'gap_id', 'observation_id',
  'registry_id', 'resolution_id', 'route_id', 'routing_id', 'subject_object_id',
  'supersession_id', 'validation_id', 'work_item_id'
]);
const domainKeys = new Set([
  'actor_id', 'case_id', 'claim_id', 'event_id', 'organization_id', 'program_id',
  'receipt_id', 'report_id', 'source_id', 'surface_id'
]);

function pathFamily(file) {
  if (file.startsWith('build/lake-index')) return 'lake-index';
  if (file.startsWith('build/core-thesis')) return 'core-thesis';
  if (file.startsWith('build/estate-game-trails')) return 'estate-game-trails';
  if (file.startsWith('build/estate')) return 'estate';
  if (file.startsWith('build/cases')) return 'cases';
  if (file.startsWith('build/briefings')) return 'briefings';
  if (file.startsWith('build/')) return `build:${firstSegmentAfter(file, 'build/')}`;
  if (file.startsWith('reports/')) return `reports:${firstSegmentAfter(file, 'reports/')}`;
  if (file.startsWith('docs/')) return `docs:${firstSegmentAfter(file, 'docs/')}`;
  return file.split('/')[0] || 'root';
}

function classifyProjectionObject(object) {
  const roles = uniqueSorted(object.occurrences.map(row => row.role));
  const families = uniqueSorted(object.occurrences.map(row => pathFamily(row.path)));
  const key = object.id_key;
  let classification = 'unclassified_projection_identifier';
  let source_plan = 'typed_refusal_pending_specific_derivation_rule';
  let confidence = 'low';

  if (families.every(family => family === 'lake-index')) {
    classification = 'lake_index_self_projection_identifier';
    source_plan = 'register_as_index_metadata_lineage';
    confidence = 'high';
  } else if (deterministicControlKeys.has(key) || /(?:decision|resolution|observation|registry|routing|route|gap|candidate|supersession)_id$/.test(key)) {
    classification = 'deterministic_control_identifier';
    source_plan = 'register_derivation_from_generating_projection_and_policy';
    confidence = 'high';
  } else if (domainKeys.has(key)) {
    classification = 'domain_identifier_missing_native_source_occurrence';
    source_plan = 'inspect_projection_family_and_materialize_native_source_or_explicit_projection_only_refusal';
    confidence = 'moderate';
  } else if (key === 'id') {
    classification = 'generic_generated_local_identifier';
    source_plan = 'classify_by_projection_family_before_any_cross_file_join';
    confidence = 'moderate';
  } else if (roles.every(role => ['documentation', 'report_product', 'briefing_product'].includes(role))) {
    classification = 'narrative_or_report_projection_identifier';
    source_plan = 'register_as_noncanonical_presentation_identifier';
    confidence = 'moderate';
  } else if (families.length === 1) {
    classification = 'single_family_projection_identifier';
    source_plan = 'register_family_scoped_derivation_without_cross_family_join';
    confidence = 'moderate';
  }

  return { classification, source_plan, confidence, roles, families };
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-residual-frontier-wave-17-policy@1');
const summary = readJson('build/lake-index/summary.json');
const files = readJsonl('build/lake-index/files.jsonl');
const objects = readJsonl('build/lake-index/objects.jsonl');
assert.equal(summary.source_fingerprint_sha256, policy.baseline.lake_source_fingerprint_sha256, 'Wave 17 baseline lake fingerprint drift');

const evidenceFiles = files.filter(row => row.evidence_bearing);
const noOwner = evidenceFiles.filter(row => row.ownership_state === 'no_program_owner_detected');
const exactOrphans = evidenceFiles.filter(row => row.exact_orphan);
const notIndexReachable = evidenceFiles.filter(row => !row.index_reachable);
const projectionOnly = objects.filter(row => row.projection_without_source);
assert.equal(noOwner.length, policy.baseline.evidence_paths_without_program_owner);
assert.equal(exactOrphans.length, policy.baseline.exact_orphan_evidence_files);
assert.equal(notIndexReachable.length, policy.baseline.evidence_paths_not_index_reachable);
assert.equal(projectionOnly.length, policy.baseline.projection_ids_without_source);

const residualPathByPath = new Map();
for (const row of evidenceFiles) {
  const residualTypes = [];
  if (row.ownership_state === 'no_program_owner_detected') residualTypes.push('no_program_owner');
  if (row.exact_orphan) residualTypes.push('exact_orphan');
  if (!row.index_reachable) residualTypes.push('not_index_reachable');
  if (!residualTypes.length) continue;
  const decision = classifyPath(row);
  residualPathByPath.set(row.path, {
    path_decision_id: stableId('LAKEW17PATH', [policy.program_id, row.path, row.sha256]),
    path: row.path,
    source_sha256: row.sha256,
    source_bytes: row.bytes,
    role: row.role,
    residual_types: residualTypes,
    ...decision,
    review_dependency: { required_to_decide: false },
    correction_mode: policy.decision_law.correction_mode,
    graph_effect: 'none'
  });
}
const residualPaths = [...residualPathByPath.values()].sort((left, right) => left.path.localeCompare(right.path));

const pathRuleCounts = new Map();
const pathDispositionCounts = new Map();
const pathOwnerCounts = new Map();
const residualOverlapCounts = new Map();
for (const row of residualPaths) {
  increment(pathRuleCounts, row.rule_id);
  increment(pathDispositionCounts, row.disposition);
  increment(pathOwnerCounts, row.owner_program_id);
  increment(residualOverlapCounts, row.residual_types.join('+'));
}

const projectionRows = projectionOnly.map(object => ({
  projection_lineage_id: stableId('LAKEW17PROJ', [policy.program_id, object.id_key, object.id_value]),
  id_key: object.id_key,
  id_value: object.id_value,
  occurrence_count: object.occurrence_count,
  paths: uniqueSorted(object.occurrences.map(row => row.path)),
  ...classifyProjectionObject(object),
  review_dependency: { required_to_decide: false },
  correction_mode: policy.decision_law.correction_mode,
  graph_effect: 'none'
})).sort((left, right) => `${left.id_key}:${left.id_value}`.localeCompare(`${right.id_key}:${right.id_value}`));

const projectionClassCounts = new Map();
const projectionKeyCounts = new Map();
const projectionFamilyCounts = new Map();
for (const row of projectionRows) {
  increment(projectionClassCounts, row.classification);
  increment(projectionKeyCounts, row.id_key);
  for (const family of row.families) increment(projectionFamilyCounts, family);
}

function topRows(map, limit = 40) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .slice(0, limit)
    .map(([key, count]) => ({ key, count }));
}

const preflight = {
  schema_version: 'lake-residual-frontier-wave-17-preflight@1',
  program_id: policy.program_id,
  baseline_source_fingerprint_sha256: summary.source_fingerprint_sha256,
  baseline_counts: {
    tracked_files_indexed: summary.counts.tracked_files_indexed,
    evidence_bearing_files: summary.counts.evidence_bearing_files,
    evidence_paths_without_program_owner: noOwner.length,
    exact_orphan_evidence_files: exactOrphans.length,
    evidence_paths_not_index_reachable: notIndexReachable.length,
    projection_ids_without_source: projectionOnly.length
  },
  residual_path_union_count: residualPaths.length,
  residual_path_overlap_counts: asObject(residualOverlapCounts),
  path_rule_counts: asObject(pathRuleCounts),
  path_disposition_counts: asObject(pathDispositionCounts),
  path_owner_counts: asObject(pathOwnerCounts),
  path_decisions: residualPaths,
  projection_classification_counts: asObject(projectionClassCounts),
  projection_id_key_counts: asObject(projectionKeyCounts),
  projection_family_counts: asObject(projectionFamilyCounts),
  projection_lineage_candidates: projectionRows,
  top_projection_id_keys: topRows(projectionKeyCounts),
  top_projection_families: topRows(projectionFamilyCounts),
  completion: {
    all_residual_paths_classified: residualPaths.every(row => row.rule_id && row.owner_program_id && row.disposition),
    all_projection_only_ids_classified: projectionRows.every(row => row.classification && row.source_plan),
    semantic_owner_refusals_preserved: residualPaths.filter(row => row.disposition.startsWith('typed_refusal')).length,
    projection_refusals_preserved: projectionRows.filter(row => row.classification === 'unclassified_projection_identifier').length,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
};
writeJson(policy.paths.preflight, preflight);

const lines = [];
lines.push('# Residual lake frontier — Wave 17 preflight');
lines.push('');
lines.push('```text');
lines.push(`evidence paths without owner:       ${noOwner.length}`);
lines.push(`exact orphan evidence paths:        ${exactOrphans.length}`);
lines.push(`evidence paths not index reachable: ${notIndexReachable.length}`);
lines.push(`distinct residual path union:       ${residualPaths.length}`);
lines.push(`projection IDs without source:      ${projectionOnly.length}`);
lines.push(`path semantic-owner refusals:       ${preflight.completion.semantic_owner_refusals_preserved}`);
lines.push(`projection classification refusals: ${preflight.completion.projection_refusals_preserved}`);
lines.push('review required to decide:          false');
lines.push('graph effect:                       none');
lines.push('```');
lines.push('');
lines.push('## Residual path overlap');
lines.push('');
for (const [key, count] of Object.entries(preflight.residual_path_overlap_counts)) lines.push(`- ${key}: ${count}`);
lines.push('');
lines.push('## Path rule counts');
lines.push('');
for (const row of topRows(pathRuleCounts, 60)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('');
lines.push('## Projection identifier classes');
lines.push('');
for (const row of topRows(projectionClassCounts, 60)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('');
lines.push('## Top projection ID keys');
lines.push('');
for (const row of preflight.top_projection_id_keys) lines.push(`- ${row.key}: ${row.count}`);
lines.push('');
lines.push('## Boundary');
lines.push('');
lines.push('This preflight classifies repository custody and projection lineage only. It does not prove evidence truth, source-byte completeness, semantic completeness, publication clearance, or common purpose. A typed refusal is an executable disposition with a correction route, not a wait for a hypothetical reviewer.');
fs.mkdirSync(path.dirname(full(policy.paths.preflight_report)), { recursive: true });
fs.writeFileSync(full(policy.paths.preflight_report), `${lines.join('\n')}\n`);

console.log('residual lake frontier Wave 17 preflight built');
console.log(`  residual paths: ${residualPaths.length}`);
console.log(`  no owner / orphan / not index reachable: ${noOwner.length} / ${exactOrphans.length} / ${notIndexReachable.length}`);
console.log(`  projection-only identifiers: ${projectionOnly.length}`);
console.log(`  path refusals / projection refusals: ${preflight.completion.semantic_owner_refusals_preserved} / ${preflight.completion.projection_refusals_preserved}`);
