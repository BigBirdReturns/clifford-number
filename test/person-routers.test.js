import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validatePersonRouters } from '../tools/validate-person-routers.mjs';
import { validateBVVCDefenseCapital } from '../tools/validate-bvvc-defense-capital.mjs';

const dir = 'data/intake/person-centered-defense-routers';
const jl = f => fs.readFileSync(`${dir}/${f}`, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));

assert.deepEqual(validatePersonRouters(dir), [], 'router intake must satisfy the completion contract');
assert.deepEqual(
  validateBVVCDefenseCapital(),
  [],
  'BVVC public-source lake must preserve denominators, receipt closure, inference refusals, and graph-inert custody'
);

// canonical completion contract must exist and be consumed
const contract = JSON.parse(fs.readFileSync('data/canonical/person-router-completion-contract.json', 'utf8'));
const TERMINAL = new Set(contract.terminal_states);
const partial = s => contract.partial_markers.some(m => String(s ?? '').toLowerCase().includes(m));

// roster-derived denominator (not the seed list)
const universe = jl('router-source-universe.jsonl');
assert.ok(universe.length >= 40, 'denominator substantial');

// COVERAGE HONESTY — a partial note may never be surface_complete; required sources all have a disposition
const rosterCov = jl('roster-coverage.jsonl');
const portCov = jl('portfolio-coverage.jsonl');
for (const row of [...rosterCov, ...portCov]) {
  if (row.coverage_state === 'surface_complete') assert.ok(!partial(row.selection_rule) && !partial(row.note), `${row.source ?? row.fund} labeled complete but reads partial`);
}
// In-Q-Tel, Capital Factory, Silent explicitly accounted
for (const s of ['In-Q-Tel', 'Capital Factory', 'Silent Ventures']) assert.ok(rosterCov.some(r => r.source === s), `roster coverage must account for ${s}`);
// Stratos, TVP, Capital Factory in portfolio coverage
for (const s of ['Stratos Ventures', 'Texas Venture Partners', 'Capital Factory']) assert.ok(portCov.some(p => p.fund === s), `portfolio coverage must account for ${s}`);
// portfolio rows carry required fields; subset != complete
for (const p of portCov) for (const k of contract.portfolio_row_required_fields) assert.ok(k in p, `portfolio ${p.fund} missing ${k}`);

// NOT everything is terminal — closure must not be claimed
const frontier = jl('trail-frontier.jsonl');
assert.ok(frontier.some(f => !TERMINAL.has(f.state)), 'some frontiers remain partial (honest)');
assert.ok(manifest.counts.frontier_partial_or_not_searched > 0, 'manifest records partial frontiers');
assert.ok(/partial/i.test(manifest.coverage_summary), 'coverage_summary leads with PARTIAL');

// GOV AWARDS — usaspending receipts, never the portfolio receipt; identity gate; Cambium held
const gov = jl('government-awards.jsonl');
for (const g of gov) {
  assert.ok('contract_ceiling_usd' in g && 'obligated_usd' in g && 'outlay_usd' in g);
  for (const id of g.receipt_ids) assert.ok(id !== 'r-fund-portfolio-census-2026' && !/portfolio|roster/.test(id), `${g.org} cites a non-award receipt`);
  for (const k of ['queried_name', 'recipient_legal_name', 'uei', 'identity_confidence', 'identity_basis', 'identity_state']) assert.ok(k in g, `${g.org} missing identity field ${k}`);
  if (g.evidence_state === 'official_record') assert.ok(g.receipt_ids.some(id => id.startsWith('r-usaspending-')), `${g.org} official must cite usaspending receipt`);
}
assert.equal(gov.find(g => g.org === 'Cambium').identity_state, 'held', 'Cambium identity held, not resolved');

// counterpart provenance present for searched-result rows
const csRows = jl('sources/counterpart-searches.jsonl');
for (const c of csRows) {
  if (c.disposition !== 'not_searched') for (const k of contract.counterpart_provenance_required_fields) {
    assert.ok(k in c && (Array.isArray(c[k]) ? c[k].length : c[k]), `counterpart ${c.search_id} missing ${k}`);
  }
}

// financial types stay distinct (Firefly ceiling != obligated != outlay)
const ff = gov.find(g => g.org === 'Firefly Aerospace');
assert.ok(ff.contract_ceiling_usd !== ff.obligated_usd && ff.obligated_usd !== ff.outlay_usd);

console.log('person-routers.test.js: OK');
