import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceProvenanceRecoveryFixture,
  renderPreferenceProvenanceRecoveryMarkdown
} from './lib/preference-provenance-recovery.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/provenance-recovery.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-provenance-recovery.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-provenance-recovery.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceProvenanceRecoveryFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceProvenanceRecoveryMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
