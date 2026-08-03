import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV32Build } from './lib/preference-custody-manifest-v32.mjs';
const path = process.argv[2] ?? 'build/research/preference-custody-laboratory-floor-v32.json';
const errors = validatePreferenceCustodyManifestV32Build(JSON.parse(readFileSync(path, 'utf8')));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('preference custody v32 validation: PASS');
