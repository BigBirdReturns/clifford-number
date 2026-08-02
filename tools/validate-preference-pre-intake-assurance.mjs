import { readFileSync } from 'node:fs';
import { validatePreferencePreIntakeAssuranceBuild } from './lib/preference-pre-intake-assurance.mjs';
const path = process.argv[2] ?? 'build/research/preference-pre-intake-assurance.json';
const errors = validatePreferencePreIntakeAssuranceBuild(JSON.parse(readFileSync(path, 'utf8')));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('preference pre-intake assurance validation: PASS');
