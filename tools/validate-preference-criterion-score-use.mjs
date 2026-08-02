import { readFileSync } from 'node:fs';
import {
  validatePreferenceCriterionScoreUseBuild,
  validatePreferenceCriterionScoreUseFixture
} from './lib/preference-criterion-score-use.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/criterion-score-use.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-criterion-score-use.json';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceCriterionScoreUseFixture(fixture).map(error => `source: ${error}`),
  ...validatePreferenceCriterionScoreUseBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Criterion independence, external validation, transport, and score-use custody: PASS');
}
