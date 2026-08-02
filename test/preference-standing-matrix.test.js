import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compilePreferenceRealCase } from '../tools/lib/preference-real-case.mjs';
import { compilePreferenceHumanCompanion } from '../tools/lib/preference-human-companion.mjs';
import { compilePreferenceHybridArchitecture } from '../tools/lib/preference-hybrid-architecture.mjs';
import { compileRepresentationCustodyPacket } from '../tools/lib/preference-representation-custody.mjs';
import {
  compileStandingMatrix,
  renderStandingMatrixMarkdown,
  validateStandingMatrixBuild,
  validateStandingMatrixChain,
  validateStandingMatrixManifest
} from '../tools/lib/preference-standing-matrix.mjs';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = readJson('data/research/preference-custody/representation-validation-authority-matrix.json');
assert.deepEqual(validateStandingMatrixManifest(manifest), []);

const compiledSources = {
  'times-exploraition-public-admission-v1': compilePreferenceRealCase(
    readJson('data/research/preference-custody/real-cases/times-exploraition-admission.json')
  ),
  'newsuk-nucleus-human-companion-v1': compilePreferenceHumanCompanion(
    readJson('data/research/preference-custody/real-cases/newsuk-nucleus-human-companion.json')
  ),
  'yougov-parallax-hybrid-architecture-v1': compilePreferenceHybridArchitecture(
    readJson('data/research/preference-custody/real-cases/yougov-parallax-hybrid-architecture.json')
  ),
  'twineo-originalvoices-representation-custody-v1': compileRepresentationCustodyPacket(
    readJson('data/research/preference-custody/real-cases/twineo-originalvoices-representation-custody.json')
  )
};

const compiled = compileStandingMatrix(manifest, compiledSources);
assert.deepEqual(validateStandingMatrixBuild(compiled), []);
assert.equal(compiled.matrix_id, 'preference-standing-matrix-v1');
assert.equal(compiled.status, 'standing_matrix_compiled_four_cases_no_complete_authority_chain');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'bounded_orthogonal_comparative_control_surface');
assert.equal(compiled.source_case_count, 4);
assert.deepEqual(compiled.dimension_true_counts, {
  synthetic_or_twin_surface_confirmed: 4,
  individual_real_person_mapping_confirmed: 2,
  participant_training_update_and_review_confirmed: 1,
  participant_correction_deletion_withdrawal_and_portability_confirmed: 1,
  task_specific_pre_execution_approval_confirmed: 0,
  parallel_direct_human_research_confirmed: 1,
  participant_owner_fidelity_review_loop_confirmed: 1,
  same_represented_person_verification_route_confirmed: 1,
  fresh_or_targeted_finding_validation_route_confirmed: 1,
  executed_matched_study_confirmed: 0,
  response_distributions_and_uncertainty_confirmed: 0,
  discrepancy_reconciliation_confirmed: 0,
  operational_human_override_consequence_confirmed: 0,
  binding_affected_public_objective_control_confirmed: 0,
  participant_reward_path_confirmed: 1,
  collective_bargaining_or_group_ratification_confirmed: 0,
  deployment_specific_system_and_validation_lineage_confirmed: 0
});
assert.equal(compiled.cases_with_all_representation_validation_and_authority_axes_positive, 0);
assert.equal(compiled.cases_with_complete_matched_execution, 0);
assert.equal(compiled.cases_with_operational_human_override, 0);
assert.equal(compiled.cases_with_binding_public_authority, 0);
assert.deepEqual(validateStandingMatrixChain(compiled.custody_chain), []);
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);

const rows = Object.fromEntries(compiled.rows.map(row => [row.case_id, row]));
const times = rows['times-exploraition-public-admission-v1'];
const newsUk = rows['newsuk-nucleus-human-companion-v1'];
const youGov = rows['yougov-parallax-hybrid-architecture-v1'];
const twineo = rows['twineo-originalvoices-representation-custody-v1'];

assert.equal(times.dimensions.synthetic_or_twin_surface_confirmed, true);
assert.equal(times.dimensions.parallel_direct_human_research_confirmed, false);
assert.equal(times.dimensions.individual_real_person_mapping_confirmed, false);

assert.equal(newsUk.dimensions.synthetic_or_twin_surface_confirmed, true);
assert.equal(newsUk.dimensions.parallel_direct_human_research_confirmed, true);
assert.equal(newsUk.dimensions.fresh_or_targeted_finding_validation_route_confirmed, false);

assert.equal(youGov.dimensions.individual_real_person_mapping_confirmed, true);
assert.equal(youGov.dimensions.same_represented_person_verification_route_confirmed, true);
assert.equal(youGov.dimensions.fresh_or_targeted_finding_validation_route_confirmed, true);
assert.equal(youGov.dimensions.participant_training_update_and_review_confirmed, false);

