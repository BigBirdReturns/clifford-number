import { readFileSync } from 'node:fs';
import {
  validatePreferenceRemedyEnforcementBuild,
  validatePreferenceRemedyEnforcementFixture
} from './lib/preference-remedy-enforcement.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/remedy-enforcement.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-remedy-enforcement.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceRemedyEnforcementFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceRemedyEnforcementBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Collective remedy enforcement, insolvency, priority, and successor custody: PASS');
}
