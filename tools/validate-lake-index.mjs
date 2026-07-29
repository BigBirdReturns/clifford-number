#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const policy = JSON.parse(fs.readFileSync(path.join(root, 'data/project/lake-index-policy.json'), 'utf8'));
const index = JSON.parse(fs.readFileSync(path.join(root, 'build/lake-index.json'), 'utf8'));
const objects = JSON.parse(fs.readFileSync(path.join(root, 'build/lake-object-index.json'), 'utf8'));
const gaps = JSON.parse(fs.readFileSync(path.join(root, 'build/lake-index-gaps.json'), 'utf8'));
const report = fs.readFileSync(path.join(root, 'reports/lake-index-census.md'), 'utf8');
const excluded = new Set(policy.excluded_paths ?? []);
const localIdentifierKeys = new Set(policy.local_identifier_keys ?? ['id']);
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

function sha256(bytes) {
  return crypto.createHash('sha256').update(bytes).digest('hex');
}

function trackedFiles() {
  const raw = execFileSync('git', ['ls-files', '-z'], { cwd: root });
  return raw.toString('utf8').split('\0').filter(Boolean).filter(file => !excluded.has(file)).sort();
}

assert(policy.schema_version === 'lake-index-policy@1', 'unexpected lake-index policy schema');
assert(index.schema_version === 'lake-index@1', 'unexpected lake-index schema');
assert(index.summary?.schema_version === 'lake-index-summary@1', 'unexpected lake-index summary schema');
assert(objects.schema_version === 'lake-object-index@1', 'unexpected lake-object-index schema');
assert(gaps.schema_version === 'lake-index-gaps@1', 'unexpected lake-index-gaps schema');
assert(objects.identifier_semantics?.schema_version === 'lake-identifier-semantics@1', 'identifier semantics missing');
assert(index.census_id === policy.census_id && objects.census_id === policy.census_id && gaps.census_id === policy.census_id, 'census IDs disagree');

const expectedPaths = trackedFiles();
const actualPaths = (index.files ?? []).map(file => file.path);
assert(new Set(actualPaths).size === actualPaths.length, 'lake index contains duplicate paths');
assert(JSON.stringify(actualPaths) === JSON.stringify([...actualPaths].sort()), 'lake index paths are not sorted');
assert(JSON.stringify(actualPaths) === JSON.stringify(expectedPaths), 'lake index path census does not equal git ls-files minus declared exclusions');

for (const file of index.files ?? []) {
  const full = path.join(root, file.path);
  assert(fs.existsSync(full), `indexed path is missing: ${file.path}`);
  if (!fs.existsSync(full)) continue;
  const bytes = fs.readFileSync(full);
  assert(file.bytes === bytes.length, `byte count drift: ${file.path}`);
  assert(file.sha256 === sha256(bytes), `sha256 drift: ${file.path}`);
  assert(typeof file.role === 'string' && file.role.length > 0, `missing role: ${file.path}`);
  assert(typeof file.evidence_bearing === 'boolean', `missing evidence flag: ${file.path}`);
  assert(typeof file.index_file === 'boolean', `missing index flag: ${file.path}`);
  assert(typeof file.authoritative_reachable === 'boolean', `missing authoritative reachability: ${file.path}`);
  assert(typeof file.index_reachable === 'boolean', `missing index reachability: ${file.path}`);
  assert(typeof file.public_reachable === 'boolean', `missing public reachability: ${file.path}`);
  assert(Number.isInteger(file.local_identifier_count) && file.local_identifier_count >= 0, `invalid local identifier count: ${file.path}`);
  assert(Number.isInteger(file.machine_id_count) && file.machine_id_count >= 0, `invalid global machine identifier count: ${file.path}`);
  assert(['declared_program_id', 'referenced_by_program_file', 'no_program_owner_detected'].includes(file.ownership_state), `invalid ownership state: ${file.path}`);
}

