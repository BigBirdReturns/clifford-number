import { readFileSync } from 'node:fs';
import {
  validatePreferenceLinkageRepositoryOwnerImmutableRepositoryIdTransferRenameForkNetworkCanonicalLocationAssuranceBuild,
  validatePreferenceLinkageRepositoryOwnerImmutableRepositoryIdTransferRenameForkNetworkCanonicalLocationAssuranceFixture
} from './lib/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-repository-owner-immutable-repository-id-transfer-rename-fork-network-canonical-location-assurance.json';
const load = path => JSON.parse(readFileSync(path, 'utf8'));

let fixture;
try {
  fixture = load(fixturePath);
} catch (error) {
  console.error(`- PC-56 fixture could not be read: ${error.message}`);
  process.exit(1);
}

const fixtureErrors = validatePreferenceLinkageRepositoryOwnerImmutableRepositoryIdTransferRenameForkNetworkCanonicalLocationAssuranceFixture(fixture);
if (fixtureErrors.length) {
  console.error(fixtureErrors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}

let build;
try {
  build = load(buildPath);
} catch (error) {
  console.error(`- PC-56 build could not be read: ${error.message}`);
  process.exit(1);
}

const errors = validatePreferenceLinkageRepositoryOwnerImmutableRepositoryIdTransferRenameForkNetworkCanonicalLocationAssuranceBuild(build, fixture);
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`validated ${fixture.fixture_id} from ${buildPath}`);
