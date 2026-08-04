import { readFileSync } from 'node:fs';
import { validatePreferenceCustodyManifestV42, validatePreferenceCustodyManifestV42Build } from './lib/preference-custody-manifest-v42.mjs';
const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v42.json'; const buildPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v42.json';
const manifest=JSON.parse(readFileSync(manifestPath,'utf8')); const build=JSON.parse(readFileSync(buildPath,'utf8')); const baseBuild=JSON.parse(readFileSync('build/research/preference-custody-laboratory-floor-v41.json','utf8')); const uncertaintyBuild=JSON.parse(readFileSync('build/research/preference-linkage-uncertainty-monitoring-assurance.json','utf8')); const uncertaintyFixture=JSON.parse(readFileSync(manifest.extension_control.source_fixture_path,'utf8'));
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
        confidenceFixture: JSON.parse(readFileSync('data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json', 'utf8'))
      }
    }
  }
};
const errors=[...validatePreferenceCustodyManifestV42(manifest),...validatePreferenceCustodyManifestV42Build(build,manifest,baseBuild,uncertaintyBuild,uncertaintyFixture,baseSources)]; if(errors.length){console.error(errors.map(error=>`- ${error}`).join('\n'));process.exit(1);} console.log('validated Preference Custody laboratory floor v42');
