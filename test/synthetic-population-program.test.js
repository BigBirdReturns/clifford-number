import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  validateSyntheticPopulationProgram,
} from '../tools/validate-synthetic-population-program.mjs';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const canonical = validateSyntheticPopulationProgram({ root });
assert.equal(canonical.ok, true, canonical.errors.map(error => `${error.code}: ${error.message}`).join('\n'));
assert.equal(canonical.summary.cases, 18);
assert.equal(canonical.summary.frontier, 20);
assert.deepEqual(canonical.summary.issue_range, [31, 48]);
assert.equal(canonical.summary.graph_effect, 'none');

const sourcePath = path.join(
  root,
  'contributions/inbox/research-batches/synthetic-population-program.json',
);
const program = JSON.parse(fs.readFileSync(sourcePath, 'utf8'));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'synthetic-population-program-'));
const relative = 'contributions/inbox/research-batches/synthetic-population-program.json';
const tempPath = path.join(tempRoot, relative);
fs.mkdirSync(path.dirname(tempPath), { recursive: true });

const expectFailure = (mutate, code) => {
  const copy = structuredClone(program);
  mutate(copy);
  fs.writeFileSync(tempPath, `${JSON.stringify(copy, null, 2)}\n`);
  const result = validateSyntheticPopulationProgram({ root: tempRoot });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some(error => error.code === code), `Expected ${code}; got ${JSON.stringify(result.errors)}`);
};

expectFailure(copy => { copy.graph_effect = 'hop'; }, 'program-graph-effect');
expectFailure(copy => { copy.cases[0].issue = copy.cases[1].issue; }, 'duplicate-case-issue');
expectFailure(copy => { copy.frontier[0].publication_status = 'publishable'; }, 'frontier-publication-status');
expectFailure(copy => { copy.cases.pop(); copy.counts.bounded_child_cases -= 1; }, 'case-count');

fs.rmSync(tempRoot, { recursive: true, force: true });
console.log('synthetic-population-program.test: OK');
