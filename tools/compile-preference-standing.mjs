import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceStandingFixture,
  renderPreferenceStandingMarkdown
} from './lib/preference-standing.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/standing-authority.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-standing-authority.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-standing-authority.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceStandingFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceStandingMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
