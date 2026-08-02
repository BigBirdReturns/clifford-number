import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceRemedyEnforcementFixture,
  renderPreferenceRemedyEnforcementMarkdown
} from './lib/preference-remedy-enforcement.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/remedy-enforcement.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-remedy-enforcement.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-remedy-enforcement.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceRemedyEnforcementFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceRemedyEnforcementMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
