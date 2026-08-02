import { readFileSync } from 'node:fs';
import {
  validatePreferenceLiabilityRemedyBuild,
  validatePreferenceLiabilityRemedyFixture
} from './lib/preference-liability-remedy.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/liability-remedy.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-liability-remedy.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceLiabilityRemedyFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceLiabilityRemedyBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Federated liability, loss allocation, insurance, and public-remedy custody: PASS');
}
