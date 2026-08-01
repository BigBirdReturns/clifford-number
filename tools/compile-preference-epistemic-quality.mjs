import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceEpistemicQualityFixture,
  renderPreferenceEpistemicQualityMarkdown
} from './lib/preference-epistemic-quality.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/epistemic-quality.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-epistemic-quality.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-epistemic-quality.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceEpistemicQualityFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceEpistemicQualityMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
