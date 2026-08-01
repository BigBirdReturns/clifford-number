import { readFileSync } from 'node:fs';
import {
  validatePreferenceStandingBuild,
  validatePreferenceStandingFixture
} from './lib/preference-standing.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/standing-authority.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-standing-authority.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceStandingFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferenceStandingBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('preference standing authority fixture: PASS');
}
