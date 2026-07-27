import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { validateBiologicalOmegaProgram } from '../tools/validate-biological-omega-program.mjs';

const ROOT = path.resolve(new URL('..', import.meta.url).pathname);

test('staged biological Omega programme validates at zero evidence and zero graph effect', () => {
  const result = validateBiologicalOmegaProgram({ root: ROOT });
  assert.equal(result.ok, true, JSON.stringify(result.errors, null, 2));
  assert.deepEqual(result.summary, {
    cases: 12,
    seeds: 12,
    surface_rows: 14,
    public_evidence_records: 0,
    graph_effects: 0,
    origin_findings: 0,
  });
});

test('validator rejects graph-effect leakage and an origin finding', () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bio-omega-'));
  fs.cpSync(ROOT, tmp, { recursive: true });
  const programPath = path.join(tmp, 'contributions/inbox/research-batches/biological-omega-program.json');
  const coveragePath = path.join(tmp, 'contributions/inbox/research-batches/biological-omega-coverage.json');
  const program = JSON.parse(fs.readFileSync(programPath, 'utf8'));
  program.cases[0].graph_effect = 'hop';
  fs.writeFileSync(programPath, `${JSON.stringify(program, null, 2)}\n`);
  const coverage = JSON.parse(fs.readFileSync(coveragePath, 'utf8'));
  coverage.counts.origin_findings = 1;
  fs.writeFileSync(coveragePath, `${JSON.stringify(coverage, null, 2)}\n`);
  const result = validateBiologicalOmegaProgram({ root: tmp });
  assert.equal(result.ok, false);
  assert(result.errors.some((row) => row.code === 'case-boundary'));
  assert(result.errors.some((row) => row.code === 'coverage-overstatement'));
});
