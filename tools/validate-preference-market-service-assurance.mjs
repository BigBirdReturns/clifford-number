import { readFileSync } from 'node:fs';
import { validatePreferenceMarketServiceAssuranceBuild } from './lib/preference-market-service-assurance.mjs';

const path = process.argv[2] ?? 'build/research/preference-market-service-assurance.json';
const compiled = JSON.parse(readFileSync(path, 'utf8'));
const errors = validatePreferenceMarketServiceAssuranceBuild(compiled);
if (errors.length) {
  console.error(`preference market-service assurance validation failed:\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('preference market-service assurance validation: PASS');
