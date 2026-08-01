import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compileMatchedStudyFixture,
  renderMatchedStudyMarkdown,
  validateMatchedStudyBuild,
  validateMatchedStudyChain,
  validateMatchedStudyFixture
} from '../tools/lib/preference-matched-study-admission.mjs';

const fixture = JSON.parse(readFileSync('data/research/preference-custody/matched-study-admission/fixture.json', 'utf8'));
assert.deepEqual(validateMatchedStudyFixture(fixture), []);

const compiled = compileMatchedStudyFixture(fixture);
assert.deepEqual(validateMatchedStudyBuild(compiled), []);
assert.equal(compiled.contract_id, 'matched-synthetic-human-study-admission-v1');
assert.equal(compiled.status, 'matched_study_admission_laboratory_qualified');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'none_laboratory_only');
assert.equal(compiled.study_count, 13);
assert.deepEqual(compiled.state_counts, {
  architecture_or_capability_only: 1,
  bounded_matched_execution_missing_noncritical_context: 2,
  complete_matched_execution: 1,
  confidential_or_source_restricted: 1,
  contradicted_or_failed_reconciliation: 2,
  inadmissible: 1,
  negative_control_no_matched_study: 1,
  partial_noncomparable_execution: 4
});
assert.equal(compiled.comparison_complete_count, 5);
assert.equal(compiled.complete_positive_admission_count, 1);
assert.equal(compiled.negative_validation_or_reconciliation_count, 2);
assert.equal(compiled.operational_human_override_receipt_count, 1);
assert.equal(compiled.binding_public_authority_count, 0);
assert.equal(compiled.human_to_model_feedback_update_count, 0);

const studies = Object.fromEntries(compiled.studies.map(study => [study.study_id, study]));
assert.equal(studies['MS-01-COMPLETE-POSITIVE'].admission_state, 'complete_matched_execution');
assert.equal(studies['MS-01-COMPLETE-POSITIVE'].validation_outcome, 'bounded_positive_agreement');
assert.ok(Math.abs(studies['MS-01-COMPLETE-POSITIVE'].comparison.discrepancy - 0.01) < 1e-12);
assert.equal(studies['MS-01-COMPLETE-POSITIVE'].critical_comparability_complete, true);
assert.equal(studies['MS-01-COMPLETE-POSITIVE'].critical_execution_complete, true);
assert.equal(studies['MS-01-COMPLETE-POSITIVE'].critical_governance_complete, true);
assert.equal(studies['MS-01-COMPLETE-POSITIVE'].bounded_context_complete, true);

assert.equal(studies['MS-02-BOUNDED-REMEDY'].admission_state, 'bounded_matched_execution_missing_noncritical_context');
assert.equal(studies['MS-02-BOUNDED-REMEDY'].field_status.participant_remedy, false);
assert.equal(studies['MS-02-BOUNDED-REMEDY'].critical_comparability_complete, true);

assert.equal(studies['MS-03-INSTRUMENT-MISMATCH'].validation_outcome, 'instrument_noncomparable');
assert.equal(studies['MS-03-INSTRUMENT-MISMATCH'].field_status.instrument_match, false);
assert.ok(Math.abs(studies['MS-03-INSTRUMENT-MISMATCH'].comparison.discrepancy) < 1e-12);

assert.equal(studies['MS-04-POPULATION-MISMATCH'].validation_outcome, 'population_noncomparable');
assert.equal(studies['MS-04-POPULATION-MISMATCH'].field_status.population_match, false);

assert.equal(studies['MS-05-MISSING-UNCERTAINTY'].validation_outcome, 'result_context_incomplete');
assert.equal(studies['MS-05-MISSING-UNCERTAINTY'].field_status.uncertainty, false);
assert.equal(studies['MS-05-MISSING-UNCERTAINTY'].field_status.missingness, false);
assert.equal(studies['MS-05-MISSING-UNCERTAINTY'].field_status.subgroup_slices, false);

assert.equal(studies['MS-06-UNRECEIPTED-DISPOSITION'].admission_state, 'bounded_matched_execution_missing_noncritical_context');
assert.equal(studies['MS-06-UNRECEIPTED-DISPOSITION'].field_status.decision_receipt, false);
assert.equal(studies['MS-06-UNRECEIPTED-DISPOSITION'].critical_execution_complete, true);

