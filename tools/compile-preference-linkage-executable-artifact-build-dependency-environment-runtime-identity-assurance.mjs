import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture,
  renderPreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityMarkdown
} from './lib/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-linkage-executable-artifact-build-dependency-environment-runtime-identity-assurance.md';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = compilePreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceLinkageExecutableArtifactBuildDependencyEnvironmentRuntimeIdentityMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
