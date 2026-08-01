import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { compilePreferenceRealCase } from '../tools/lib/preference-real-case.mjs';
import { compilePreferenceHumanCompanion } from '../tools/lib/preference-human-companion.mjs';
import { compilePreferenceHybridArchitecture } from '../tools/lib/preference-hybrid-architecture.mjs';
import {
  compileHumanValidationTopology,
  renderHumanValidationTopologyMarkdown,
  validateHumanValidationTopologyBuild,
  validateHumanValidationTopologyChain,
  validateHumanValidationTopologyManifest
} from '../tools/lib/preference-human-validation-topology.mjs';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const manifest = readJson('data/research/preference-custody/human-validation-topology.json');
assert.deepEqual(validateHumanValidationTopologyManifest(manifest), []);

const compiledSources = {
  'times-exploraition-public-admission-v1': compilePreferenceRealCase(
    readJson('data/research/preference-custody/real-cases/times-exploraition-admission.json')
  ),
  'newsuk-nucleus-human-companion-v1': compilePreferenceHumanCompanion(
    readJson('data/research/preference-custody/real-cases/newsuk-nucleus-human-companion.json')
  ),
  'yougov-parallax-hybrid-architecture-v1': compilePreferenceHybridArchitecture(
    readJson('data/research/preference-custody/real-cases/yougov-parallax-hybrid-architecture.json')
  )
};

const compiled = compileHumanValidationTopology(manifest, compiledSources);
assert.deepEqual(validateHumanValidationTopologyBuild(compiled), []);
assert.equal(compiled.topology_id, 'preference-human-validation-topology-v1');
assert.equal(compiled.status, 'human_validation_topology_compiled_public_frontier_hv03');
assert.equal(compiled.graph_effect, 'none');
assert.equal(compiled.counts_toward_thesis_evidence, false);
assert.equal(compiled.conclusion_generated, false);
assert.equal(compiled.real_world_evidence_state, 'bounded_comparative_control_surface');
assert.equal(compiled.source_case_count, 3);
assert.equal(compiled.current_public_frontier, 'HV-03');
assert.deepEqual(compiled.highest_state_counts, {
  'HV-00': 1,
  'HV-01': 1,
  'HV-02': 1,
  'HV-03': 0,
  'HV-04': 0,
  'HV-05': 0
});
assert.deepEqual(compiled.cumulative_state_coverage_counts, {
  'HV-00': 3,
  'HV-01': 2,
  'HV-02': 1,
  'HV-03': 0,
  'HV-04': 0,
  'HV-05': 0
});
assert.equal(compiled.matrix_true_counts.synthetic_surface_confirmed, 3);
assert.equal(compiled.matrix_true_counts.named_direct_human_surface_confirmed, 2);
assert.equal(compiled.matrix_true_counts.integrated_validation_route_confirmed, 1);
for (const dimension of [
  'matched_instruments_publicly_recovered',
  'executed_paired_study_publicly_recovered',
  'response_distributions_and_uncertainty_publicly_recovered',
  'disagreement_reconciliation_publicly_recovered',
  'human_override_consequence_publicly_recovered',
  'human_to_model_feedback_reuse_publicly_recovered',
  'subgroup_outcomes_and_burden_publicly_recovered',
  'binding_affected_public_authority_publicly_recovered',
  'deployment_specific_system_and_validation_lineage_publicly_recovered'
]) assert.equal(compiled.matrix_true_counts[dimension], 0, `${dimension} must remain unresolved across the current topology`);
assert.equal(compiled.complete_executed_matched_study_count, 0);
assert.equal(compiled.operational_human_override_count, 0);
assert.equal(compiled.binding_affected_public_authority_count, 0);

const rowsById = Object.fromEntries(compiled.rows.map(row => [row.case_id, row]));
assert.equal(rowsById['times-exploraition-public-admission-v1'].highest_public_evidence_state, 'HV-00');
assert.equal(rowsById['newsuk-nucleus-human-companion-v1'].highest_public_evidence_state, 'HV-01');
assert.equal(rowsById['yougov-parallax-hybrid-architecture-v1'].highest_public_evidence_state, 'HV-02');
assert.equal(rowsById['times-exploraition-public-admission-v1'].dimensions.named_direct_human_surface_confirmed, false);
assert.equal(rowsById['newsuk-nucleus-human-companion-v1'].dimensions.named_direct_human_surface_confirmed, true);
assert.equal(rowsById['newsuk-nucleus-human-companion-v1'].dimensions.integrated_validation_route_confirmed, false);
assert.equal(rowsById['yougov-parallax-hybrid-architecture-v1'].dimensions.integrated_validation_route_confirmed, true);
assert.deepEqual(validateHumanValidationTopologyChain(compiled.custody_chain), []);
assert.equal(compiled.custody_chain.at(-1).event_sha256, compiled.custody_chain_head_sha256);

