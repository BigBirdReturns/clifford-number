import { readFileSync } from 'node:fs';
import {
  validatePreferenceAttritionBuild,
  validatePreferenceAttritionFixture
} from './lib/preference-attrition.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/refusal-exit.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-attrition-refusal.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceAttritionFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferenceAttritionBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('preference attrition and refusal fixture: PASS');
}
