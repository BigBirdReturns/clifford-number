import { readFileSync } from 'node:fs';
import {
  validatePreferenceCustodyManifestV45,
  validatePreferenceCustodyManifestV45Build
} from './lib/preference-custody-manifest-v45.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v45.json';
const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v45.json';
const load = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = load(manifestPath);
const build = load(buildPath);
const baseBuild = load('build/research/preference-custody-laboratory-floor-v44.json');
const targetBuild = load('build/research/preference-linkage-event-estimand-scope-interpretation-assurance.json');
const targetFixture = load(manifest.extension_control.source_fixture_path);
const baseSources = {
  manifest: load('data/research/preference-custody/control-manifest-v44.json'),
  baseBuild: load('build/research/preference-custody-laboratory-floor-v43.json'),
  targetBuild: load('build/research/preference-linkage-target-construction-exchangeability-assurance.json'),
  targetFixture: load('data/research/preference-custody/linkage-target-construction-exchangeability-assurance.fixture.json'),
  baseSources: {
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
  }
};
const errors = [
  ...validatePreferenceCustodyManifestV45(manifest),
  ...validatePreferenceCustodyManifestV45Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources)
];
if (errors.length) {
  console.error(errors.map(error => `- ${error}`).join('\n'));
  process.exit(1);
}
console.log('validated Preference Custody laboratory floor v45');
