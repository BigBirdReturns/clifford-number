import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture,
  renderPreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayMarkdown
} from './lib/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-linkage-runtime-artifact-dependency-numerical-determinism-replay-assurance.md';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = compilePreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceLinkageRuntimeArtifactDependencyNumericalDeterminismReplayMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
