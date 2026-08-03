import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceIdentityBoundaryAssuranceFixture,
  renderPreferenceIdentityBoundaryAssuranceMarkdown
} from './lib/preference-identity-boundary-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/identity-boundary-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-identity-boundary-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-identity-boundary-assurance.md';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = compilePreferenceIdentityBoundaryAssuranceFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceIdentityBoundaryAssuranceMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
