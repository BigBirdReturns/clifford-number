import { readFileSync } from 'node:fs';
import {
  validatePreferenceInterferenceMappingFixture,
  validatePreferenceInterferenceMappingBuild
} from './lib/preference-interference-mapping.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/interference-mapping.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-interference-mapping.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceInterferenceMappingFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferenceInterferenceMappingBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Preference interference, network spillover, and exposure-mapping custody: PASS');
}
