import { readFileSync } from 'node:fs';
import {
  validatePreferenceIdentityBoundaryAssuranceFixture,
  validatePreferenceIdentityBoundaryAssuranceBuild
} from './lib/preference-identity-boundary-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/identity-boundary-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-identity-boundary-assurance.json';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceIdentityBoundaryAssuranceFixture(fixture),
  ...validatePreferenceIdentityBoundaryAssuranceBuild(build)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(
  `validated ${build.fixture_id}: ${build.metrics.world_count} worlds, ` +
  `${build.metrics.distinct_identity_boundary_provenance_signatures} provenance signatures`
);
