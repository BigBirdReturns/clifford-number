import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compileMatchedStudyFixture,
  renderMatchedStudyMarkdown
} from './lib/preference-matched-study-admission.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/matched-study-admission/fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody/matched-study-admission.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody/matched-study-admission.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compileMatchedStudyFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderMatchedStudyMarkdown(compiled));
console.log(`compiled ${compiled.contract_id} -> ${jsonPath}, ${markdownPath}`);
