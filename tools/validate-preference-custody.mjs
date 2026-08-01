import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyBuild,
  validatePreferenceCustodyFixture
} from './lib/preference-custody.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/option-set-starvation.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-option-set-fixture.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceCustodyFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferenceCustodyBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('preference custody option-set fixture: PASS');
}
