import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture,
  renderPreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceMarkdown,
  validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture
} from './lib/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.md';
let fixture;
try { fixture = JSON.parse(readFileSync(fixturePath, 'utf8')); }
catch (error) { console.error(`- PC-57 fixture could not be read: ${error.message}`); process.exit(1); }
const errors = validatePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture);
if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
let build;
try { build = compilePreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceFixture(fixture); }
catch (error) { console.error(`- PC-57 deterministic compile failed: ${error.message}`); process.exit(1); }
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(build, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceLinkageRepositoryOwnerImmutableOwnerIdRepositoryIdTransferLineageAssuranceMarkdown(build));
console.log(`compiled ${fixture.fixture_id} -> ${jsonPath}, ${markdownPath}`);
