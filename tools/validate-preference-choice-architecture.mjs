import { readFileSync } from 'node:fs';
import {
  validatePreferenceChoiceArchitectureBuild,
  validatePreferenceChoiceArchitectureFixture
} from './lib/preference-choice-architecture.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/choice-architecture.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-choice-architecture.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceChoiceArchitectureFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceChoiceArchitectureBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Choice architecture, exit authorship, assent, and payment-sequence custody: PASS');
}
