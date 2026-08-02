import { readFileSync } from 'node:fs';
import { validatePreferenceServiceDenominatorAssuranceBuild } from './lib/preference-service-denominator-assurance.mjs';

const buildPath = process.argv[2] ?? 'build/research/preference-service-denominator-assurance.json';
const compiled = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = validatePreferenceServiceDenominatorAssuranceBuild(compiled);
if (errors.length) {
  console.error(`preference service-denominator assurance validation: FAIL\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('preference service-denominator assurance validation: PASS');
