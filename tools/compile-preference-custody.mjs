import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceCustodyFixture,
  renderPreferenceCustodyMarkdown
} from './lib/preference-custody.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/option-set-starvation.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-option-set-fixture.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-option-set-fixture.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceCustodyFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
