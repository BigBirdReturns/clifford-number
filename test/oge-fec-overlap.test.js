import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  buildOgeFecOverlap,
  conservativeBaseForms,
  passesHighSimilarity,
  scoreTokenSets,
} from '../tools/lib/oge-fec-overlap.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'oge-fec-overlap-'));
const ogeFile = path.join(tmp, 'interests.jsonl');
const fecFile = path.join(tmp, 'payee-candidates.jsonl');
const output = path.join(tmp, 'output');

const payee = (candidateId, normalizedName, rawName = normalizedName) => ({
  schema_version: 'fec-payee-candidate@1', candidate_id: candidateId,
  normalized_payee_name: normalizedName, grouping_basis: 'normalized_payee_name_only_address_unavailable',
  observed_name_variants: [{ value: rawName, count: 1 }], observed_cycles: [2024],
  observed_committee_ids: ['C00000001'], source_record_count: 1,
  example_source_record_ids: [`source:${candidateId}`],
  date_range_observed: { earliest: '2024-01-01', latest: '2024-12-31' }, graph_effect: 'none',
});
const payees = [
  payee('fec:exact', 'ACME SERVICES LLC', 'Acme Services, LLC'),
  payee('fec:base', 'EXAMPLE VENTURES LLC', 'Example Ventures LLC'),
  payee('fec:similar', 'NORTHSTAR STRATEGIC ADVISORS', 'Northstar Strategic Advisors'),
  payee('fec:unrelated', 'UNRELATED PRINT SHOP', 'Unrelated Print Shop'),
];
fs.writeFileSync(fecFile, `${payees.map(JSON.stringify).join('\n')}\n{not-json}\n${JSON.stringify({ candidate_id: 'bad' })}\n`);

const interest = (row, name, scope = 'filer') => ({
  schema_version: 'presidential-beneficial-interest-intake@1', person_id: 'fixture-person', person_name: 'Fixture Person',
  source_document_id: 'oge:fixture', source_url: 'https://example.invalid/oge.pdf', source_sha256: 'a'.repeat(64),
  source_page: 1, source_row_label: `part-6/${row}`, raw_text_ref: `pages/a#row=${row}`,
  raw_text_sha256: String(row).padStart(64, '0'), asset_or_entity_name_as_reported: name,
  interest_holder_scope: scope, record_kind: 'other_asset_or_income', interest_type_as_reported: 'other_asset_or_income',
  valid_from: null, valid_until: '2024-05-15', report_date: '2024-05-15', graph_effect: 'none',
});
const interests = [
  interest(1, 'Acme Services LLC', 'filer'),
  interest(2, 'Example Ventures LLC (Spouse)', 'spouse'),
  interest(3, 'Northstar Strategic Advisors Global', 'joint'),
  interest(4, 'No Matching Organization', 'filer'),
  interest(5, '   ', 'unknown'),
];
fs.writeFileSync(ogeFile, `${interests.map(JSON.stringify).join('\n')}\n{not-json}\n`);

assert.ok(conservativeBaseForms('Example Ventures LLC (Spouse)').has('EXAMPLE VENTURES'));
const similarity = scoreTokenSets(['NORTHSTAR', 'STRATEGIC', 'ADVISORS', 'GLOBAL'], ['NORTHSTAR', 'STRATEGIC', 'ADVISORS']);
assert.equal(similarity.jaccard, 0.75);
assert.equal(passesHighSimilarity(similarity), true);
assert.equal(passesHighSimilarity(scoreTokenSets(['COMMON'], ['COMMON'])), false, 'single token must not pass');

const { manifest } = await buildOgeFecOverlap({ ogeInterestsFile: ogeFile, fecPayeesFile: fecFile, outputDir: output });
assert.equal(manifest.coverage.denominator.oge_input_lines, 6);
assert.equal(manifest.coverage.denominator.oge_valid_named_interests, 4);
assert.equal(manifest.coverage.denominator.fec_input_lines, 6);
assert.equal(manifest.coverage.denominator.fec_indexed_candidates, 4);
assert.equal(manifest.coverage.denominator.naive_cartesian_pairs_not_materialized, 16);
assert.equal(manifest.coverage.dispositions.fec_invalid_json_lines, 1);
assert.equal(manifest.coverage.dispositions.fec_malformed_candidate_lines, 1);
assert.equal(manifest.coverage.dispositions.oge_invalid_json_lines, 1);
assert.equal(manifest.coverage.dispositions.oge_blank_or_invalid_name_rows, 1);
assert.equal(manifest.coverage.dispositions.interests_with_candidates, 3);
assert.equal(manifest.coverage.dispositions.interests_without_candidates, 1);
assert.equal(manifest.coverage.dispositions.candidate_pairs_emitted, 3);
assert.deepEqual(manifest.coverage.candidate_pairs_by_rule, {
  conservative_parenthetical_or_base_name: 1,
  exact_normalized_name: 1,
  token_indexed_high_similarity: 1,
});
assert.ok(manifest.coverage.dispositions.token_postings_visited < 16, 'token index must avoid the Cartesian comparison');

const candidates = fs.readFileSync(path.join(output, 'overlap-candidates.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.equal(candidates.length, 3);
const exact = candidates.find(row => row.match_rule === 'exact_normalized_name');
assert.equal(exact.holder.interest_holder_scope, 'filer');
assert.equal(exact.interest_dates.valid_until, '2024-05-15');
assert.equal(exact.oge_interest_ref.source_document_id, 'oge:fixture');
assert.equal(exact.fec_payee_ref.candidate_id, 'fec:exact');
assert.equal(exact.graph_effect, 'none');
assert.ok(exact.forbidden_inferences.includes('name_overlap_resolves_legal_entity_identity'));
const base = candidates.find(row => row.match_rule === 'conservative_parenthetical_or_base_name');
assert.equal(base.match.matched_base_name, 'EXAMPLE VENTURES LLC');
assert.ok(base.match.interest_base_methods.includes('trailing_parenthetical_removed'));
const fuzzy = candidates.find(row => row.match_rule === 'token_indexed_high_similarity');
assert.equal(fuzzy.match.token_scores.jaccard, 0.75);
assert.deepEqual(fuzzy.match.token_scores.shared_tokens, ['ADVISORS', 'NORTHSTAR', 'STRATEGIC']);

const rejections = fs.readFileSync(path.join(output, 'rejections.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.ok(rejections.some(row => row.disposition === 'no_overlap_candidate'));
assert.ok(rejections.some(row => row.disposition === 'invalid_json' && row.input_side === 'oge_interest'));
assert.ok(rejections.some(row => row.disposition === 'malformed_payee_candidate'));

const rerun = path.join(tmp, 'rerun');
const { manifest: manifest2 } = await buildOgeFecOverlap({ ogeInterestsFile: ogeFile, fecPayeesFile: fecFile, outputDir: rerun });
for (const key of ['candidates', 'rejections']) {
  assert.equal(manifest.outputs[key].sha256, manifest2.outputs[key].sha256, `${key} must be reproducible`);
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('oge-fec-overlap.test.js: OK');
