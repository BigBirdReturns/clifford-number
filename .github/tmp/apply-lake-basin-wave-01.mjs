#!/usr/bin/env node
import fs from 'node:fs';

const policy = JSON.parse(fs.readFileSync('data/project/lake-basin-execution-policy.json', 'utf8'));
const registryPath = 'data/project/lake-basin-registry.json';
const indexPolicyPath = 'data/project/lake-index-policy.json';
const decisionsSourcePath = 'data/project/lake-wave-01-path-decisions.jsonl';
const migrationReceiptPath = 'data/project/lake-basin-execution-wave-01.json';
const dispositionsPath = 'build/lake-actions/unclassified-path-dispositions.jsonl';

const registry = JSON.parse(fs.readFileSync(registryPath, 'utf8'));
const indexPolicy = JSON.parse(fs.readFileSync(indexPolicyPath, 'utf8'));
const dispositionsText = fs.readFileSync(dispositionsPath, 'utf8');
const dispositions = dispositionsText.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const changedPaths = new Set([registryPath, indexPolicyPath, decisionsSourcePath, migrationReceiptPath]);

function addBasin(basin) {
  const existing = registry.basins.find(item => item.basin_id === basin.basin_id);
  if (existing) Object.assign(existing, basin);
  else registry.basins.push(basin);
}
function exactPaths(ruleId) {
  return dispositions.filter(row => row.matched_rule_id === ruleId).map(row => row.path).sort();
}
function rule(ruleId) {
  const found = policy.unclassified_path_rules.find(item => item.rule_id === ruleId);
  if (!found) throw new Error(`missing path rule ${ruleId}`);
  return found;
}
function basinFromRule(ruleId, label, pathPrefixes = null) {
  const source = rule(ruleId);
  return {
    basin_id: ruleId,
    label,
    path_prefixes: pathPrefixes ?? source.prefixes ?? exactPaths(ruleId),
    semantic_role: source.semantic_role,
    owner_program_id: source.owner_program_id,
    ownership_status: 'declared_by_wave_01_decision',
    authoritative_entrypoints: ['build/lake-actions/waterline.json', decisionsSourcePath],
    source_basin_ids: [],
    publication_disposition: source.publication_disposition,
    retention_disposition: source.disposition
  };
}

addBasin({
  basin_id: 'lake-action-products',
  label: 'Evidence-lake action and disposition products',
  path_prefixes: ['build/lake-actions/', 'reports/lake-basin-execution-wave-01.md'],
  semantic_role: 'operational_decision_projection',
  owner_program_id: policy.program_id,
  ownership_status: 'declared_by_wave_01_builder',
  authoritative_entrypoints: ['build/lake-actions/waterline.json'],
  source_basin_ids: ['project-governance', 'core-thesis-build-products'],
  publication_disposition: 'internal_or_explicitly_authorized',
  retention_disposition: 'reproducible_generated'
});
addBasin(basinFromRule('comprehension-protocol', 'Comprehension protocol and fixtures'));
addBasin(basinFromRule('contribution-pipeline', 'Contribution pipeline sources and templates'));
addBasin(basinFromRule('temporary-transport', 'Temporary build transport'));
addBasin(basinFromRule('standalone-public-release', 'Standalone public release products'));
addBasin(basinFromRule('root-legacy-artifact', 'Root legacy and configuration artifacts'));
addBasin(basinFromRule('repository-config', 'Repository configuration artifacts'));

const residualPaths = exactPaths('residual-explicit-disposition');
if (residualPaths.length) {
  addBasin({
    basin_id: 'residual-current-tree',
    label: 'Residual current-tree paths with exact Wave 01 dispositions',
    path_prefixes: residualPaths,
    semantic_role: 'residual_current_tree_path',
    owner_program_id: 'lake-index-program',
    ownership_status: 'provisional_exact_path_decision',
    authoritative_entrypoints: [decisionsSourcePath],
    source_basin_ids: [],
    publication_disposition: 'blocked_pending_specific_classification',
    retention_disposition: 'retain_with_explicit_followup'
  });
}

const core = registry.basins.find(item => item.basin_id === 'core-thesis-build-products');
if (!core) throw new Error('core-thesis-build-products basin missing');
core.ownership_status = 'declared_by_generated_entrypoint';
core.authoritative_entrypoints = [...new Set([...(core.authoritative_entrypoints ?? []), 'build/core-thesis/index.json'])];

registry.basins.sort((a, b) => a.basin_id.localeCompare(b.basin_id));
indexPolicy.authoritative_roots = [...new Set([
  ...(indexPolicy.authoritative_roots ?? []),
  'build/core-thesis/index.json',
  'build/lake-actions/waterline.json',
  'build/lake-actions/case-catalog-dispositions.json',
  'build/lake-actions/branch-shadow-dispositions.json',
  decisionsSourcePath,
  migrationReceiptPath
])].sort();

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2) + '\n');
fs.writeFileSync(indexPolicyPath, JSON.stringify(indexPolicy, null, 2) + '\n');
fs.writeFileSync(decisionsSourcePath, dispositionsText);
const receipt = {
  schema_version: 'lake-basin-execution-wave-01@1',
  program_id: policy.program_id,
  source_decision_rows: dispositions.length,
  added_or_updated_basins: [
    'lake-action-products',
    'comprehension-protocol',
    'contribution-pipeline',
    'temporary-transport',
    'standalone-public-release',
    'root-legacy-artifact',
    'repository-config',
    ...(residualPaths.length ? ['residual-current-tree'] : []),
    'core-thesis-build-products'
  ],
  authoritative_roots_added: [
    'build/core-thesis/index.json',
    'build/lake-actions/waterline.json',
    'build/lake-actions/case-catalog-dispositions.json',
    'build/lake-actions/branch-shadow-dispositions.json',
    decisionsSourcePath,
    migrationReceiptPath
  ],
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: {
    path_assignment_proves_semantic_truth: false,
    generated_entrypoint_is_independent_evidence: false,
    publication_cleared: false,
    graph_effect: 'none'
  }
};
fs.writeFileSync(migrationReceiptPath, JSON.stringify(receipt, null, 2) + '\n');
fs.writeFileSync('.github/tmp/lake-wave-01-source-paths.json', JSON.stringify({
  schema_version: 'lake-wave-01-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2) + '\n');
console.log(`lake Wave 01 source migration: ${dispositions.length} path decisions, ${receipt.added_or_updated_basins.length} basin updates`);
