import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV28Build } from './lib/preference-custody-manifest-v28.mjs';

const path = process.argv[2] ?? 'build/research/preference-custody-laboratory-floor-v28.json';
const compiled = JSON.parse(readFileSync(path, 'utf8'));
const errors = validatePreferenceCustodyManifestV28Build(compiled);
if (errors.length) {
  console.error(`preference custody v28 validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('preference custody v28 validation: PASS');
