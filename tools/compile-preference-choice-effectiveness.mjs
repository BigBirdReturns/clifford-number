import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceChoiceEffectivenessFixture,
  renderPreferenceChoiceEffectivenessMarkdown
} from './lib/preference-choice-effectiveness.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/choice-effectiveness.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-choice-effectiveness.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-choice-effectiveness.md';
const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceChoiceEffectivenessFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceChoiceEffectivenessMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
