import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { compilePerformativeFixture } from './lib/performative-synthetic-constituency.mjs';
import { compilePreferenceCustodyFixture } from './lib/preference-custody.mjs';
import { compilePreferenceEquifinalityFixture } from './lib/preference-equifinality.mjs';
import { compilePreferenceAttritionFixture } from './lib/preference-attrition.mjs';
import { compilePreferenceSubgroupFixture } from './lib/preference-subgroup.mjs';
import { compilePreferenceStandingFixture } from './lib/preference-standing.mjs';
import { compilePreferenceAgendaFixture } from './lib/preference-agenda.mjs';
import { compilePreferencePackageFixture } from './lib/preference-package.mjs';
import { compilePreferenceSuccessionFixture } from './lib/preference-succession.mjs';
import { compilePreferenceDynamicChangeFixture } from './lib/preference-dynamic-change.mjs';
import { compilePreferenceNetworkFormationFixture } from './lib/preference-network-formation.mjs';
import { compilePreferenceDeliberativeFormationFixture } from './lib/preference-deliberative-formation.mjs';
import { compilePreferenceEpistemicQualityFixture } from './lib/preference-epistemic-quality.mjs';
import { compilePreferenceProvenanceRecoveryFixture } from './lib/preference-provenance-recovery.mjs';
import { compilePreferenceCustodyManifest } from './lib/preference-custody-manifest.mjs';
import { compilePreferenceCustodyManifestV9 } from './lib/preference-custody-manifest-v9.mjs';
import { compilePreferenceCustodyManifestV10 } from './lib/preference-custody-manifest-v10.mjs';
import { compilePreferenceCustodyManifestV11 } from './lib/preference-custody-manifest-v11.mjs';
import {
  compilePreferenceCustodyManifestV12,
  renderPreferenceCustodyManifestV12Markdown
} from './lib/preference-custody-manifest-v12.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v12.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v12.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v12.md';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const baseV8 = compilePreferenceCustodyManifest(
  readJson('data/research/preference-custody/control-manifest.json'),
  {
    'build/research/performative-synthetic-constituency-fixture.json': compilePerformativeFixture(readJson('data/research/performative-synthetic-constituencies/exposure-confounding.fixture.json')),
    'build/research/preference-custody-option-set-fixture.json': compilePreferenceCustodyFixture(readJson('data/research/preference-custody/option-set-starvation.fixture.json')),
    'build/research/preference-observational-equivalence.json': compilePreferenceEquifinalityFixture(readJson('data/research/preference-custody/observational-equivalence.fixture.json')),
    'build/research/preference-attrition-refusal.json': compilePreferenceAttritionFixture(readJson('data/research/preference-custody/refusal-exit.fixture.json')),
    'build/research/preference-subgroup-capacity.json': compilePreferenceSubgroupFixture(readJson('data/research/preference-custody/subgroup-capacity.fixture.json')),
    'build/research/preference-standing-authority.json': compilePreferenceStandingFixture(readJson('data/research/preference-custody/standing-authority.fixture.json')),
    'build/research/preference-agenda-formation.json': compilePreferenceAgendaFixture(readJson('data/research/preference-custody/agenda-formation.fixture.json')),
    'build/research/preference-package-bargaining.json': compilePreferencePackageFixture(readJson('data/research/preference-custody/package-bargaining.fixture.json')),
    'build/research/preference-succession-validation.json': compilePreferenceSuccessionFixture(readJson('data/research/preference-custody/succession-validation.fixture.json')),
    'build/research/preference-dynamic-change.json': compilePreferenceDynamicChangeFixture(readJson('data/research/preference-custody/dynamic-change.fixture.json'))
  }
);
const baseV9 = compilePreferenceCustodyManifestV9(
  readJson('data/research/preference-custody/control-manifest-v9.json'),
  baseV8,
  compilePreferenceNetworkFormationFixture(readJson('data/research/preference-custody/network-formation.fixture.json'))
);
const baseV10 = compilePreferenceCustodyManifestV10(
  readJson('data/research/preference-custody/control-manifest-v10.json'),
  baseV9,
  compilePreferenceDeliberativeFormationFixture(readJson('data/research/preference-custody/deliberative-formation.fixture.json'))
);
const baseV11 = compilePreferenceCustodyManifestV11(
  readJson('data/research/preference-custody/control-manifest-v11.json'),
  baseV10,
  compilePreferenceEpistemicQualityFixture(readJson('data/research/preference-custody/epistemic-quality.fixture.json'))
);
const provenanceBuild = compilePreferenceProvenanceRecoveryFixture(
  readJson('data/research/preference-custody/provenance-recovery.fixture.json')
);
const compiled = compilePreferenceCustodyManifestV12(readJson(manifestPath), baseV11, provenanceBuild);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyManifestV12Markdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
