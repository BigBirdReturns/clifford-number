import { readFileSync } from 'node:fs';
import {
  validatePreferenceEpistemicQualityBuild,
  validatePreferenceEpistemicQualityFixture
} from './lib/preference-epistemic-quality.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/epistemic-quality.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-epistemic-quality.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceEpistemicQualityFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceEpistemicQualityBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Epistemic diversity, source independence, and evidence-quality custody: PASS');
}
