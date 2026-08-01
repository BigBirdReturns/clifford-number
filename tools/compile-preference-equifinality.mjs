import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceEquifinalityFixture,
  renderPreferenceEquifinalityMarkdown
} from './lib/preference-equifinality.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/observational-equivalence.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-observational-equivalence.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-observational-equivalence.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceEquifinalityFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceEquifinalityMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
