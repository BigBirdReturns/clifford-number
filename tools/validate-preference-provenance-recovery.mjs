import { readFileSync } from 'node:fs';
import {
  validatePreferenceProvenanceRecoveryBuild,
  validatePreferenceProvenanceRecoveryFixture
} from './lib/preference-provenance-recovery.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/provenance-recovery.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-provenance-recovery.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceProvenanceRecoveryFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceProvenanceRecoveryBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Provenance attack, quarantine, rollback, and recovery custody: PASS');
}
