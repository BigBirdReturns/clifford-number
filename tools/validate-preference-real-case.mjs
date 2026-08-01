import { readFileSync } from 'node:fs';
import {
  validatePreferenceRealCase,
  validatePreferenceRealCaseBuild
} from './lib/preference-real-case.mjs';

const packetPath = process.argv[2] ?? 'data/research/preference-custody/real-cases/times-exploraition-admission.json';
const buildPath = process.argv[3] ?? 'build/research/preference-real-cases/times-exploraition-admission.json';

const packet = JSON.parse(readFileSync(packetPath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceRealCase(packet).map(error => `packet: ${error}`),
  ...validatePreferenceRealCaseBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Times ExplorAItion preference-custody admission: PASS');
}
