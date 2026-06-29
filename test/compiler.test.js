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

for (const edge of hop.edges) {
  for (const basis of edge.surfaces) {
    assert.ok(basis.surface_id, 'hop basis must name surface');
    assert.ok(basis.receipt_ids.length > 0, 'hop basis must carry receipts');
  }
}
assert.ok(migration.total_rows > 200, 'full master doc must be classified');
console.log('compiler.test: OK');
