#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validatePoofCliffordEcology } from '../tools/validate-poof-clifford-ecology.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const run = (args) => {
  const result = spawnSync(process.execPath, args, { cwd: root, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`${args.join(' ')} failed\n${result.stdout}\n${result.stderr}`);
};
const read = (relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

run(['tools/build-core-thesis.mjs']);
run(['tools/build-m05-answerable-power.mjs']);
run(['tools/build-poof-clifford-ecology.mjs']);
const baseline = validatePoofCliffordEcology({ root });
assert.equal(baseline.ok, true, baseline.failures.join('\n'));

const data = read('reports/core-thesis/poof-clifford-ecology/data.json');
assert.deepEqual(data.counts, {
  jurisdictions: 4,
  transaction_objects: 5,
  report_contracts: 2,
  report_integrations: 5,
  reader_file_surfaces: 3,
  examination_proceedings: 4,
  estate_routes: 8,
  aperture_routes: 9
});
assert.equal(data.crosswalk.k0.layer_id, 'K0');
assert.equal(data.crosswalk.steel_mirror.story_id, 'M05-S15');
assert.equal(data.crosswalk.steel_mirror_lane.lane_id, 'A18');

const contract = read('data/project/poof-clifford-ecology-contract.json');
let mutation = structuredClone(contract);
mutation.graph_effect = 'create_hop';
let result = validatePoofCliffordEcology({ root, overrides: { contract: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('result boundary')));

const core = read('data/project/core-thesis.json');
mutation = structuredClone(core);
mutation.report_contracts = mutation.report_contracts.filter((row) => !row.report_type_id.startsWith('R8-'));
result = validatePoofCliffordEcology({ root, overrides: { core: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('missing core report contract R8')));

const registry = read('data/project/m05-answerable-power-story-registry.json');
mutation = structuredClone(registry);
mutation.stories = mutation.stories.filter((row) => row.story_id !== 'M05-S15');
result = validatePoofCliffordEcology({ root, overrides: { registry: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('M05-S15')));

const aperture = read('data/project/poof-clifford-aperture.json');
mutation = structuredClone(aperture);
mutation.publication.deployed = true;
result = validatePoofCliffordEcology({ root, overrides: { aperture: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('aperture publication drift')));

const mcp = read('reports/core-thesis/poof-clifford-ecology/mcp-server-card.json');
mutation = structuredClone(mcp);
mutation.implementation_status = 'deployed';
mutation.endpoint = 'https://example.invalid/mcp';
result = validatePoofCliffordEcology({ root, overrides: { mcp: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('MCP deployment')));

const fixturePath = 'test/fixtures/poof-projection-manifest.fixture.json';
const fixture = read(fixturePath);
mutation = structuredClone(fixture);
mutation.graph_effect = 'create_hop';
result = validatePoofCliffordEcology({ root, overrides: { fixtures: { [fixturePath]: mutation } } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes(fixturePath)));

const objects = read('data/project/poof-clifford-object-registry.json');
mutation = structuredClone(objects);
mutation.objects.find((row) => row.object_id === 'POOF-O2').effect_contract.ranking = 'priority_boost';
result = validatePoofCliffordEcology({ root, overrides: { objects: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('POOF-O2')));
mutation = structuredClone(objects);
mutation.objects.find((row) => row.object_id === 'POOF-O2').effect_contract.publication = 'automatic_publication_hold';
result = validatePoofCliffordEcology({ root, overrides: { objects: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('POOF-O2.publication')));

const projection = read('reports/core-thesis/poof-clifford-ecology/projection-manifest.json');
mutation = structuredClone(projection);
delete mutation.selection_contract;
result = validatePoofCliffordEcology({ root, overrides: { projection: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('selection')));
mutation = structuredClone(projection);
mutation.selection_contract.candidate_set_hash = '0'.repeat(64);
result = validatePoofCliffordEcology({ root, overrides: { projection: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('candidate set hash')));

const openapi = read('reports/core-thesis/poof-clifford-ecology/openapi.json');
mutation = structuredClone(openapi);
mutation['x-effect-contract'].ranking = 'machine_priority';
result = validatePoofCliffordEcology({ root, overrides: { openapi: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('OpenAPI effect contract')));

const changeLog = read('data/project/poof-clifford-constitutional-change-log.json');
mutation = structuredClone(changeLog);
mutation.changes[0].emergency_override = true;
result = validatePoofCliffordEcology({ root, overrides: { changeLog: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('override')));
mutation = structuredClone(changeLog);
mutation.protected_paths.pop();
result = validatePoofCliffordEcology({ root, overrides: { changeLog: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('protected path registry')));

const bindings = read('data/project/poof-clifford-projection-contracts.json');
mutation = structuredClone(bindings);
mutation.inference_firewalls['R8-epistemic-admissibility-ceiling-conversion'].claim_classes.pop();
result = validatePoofCliffordEcology({ root, overrides: { bindings: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('R8 inference')));
mutation = structuredClone(bindings);
mutation.inference_firewalls['R9-two-tier-constitution-safeguard-allocation'].forced_symmetry_forbidden = false;
result = validatePoofCliffordEcology({ root, overrides: { bindings: mutation } });
assert.equal(result.ok, false);
assert.ok(result.failures.some((row) => row.includes('R9 comparison')));

for (const route of ['index.html','report/index.html','reader-file/index.html','examination/index.html','estate/index.html','newsroom/index.html','methods/index.html','machine/index.html','audit/index.html']) {
  assert.ok(fs.existsSync(path.join(root, 'reports/core-thesis/poof-clifford-ecology', route)), route);
}
assert.match(fs.readFileSync(path.join(root, 'reports/core-thesis/poof-clifford-ecology/index.html'), 'utf8'), /Evidence authority moves outward/);
assert.match(fs.readFileSync(path.join(root, 'reports/core-thesis/poof-clifford-ecology/reader-file/index.html'), 'utf8'), /Save locally/);
assert.match(fs.readFileSync(path.join(root, 'reports/core-thesis/poof-clifford-ecology/newsroom/index.html'), 'utf8'), /Four-operation proving ground/);
console.log('poof-clifford-ecology.test: OK');
