import { readFileSync } from 'node:fs';
import { validatePreferenceLinkageIntervalConstructionAssuranceFixture, validatePreferenceLinkageIntervalConstructionAssuranceBuild } from './lib/preference-linkage-interval-construction-assurance.mjs';
const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-interval-construction-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-interval-construction-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')); const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [...validatePreferenceLinkageIntervalConstructionAssuranceFixture(fixture), ...validatePreferenceLinkageIntervalConstructionAssuranceBuild(build, fixture)];
if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
console.log('validated linkage-interval construction assurance fixture and build');
