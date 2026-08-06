import { readFileSync } from 'node:fs';
import {
  validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild,
  validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture
} from './lib/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const fixtureErrors = validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture);
if (fixtureErrors.length) {
  console.error(fixtureErrors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = validatePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityBuild(build, fixture);
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated PC-50 executable artifact, build, dependency, environment, runtime identity fixture and build');
