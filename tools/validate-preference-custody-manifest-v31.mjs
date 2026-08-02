import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV31Build } from './lib/preference-custody-manifest-v31.mjs';
const path = process.argv[2] ?? 'build/research/preference-custody-laboratory-floor-v31.json';
const errors = validatePreferenceCustodyManifestV31Build(JSON.parse(readFileSync(path, 'utf8')));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('preference custody v31 validation: PASS');
