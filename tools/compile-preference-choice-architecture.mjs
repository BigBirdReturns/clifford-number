import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceChoiceArchitectureFixture,
  renderPreferenceChoiceArchitectureMarkdown
} from './lib/preference-choice-architecture.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/choice-architecture.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-choice-architecture.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-choice-architecture.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceChoiceArchitectureFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceChoiceArchitectureMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
