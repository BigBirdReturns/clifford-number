import { readFileSync } from 'node:fs';
import {
  validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture,
  validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild
} from './lib/preference-record-linkage-temporal-succession-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/record-linkage-temporal-succession-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-record-linkage-temporal-succession-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture),
  ...validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(build)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log(`validated ${build.fixture_id}: ${build.metrics.world_count} worlds, ${build.metrics.distinct_record_linkage_provenance_signatures} provenance signatures`);
