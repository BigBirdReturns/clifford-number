import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  compilePreferenceHybridArchitecture,
  renderPreferenceHybridArchitectureMarkdown,
  validateHybridArchitectureChain,
  validatePreferenceHybridArchitecture,
  validatePreferenceHybridArchitectureBuild
} from '../tools/lib/preference-hybrid-architecture.mjs';

const packet = JSON.parse(readFileSync('data/research/preference-custody/real-cases/yougov-parallax-hybrid-architecture.json', 'utf8'));
assert.deepEqual(validatePreferenceHybridArchitecture(packet), []);

const compiled = compilePreferenceHybridArchitecture(packet);
assert.deepEqual(validatePreferenceHybridArchitectureBuild(compiled), []);
assert.equal(compiled.case_id, 'yougov-parallax-hybrid-architecture-v1');
assert.equal(compiled.status, 'hybrid_architecture_confirmed_matched_execution_unresolved');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'bounded_public_product_architecture');
assert.equal(compiled.receipt_count, 3);
assert.deepEqual(compiled.receipt_source_class_counts, {
  independent_professional_reporting: 1,
  provider_primary_public: 2
});
assert.equal(compiled.control_relation_count, 5);
assert.deepEqual(compiled.control_relation_state_counts, {
  architecture_partial: 1,
  architecture_positive_execution_unresolved: 2,
  capability_positive_execution_unresolved: 1,
  not_established: 1
});
assert.equal(compiled.classification_verdict.integrated_hybrid_product_architecture_confirmed, true);
assert.equal(compiled.classification_verdict.live_human_validation_capability_confirmed, true);
assert.equal(compiled.classification_verdict.method_verification_and_finding_validation_separated, true);
assert.equal(compiled.classification_verdict.public_demo_automatically_validated, false);
assert.equal(compiled.classification_verdict.every_enterprise_result_necessarily_validated, false);
assert.equal(compiled.classification_verdict.one_executed_matched_study_fully_reproduced, false);
assert.equal(compiled.classification_verdict.human_override_supported, false);
assert.equal(compiled.classification_verdict.binding_public_authority_supported, false);
assert.equal(compiled.classification_verdict.tracking_replacement_supported, false);
assert.equal(compiled.classification_verdict.independent_performance_superiority_established, false);
assert.deepEqual(validateHybridArchitectureChain(compiled.custody_chain), []);
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);

const markdown = renderPreferenceHybridArchitectureMarkdown(compiled);
assert.match(markdown, /YouGov Parallax hybrid-architecture positive control/);
assert.match(markdown, /Simulation layer confirmed: true/);
assert.match(markdown, /Human validation layer confirmed: true/);
assert.match(markdown, /Public demo automatically validated: false/);
assert.match(markdown, /Tracking studies replaced: false/);
assert.match(markdown, /PC-03/);
assert.match(markdown, /verification and finding-specific validation are explicitly separated/);

const prohibitedHeading = '## Prohibited inferences';
const prohibitedIndex = markdown.indexOf(prohibitedHeading);
assert.ok(prohibitedIndex >= 0, 'rendered hybrid packet must preserve the prohibited-inference ledger');
const publicationSurface = markdown.slice(0, prohibitedIndex);
const prohibitedSurface = markdown.slice(prohibitedIndex);
assert.doesNotMatch(publicationSurface, /every enterprise Parallax output receives live validation|public demo is validated by live people|binding public authorization|independent performance superiority/i);
assert.match(prohibitedSurface, /Do not infer that the public demo is validated by live people/);
assert.match(prohibitedSurface, /Do not infer that every enterprise Parallax output receives live validation/);

const graphLeak = structuredClone(packet);
graphLeak.graph_effect = 'asserted';
assert.ok(validatePreferenceHybridArchitecture(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(packet);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validatePreferenceHybridArchitecture(thesisLeak).some(error => /counts_toward_thesis_evidence/.test(error)));

const publicDemoLeak = structuredClone(packet);
publicDemoLeak.architecture.public_demo_automatically_validated = true;
assert.ok(validatePreferenceHybridArchitecture(publicDemoLeak).some(error => /public_demo_automatically_validated/.test(error)));

const trackingLeak = structuredClone(packet);
trackingLeak.architecture.tracking_studies_replaced = true;
assert.ok(validatePreferenceHybridArchitecture(trackingLeak).some(error => /tracking_studies_replaced/.test(error)));

const everyResultLeak = structuredClone(packet);
everyResultLeak.classification_verdict.every_enterprise_result_necessarily_validated = true;
assert.ok(validatePreferenceHybridArchitecture(everyResultLeak).some(error => /every_enterprise_result_necessarily_validated/.test(error)));

const executedStudyLeak = structuredClone(packet);
executedStudyLeak.classification_verdict.one_executed_matched_study_fully_reproduced = true;
assert.ok(validatePreferenceHybridArchitecture(executedStudyLeak).some(error => /one_executed_matched_study_fully_reproduced/.test(error)));

const authorityLeak = structuredClone(packet);
authorityLeak.classification_verdict.binding_public_authority_supported = true;
assert.ok(validatePreferenceHybridArchitecture(authorityLeak).some(error => /binding_public_authority_supported/.test(error)));

const superiorityLeak = structuredClone(packet);
superiorityLeak.classification_verdict.independent_performance_superiority_established = true;
assert.ok(validatePreferenceHybridArchitecture(superiorityLeak).some(error => /independent_performance_superiority_established/.test(error)));

const missingIndependent = structuredClone(packet);
missingIndependent.receipts = missingIndependent.receipts.filter(receipt => receipt.source_class !== 'independent_professional_reporting');
assert.ok(validatePreferenceHybridArchitecture(missingIndependent).some(error => /missing hybrid receipt source class independent_professional_reporting/.test(error)));

const missingRelation = structuredClone(packet);
missingRelation.control_relations.pop();
assert.ok(validatePreferenceHybridArchitecture(missingRelation).some(error => /exactly PC-01, PC-03, PC-05, PC-06, and PC-09/.test(error)));

const missingValidationOption = structuredClone(packet);
missingValidationOption.architecture.validation_population_options = ['fresh general-population sample'];
assert.ok(validatePreferenceHybridArchitecture(missingValidationOption).some(error => /validation population options are incomplete/.test(error)));

const tamperedBuild = structuredClone(compiled);
tamperedBuild.custody_chain[2].payload.validation_scope_options.pop();
assert.ok(validatePreferenceHybridArchitectureBuild(tamperedBuild).some(error => /hash mismatch/.test(error)));

const strippedCaveat = structuredClone(packet);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validatePreferenceHybridArchitecture(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-hybrid-architecture.test.js: OK');
