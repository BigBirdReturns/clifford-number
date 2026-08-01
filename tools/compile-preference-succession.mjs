import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceSuccessionFixture,
  renderPreferenceSuccessionMarkdown
} from './lib/preference-succession.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/succession-validation.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-succession-validation.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-succession-validation.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceSuccessionFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceSuccessionMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
