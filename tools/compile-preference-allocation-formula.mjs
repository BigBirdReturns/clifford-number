import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceAllocationFormulaFixture,
  renderPreferenceAllocationFormulaMarkdown
} from './lib/preference-allocation-formula.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/allocation-formula.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-allocation-formula.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-allocation-formula.md';
const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceAllocationFormulaFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceAllocationFormulaMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
