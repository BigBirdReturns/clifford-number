import { readFileSync } from 'node:fs';
import {
  validatePreferenceSubgroupBuild,
  validatePreferenceSubgroupFixture
} from './lib/preference-subgroup.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/subgroup-capacity.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-subgroup-capacity.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceSubgroupFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferenceSubgroupBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('preference subgroup capacity fixture: PASS');
}
