import { readFileSync } from 'node:fs';
import {
  validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayBuild,
  validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture
} from './lib/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture),
  ...validatePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayBuild(build, fixture)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated PC-49 runtime artifact, dependency, numerical determinism, and replay fixture and build');