const fingerprintInput = [...(index.files ?? [])]
  .sort((a, b) => a.path.localeCompare(b.path))
  .map(file => `${file.path}\0${file.sha256}`)
  .join('\n') + '\n';
const fingerprint = sha256(Buffer.from(fingerprintInput, 'utf8'));
assert(index.summary.source_fingerprint_sha256 === fingerprint, 'summary source fingerprint mismatch');
assert(objects.source_fingerprint_sha256 === fingerprint, 'object index source fingerprint mismatch');
assert(gaps.source_fingerprint_sha256 === fingerprint, 'gap index source fingerprint mismatch');
assert(!('exact_head' in index.summary) && !('exact_tree' in index.summary), 'wall-clock Git head/tree leaked into stabilized summary');
assert(!('exact_head' in objects) && !('exact_tree' in objects), 'wall-clock Git head/tree leaked into stabilized object index');
assert(!('exact_head' in gaps) && !('exact_tree' in gaps), 'wall-clock Git head/tree leaked into stabilized gaps');
assert(report.includes(`Source fingerprint: \`${fingerprint}\``), 'markdown report lacks source fingerprint');

const evidenceFiles = index.files.filter(file => file.evidence_bearing);
const c = index.summary.counts;
const localOccurrences = index.files.reduce((sum, file) => sum + file.local_identifier_count, 0);
assert(c.tracked_files_indexed === index.files.length, 'tracked file count mismatch');
assert(c.evidence_bearing_files === evidenceFiles.length, 'evidence file count mismatch');
assert(c.index_files === index.files.filter(file => file.index_file).length, 'index file count mismatch');
assert(c.authoritative_reachable_evidence_files === evidenceFiles.filter(file => file.authoritative_reachable).length, 'authoritative reachability count mismatch');
assert(c.index_reachable_evidence_files === evidenceFiles.filter(file => file.index_reachable).length, 'index reachability count mismatch');
assert(c.public_reachable_evidence_files === evidenceFiles.filter(file => file.public_reachable).length, 'public reachability count mismatch');
assert(c.exact_orphan_evidence_files === evidenceFiles.filter(file => file.exact_orphan).length, 'orphan count mismatch');
assert(c.no_program_owner_detected === evidenceFiles.filter(file => file.ownership_state === 'no_program_owner_detected').length, 'program-owner count mismatch');
assert(c.distinct_machine_ids === objects.objects.length, 'object count mismatch');
assert(c.local_identifier_occurrences_observed === localOccurrences, 'local identifier occurrence count mismatch');
assert(c.local_identifier_values_observed === objects.identifier_semantics.local_identifier_values_excluded_from_global_join, 'local identifier value count mismatch');
assert(c.receipt_ids === objects.receipts.length, 'receipt count mismatch');
assert(c.program_ids === objects.programs.length, 'program count mismatch');
assert(c.case_ids === objects.cases.length, 'case count mismatch');
assert(c.report_ids === objects.reports.length, 'report count mismatch');
assert(c.unindexed_machine_ids === gaps.unindexed_machine_ids.length, 'unindexed identifier count mismatch');
assert(c.divergent_identifier_projections === gaps.divergent_identifier_projections.length, 'divergent projection count mismatch');
assert(c.source_ids_without_projection === gaps.source_ids_without_projection.length, 'source-without-projection count mismatch');
assert(c.projection_ids_without_source === gaps.projection_ids_without_source.length, 'projection-without-source count mismatch');

for (const object of objects.objects ?? []) {
  assert(!localIdentifierKeys.has(object.id_key), `local identifier leaked into global object index: ${object.id_key}:${object.id_value}`);
  assert(object.divergent_projections === (object.distinct_projection_hashes > 1), `projection divergence semantics drift: ${object.id_key}:${object.id_value}`);
}
assert(objects.identifier_semantics.local_identifier_keys.every(key => localIdentifierKeys.has(key)), 'identifier semantics local-key declaration drift');
assert(objects.identifier_semantics.boundaries.repeated_local_id_proves_same_object === false, 'local identifier non-identity boundary missing');
assert(objects.identifier_semantics.boundaries.source_projection_shape_difference_is_projection_divergence === false, 'source/projection shape boundary missing');
assert(gaps.local_identifier_semantics?.boundaries?.repeated_local_id_proves_same_object === false, 'gap index local identifier boundary missing');

