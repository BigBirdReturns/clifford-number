import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceTopologyAssuranceFixture,
  renderPreferenceTopologyAssuranceMarkdown
} from './lib/preference-topology-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/topology-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-topology-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-topology-assurance.md';

const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = compilePreferenceTopologyAssuranceFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceTopologyAssuranceMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
