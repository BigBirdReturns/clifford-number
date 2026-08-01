import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceHumanCompanion,
  renderPreferenceHumanCompanionMarkdown
} from './lib/preference-human-companion.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/real-cases/newsuk-nucleus-human-companion.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-real-cases/newsuk-nucleus-human-companion.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-real-cases/newsuk-nucleus-human-companion.md';

const packet = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceHumanCompanion(packet);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceHumanCompanionMarkdown(compiled));
console.log(`compiled ${compiled.case_id} -> ${jsonPath}, ${markdownPath}`);
