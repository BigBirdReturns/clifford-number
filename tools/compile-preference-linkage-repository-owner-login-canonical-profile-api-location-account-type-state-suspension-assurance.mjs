import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture,
  renderPreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceMarkdown
} from './lib/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.mjs';
const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-linkage-repository-owner-login-canonical-profile-api-location-account-type-state-suspension-assurance.md';
let fixture;
try { fixture = JSON.parse(readFileSync(fixturePath, 'utf8')); }
catch (error) { console.error(`- PC-59 fixture could not be read: ${error.message}`); process.exit(1); }
let build;
try { build = compilePreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceFixture(fixture); }
catch (error) { console.error(`- PC-59 deterministic compile failed: ${error.message}`); process.exit(1); }
mkdirSync(dirname(jsonPath), { recursive: true }); mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(build, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceLinkageRepositoryOwnerLoginCanonicalProfileApiLocationAccountTypeStateSuspensionAssuranceMarkdown(build));
console.log(`compiled ${fixture.fixture_id} -> ${jsonPath}, ${markdownPath}`);
