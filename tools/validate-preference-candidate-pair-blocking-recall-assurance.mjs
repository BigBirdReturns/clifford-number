import { readFileSync } from 'node:fs';
import { validatePreferenceCandidatePairBlockingRecallAssuranceFixture, validatePreferenceCandidatePairBlockingRecallAssuranceBuild } from './lib/preference-candidate-pair-blocking-recall-assurance.mjs';
const fixturePath = process.argv[2] ?? 'data/research/preference-custody/candidate-pair-blocking-recall-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-candidate-pair-blocking-recall-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [...validatePreferenceCandidatePairBlockingRecallAssuranceFixture(fixture), ...validatePreferenceCandidatePairBlockingRecallAssuranceBuild(build, fixture)];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated candidate-pair blocking-recall assurance fixture and build');
