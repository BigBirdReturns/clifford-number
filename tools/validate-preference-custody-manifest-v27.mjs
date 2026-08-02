import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV27,
  validatePreferenceCustodyManifestV27Build
} from './lib/preference-custody-manifest-v27.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v27.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v27.json';

const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceCustodyManifestV27(manifest).map(error => `manifest: ${error}`),
  ...validatePreferenceCustodyManifestV27Build(compiled).map(error => `build: ${error}`)
];

if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Preference custody laboratory floor v27: PASS');
}
