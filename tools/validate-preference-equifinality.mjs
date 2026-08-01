import { readFileSync } from 'node:fs';
import {
  validatePreferenceEquifinalityBuild,
  validatePreferenceEquifinalityFixture
} from './lib/preference-equifinality.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/observational-equivalence.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-observational-equivalence.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceEquifinalityFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferenceEquifinalityBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('preference observational-equivalence fixture: PASS');
}
