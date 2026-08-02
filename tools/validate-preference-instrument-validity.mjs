import { readFileSync } from 'node:fs';
import {
  validatePreferenceInstrumentValidityBuild,
  validatePreferenceInstrumentValidityFixture
} from './lib/preference-instrument-validity.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/instrument-validity.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-instrument-validity.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceInstrumentValidityFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceInstrumentValidityBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Construct validity, item security, administration independence, and score-provenance custody: PASS');
}
