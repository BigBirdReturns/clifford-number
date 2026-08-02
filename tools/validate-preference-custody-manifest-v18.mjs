import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV18,
  validatePreferenceCustodyManifestV18Build
} from './lib/preference-custody-manifest-v18.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v18.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v18.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceCustodyManifestV18(manifest).map(error => `manifest: ${error}`),
  ...validatePreferenceCustodyManifestV18Build(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('Preference Custody laboratory floor v18: PASS');
}
