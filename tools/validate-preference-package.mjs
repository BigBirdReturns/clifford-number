import { readFileSync } from 'node:fs';
import {
  validatePreferencePackageBuild,
  validatePreferencePackageFixture
} from './lib/preference-package.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/package-bargaining.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-package-bargaining.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferencePackageFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferencePackageBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('preference package bargaining fixture: PASS');
}
