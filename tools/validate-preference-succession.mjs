import { readFileSync } from 'node:fs';
import {
  validatePreferenceSuccessionBuild,
  validatePreferenceSuccessionFixture
} from './lib/preference-succession.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/succession-validation.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-succession-validation.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceSuccessionFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferenceSuccessionBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('preference succession validation fixture: PASS');
}
