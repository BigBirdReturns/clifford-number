import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceAcquisitionRequest,
  renderPreferenceAcquisitionRequestMarkdown
} from './lib/preference-acquisition-request.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/acquisition/newsuk-matched-method-request.json';
const requestPath = process.argv[3] ?? 'docs/requests/newsuk-times-exploraition-nucleus-panel-protocol-request.md';
const jsonPath = process.argv[4] ?? 'build/research/preference-acquisition/newsuk-matched-method-request.json';
const markdownPath = process.argv[5] ?? 'build/research/preference-acquisition/newsuk-matched-method-request.md';

const packet = JSON.parse(readFileSync(sourcePath, 'utf8'));
const requestMarkdown = readFileSync(requestPath, 'utf8');
const compiled = compilePreferenceAcquisitionRequest(packet, requestMarkdown);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceAcquisitionRequestMarkdown(compiled));
console.log(`compiled ${compiled.acquisition_id} -> ${jsonPath}, ${markdownPath}`);
