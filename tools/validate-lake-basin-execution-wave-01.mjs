#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); }
  catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
});
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const failures = [];
const fail = message => failures.push(message);
const assert = (condition, message) => { if (!condition) fail(message); };

const policy = readJson('data/project/lake-basin-execution-policy.json');
const core = readJson('build/core-thesis/index.json');
const pathDecisions = readJsonl('build/lake-actions/unclassified-path-dispositions.jsonl');
const idQueue = readJson('build/lake-actions/identifier-repair-queue.json');
const caseLedger = readJson('build/lake-actions/case-catalog-dispositions.json');
const branchLedger = readJson('build/lake-actions/branch-shadow-dispositions.json');
const waterline = readJson('build/lake-actions/waterline.json');
const reconciliation = readJson('build/lake-actions/post-execution-reconciliation.json');
const finalBasins = readJson('build/lake-index/basins.json');
const finalMembership = readJsonl('build/lake-index/basin-membership.jsonl');
const finalGaps = readJsonl('build/lake-index/basin-gaps.jsonl');
const sourcePathLedger = fs.existsSync(full('data/project/lake-wave-01-path-decisions.jsonl'))
  ? readJsonl('data/project/lake-wave-01-path-decisions.jsonl')
  : null;

assert(policy.schema_version === 'lake-basin-execution-policy@1', 'policy schema drift');
assert(policy.decision_authority?.human_permission_required === false, 'policy reintroduced a human-permission gate');
assert(policy.decision_authority?.independent_review_effect?.includes('does_not_block_reversible_execution'), 'review effect drift');
assert(policy.boundaries?.graph_effect === 'none', 'policy graph boundary drift');

assert(core.schema_version === 'core-thesis-product-index@1', 'core-thesis index schema drift');
assert(core.entrypoint === 'build/core-thesis/index.json', 'core-thesis entrypoint drift');
assert(core.counts?.products === core.products?.length, 'core-thesis product count mismatch');
assert(core.products?.length > 0, 'core-thesis index is empty');
assert(core.products.every(row => row.path.startsWith('build/core-thesis/') && row.path !== 'build/core-thesis/index.json'), 'core-thesis index contains an invalid path');
assert(core.products.every(row => row.evidence_state === 'generated_projection_not_independent_evidence'), 'core-thesis projection boundary missing');
assert(core.boundaries?.generated_projection_is_independent_evidence === false, 'core-thesis independent-evidence boundary drift');

const pathSet = new Set();
for (const row of pathDecisions) {
  assert(row.path && !pathSet.has(row.path), `duplicate or missing path disposition: ${row.path}`);
  pathSet.add(row.path);
  assert(row.owner_program_id, `${row.path}: owner decision missing`);
  assert(row.disposition && row.action, `${row.path}: disposition or action missing`);
  assert(row.review_dependency?.required_to_decide === false, `${row.path}: human permission gate remains`);
  assert(row.reversibility?.mode === 'append_preserving_supersession', `${row.path}: correction route missing`);
  assert(row.graph_effect === 'none', `${row.path}: graph effect created`);
}
assert(pathDecisions.length === waterline.counts?.unclassified_paths_with_decisions, 'path disposition count drift');
assert(pathDecisions.length === waterline.counts?.current_unclassified_paths, 'not every pre-execution unclassified path received a decision');
if (sourcePathLedger) {
  assert(JSON.stringify(sourcePathLedger) === JSON.stringify(pathDecisions), 'durable path-decision source ledger differs from the generated decision ledger');
}

assert(idQueue.schema_version === 'lake-identifier-repair-queue@1', 'identifier queue schema drift');
assert(idQueue.counts?.gap_rows === waterline.counts?.identifier_gap_rows_queued, 'identifier gap denominator drift');
assert(idQueue.groups?.reduce((sum, row) => sum + row.row_count, 0) === idQueue.counts?.gap_rows, 'identifier repair groups do not exhaust the denominator');
assert(idQueue.groups?.length === waterline.counts?.identifier_repair_groups, 'identifier group count drift');
assert(idQueue.groups?.every(row => row.review_dependency?.required_to_decide === false && row.action && row.graph_effect === 'none'), 'identifier queue contains a human gate or missing action');
assert(idQueue.boundaries?.repeated_identifier_proves_same_entity === false, 'identifier identity boundary drift');

assert(caseLedger.schema_version === 'lake-case-catalog-dispositions@1', 'case disposition schema drift');
assert(caseLedger.cases?.length === caseLedger.counts?.cases, 'case disposition count mismatch');
assert(caseLedger.cases?.length === waterline.counts?.case_ids_classified, 'waterline case count mismatch');
assert(new Set(caseLedger.cases.map(row => row.case_id)).size === caseLedger.cases.length, 'duplicate case dispositions');
assert(caseLedger.cases.every(row => row.disposition && row.owner_program_id && row.action && row.review_dependency?.required_to_decide === false), 'case disposition lacks a decision or reintroduces a human gate');
assert(caseLedger.cases.filter(row => !row.public_catalogued).length === waterline.counts?.non_public_case_ids_classified, 'non-public case count drift');

