import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePreferenceLinkageScoreCalibrationAssuranceFixture, renderPreferenceLinkageScoreCalibrationAssuranceMarkdown } from './lib/preference-linkage-score-calibration-assurance.mjs';

const fixturePath = process.argv[2] ?? 'data/research/preference-custody/linkage-score-calibration-assurance.fixture.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-linkage-score-calibration-assurance.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-linkage-score-calibration-assurance.md';
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const compiled = compilePreferenceLinkageScoreCalibrationAssuranceFixture(fixture);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceLinkageScoreCalibrationAssuranceMarkdown(compiled));
console.log(`compiled ${compiled.fixture_id} -> ${jsonPath}, ${markdownPath}`);
