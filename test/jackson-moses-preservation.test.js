// Regression test enforcing the Jackson Moses preservation contract.
import assert from 'node:assert/strict';
import fs from 'node:fs';

const contract = JSON.parse(fs.readFileSync('data/canonical/jackson-moses-preservation-contract.json', 'utf8'));
const dir = contract.artifact_dir;
const jl = f => fs.readFileSync(`${dir}/${f}`, 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const manifest = JSON.parse(fs.readFileSync(`${dir}/manifest.json`, 'utf8'));

// actor_must_exist
const actors = jl('actors.jsonl');
const jm = actors.find(a => a.actor_id === 'person:jackson-moses');
assert.ok(jm && jm.canonical === true, 'person:jackson-moses must exist and be canonical');

// vehicles_must_stay_separate
const vids = new Set(jl('vehicles.jsonl').map(v => v.vehicle_id));
for (const v of ['vehicle:silent-ventures', 'vehicle:silent-capital', 'vehicle:jackson-personal-investing']) {
  assert.ok(vids.has(v), `vehicle must remain a separate node: ${v}`);
}

// canonical_node_must_have_receipts (resolving to http locators)
const receipts = new Map(jl('receipts.jsonl').map(r => [r.receipt_id, r]));
const jmResolved = (jm.receipt_ids ?? []).some(id => /^https?:\/\//.test(receipts.get(id)?.locator_url ?? ''));
assert.ok(jmResolved, 'canonical node must carry >=1 source-addressable receipt');

// surfaces_must_not_collapse
const portfolio = jl('portfolio-edges.jsonl').filter(e => e.actor_id === 'person:jackson-moses');
const advisory = jl('advisory-edges.jsonl').filter(e => e.actor_id === 'person:jackson-moses');
const sourcing = jl('deal-sourcing-claims.jsonl').filter(e => e.actor_id === 'person:jackson-moses');
assert.ok(portfolio.length > 0 && advisory.length > 0 && sourcing.length > 0, 'personal/advisory/sourcing surfaces must each be present and separate');

// self_claims_must_not_auto_promote
for (const e of [...advisory, ...sourcing]) {
  assert.ok('counterpart_status' in e, 'self-claim edges must carry counterpart_status');
  if (e.evidence_state === 'self_claimed') assert.notEqual(e.counterpart_status, 'counterpart_reported', 'self_claimed must not be silently promoted');
}

// unresolved_state_must_be_preserved
assert.ok(jl('receipts.jsonl').some(r => r.status === 'receipt_unresolved'), 'unresolved receipts must be preserved, not dropped');

// jackson_must_be_in_discovery_map + overlap ran
assert.ok(jl('router-candidates.jsonl').some(c => c.actor_id === 'person:jackson-moses'), 'Jackson must be in router-candidates');
assert.ok(jl('router-signatures.jsonl').some(s => s.actor_id === 'person:jackson-moses'), 'Jackson must be in router-signatures');
assert.ok(typeof manifest.counts.jackson_x_natsec100 === 'number', 'Jackson×NatSec100 overlap must have run (count present, not not_searched)');

console.log('jackson-moses-preservation.test.js: OK');
