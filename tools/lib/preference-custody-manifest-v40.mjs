import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV39Build } from './preference-custody-manifest-v39.mjs';
import { EXPECTED_LINKAGE_SCORE_METRICS, validatePreferenceLinkageScoreCalibrationAssuranceBuild } from './preference-linkage-score-calibration-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V40_SCHEMA_VERSION = 'preference-custody-control-manifest-v40@1';
export const PREFERENCE_CUSTODY_MANIFEST_V40_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v40-build@1';
const REQUIRED_CONTROL_IDS = Array.from({ length: 42 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`);
const RESOLVED_FRONTIER = 'linkage_score_calibration_threshold_ambiguity_adjudication_falsification_and_error_governance';
const REQUIRED_SUCCESSORS = [
  "linkage_score_probability_calibration_validation_design_and_uncertainty_assurance",
  "threshold_abstention_ambiguity_adjudication_error_monitoring_and_correction_governance"
];
const FALSE_CLASSIFICATIONS = [
  "one_high_score_identifies_calibrated_match_probability",
  "one_hundred_percent_high_confidence_coverage_identifies_calibrated_confidence",
  "one_hundred_percent_calibrated_coverage_identifies_representative_independent_validation",
  "zero_published_ambiguity_identifies_complete_ambiguity_preservation_and_adjudication",
  "zero_published_abstentions_identifies_no_required_abstentions",
  "zero_published_false_match_rate_identifies_zero_true_false_positive_linkage",
  "zero_published_missed_match_rate_identifies_zero_true_false_negative_linkage",
  "deterministic_threshold_identifies_calibrated_uncertainty_and_abstention",
  "post_outcome_threshold_selection_identifies_precommitted_validation",
  "aggregate_calibration_identifies_subgroup_source_geography_language_identifier_quality_and_time_calibration",
  "highest_score_identifies_one_true_match",
  "force_resolved_multi_candidate_linkage_identifies_resolved_ambiguity",
  "clerical_review_identifies_independent_adjudication",
  "reviewer_agreement_identifies_correct_ground_truth",
  "linkage_derived_labels_identify_independent_ground_truth",
  "correlated_source_features_identify_independent_corroboration",
  "failed_negative_controls_or_falsification_identify_valid_confidence_after_threshold_selection",
  "historical_score_assurance_identifies_current_assurance_after_succession",
  "public_linkage_scores_calibrated_status_identifies_complete_current_correctable_authorized_evidence",
  "score_assurance_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed",
  "graph_effect_present",
  "preference_change_present"
];
const TRUE_CLASSIFICATION = "complete_linkage_score_assurance_supported_in_at_least_one_world";
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(stable(value)).digest('hex');
const sameMembers = (left, right) => stable(sorted(unique(left))) === stable(sorted(unique(right)));
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };
function seal(event, previous) { const unsigned = { ...canonical(event), previous_event_sha256: previous }; return { ...unsigned, event_sha256: sha256(unsigned) }; }

function chain(manifest, base, control, openFrontiers, requirements) {
  const events = []; let previous = null;
  const push = event => { const sealed = seal(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({ event_id: `${manifest.manifest_id}:base`, event_type: 'qualified_v39_floor_snapshot', evidence_class: 'compiled_synthetic_control_floor', authority: 'preference_custody_v39_compiler', source_event_ids: [], payload: { manifest_id: base.manifest_id, schema_version: base.schema_version, control_count: base.control_count, snapshot_sha256: sha256(base) } });
  push({ event_id: `${manifest.manifest_id}:pc42`, event_type: 'pc42_linkage_score_calibration_threshold_and_error_control_admitted', evidence_class: 'compiled_synthetic_control', authority: 'linkage_score_calibration_compiler', source_event_ids: [`${manifest.manifest_id}:base`], payload: { control, snapshot_sha256: sha256(control) } });
  push({ event_id: `${manifest.manifest_id}:frontier`, event_type: 'linkage_score_calibration_frontier_transition_sealed', evidence_class: 'laboratory_frontier_contract', authority: 'preference_custody_v40_compiler', source_event_ids: [`${manifest.manifest_id}:pc42`], payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers } });
  push({ event_id: `${manifest.manifest_id}:promotion`, event_type: 'linkage_score_real_case_promotion_boundary_sealed', evidence_class: 'laboratory_promotion_contract', authority: 'preference_custody_v40_compiler', source_event_ids: [`${manifest.manifest_id}:frontier`], payload: { identification_requirement: manifest.identification_requirement, real_case_requires: requirements } });
  push({ event_id: `${manifest.manifest_id}:interpretation`, event_type: 'interpretation_sealed', evidence_class: 'candidate_inference', authority: 'preference_custody_v40_analyst', source_event_ids: [`${manifest.manifest_id}:promotion`], payload: { allowed_interpretation: 'qualified forty-two-control synthetic Preference Custody floor', graph_effect: 'none', real_world_evidence_state: 'none' } });
  return events;
}

export function validatePreferenceCustodyManifestV40(manifest) {
  const errors = [];
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V40_SCHEMA_VERSION) errors.push('v40 schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v40') errors.push('v40 manifest identity mismatch');
  if (manifest?.issue !== 594 || manifest?.control_issue !== 918) errors.push('v40 issue custody mismatch');
  if (manifest?.status !== 'synthetic_control_floor_extension' || manifest?.graph_effect !== 'none') errors.push('v40 status or graph effect mismatch');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v40 thesis evidence', errors);
  const base = object(manifest?.base_floor);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v39' || base.source_manifest_path !== 'data/research/preference-custody/control-manifest-v39.json' || base.expected_build_schema !== 'preference-custody-control-manifest-v39-build@1' || base.expected_control_count !== 41) errors.push('v40 base floor contract mismatch');
  const extension = object(manifest?.extension_control);
  if (extension.control_id !== 'PC-42' || extension.fixture_id !== 'same-linkage-scores-calibrated-status-different-operational-states-v1' || extension.failure_class !== 'linkage_score_calibration_threshold_abstention_ambiguity_adjudication_falsification_error_and_lineage_equifinality' || extension.source_fixture_path !== 'data/research/preference-custody/linkage-score-calibration-assurance.fixture.json' || extension.build_artifact_path !== 'build/research/preference-linkage-score-calibration-assurance.json' || extension.expected_build_schema !== 'preference-linkage-score-calibration-assurance-build@1') errors.push('v40 extension contract mismatch');
  if (unique(extension.required_refusal_rules).length !== 21) errors.push('v40 refusal-rule contract must contain twenty-one unique rules');
  if (manifest?.identification_requirement?.stage !== 'feature_model_validation_calibration_threshold_abstention_ambiguity_adjudication_falsification_subgroup_error_and_lineage') errors.push('v40 identification stage mismatch');
  if (manifest?.frontier_transition?.resolved_base_frontier !== RESOLVED_FRONTIER) errors.push('v40 resolved frontier mismatch');
  if (!sameMembers(manifest?.frontier_transition?.successor_frontiers, REQUIRED_SUCCESSORS)) errors.push('v40 successor frontier mismatch');
  if (unique(manifest?.real_case_requirements_added).length !== 48) errors.push('v40 must add exactly forty-eight unique real-case requirements');
  for (const item of array(manifest?.real_case_requirements_added)) if (!/^[a-z0-9_]+$/.test(item)) errors.push(`invalid v40 requirement: ${item}`);
  if (array(manifest?.prohibited_inferences).length < 18) errors.push('v40 prohibited-inference ledger incomplete');
  if (manifest?.interpretation_contract?.contract_id !== PREFERENCE_CUSTODY_MANIFEST_V40_SCHEMA_VERSION || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v40 interpretation contract incomplete');
  return errors;
}

function validateBaseSources(baseBuild, baseSources) {
  if (!baseSources) return ['v40 base source bundle is required'];
  return validatePreferenceCustodyManifestV39Build(
    baseBuild,
    baseSources.manifest,
    baseSources.baseBuild,
    baseSources.candidateBuild,
    baseSources.candidateFixture,
    baseSources.baseSources
  );
}

export function compilePreferenceCustodyManifestV40(manifest, baseBuild, scoreBuild, scoreFixture, baseSources) {
  const errors = validatePreferenceCustodyManifestV40(manifest);
  if (errors.length) throw new Error(`invalid v40 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validateBaseSources(baseBuild, baseSources);
  if (baseErrors.length) throw new Error(`invalid v39 base:\n- ${baseErrors.join('\n- ')}`);
  const scoreErrors = validatePreferenceLinkageScoreCalibrationAssuranceBuild(scoreBuild, scoreFixture);
  if (scoreErrors.length) throw new Error(`invalid PC-42 build:\n- ${scoreErrors.join('\n- ')}`);
  if (baseBuild.control_count !== 41 || baseBuild.manifest_id !== 'preference-custody-laboratory-floor-v39') throw new Error('v40 base identity mismatch');
  const baseOpen = unique(baseBuild.open_frontiers);
  if (!baseOpen.includes(RESOLVED_FRONTIER)) throw new Error('v40 base does not contain the resolved linkage-score frontier');
  const requiredRules = manifest.extension_control.required_refusal_rules;
  const control = {
    control_id: 'PC-42',
    fixture_id: scoreBuild.fixture_id,
    failure_class: manifest.extension_control.failure_class,
    source_fixture_path: manifest.extension_control.source_fixture_path,
    build_artifact_path: manifest.extension_control.build_artifact_path,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_effect_claimed: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    required_refusal_rules: [...requiredRules],
    observed_refusal_rules: [...scoreBuild.required_refusal_rules],
    proof_summary: { ...scoreBuild.metrics, ...scoreBuild.classification }
  };
  const openFrontiers = unique([...baseOpen.filter(frontier => frontier !== RESOLVED_FRONTIER), ...manifest.frontier_transition.successor_frontiers]);
  const baseRequirements = unique(baseBuild.promotion_boundary.real_case_requires);
  const requirements = unique([...baseRequirements, ...manifest.real_case_requirements_added]);
  if (requirements.length - baseRequirements.length !== 48) throw new Error('v40 requirement extension is not exactly forty-eight');
  const controls = [...baseBuild.controls, control];
  const custody = chain(manifest, baseBuild, control, openFrontiers, requirements);
  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V40_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v40_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    control_count: controls.length,
    controls,
    composition: {
      base_manifest_id: baseBuild.manifest_id,
      base_schema_version: baseBuild.schema_version,
      base_control_count: baseBuild.control_count,
      extension_control_id: 'PC-42',
      base_floor_snapshot_sha256: sha256(baseBuild),
      extension_snapshot_sha256: sha256(scoreBuild),
      base_controls_sha256: sha256(baseBuild.controls),
      base_promotion_requirements_sha256: sha256(baseRequirements),
      base_promotion_requirement_count: baseRequirements.length,
      added_promotion_requirement_count: requirements.length - baseRequirements.length,
      final_promotion_requirement_count: requirements.length,
      base_open_frontiers: [...baseOpen]
    },
    control_integrity: {
      base_floor_qualified: true,
      base_integrity_preserved: Object.values(baseBuild.control_integrity).every(Boolean),
      all_graph_effect_none: controls.every(item => item.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(item => item.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: true,
      no_preference_change_claim: true,
      no_intent_inference: true,
      all_required_pc42_refusal_rules_present: requiredRules.every(rule => scoreBuild.required_refusal_rules.includes(rule)),
      complete_linkage_score_assurance_path_preserved: scoreBuild.metrics.complete_linkage_score_assurance_worlds === 1
    },
    identification_requirements: [...baseBuild.identification_requirements, manifest.identification_requirement],
    refusal_rule_union: unique([...baseBuild.refusal_rule_union, ...scoreBuild.required_refusal_rules]),
    open_frontiers: openFrontiers,
    frontier_transition: manifest.frontier_transition,
    promotion_boundary: {
      ...baseBuild.promotion_boundary,
      promotion_requirement_count: requirements.length,
      real_case_requires: requirements,
      laboratory_controls_are_real_world_evidence: false
    },
    custody_chain: custody,
    custody_chain_head_sha256: custody.at(-1).event_sha256,
    prohibited_inferences: [...baseBuild.prohibited_inferences, ...manifest.prohibited_inferences],
    interpretation_contract: manifest.interpretation_contract
  };
}

function validateChain(compiled, errors) {
  const events = array(compiled?.custody_chain);
  if (events.length !== 5) errors.push('compiled v40 custody chain must contain five events');
  let previous = null; const seen = new Set();
  for (const event of events) {
    if (event?.previous_event_sha256 !== previous) errors.push('compiled v40 custody previous hash mismatch');
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push('compiled v40 custody source missing');
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push('compiled v40 custody event hash mismatch');
    if (text(event?.event_id)) seen.add(event.event_id);
    previous = event?.event_sha256;
  }
  if (previous !== compiled?.custody_chain_head_sha256) errors.push('compiled v40 custody head mismatch');
}

export function validatePreferenceCustodyManifestV40Build(compiled, manifest, baseBuild, scoreBuild, scoreFixture, baseSources) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V40_BUILD_SCHEMA_VERSION) errors.push('compiled v40 schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v40' || compiled?.control_issue !== 918) errors.push('compiled v40 identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v40_qualified' || compiled?.graph_effect !== 'none' || compiled?.real_world_evidence_state !== 'none') errors.push('compiled v40 status boundary mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v40 thesis evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v40 conclusion', errors);
  if (compiled?.control_count !== 42 || array(compiled?.controls).length !== 42 || !sameMembers(array(compiled?.controls).map(control => control?.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v40 must preserve forty-two exact controls');
  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v39' || composition.base_schema_version !== 'preference-custody-control-manifest-v39-build@1' || composition.base_control_count !== 41 || composition.extension_control_id !== 'PC-42') errors.push('compiled v40 composition identity mismatch');
  if (composition.base_promotion_requirement_count !== 1533 || composition.added_promotion_requirement_count !== 48 || composition.final_promotion_requirement_count !== 1581) errors.push('compiled v40 promotion counts mismatch');
  for (const key of ['base_floor_snapshot_sha256', 'extension_snapshot_sha256', 'base_controls_sha256', 'base_promotion_requirements_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v40 invalid hash: ${key}`);
  if (!manifest) errors.push('compiled v40 manifest source is required');
  if (!baseBuild) errors.push('compiled v40 base source is required');
  if (!scoreBuild) errors.push('compiled v40 PC-42 source is required');
  if (!scoreFixture) errors.push('compiled v40 PC-42 fixture source is required');
  if (!baseSources) errors.push('compiled v40 transitive base source bundle is required');
  if (manifest && baseBuild && scoreBuild && scoreFixture && baseSources) {
    const manifestErrors = validatePreferenceCustodyManifestV40(manifest);
    if (manifestErrors.length) errors.push(...manifestErrors.map(error => `compiled v40 manifest source invalid: ${error}`));
    const baseErrors = validateBaseSources(baseBuild, baseSources);
    if (baseErrors.length) errors.push(...baseErrors.map(error => `compiled v40 base source invalid: ${error}`));
    const scoreErrors = validatePreferenceLinkageScoreCalibrationAssuranceBuild(scoreBuild, scoreFixture);
    if (scoreErrors.length) errors.push(...scoreErrors.map(error => `compiled v40 PC-42 source invalid: ${error}`));
    if (!manifestErrors.length && !baseErrors.length && !scoreErrors.length) {
      try {
        const expectedBuild = compilePreferenceCustodyManifestV40(manifest, baseBuild, scoreBuild, scoreFixture, baseSources);
        if (composition.base_floor_snapshot_sha256 !== sha256(baseBuild)) errors.push('compiled v40 base floor snapshot hash mismatch');
        if (composition.extension_snapshot_sha256 !== sha256(scoreBuild)) errors.push('compiled v40 extension snapshot hash mismatch');
        if (stable(compiled) !== stable(expectedBuild)) errors.push('compiled v40 build does not deterministically reconstruct from supplied sources');
      } catch (error) {
        errors.push(`compiled v40 source reconstruction failed: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
  }
  const controls = array(compiled?.controls);
  const compiledBaseControls = controls.slice(0, 41);
  if (baseBuild) {
    if (stable(compiledBaseControls) !== stable(baseBuild.controls)) errors.push('compiled v40 preserved base controls mismatch');
    if (composition.base_controls_sha256 !== sha256(baseBuild.controls)) errors.push('compiled v40 preserved base control hash mismatch');
    const baseRequirements = unique(baseBuild.promotion_boundary?.real_case_requires);
    if (composition.base_promotion_requirements_sha256 !== sha256(baseRequirements)) errors.push('compiled v40 preserved base requirement hash mismatch');
    if (stable(array(compiled?.promotion_boundary?.real_case_requires).slice(0, baseRequirements.length)) !== stable(baseRequirements)) errors.push('compiled v40 preserved base requirements mismatch');
  }
  const pc42 = controls.at(-1);
  if (pc42?.control_id !== 'PC-42' || pc42?.fixture_id !== 'same-linkage-scores-calibrated-status-different-operational-states-v1') errors.push('compiled v40 PC-42 identity mismatch');
  if (pc42?.graph_effect !== 'none' || pc42?.counts_toward_thesis_evidence !== false || pc42?.conclusion_generated !== false) errors.push('compiled v40 PC-42 boundary mismatch');
  for (const [key, expected] of Object.entries(EXPECTED_LINKAGE_SCORE_METRICS)) if (pc42?.proof_summary?.[key] !== expected) errors.push(`compiled v40 PC-42 metric mismatch: ${key}`);
  for (const key of FALSE_CLASSIFICATIONS) requireFalse(pc42?.proof_summary?.[key], `compiled v40 PC-42 classification.${key}`, errors);
  if (pc42?.proof_summary?.[TRUE_CLASSIFICATION] !== true) errors.push('compiled v40 PC-42 complete assurance path missing');
  for (const value of Object.values(object(compiled?.control_integrity))) if (value !== true) errors.push('compiled v40 control integrity incomplete');
  const expectedOpen = unique([...array(composition.base_open_frontiers).filter(frontier => frontier !== RESOLVED_FRONTIER), ...REQUIRED_SUCCESSORS]);
  if (!sameMembers(compiled?.open_frontiers, expectedOpen)) errors.push('compiled v40 open frontier mismatch');
  if (array(compiled?.open_frontiers).includes(RESOLVED_FRONTIER)) errors.push('compiled v40 retained resolved linkage-score frontier');
  if (!REQUIRED_SUCCESSORS.every(frontier => array(compiled?.open_frontiers).includes(frontier))) errors.push('compiled v40 successor frontier missing');
  if (compiled?.promotion_boundary?.promotion_requirement_count !== 1581 || unique(compiled?.promotion_boundary?.real_case_requires).length !== 1581 || compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence !== false) errors.push('compiled v40 promotion boundary mismatch');
  validateChain(compiled, errors);
  return errors;
}

export function renderPreferenceCustodyManifestV40Markdown(compiled) {
  const pc42 = compiled.controls.at(-1);
  return [
    '# Preference Custody laboratory floor v40',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Controls:** ${compiled.control_count}`,
    '',
    `**Promotion requirements:** ${compiled.promotion_boundary.promotion_requirement_count}`,
    '',
    '> Floor v40 preserves all forty-one qualified v39 controls and adds source-bound PC-42 linkage-score calibration, threshold, abstention, ambiguity, adjudication, falsification, subgroup-error, correction, lineage, and authority custody.',
    '',
    '## PC-42 proof summary',
    '',
    ...Object.entries(pc42.proof_summary).map(([key, value]) => `- ${key}: ${value}`),
    '',
    '## Claim boundary',
    '',
    'This synthetic floor creates no real identity map, match probability, calibration estimate, error rate, exposure trajectory, causal conclusion, graph fact, named-actor finding, or public-authority verdict.',
    ''
  ].join('\n');
}
