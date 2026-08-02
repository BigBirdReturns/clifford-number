import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV29Build } from './lib/preference-custody-manifest-v29.mjs';

const path = process.argv[2] ?? 'build/research/preference-custody-laboratory-floor-v29.json';
const compiled = JSON.parse(readFileSync(path, 'utf8'));
const errors = validatePreferenceCustodyManifestV29Build(compiled);
if (errors.length) {
  console.error(`preference custody v29 validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('preference custody v29 validation: PASS');
