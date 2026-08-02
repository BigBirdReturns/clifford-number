import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceComprehensionAssuranceFixture,
  renderPreferenceComprehensionAssuranceMarkdown
} from './lib/preference-comprehension-assurance.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/comprehension-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-comprehension-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-comprehension-assurance.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceComprehensionAssuranceFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceComprehensionAssuranceMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
