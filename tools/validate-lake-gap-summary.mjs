#!/usr/bin/env node
import fs from 'node:fs';

const index = JSON.parse(fs.readFileSync('build/lake-index.json', 'utf8'));
const gaps = JSON.parse(fs.readFileSync('build/lake-index-gaps.json', 'utf8'));
const summary = JSON.parse(fs.readFileSync('build/lake-index-gap-summary.json', 'utf8'));
const report = fs.readFileSync('reports/lake-index-gap-summary.md', 'utf8');
const errors = [];

function assert(condition, message) {
  if (!condition) errors.push(message);
}

const evidence = index.files.filter(file => file.evidence_bearing);
const exactOrphans = evidence.filter(file => file.exact_orphan);
const unowned = evidence.filter(file => file.ownership_state === 'no_program_owner_detected');
const notIndexed = evidence.filter(file => !file.index_reachable);
const notAuthoritative = evidence.filter(file => !file.authoritative_reachable);
const notPublic = evidence.filter(file => !file.public_reachable);
const queues = summary.priority_queues;

assert(summary.schema_version === 'lake-index-gap-summary@1', 'unexpected gap-summary schema');
assert(summary.census_id === index.census_id, 'gap-summary census ID mismatch');
assert(summary.source_fingerprint_sha256 === index.summary.source_fingerprint_sha256, 'gap-summary fingerprint mismatch');
assert(queues.p0_integrity_breaks.counts.parse_errors === gaps.parse_errors.length, 'P0 parse-error count mismatch');
assert(queues.p0_integrity_breaks.counts.undefined_receipt_references === gaps.undefined_receipt_references.length, 'P0 receipt-reference count mismatch');
assert(queues.p0_integrity_breaks.counts.projection_ids_without_source === gaps.projection_ids_without_source.length, 'P0 projection-without-source count mismatch');
assert(queues.p0_integrity_breaks.counts.missing_repo_path_tokens === gaps.missing_repo_path_tokens.length, 'P0 missing-path count mismatch');
assert(queues.p1_exact_orphan_sources.count === exactOrphans.length, 'P1 orphan count mismatch');
assert(queues.p2_unowned_evidence.count === unowned.length, 'P2 owner count mismatch');
assert(queues.p3_index_and_publication_gaps.counts.not_index_reachable === notIndexed.length, 'P3 index count mismatch');
assert(queues.p3_index_and_publication_gaps.counts.not_authoritative_reachable === notAuthoritative.length, 'P3 authoritative count mismatch');
assert(queues.p3_index_and_publication_gaps.counts.not_public_reachable === notPublic.length, 'P3 public count mismatch');
assert(queues.p3_index_and_publication_gaps.counts.case_ids_not_in_public_catalog === gaps.case_ids_not_in_public_catalog.length, 'P3 case-catalog count mismatch');
assert(summary.boundaries.summary_exhausts_gap_ledger === false, 'summary must not claim to exhaust the gap ledger');
assert(summary.boundaries.priority_class_proves_materiality === false, 'priority must not imply materiality');
assert(summary.boundaries.exact_orphan_proves_irrelevance === false, 'orphan must not imply irrelevance');
assert(summary.boundaries.public_gap_requires_publication === false, 'public gap must not imply publication');
assert(summary.boundaries.branch_shadow_proves_merge_value === false, 'branch shadow must not imply merge value');
assert(report.includes('The current Git tree is physically censused, but the evidence lake is not semantically indexed or known.'), 'gap report omits governing finding');
assert(report.includes(summary.source_fingerprint_sha256), 'gap report omits source fingerprint');

if (errors.length) {
  console.error(`lake gap summary validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log('lake gap summary validation: OK');
console.log(`  exact orphans: ${exactOrphans.length}`);
console.log(`  unowned evidence: ${unowned.length}`);
console.log(`  not index reachable: ${notIndexed.length}`);
