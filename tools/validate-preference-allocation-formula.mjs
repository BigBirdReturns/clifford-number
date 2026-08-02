import { readFileSync } from 'node:fs';
import {
  validatePreferenceAllocationFormulaBuild,
  validatePreferenceAllocationFormulaFixture
} from './lib/preference-allocation-formula.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/allocation-formula.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-allocation-formula.json';
const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceAllocationFormulaFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceAllocationFormulaBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Distribution formula, subgroup harm, and algorithmic allocation-governance custody: PASS');
}
