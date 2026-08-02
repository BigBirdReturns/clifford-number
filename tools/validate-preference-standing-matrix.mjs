import { readFileSync } from 'node:fs';
import {
  validateStandingMatrixBuild,
  validateStandingMatrixManifest
} from './lib/preference-standing-matrix.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/representation-validation-authority-matrix.json';
const buildPath = process.argv[3] ?? 'build/research/preference-real-cases/representation-validation-authority-matrix.json';

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validateStandingMatrixManifest(manifest).map(error => `manifest: ${error}`),
  ...validateStandingMatrixBuild(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Preference representation-validation-authority matrix: PASS');
}
