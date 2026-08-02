import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceCollectiveDistributionFixture,
  renderPreferenceCollectiveDistributionMarkdown
} from './lib/preference-collective-distribution.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/collective-distribution.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-collective-distribution.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-collective-distribution.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceCollectiveDistributionFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCollectiveDistributionMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
