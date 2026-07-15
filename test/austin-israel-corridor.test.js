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
const confirmed = jl('confirmed-joins.jsonl');
const cfNs = confirmed.filter(c => c.kind === 'capital_factory_x_natsec100_co_listing');
assert.equal(manifest.counts.cf_natsec100_confirmed_colistings, cfNs.length);
assert.ok(cfNs.length >= 10, 'CF co-listings recovered');

// bf26860 port: 4 CF co-listings independently corroborated (ICON/Saronic/Firefly/Venus), and
// portfolio-listing is explicitly marked as NOT equity investment
const corr = cfNs.filter(c => c.independent_corroboration_state === 'independently_corroborated').map(c => c.natsec100_name).sort();
assert.deepEqual(corr, ['Firefly Aerospace', 'ICON', 'Saronic', 'Venus Aerospace']);
assert.ok(cfNs.every(c => c.portfolio_listing_is_not_equity_investment === true));

// every receipt resolves or is explicitly demoted; 4 resolved receipts now carry a content hash
for (const r of jl('receipts.jsonl')) {
  const resolved = /^https?:\/\//.test(r.locator_url ?? '');
  assert.ok(resolved || r.status === 'receipt_unresolved', `receipt ${r.receipt_id} must resolve or be demoted`);
}
assert.ok(manifest.counts.receipts_unresolved >= 1);
assert.ok(jl('receipts.jsonl').filter(r => r.content_sha256).length >= 4, 'resolved receipts hash-pinned');
assert.equal(manifest.counts.seed_receipt_denominator, 22, 'full seed receipt denominator');

// CF<->Stratos: tested, but labeled absence-on-searched-surfaces (not a proven rejection, not manufactured)
const cfStratos = jl('rejected-joins.jsonl').find(j => j.kind === 'capital_factory_x_stratos');
assert.ok(cfStratos && cfStratos.tested === true);
assert.equal(cfStratos.disposition, 'no_source_explicit_join_observed_on_searched_surfaces');

// Stratos is a multi-node system (>=3 GPs + partners), separate from The LAB Miami
const actors = jl('actors.jsonl');
assert.ok(actors.filter(a => a.org_id === 'org-stratos-ventures').length >= 3);
const orgs = new Set(jl('organizations.jsonl').map(o => o.org_id));
assert.ok(orgs.has('org-stratos-ventures') && orgs.has('org-lab-miami'));
// Pallas arms are separate nodes
for (const arm of ['org-pallas-advisors', 'org-pallas-ventures', 'org-pallas-foundation']) assert.ok(orgs.has(arm));

// Stratos gov partnerships are self_claimed, never source_explicit here
for (const g of jl('government-surfaces.jsonl').filter(x => x.org_id === 'org-stratos-ventures')) {
  assert.equal(g.independent_corroboration_state, 'self_claimed');
}

// Stratos portfolio: 3 press-named (reported); the unnamed remainder stays source_unavailable (logos not OCR-promoted)
const stratosEdges = jl('portfolio-edges.jsonl').filter(p => p.from_org_id === 'org-stratos-ventures');
assert.equal(stratosEdges.filter(p => p.predicate === 'press_named_portfolio_company').length, 3);
assert.ok(stratosEdges.some(p => p.predicate === 'portfolio_remainder' && p.independent_corroboration_state === 'source_unavailable'));

// Lane B EXECUTED: source-explicit Austin members with explicit (non-name) linkage basis
const cohort = jl('austin-israel-cohort.jsonl').filter(m => m.membership !== 'excluded');
assert.ok(cohort.length >= 2 && cohort.every(m => m.independent_corroboration_state === 'source_explicit' && m.linkage_basis));
assert.ok(jl('coverage-gaps.jsonl').some(g => g.gap_id === 'gap-austin-israel-cohort' && g.state === 'searched_nonexhaustive'));

// Pallas Ventures x NatSec100 and deep dives joined
assert.ok(manifest.counts.pallas_ventures_natsec100_colistings >= 3);
const dd = jl('deep-dives.jsonl');
assert.equal(dd.length, 3);
assert.ok(dd.every(d => d.natsec100_member === true), 'CHAOS/Raft/Overland all NatSec100 members');

// all-pairs collapsed: distinct-company motif equals CF co-listing count
const motif = jl('motifs.jsonl').find(m => m.motif_id === 'capital_to_accelerator_to_validation');
assert.equal(motif.distinct_companies, cfNs.length);

console.log('austin-israel-corridor.test.js: OK');
