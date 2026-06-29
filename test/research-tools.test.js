import assert from 'node:assert/strict';
import fs from 'node:fs';

const lda = fs.readFileSync(new URL('../tools/research/lda-pull.mjs', import.meta.url), 'utf8');
const sec = fs.readFileSync(new URL('../tools/research/sec-formd.mjs', import.meta.url), 'utf8');
const irs = fs.readFileSync(new URL('../tools/research/extract-schedule-i.py', import.meta.url), 'utf8');
const usaspending = fs.readFileSync(new URL('../tools/research/usaspending-bulk-request.mjs', import.meta.url), 'utf8');
const audit = fs.readFileSync(new URL('../docs/research-gap-audit.md', import.meta.url), 'utf8');
const graph = JSON.parse(fs.readFileSync(new URL('../graph.json', import.meta.url), 'utf8'));

assert.match(lda, /https:\/\/lda\.senate\.gov\/api\/v1/, 'LDA pulls must use the post-migration Senate API endpoint.');
assert.doesNotMatch(lda, /disclosure\.senate\.gov/, 'LDA pulls must not use the legacy disclosure.senate.gov endpoint.');

assert.match(irs, /load_target_eins/, 'Schedule I extractor must load target EINs from graph.json.');
assert.match(irs, /--graph/, 'Schedule I extractor must expose graph.json as the EIN source of truth.');
for (const staleEin of ['480916813', '463806254', '521768579', '521137647', '521153928']) {
  assert.doesNotMatch(irs, new RegExp(staleEin), `Schedule I extractor must not hard-code stale EIN ${staleEin}.`);
}

assert.match(sec, /browse-edgar/, 'SEC Form D tooling must start with browse-edgar CIK discovery.');
assert.match(sec, /data\.sec\.gov\/submissions\/CIK/, 'SEC Form D tooling must fetch submissions for discovered CIKs.');
assert.match(sec, /filing\.form === 'D' \|\| filing\.form === 'D\/A'/, 'SEC Form D tooling must retain D and D/A amendments.');

assert.match(usaspending, /api\.usaspending\.gov\/api\/v2\/bulk_download\/awards\//, 'USAspending tooling must use the bulk-download fallback endpoint.');
assert.match(audit, /2026-06-30/, 'Audit must preserve the LDA migration deadline.');
assert.match(audit, /Publication readiness sequencing/, 'Audit must preserve publication sequencing.');

const expectedGraphEins = new Map([
  ['charles-koch-foundation', '48-0918408'],
  ['berggruen-institute', '46-5602320'],
  ['new-america', '52-2096845'],
  ['adl', '13-1818723'],
  ['mercatus-center', '54-1436224'],
  ['federalist-society', '36-3235550']
]);
for (const [nodeId, ein] of expectedGraphEins) {
  const node = graph.nodes.find((candidate) => candidate.id === nodeId);
  assert.ok(node, `Expected nonprofit node ${nodeId}.`);
  assert.equal(node.identifiers?.ein, ein, `Expected ${nodeId} to use corrected EIN ${ein}.`);
}
const graphText = JSON.stringify(graph);
for (const staleEin of ['48-0916813', '46-3806254', '52-1768579', '52-1137647', '52-1153928']) {
  assert.doesNotMatch(graphText, new RegExp(staleEin), `graph.json must not contain stale EIN ${staleEin}.`);
}

console.log('Research tooling tests OK.');
