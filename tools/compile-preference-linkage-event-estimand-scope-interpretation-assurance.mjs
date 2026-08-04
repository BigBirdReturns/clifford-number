import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import {
  compilePreferenceLinkageEventEstimandScopeInterpretationFixture,
  renderPreferenceLinkageEventEstimandScopeInterpretationMarkdown
} from './lib/preference-linkage-event-estimand-scope-interpretation-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-event-estimand-scope-interpretation-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-linkage-event-estimand-scope-interpretation-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-linkage-event-estimand-scope-interpretation-assurance.md';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = compilePreferenceLinkageEventEstimandScopeInterpretationFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceLinkageEventEstimandScopeInterpretationMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
