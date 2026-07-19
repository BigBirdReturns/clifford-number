import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateSyntheticPopulationProgram,
} from '../tools/validate-synthetic-population-program.mjs';

const root = path.resolve(fileURLToPath(new URL('..', import.meta.url)));
const base = 'contributions/inbox/research-batches';
const paths = {
  program: `${base}/synthetic-population-program.json`,
  selection: `${base}/synthetic-population-selection.json`,
  coverage: `${base}/synthetic-population-coverage.json`,
  seeds: `${base}/synthetic-population-discovery-seeds.jsonl`,
};

const canonical = validateSyntheticPopulationProgram({ root });
assert.equal(canonical.ok, true, canonical.errors.map(error => `${error.code}: ${error.message}`).join('\n'));
assert.equal(canonical.summary.cases, 18);
assert.equal(canonical.summary.frontier, 20);
assert.equal(canonical.summary.seeds, 18);
assert.deepEqual(canonical.summary.issue_range, [31, 48]);
assert.equal(canonical.summary.selection_status, 'staged');
assert.equal(canonical.summary.coverage_state, 'staged_program_contracts_only');
assert.equal(canonical.summary.graph_effect, 'none');

const fixtures = {
  program: JSON.parse(fs.readFileSync(path.join(root, paths.program), 'utf8')),
  selection: JSON.parse(fs.readFileSync(path.join(root, paths.selection), 'utf8')),
  coverage: JSON.parse(fs.readFileSync(path.join(root, paths.coverage), 'utf8')),
  seeds: fs.readFileSync(path.join(root, paths.seeds), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line)),
};

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'synthetic-population-program-'));
for (const relative of Object.values(paths)) fs.mkdirSync(path.dirname(path.join(tempRoot, relative)), { recursive: true });

const writeFixture = fixture => {
  fs.writeFileSync(path.join(tempRoot, paths.program), `${JSON.stringify(fixture.program, null, 2)}\n`);
  fs.writeFileSync(path.join(tempRoot, paths.selection), `${JSON.stringify(fixture.selection, null, 2)}\n`);
  fs.writeFileSync(path.join(tempRoot, paths.coverage), `${JSON.stringify(fixture.coverage, null, 2)}\n`);
  fs.writeFileSync(path.join(tempRoot, paths.seeds), `${fixture.seeds.map(row => JSON.stringify(row)).join('\n')}\n`);
};

const expectFailure = (mutate, code) => {
  const copy = structuredClone(fixtures);
  mutate(copy);
  writeFixture(copy);
  const result = validateSyntheticPopulationProgram({ root: tempRoot });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.code === code), `Expected ${code}; got ${JSON.stringify(result.errors)}`);
};

expectFailure(copy => { copy.program.graph_effect = 'hop'; }, 'program-graph-effect');
expectFailure(copy => { copy.program.cases[0].issue = copy.program.cases[1].issue; }, 'duplicate-case-issue');
expectFailure(copy => { copy.program.frontier[0].publication_status = 'publishable'; }, 'frontier-publication-status');
expectFailure(copy => { copy.program.cases.pop(); copy.program.counts.bounded_child_cases -= 1; }, 'case-count');
expectFailure(copy => { copy.selection.graph_effect = 'hop'; }, 'selection-graph-effect');
expectFailure(copy => {
  copy.coverage.metrics.find(metric => metric.metric_id === 'case_receipt_packets').observed = 1;
}, 'required-coverage-metric');
expectFailure(copy => { copy.seeds[0].publication_status = 'publishable'; }, 'seed-publication-status');
expectFailure(copy => { copy.seeds[0].case_id = copy.seeds[1].case_id; }, 'duplicate-seed-case');

fs.rmSync(tempRoot, { recursive: true, force: true });
console.log('synthetic-population-program.test: OK');