const markdown = renderHumanValidationTopologyMarkdown(compiled);
assert.match(markdown, /Preference Custody human-validation topology v1/);
assert.match(markdown, /Current public frontier:\*\* HV-03/);
assert.match(markdown, /Times ExplorAItion bounded deployment admission/);
assert.match(markdown, /News UK Nucleus Panel human-companion negative control/);
assert.match(markdown, /YouGov Parallax hybrid-architecture positive control/);
assert.match(markdown, /Complete executed matched studies: 0/);
assert.match(markdown, /Operational human overrides: 0/);
assert.match(markdown, /Binding affected-public authority cases: 0/);

const prohibitedHeading = '## Prohibited inferences';
const prohibitedIndex = markdown.indexOf(prohibitedHeading);
assert.ok(prohibitedIndex >= 0, 'rendered topology must preserve the prohibited-inference ledger');
const publicationSurface = markdown.slice(0, prohibitedIndex);
assert.doesNotMatch(publicationSurface, /best product|market leader|all outputs validated|binding public authorization confirmed|manipulated the public/i);

const graphLeak = structuredClone(manifest);
graphLeak.graph_effect = 'asserted';
assert.ok(validateHumanValidationTopologyManifest(graphLeak).some(error => /graph_effect/.test(error)));

const thesisLeak = structuredClone(manifest);
thesisLeak.counts_toward_thesis_evidence = true;
assert.ok(validateHumanValidationTopologyManifest(thesisLeak).some(error => /counts_toward_thesis_evidence/.test(error)));

const missingSource = structuredClone(manifest);
missingSource.source_cases.pop();
assert.ok(validateHumanValidationTopologyManifest(missingSource).some(error => /exactly the three required source cases/.test(error)));

const rankingLeak = structuredClone(manifest);
rankingLeak.boundaries.topology_is_product_quality_ranking = true;
assert.ok(validateHumanValidationTopologyManifest(rankingLeak).some(error => /topology_is_product_quality_ranking/.test(error)));

const frontierLeak = structuredClone(manifest);
frontierLeak.expected_topology.current_public_frontier = 'HV-04';
assert.ok(validateHumanValidationTopologyManifest(frontierLeak).some(error => /public frontier must remain HV-03/.test(error)));

const sourceStatusLeak = structuredClone(compiledSources);
sourceStatusLeak['yougov-parallax-hybrid-architecture-v1'].status = 'fully_executed_matched_study';
assert.throws(
  () => compileHumanValidationTopology(manifest, sourceStatusLeak),
  /compiled status mismatch for yougov-parallax-hybrid-architecture-v1/
);

const executedStudyLeak = structuredClone(compiled);
executedStudyLeak.complete_executed_matched_study_count = 1;
assert.ok(validateHumanValidationTopologyBuild(executedStudyLeak).some(error => /zero complete executed matched studies/.test(error)));

const overrideLeak = structuredClone(compiled);
overrideLeak.operational_human_override_count = 1;
assert.ok(validateHumanValidationTopologyBuild(overrideLeak).some(error => /zero operational human overrides/.test(error)));

const authorityLeak = structuredClone(compiled);
authorityLeak.binding_affected_public_authority_count = 1;
assert.ok(validateHumanValidationTopologyBuild(authorityLeak).some(error => /zero binding affected-public authority cases/.test(error)));

const integratedLeak = structuredClone(compiled);
integratedLeak.matrix_true_counts.integrated_validation_route_confirmed = 2;
assert.ok(validateHumanValidationTopologyBuild(integratedLeak).some(error => /exactly one topology row must confirm an integrated validation route/.test(error)));

const tamperedChain = structuredClone(compiled);
tamperedChain.custody_chain[2].payload.highest_public_evidence_state = 'HV-03';
assert.ok(validateHumanValidationTopologyBuild(tamperedChain).some(error => /hash mismatch/.test(error)));

const strippedCaveat = structuredClone(manifest);
delete strippedCaveat.interpretation_contract.copy_ready_caveat;
assert.ok(validateHumanValidationTopologyManifest(strippedCaveat).some(error => /interpretation contract is incomplete/.test(error)));

console.log('preference-human-validation-topology.test.js: OK');
