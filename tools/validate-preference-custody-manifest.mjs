import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifest,
  validatePreferenceCustodyManifestBuild
} from './lib/preference-custody-manifest.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor.json';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceCustodyManifest(manifest).map(error => `manifest: ${error}`),
  ...validatePreferenceCustodyManifestBuild(compiled).map(error => `build: ${error}`)
];
if (errors.length) {
  console.error(errors.join('\n'));
  process.exitCode = 1;
} else {
  console.log('preference custody laboratory floor: PASS');
}
