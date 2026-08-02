import { readFileSync } from 'node:fs';
import {
  validatePreferenceDeliberativeFormationBuild,
  validatePreferenceDeliberativeFormationFixture
} from './lib/preference-deliberative-formation.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/deliberative-formation.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-deliberative-formation.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceDeliberativeFormationFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceDeliberativeFormationBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Deliberative reason exchange, vote, and summary custody: PASS');
}
