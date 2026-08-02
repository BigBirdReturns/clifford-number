import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceDynamicChangeFixture,
  renderPreferenceDynamicChangeMarkdown
} from './lib/preference-dynamic-change.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/dynamic-change.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-dynamic-change.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-dynamic-change.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceDynamicChangeFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceDynamicChangeMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
