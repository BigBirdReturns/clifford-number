import { readFileSync } from 'node:fs';
import { validatePreferenceLinkageScoreCalibrationAssuranceFixture, validatePreferenceLinkageScoreCalibrationAssuranceBuild } from './lib/preference-linkage-score-calibration-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-score-calibration-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-score-calibration-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceLinkageScoreCalibrationAssuranceFixture(fixture),
  ...validatePreferenceLinkageScoreCalibrationAssuranceBuild(build, fixture)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated linkage-score calibration assurance fixture and build');
