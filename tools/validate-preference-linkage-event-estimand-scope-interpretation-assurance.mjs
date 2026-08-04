import { readFileSync } from 'node:fs';
import {
  validatePreferenceLinkageEventEstimandScopeInterpretationBuild,
  validatePreferenceLinkageEventEstimandScopeInterpretationFixture
} from './lib/preference-linkage-event-estimand-scope-interpretation-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-event-estimand-scope-interpretation-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-event-estimand-scope-interpretation-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceLinkageEventEstimandScopeInterpretationFixture(fixture),
  ...validatePreferenceLinkageEventEstimandScopeInterpretationBuild(build, fixture)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated linkage event, estimand, scope, and interpretation fixture and build');
