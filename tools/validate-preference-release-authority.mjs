import { readFileSync } from 'node:fs';
import {
  validatePreferenceReleaseAuthorityBuild,
  validatePreferenceReleaseAuthorityFixture
} from './lib/preference-release-authority.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/release-authority.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-release-authority.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceReleaseAuthorityFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceReleaseAuthorityBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Release scope, notice comprehension, collective exit, and binding-authority custody: PASS');
}
