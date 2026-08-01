import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceHybridArchitecture,
  renderPreferenceHybridArchitectureMarkdown
} from './lib/preference-hybrid-architecture.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/real-cases/yougov-parallax-hybrid-architecture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-real-cases/yougov-parallax-hybrid-architecture.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-real-cases/yougov-parallax-hybrid-architecture.md';

const packet = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceHybridArchitecture(packet);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceHybridArchitectureMarkdown(compiled));
console.log(`compiled ${compiled.case_id} -> ${jsonPath}, ${markdownPath}`);
