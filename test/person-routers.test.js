import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validatePersonRouters } from '../tools/validate-person-routers.mjs';

const dir = 'data/intake/person-centered-defense-routers';
const jl = f => fs.readFileSync(`${dir}/${f}`, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));

assert.deepEqual(validatePersonRouters(dir), [], 'router intake must satisfy acceptance conditions');

// COMPLETION CONTRACT — denominator is roster-derived, not the 12-name seed list
const universe = jl('router-source-universe.jsonl');
assert.ok(universe.length >= 40, `roster denominator must be substantial (got ${universe.length})`);
assert.ok(universe.some(u => /projection/.test(u.roster_source)), 'denominator includes the committed LinkedIn projection');
assert.ok(universe.some(u => /team page/.test(u.roster_source)), 'denominator includes fetched fund team rosters');
assert.equal(manifest.counts.router_source_universe_denominator, universe.length);

// Jackson overlap ran with real numbers
assert.equal(manifest.counts.jackson_portfolio_universe, 61);
assert.ok(manifest.counts.jackson_x_natsec100 >= 10);

// counterpart states carry provenance; no not_searched row is silently treated as "found"
for (const row of [...jl('advisory-edges.jsonl'), ...jl('deal-sourcing-claims.jsonl')]) {
  assert.ok('counterpart_status' in row);
  if (row.counterpart_status === 'no_counterpart_confirmation_observed' || row.counterpart_status === 'third_party_reported_not_counterpart_confirmed') {
    assert.ok(row.counterpart_search_ref, `${row.counterparty ?? row.company} must cite a documented counterpart search`);
  }
  if (row.evidence_state === 'self_claimed') assert.notEqual(row.counterpart_status, 'counterpart_reported');
}

// every admitted router has a >=2-hop trail
const trails = jl('game-trails.jsonl');
for (const id of manifest.admitted_router_ids) {
  const t = trails.filter(x => x.hops[0] === id);
  assert.ok(t.length >= 1 && t.every(x => x.hops.length >= 3), `admitted router ${id} needs a multi-hop trail`);
}
assert.ok(trails.some(t => t.surfaces_reached?.includes('validation')), 'a trail reaches validation');

// government awards: ceiling/obligated/outlay separated and never merged
const gov = jl('government-awards.jsonl');
assert.ok(gov.length >= 10);
for (const g of gov) assert.ok('contract_ceiling_usd' in g && 'obligated_usd' in g && 'outlay_usd' in g);
// spot-check a case where the three genuinely differ (Firefly)
const firefly = gov.find(g => g.org === 'Firefly Aerospace');
assert.ok(firefly && firefly.contract_ceiling_usd !== firefly.obligated_usd && firefly.obligated_usd !== firefly.outlay_usd, 'financial types kept distinct');

// frontier fully closed (no required row not_searched)
assert.ok(jl('trail-frontier.jsonl').every(f => f.state !== 'not_searched'));
assert.equal(manifest.counts.trail_frontier_open, 0);

// fund census + cross-fund co-investment topology present
assert.ok(manifest.counts.fund_census_funds >= 8);
assert.ok(jl('co-investor-edges.jsonl').some(c => c.fund_count >= 2 && c.forbidden_inference));

console.log('person-routers.test.js: OK');
