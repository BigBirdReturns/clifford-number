#!/usr/bin/env node
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.join(repoRoot, 'data/intake/schoolhouse-irs-candidate-filing-index-census');
const load = (name) => JSON.parse(readFileSync(path.join(dataRoot, name), 'utf8'));
const rows = (name) => readFileSync(path.join(dataRoot, name), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const sha = (name) => createHash('sha256').update(readFileSync(path.join(dataRoot, name))).digest('hex');
const custody = load('source-custody.json');
const denominator = load('candidate-denominator.json');
const summary = load('summary.json');
const policy = load('route-policy.json');
const adjudication = load('adjudication.json');
const artifact = load('artifact-manifest.json');
const attempts = rows('index-attempts.jsonl');
const matches = rows('filing-index-matches.jsonl');
const candidates = rows('candidate-ein-summary.jsonl');
assert.equal(custody.schema_version, 'schoolhouse-irs-candidate-filing-index-custody@1');
assert.equal(custody.state, 'terminal_exact_438_candidate_ein_official_filing_index_custody');
assert.match(custody.canonical_parent_commit, /^[0-9a-f]{40}$/);
assert.match(custody.canonical_parent_tree, /^[0-9a-f]{40}$/);
assert.match(custody.acquisition_head, /^[0-9a-f]{40}$/);
assert.match(custody.acquisition_artifact_digest, /^sha256:[0-9a-f]{64}$/);
assert.equal(custody.candidate_rows, 641);
assert.equal(custody.unique_candidate_eins, 438);
assert.deepEqual(custody.declared_index_years, [2019,2020,2021,2022,2023,2024,2025,2026]);
assert.equal(custody.official_index_attempts, attempts.length);
assert.equal(attempts.length, 8);
assert.equal(custody.candidate_ein_terminal_rows, candidates.length);
assert.equal(candidates.length, 438);
assert.equal(custody.filing_index_match_rows, matches.length);
assert.equal(custody.candidate_eins_with_filing_rows, new Set(matches.map((row) => row.ein)).size);
assert.equal(denominator.candidate_rows, 641);
assert.equal(denominator.unique_candidate_eins, 438);
assert.equal(summary.official_index_requests, 8);
assert.equal(summary.terminal_index_rows, 8);
assert.equal(summary.exact_candidate_filing_rows, matches.length);
assert.equal(summary.xml_fetches, 0);
assert.equal(summary.batch_zip_fetches, 0);
assert.equal(summary.successor_fetches, 0);
assert.equal(summary.identities_admitted, 0);
assert.equal(summary.relationships_admitted, 0);
assert.equal(summary.negative_existence_claims_created, 0);
assert.equal(summary.outside_human_dependency, false);
assert.equal(policy.selection_contract.exact_ein_intersection_only, true);
assert.equal(policy.selection_contract.no_xml_or_batch_fetch, true);
assert.equal(policy.interpretation.zero_rows_are_not_identity_or_record_absence_evidence, true);
assert.equal(adjudication.public_schoolhouse_legal_identity_admitted, false);
assert.equal(adjudication.fiscal_sponsor_relationship_admitted, false);
assert.equal(adjudication.related_party_relationship_admitted, false);
assert.equal(artifact.counts.candidate_rows, 641);
assert.equal(artifact.counts.unique_candidate_eins, 438);
assert.equal(artifact.counts.index_attempts, 8);
assert.equal(artifact.counts.candidate_ein_summaries, 438);
assert.equal(artifact.counts.filing_index_matches, matches.length);
assert.deepEqual(attempts.map((row) => row.index_year), [2019,2020,2021,2022,2023,2024,2025,2026]);
assert.equal(new Set(candidates.map((row) => row.ein)).size, 438);
for (const row of attempts) {
  assert.equal(row.request_method, 'GET');
  assert.equal(row.raw_index_retained, false);
  assert.equal(row.identity_admitted, false);
  assert.equal(row.relationship_admitted, false);
  assert.equal(row.outside_human_dependency, false);
}
const candidateSet = new Set(candidates.map((row) => row.ein));
for (const row of matches) {
  assert(candidateSet.has(row.ein));
  assert.equal(row.xml_fetched, false);
  assert.equal(row.batch_zip_fetched, false);
  assert.equal(row.successor_fetch_executed, false);
  assert.equal(row.identity_admitted, false);
  assert.equal(row.relationship_admitted, false);
}
for (const row of candidates) {
  assert.equal(row.legal_identity_admitted, false);
  assert.equal(row.fiscal_sponsor_relationship_admitted, false);
  assert.equal(row.related_party_relationship_admitted, false);
  assert.equal(row.negative_existence_claim_created, false);
  assert.equal(row.outside_human_dependency, false);
}
for (const file of custody.source_files) {
  assert.equal(sha(file.path), file.sha256, file.path);
  assert.equal(readFileSync(path.join(dataRoot, file.path)).length, file.bytes, file.path);
}
const forbidden = new Set(['address','street','mailing_address','postal_code','zip_code','email','phone','contact','preparer','raw_row','raw_index','raw_text','full_text','xml']);
const inspect = (value) => {
  if (Array.isArray(value)) return value.forEach(inspect);
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    assert(!forbidden.has(key.toLowerCase()), key);
    inspect(child);
  }
};
for (const name of readdirSync(dataRoot).filter((name) => name.endsWith('.json') || name.endsWith('.jsonl'))) {
  if (name.endsWith('.jsonl')) rows(name).forEach(inspect); else inspect(load(name));
}
assert(!readdirSync(dataRoot).some((name) => /\.(csv|zip|xml)$/i.test(name)));
console.log(JSON.stringify({state:custody.state,candidate_eins:438,index_attempts:8,available_index_years:summary.available_index_years.length,official_index_rows_scanned:summary.official_index_rows_scanned,filing_index_match_rows:matches.length,candidate_eins_with_filing_rows:summary.unique_candidate_eins_with_filing_rows,outside_human_dependency:false,graph_effect:'none'}, null, 2));
