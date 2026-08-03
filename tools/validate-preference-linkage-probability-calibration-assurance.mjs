import { readFileSync } from 'node:fs';
import { validatePreferenceLinkageProbabilityCalibrationAssuranceFixture, validatePreferenceLinkageProbabilityCalibrationAssuranceBuild } from './lib/preference-linkage-probability-calibration-assurance.mjs';
const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-probability-calibration-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-probability-calibration-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [...validatePreferenceLinkageProbabilityCalibrationAssuranceFixture(fixture), ...validatePreferenceLinkageProbabilityCalibrationAssuranceBuild(build, fixture)];
if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
console.log('validated linkage-probability calibration assurance fixture and build');
