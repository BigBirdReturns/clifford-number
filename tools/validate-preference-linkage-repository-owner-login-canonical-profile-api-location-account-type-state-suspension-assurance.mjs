import { readFileSync } from 'node:fs';
import {
  validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceBuild,
  validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture
} from './lib/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs';
const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.json';
let fixture;
try { fixture = JSON.parse(readFileSync(fixturePath, 'utf8')); }
catch (error) { console.error(`- PC-59 fixture could not be read: ${error.message}`); process.exit(1); }
const fixtureErrors = validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture(fixture);
if (fixtureErrors.length) { console.error(fixtureErrors.map(error => `- ${error}`).join('\n')); process.exit(1); }
let build;
try { build = JSON.parse(readFileSync(buildPath, 'utf8')); }
catch (error) { console.error(`- PC-59 build could not be read: ${error.message}`); process.exit(1); }
const buildErrors = validatePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceBuild(build, fixture);
if (buildErrors.length) { console.error(buildErrors.map(error => `- ${error}`).join('\n')); process.exit(1); }
console.log(`validated ${fixture.fixture_id}`);
