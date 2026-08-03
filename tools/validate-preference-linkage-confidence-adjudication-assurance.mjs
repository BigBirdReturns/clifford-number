import { readFileSync } from 'node:fs';
import {
  validatePreferenceLinkageConfidenceAdjudicationAssuranceFixture,
  validatePreferenceLinkageConfidenceAdjudicationAssuranceBuild
} from './lib/preference-linkage-confidence-adjudication-assurance.mjs';
const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-confidence-adjudication-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceLinkageConfidenceAdjudicationAssuranceFixture(fixture),
  ...validatePreferenceLinkageConfidenceAdjudicationAssuranceBuild(build, fixture)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated linkage-confidence adjudication assurance fixture and build');
