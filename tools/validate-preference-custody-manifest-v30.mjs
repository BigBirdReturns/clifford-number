import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV30Build } from './lib/preference-custody-manifest-v30.mjs';
const path = process.argv[2] ?? 'build/research/preference-custody-laboratory-floor-v30.json';
const errors = validatePreferenceCustodyManifestV30Build(JSON.parse(readFileSync(path,'utf8')));
if(errors.length){console.error(errors.join('\n'));process.exit(1);} console.log('preference custody v30 validation: PASS');
