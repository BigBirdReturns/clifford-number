#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const shardRoot = path.join(root, 'build/lake-index');
const policy = JSON.parse(fs.readFileSync(path.join(root, 'data/project/lake-index-policy.json'), 'utf8'));
const manifest = JSON.parse(fs.readFileSync(path.join(shardRoot, 'manifest.json'), 'utf8'));
const summary = JSON.parse(fs.readFileSync(path.join(shardRoot, 'summary.json'), 'utf8'));
const gapSummary = JSON.parse(fs.readFileSync(path.join(shardRoot, 'gap-summary.json'), 'utf8'));
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function readJsonl(relative) {
  const file = path.join(shardRoot, relative);
  if (!fs.existsSync(file)) {
    errors.push(`missing JSONL shard: ${relative}`);
    return [];
  }
  return fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) {
      errors.push(`${relative}:${index + 1}: invalid JSONL: ${error.message}`);
      return null;
    }
  }).filter(Boolean);
}

function trackedFiles() {
  const excluded = new Set(policy.excluded_paths ?? []);
  const raw = execFileSync('git', ['ls-files', '-z'], { cwd: root });
  return raw.toString('utf8').split('\0').filter(Boolean).filter(file => !excluded.has(file)).sort();
}

assert(manifest.schema_version === 'lake-index-shard-manifest@1', 'unexpected shard manifest schema');
assert(summary.schema_version === 'lake-index-shard-summary@1', 'unexpected shard summary schema');
assert(gapSummary.schema_version === 'lake-index-gap-summary@1', 'unexpected gap-summary schema');
assert(manifest.census_id === summary.census_id && summary.census_id === gapSummary.census_id, 'census IDs disagree');
assert(manifest.source_fingerprint_sha256 === summary.source_fingerprint_sha256, 'manifest and summary fingerprints disagree');
assert(summary.source_fingerprint_sha256 === gapSummary.source_fingerprint_sha256, 'summary and gap-summary fingerprints disagree');

const manifestPaths = [];
for (const entry of manifest.entries ?? []) {
  manifestPaths.push(entry.path);
  const full = path.join(shardRoot, entry.path);
  assert(fs.existsSync(full), `manifest path is missing: ${entry.path}`);
  if (!fs.existsSync(full)) continue;
  const bytes = fs.readFileSync(full);
  assert(bytes.length === entry.bytes, `byte count mismatch: ${entry.path}`);
  assert(sha256(bytes) === entry.sha256, `sha256 mismatch: ${entry.path}`);
}
assert(new Set(manifestPaths).size === manifestPaths.length, 'manifest contains duplicate paths');
assert(JSON.stringify(manifestPaths) === JSON.stringify([...manifestPaths].sort()), 'manifest paths are not sorted');

const files = readJsonl('files.jsonl');
const objects = readJsonl('objects.jsonl');
const receipts = readJsonl('receipts.jsonl');
const pathGaps = readJsonl('path-gaps.jsonl');
const idGaps = readJsonl('id-gaps.jsonl');
const receiptGaps = readJsonl('receipt-gaps.jsonl');
const branchShadow = readJsonl('branch-shadow.jsonl');
const programs = JSON.parse(fs.readFileSync(path.join(shardRoot, 'programs.json'), 'utf8'));
const cases = JSON.parse(fs.readFileSync(path.join(shardRoot, 'cases.json'), 'utf8'));
const reports = JSON.parse(fs.readFileSync(path.join(shardRoot, 'reports.json'), 'utf8'));
const missingTokens = JSON.parse(fs.readFileSync(path.join(shardRoot, 'missing-path-tokens.json'), 'utf8'));

assert(files.length === manifest.row_counts.files, 'file-row count mismatch');
assert(objects.length === manifest.row_counts.objects, 'object-row count mismatch');
assert(receipts.length === manifest.row_counts.receipts, 'receipt-row count mismatch');
assert(pathGaps.length === manifest.row_counts.path_gaps, 'path-gap count mismatch');
assert(idGaps.length === manifest.row_counts.id_gaps, 'id-gap count mismatch');
assert(receiptGaps.length === manifest.row_counts.receipt_gaps, 'receipt-gap count mismatch');
assert(branchShadow.length === manifest.row_counts.branch_shadow_rows, 'branch-shadow count mismatch');

