import { readFileSync } from 'node:fs';
import {
  validatePreferenceTopologyAssuranceFixture,
  validatePreferenceTopologyAssuranceBuild
} from './lib/preference-topology-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/topology-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-topology-assurance.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceTopologyAssuranceFixture(fixture).map(error => `fixture: ${error}`),
  ...validatePreferenceTopologyAssuranceBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Preference topology measurement, hidden-edge, and dynamic-exposure custody: PASS');
}
