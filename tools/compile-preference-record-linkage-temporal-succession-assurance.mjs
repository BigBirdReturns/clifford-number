import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceRecordLinkageTemporalSuccessionAssuranceFixture,
  renderPreferenceRecordLinkageTemporalSuccessionAssuranceMarkdown
} from './lib/preference-record-linkage-temporal-succession-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/record-linkage-temporal-succession-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-record-linkage-temporal-succession-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-record-linkage-temporal-succession-assurance.md';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = compilePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceRecordLinkageTemporalSuccessionAssuranceMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