assert(branchLedger.schema_version === 'lake-branch-shadow-dispositions@1', 'branch disposition schema drift');
assert(branchLedger.pull_requests?.length === branchLedger.counts?.pull_requests, 'PR disposition count mismatch');
assert(branchLedger.pull_requests?.length === waterline.counts?.open_prs_dispositioned, 'waterline PR count mismatch');
assert(new Set(branchLedger.pull_requests.map(row => row.pr_number)).size === branchLedger.pull_requests.length, 'duplicate PR dispositions');
assert(branchLedger.pull_requests.every(row => row.disposition && row.action && row.review_dependency?.required_to_decide === false), 'PR disposition lacks an action or reintroduces a human gate');
assert(branchLedger.pull_requests.every(row => row.path_dispositions?.length === row.changed_paths), 'PR path disposition count mismatch');

assert(waterline.schema_version === 'lake-basin-execution-waterline@1', 'execution waterline schema drift');
assert(waterline.counts?.decisions_requiring_human_permission === 0, 'execution waterline contains a human-permission gate');
assert(waterline.completion?.wave_01_decisions_complete === true, 'Wave 01 decisions not complete');
assert(waterline.completion?.all_current_unclassified_paths_have_dispositions === true, 'unclassified path decision denominator incomplete');
assert(waterline.completion?.all_current_case_ids_have_dispositions === true, 'case decision denominator incomplete');
assert(waterline.completion?.all_current_open_prs_have_dispositions === true, 'PR decision denominator incomplete');
assert(waterline.completion?.identifier_repairs_completed === false, 'identifier repair completion was fabricated');
assert(waterline.completion?.semantic_lake_complete === false, 'semantic lake completion was fabricated');
assert(waterline.work_items?.some(row => row.workstream_id === 'public_reachability_after_release_integrity' && row.blocker === 'current_main_recursive_publication_boundary'), 'material publication-safety dependency missing');

assert(reconciliation.schema_version === 'lake-basin-execution-wave-01-reconciliation@1', 'reconciliation schema drift');
assert(reconciliation.completion?.decisions_requiring_human_permission === 0, 'reconciliation introduced a human-permission gate');
assert(reconciliation.after?.core_thesis_missing_entrypoints === 0, 'core-thesis entrypoint remains missing after execution');
assert(reconciliation.completion?.core_thesis_entrypoint_closed === true, 'core-thesis entrypoint completion drift');
assert(reconciliation.decisions?.every(row => row.review_dependency?.required_to_decide === false && row.graph_effect === 'none'), 'reconciliation decision contains a human gate or graph effect');
assert(reconciliation.completion?.identifier_repairs_complete === false, 'identifier repair completion was fabricated after reconciliation');
assert(reconciliation.completion?.semantic_lake_complete === false, 'semantic lake completion was fabricated after reconciliation');

const finalUnclassified = finalMembership.filter(row => row.basin_id === 'unclassified-current-tree');
assert(finalUnclassified.length === reconciliation.after?.unclassified_paths, 'final unclassified count drift');
assert(reconciliation.deltas?.unclassified_paths === reconciliation.after.unclassified_paths - reconciliation.before.unclassified_paths, 'unclassified delta mismatch');
const coreMissing = finalGaps.filter(row => row.gap_type === 'missing_authoritative_entrypoint' && row.basin_id === 'core-thesis-build-products');
assert(coreMissing.length === 0, 'final basin gaps still contain the core-thesis entrypoint blocker');
const coreBasin = finalBasins.basins?.find(row => row.basin_id === 'core-thesis-build-products');
assert(coreBasin?.entrypoint_complete === true, 'core-thesis basin does not recognize its entrypoint');
assert(coreBasin?.authoritative_entrypoints?.includes('build/core-thesis/index.json'), 'core-thesis basin entrypoint not attached');

const manifestFingerprint = sha256(Buffer.from((waterline.input_manifest ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
assert(manifestFingerprint === waterline.source_fingerprint_sha256, 'pre-execution input manifest fingerprint mismatch');
assert(waterline.input_manifest?.every(row => row.path && row.sha256 && Number.isFinite(row.bytes)), 'pre-execution input manifest malformed');

for (const reportPath of ['reports/lake-basin-execution-wave-01.md', 'reports/lake-basin-execution-wave-01-reconciliation.md']) {
  const report = fs.readFileSync(full(reportPath), 'utf8');
  assert(report.includes('decisions requiring human permission') || report.includes('not waiting for a reviewer') || report.includes('not by missing human permission'), `${reportPath}: no-human-veto statement missing`);
  assert(report.includes('does not') || report.includes('do not'), `${reportPath}: boundary language missing`);
}

if (failures.length) {
  console.error(`lake basin execution Wave 01 validation failed with ${failures.length} error(s):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('lake basin execution Wave 01 validation: OK');
console.log(`  core-thesis products indexed: ${core.products.length}`);
console.log(`  path decisions: ${pathDecisions.length}`);
console.log(`  identifier repair groups: ${idQueue.groups.length}`);
console.log(`  case dispositions: ${caseLedger.cases.length}`);
console.log(`  PR dispositions: ${branchLedger.pull_requests.length}`);
console.log(`  final unclassified paths: ${finalUnclassified.length}`);
console.log('  human permission gates: 0');
