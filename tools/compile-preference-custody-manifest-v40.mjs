import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePreferenceCustodyManifestV40, renderPreferenceCustodyManifestV40Markdown } from './lib/preference-custody-manifest-v40.mjs';

execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v39.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['tools/compile-preference-linkage-score-calibration-assurance.mjs'], { stdio: 'inherit' });
const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v40.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v40.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v40.md';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const baseBuild = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v39.json', 'utf8'));
const scoreBuild = JSON.parse(readFileSync('build/research/preference-linkage-score-calibration-assurance.json', 'utf8'));
const scoreFixture = JSON.parse(readFileSync(manifest.extension_control.source_fixture_path, 'utf8'));
const baseSources = {
  manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v39.json', 'utf8')),
  baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v38.json', 'utf8')),
  candidateBuild: JSON.parse(readFileSync('build/research/preference-candidate-pair-blocking-recall-assurance.json', 'utf8')),
  candidateFixture: JSON.parse(readFileSync('data/research/preference-custody/candidate-pair-blocking-recall-assurance.fixture.json', 'utf8')),
  baseSources: {
    manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v38.json', 'utf8')),
    baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v37.json', 'utf8')),
    confidenceBuild: JSON.parse(readFileSync('build/research/preference-linkage-confidence-adjudication-assurance.json', 'utf8')),
    confidenceFixture: JSON.parse(readFileSync('data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json', 'utf8'))
  }
};
const compiled = compilePreferenceCustodyManifestV40(manifest, baseBuild, scoreBuild, scoreFixture, baseSources);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyManifestV40Markdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
