import { readFileSync } from 'node:fs';
import {
  validateMatchedStudyBuild,
  validateMatchedStudyFixture
} from './lib/preference-matched-study-admission.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/matched-study-admission/fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody/matched-study-admission.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validateMatchedStudyFixture(fixture).map(error => `source: ${error}`),
  ...validateMatchedStudyBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Matched synthetic-human study admission laboratory: PASS');
}
