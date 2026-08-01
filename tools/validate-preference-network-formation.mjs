import { readFileSync } from 'node:fs';
import {
  validatePreferenceNetworkFormationBuild,
  validatePreferenceNetworkFormationFixture
} from './lib/preference-network-formation.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/network-formation.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-network-formation.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceNetworkFormationFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceNetworkFormationBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Network dependence and collective preference-formation custody: PASS');
}
