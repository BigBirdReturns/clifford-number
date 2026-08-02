import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV25,
  validatePreferenceCustodyManifestV25Build
} from './lib/preference-custody-manifest-v25.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v25.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v25.json';

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceCustodyManifestV25(manifest).map(error => `manifest: ${error}`),
  ...validatePreferenceCustodyManifestV25Build(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Preference Custody laboratory floor v25: PASS');
}
