import { readFileSync } from 'node:fs';
import {
  validateHumanValidationTopologyBuild,
  validateHumanValidationTopologyManifest
} from './lib/preference-human-validation-topology.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/human-validation-topology.json';
const buildPath = process.argv[3] ?? 'build/research/preference-real-cases/human-validation-topology.json';

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validateHumanValidationTopologyManifest(manifest).map(error => `manifest: ${error}`),
  ...validateHumanValidationTopologyBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Preference Custody human-validation topology: PASS');
}
