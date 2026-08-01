import { readFileSync } from 'node:fs';
import {
  validatePreferenceHumanCompanion,
  validatePreferenceHumanCompanionBuild
} from './lib/preference-human-companion.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/real-cases/newsuk-nucleus-human-companion.json';
const buildPath = process.argv[3] ?? 'build/research/preference-real-cases/newsuk-nucleus-human-companion.json';

const packet = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceHumanCompanion(packet).map(error => `source: ${error}`),
  ...validatePreferenceHumanCompanionBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('News UK Nucleus human-companion admission: PASS');
}
