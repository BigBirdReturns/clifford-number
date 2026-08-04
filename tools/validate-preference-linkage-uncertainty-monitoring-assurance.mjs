import { readFileSync } from 'node:fs';
import { validatePreferenceLinkageUncertaintyMonitoringAssuranceFixture, validatePreferenceLinkageUncertaintyMonitoringAssuranceBuild } from './lib/preference-linkage-uncertainty-monitoring-assurance.mjs';
const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-uncertainty-monitoring-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-uncertainty-monitoring-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceLinkageUncertaintyMonitoringAssuranceFixture(fixture),
  ...validatePreferenceLinkageUncertaintyMonitoringAssuranceBuild(build, fixture)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated linkage-uncertainty monitoring assurance fixture and build');
