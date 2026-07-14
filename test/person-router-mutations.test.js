// Mutation tests: prove validate-person-routers FAILS on each laundering anti-pattern.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { validatePersonRouters } from '../tools/validate-person-routers.mjs';

const SRC = 'data/intake/person-centered-defense-routers';
const CONTRACT = path.resolve('data/canonical/person-router-completion-contract.json');

function freshCopy() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'prmut-'));
  fs.cpSync(SRC, tmp, { recursive: true });
  return tmp;
}
const readJ = (d, f) => fs.readFileSync(path.join(d, f), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const writeJ = (d, f, rows) => fs.writeFileSync(path.join(d, f), rows.map(r => JSON.stringify(r)).join('\n') + '\n');

// baseline: the real artifacts pass (with the real contract)
assert.deepEqual(validatePersonRouters(SRC, CONTRACT), [], 'baseline must be clean');

function expectFailure(label, mutate, needle) {
  const d = freshCopy();
  try {
    mutate(d);
    const errs = validatePersonRouters(d, CONTRACT);
    assert.ok(errs.length > 0, `${label}: expected validation failure, got none`);
    assert.ok(errs.some(x => x.toLowerCase().includes(needle)), `${label}: expected error containing "${needle}", got: ${errs.join(' | ')}`);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

// 1. _after_search with no provenance (the person-frontier laundering)
expectFailure('after_search-no-provenance', d => {
  const fr = readJ(d, 'trail-frontier.jsonl');
  fr[0] = { ...fr[0], state: 'identity_unresolved_after_search', note: 'resolve identities', graph_effect: 'none' };
  delete fr[0].search_ref; delete fr[0].query; delete fr[0].attempted_urls; delete fr[0].result;
  writeJ(d, 'trail-frontier.jsonl', fr);
}, 'without search provenance');

// 2. terminal row contains non-terminal language
expectFailure('terminal-partial-language', d => {
  const pc = readJ(d, 'portfolio-coverage.jsonl');
  const i = pc.findIndex(p => p.coverage_state === 'unavailable_after_search');
  pc[i] = { ...pc[i], note: 'subset processed; continuation lane (NON-terminal)' };
  writeJ(d, 'portfolio-coverage.jsonl', pc);
}, 'partial/non-terminal language');

// 3. coverage receipt source mismatch (an 8VC receipt on a Pallas row)
expectFailure('receipt-source-mismatch', d => {
  const rc = readJ(d, 'roster-coverage.jsonl');
  const i = rc.findIndex(r => r.source === 'Pallas Advisors');
  rc[i] = { ...rc[i], source_url: 'https://8vc.com/team' }; // now != its receipt locator
  writeJ(d, 'roster-coverage.jsonl', rc);
}, 'source_url');

// 4. exact gross count without support (numeric gross with estimated basis)
expectFailure('exact-gross-unsupported', d => {
  const rc = readJ(d, 'roster-coverage.jsonl');
  const i = rc.findIndex(r => r.gross_basis === 'estimated');
  rc[i] = { ...rc[i], gross_observed: 48 }; // numeric but basis=estimated
  writeJ(d, 'roster-coverage.jsonl', rc);
}, 'gross_basis=exact');

// 5. government award citing the portfolio receipt
expectFailure('award-portfolio-receipt', d => {
  const gv = readJ(d, 'government-awards.jsonl');
  gv[0] = { ...gv[0], receipt_ids: ['r-fund-portfolio-census-2026'] };
  writeJ(d, 'government-awards.jsonl', gv);
}, 'non-award receipt');

// 6. Cambium marked resolved
expectFailure('cambium-resolved', d => {
  const gv = readJ(d, 'government-awards.jsonl');
  const i = gv.findIndex(g => g.org === 'Cambium');
  gv[i] = { ...gv[i], identity_state: 'resolved' };
  writeJ(d, 'government-awards.jsonl', gv);
}, 'cambium');

// 7. completion contract absent -> validation fails
{
  const d = freshCopy();
  try {
    const errs = validatePersonRouters(d, '/nonexistent/person-router-completion-contract.json');
    assert.ok(errs.some(x => x.toLowerCase().includes('missing canonical')), `contract-absent: expected missing-contract error, got: ${errs.join(' | ')}`);
  } finally { fs.rmSync(d, { recursive: true, force: true }); }
}

console.log('person-router-mutations.test.js: OK');
