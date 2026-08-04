import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture,
  renderPreferenceLinkageIntervalMethodPartitionReplicationDeploymentMarkdown
} from './lib/preference-linkage-interval-method-partition-replication-deployment-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-interval-method-partition-replication-deployment-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-linkage-interval-method-partition-replication-deployment-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-linkage-interval-method-partition-replication-deployment-assurance.md';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = compilePreferenceLinkageIntervalMethodPartitionReplicationDeploymentFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceLinkageIntervalMethodPartitionReplicationDeploymentMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
