import { readFileSync } from 'node:fs';
import { validatePreferenceLinkageTargetConstructionExchangeabilityFixture, validatePreferenceLinkageTargetConstructionExchangeabilityBuild } from './lib/preference-linkage-target-construction-exchangeability-assurance.mjs';
const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-target-construction-exchangeability-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-target-construction-exchangeability-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8')); const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [...validatePreferenceLinkageTargetConstructionExchangeabilityFixture(fixture), ...validatePreferenceLinkageTargetConstructionExchangeabilityBuild(build, fixture)];
if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
console.log('validated linkage target, construction, and exchangeability fixture and build');
