import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compileRepresentationCustodyPacket,
  renderRepresentationCustodyMarkdown
} from './lib/preference-representation-custody.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/real-cases/twineo-originalvoices-representation-custody.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-real-cases/twineo-originalvoices-representation-custody.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-real-cases/twineo-originalvoices-representation-custody.md';

const packet = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compileRepresentationCustodyPacket(packet);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderRepresentationCustodyMarkdown(compiled));
console.log(`compiled ${compiled.case_id} -> ${jsonPath}, ${markdownPath}`);
