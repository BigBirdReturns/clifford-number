#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-basin-execution-policy.json';
const outputPaths = [
  'build/core-thesis/index.json',
  'build/lake-actions/unclassified-path-dispositions.jsonl',
  'build/lake-actions/identifier-repair-queue.json',
  'build/lake-actions/case-catalog-dispositions.json',
  'build/lake-actions/branch-shadow-dispositions.json',
  'build/lake-actions/waterline.json',
  'reports/lake-basin-execution-wave-01.md'
];

const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(full(relative), 'utf8')
  .split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const stableJson = value => JSON.stringify(value, null, 2) + '\n';
const writeJson = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), stableJson(value));
};
const writeJsonl = (relative, rows) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
};
const uniq = values => [...new Set((values ?? []).filter(value => value !== null && value !== undefined && value !== ''))];
const sortStrings = values => uniq(values).sort((a, b) => String(a).localeCompare(String(b)));
const clusterOf = file => {
  const parts = String(file ?? '').split('/');
  if (!parts[0]) return 'unknown';
  if (['build', 'reports', 'data', 'cases', 'docs', 'receipts', 'contributions', '.github'].includes(parts[0])) return parts.slice(0, Math.min(2, parts.length)).join('/');
  return parts[0];
};
const reversible = {
  mode: 'append_preserving_supersession',
  correction_route: 'new_census_rows_or_counterevidence_may_replace_this_disposition_without_deleting_the_prior_record'
};
const reviewDependency = {
  required_to_decide: false,
  effect: 'challenge_may_reorder_or_overturn_but_does_not_block_reversible_execution'
};

if (!fs.existsSync(full(policyPath))) throw new Error(`missing execution policy: ${policyPath}`);
const policy = readJson(policyPath);
if (policy.schema_version !== 'lake-basin-execution-policy@1') throw new Error('unsupported execution policy schema');
for (const input of policy.input_paths ?? []) if (!fs.existsSync(full(input))) throw new Error(`missing execution input: ${input}`);

const inputs = [policyPath, ...(policy.input_paths ?? [])].map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
}).sort((a, b) => a.path.localeCompare(b.path));
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const files = readJsonl('build/lake-index/files.jsonl');
const filesByPath = new Map(files.map(row => [row.path, row]));
const cases = readJson('build/lake-index/cases.json').cases ?? [];
const branchRows = readJsonl('build/lake-index/branch-shadow.jsonl');
const idGaps = readJsonl('build/lake-index/id-gaps.jsonl');
const membership = readJsonl('build/lake-index/basin-membership.jsonl');
const basinGaps = readJsonl('build/lake-index/basin-gaps.jsonl');
const basinIndex = readJson('build/lake-index/basins.json');

