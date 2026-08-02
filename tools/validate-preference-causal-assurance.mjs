import { readFileSync } from 'node:fs';
import {
  validatePreferenceCausalAssuranceBuild,
  validatePreferenceCausalAssuranceFixture
} from './lib/preference-causal-assurance.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/causal-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-causal-assurance.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceCausalAssuranceFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceCausalAssuranceBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Criterion temporal causality, feedback, and post-treatment-bias custody: PASS');
}
