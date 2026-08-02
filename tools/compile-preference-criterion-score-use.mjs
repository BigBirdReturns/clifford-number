import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceCriterionScoreUseFixture,
  renderPreferenceCriterionScoreUseMarkdown
} from './lib/preference-criterion-score-use.mjs';

const sourcePath = process.argv[2] ?? 'data/research/preference-custody/criterion-score-use.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-criterion-score-use.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-criterion-score-use.md';

const fixture = JSON.parse(readFileSync(sourcePath, 'utf8'));
const compiled = compilePreferenceCriterionScoreUseFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCriterionScoreUseMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
