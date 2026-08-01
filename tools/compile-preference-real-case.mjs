import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceRealCase,
  renderPreferenceRealCaseMarkdown
} from './lib/preference-real-case.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/real-cases/times-exploraition-admission.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-real-cases/times-exploraition-admission.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-real-cases/times-exploraition-admission.md';

const packet = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceRealCase(packet);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceRealCaseMarkdown(compiled));
console.log(`compiled ${compiled.case_id} -> ${jsonPath}, ${markdownPath}`);
