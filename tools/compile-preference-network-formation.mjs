import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceNetworkFormationFixture,
  renderPreferenceNetworkFormationMarkdown
} from './lib/preference-network-formation.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/network-formation.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-network-formation.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-network-formation.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceNetworkFormationFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceNetworkFormationMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