function sorted(values) {
  return [...values].sort();
}

assert(JSON.stringify(sorted(gaps.exact_orphan_evidence_paths)) === JSON.stringify(sorted(evidenceFiles.filter(file => file.exact_orphan).map(file => file.path))), 'orphan gap queue drift');
assert(JSON.stringify(sorted(gaps.evidence_paths_not_authoritatively_reachable)) === JSON.stringify(sorted(evidenceFiles.filter(file => !file.authoritative_reachable).map(file => file.path))), 'authoritative gap queue drift');
assert(JSON.stringify(sorted(gaps.evidence_paths_not_index_reachable)) === JSON.stringify(sorted(evidenceFiles.filter(file => !file.index_reachable).map(file => file.path))), 'index gap queue drift');
assert(JSON.stringify(sorted(gaps.evidence_paths_not_public_reachable)) === JSON.stringify(sorted(evidenceFiles.filter(file => !file.public_reachable).map(file => file.path))), 'public gap queue drift');
assert(JSON.stringify(sorted(gaps.evidence_paths_without_program_owner)) === JSON.stringify(sorted(evidenceFiles.filter(file => file.ownership_state === 'no_program_owner_detected').map(file => file.path))), 'owner gap queue drift');

assert(index.summary.boundaries.current_tracked_path_census_complete === true, 'tracked path census must be explicit');
assert(index.summary.boundaries.current_tree_semantic_index_complete === false, 'semantic completeness must remain false');
assert(index.summary.boundaries.historical_git_object_index_complete === false, 'historical Git completeness must remain false');
assert(index.summary.boundaries.open_pull_request_content_semantically_indexed === false, 'open PR semantic completeness must remain false');
assert(index.summary.boundaries.source_truth_determined === false, 'source truth boundary must remain false');
assert(index.summary.boundaries.publication_cleared === false, 'publication boundary must remain false');
assert(index.summary.boundaries.common_purpose_conclusion_generated === false, 'common-purpose conclusion boundary must remain false');
assert(index.summary.boundaries.bare_local_identifier_globally_joined === false, 'bare local identifier global-join boundary missing');
assert(index.summary.boundaries.projection_divergence_includes_source_shape_difference === false, 'projection divergence boundary missing');
assert(policy.boundaries?.bare_local_id_is_globally_joinable === false, 'policy must forbid global joins on bare local identifiers');
assert(policy.boundaries?.registered_identifier_proves_source_truth === false, 'policy must deny source truth from registration alone');
assert(report.includes('local-only identifier values observed:'), 'reader report lacks local identifier semantics');

const shadowPath = path.join(root, 'data/project/lake-open-pr-shadow.json');
if (fs.existsSync(shadowPath)) {
  const shadow = JSON.parse(fs.readFileSync(shadowPath, 'utf8'));
  assert(shadow.schema_version === 'lake-open-pr-shadow@1', 'unexpected open PR shadow schema');
  assert(shadow.boundaries?.open_pr_path_proves_merged_corpus === false, 'open PR merge boundary missing');
  assert(shadow.boundaries?.branch_only_path_semantically_indexed === false, 'open PR semantic boundary missing');
}

if (errors.length) {
  console.error(`lake index validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake index validation: OK');
console.log(`  tracked paths: ${index.files.length}`);
console.log(`  evidence paths: ${evidenceFiles.length}`);
console.log(`  orphan evidence paths: ${c.exact_orphan_evidence_files}`);
console.log(`  global machine IDs: ${c.distinct_machine_ids}`);
console.log(`  local identifier values excluded from global joins: ${c.local_identifier_values_observed}`);
console.log(`  projection IDs without source: ${c.projection_ids_without_source}`);
