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
import { compilePreferenceTrustFederationFixture } from './lib/preference-trust-federation.mjs';
import { compilePreferenceLiabilityRemedyFixture } from './lib/preference-liability-remedy.mjs';
import { compilePreferenceRemedyEnforcementFixture } from './lib/preference-remedy-enforcement.mjs';
import { compilePreferenceCollectiveDistributionFixture } from './lib/preference-collective-distribution.mjs';
import { compilePreferenceAllocationFormulaFixture } from './lib/preference-allocation-formula.mjs';
import { compilePreferenceReleaseAuthorityFixture } from './lib/preference-release-authority.mjs';
import { compilePreferenceChoiceEffectivenessFixture } from './lib/preference-choice-effectiveness.mjs';
import { compilePreferenceChoiceArchitectureFixture } from './lib/preference-choice-architecture.mjs';
import { compilePreferenceComprehensionAssuranceFixture } from './lib/preference-comprehension-assurance.mjs';
import { compilePreferenceInstrumentValidityFixture } from './lib/preference-instrument-validity.mjs';
import { compilePreferenceCriterionScoreUseFixture } from './lib/preference-criterion-score-use.mjs';
import { compilePreferenceCausalAssuranceFixture } from './lib/preference-causal-assurance.mjs';
import { compilePreferenceCustodyManifest } from './lib/preference-custody-manifest.mjs';
import { compilePreferenceCustodyManifestV9 } from './lib/preference-custody-manifest-v9.mjs';
import { compilePreferenceCustodyManifestV10 } from './lib/preference-custody-manifest-v10.mjs';
import { compilePreferenceCustodyManifestV11 } from './lib/preference-custody-manifest-v11.mjs';
import { compilePreferenceCustodyManifestV12 } from './lib/preference-custody-manifest-v12.mjs';
import { compilePreferenceCustodyManifestV13 } from './lib/preference-custody-manifest-v13.mjs';
import { compilePreferenceCustodyManifestV14 } from './lib/preference-custody-manifest-v14.mjs';
import { compilePreferenceCustodyManifestV15 } from './lib/preference-custody-manifest-v15.mjs';
import { compilePreferenceCustodyManifestV16 } from './lib/preference-custody-manifest-v16.mjs';
import { compilePreferenceCustodyManifestV17 } from './lib/preference-custody-manifest-v17.mjs';
import { compilePreferenceCustodyManifestV18 } from './lib/preference-custody-manifest-v18.mjs';
import { compilePreferenceCustodyManifestV19 } from './lib/preference-custody-manifest-v19.mjs';
import { compilePreferenceCustodyManifestV20 } from './lib/preference-custody-manifest-v20.mjs';
import { compilePreferenceCustodyManifestV21 } from './lib/preference-custody-manifest-v21.mjs';
import { compilePreferenceCustodyManifestV22 } from './lib/preference-custody-manifest-v22.mjs';
import { compilePreferenceCustodyManifestV23 } from './lib/preference-custody-manifest-v23.mjs';
import {
  compilePreferenceCustodyManifestV24,
  renderPreferenceCustodyManifestV24Markdown
} from './lib/preference-custody-manifest-v24.mjs';

const manifestPath = process.argv[2] ?? 'data/research/preference-custody/control-manifest-v24.json';
const jsonPath = process.argv[3] ?? 'build/research/preference-custody-laboratory-floor-v24.json';
const markdownPath = process.argv[4] ?? 'build/research/preference-custody-laboratory-floor-v24.md';
const readJson = path => JSON.parse(readFileSync(path, 'utf8'));

