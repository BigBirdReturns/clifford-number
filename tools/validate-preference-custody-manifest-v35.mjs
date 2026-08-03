import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV35Build } from './lib/preference-custody-manifest-v35.mjs';
const path=process.argv[2]??'build/research/preference-custody-laboratory-floor-v35.json';const errors=validatePreferenceCustodyManifestV35Build(JSON.parse(readFileSync(path,'utf8')));if(errors.length){console.error(errors.join('\n'));process.exit(1);}console.log('preference custody v35 validation: PASS');