function coreComponent(relative) {
  const remainder = relative.replace(/^build\/core-thesis\//, '');
  const first = remainder.split('/')[0];
  return first || 'root';
}

const coreRows = files.filter(row => row.path.startsWith(policy.core_thesis.source_prefix) && row.path !== policy.core_thesis.entrypoint)
  .sort((a, b) => a.path.localeCompare(b.path));
const reportRows = files.filter(row => row.path.startsWith(policy.core_thesis.report_prefix)).sort((a, b) => a.path.localeCompare(b.path));
const reportRefsByCorePath = new Map(coreRows.map(row => [row.path, []]));
for (const report of reportRows) {
  for (const target of report.outgoing_refs ?? []) if (reportRefsByCorePath.has(target)) reportRefsByCorePath.get(target).push(report.path);
}
const coreProducts = coreRows.map(row => ({
  path: row.path,
  component: coreComponent(row.path),
  bytes: row.bytes,
  sha256: row.sha256,
  schema_versions: row.schema_versions ?? [],
  program_ids: row.program_ids ?? [],
  case_ids: row.case_ids ?? [],
  report_ids: row.report_ids ?? [],
  status_values: row.status_values ?? [],
  source_references: sortStrings((row.outgoing_refs ?? []).filter(target => !target.startsWith(policy.core_thesis.source_prefix))),
  internal_projection_references: sortStrings((row.outgoing_refs ?? []).filter(target => target.startsWith(policy.core_thesis.source_prefix))),
  report_projections: sortStrings(reportRefsByCorePath.get(row.path) ?? []),
  incoming_references: sortStrings(row.incoming_refs ?? []),
  index_reachable_before_entrypoint: row.index_reachable === true,
  exact_orphan_before_entrypoint: row.exact_orphan === true,
  evidence_state: 'generated_projection_not_independent_evidence'
}));
const componentMap = new Map();
for (const row of coreProducts) {
  if (!componentMap.has(row.component)) componentMap.set(row.component, []);
  componentMap.get(row.component).push(row);
}
const components = [...componentMap.entries()].map(([component_id, rows]) => ({
  component_id,
  files: rows.length,
  bytes: rows.reduce((sum, row) => sum + (row.bytes ?? 0), 0),
  source_references: sortStrings(rows.flatMap(row => row.source_references)),
  report_projections: sortStrings(rows.flatMap(row => row.report_projections)),
  orphan_products_before_entrypoint: rows.filter(row => row.exact_orphan_before_entrypoint).length
})).sort((a, b) => b.files - a.files || a.component_id.localeCompare(b.component_id));
const coreIndex = {
  schema_version: 'core-thesis-product-index@1',
  program_id: policy.core_thesis.owner_program_id,
  source_fingerprint_sha256: sourceFingerprint,
  entrypoint: policy.core_thesis.entrypoint,
  publication_disposition: policy.core_thesis.publication_disposition,
  counts: {
    products: coreProducts.length,
    components: components.length,
    source_references: new Set(coreProducts.flatMap(row => row.source_references)).size,
    report_projections: new Set(coreProducts.flatMap(row => row.report_projections)).size,
    orphan_products_before_entrypoint: coreProducts.filter(row => row.exact_orphan_before_entrypoint).length
  },
  components,
  products: coreProducts,
  boundaries: {
    index_membership_proves_evidence_truth: false,
    generated_projection_is_independent_evidence: false,
    index_reachability_is_publication_clearance: false,
    graph_effect: 'none'
  }
};

function matchPathRule(file) {
  for (const rule of policy.unclassified_path_rules ?? []) {
    if ((rule.prefixes ?? []).some(prefix => file.startsWith(prefix))) return rule;
    if (rule.path_regex && new RegExp(rule.path_regex).test(file)) return rule;
  }
  return null;
}
const unclassifiedRows = membership.filter(row => row.basin_id === 'unclassified-current-tree').sort((a, b) => a.path.localeCompare(b.path));
const unclassifiedDispositions = unclassifiedRows.map(row => {
  const rule = matchPathRule(row.path);
  return {
    decision_id: `LAKE-PATH-${sha256(Buffer.from(row.path)).slice(0, 16)}`,
    path: row.path,
    source_sha256: row.source_sha256,
    source_bytes: row.source_bytes,
    evidence_bearing: row.evidence_bearing,
    exact_orphan: row.exact_orphan,
    matched_rule_id: rule?.rule_id ?? 'residual-explicit-disposition',
    owner_program_id: rule?.owner_program_id ?? 'lake-index-program',
    semantic_role: rule?.semantic_role ?? 'residual_current_tree_path',
    disposition: rule?.disposition ?? 'retain_blocked_with_explicit_specific_rule_required',
    publication_disposition: rule?.publication_disposition ?? 'blocked_pending_specific_classification',
    action: rule
      ? `apply_basin_rule:${rule.rule_id}`
      : 'preserve_the_path_and_add_an_exact_semantic_basin_rule_before_any_publication_or_deletion',
    confidence: rule ? 'high' : 'moderate',
    review_dependency: reviewDependency,
    reversibility: reversible,
    graph_effect: 'none'
  };
});

function caseDisposition(item) {
  for (const rule of policy.case_rules ?? []) {
    if (rule.condition === 'public_catalogued' && item.public_catalogued === true) return rule;
    if (rule.case_id_regex && new RegExp(rule.case_id_regex).test(item.case_id)) return rule;
    if ((rule.path_tokens ?? []).some(token => (item.paths ?? []).some(file => file.includes(token)))) return rule;
  }
  return {
    rule_id: 'internal-case-or-control',
    disposition: 'internal_case_or_control',
    owner_program_id: 'research-program-registry',
    action: 'retain_in_the_internal_case_index_and_attach_a_native_case_or_program_owner_before_public_catalogue_entry'
  };
}
const caseDispositions = cases.map(item => {
  const rule = caseDisposition(item);
  return {
    decision_id: `LAKE-CASE-${item.case_id}`,
    case_id: item.case_id,
    source_paths: item.paths ?? [],
    public_catalogued: item.public_catalogued === true,
    matched_rule_id: rule.rule_id,
    disposition: rule.disposition,
    owner_program_id: rule.owner_program_id,
    action: rule.action,
    review_dependency: reviewDependency,
    reversibility: reversible,
    publication_effect: item.public_catalogued ? 'retain_current_public_status' : 'no_public_catalogue_promotion',
    graph_effect: 'none'
  };
}).sort((a, b) => a.case_id.localeCompare(b.case_id));

function rowPaths(row) {
  if (Array.isArray(row.paths)) return row.paths;
  if (Array.isArray(row.occurrences)) return row.occurrences.map(item => item.path).filter(Boolean);
  return [];
}
const idGroups = new Map();
for (const row of idGaps) {
  const paths = sortStrings(rowPaths(row));
  const cluster = clusterOf(paths[0] ?? 'unknown');
  const idKey = row.id_key ?? 'unknown_id_key';
  const groupKey = `${row.gap_class}::${idKey}::${cluster}`;
  if (!idGroups.has(groupKey)) idGroups.set(groupKey, {
    gap_class: row.gap_class,
    id_key: idKey,
    path_cluster: cluster,
    row_count: 0,
    ids: new Set(),
    paths: new Set()
  });
  const group = idGroups.get(groupKey);
  group.row_count += 1;
  if (row.id_value !== undefined) group.ids.add(String(row.id_value));
  for (const file of paths) group.paths.add(file);
}
const identifierGroups = [...idGroups.values()].map(group => {
  const priority = policy.identifier_gap_priorities[group.gap_class] ?? { priority: 9, action: 'classify_and_resolve_the_identifier_gap' };
  const ids = [...group.ids].sort();
  const paths = [...group.paths].sort();
  return {
    queue_id: `ID-${sha256(Buffer.from(`${group.gap_class}:${group.id_key}:${group.path_cluster}`)).slice(0, 16)}`,
    priority: priority.priority,
    gap_class: group.gap_class,
    id_key: group.id_key,
    path_cluster: group.path_cluster,
    row_count: group.row_count,
    distinct_ids: ids.length,
    distinct_paths: paths.length,
    sample_ids: ids.slice(0, 25),
    sample_paths: paths.slice(0, 25),
    action: priority.action,
    decision: 'execute_repair_by_identifier_family_and_path_cluster',
    review_dependency: reviewDependency,
    reversibility: reversible,
    graph_effect: 'none'
  };
}).sort((a, b) => a.priority - b.priority || b.row_count - a.row_count || `${a.gap_class}:${a.id_key}:${a.path_cluster}`.localeCompare(`${b.gap_class}:${b.id_key}:${b.path_cluster}`));
const identifierRepairQueue = {
  schema_version: 'lake-identifier-repair-queue@1',
  source_fingerprint_sha256: sourceFingerprint,
  counts: {
    gap_rows: idGaps.length,
    repair_groups: identifierGroups.length,
    by_gap_class: Object.fromEntries(sortStrings(idGaps.map(row => row.gap_class)).map(gapClass => [gapClass, idGaps.filter(row => row.gap_class === gapClass).length]))
  },
  groups: identifierGroups,
  boundaries: {
    priority_proves_materiality: false,
    repeated_identifier_proves_same_entity: false,
    repair_queue_creates_graph_effect: false
  }
};

const prRows = branchRows.filter(row => row.row_type === 'pull_request');
const changedRowsByPr = new Map();
for (const row of branchRows.filter(row => row.row_type === 'changed_path')) {
  if (!changedRowsByPr.has(row.pr_number)) changedRowsByPr.set(row.pr_number, []);
  changedRowsByPr.get(row.pr_number).push(row);
}
const branchDispositions = prRows.map(pr => {
  const explicit = policy.branch_dispositions[String(pr.number)] ?? {
    disposition: 'freeze_diff_salvage_unique_rows_then_close_or_rebase',
    action: 'compare_against_current_main_preserve_unique_receipted_rows_and_assign_an_active_superseded_or_close_state'
  };
  const changed = changedRowsByPr.get(pr.number) ?? [];
  const branchOnly = changed.filter(row => row.branch_only_path);
  const transport = changed.filter(row => /(?:^|\/)(?:tmp|temporary)(?:\/|$)|payload|materializ/i.test(row.path));
  return {
    decision_id: `LAKE-PR-${pr.number}`,
    pr_number: pr.number,
    title: pr.title,
    head_ref: pr.head_ref,
    head_sha: pr.head_sha,
    base_ref: pr.base_ref,
    base_sha: pr.base_sha,
    draft: pr.draft,
    changed_paths: changed.length,
    branch_only_paths: branchOnly.length,
    branch_only_evidence_paths: branchOnly.filter(row => row.evidence_like).length,
    temporary_transport_paths: transport.length,
    disposition: explicit.disposition,
    action: explicit.action,
    path_dispositions: changed.map(row => ({
      path: row.path,
      branch_only: row.branch_only_path,
      evidence_like: row.evidence_like,
      disposition: transport.includes(row)
        ? 'do_not_merge_transport'
        : row.branch_only_path && row.evidence_like
          ? 'salvage_or_explicitly_reject_unique_evidence'
          : row.branch_only_path
            ? 'salvage_if_required_by_the_parent_disposition'
            : 'reconcile_against_current_main'
    })),
    review_dependency: reviewDependency,
    reversibility: reversible,
    graph_effect: 'none'
  };
}).sort((a, b) => a.pr_number - b.pr_number);

const publicBoundaryCount = basinGaps.filter(row => row.gap_type === 'public_reachability_requires_authorization_review').length;
const missingEntrypoints = basinGaps.filter(row => row.gap_type === 'missing_authoritative_entrypoint');
const sourceOrphans = basinGaps.filter(row => row.gap_type === 'source_record_without_authoritative_reachability');
const workItems = [
  {
    priority: 1,
    workstream_id: 'core_thesis_entrypoint',
    evidence_count: coreProducts.length,
    status: 'executed_in_wave_01',
    decision: 'create_the_authoritative_core_thesis_product_index',
    action: policy.core_thesis.entrypoint
  },
  {
    priority: 2,
    workstream_id: 'unclassified_path_disposition',
    evidence_count: unclassifiedDispositions.length,
    status: 'executed_in_wave_01',
    decision: 'assign_every_current_unclassified_path_a_bounded_owner_and_disposition',
    action: 'apply_the_disposition_ledger_to_the_basin_registry_and_regenerate_the_census'
  },
  {
    priority: 3,
    workstream_id: 'identifier_projection_integrity',
    evidence_count: idGaps.length,
    status: 'queued_by_identifier_family',
    decision: 'repair_projection_and_source_joins_by_gap_class_id_key_and_path_cluster',
    action: 'execute_identifier_repair_groups_in_priority_order'
  },
  {
    priority: 4,
    workstream_id: 'case_catalog_disposition',
    evidence_count: caseDispositions.filter(row => !row.public_catalogued).length,
    status: 'executed_in_wave_01',
    decision: 'classify_every_internal_case_identifier_without_forcing_public_catalogue_promotion',
    action: 'attach_each_case_to_its_declared_internal_or_public_entrypoint'
  },
  {
    priority: 5,
    workstream_id: 'branch_shadow_disposition',
    evidence_count: branchDispositions.reduce((sum, row) => sum + row.branch_only_paths, 0),
    status: 'executed_in_wave_01',
    decision: 'assign_each_open_branch_an_active_salvage_superseded_abandon_or_close_action',
    action: 'apply_the_per_PR_dispositions_and_preserve_unique_receipted_rows'
  },
  {
    priority: 6,
    workstream_id: 'public_reachability_after_release_integrity',
    evidence_count: publicBoundaryCount,
    status: 'blocked_by_material_publication_safety_dependency',
    decision: 'do_not_publish_blocked_or_internal_artifacts_through_recursive_copy',
    action: 'stack_after_PR_382_and_recompute_public_reachability_against_the_status_aware_allowlist',
    blocker: 'current_main_recursive_publication_boundary'
  }
];
const waterline = {
  schema_version: 'lake-basin-execution-waterline@1',
  program_id: policy.program_id,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  counts: {
    current_basin_count: basinIndex.counts?.basin_count ?? null,
    current_unclassified_paths: unclassifiedRows.length,
    unclassified_paths_with_decisions: unclassifiedDispositions.length,
    core_thesis_products_indexed: coreProducts.length,
    identifier_gap_rows_queued: idGaps.length,
    identifier_repair_groups: identifierGroups.length,
    case_ids_classified: caseDispositions.length,
    non_public_case_ids_classified: caseDispositions.filter(row => !row.public_catalogued).length,
    open_prs_dispositioned: branchDispositions.length,
    branch_only_paths_dispositioned: branchDispositions.reduce((sum, row) => sum + row.branch_only_paths, 0),
    public_boundary_gaps_deferred_to_release_integrity: publicBoundaryCount,
    source_orphan_gaps_remaining: sourceOrphans.length,
    prior_missing_entrypoints: missingEntrypoints.length,
    decisions_requiring_human_permission: 0
  },
  work_items: workItems,
  next_action: 'apply_unclassified_path_dispositions_to_the_basin_registry_then_execute_identifier_repair_priority_1',
  completion: {
    wave_01_decisions_complete: true,
    all_current_unclassified_paths_have_dispositions: unclassifiedDispositions.length === unclassifiedRows.length,
    all_current_case_ids_have_dispositions: caseDispositions.length === cases.length,
    all_current_open_prs_have_dispositions: branchDispositions.length === prRows.length,
    core_thesis_entrypoint_built: true,
    identifier_repairs_completed: false,
    public_boundary_recomputed_after_release_integrity: false,
    semantic_lake_complete: false,
    historical_git_complete: false,
    evidence_truth_determined: false
  },
  boundaries: policy.boundaries
};

const caseCounts = {};
for (const row of caseDispositions) caseCounts[row.disposition] = (caseCounts[row.disposition] ?? 0) + 1;
const prCounts = {};
for (const row of branchDispositions) prCounts[row.disposition] = (prCounts[row.disposition] ?? 0) + 1;
const pathRuleCounts = {};
for (const row of unclassifiedDispositions) pathRuleCounts[row.matched_rule_id] = (pathRuleCounts[row.matched_rule_id] ?? 0) + 1;
const workRows = workItems.map(row => `| ${row.priority} | ${row.workstream_id} | ${row.evidence_count} | ${row.status} | ${row.action} |`).join('\n');
const idRows = identifierGroups.slice(0, 25).map(row => `| ${row.priority} | ${row.gap_class} | ${row.id_key} | ${row.path_cluster} | ${row.row_count} | ${row.action} |`).join('\n');
const report = `# Evidence Lake Basin Execution Wave 01\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Decision\n\nThe current census contains enough information to execute bounded indexing and custody decisions. This wave does not wait for an unspecified reviewer. It creates the missing core-thesis entrypoint, dispositions every current unclassified path, classifies every case ID, dispositions every observed open PR, and converts all identifier gaps into an ordered repair queue.\n\n\`\`\`text\ncore-thesis products indexed:          ${coreProducts.length}\nunclassified paths dispositioned:      ${unclassifiedDispositions.length}\nidentifier gap rows queued:             ${idGaps.length}\nidentifier repair groups:               ${identifierGroups.length}\ncase IDs classified:                    ${caseDispositions.length}\nnon-public case IDs classified:         ${caseDispositions.filter(row => !row.public_catalogued).length}\nopen PRs dispositioned:                 ${branchDispositions.length}\nbranch-only paths dispositioned:        ${waterline.counts.branch_only_paths_dispositioned}\ndecisions requiring human permission:  0\n\`\`\`\n\n## Work order\n\n| Priority | Workstream | Evidence count | State | Action |\n|---:|---|---:|---|---|\n${workRows}\n\n## Identifier repair frontier\n\n| Priority | Gap class | ID key | Path cluster | Rows | Action |\n|---:|---|---|---|---:|---|\n${idRows || '| — | none | — | — | 0 | no identifier gap |'}\n\n## Disposition counts\n\n### Unclassified paths\n\n\`\`\`json\n${JSON.stringify(pathRuleCounts, null, 2)}\n\`\`\`\n\n### Case IDs\n\n\`\`\`json\n${JSON.stringify(caseCounts, null, 2)}\n\`\`\`\n\n### Open PRs\n\n\`\`\`json\n${JSON.stringify(prCounts, null, 2)}\n\`\`\`\n\n## Material dependency\n\nThe ${publicBoundaryCount} public-reachability conflicts are not waiting for a reviewer. They are held by a concrete publication-safety defect: current main recursively copies broad source trees. Recompute those rows after PR #382 installs the status-aware publication allowlist.\n\n## Boundary\n\nThese are indexing, custody, and work-allocation judgments. They do not determine evidence truth, publication clearance, guilt, motive, coordination, common purpose, or graph edges. Every disposition is append-preserving and replaceable when the source corpus changes.\n`;

writeJson('build/core-thesis/index.json', coreIndex);
writeJsonl('build/lake-actions/unclassified-path-dispositions.jsonl', unclassifiedDispositions);
writeJson('build/lake-actions/identifier-repair-queue.json', identifierRepairQueue);
writeJson('build/lake-actions/case-catalog-dispositions.json', {
  schema_version: 'lake-case-catalog-dispositions@1',
  source_fingerprint_sha256: sourceFingerprint,
  counts: { cases: caseDispositions.length, public_cases: caseDispositions.filter(row => row.public_catalogued).length, non_public_cases: caseDispositions.filter(row => !row.public_catalogued).length, by_disposition: caseCounts },
  cases: caseDispositions,
  boundaries: { disposition_is_publication_clearance: false, graph_effect: 'none' }
});
writeJson('build/lake-actions/branch-shadow-dispositions.json', {
  schema_version: 'lake-branch-shadow-dispositions@1',
  source_fingerprint_sha256: sourceFingerprint,
  counts: { pull_requests: branchDispositions.length, branch_only_paths: waterline.counts.branch_only_paths_dispositioned, by_disposition: prCounts },
  pull_requests: branchDispositions,
  boundaries: { disposition_executes_GitHub_close_or_merge: false, branch_shadow_is_merged_corpus: false, graph_effect: 'none' }
});
writeJson('build/lake-actions/waterline.json', waterline);
fs.mkdirSync(path.dirname(full('reports/lake-basin-execution-wave-01.md')), { recursive: true });
fs.writeFileSync(full('reports/lake-basin-execution-wave-01.md'), report);

console.log('build-lake-basin-execution-wave-01: complete');
console.log(`  core-thesis products: ${coreProducts.length}`);
console.log(`  unclassified dispositions: ${unclassifiedDispositions.length}`);
console.log(`  identifier repair groups: ${identifierGroups.length}`);
console.log(`  case dispositions: ${caseDispositions.length}`);
console.log(`  PR dispositions: ${branchDispositions.length}`);
console.log('  human permission gates: 0');