assert.equal(studies['MS-07-HUMAN-BLOCK'].admission_state, 'contradicted_or_failed_reconciliation');
assert.equal(studies['MS-07-HUMAN-BLOCK'].validation_outcome, 'synthetic_contradicted_human_evidence_blocked_recommendation');
assert.ok(Math.abs(studies['MS-07-HUMAN-BLOCK'].comparison.discrepancy - 0.35) < 1e-12);
assert.equal(studies['MS-07-HUMAN-BLOCK'].comparison.threshold_exceeded, true);
assert.equal(studies['MS-07-HUMAN-BLOCK'].operational_human_override_supported, true);

assert.equal(studies['MS-08-STALE-LINEAGE'].validation_outcome, 'validation_lineage_not_current');
assert.equal(studies['MS-08-STALE-LINEAGE'].field_status.system_lineage, false);
assert.equal(studies['MS-08-STALE-LINEAGE'].critical_comparability_complete, true);
assert.equal(studies['MS-08-STALE-LINEAGE'].critical_execution_complete, false);

assert.equal(studies['MS-09-ARCHITECTURE-ONLY'].admission_state, 'architecture_or_capability_only');
assert.equal(studies['MS-09-ARCHITECTURE-ONLY'].validation_outcome, 'not_executed');
assert.equal(studies['MS-10-SOURCE-RESTRICTED'].admission_state, 'confidential_or_source_restricted');
assert.equal(studies['MS-10-SOURCE-RESTRICTED'].validation_outcome, 'source_restricted');
assert.equal(studies['MS-11-NEGATIVE-NO-STUDY'].admission_state, 'negative_control_no_matched_study');
assert.equal(studies['MS-11-NEGATIVE-NO-STUDY'].validation_outcome, 'explicit_no_matched_study');
assert.equal(studies['MS-12-INADMISSIBLE'].admission_state, 'inadmissible');
assert.equal(studies['MS-12-INADMISSIBLE'].validation_outcome, 'inadmissible_source_packet');
assert.equal(studies['MS-13-NO-PREDECLARED-RULE'].validation_outcome, 'material_discrepancy_without_predeclared_reconciliation');
assert.ok(Math.abs(studies['MS-13-NO-PREDECLARED-RULE'].comparison.discrepancy - 0.15) < 1e-12);
assert.equal(studies['MS-13-NO-PREDECLARED-RULE'].field_status.predeclared_threshold, false);
assert.equal(studies['MS-13-NO-PREDECLARED-RULE'].field_status.reconciliation_rule, false);

for (const study of compiled.studies) {
  assert.deepEqual(validateMatchedStudyChain(study.custody_chain), []);
  assert.equal(study.custody_chain.at(-1).event_sha256, study.custody_chain_head_sha256);
  assert.equal(study.binding_public_authority_supported, false);
  assert.equal(study.human_to_model_feedback_update_supported, false);
  assert.equal(study.field_counts.present + study.field_counts.missing, study.field_counts.total);
}

const markdown = renderMatchedStudyMarkdown(compiled);
assert.match(markdown, /Matched synthetic-human study admission laboratory v1/);
assert.match(markdown, /Complete positive admissions: 1/);
assert.match(markdown, /Operational human override receipts: 1/);
assert.match(markdown, /Binding public-authority packets: 0/);
assert.match(markdown, /MS-07-HUMAN-BLOCK/);
assert.match(markdown, /synthetic_contradicted_human_evidence_blocked_recommendation/);
assert.match(markdown, /MS-13-NO-PREDECLARED-RULE/);
assert.match(markdown, /material_discrepancy_without_predeclared_reconciliation/);

const prohibitedHeading = '## Prohibited inferences';
const prohibitedIndex = markdown.indexOf(prohibitedHeading);
assert.ok(prohibitedIndex >= 0, 'rendered admission laboratory must preserve prohibited inferences');
const publicationSurface = markdown.slice(0, prohibitedIndex);
assert.doesNotMatch(publicationSurface, /Electric Twin completed|YouGov completed|universal model validity|binding public authorization confirmed|manipulated the public/i);

const graphLeak = structuredClone(fixture);
graphLeak.graph_effect = 'asserted';
assert.ok(validateMatchedStudyFixture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(fixture);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validateMatchedStudyFixture(thesisLeak).some(error => /counts_toward_thesis_evidence/.test(error)));

