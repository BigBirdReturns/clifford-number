import { readFileSync } from 'node:fs';
import {
  validatePreferenceHybridArchitecture,
  validatePreferenceHybridArchitectureBuild
} from './lib/preference-hybrid-architecture.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/real-cases/yougov-parallax-hybrid-architecture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-real-cases/yougov-parallax-hybrid-architecture.json';

const packet = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceHybridArchitecture(packet).map(error => `source: ${error}`),
  ...validatePreferenceHybridArchitectureBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('YouGov Parallax hybrid-architecture control: PASS');
}
