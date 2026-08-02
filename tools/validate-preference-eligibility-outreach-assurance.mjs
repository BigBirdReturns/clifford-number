import { readFileSync } from 'node:fs';
import { validatePreferenceEligibilityOutreachAssuranceBuild } from './lib/preference-eligibility-outreach-assurance.mjs';
const path = process.argv[2] ?? 'build/research/preference-eligibility-outreach-assurance.json';
const errors = validatePreferenceEligibilityOutreachAssuranceBuild(JSON.parse(readFileSync(path, 'utf8')));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('preference eligibility-outreach assurance validation: PASS');
