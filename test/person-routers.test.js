import assert from 'node:assert/strict';
import fs from 'node:fs';
import { validatePersonRouters } from '../tools/validate-person-routers.mjs';

const dir = 'data/intake/person-centered-defense-routers';
const jl = f => fs.readFileSync(`${dir}/${f}`, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));

assert.deepEqual(validatePersonRouters(dir), [], 'router intake must satisfy acceptance conditions');

// router universe has a denominator; admitted subset is a subset
assert.ok(manifest.counts.router_candidates_denominator >= 10, 'candidate denominator present');
assert.ok(manifest.counts.admitted_routers >= 1 && manifest.counts.admitted_routers <= manifest.counts.router_candidates_denominator);

// Jackson overlap ran with real numbers
assert.equal(manifest.counts.jackson_portfolio_universe, 61);
assert.ok(manifest.counts.jackson_x_natsec100 >= 10, 'Jackson×NatSec100 co-listings recovered');

// every admitted router has a two-hop trail reaching some surface
const trails = jl('game-trails.jsonl');
for (const id of manifest.admitted_router_ids) {
  const t = trails.filter(x => x.hops[0] === id);
  assert.ok(t.length >= 1, `admitted router ${id} must have a trail`);
  assert.ok(t.every(x => Array.isArray(x.hops) && x.hops.length >= 3), 'trails are multi-hop');
}
// at least one trail reaches a government surface and one reaches validation
assert.ok(trails.some(t => t.surfaces_reached?.includes('government')), 'a trail reaches a government surface');
assert.ok(trails.some(t => t.surfaces_reached?.includes('validation')), 'a trail reaches a validation surface');

// financial types are separated in gov awards (ceiling not conflated with obligation/outlay)
for (const g of jl('government-awards.jsonl')) {
  assert.ok('contract_ceiling_usd' in g && 'obligated_usd' in g && 'outlay_usd' in g);
}

// self-claims carry counterpart_status and are not auto-promoted
for (const e of [...jl('advisory-edges.jsonl'), ...jl('deal-sourcing-claims.jsonl')]) {
  assert.ok('counterpart_status' in e);
  if (e.evidence_state === 'self_claimed') assert.notEqual(e.counterpart_status, 'counterpart_reported');
}

console.log('person-routers.test.js: OK');
