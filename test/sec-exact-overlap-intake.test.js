import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildSecExactOverlapIntake } from '../tools/lib/sec-exact-overlap-intake.mjs';

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'sec-exact-intake-'));
const overlapFile = path.join(tmp, 'overlap-candidates.jsonl');
const secFile = path.join(tmp, 'sec-candidates.jsonl');
const output = path.join(tmp, 'output');
const overlap = (id, name, rule = 'exact_normalized_name') => ({
  overlap_candidate_id: id, match_rule: rule, match: { normalized_interest_name: name },
  oge_interest_ref: { source_document_id: 'oge:test', raw_text_ref: `page#${id}` },
  holder: { person_id: 'person', interest_holder_scope: 'filer' },
  interest_dates: { valid_from: null, valid_until: '2024-01-01' },
  fec_payee_ref: { candidate_id: `fec:${name}`, example_source_record_ids: [`fec-source:${id}`] }, graph_effect: 'none',
});
fs.writeFileSync(overlapFile, [
  overlap('overlap:apple', 'APPLE INC'),
  overlap('overlap:intercontinental', 'INTERCONTINENTAL'),
  overlap('overlap:college', 'NORTHERN VIRGINIA COMMUNITY COLLEGE'),
  overlap('overlap:not-exact', 'APPLE INC', 'token_indexed_high_similarity'),
].map(JSON.stringify).join('\n') + '\n');
const sec = (query, title, cik, ticker, basis = 'official_title_normalized_exact') => ({
  query_name: query, sec_title: title, cik, ticker, mapping_basis: basis,
  source_url: 'https://www.sec.gov/files/company_tickers.json', entity_url: `https://www.sec.gov/edgar/browse/?CIK=${cik}`,
  observed_on: '2026-07-13', source_capture_status: 'fixture',
});
fs.writeFileSync(secFile, [
  sec('APPLE INC', 'Apple Inc.', '0000320193', 'AAPL'),
  sec('INTERCONTINENTAL', 'Intercontinental Exchange, Inc.', '0001571949', 'ICE', 'ambiguous_distinctive_token_only'),
  sec('INTERCONTINENTAL', 'INTERCONTINENTAL HOTELS GROUP PLC', '0000858446', 'IHG', 'ambiguous_distinctive_token_only'),
].map(JSON.stringify).join('\n') + '\n');

const { manifest } = await buildSecExactOverlapIntake({ overlapFile, secCandidatesFile: secFile, outputDir: output });
assert.equal(manifest.coverage.overlap_input_lines, 4);
assert.equal(manifest.coverage.exact_overlap_rows_in_scope, 3);
assert.equal(manifest.coverage.non_exact_overlap_rows_ignored, 1);
assert.equal(manifest.coverage.exact_rows_with_single_sec_candidate, 1);
assert.equal(manifest.coverage.exact_rows_with_ambiguous_sec_candidates, 1);
assert.equal(manifest.coverage.exact_rows_without_sec_candidate, 1);
assert.equal(manifest.coverage.identifier_candidate_rows_emitted, 3);
assert.equal(manifest.coverage.accepted_identity_resolutions, 0);
const candidates = fs.readFileSync(path.join(output, 'sec-identifier-candidates.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.equal(candidates.length, 3);
const apple = candidates.find(row => row.official_identifier_anchor.identifier === '0000320193');
assert.equal(apple.identity_resolution_status, 'unresolved');
assert.equal(apple.entity_boundary.merge_permitted, false);
assert.ok(apple.forbidden_inferences.includes('name_equality_resolves_identity'));
assert.equal(apple.graph_effect, 'none');
assert.equal(candidates.filter(row => row.disposition === 'ambiguous_official_identifier_candidate').length, 2);
const rejections = fs.readFileSync(path.join(output, 'rejections.jsonl'), 'utf8').trim().split('\n').map(JSON.parse);
assert.ok(rejections.some(row => row.disposition === 'identity_not_promoted_name_only'));
assert.ok(rejections.some(row => row.disposition === 'ambiguous_official_identifier_candidates'));
assert.ok(rejections.some(row => row.disposition === 'no_official_sec_identifier_candidate'));

const rerun = path.join(tmp, 'rerun');
const { manifest: manifest2 } = await buildSecExactOverlapIntake({ overlapFile, secCandidatesFile: secFile, outputDir: rerun });
for (const key of ['candidates', 'rejections']) assert.equal(manifest.outputs[key].sha256, manifest2.outputs[key].sha256);
fs.rmSync(tmp, { recursive: true, force: true });
console.log('sec-exact-overlap-intake.test.js: OK');
