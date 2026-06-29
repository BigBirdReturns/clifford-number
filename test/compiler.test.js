import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

function run(cmd, args) {
  const res = spawnSync(cmd, args, { encoding: 'utf8' });
  if (res.status !== 0) {
    console.error(res.stdout);
    console.error(res.stderr);
  }
  assert.equal(res.status, 0, `${cmd} ${args.join(' ')} failed`);
  return res;
}

run(process.execPath, ['tools/compile.mjs']);
run(process.execPath, ['tools/validate-release.mjs']);

const hop = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const surface = JSON.parse(fs.readFileSync('build/surface-graph.json', 'utf8'));
const scores = JSON.parse(fs.readFileSync('build/scores.json', 'utf8'));
const migration = JSON.parse(fs.readFileSync('build/migration-summary.json', 'utf8'));
const legacyGraph = JSON.parse(fs.readFileSync('graph.json', 'utf8'));

const actor = id => scores.actors.find(a => a.actor_id === id);
const org = id => scores.organizations.find(o => o.organization_id === id);
const surf = id => surface.surfaces.find(s => s.surface_id === id);

assert.ok(actor('ben-warner').surfaces.includes('electric-twin-newsuk-synthetic-audience'));
assert.ok(actor('ben-warner').secondary_surface_types.includes('democratic_input_replacement'));
assert.equal(surf('electric-twin-newsuk-synthetic-audience').hop_eligible, false);
assert.equal(surf('gartner-synthetic-population-category-2026').hop_eligible, false);
assert.equal(surf('faculty-investor-employee-2015-2019').hop_eligible, true);
assert.equal(org('electric-twin').surface_factory, true);
assert.ok(actor('simon-case').surfaces.includes('simon-case-cabinet-secretary-2020-2024'));
assert.ok(actor('simon-case').surfaces.includes('electric-twin-ethics-board-2026'));
assert.ok(actor('simon-case').surfaces.includes('team-barrow-public-private-fund-2026'));
const surfaceActorIds = new Set(surface.actors.map(a => a.id));
for (const node of legacyGraph.nodes.filter(n => n.type === 'person')) {
  assert.ok(surfaceActorIds.has(node.id), `${node.label} must be present in the surface app actor index`);
}
assert.ok(surfaceActorIds.has('alex-karp'), 'Alex Karp must be present through the legacy graph bridge, not a one-off ledger patch');
assert.match(surface.actors.find(a => a.id === 'alex-karp')?.description ?? '', /Palantir/, 'legacy bridged actors must carry descriptions for UI context');
const candidates = new Set((surface.candidates ?? []).map(c => c.id));
for (const id of ['candidate-palmer-luckey', 'candidate-jackson-moses', 'candidate-alex-miller', 'candidate-silicon-valley-defense-group']) {
  assert.ok(candidates.has(id), `${id} must be visible as a defense-industrial intake candidate`);
}

for (const edge of hop.edges) {
  for (const basis of edge.surfaces) {
    assert.ok(basis.surface_id, 'hop basis must name surface');
    assert.ok(basis.receipt_ids.length > 0, 'hop basis must carry receipts');
  }
}
assert.ok(migration.total_rows > 200, 'full master doc must be classified');

// Laundering-chain dimension: scored, high, and provably NOT a hop.
const chain = id => (scores.chains ?? []).find(c => c.chain_id === id);
const synthChain = chain('policy-to-deployment-synthetic-population');
assert.ok(synthChain, 'synthetic-population laundering chain must be scored');
assert.equal(synthChain.clifford_number, null, 'a laundering chain must not carry a Clifford Number');
assert.ok(synthChain.laundering_chain_score >= 4, 'synthetic-population chain must span >= 4 stage categories');
assert.equal(synthChain.connector_surfaces_all_non_hop, true, 'chain connector surfaces must be non-hop');
// The Detachment 201 connector surface exists, is non-hop, and never becomes a hop basis.
assert.equal(surf('detachment-201-commissioning-2025').hop_eligible, false, 'Detachment 201 surface must be non-hop');
assert.ok(!hop.edges.some(e => e.surfaces.some(b => b.surface_id === 'detachment-201-commissioning-2025')), 'Detachment 201 must never be a hop basis');
// machine_score and surface_type_recurrence are real, separate dimensions.
assert.ok(actor('ben-warner').machine_score > 0, 'Ben Warner must have a machine_score');
assert.ok(Object.keys(actor('ben-warner').surface_type_recurrence).length > 0, 'Ben Warner must show surface-type recurrence');
assert.ok(actor('matt-clifford').laundering_chain_score >= 4, 'Matt Clifford must anchor the laundering chain');
console.log('compiler.test: OK');
