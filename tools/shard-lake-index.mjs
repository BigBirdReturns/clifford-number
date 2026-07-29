#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const outputRoot = path.join(root, 'build/lake-index');
const index = JSON.parse(fs.readFileSync(path.join(root, 'build/lake-index.json'), 'utf8'));
const objects = JSON.parse(fs.readFileSync(path.join(root, 'build/lake-object-index.json'), 'utf8'));
const gaps = JSON.parse(fs.readFileSync(path.join(root, 'build/lake-index-gaps.json'), 'utf8'));
const gapSummary = JSON.parse(fs.readFileSync(path.join(root, 'build/lake-index-gap-summary.json'), 'utf8'));

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function writeJson(relative, value) {
  const full = path.join(outputRoot, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(value, null, 2) + '\n');
}

function writeJsonl(relative, rows) {
  const full = path.join(outputRoot, relative);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

fs.rmSync(outputRoot, { recursive: true, force: true });
fs.mkdirSync(outputRoot, { recursive: true });

const summary = {
  schema_version: 'lake-index-shard-summary@1',
  census_id: index.census_id,
  source_fingerprint_sha256: index.summary.source_fingerprint_sha256,
  counts: index.summary.counts,
  boundaries: index.summary.boundaries,
  authoritative_roots: index.authoritative_roots,
  public_roots: index.public_roots,
  index_roots: index.index_roots
};

const pathGapRows = [];
function addPathGaps(gapClass, values, map = value => ({ path: value })) {
  for (const value of values ?? []) pathGapRows.push({ gap_class: gapClass, ...map(value) });
}
addPathGaps('exact_orphan', gaps.exact_orphan_evidence_paths);
addPathGaps('not_authoritative_reachable', gaps.evidence_paths_not_authoritatively_reachable);
addPathGaps('not_index_reachable', gaps.evidence_paths_not_index_reachable);
addPathGaps('not_public_reachable', gaps.evidence_paths_not_public_reachable);
addPathGaps('no_program_owner', gaps.evidence_paths_without_program_owner);
addPathGaps('parse_error', gaps.parse_errors, value => ({ path: value.path, error: value.error }));
pathGapRows.sort((a, b) => `${a.gap_class}:${a.path}`.localeCompare(`${b.gap_class}:${b.path}`));

const idGapRows = [];
function addIdGaps(gapClass, values) {
  for (const value of values ?? []) idGapRows.push({ gap_class: gapClass, ...value });
}
addIdGaps('unindexed_machine_id', gaps.unindexed_machine_ids);
addIdGaps('divergent_identifier_projection', gaps.divergent_identifier_projections);
addIdGaps('source_id_without_projection', gaps.source_ids_without_projection);
addIdGaps('projection_id_without_source', gaps.projection_ids_without_source);
idGapRows.sort((a, b) => `${a.gap_class}:${a.id_key}:${a.id_value}`.localeCompare(`${b.gap_class}:${b.id_key}:${b.id_value}`));

const receiptGapRows = [
  ...(gaps.undefined_receipt_references ?? []).map(value => ({ gap_class: 'undefined_receipt_reference', ...value })),
  ...(gaps.unused_receipt_definitions ?? []).map(value => ({ gap_class: 'unused_receipt_definition', ...value }))
].sort((a, b) => `${a.gap_class}:${a.receipt_id}`.localeCompare(`${b.gap_class}:${b.receipt_id}`));

const branchShadowRows = [];
for (const pr of gaps.open_pull_request_shadow?.pull_requests ?? []) {
  branchShadowRows.push({
    row_type: 'pull_request',
    number: pr.number,
    title: pr.title,
    draft: pr.draft,
    state: pr.state,
    base_ref: pr.base_ref,
    base_sha: pr.base_sha,
    head_ref: pr.head_ref,
    head_sha: pr.head_sha,
    changed_file_count: pr.files?.length ?? 0
  });
  for (const file of pr.files ?? []) {
    branchShadowRows.push({
      row_type: 'changed_path',
      pr_number: pr.number,
      pr_title: pr.title,
      head_ref: pr.head_ref,
      head_sha: pr.head_sha,
      ...file
    });
  }
}
branchShadowRows.sort((a, b) => {
  const aNumber = a.row_type === 'pull_request' ? a.number : a.pr_number;
  const bNumber = b.row_type === 'pull_request' ? b.number : b.pr_number;
  return aNumber - bNumber || a.row_type.localeCompare(b.row_type) || String(a.path ?? '').localeCompare(String(b.path ?? ''));
});

writeJson('summary.json', summary);
writeJsonl('files.jsonl', index.files ?? []);
writeJsonl('objects.jsonl', objects.objects ?? []);
writeJsonl('receipts.jsonl', objects.receipts ?? []);
writeJson('programs.json', { schema_version: 'lake-program-index@1', census_id: index.census_id, programs: objects.programs ?? [] });
writeJson('cases.json', { schema_version: 'lake-case-index@1', census_id: index.census_id, cases: objects.cases ?? [] });
writeJson('reports.json', { schema_version: 'lake-report-index@1', census_id: index.census_id, reports: objects.reports ?? [] });
writeJsonl('path-gaps.jsonl', pathGapRows);
writeJsonl('id-gaps.jsonl', idGapRows);
writeJsonl('receipt-gaps.jsonl', receiptGapRows);
writeJsonl('branch-shadow.jsonl', branchShadowRows);
writeJson('missing-path-tokens.json', {
  schema_version: 'lake-missing-path-token-index@1',
  census_id: index.census_id,
  tokens: gaps.missing_repo_path_tokens ?? []
});
writeJson('gap-summary.json', gapSummary);

const rowCounts = {
  files: index.files?.length ?? 0,
  objects: objects.objects?.length ?? 0,
  receipts: objects.receipts?.length ?? 0,
  path_gaps: pathGapRows.length,
  id_gaps: idGapRows.length,
  receipt_gaps: receiptGapRows.length,
  branch_shadow_rows: branchShadowRows.length
};

const paths = fs.readdirSync(outputRoot, { recursive: true, withFileTypes: true })
  .filter(entry => entry.isFile())
  .map(entry => path.relative(outputRoot, path.join(entry.parentPath, entry.name)).replaceAll('\\', '/'))
  .filter(relative => relative !== 'manifest.json')
  .sort();
const entries = paths.map(relative => {
  const bytes = fs.readFileSync(path.join(outputRoot, relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const manifest = {
  schema_version: 'lake-index-shard-manifest@1',
  census_id: index.census_id,
  source_fingerprint_sha256: index.summary.source_fingerprint_sha256,
  row_counts: rowCounts,
  entries,
  boundaries: {
    shard_manifest_proves_semantic_completeness: false,
    shard_hash_proves_evidence_truth: false,
    open_branch_shadow_is_merged_corpus: false,
    historical_git_objects_indexed: false
  }
};
writeJson('manifest.json', manifest);

for (const relative of [
  'build/lake-index.json',
  'build/lake-object-index.json',
  'build/lake-index-gaps.json',
  'build/lake-index-gap-summary.json'
]) {
  fs.rmSync(path.join(root, relative), { force: true });
}

console.log('lake index sharded');
console.log(`  shard files: ${entries.length + 1}`);
console.log(`  file rows: ${rowCounts.files}`);
console.log(`  object rows: ${rowCounts.objects}`);
console.log(`  gap rows: ${rowCounts.path_gaps + rowCounts.id_gaps + rowCounts.receipt_gaps}`);