const expectedPaths = trackedFiles();
const actualPaths = files.map(file => file.path);
assert(new Set(actualPaths).size === actualPaths.length, 'file shard contains duplicate paths');
assert(JSON.stringify(actualPaths) === JSON.stringify([...actualPaths].sort()), 'file shard paths are not sorted');
assert(JSON.stringify(actualPaths) === JSON.stringify(expectedPaths), 'file shard does not equal git ls-files minus census outputs');
for (const file of files) {
  const full = path.join(root, file.path);
  assert(fs.existsSync(full), `source path is missing: ${file.path}`);
  if (!fs.existsSync(full)) continue;
  const bytes = fs.readFileSync(full);
  assert(bytes.length === file.bytes, `source byte count drift: ${file.path}`);
  assert(sha256(bytes) === file.sha256, `source sha256 drift: ${file.path}`);
}

const c = summary.counts;
assert(c.tracked_files_indexed === files.length, 'summary tracked-file count mismatch');
assert(c.distinct_machine_ids === objects.length, 'summary object count mismatch');
assert(c.receipt_ids === receipts.length, 'summary receipt count mismatch');
assert(c.program_ids === (programs.programs ?? []).length, 'summary program count mismatch');
assert(c.case_ids === (cases.cases ?? []).length, 'summary case count mismatch');
assert(c.report_ids === (reports.reports ?? []).length, 'summary report count mismatch');
assert(c.missing_repo_path_tokens === (missingTokens.tokens ?? []).length, 'summary missing-token count mismatch');

const countGap = gapClass => pathGaps.filter(row => row.gap_class === gapClass).length;
assert(countGap('exact_orphan') === c.exact_orphan_evidence_files, 'exact-orphan shard count mismatch');
assert(countGap('not_authoritative_reachable') === c.evidence_bearing_files - c.authoritative_reachable_evidence_files, 'authoritative gap count mismatch');
assert(countGap('not_index_reachable') === c.evidence_bearing_files - c.index_reachable_evidence_files, 'index gap count mismatch');
assert(countGap('not_public_reachable') === c.evidence_bearing_files - c.public_reachable_evidence_files, 'public gap count mismatch');
assert(countGap('no_program_owner') === c.no_program_owner_detected, 'owner gap count mismatch');
assert(pathGaps.filter(row => row.gap_class === 'parse_error').length === c.parse_errors, 'parse-error shard count mismatch');
assert(idGaps.filter(row => row.gap_class === 'unindexed_machine_id').length === c.unindexed_machine_ids, 'unindexed-ID shard count mismatch');
assert(idGaps.filter(row => row.gap_class === 'divergent_identifier_projection').length === c.divergent_identifier_projections, 'divergent-ID shard count mismatch');
assert(idGaps.filter(row => row.gap_class === 'source_id_without_projection').length === c.source_ids_without_projection, 'source-without-projection count mismatch');
assert(idGaps.filter(row => row.gap_class === 'projection_id_without_source').length === c.projection_ids_without_source, 'projection-without-source count mismatch');
assert(receiptGaps.filter(row => row.gap_class === 'undefined_receipt_reference').length === c.undefined_receipt_references, 'undefined-receipt count mismatch');
assert(receiptGaps.filter(row => row.gap_class === 'unused_receipt_definition').length === c.unused_receipt_definitions, 'unused-receipt count mismatch');

assert(summary.boundaries.current_tracked_path_census_complete === true, 'tracked-path boundary missing');
assert(summary.boundaries.current_tree_semantic_index_complete === false, 'semantic completeness must remain false');
assert(summary.boundaries.historical_git_object_index_complete === false, 'history completeness must remain false');
assert(summary.boundaries.source_truth_determined === false, 'source-truth boundary must remain false');
assert(summary.boundaries.publication_cleared === false, 'publication boundary must remain false');
assert(manifest.boundaries.shard_manifest_proves_semantic_completeness === false, 'manifest semantic boundary missing');
assert(manifest.boundaries.shard_hash_proves_evidence_truth === false, 'manifest truth boundary missing');
assert(manifest.boundaries.open_branch_shadow_is_merged_corpus === false, 'branch-shadow merge boundary missing');
assert(manifest.boundaries.historical_git_objects_indexed === false, 'history boundary missing');

for (const removed of [
  'build/lake-index.json',
  'build/lake-object-index.json',
  'build/lake-index-gaps.json',
  'build/lake-index-gap-summary.json'
]) assert(!fs.existsSync(path.join(root, removed)), `monolithic census product remains: ${removed}`);

if (errors.length) {
  console.error(`lake shard validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake shard validation: OK');
console.log(`  manifest entries: ${manifest.entries.length}`);
console.log(`  file rows: ${files.length}`);
console.log(`  object rows: ${objects.length}`);
console.log(`  total gap rows: ${pathGaps.length + idGaps.length + receiptGaps.length}`);
