import { readFileSync } from 'node:fs';
import {
  validatePreferenceChoiceEffectivenessBuild,
  validatePreferenceChoiceEffectivenessFixture
} from './lib/preference-choice-effectiveness.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/choice-effectiveness.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-choice-effectiveness.json';
const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceChoiceEffectivenessFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceChoiceEffectivenessBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Notice comprehension, accessibility, exit, and assent-effectiveness custody: PASS');
}
