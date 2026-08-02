import { readFileSync } from 'node:fs';
import {
  validatePreferenceCollectiveDistributionBuild,
  validatePreferenceCollectiveDistributionFixture
} from './lib/preference-collective-distribution.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/collective-distribution.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-collective-distribution.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceCollectiveDistributionFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceCollectiveDistributionBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Collective representation, opt-out, release, and distribution-governance custody: PASS');
}
