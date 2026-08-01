import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceAgendaFixture,
  renderPreferenceAgendaMarkdown
} from './lib/preference-agenda.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/agenda-formation.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-agenda-formation.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-agenda-formation.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceAgendaFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceAgendaMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
