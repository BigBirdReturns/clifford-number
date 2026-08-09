import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture,
  renderPreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceMarkdown,
  validatePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture
} from './lib/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.md';
let fixture;
try { fixture = JSON.parse(readFileSync(fixturePath, 'utf8')); }
catch (error) { console.error(`- PC-58 fixture could not be read: ${error.message}`); process.exit(1); }
const errors = validatePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture(fixture);
if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
let build;
try { build = compilePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture(fixture); }
catch (error) { console.error(`- PC-58 deterministic compile failed: ${error.message}`); process.exit(1); }
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(build, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceMarkdown(build));
console.log(`compiled ${fixture.fixture_id} -> ${jsonPath}, ${markdownPath}`);