const missingStudy = structuredClone(fixture);
missingStudy.studies.pop();
assert.ok(validateMatchedStudyFixture(missingStudy).some(error => /exactly the 13 required studies/.test(error)));

const stateCountLeak = structuredClone(fixture);
stateCountLeak.studies.find(study => study.study_id === 'MS-02-BOUNDED-REMEDY').expected_admission_state = 'complete_matched_execution';
assert.ok(validateMatchedStudyFixture(stateCountLeak).some(error => /declared expected state count mismatch/.test(error)));

const instrumentPromotion = structuredClone(fixture);
const instrumentStudy = instrumentPromotion.studies.find(study => study.study_id === 'MS-03-INSTRUMENT-MISMATCH');
instrumentStudy.instrument.human_question_id = instrumentStudy.instrument.synthetic_question_id;
instrumentStudy.instrument.same_wording = true;
instrumentStudy.instrument.same_options = true;
instrumentStudy.instrument.same_order = true;
instrumentStudy.instrument.human_hash = instrumentStudy.instrument.synthetic_hash;
assert.throws(
  () => compileMatchedStudyFixture(instrumentPromotion),
  /MS-03-INSTRUMENT-MISMATCH admission mismatch/
);

const publicAuthorityLeak = structuredClone(fixture);
const publicStudy = publicAuthorityLeak.studies.find(study => study.study_id === 'MS-01-COMPLETE-POSITIVE');
publicStudy.public_authority = { binding: true, objective_control: true, appeal_and_remedy: true };
const publicAuthorityBuild = compileMatchedStudyFixture(publicAuthorityLeak);
assert.ok(validateMatchedStudyBuild(publicAuthorityBuild).some(error => /must not support binding public authority/.test(error)));

const feedbackLeak = structuredClone(fixture);
const feedbackStudy = feedbackLeak.studies.find(study => study.study_id === 'MS-01-COMPLETE-POSITIVE');
feedbackStudy.feedback_reuse = { state: 'model_updated_from_human_result', version_update_id: 'model-v2' };
const feedbackBuild = compileMatchedStudyFixture(feedbackLeak);
assert.ok(validateMatchedStudyBuild(feedbackBuild).some(error => /must not support a human-to-model update/.test(error)));

const humanBlockLeak = structuredClone(fixture);
const blockStudy = humanBlockLeak.studies.find(study => study.study_id === 'MS-07-HUMAN-BLOCK');
blockStudy.decision.human_override_triggered = false;
blockStudy.decision.implementation_state = 'institutionally_approved';
const humanBlockBuild = compileMatchedStudyFixture(humanBlockLeak);
assert.ok(validateMatchedStudyBuild(humanBlockBuild).some(error => /MS-07 must preserve the human-block negative outcome|MS-07 must preserve one operational human override receipt/.test(error)));

const noRuleLeak = structuredClone(fixture);
const noRuleStudy = noRuleLeak.studies.find(study => study.study_id === 'MS-13-NO-PREDECLARED-RULE');
noRuleStudy.comparison.threshold_predeclared = true;
noRuleStudy.reconciliation.predeclared = true;
const noRuleBuild = compileMatchedStudyFixture(noRuleLeak);
assert.ok(validateMatchedStudyBuild(noRuleBuild).some(error => /MS-13 must preserve failed reconciliation/.test(error)));

const confidentialInflation = structuredClone(fixture);
const confidentialStudy = confidentialInflation.studies.find(study => study.study_id === 'MS-10-SOURCE-RESTRICTED');
confidentialStudy.expected_admission_state = 'complete_matched_execution';
assert.throws(
  () => compileMatchedStudyFixture(confidentialInflation),
  /MS-10-SOURCE-RESTRICTED admission mismatch/
);

const tamperedBuild = structuredClone(compiled);
tamperedBuild.studies.find(study => study.study_id === 'MS-01-COMPLETE-POSITIVE').custody_chain[4].payload.computed_comparison.discrepancy = 0.2;
assert.ok(validateMatchedStudyBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const countInflation = structuredClone(compiled);
countInflation.complete_positive_admission_count = 2;
assert.ok(validateMatchedStudyBuild(countInflation).some(error => /complete_positive_admission_count must remain 1/.test(error)));

const strippedCaveat = structuredClone(fixture);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validateMatchedStudyFixture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-matched-study-admission.test.js: OK');
