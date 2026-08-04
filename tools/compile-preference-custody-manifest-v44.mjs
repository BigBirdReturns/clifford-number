import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePreferenceCustodyManifestV44, renderPreferenceCustodyManifestV44Markdown } from './lib/preference-custody-manifest-v44.mjs';
execFileSync(process.execPath, ['tools/compile-preference-custody-manifest-v43.mjs'], { stdio: 'inherit' });
execFileSync(process.execPath, ['tools/compile-preference-linkage-target-construction-exchangeability-assurance.mjs'], { stdio: 'inherit' });
const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v44.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v44.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v44.md';
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const baseBuild = JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v43.json', 'utf8'));
const targetBuild = JSON.parse(readFileSync('build/research/preference-linkage-target-construction-exchangeability-assurance.json', 'utf8'));
const targetFixture = JSON.parse(readFileSync(manifest.extension_control.source_fixture_path, 'utf8'));
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const baseSources = {
  manifest: load('data/research/preference-custody/control-manifest-v43.json'),
  baseBuild: load('build/research/preference-custody-laboratory-floor-v42.json'),
  intervalBuild: load('build/research/preference-linkage-interval-construction-assurance.json'),
  intervalFixture: load('data/research/preference-custody/linkage-interval-construction-assurance.fixture.json'),
  baseSources: {
    manifest: load('data/research/preference-custody/control-manifest-v42.json'),
    baseBuild: load('build/research/preference-custody-laboratory-floor-v41.json'),
    uncertaintyBuild: load('build/research/preference-linkage-uncertainty-monitoring-assurance.json'),
    uncertaintyFixture: load('data/research/preference-custody/linkage-uncertainty-monitoring-assurance.fixture.json'),
    baseSources: {
      manifest: load('data/research/preference-custody/control-manifest-v41.json'),
      baseBuild: load('build/research/preference-custody-laboratory-floor-v40.json'),
      probabilityBuild: load('build/research/preference-linkage-probability-calibration-assurance.json'),
      probabilityFixture: load('data/research/preference-custody/linkage-probability-calibration-assurance.fixture.json'),
      baseSources: {
        manifest: load('data/research/preference-custody/control-manifest-v40.json'),
        baseBuild: load('build/research/preference-custody-laboratory-floor-v39.json'),
        scoreBuild: load('build/research/preference-linkage-score-calibration-assurance.json'),
        scoreFixture: load('data/research/preference-custody/linkage-score-calibration-assurance.fixture.json'),
        baseSources: {
          manifest: load('data/research/preference-custody/control-manifest-v39.json'),
          baseBuild: load('build/research/preference-custody-laboratory-floor-v38.json'),
          candidateBuild: load('build/research/preference-candidate-pair-blocking-recall-assurance.json'),
          candidateFixture: load('data/research/preference-custody/candidate-pair-blocking-recall-assurance.fixture.json'),
          baseSources: {
            manifest: load('data/research/preference-custody/control-manifest-v38.json'),
            baseBuild: load('build/research/preference-custody-laboratory-floor-v37.json'),
            confidenceBuild: load('build/research/preference-linkage-confidence-adjudication-assurance.json'),
            confidenceFixture: load('data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json'),
            v37SourceCutoff: {
              manifest: load('data/research/preference-custody/control-manifest-v37.json'),
              baseBuild: load('build/research/preference-custody-laboratory-floor-v36.json'),
              linkageBuild: load('build/research/preference-record-linkage-temporal-succession-assurance.json'),
              linkageFixture: load('data/research/preference-custody/record-linkage-temporal-succession-assurance.fixture.json')
            }
          }
        }
      }
    }
  }
};
const compiled = compilePreferenceCustodyManifestV44(manifest, baseBuild, targetBuild, targetFixture, baseSources);
mkdirSync(dirname(jsonPath), { recursive: true }); mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n'); writeFileSync(markdownPath, renderPreferenceCustodyManifestV44Markdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
