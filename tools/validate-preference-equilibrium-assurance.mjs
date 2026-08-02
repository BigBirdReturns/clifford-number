import { readFileSync } from 'node:fs';
import {
  validatePreferenceEquilibriumAssuranceFixture,
  validatePreferenceEquilibriumAssuranceBuild
} from './lib/preference-equilibrium-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/equilibrium-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-equilibrium-assurance.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceEquilibriumAssuranceFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferenceEquilibriumAssuranceBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Preference saturation, general-equilibrium, and interference-robust policy custody: PASS');
}
