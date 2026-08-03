import { readFileSync } from 'node:fs';
import { validatePreferenceSourcePopulationRuleAssuranceBuild } from './lib/preference-source-population-rule-assurance.mjs';
const path = process.argv[2] ?? 'build/research/preference-source-population-rule-assurance.json';
const errors = validatePreferenceSourcePopulationRuleAssuranceBuild(JSON.parse(readFileSync(path, 'utf8')));
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log('preference source-population-rule assurance validation: PASS');
