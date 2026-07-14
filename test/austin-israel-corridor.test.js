import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validateCorridor } from '../tools/validate-austin-israel-corridor.mjs';

const dir = 'data/intake/austin-israel-defense-corridor';
const jl = f => fs.readFileSync(`${dir}/${f}`, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));

assert.deepEqual(validateCorridor(dir), [], 'corridor must satisfy acceptance conditions');

// the overlap actually ran, denominators present
assert.equal(manifest.counts.capital_factory_portfolio_universe, 837);
assert.equal(manifest.counts.natsec100_universe, 196);
assert.equal(manifest.counts.cf_natsec100_confirmed_colistings, jl('confirmed-joins.jsonl').length);
assert.ok(manifest.counts.cf_natsec100_confirmed_colistings >= 10, 'co-listings recovered');

// every receipt resolves or is explicitly demoted; nothing dangling
for (const r of jl('receipts.jsonl')) {
  const resolved = /^https?:\/\//.test(r.locator_url ?? '');
  assert.ok(resolved || r.status === 'receipt_unresolved', `receipt ${r.receipt_id} must resolve or be demoted`);
}
assert.ok(manifest.counts.receipts_unresolved >= 1);

// CF<->Stratos rejected, not manufactured
const rej = jl('rejected-joins.jsonl').find(j => j.kind === 'capital_factory_x_stratos');
assert.ok(rej && rej.disposition === 'rejected', 'CF<->Stratos must be an explicit rejection');

// Stratos is a multi-node system (>=3 GPs + partners), separate from The LAB Miami
const actors = jl('actors.jsonl');
assert.ok(actors.filter(a => a.org_id === 'org-stratos-ventures').length >= 3);
const orgs = new Set(jl('organizations.jsonl').map(o => o.org_id));
assert.ok(orgs.has('org-stratos-ventures') && orgs.has('org-lab-miami'));

// Stratos gov partnerships are self_claimed, never source_explicit here
for (const g of jl('government-surfaces.jsonl').filter(x => x.org_id === 'org-stratos-ventures')) {
  assert.equal(g.independent_corroboration_state, 'self_claimed');
}

// portfolio logos NOT promoted to entities
const stratosPortfolio = jl('portfolio-edges.jsonl').find(p => p.from_org_id === 'org-stratos-ventures');
assert.equal(stratosPortfolio.independent_corroboration_state, 'source_unavailable');

// all-pairs collapsed: distinct-company motif, not pair counts
const motif = jl('motifs.jsonl').find(m => m.motif_id === 'capital_to_accelerator_to_validation');
assert.equal(motif.distinct_companies, manifest.counts.cf_natsec100_confirmed_colistings);

// Austin-Israel cohort not asserted
assert.ok(jl('coverage-gaps.jsonl').some(g => g.gap_id === 'gap-austin-israel-cohort' && g.state === 'not_searched'));

console.log('austin-israel-corridor.test.js: OK');
