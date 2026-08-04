import { readFileSync } from 'node:fs';
import {
  validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild,
  validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture
} from './lib/preference-linkage-interval-method-partition-replication-deployment-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-interval-method-partition-replication-deployment-assurance.fixture.json';
const buildPath = process.argv[3] ?? 'build/research/preference-linkage-interval-method-partition-replication-deployment-assurance.json';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const errors = [
  ...validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture(fixture),
  ...validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild(build, fixture)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated linkage-interval method, partition, replication, and deployment fixture and build');