assert.equal(twineo.dimensions.individual_real_person_mapping_confirmed, true);
assert.equal(twineo.dimensions.participant_training_update_and_review_confirmed, true);
assert.equal(twineo.dimensions.participant_correction_deletion_withdrawal_and_portability_confirmed, true);
assert.equal(twineo.dimensions.participant_owner_fidelity_review_loop_confirmed, true);
assert.equal(twineo.dimensions.participant_reward_path_confirmed, true);
assert.equal(twineo.dimensions.fresh_or_targeted_finding_validation_route_confirmed, false);

for (const row of compiled.rows) {
  assert.equal(row.dimensions.executed_matched_study_confirmed, false);
  assert.equal(row.dimensions.operational_human_override_consequence_confirmed, false);
  assert.equal(row.dimensions.binding_affected_public_objective_control_confirmed, false);
  assert.equal(row.dimensions.collective_bargaining_or_group_ratification_confirmed, false);
  assert.equal(row.dimensions.deployment_specific_system_and_validation_lineage_confirmed, false);
}

const markdown = renderStandingMatrixMarkdown(compiled);
assert.match(markdown, /Preference standing matrix v1/);
assert.match(markdown, /representation_fidelity/);
assert.match(markdown, /human_validation/);
assert.match(markdown, /decision_authority/);
assert.match(markdown, /Times ExplorAItion bounded deployment/);
assert.match(markdown, /News UK Nucleus Panel human-companion control/);
assert.match(markdown, /YouGov Parallax hybrid-architecture control/);
assert.match(markdown, /Twineo and OriginalVoices participant representation-custody control/);
assert.match(markdown, /Complete matched executions: 0/);
assert.match(markdown, /Operational human overrides: 0/);
assert.match(markdown, /Binding public-authority cases: 0/);

const prohibitedHeading = '## Prohibited inferences';
const prohibitedIndex = markdown.indexOf(prohibitedHeading);
assert.ok(prohibitedIndex >= 0, 'rendered standing matrix must preserve the prohibited-inference ledger');
const publicationSurface = markdown.slice(0, prohibitedIndex);
assert.doesNotMatch(publicationSurface, /best product|most mature|market leader|public authority confirmed|manipulated the public/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validateStandingMatrixManifest(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(manifest);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validateStandingMatrixManifest(thesisLeak).some(error => /counts_toward_thesis_evidence/.test(error)));

const missingSource = structuredClone(manifest);
missingSource.source_cases.pop();
assert.ok(validateStandingMatrixManifest(missingSource).some(error => /exactly the four required source cases/.test(error)));

const duplicatedDimension = structuredClone(manifest);
duplicatedDimension.axes.find(axis => axis.axis_id === 'decision_authority').dimensions.push('participant_reward_path_confirmed');
assert.ok(validateStandingMatrixManifest(duplicatedDimension).some(error => /dimensions must belong to exactly one axis/.test(error)));

const rankingLeak = structuredClone(manifest);
rankingLeak.boundaries.matrix_is_product_ranking = true;
assert.ok(validateStandingMatrixManifest(rankingLeak).some(error => /matrix_is_product_quality_ranking|matrix_is_product_ranking/.test(error)));

const expectedCountLeak = structuredClone(manifest);
expectedCountLeak.expected_matrix_counts.dimension_true_counts.individual_real_person_mapping_confirmed = 3;
assert.ok(validateStandingMatrixManifest(expectedCountLeak).some(error => /expected true count mismatch for individual_real_person_mapping_confirmed/.test(error)));

const statusLeak = structuredClone(compiledSources);
statusLeak['twineo-originalvoices-representation-custody-v1'].status = 'collective_public_authority_confirmed';
assert.throws(
  () => compileStandingMatrix(manifest, statusLeak),
  /compiled status mismatch for twineo-originalvoices-representation-custody-v1/
);

const matchedStudyLeak = structuredClone(compiled);
matchedStudyLeak.dimension_true_counts.executed_matched_study_confirmed = 1;
matchedStudyLeak.cases_with_complete_matched_execution = 1;
assert.ok(validateStandingMatrixBuild(matchedStudyLeak).some(error => /true count mismatch for executed_matched_study_confirmed|zero complete matched executions/.test(error)));

const overrideLeak = structuredClone(compiled);
overrideLeak.cases_with_operational_human_override = 1;
assert.ok(validateStandingMatrixBuild(overrideLeak).some(error => /zero operational human overrides/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.cases_with_binding_public_authority = 1;
assert.ok(validateStandingMatrixBuild(authorityLeak).some(error => /zero binding public-authority cases/.test(error)));

const mappingCountLeak = structuredClone(compiled);
mappingCountLeak.dimension_true_counts.individual_real_person_mapping_confirmed = 3;
assert.ok(validateStandingMatrixBuild(mappingCountLeak).some(error => /true count mismatch for individual_real_person_mapping_confirmed/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[3].payload.dimensions.operational_human_override_consequence_confirmed = true;
assert.ok(validateStandingMatrixBuild(tamperedChain).some(error => /hash mismatch/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validateStandingMatrixManifest(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-standing-matrix.test.js: OK');
