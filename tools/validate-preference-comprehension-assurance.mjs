import { readFileSync } from 'node:fs';
import {
  validatePreferenceComprehensionAssuranceBuild,
  validatePreferenceComprehensionAssuranceFixture
} from './lib/preference-comprehension-assurance.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/comprehension-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-comprehension-assurance.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceComprehensionAssuranceFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceComprehensionAssuranceBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Comprehension measurement, translation, accessibility, and scenario-transfer assurance custody: PASS');
}
