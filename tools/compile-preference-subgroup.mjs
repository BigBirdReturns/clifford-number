import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceSubgroupFixture,
  renderPreferenceSubgroupMarkdown
} from './lib/preference-subgroup.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/subgroup-capacity.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-subgroup-capacity.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-subgroup-capacity.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceSubgroupFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceSubgroupMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
