import { createHash } from 'node:crypto';

export const PREFERENCE_HARD_TO_ENUMERATE_MISSINGNESS_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-hard-to-enumerate-missingness-assurance-fixture@1';
export const PREFERENCE_HARD_TO_ENUMERATE_MISSINGNESS_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-hard-to-enumerate-missingness-assurance-build@1';

const WORLD_IDS = [
  "complete-hard-to-enumerate-missingness-proxy-external-frame-imputation-and-current-lineage",
  "hard-to-enumerate-subgroups-omitted",
  "nonresponse-refusal-and-response-propensity-unclassified",
  "inaccessible-source-suppression-loss-and-unknown-missingness",
  "proxy-enumeration-unvalidated-with-false-positive-and-false-negative-error",
  "external-linked-frame-omission-and-operational-boundary-truncation",
  "imputation-and-selection-adjustment-unvalidated",
  "historical-hard-to-enumerate-missingness-assurance-inherited-after-succession"
];
const FLAG_KEYS = [
  "complete_hard_to_enumerate_missingness_assurance",
  "subgroup_omission_present",
  "nonresponse_mechanism_failure_present",
  "source_missingness_failure_present",
  "proxy_validation_failure_present",
  "external_frame_failure_present",
  "imputation_selection_failure_present",
  "stale_hard_to_enumerate_lineage_present",
  "subgroup_coverage_complete",
  "nonresponse_classification_complete",
  "source_missingness_complete",
  "proxy_validation_complete",
  "external_frame_complete",
  "imputation_selection_complete",
  "current_lineage_complete",
  "monitoring_correction_complete"
];
export const EXPECTED_HARD_TO_ENUMERATE_MISSINGNESS_METRICS = {
  "world_count": 8,
  "distinct_public_status_signatures": 1,
  "distinct_hard_to_enumerate_missingness_governance_signatures": 8,
  "complete_hard_to_enumerate_missingness_assurance_worlds": 1,
  "subgroup_omission_worlds": 1,
  "nonresponse_mechanism_failure_worlds": 1,
  "source_missingness_failure_worlds": 1,
  "proxy_validation_failure_worlds": 1,
  "external_frame_failure_worlds": 1,
  "imputation_selection_failure_worlds": 1,
  "stale_hard_to_enumerate_lineage_worlds": 1,
  "subgroup_coverage_complete_worlds": 7,
  "nonresponse_classification_complete_worlds": 7,
  "source_missingness_complete_worlds": 7,
  "proxy_validation_complete_worlds": 7,
  "external_frame_complete_worlds": 7,
  "imputation_selection_complete_worlds": 7,
  "current_lineage_complete_worlds": 7,
  "monitoring_correction_complete_worlds": 8,
  "same_public_hard_to_enumerate_missingness_surface_worlds": 8,
  "total_hard_to_enumerate_omitted_count": 30,
  "total_unhoused_omitted_count": 15,
  "total_undocumented_admin_invisible_omitted_count": 10,
  "total_institutionalized_displaced_omitted_count": 10,
  "total_transient_digital_absent_omitted_count": 20,
  "total_nonresponse_unit_count": 40,
  "total_refusal_unit_count": 20,
  "total_inaccessible_source_unit_count": 30,
  "total_suppressed_lost_record_count": 20,
  "total_unknown_missingness_unit_count": 40,
  "total_proxy_enumerated_unit_count": 30,
  "total_unvalidated_proxy_unit_count": 30,
  "total_false_positive_proxy_count": 15,
  "total_false_negative_proxy_count": 20,
  "total_external_linked_omitted_count": 30,
  "total_boundary_truncated_unit_count": 40,
  "total_imputed_unit_count": 40,
  "total_missingness_misclassified_unit_count": 50,
  "total_stale_hard_to_enumerate_decision_count": 100,
  "total_unsupported_hard_to_enumerate_decisions": 700,
  "binding_public_authority_worlds": 0
};
export const FALSE_HARD_TO_ENUMERATE_MISSINGNESS_CLASSIFICATIONS = [
  "declared_population_identifies_operational_population_universe",
  "published_hard_to_enumerate_coverage_identifies_complete_subgroup_enumeration_and_residual_omission_custody",
  "absence_of_record_identifies_absence_when_nonresponse_refusal_inaccessible_source_suppression_loss_or_unknown_missingness_possible",
  "zero_published_nonresponse_identifies_zero_true_nonresponse",
  "zero_published_unknown_missingness_identifies_zero_true_unknown_missingness",
  "proxy_enumeration_identifies_observed_independently_validated_enumeration",
  "published_proxy_validation_identifies_absence_of_false_positive_false_negative_subgroup_calibration_or_drift_failure",
  "published_external_frame_coverage_identifies_complete_external_linked_displaced_transient_and_boundary_custody",
  "model_imputed_or_selection_adjusted_state_identifies_observed_independently_validated_population_state",
  "one_validation_sample_identifies_current_subgroup_complete_imputation_and_selection_assurance",
  "historical_hard_to_enumerate_missingness_assurance_identifies_current_assurance",
  "public_hard_to_enumerate_missingness_verified_status_identifies_complete_current_correctable_authorized_evidence",
  "hard_to_enumerate_missingness_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed"
];
const REQUIRED_RULES = [
  "declared_population_units_are_not_the_operational_population_universe",
  "published_hard_to_enumerate_coverage_is_not_complete_subgroup_enumeration_residual_omission_missingness_or_uncertainty_custody",
  "no_recorded_unit_is_not_an_absent_unit_when_nonresponse_refusal_inaccessible_sources_suppression_loss_or_unknown_missingness_remain_possible",
  "zero_published_nonresponse_is_not_zero_true_nonresponse",
  "zero_published_unknown_missingness_is_not_zero_true_unknown_missingness",
  "proxy_enumeration_is_not_observed_or_independently_validated_enumeration",
  "published_proxy_validation_coverage_is_not_absence_of_false_positive_false_negative_subgroup_calibration_or_drift_failure",
  "published_external_frame_coverage_is_not_complete_external_linked_displaced_transient_or_boundary_custody",
  "model_imputed_or_selection_adjusted_population_state_is_not_observed_or_independently_validated_population_state",
  "one_validation_sample_is_not_current_subgroup_complete_imputation_and_selection_assurance",
  "historical_hard_to_enumerate_missingness_assurance_is_not_current_after_source_frame_proxy_model_population_workflow_policy_or_release_succession",
  "public_hard_to_enumerate_missingness_verified_status_is_not_complete_current_subgroup_complete_mechanism_classified_proxy_validated_external_frame_complete_imputation_valid_correctable_or_authorized_evidence",
  "hard_to_enumerate_or_missingness_assurance_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "hard_to_enumerate_missingness_claim_requires_subgroup_response_source_proxy_external_frame_imputation_lineage_correction_and_authority_custody",
  "binding_public_authority_requires_separate_current_public_authorization_receipts",
  "synthetic_population_counts_are_not_real_world_prevalence_coverage_missingness_or_effect_estimates"
];
const BASELINE = {
  "operative_release_id": "RELEASE-INCIDENT-V1",
  "operative_release_version": 1,
  "declared_population_units": 100,
  "public_hard_to_enumerate_status": "hard_to_enumerate_missingness_verified",
  "published_hard_to_enumerate_coverage": 1,
  "published_external_frame_coverage": 1,
  "published_nonresponse_rate": 0,
  "published_unknown_missingness_rate": 0,
  "published_proxy_validation_coverage": 1,
  "published_residual_omission_count": 0,
  "approved_use": "systemwide_release_policy",
  "reference_subgroup_frame_version": "HTE-SUBGROUP-FRAME-V1",
  "reference_response_missingness_version": "HTE-RESPONSE-MISSINGNESS-V1",
  "reference_source_missingness_version": "HTE-SOURCE-MISSINGNESS-V1",
  "reference_proxy_version": "HTE-PROXY-ENUMERATION-V1",
  "reference_external_frame_version": "HTE-EXTERNAL-FRAME-V1",
  "reference_imputation_version": "HTE-IMPUTATION-SELECTION-V1",
  "binding_public_authority": false
};
const PUBLIC_KEYS = [
  "operative_release_id",
  "operative_release_version",
  "declared_population_units",
  "public_hard_to_enumerate_status",
  "published_hard_to_enumerate_coverage",
  "published_external_frame_coverage",
  "published_nonresponse_rate",
  "published_unknown_missingness_rate",
  "published_proxy_validation_coverage",
  "published_residual_omission_count",
  "approved_use"
];
const COUNT_FIELDS = {
  subgroup_coverage: ['declared_population_count','operational_population_count','enumerated_count','hard_to_enumerate_omitted_count','unhoused_omitted_count','undocumented_admin_invisible_omitted_count','institutionalized_displaced_omitted_count','transient_digital_absent_omitted_count'],
  response_missingness: ['nonresponse_unit_count','refusal_unit_count','response_propensity_unclassified_count'],
  source_missingness: ['inaccessible_source_unit_count','suppressed_lost_record_count','unknown_missingness_unit_count'],
  proxy_validation: ['proxy_enumerated_unit_count','unvalidated_proxy_unit_count','false_positive_proxy_count','false_negative_proxy_count'],
  external_frame: ['external_linked_omitted_count','boundary_truncated_unit_count'],
  imputation_selection: ['imputed_unit_count','missingness_misclassified_unit_count'],
  lineage_governance: ['stale_hard_to_enumerate_decision_count','unsupported_hard_to_enumerate_decision_count'],
};

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(value => text(value)).filter(Boolean))];
const sorted = values => [...values].sort((a, b) => String(a).localeCompare(String(b)));
const sameMembers = (a, b) => JSON.stringify(sorted(unique(a))) === JSON.stringify(sorted(unique(b)));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };
function deepMerge(base, override) {
  if (Array.isArray(override)) return override.map(canonical);
  if (!override || typeof override !== 'object') return override;
  const result = { ...object(base) };
  for (const [key, value] of Object.entries(override)) result[key] = value && typeof value === 'object' && !Array.isArray(value) ? deepMerge(result[key], value) : canonical(value);
  return result;
}
const publicClaim = baseline => Object.fromEntries(PUBLIC_KEYS.map(key => [key, baseline[key]]));
function validateCounts(world, errors) {
  for (const [section, fields] of Object.entries(COUNT_FIELDS)) for (const field of fields) {
    const value = world?.[section]?.[field];
    if (!Number.isInteger(value) || value < 0) errors.push(`${section}.${field} must be a non-negative integer`);
  }
}
function deriveFlags(world) {
  const subgroup = object(world.subgroup_coverage);
  const response = object(world.response_missingness);
  const source = object(world.source_missingness);
  const proxy = object(world.proxy_validation);
  const external = object(world.external_frame);
  const imputation = object(world.imputation_selection);
  const lineage = object(world.lineage_governance);
  const subgroupComplete = ['hard_to_enumerate_complete','unhoused_complete','undocumented_admin_invisible_complete','institutionalized_displaced_complete','transient_digital_absent_complete','alternate_frame_validation_complete','residual_omission_complete','uncertainty_complete'].every(key => subgroup[key] === true);
  const responseComplete = ['response_attempt_complete','nonresponse_mechanism_classified','refusal_classified','propensity_model_complete','followup_complete','substitution_complete','weighting_validation_complete','terminal_state_complete'].every(key => response[key] === true);
  const sourceComplete = ['source_accessibility_complete','suppression_loss_complete','provenance_complete','absent_state_validation_complete','falsification_complete','sensitivity_complete'].every(key => source[key] === true);
  const proxyComplete = ['proxy_independent_validation_complete','false_positive_audit_complete','false_negative_audit_complete','calibration_complete','subgroup_error_complete','drift_complete'].every(key => proxy[key] === true);
  const externalComplete = ['external_frame_complete','linked_frame_complete','overlap_complete','operational_boundary_complete','displaced_transient_boundary_complete','uncertainty_complete'].every(key => external[key] === true);
  const imputationComplete = ['imputation_validation_complete','selection_adjustment_complete','calibration_complete','subgroup_validation_complete','falsification_complete','sensitivity_complete'].every(key => imputation[key] === true);
  const currentLineage = lineage.current_hard_to_enumerate_missingness_lineage === true && [
    ['subgroup_frame','HTE-SUBGROUP-FRAME'],['response_missingness','HTE-RESPONSE-MISSINGNESS'],['source_missingness','HTE-SOURCE-MISSINGNESS'],['proxy','HTE-PROXY-ENUMERATION'],['external_frame','HTE-EXTERNAL-FRAME'],['imputation','HTE-IMPUTATION-SELECTION']
  ].every(([name]) => lineage[`approved_${name}_version`] === lineage[`executed_${name}_version`]);
  const monitoringComplete = ['monitoring_complete','frame_refresh_complete','missingness_drift_complete','proxy_drift_complete','model_drift_complete','rollback_complete','correction_complete','appeal_complete','certificate_withdrawal_complete','durability_complete'].every(key => lineage[key] === true);
  const flags = {
    subgroup_omission_present: subgroup.hard_to_enumerate_omitted_count > 0 || subgroup.unhoused_omitted_count > 0 || subgroup.undocumented_admin_invisible_omitted_count > 0 || subgroup.institutionalized_displaced_omitted_count > 0 || subgroup.transient_digital_absent_omitted_count > 0 || !subgroupComplete,
    nonresponse_mechanism_failure_present: response.nonresponse_unit_count > 0 || response.refusal_unit_count > 0 || response.response_propensity_unclassified_count > 0 || !responseComplete,
    source_missingness_failure_present: source.inaccessible_source_unit_count > 0 || source.suppressed_lost_record_count > 0 || source.unknown_missingness_unit_count > 0 || !sourceComplete,
    proxy_validation_failure_present: proxy.proxy_enumerated_unit_count > 0 || proxy.unvalidated_proxy_unit_count > 0 || proxy.false_positive_proxy_count > 0 || proxy.false_negative_proxy_count > 0 || !proxyComplete,
    external_frame_failure_present: external.external_linked_omitted_count > 0 || external.boundary_truncated_unit_count > 0 || !externalComplete,
    imputation_selection_failure_present: imputation.imputed_unit_count > 0 || imputation.missingness_misclassified_unit_count > 0 || !imputationComplete,
    stale_hard_to_enumerate_lineage_present: !currentLineage || lineage.stale_hard_to_enumerate_decision_count > 0,
    subgroup_coverage_complete: subgroupComplete,
    nonresponse_classification_complete: responseComplete,
    source_missingness_complete: sourceComplete,
    proxy_validation_complete: proxyComplete,
    external_frame_complete: externalComplete,
    imputation_selection_complete: imputationComplete,
    current_lineage_complete: currentLineage,
    monitoring_correction_complete: monitoringComplete,
  };
  flags.complete_hard_to_enumerate_missingness_assurance = ['subgroup_coverage_complete','nonresponse_classification_complete','source_missingness_complete','proxy_validation_complete','external_frame_complete','imputation_selection_complete','current_lineage_complete','monitoring_correction_complete'].every(key => flags[key]);
  return Object.fromEntries(FLAG_KEYS.map(key => [key, flags[key]]));
}
function custodyChain(world, flags) {
  const stages = [
    ['PUBLIC','public-surface',world.public_claim],['SUBGROUP','subgroup-coverage',world.subgroup_coverage],['RESPONSE','response-missingness',world.response_missingness],
    ['SOURCE','source-missingness',world.source_missingness],['PROXY','proxy-validation',world.proxy_validation],['EXTERNAL','external-frame',world.external_frame],
    ['IMPUTATION','imputation-selection',world.imputation_selection],['LINEAGE','lineage-governance',world.lineage_governance],['FLAGS','classification',flags],
    ['INTERPRETATION','interpretation',{ mechanism: world.mechanism, graph_effect: 'none' }],
  ];
  let previous = null;
  return stages.map(([suffix, stage, payload], index) => {
    const unsigned = { event_id: `${world.world_id}-${suffix}`, stage, source_event_ids: index ? [`${world.world_id}-${stages[index-1][0]}`] : [], previous_event_sha256: previous, payload };
    const event = { ...unsigned, event_sha256: sha256(unsigned) }; previous = event.event_sha256; return event;
  });
}
const publicSignature = world => sha256(world.public_claim);
const governanceSignature = (world, flags) => sha256({ subgroup_coverage: world.subgroup_coverage, response_missingness: world.response_missingness, source_missingness: world.source_missingness, proxy_validation: world.proxy_validation, external_frame: world.external_frame, imputation_selection: world.imputation_selection, lineage_governance: world.lineage_governance, flags });
function materializeWorld(defaults, spec) {
  const merged = deepMerge(defaults, object(spec.overrides));
  const world = { world_id: spec.world_id, label: spec.label, mechanism: spec.mechanism, public_claim: canonical(merged.public_claim), subgroup_coverage: canonical(merged.subgroup_coverage), response_missingness: canonical(merged.response_missingness), source_missingness: canonical(merged.source_missingness), proxy_validation: canonical(merged.proxy_validation), external_frame: canonical(merged.external_frame), imputation_selection: canonical(merged.imputation_selection), lineage_governance: canonical(merged.lineage_governance) };
  const flags = deriveFlags(world); const chain = custodyChain(world, flags);
  return { ...world, flags, public_status_signature: publicSignature(world), governance_signature: governanceSignature(world, flags), custody_chain: chain, custody_chain_head_sha256: chain.at(-1).event_sha256 };
}
function calculateMetrics(worlds) {
  const sum = path => worlds.reduce((total, world) => total + path.split('.').reduce((value, key) => value?.[key], world), 0);
  const count = flag => worlds.filter(world => world.flags[flag]).length;
  return {
    world_count: worlds.length,
    distinct_public_status_signatures: new Set(worlds.map(world => world.public_status_signature)).size,
    distinct_hard_to_enumerate_missingness_governance_signatures: new Set(worlds.map(world => world.governance_signature)).size,
    complete_hard_to_enumerate_missingness_assurance_worlds: count('complete_hard_to_enumerate_missingness_assurance'),
    subgroup_omission_worlds: count('subgroup_omission_present'), nonresponse_mechanism_failure_worlds: count('nonresponse_mechanism_failure_present'),
    source_missingness_failure_worlds: count('source_missingness_failure_present'), proxy_validation_failure_worlds: count('proxy_validation_failure_present'),
    external_frame_failure_worlds: count('external_frame_failure_present'), imputation_selection_failure_worlds: count('imputation_selection_failure_present'),
    stale_hard_to_enumerate_lineage_worlds: count('stale_hard_to_enumerate_lineage_present'), subgroup_coverage_complete_worlds: count('subgroup_coverage_complete'),
    nonresponse_classification_complete_worlds: count('nonresponse_classification_complete'), source_missingness_complete_worlds: count('source_missingness_complete'),
    proxy_validation_complete_worlds: count('proxy_validation_complete'), external_frame_complete_worlds: count('external_frame_complete'),
    imputation_selection_complete_worlds: count('imputation_selection_complete'), current_lineage_complete_worlds: count('current_lineage_complete'),
    monitoring_correction_complete_worlds: count('monitoring_correction_complete'), same_public_hard_to_enumerate_missingness_surface_worlds: worlds.filter(world => world.public_status_signature === worlds[0].public_status_signature).length,
    total_hard_to_enumerate_omitted_count: sum('subgroup_coverage.hard_to_enumerate_omitted_count'), total_unhoused_omitted_count: sum('subgroup_coverage.unhoused_omitted_count'),
    total_undocumented_admin_invisible_omitted_count: sum('subgroup_coverage.undocumented_admin_invisible_omitted_count'), total_institutionalized_displaced_omitted_count: sum('subgroup_coverage.institutionalized_displaced_omitted_count'),
    total_transient_digital_absent_omitted_count: sum('subgroup_coverage.transient_digital_absent_omitted_count'), total_nonresponse_unit_count: sum('response_missingness.nonresponse_unit_count'),
    total_refusal_unit_count: sum('response_missingness.refusal_unit_count'), total_inaccessible_source_unit_count: sum('source_missingness.inaccessible_source_unit_count'),
    total_suppressed_lost_record_count: sum('source_missingness.suppressed_lost_record_count'), total_unknown_missingness_unit_count: sum('source_missingness.unknown_missingness_unit_count'),
    total_proxy_enumerated_unit_count: sum('proxy_validation.proxy_enumerated_unit_count'), total_unvalidated_proxy_unit_count: sum('proxy_validation.unvalidated_proxy_unit_count'),
    total_false_positive_proxy_count: sum('proxy_validation.false_positive_proxy_count'), total_false_negative_proxy_count: sum('proxy_validation.false_negative_proxy_count'),
    total_external_linked_omitted_count: sum('external_frame.external_linked_omitted_count'), total_boundary_truncated_unit_count: sum('external_frame.boundary_truncated_unit_count'),
    total_imputed_unit_count: sum('imputation_selection.imputed_unit_count'), total_missingness_misclassified_unit_count: sum('imputation_selection.missingness_misclassified_unit_count'),
    total_stale_hard_to_enumerate_decision_count: sum('lineage_governance.stale_hard_to_enumerate_decision_count'), total_unsupported_hard_to_enumerate_decisions: sum('lineage_governance.unsupported_hard_to_enumerate_decision_count'),
    binding_public_authority_worlds: worlds.filter(world => world.lineage_governance.binding_public_authority === true).length,
  };
}
function validateChain(world, errors) {
  const events = array(world?.custody_chain); if (events.length !== 10) errors.push(`${world?.world_id ?? 'world'} custody chain must contain ten events`);
  let previous = null; const seen = new Set();
  for (const event of events) { if (event.previous_event_sha256 !== previous) errors.push(`${world.world_id} custody previous hash mismatch`); for (const source of array(event.source_event_ids)) if (!seen.has(source)) errors.push(`${world.world_id} custody source missing`); const unsigned = { ...event }; delete unsigned.event_sha256; if (event.event_sha256 !== sha256(unsigned)) errors.push(`${world.world_id} custody event hash mismatch`); seen.add(event.event_id); previous = event.event_sha256; }
  if (previous !== world?.custody_chain_head_sha256) errors.push(`${world?.world_id ?? 'world'} custody head mismatch`);
}
export function validatePreferenceHardToEnumerateMissingnessAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_HARD_TO_ENUMERATE_MISSINGNESS_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-hard-to-enumerate-missingness-verified-status-different-operational-states-v1') errors.push('fixture_id mismatch');
  if (fixture?.issue !== 858 || fixture?.parent_program_issue !== 594) errors.push('issue custody mismatch');
  if (fixture?.status !== 'synthetic_control') errors.push('fixture status mismatch'); if (fixture?.graph_effect !== 'none') errors.push('graph effect must remain none'); requireFalse(fixture?.counts_toward_thesis_evidence,'thesis evidence',errors);
  if (JSON.stringify(canonical(fixture?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('baseline mismatch');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_RULES)) errors.push('required refusal-rule denominator mismatch');
  for (const key of FALSE_HARD_TO_ENUMERATE_MISSINGNESS_CLASSIFICATIONS) requireFalse(fixture?.expected_classification?.[key], `expected_classification.${key}`, errors);
  if (fixture?.expected_classification?.complete_hard_to_enumerate_missingness_assurance_supported_in_at_least_one_world !== true) errors.push('complete assurance support must remain true');
  if (array(fixture?.prohibited_inferences).length < 12) errors.push('prohibited inferences incomplete'); if (!text(fixture?.interpretation_contract?.contract_id) || !text(fixture?.interpretation_contract?.copy_ready_caveat)) errors.push('interpretation contract incomplete');
  const specs = array(fixture?.worlds); if (specs.length !== WORLD_IDS.length || specs.some((spec,index) => spec.world_id !== WORLD_IDS[index])) errors.push('world denominator or order mismatch');
  for (const spec of specs) { if (!text(spec.label) || !text(spec.mechanism)) errors.push(`${spec.world_id} label or mechanism missing`); const world = materializeWorld(fixture.world_defaults,spec); validateCounts(world,errors); if (JSON.stringify(canonical(world.public_claim)) !== JSON.stringify(canonical(publicClaim(fixture.baseline)))) errors.push(`${spec.world_id} public claim mismatch`); if (JSON.stringify(canonical(spec.expected_flags)) !== JSON.stringify(canonical(world.flags))) errors.push(`${spec.world_id} expected flags mismatch`); }
  return errors;
}
export function compilePreferenceHardToEnumerateMissingnessAssuranceFixture(fixture) {
  const errors = validatePreferenceHardToEnumerateMissingnessAssuranceFixture(fixture); if (errors.length) throw new Error(`invalid hard-to-enumerate missingness fixture:\n- ${errors.join('\n- ')}`);
  const worlds = fixture.worlds.map(spec => materializeWorld(fixture.world_defaults,spec));
  return { schema_version:PREFERENCE_HARD_TO_ENUMERATE_MISSINGNESS_ASSURANCE_BUILD_SCHEMA_VERSION, fixture_id:fixture.fixture_id, issue:fixture.issue, parent_program_issue:fixture.parent_program_issue, captured_at:fixture.captured_at, status:fixture.status, graph_effect:'none', counts_toward_thesis_evidence:false, conclusion_generated:false, preference_change_present:false, manipulative_intent_inferable:false, real_world_effect_claimed:false, outside_human_dependency:false, baseline:fixture.baseline, worlds, metrics:calculateMetrics(worlds), classification:fixture.expected_classification, refusal_rules:fixture.required_refusal_rules, prohibited_inferences:fixture.prohibited_inferences, interpretation_contract:fixture.interpretation_contract };
}
export function validatePreferenceHardToEnumerateMissingnessAssuranceBuild(compiled) {
  const errors=[]; if (compiled?.schema_version !== PREFERENCE_HARD_TO_ENUMERATE_MISSINGNESS_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('compiled schema mismatch'); if (compiled?.fixture_id !== 'same-hard-to-enumerate-missingness-verified-status-different-operational-states-v1') errors.push('compiled fixture_id mismatch'); if (compiled?.issue !== 858 || compiled?.parent_program_issue !== 594) errors.push('compiled issue custody mismatch'); if (compiled?.status !== 'synthetic_control') errors.push('compiled status mismatch'); if (compiled?.graph_effect !== 'none') errors.push('compiled graph effect mismatch');
  for (const [key,label] of [['counts_toward_thesis_evidence','thesis evidence'],['conclusion_generated','conclusion'],['preference_change_present','preference change'],['manipulative_intent_inferable','intent inference'],['real_world_effect_claimed','real-world effect'],['outside_human_dependency','outside-human dependency']]) requireFalse(compiled?.[key],`compiled ${label}`,errors);
  if (JSON.stringify(canonical(compiled?.baseline)) !== JSON.stringify(canonical(BASELINE))) errors.push('compiled baseline mismatch'); const worlds=array(compiled?.worlds); if (worlds.length !== WORLD_IDS.length || worlds.some((world,index)=>world.world_id !== WORLD_IDS[index])) errors.push('compiled world denominator or order mismatch');
  for (const world of worlds) { validateCounts(world,errors); const flags=deriveFlags(world); if (JSON.stringify(canonical(world.flags)) !== JSON.stringify(canonical(flags))) errors.push(`${world.world_id} compiled flags mismatch`); if (world.public_status_signature !== publicSignature(world)) errors.push(`${world.world_id} public signature mismatch`); if (world.governance_signature !== governanceSignature(world,flags)) errors.push(`${world.world_id} governance signature mismatch`); validateChain(world,errors); }
  const metrics=worlds.length?calculateMetrics(worlds):{}; if (JSON.stringify(canonical(compiled?.metrics)) !== JSON.stringify(canonical(metrics))) errors.push('compiled metrics do not reconstruct'); for (const [key,value] of Object.entries(EXPECTED_HARD_TO_ENUMERATE_MISSINGNESS_METRICS)) if (compiled?.metrics?.[key] !== value) errors.push(`compiled metric mismatch: ${key}`);
  for (const key of FALSE_HARD_TO_ENUMERATE_MISSINGNESS_CLASSIFICATIONS) requireFalse(compiled?.classification?.[key],`compiled classification.${key}`,errors); if (compiled?.classification?.complete_hard_to_enumerate_missingness_assurance_supported_in_at_least_one_world !== true) errors.push('compiled complete-assurance support missing'); if (!sameMembers(compiled?.refusal_rules,REQUIRED_RULES)) errors.push('compiled refusal-rule denominator mismatch'); if (array(compiled?.prohibited_inferences).length < 12) errors.push('compiled prohibited inferences incomplete'); if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled caveat missing'); return errors;
}
export function renderPreferenceHardToEnumerateMissingnessAssuranceMarkdown(compiled) {
  const lines=['# Preference Custody PC-37: hard-to-enumerate and missingness assurance','',`**Worlds:** ${compiled.metrics.world_count}`,'',`**Graph effect:** ${compiled.graph_effect}`,'',`> ${compiled.interpretation_contract.copy_ready_caveat}`,'','## Deterministic metrics',''];
  for (const [key,value] of Object.entries(compiled.metrics)) lines.push(`- ${key}: ${value}`); lines.push('','## Worlds',''); for (const world of compiled.worlds) lines.push(`- **${world.label}** — ${world.mechanism}`); return `${lines.join('\n')}\n`;
}
