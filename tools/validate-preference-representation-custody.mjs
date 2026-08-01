import { readFileSync } from 'node:fs';
import {
  validateRepresentationCustodyBuild,
  validateRepresentationCustodyPacket
} from './lib/preference-representation-custody.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/real-cases/twineo-originalvoices-representation-custody.json';
const buildPath = process.argv[3] ?? 'build/research/preference-real-cases/twineo-originalvoices-representation-custody.json';

const packet = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validateRepresentationCustodyPacket(packet).map(error => `source: ${error}`),
  ...validateRepresentationCustodyBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Twineo and OriginalVoices representation custody: PASS');
}
