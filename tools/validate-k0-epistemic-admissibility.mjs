#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeK0ReleaseManifest } from './build-k0-epistemic-admissibility.mjs';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const allowedSpecies = new Set(['comprehension_failure','status_protective_reclassification','designed_comprehension_ceiling','strategic_bypass','mixed']);
const requiredPath = ['governing_claim','qualified_contradiction','knower_reclassification','explanation_mutation','institutional_gate_action','material_consequence','feedback_source_removed','correction_substitution_or_exit_blocked'];
const documented = status => status === 'documented';
const computeChainDepth = event => {
  let depth = -1;
  for (let i = 0; i < requiredPath.length; i++) {
    if (!documented(event.path?.[requiredPath[i]]?.status)) break;
    depth = i;
  }
  return Math.max(depth, 0);
};
const computeFurthest = event => {
  let depth = 0;
  for (let i = 0; i < requiredPath.length; i++) if (documented(event.path?.[requiredPath[i]]?.status)) depth = i;
  return depth;
};

export function validateK0({
  root = defaultRoot,
  seedPath = 'data/intake/k0-ceiling-conversion-seed-events.json',
  wiringPath = 'data/project/k0-existing-ecosystem-wiring.json',
  sourceAuditPath = 'data/research/k0-source-custody-audit.json',
  fieldAuditPath = 'data/research/k0-field-audit.json'
} = {}) {
  const failures = [];
  const read = rel => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
  const fail = message => failures.push(message);
  const method = read('data/project/k0-epistemic-admissibility-methodology.json');
  const seeds = read(seedPath);
  const wiring = read(wiringPath);
  const sourceAudit = read(sourceAuditPath);
  const fieldAudit = read(fieldAuditPath);
  const neutral = read('data/research/k0-role-neutral-denominator.json');
  const neutralWave01 = read('data/research/k0-role-neutral-wave-01.json');
  const neutralWave02 = read('data/research/k0-role-neutral-wave-02.json');
  const neutralWave03 = read('data/research/k0-role-neutral-wave-03.json');
  const neutralWave04 = read('data/research/k0-role-neutral-wave-04.json');
  const neutralWave05 = read('data/research/k0-role-neutral-wave-05.json');
  const neutralWave06 = read('data/research/k0-role-neutral-wave-06.json');
  const neutralWave07 = read('data/research/k0-role-neutral-wave-07.json');
  const neutralWave08 = read('data/research/k0-role-neutral-wave-08.json');
  const wave04Field = read('data/research/k0-wave04-field-adjudication.json');
  const wave05Field = read('data/research/k0-wave05-field-adjudication.json');
  const wave06Field = read('data/research/k0-wave06-field-adjudication.json');
  const wave07Field = read('data/research/k0-wave07-field-adjudication.json');
  const registry = read('data/project/m05-answerable-power-story-registry.json');
  const fanout = read('data/project/m05-answerable-power-fanout.json');
  const selection = read('data/canonical/corpus-selection.json');
  const coverage = read('data/research/corpus-coverage.json');
  const reviews = read('data/research/selection-adversarial-reviews.json');
  const manifest = read('data/project/k0-epistemic-admissibility-release-manifest.json');
  const report = read('reports/core-thesis/answerable-power/k0.json');

  if (method.schema_version !== 'k0-epistemic-admissibility-methodology@2' || method.layer_id !== 'K0') fail('method identity drift');
  if (method.core_path.length !== 8 || method.ceiling_conversion_depth.length !== 8) fail('K0 path or CCD denominator drift');
  if (method.ccd_semantics?.cumulative !== true || method.ccd_semantics?.satisfying_statuses?.join(',') !== 'documented') fail('CCD cumulative law drift');
  if (method.failure_species.length !== 5 || new Set(method.failure_species).size !== 5) fail('failure species denominator drift');
  if (method.boundaries.graph_effect !== 'none' || method.boundaries.project_complete !== false) fail('method boundary drift');
  if (method.boundaries.maintainer_review_is_independent_second_party_review !== false) fail('maintainer independence boundary drift');
  if (JSON.stringify(method.selection_contract?.execution_wave_ids) !== JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04','K0-W05','K0-W06','K0-W07','K0-W08'])) fail('method execution-wave drift');
  if (JSON.stringify(method.selection_contract?.query_templates_executed) !== JSON.stringify(['K0-Q01','K0-Q03','K0-Q04','K0-Q06','K0-Q08','K0-Q05','K0-Q07','K0-Q09','K0-Q02'])) fail('method query-template execution drift');
  if (sha256(fs.readFileSync(path.join(root, method.source_path))) !== method.source_sha256) fail('source exact-byte hash drift');

  if (sourceAudit.schema_version !== 'k0-source-custody-audit@1' || sourceAudit.rows.length !== 25) fail('source audit denominator drift');
  if (sourceAudit.directly_retrieved !== 23 || sourceAudit.source_restricted !== 2 || sourceAudit.exact_content_hashes_captured !== 0) fail('source audit count drift');
  if (sourceAudit.independence_effect !== 'does_not_satisfy_second_party_review') fail('source audit independence laundering');
  const sourceIds = new Set();
  for (const row of sourceAudit.rows) {
    if (!row.source_id || sourceIds.has(row.source_id)) fail(`duplicate source audit row ${row.source_id}`);
    sourceIds.add(row.source_id);
    if (row.graph_effect !== 'none' || row.claim_truth_determined !== false || row.independent_review_complete !== false) fail(`${row.source_id}: source audit boundary drift`);
    if (row.direct_source_available === false && (!Array.isArray(row.substitute_sources) || row.substitute_sources.length < 1)) fail(`${row.source_id}: restricted source lacks substitute`);
    if (row.exact_content_sha256 !== null || row.hash_status !== 'not_captured_in_maintainer_web_audit') fail(`${row.source_id}: remote hash custody laundering`);
  }

  if (fieldAudit.schema_version !== 'k0-field-audit@1' || fieldAudit.rows.length !== 13) fail('field audit denominator drift');
  if (fieldAudit.disposition_counts.supported_for_human_review !== 6 || fieldAudit.disposition_counts.retained_candidate_only !== 7) fail('field disposition count drift');
  if (fieldAudit.role_changes !== 1 || fieldAudit.ccd_depth_changes !== 6) fail('field correction count drift');
  if (fieldAudit.independence_effect !== 'does_not_satisfy_second_party_review') fail('field audit independence laundering');
  const fieldByEvent = new Map(fieldAudit.rows.map(row => [row.event_id, row]));
  if (fieldByEvent.size !== 13) fail('duplicate field audit event');

  if (seeds.schema_version !== 'k0-ceiling-conversion-seed-events@2') fail('seed schema drift');
  if (seeds.seed_people_count !== 10 || seeds.events.length !== 13) fail('seed denominator drift');
  if (seeds.source_reference_count !== 25) fail('source reference denominator drift');
  const ids = new Set();
  const people = new Set();
  for (const event of seeds.events) {
    if (!event.event_id || ids.has(event.event_id)) fail(`duplicate or missing event id ${event.event_id}`);
    ids.add(event.event_id); people.add(event.seed_person);
    if (event.graph_effect !== 'none' || event.network_edge_created !== false) fail(`${event.event_id}: graph boundary drift`);
    if (event.evidence_truth_determined !== false || event.receipt_audit_complete !== false || event.independent_review_complete !== false) fail(`${event.event_id}: evidence truth laundering`);
    if (event.maintainer_source_audit_complete !== true) fail(`${event.event_id}: maintainer audit state missing`);
    if (event.publication_status !== 'blocked_pending_receipt_audit_and_second_party_selection_review') fail(`${event.event_id}: publication boundary drift`);
    const expectedChain = computeChainDepth(event);
    const expectedFurthest = computeFurthest(event);
    if (event.ccd_chain_depth !== expectedChain || event.ccd_depth !== expectedChain) fail(`${event.event_id}: CCD chain mismatch expected ${expectedChain}`);
    if (event.furthest_documented_stage !== expectedFurthest) fail(`${event.event_id}: furthest documented stage mismatch expected ${expectedFurthest}`);
    if (event.ccd_chain_depth > event.furthest_documented_stage) fail(`${event.event_id}: CCD exceeds furthest documented stage`);
    if (!Array.isArray(event.counterevidence) || event.counterevidence.length < 1) fail(`${event.event_id}: counterevidence missing`);
    if (!Array.isArray(event.alternative_explanations) || event.alternative_explanations.length < 1) fail(`${event.event_id}: alternative explanations missing`);
    if (!Array.isArray(event.sources) || event.sources.length < 2) fail(`${event.event_id}: sources missing`);
    for (const species of event.failure_species || []) if (!allowedSpecies.has(species)) fail(`${event.event_id}: unknown failure species ${species}`);
    for (const key of requiredPath) if (!event.path?.[key]?.status || !event.path?.[key]?.summary) fail(`${event.event_id}: missing path stage ${key}`);
    const audit = fieldByEvent.get(event.event_id);
    if (!audit || event.field_audit_disposition !== audit.disposition || event.audit_record_id !== fieldAudit.audit_id) fail(`${event.event_id}: field audit linkage drift`);
    if (event.corpus_role !== audit.audited_corpus_role || event.ccd_chain_depth !== audit.ccd_chain_depth || event.furthest_documented_stage !== audit.furthest_documented_stage) fail(`${event.event_id}: audited field drift`);
  }
  if (people.size !== 10) fail(`expected 10 seed people, got ${people.size}`);
  if (seeds.events.find(row => row.event_id === 'K0-SEED-012')?.corpus_role !== 'seed_boundary_fixture') fail('JAG boundary demotion drift');
  if (seeds.events.find(row => row.event_id === 'K0-SEED-013')?.ccd_chain_depth !== 5) fail('strategic-bypass CCD drift');

  if (neutral.schema_version !== 'k0-role-neutral-denominator@1' || neutral.gate_strata.length !== 9 || neutral.synthetic_controls.length !== 8 || neutral.search_battery.length !== 9) fail('neutral denominator drift');
  if (neutral.status !== 'execution_started_wave_08_discovery_complete_field_adjudication_pending' || neutral.execution.name_blind_execution_started !== true || neutral.execution.searches_executed !== 52 || neutral.execution.query_templates_executed !== 9 || neutral.execution.raw_results_observed !== 302 || neutral.execution.returned_records !== 66 || neutral.execution.included_events !== 0) fail('neutral execution state drift');
  if (neutral.execution.candidate_records !== 28 || neutral.execution.positive_controls !== 15 || neutral.execution.negative_controls !== 12 || neutral.execution.coverage_controls !== 8 || neutral.execution.requires_additional_acquisition !== 3 || neutral.execution.resolved_additional_acquisition !== 2 || neutral.execution.open_additional_acquisition !== 1 || neutral.execution.non_events !== 35) fail('neutral execution classification drift');
  if (JSON.stringify(neutral.execution.executed_wave_ids) !== JSON.stringify(['K0-W01','K0-W02','K0-W03','K0-W04','K0-W05','K0-W06','K0-W07','K0-W08']) || neutral.execution.independent_second_party_review_complete !== false) fail('neutral wave/independence drift');
  if (neutralWave01.schema_version !== 'k0-role-neutral-wave@1' || neutralWave01.wave_id !== 'K0-W01' || neutralWave01.records.length !== 10 || neutralWave01.excluded_results.length !== 8) fail('neutral wave-01 denominator drift');
  if (neutralWave01.counts.query_executions !== 4 || neutralWave01.counts.raw_results_observed !== 18 || neutralWave01.counts.candidate_requires_field_audit !== 5 || neutralWave01.counts.included_events !== 0) fail('neutral wave-01 count drift');
  if (neutralWave01.boundaries.query_hit_is_event !== false || neutralWave01.boundaries.publication_cleared !== false || neutralWave01.boundaries.graph_effect !== 'none') fail('neutral wave-01 boundary drift');
  if (neutralWave02.schema_version !== 'k0-role-neutral-wave@1' || neutralWave02.wave_id !== 'K0-W02' || neutralWave02.records.length !== 7 || neutralWave02.excluded_results.length !== 8) fail('neutral wave-02 denominator drift');
  if (neutralWave02.counts.query_executions !== 4 || neutralWave02.counts.raw_results_observed !== 15 || neutralWave02.counts.candidate_requires_field_audit !== 3 || neutralWave02.counts.positive_controls !== 2 || neutralWave02.counts.coverage_controls !== 1 || neutralWave02.counts.requires_additional_acquisition !== 1 || neutralWave02.counts.included_events !== 0) fail('neutral wave-02 count drift');
  if (neutralWave02.boundaries.query_hit_is_event !== false || neutralWave02.boundaries.preliminary_finding_is_final !== false || neutralWave02.boundaries.corrective_plan_proves_effectiveness !== false || neutralWave02.boundaries.publication_cleared !== false || neutralWave02.boundaries.graph_effect !== 'none') fail('neutral wave-02 boundary drift');
  for (const row of neutralWave02.records) if (row.included_event !== false || row.ccd_chain_depth !== null || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: wave-02 promotion boundary drift`);
  if (neutralWave03.schema_version !== 'k0-role-neutral-wave@1' || neutralWave03.wave_id !== 'K0-W03' || neutralWave03.records.length !== 7 || neutralWave03.excluded_results.length !== 8) fail('neutral wave-03 denominator drift');
  if (neutralWave03.counts.query_executions !== 4 || neutralWave03.counts.raw_results_observed !== 15 || neutralWave03.counts.candidate_requires_field_audit !== 5 || neutralWave03.counts.negative_controls !== 1 || neutralWave03.counts.coverage_controls !== 1 || neutralWave03.counts.included_events !== 0) fail('neutral wave-03 count drift');
  if (neutralWave03.boundaries.query_hit_is_event !== false || neutralWave03.boundaries.accident_proves_warning_ignored !== false || neutralWave03.boundaries.material_consequence_proves_reclassification !== false || neutralWave03.boundaries.publication_cleared !== false || neutralWave03.boundaries.graph_effect !== 'none') fail('neutral wave-03 boundary drift');
  for (const row of neutralWave03.records) if (row.included_event !== false || row.ccd_chain_depth !== null || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: wave-03 promotion boundary drift`);
  if (neutralWave04.schema_version !== 'k0-role-neutral-wave@1' || neutralWave04.wave_id !== 'K0-W04' || neutralWave04.records.length !== 8 || neutralWave04.excluded_results.length !== 12) fail('neutral wave-04 denominator drift');
  if (neutralWave04.counts.query_executions !== 4 || neutralWave04.counts.raw_results_observed !== 20 || neutralWave04.counts.candidate_requires_field_audit !== 3 || neutralWave04.counts.positive_controls !== 2 || neutralWave04.counts.negative_controls !== 2 || neutralWave04.counts.coverage_controls !== 1 || neutralWave04.counts.included_events !== 0) fail('neutral wave-04 count drift');
  if (neutralWave04.boundaries.query_hit_is_event !== false || neutralWave04.boundaries.committee_reset_proves_capture !== false || neutralWave04.boundaries.conflict_claim_proves_member_specific_conflict !== false || neutralWave04.boundaries.seed_fixture_recovery_creates_second_event !== false || neutralWave04.boundaries.publication_cleared !== false || neutralWave04.boundaries.graph_effect !== 'none') fail('neutral wave-04 boundary drift');
  for (const row of neutralWave04.records) if (row.included_event !== false || row.ccd_chain_depth !== null || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: wave-04 promotion boundary drift`);
  if (wave04Field.schema_version !== 'k0-wave04-field-adjudication@1' || wave04Field.audit_id !== 'K0-W04-FIELD-2026-07-28-MAINTAINER' || wave04Field.rows.length !== 8) fail('Wave 04 field package drift');
  if (wave04Field.counts.stage_adjudicated_records !== 3 || wave04Field.counts.control_records_reviewed !== 5 || wave04Field.counts.supported_for_human_review !== 0 || wave04Field.counts.bounded_non_link !== 1 || wave04Field.counts.retained_candidate_only !== 2 || wave04Field.counts.included_events !== 0) fail('Wave 04 field count drift');
  for (const row of wave04Field.rows) if (row.included_event !== false || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: Wave 04 field promotion boundary drift`);
  const wave04Exclusion = wave04Field.rows.find(row => row.record_id === 'K0-W04-R004');
  if (wave04Exclusion?.candidate_disposition !== 'bounded_non_link' || wave04Exclusion?.provisional_ccd_chain_depth !== 0 || wave04Exclusion?.stage_assessments?.[1]?.status !== 'post_action_documented') fail('Wave 04 temporal/non-link drift');
  if (neutralWave05.schema_version !== 'k0-role-neutral-wave@1' || neutralWave05.wave_id !== 'K0-W05' || neutralWave05.records.length !== 8 || neutralWave05.excluded_results.length !== 10) fail('neutral wave-05 denominator drift');
  if (neutralWave05.counts.query_executions !== 4 || neutralWave05.counts.raw_results_observed !== 18 || neutralWave05.counts.candidate_requires_field_audit !== 2 || neutralWave05.counts.positive_controls !== 4 || neutralWave05.counts.negative_controls !== 1 || neutralWave05.counts.coverage_controls !== 1 || neutralWave05.counts.included_events !== 0) fail('neutral wave-05 count drift');
  if (neutralWave05.boundaries.query_hit_is_event !== false || neutralWave05.boundaries.retraction_proves_ceiling_conversion !== false || neutralWave05.boundaries.misconduct_finding_proves_epistemic_suppression !== false || neutralWave05.boundaries.later_vindication_proves_prior_knowledge !== false || neutralWave05.boundaries.publication_cleared !== false || neutralWave05.boundaries.graph_effect !== 'none') fail('neutral wave-05 boundary drift');
  for (const row of neutralWave05.records) if (row.included_event !== false || row.ccd_chain_depth !== null || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: wave-05 promotion boundary drift`);
  if (neutralWave06.schema_version !== 'k0-role-neutral-wave@1' || neutralWave06.wave_id !== 'K0-W06' || neutralWave06.records.length !== 8 || neutralWave06.excluded_results.length !== 33) fail('neutral wave-06 denominator drift');
  if (neutralWave06.counts.query_executions !== 8 || neutralWave06.counts.raw_results_observed !== 41 || neutralWave06.counts.candidate_requires_field_audit !== 3 || neutralWave06.counts.positive_controls !== 2 || neutralWave06.counts.negative_controls !== 2 || neutralWave06.counts.coverage_controls !== 1 || neutralWave06.counts.included_events !== 0) fail('neutral wave-06 count drift');
  if (neutralWave06.boundaries.query_hit_is_event !== false || neutralWave06.boundaries.professional_disagreement_proves_reclassification !== false || neutralWave06.boundaries.reprisal_finding_proves_complete_k0_chain !== false || neutralWave06.boundaries.lawful_discipline_is_ceiling_conversion !== false || neutralWave06.boundaries.stay_proves_final_merits !== false || neutralWave06.boundaries.publication_cleared !== false || neutralWave06.boundaries.graph_effect !== 'none') fail('neutral wave-06 boundary drift');
  for (const row of neutralWave06.records) if (row.included_event !== false || row.ccd_chain_depth !== null || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: wave-06 promotion boundary drift`);
  if (neutralWave07.schema_version !== 'k0-role-neutral-wave@1' || neutralWave07.wave_id !== 'K0-W07' || neutralWave07.records.length !== 9 || neutralWave07.excluded_result_summaries.length !== 16) fail('neutral wave-07 denominator drift');
  if (neutralWave07.counts.query_executions !== 16 || neutralWave07.counts.raw_results_observed !== 79 || neutralWave07.counts.candidate_requires_field_audit !== 3 || neutralWave07.counts.positive_controls !== 2 || neutralWave07.counts.negative_controls !== 2 || neutralWave07.counts.coverage_controls !== 2 || neutralWave07.counts.included_events !== 0) fail('neutral wave-07 count drift');
  if (neutralWave07.excluded_result_summaries.reduce((sum, row) => sum + row.excluded_after_deduplication, 0) !== 70) fail('neutral wave-07 exclusion count drift');
  if (neutralWave07.boundaries.query_hit_is_event !== false || neutralWave07.boundaries.blocked_action_proves_authorship_transfer !== false || neutralWave07.boundaries.accepted_resignation_proves_voluntary_departure !== false || neutralWave07.boundaries.constructive_discharge_finding_proves_complete_k0_chain !== false || neutralWave07.boundaries.ownership_decision_proves_comprehension_failure !== false || neutralWave07.boundaries.seed_overlap_creates_second_event !== false || neutralWave07.boundaries.genuine_resignation_is_ceiling_conversion !== false || neutralWave07.boundaries.graph_effect !== 'none') fail('neutral wave-07 boundary drift');
  for (const row of neutralWave07.records) if (row.included_event !== false || row.ccd_chain_depth !== null || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: wave-07 promotion boundary drift`);
  if (neutralWave08.schema_version !== 'k0-role-neutral-wave@1' || neutralWave08.wave_id !== 'K0-W08' || neutralWave08.records.length !== 9 || neutralWave08.excluded_result_summaries.length !== 8) fail('neutral wave-08 denominator drift');
  if (neutralWave08.counts.query_executions !== 8 || neutralWave08.counts.raw_results_observed !== 96 || neutralWave08.counts.candidate_requires_field_audit !== 4 || neutralWave08.counts.positive_controls !== 2 || neutralWave08.counts.negative_controls !== 2 || neutralWave08.counts.coverage_controls !== 1 || neutralWave08.counts.included_events !== 0) fail('neutral wave-08 count drift');
  if (neutralWave08.excluded_result_summaries.reduce((sum, row) => sum + row.excluded_after_deduplication, 0) !== 87) fail('neutral wave-08 exclusion count drift');
  for (const row of neutralWave08.records) if (row.included_event !== false || row.ccd_chain_depth !== null || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: wave-08 promotion boundary drift`);
  if (wave05Field.schema_version !== 'k0-wave05-field-adjudication@1' || wave05Field.audit_id !== 'K0-W05-FIELD-2026-07-28-MAINTAINER' || wave05Field.rows.length !== 8) fail('Wave 05 field package drift');
  if (wave05Field.counts.stage_adjudicated_records !== 2 || wave05Field.counts.control_records_reviewed !== 6 || wave05Field.counts.supported_for_human_review !== 1 || wave05Field.counts.retained_candidate_only !== 1 || wave05Field.counts.included_events !== 0) fail('Wave 05 field count drift');
  for (const row of wave05Field.rows) if (row.included_event !== false || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: Wave 05 field promotion boundary drift`);
  const wave05Karolinska = wave05Field.rows.find(row => row.record_id === 'K0-W05-R001');
  const wave05Olivieri = wave05Field.rows.find(row => row.record_id === 'K0-W05-R002');
  if (wave05Karolinska?.candidate_disposition !== 'retained_candidate_only' || wave05Karolinska?.provisional_ccd_chain_depth !== 1 || wave05Karolinska?.stage_assessments?.[2]?.status !== 'not_established') fail('Wave 05 Karolinska boundary drift');
  if (wave05Olivieri?.candidate_disposition !== 'supported_for_human_review' || wave05Olivieri?.provisional_ccd_chain_depth !== 6 || wave05Olivieri?.stage_assessments?.[7]?.status !== 'partial') fail('Wave 05 Olivieri boundary drift');
  if (wave06Field.schema_version !== 'k0-wave06-field-adjudication@1' || wave06Field.audit_id !== 'K0-W06-FIELD-2026-07-29-MAINTAINER' || wave06Field.rows.length !== 8) fail('Wave 06 field package drift');
  if (wave06Field.counts.stage_adjudicated_records !== 3 || wave06Field.counts.control_records_reviewed !== 5 || wave06Field.counts.supported_for_human_review !== 2 || wave06Field.counts.retained_candidate_only !== 1 || wave06Field.counts.included_events !== 0) fail('Wave 06 field count drift');
  for (const row of wave06Field.rows) if (row.included_event !== false || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: Wave 06 field promotion boundary drift`);
  const wave06Technician = wave06Field.rows.find(row => row.record_id === 'K0-W06-R001');
  const wave06Analyst = wave06Field.rows.find(row => row.record_id === 'K0-W06-R002');
  const wave06Jacobs = wave06Field.rows.find(row => row.record_id === 'K0-W06-R003');
  if (wave06Technician?.candidate_disposition !== 'supported_for_human_review' || wave06Technician?.provisional_ccd_chain_depth !== 4 || wave06Analyst?.candidate_disposition !== 'retained_candidate_only' || wave06Analyst?.provisional_ccd_chain_depth !== null || wave06Jacobs?.candidate_disposition !== 'supported_for_human_review' || wave06Jacobs?.provisional_ccd_chain_depth !== 6) fail('Wave 06 field disposition drift');
  if (wave07Field.schema_version !== 'k0-wave07-field-adjudication@1' || wave07Field.audit_id !== 'K0-W07-FIELD-2026-07-29-MAINTAINER' || wave07Field.rows.length !== 9) fail('Wave 07 field package drift');
  if (wave07Field.counts.stage_adjudicated_records !== 3 || wave07Field.counts.control_records_reviewed !== 6 || wave07Field.counts.supported_for_human_review !== 0 || wave07Field.counts.bounded_non_link !== 2 || wave07Field.counts.retained_candidate_only !== 1 || wave07Field.counts.included_events !== 0) fail('Wave 07 field count drift');
  for (const row of wave07Field.rows) if (row.included_event !== false || row.evidence_truth_determined !== false || row.independent_review_complete !== false || row.publication_status !== 'blocked' || row.graph_effect !== 'none') fail(`${row.record_id}: Wave 07 field promotion boundary drift`);
  const wave07Honl = wave07Field.rows.find(row => row.record_id === 'K0-W07-R001');
  const wave07Transfer = wave07Field.rows.find(row => row.record_id === 'K0-W07-R003');
  if (wave07Honl?.candidate_disposition !== 'retained_candidate_only' || wave07Honl?.provisional_ccd_chain_depth !== null || wave07Honl?.furthest_documented_stage !== 6) fail('Wave 07 Honl field drift');
  if (wave07Transfer?.candidate_disposition !== 'bounded_non_link' || wave07Transfer?.provisional_ccd_chain_depth !== 1 || wave07Transfer?.stage_assessments?.[2]?.status !== 'not_established') fail('Wave 07 transfer field drift');

  const denominatorWave03 = neutral.discovery_waves.find(row => row.wave_id === 'K0-W03');
  const denominatorWave04 = neutral.discovery_waves.find(row => row.wave_id === 'K0-W04');
  const denominatorWave05 = neutral.discovery_waves.find(row => row.wave_id === 'K0-W05');
  const denominatorWave06 = neutral.discovery_waves.find(row => row.wave_id === 'K0-W06');
  const denominatorWave07 = neutral.discovery_waves.find(row => row.wave_id === 'K0-W07');
  const denominatorWave08 = neutral.discovery_waves.find(row => row.wave_id === 'K0-W08');
  if (denominatorWave03?.status !== 'discovery_complete_field_adjudication_complete') fail('Wave 03 reconciliation drift');
  if (denominatorWave04?.status !== 'discovery_complete_field_adjudication_complete') fail('Wave 04 denominator state drift');
  if (denominatorWave05?.status !== 'discovery_complete_field_adjudication_complete') fail('Wave 05 denominator state drift');
  if (denominatorWave06?.status !== 'discovery_complete_field_adjudication_complete') fail('Wave 06 denominator state drift');
  if (denominatorWave07?.status !== 'discovery_complete_field_adjudication_complete' || denominatorWave07?.field_adjudication_path !== 'data/research/k0-wave07-field-adjudication.json') fail('Wave 07 denominator state drift');
  if (denominatorWave08?.status !== 'discovery_complete_field_adjudication_pending' || denominatorWave08?.path !== 'data/research/k0-role-neutral-wave-08.json') fail('Wave 08 denominator state drift');
  if (neutral.boundaries.seed_ten_are_denominator !== false || neutral.boundaries.graph_effect !== 'none') fail('neutral denominator boundary drift');

  if (wiring.schema_version !== 'k0-existing-ecosystem-wiring@2' || wiring.rows.length !== 10) fail('wiring denominator drift');
  if (wiring.natural_k0_fixture_count !== 10 || wiring.clean_first_class_estate_route_count !== 8) fail('wiring route count drift');
  if (wiring.shared_media_publication_taxonomy_gap_count !== 2) fail('media taxonomy gap drift');
  if (wiring.exact_pairwise_chain_count !== 1 || wiring.justified_common_purpose_network_edges_among_top_ten !== 0) fail('pairwise/network boundary drift');
  if (wiring.graph_effect !== 'none') fail('wiring graph effect drift');
  for (const row of wiring.rows) if (!row.natural_join || !row.do_not_join) fail(`${row.person}: incomplete natural/non-link wiring`);

  const story = registry.stories.find(row => row.story_id === 'M05-S14');
  const lane = fanout.lanes.find(row => row.lane_id === 'A17');
  if (!story || story.mode !== 'constitutional_mechanism') fail('M05-S14 missing or wrong mode');
  if (!lane || lane.story_id !== 'M05-S14') fail('A17 missing or disconnected');
  if (registry.stories.length !== 15 || fanout.lanes.length !== 18) fail('M05 integration counts drift');

  const selectionLane = selection.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const coverageRow = coverage.lanes.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  const review = reviews.reviews.find(row => row.lane_id === 'epistemic-admissibility-ceiling-events');
  if (!selectionLane || selectionLane.status !== 'proposed' || selectionLane.graph_effect !== 'none') fail('selection lane boundary drift');
  if (!coverageRow || coverageRow.coverage_state !== 'active_discovery_partial') fail('coverage row missing');
  if (!review || review.status !== 'pending_second_party' || review.publication_status !== 'blocked' || review.reviewer_id !== null) fail('selection review boundary drift');
  if (review.maintainer_audit?.independence_effect !== 'does_not_satisfy_second_party_clearance') fail('maintainer audit review boundary missing');
  const pendingFieldMetric = coverageRow.metrics?.find(row => row.metric_id === 'candidate_records_pending_field_audit');
  const wave04CoverageGap = coverageRow.known_gaps?.find(row => row.gap_id === 'k0-wave04-field-adjudication-open');
  const wave05CoverageGap = coverageRow.known_gaps?.find(row => row.gap_id === 'k0-wave05-field-adjudication-open');
  const wave06CoverageGap = coverageRow.known_gaps?.find(row => row.gap_id === 'k0-wave06-field-adjudication-open');
  const wave07CoverageGap = coverageRow.known_gaps?.find(row => row.gap_id === 'k0-wave07-field-adjudication-open');
  const committeeComparator = review.comparator_tests?.find(row => row.test_id === 'committee-capture-reset-and-conflict-controls');
  const publicationComparator = review.comparator_tests?.find(row => row.test_id === 'publication-gate-and-correction-controls');
  const professionalComparator = review.comparator_tests?.find(row => row.test_id === 'professional-judgment-discipline-and-stay-controls');
  const authorshipComparator = review.comparator_tests?.find(row => row.test_id === 'authorship-transfer-resignation-and-correction-controls');
  if (pendingFieldMetric?.observed !== 4 || pendingFieldMetric?.source !== 'data/research/k0-role-neutral-wave-08.json') fail('Wave 08 coverage metric drift');
  if (wave04CoverageGap?.status !== 'resolved_at_maintainer_layer') fail('Wave 04 coverage gap drift');
  if (wave05CoverageGap?.status !== 'resolved_at_maintainer_layer') fail('Wave 05 coverage gap drift');
  if (wave06CoverageGap?.status !== 'resolved_at_maintainer_layer') fail('Wave 06 coverage gap drift');
  if (wave07CoverageGap?.status !== 'resolved_at_maintainer_layer') fail('Wave 07 coverage gap drift');
  if (committeeComparator?.status !== 'maintainer_field_complete' || committeeComparator.blocking_conditions?.some(value => value.includes('await field adjudication'))) fail('Wave 04 comparator review drift');
  if (publicationComparator?.status !== 'maintainer_field_complete' || publicationComparator.blocking_conditions?.some(value => /await field adjudication|field review open/i.test(value))) fail('Wave 05 comparator review drift');
  if (professionalComparator?.status !== 'maintainer_field_complete' || professionalComparator.blocking_conditions?.some(value => /await field adjudication|field review open|three Wave 06 candidates/i.test(value))) fail('Wave 06 comparator review drift');
  if (authorshipComparator?.status !== 'maintainer_field_complete' || authorshipComparator.blocking_conditions?.some(value => /await field adjudication|field review open|three candidate packets/i.test(value))) fail('Wave 07 comparator review drift');


  for (const rel of ['data/ledger/surfaces.jsonl','data/ledger/participation.jsonl','data/ledger/chains.jsonl']) {
    const full = path.join(root, rel);
    if (fs.existsSync(full) && /K0-SEED-|M05-S14|epistemic-admissibility-ceiling-events/.test(fs.readFileSync(full, 'utf8'))) fail(`${rel}: K0 leaked into canonical graph ledger`);
  }

  const expected = computeK0ReleaseManifest();
  if (JSON.stringify(manifest) !== JSON.stringify(expected)) fail('exact-byte K0 release manifest drift');
  if (report.release_manifest.combined_sha256 !== manifest.combined_sha256) fail('report release hash drift');
  if (report.schema_version !== 'k0-epistemic-admissibility-report@2') fail('report schema drift');
  if (report.counts.top_ten_people !== 10 || report.counts.normalized_seed_events !== 13 || report.counts.common_purpose_network_edges !== 0) fail('report denominator drift');
  if (report.counts.field_audit_supported_for_human_review !== 6 || report.counts.field_audit_retained_candidate_only !== 7) fail('report field audit count drift');
  if (report.current_result.maintainer_source_retrieval_audit_complete !== true || report.current_result.maintainer_field_audit_complete !== true) fail('report audit state drift');
  if (report.current_result.role_neutral_universe_execution_started !== true || report.current_result.role_neutral_wave_05_field_adjudication_complete !== true || report.current_result.role_neutral_wave_06_field_adjudication_complete !== true || report.current_result.role_neutral_wave_07_discovery_complete !== true || report.current_result.role_neutral_wave_07_field_adjudication_complete !== true || report.current_result.role_neutral_wave_08_discovery_complete !== true || report.current_result.role_neutral_wave_08_field_adjudication_complete !== false || report.current_result.role_neutral_universe_executed !== true || report.counts.role_neutral_query_executions !== 52 || report.counts.role_neutral_retained_records !== 66 || report.counts.role_neutral_candidate_records !== 28 || report.counts.role_neutral_positive_controls !== 15 || report.counts.role_neutral_negative_controls !== 12 || report.counts.role_neutral_coverage_controls !== 8 || report.counts.role_neutral_requires_additional_acquisition !== 1 || report.counts.role_neutral_resolved_additional_acquisition !== 2 || report.counts.role_neutral_wave_02_retained_records !== 7 || report.counts.role_neutral_wave_03_query_executions !== 4 || report.counts.role_neutral_wave_03_retained_records !== 7 || report.counts.role_neutral_wave_03_candidate_records !== 5 || report.counts.role_neutral_wave_04_query_executions !== 4 || report.counts.role_neutral_wave_04_retained_records !== 8 || report.counts.role_neutral_wave_04_candidate_records !== 3 || report.counts.role_neutral_wave_05_query_executions !== 4 || report.counts.role_neutral_wave_05_retained_records !== 8 || report.counts.role_neutral_wave_05_candidate_records !== 2 || report.counts.role_neutral_wave_05_field_records_reviewed !== 8 || report.counts.role_neutral_wave_05_field_supported_for_human_review !== 1 || report.counts.role_neutral_wave_05_field_retained_candidate_only !== 1 || report.counts.role_neutral_wave_06_query_executions !== 8 || report.counts.role_neutral_wave_06_retained_records !== 8 || report.counts.role_neutral_wave_06_candidate_records !== 3 || report.counts.role_neutral_wave_06_field_records_reviewed !== 8 || report.counts.role_neutral_wave_06_field_supported_for_human_review !== 2 || report.counts.role_neutral_wave_06_field_retained_candidate_only !== 1 || report.counts.role_neutral_wave_07_query_executions !== 16 || report.counts.role_neutral_wave_07_retained_records !== 9 || report.counts.role_neutral_wave_07_candidate_records !== 3 || report.counts.role_neutral_wave_07_field_records_reviewed !== 9 || report.counts.role_neutral_wave_07_field_supported_for_human_review !== 0 || report.counts.role_neutral_wave_07_field_bounded_non_link !== 2 || report.counts.role_neutral_wave_07_field_retained_candidate_only !== 1 || report.counts.role_neutral_wave_08_query_executions !== 8 || report.counts.role_neutral_wave_08_retained_records !== 9 || report.counts.role_neutral_wave_08_candidate_records !== 4) fail('report role-neutral execution drift');
  if (report.current_result.source_receipt_exact_hash_custody_complete !== false || report.current_result.independent_second_party_review_complete !== false) fail('report independence/custody laundering');
  if (report.current_result.evidence_truth_determined !== false || report.current_result.graph_effect !== 'none' || report.current_result.project_complete !== false) fail('report result boundary drift');

  return { ok: failures.length === 0, failures };
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const result = validateK0();
  if (!result.ok) {
    console.error(`K0 validation failed with ${result.failures.length} error(s):\n${result.failures.map(row => `- ${row}`).join('\n')}`);
    process.exitCode = 1;
  } else console.log('validate-k0-epistemic-admissibility: OK');
}
