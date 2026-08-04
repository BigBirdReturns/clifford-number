import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePreferenceCustodyManifestV42, renderPreferenceCustodyManifestV42Markdown } from './lib/preference-custody-manifest-v42.mjs';
execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v41.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['tools/compile-preference-linkage-uncertainty-monitoring-assurance.mjs'], { stdio: 'inherit' });
const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v42.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v42.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v42.md';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const baseBuild = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v41.json', 'utf8'));
const uncertaintyBuild = JSON.parse(readFileSync('build/research/preference-linkage-uncertainty-monitoring-assurance.json', 'utf8'));
const uncertaintyFixture = JSON.parse(readFileSync(manifest.extension_control.source_fixture_path, 'utf8'));
const baseSources = {
  manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v41.json', 'utf8')),
  baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v40.json', 'utf8')),
  probabilityBuild: JSON.parse(readFileSync('build/research/preference-linkage-probability-calibration-assurance.json', 'utf8')),
  probabilityFixture: JSON.parse(readFileSync('data/research/preference-custody/linkage-probability-calibration-assurance.fixture.json', 'utf8')),
  baseSources: {
    manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v40.json', 'utf8')),
    baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v39.json', 'utf8')),
    scoreBuild: JSON.parse(readFileSync('build/research/preference-linkage-score-calibration-assurance.json', 'utf8')),
    scoreFixture: JSON.parse(readFileSync('data/research/preference-custody/linkage-score-calibration-assurance.fixture.json', 'utf8')),
    baseSources: {
      manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v39.json', 'utf8')),
      baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v38.json', 'utf8')),
      candidateBuild: JSON.parse(readFileSync('build/research/preference-candidate-pair-blocking-recall-assurance.json', 'utf8')),
      candidateFixture: JSON.parse(readFileSync('data/research/preference-custody/candidate-pair-blocking-recall-assurance.fixture.json', 'utf8')),
      baseSources: {
        manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v38.json', 'utf8')),
        baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v37.json', 'utf8')),
        confidenceBuild: JSON.parse(readFileSync('build/research/preference-linkage-confidence-adjudication-assurance.json', 'utf8')),
        confidenceFixture: JSON.parse(readFileSync('data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json', 'utf8')),
        v37SourceCutoff: {
          manifest: JSON.parse(readFileSync('data/research/preference-custody/control-manifest-v37.json', 'utf8')),
          baseBuild: JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v36.json', 'utf8')),
          linkageBuild: JSON.parse(readFileSync('build/research/preference-record-linkage-temporal-succession-assurance.json', 'utf8')),
          linkageFixture: JSON.parse(readFileSync('data/research/preference-custody/record-linkage-temporal-succession-assurance.fixture.json', 'utf8'))
        }
      }
    }
  }
};
const compiled = compilePreferenceCustodyManifestV42(manifest, baseBuild, uncertaintyBuild, uncertaintyFixture, baseSources);
mkdirSync(dirname(jsonPath), { recursive: true }); mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n'); writeFileSync(markdownPath, renderPreferenceCustodyManifestV42Markdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
