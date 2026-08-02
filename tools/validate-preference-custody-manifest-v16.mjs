import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV16,
  validatePreferenceCustodyManifestV16Build
} from './lib/preference-custody-manifest-v16.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v16.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v16.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceCustodyManifestV16(manifest).map(error => `manifest: ${error}`),
  ...validatePreferenceCustodyManifestV16Build(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Preference Custody laboratory floor v16: PASS');
}
