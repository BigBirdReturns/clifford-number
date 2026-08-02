import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceReleaseAuthorityFixture,
  renderPreferenceReleaseAuthorityMarkdown
} from './lib/preference-release-authority.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/release-authority.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-release-authority.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-release-authority.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceReleaseAuthorityFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceReleaseAuthorityMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
