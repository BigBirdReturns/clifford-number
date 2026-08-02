import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceInterferenceMappingFixture,
  renderPreferenceInterferenceMappingMarkdown
} from './lib/preference-interference-mapping.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/interference-mapping.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-interference-mapping.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-interference-mapping.md';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = compilePreferenceInterferenceMappingFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceInterferenceMappingMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