const baseV8 = compilePreferenceCustodyManifest(readJson('data/research/preference-custody/control-manifest.json'), {
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
});
const baseV9 = compilePreferenceCustodyManifestV9(readJson('data/research/preference-custody/control-manifest-v9.json'), baseV8, compilePreferenceNetworkFormationFixture(readJson('data/research/preference-custody/network-formation.fixture.json')));
const baseV10 = compilePreferenceCustodyManifestV10(readJson('data/research/preference-custody/control-manifest-v10.json'), baseV9, compilePreferenceDeliberativeFormationFixture(readJson('data/research/preference-custody/deliberative-formation.fixture.json')));
const baseV11 = compilePreferenceCustodyManifestV11(readJson('data/research/preference-custody/control-manifest-v11.json'), baseV10, compilePreferenceEpistemicQualityFixture(readJson('data/research/preference-custody/epistemic-quality.fixture.json')));
const baseV12 = compilePreferenceCustodyManifestV12(readJson('data/research/preference-custody/control-manifest-v12.json'), baseV11, compilePreferenceProvenanceRecoveryFixture(readJson('data/research/preference-custody/provenance-recovery.fixture.json')));
const baseV13 = compilePreferenceCustodyManifestV13(readJson('data/research/preference-custody/control-manifest-v13.json'), baseV12, compilePreferenceTrustFederationFixture(readJson('data/research/preference-custody/trust-federation.fixture.json')));
const baseV14 = compilePreferenceCustodyManifestV14(readJson('data/research/preference-custody/control-manifest-v14.json'), baseV13, compilePreferenceLiabilityRemedyFixture(readJson('data/research/preference-custody/liability-remedy.fixture.json')));
const baseV15 = compilePreferenceCustodyManifestV15(readJson('data/research/preference-custody/control-manifest-v15.json'), baseV14, compilePreferenceRemedyEnforcementFixture(readJson('data/research/preference-custody/remedy-enforcement.fixture.json')));
const baseV16 = compilePreferenceCustodyManifestV16(readJson('data/research/preference-custody/control-manifest-v16.json'), baseV15, compilePreferenceCollectiveDistributionFixture(readJson('data/research/preference-custody/collective-distribution.fixture.json')));
const baseV17 = compilePreferenceCustodyManifestV17(readJson('data/research/preference-custody/control-manifest-v17.json'), baseV16, compilePreferenceAllocationFormulaFixture(readJson('data/research/preference-custody/allocation-formula.fixture.json')));
const baseV18 = compilePreferenceCustodyManifestV18(readJson('data/research/preference-custody/control-manifest-v18.json'), baseV17, compilePreferenceReleaseAuthorityFixture(readJson('data/research/preference-custody/release-authority.fixture.json')));
const baseV19 = compilePreferenceCustodyManifestV19(readJson('data/research/preference-custody/control-manifest-v19.json'), baseV18, compilePreferenceChoiceEffectivenessFixture(readJson('data/research/preference-custody/choice-effectiveness.fixture.json')));
const baseV20 = compilePreferenceCustodyManifestV20(readJson('data/research/preference-custody/control-manifest-v20.json'), baseV19, compilePreferenceChoiceArchitectureFixture(readJson('data/research/preference-custody/choice-architecture.fixture.json')));
const baseV21 = compilePreferenceCustodyManifestV21(readJson('data/research/preference-custody/control-manifest-v21.json'), baseV20, compilePreferenceComprehensionAssuranceFixture(readJson('data/research/preference-custody/comprehension-assurance.fixture.json')));
const baseV22 = compilePreferenceCustodyManifestV22(readJson('data/research/preference-custody/control-manifest-v22.json'), baseV21, compilePreferenceInstrumentValidityFixture(readJson('data/research/preference-custody/instrument-validity.fixture.json')));
const baseV23 = compilePreferenceCustodyManifestV23(readJson('data/research/preference-custody/control-manifest-v23.json'), baseV22, compilePreferenceCriterionScoreUseFixture(readJson('data/research/preference-custody/criterion-score-use.fixture.json')));
const causalBuild = compilePreferenceCausalAssuranceFixture(readJson('data/research/preference-custody/causal-assurance.fixture.json'));
const compiled = compilePreferenceCustodyManifestV24(readJson(manifestPath), baseV23, causalBuild);
mkdirSync(dirname(jsonPath), { recursive: true });
mkdirSync(dirname(markdownPath), { recursive: true });
writeFileSync(jsonPath, JSON.stringify(compiled, null, 2) + '\n');
writeFileSync(markdownPath, renderPreferenceCustodyManifestV24Markdown(compiled));
console.log(`compiled ${compiled.manifest_id} -> ${jsonPath}, ${markdownPath}`);
