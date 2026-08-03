import { readFileSync } from 'node:fs';
import { validatePreferenceHardToEnumerateMissingnessAssuranceBuild } from './lib/preference-hard-to-enumerate-missingness-assurance.mjs';
const path = process.argv[2] ?? 'build/research/preference-hard-to-enumerate-missingness-assurance.json';
const errors = validatePreferenceHardToEnumerateMissingnessAssuranceBuild(JSON.parse(readFileSync(path,'utf8')));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('preference hard-to-enumerate missingness assurance validation: PASS');
