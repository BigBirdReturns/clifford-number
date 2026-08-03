import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV37Build } from './preference-custody-manifest-v37.mjs';
import {
  EXPECTED_LINKAGE_CONFIDENCE_METRICS,
  validatePreferenceLinkageConfidenceAdjudicationAssuranceBuild
} from './preference-linkage-confidence-adjudication-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V38_SCHEMA_VERSION = 'preference-custody-control-manifest-v38@1';
export const PREFERENCE_CUSTODY_MANIFEST_V38_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v38-build@1';
const REQUIRED_CONTROL_IDS = Array.from({ length: 40 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`);
const RESOLVED_FRONTIER = 'cross_source_linkage_confidence_ambiguity_adjudication_and_falsification_governance';
const REQUIRED_SUCCESSORS = [
  'candidate_pair_blocking_recall_search_space_and_missed_match_assurance',
  'linkage_score_calibration_threshold_ambiguity_adjudication_falsification_and_error_governance'
];
const FALSE_CLASSIFICATIONS = [
  "one_hundred_published_candidate_pairs_identifies_complete_candidate_pair_search_space",
  "one_hundred_percent_linkage_coverage_identifies_complete_blocking_recall_and_zero_hidden_missed_matches",
  "one_hundred_percent_high_confidence_coverage_identifies_calibrated_confidence",
  "zero_published_false_match_rate_identifies_zero_true_false_positive_linkage",
  "zero_published_missed_match_rate_identifies_zero_true_false_negative_linkage",
  "zero_published_ambiguous_pairs_identifies_complete_ambiguity_preservation_and_adjudication",
  "highest_score_identifies_one_true_match",
  "deterministic_threshold_identifies_calibrated_uncertainty_and_abstention",
  "force_resolved_multi_candidate_linkage_identifies_resolved_ambiguity",
  "clerical_review_identifies_independent_adjudication",
  "reviewer_agreement_identifies_correct_ground_truth",
  "linkage_derived_labels_identify_independent_ground_truth",
  "correlated_source_features_identify_independent_corroboration",
  "aggregate_calibration_identifies_subgroup_source_geography_and_time_calibration",
  "failed_negative_controls_or_falsification_identify_valid_confidence_after_threshold_selection",
  "historical_confidence_assurance_identifies_current_assurance_after_succession",
  "public_linkage_confidence_verified_status_identifies_complete_current_correctable_authorized_evidence",
  "linkage_confidence_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
  "binding_public_authority_supported",
  "manipulative_intent_inferable",
  "real_world_effect_claimed",
  "graph_effect_present",
  "preference_change_present"
];
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
  push({ event_id: `${manifest.manifest_id}:base`, event_type: 'qualified_v37_floor_snapshot', evidence_class: 'compiled_synthetic_control_floor', authority: 'preference_custody_v37_compiler', source_event_ids: [], payload: { manifest_id: base.manifest_id, schema_version: base.schema_version, control_count: base.control_count, snapshot_sha256: sha256(base) } });
  push({ event_id: `${manifest.manifest_id}:pc40`, event_type: 'pc40_linkage_confidence_ambiguity_adjudication_and_falsification_control_admitted', evidence_class: 'compiled_synthetic_control', authority: 'linkage_confidence_adjudication_compiler', source_event_ids: [`${manifest.manifest_id}:base`], payload: { control, snapshot_sha256: sha256(control) } });
  push({ event_id: `${manifest.manifest_id}:frontier`, event_type: 'linkage_confidence_adjudication_frontier_transition_sealed', evidence_class: 'laboratory_frontier_contract', authority: 'preference_custody_v38_compiler', source_event_ids: [`${manifest.manifest_id}:pc40`], payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers } });
  push({ event_id: `${manifest.manifest_id}:promotion`, event_type: 'linkage_confidence_real_case_promotion_boundary_sealed', evidence_class: 'laboratory_promotion_contract', authority: 'preference_custody_v38_compiler', source_event_ids: [`${manifest.manifest_id}:frontier`], payload: { identification_requirement: manifest.identification_requirement, real_case_requires: requirements } });
  push({ event_id: `${manifest.manifest_id}:interpretation`, event_type: 'interpretation_sealed', evidence_class: 'candidate_inference', authority: 'preference_custody_v38_analyst', source_event_ids: [`${manifest.manifest_id}:promotion`], payload: { allowed_interpretation: 'qualified forty-control synthetic Preference Custody floor', graph_effect: 'none', real_world_evidence_state: 'none' } });
  return events;
}

export function validatePreferenceCustodyManifestV38(manifest) {
  const errors = [];
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V38_SCHEMA_VERSION) errors.push('v38 schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v38') errors.push('v38 manifest identity mismatch');
  if (manifest?.issue !== 594 || manifest?.control_issue !== 881) errors.push('v38 issue custody mismatch');
  if (manifest?.status !== 'synthetic_control_floor_extension' || manifest?.graph_effect !== 'none') errors.push('v38 status or graph effect mismatch');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v38 thesis evidence', errors);
  const base = object(manifest?.base_floor);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v37' || base.source_manifest_path !== 'data/research/preference-custody/control-manifest-v37.json' || base.expected_build_schema !== 'preference-custody-control-manifest-v37-build@1' || base.expected_control_count !== 39) errors.push('v38 base floor contract mismatch');
  const extension = object(manifest?.extension_control);
  if (extension.control_id !== 'PC-40' || extension.fixture_id !== 'same-linkage-confidence-verified-status-different-operational-states-v1' || extension.failure_class !== 'cross_source_candidate_generation_linkage_confidence_calibration_ambiguity_adjudication_falsification_subgroup_error_and_lineage_equifinality' || extension.source_fixture_path !== 'data/research/preference-custody/linkage-confidence-adjudication-assurance.fixture.json' || extension.build_artifact_path !== 'build/research/preference-linkage-confidence-adjudication-assurance.json' || extension.expected_build_schema !== 'preference-linkage-confidence-adjudication-assurance-build@1') errors.push('v38 extension contract mismatch');
  if (unique(extension.required_refusal_rules).length !== 19) errors.push('v38 refusal-rule contract must contain nineteen unique rules');
  if (manifest?.identification_requirement?.stage !== 'candidate_generation_linkage_confidence_calibration_ambiguity_adjudication_falsification_subgroup_error_and_lineage') errors.push('v38 identification stage mismatch');
  if (manifest?.frontier_transition?.resolved_base_frontier !== RESOLVED_FRONTIER) errors.push('v38 resolved frontier mismatch');
  if (!sameMembers(manifest?.frontier_transition?.successor_frontiers, REQUIRED_SUCCESSORS)) errors.push('v38 successor frontier mismatch');
  if (unique(manifest?.real_case_requirements_added).length !== 48) errors.push('v38 must add exactly forty-eight unique real-case requirements');
  for (const item of array(manifest?.real_case_requirements_added)) if (!/^[a-z0-9_]+$/.test(item)) errors.push(`invalid v38 requirement: ${item}`);
  if (array(manifest?.prohibited_inferences).length < 18) errors.push('v38 prohibited-inference ledger incomplete');
  if (manifest?.interpretation_contract?.contract_id !== PREFERENCE_CUSTODY_MANIFEST_V38_SCHEMA_VERSION || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v38 interpretation contract incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV38(manifest, baseBuild, confidenceBuild, confidenceFixture) {
  const errors = validatePreferenceCustodyManifestV38(manifest);
  if (errors.length) throw new Error(`invalid v38 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV37Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v37 base:\n- ${baseErrors.join('\n- ')}`);
  const confidenceErrors = validatePreferenceLinkageConfidenceAdjudicationAssuranceBuild(confidenceBuild, confidenceFixture);
  if (confidenceErrors.length) throw new Error(`invalid PC-40 build:\n- ${confidenceErrors.join('\n- ')}`);
  if (baseBuild.control_count !== 39 || baseBuild.manifest_id !== 'preference-custody-laboratory-floor-v37') throw new Error('v38 base identity mismatch');
  const baseOpen = unique(baseBuild.open_frontiers);
  if (!baseOpen.includes(RESOLVED_FRONTIER)) throw new Error('v38 base does not contain the resolved linkage-confidence frontier');
  const requiredRules = manifest.extension_control.required_refusal_rules;
  const control = {
    control_id: 'PC-40',
    fixture_id: confidenceBuild.fixture_id,
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
    observed_refusal_rules: [...confidenceBuild.required_refusal_rules],
    proof_summary: { ...confidenceBuild.metrics, ...confidenceBuild.classification }
  };
  const openFrontiers = unique([...baseOpen.filter(frontier => frontier !== RESOLVED_FRONTIER), ...manifest.frontier_transition.successor_frontiers]);
  const baseRequirements = unique(baseBuild.promotion_boundary.real_case_requires);
  const requirements = unique([...baseRequirements, ...manifest.real_case_requirements_added]);
  if (requirements.length - baseRequirements.length !== 48) throw new Error('v38 requirement extension is not exactly forty-eight');
  const controls = [...baseBuild.controls, control];
  const custody = chain(manifest, baseBuild, control, openFrontiers, requirements);
  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V38_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v38_qualified',
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
      extension_control_id: 'PC-40',
      base_floor_snapshot_sha256: sha256(baseBuild),
      extension_snapshot_sha256: sha256(confidenceBuild),
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
      all_required_pc40_refusal_rules_present: requiredRules.every(rule => confidenceBuild.required_refusal_rules.includes(rule)),
      complete_linkage_confidence_assurance_path_preserved: confidenceBuild.metrics.complete_linkage_confidence_assurance_worlds === 1
    },
    identification_requirements: [...baseBuild.identification_requirements, manifest.identification_requirement],
    refusal_rule_union: unique([...baseBuild.refusal_rule_union, ...confidenceBuild.required_refusal_rules]),
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
  if (events.length !== 5) errors.push('compiled v38 custody chain must contain five events');
  let previous = null; const seen = new Set();
  for (const event of events) {
    if (event?.previous_event_sha256 !== previous) errors.push('compiled v38 custody previous hash mismatch');
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push('compiled v38 custody source missing');
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push('compiled v38 custody event hash mismatch');
    if (text(event?.event_id)) seen.add(event.event_id);
    previous = event?.event_sha256;
  }
  if (previous !== compiled?.custody_chain_head_sha256) errors.push('compiled v38 custody head mismatch');
}

export function validatePreferenceCustodyManifestV38Build(compiled, manifest, baseBuild, confidenceBuild, confidenceFixture) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V38_BUILD_SCHEMA_VERSION) errors.push('compiled v38 schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v38' || compiled?.control_issue !== 881) errors.push('compiled v38 identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v38_qualified' || compiled?.graph_effect !== 'none' || compiled?.real_world_evidence_state !== 'none') errors.push('compiled v38 status boundary mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v38 thesis evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v38 conclusion', errors);
  if (compiled?.control_count !== 40 || array(compiled?.controls).length !== 40 || !sameMembers(array(compiled?.controls).map(control => control?.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v38 must preserve forty exact controls');
  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v37' || composition.base_schema_version !== 'preference-custody-control-manifest-v37-build@1' || composition.base_control_count !== 39 || composition.extension_control_id !== 'PC-40') errors.push('compiled v38 composition identity mismatch');
  if (composition.base_promotion_requirement_count !== 1437 || composition.added_promotion_requirement_count !== 48 || composition.final_promotion_requirement_count !== 1485) errors.push('compiled v38 promotion counts mismatch');
  for (const key of ['base_floor_snapshot_sha256', 'extension_snapshot_sha256', 'base_controls_sha256', 'base_promotion_requirements_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v38 invalid hash: ${key}`);
  if (!manifest) errors.push('compiled v38 manifest source is required');
  if (!baseBuild) errors.push('compiled v38 base source is required');
  if (!confidenceBuild) errors.push('compiled v38 PC-40 source is required');
  if (!confidenceFixture) errors.push('compiled v38 PC-40 fixture source is required');
  if (manifest && baseBuild && confidenceBuild && confidenceFixture) {
    try {
      const expectedBuild = compilePreferenceCustodyManifestV38(manifest, baseBuild, confidenceBuild, confidenceFixture);
      if (composition.base_floor_snapshot_sha256 !== sha256(baseBuild)) errors.push('compiled v38 base floor snapshot hash mismatch');
      if (composition.extension_snapshot_sha256 !== sha256(confidenceBuild)) errors.push('compiled v38 extension snapshot hash mismatch');
      if (stable(compiled) !== stable(expectedBuild)) errors.push('compiled v38 build does not deterministically reconstruct from supplied sources');
    } catch (error) {
      errors.push(`compiled v38 source reconstruction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const compiledBaseControls = array(compiled?.controls).slice(0, 39);
  if (composition.base_controls_sha256 !== sha256(compiledBaseControls)) errors.push('compiled v38 base controls hash mismatch');
  const compiledBaseRequirements = unique(array(compiled?.promotion_boundary?.real_case_requires).slice(0, 1437));
  if (composition.base_promotion_requirements_sha256 !== sha256(compiledBaseRequirements)) errors.push('compiled v38 base promotion requirements hash mismatch');
  const expectedOpen = unique([...array(composition.base_open_frontiers).filter(frontier => frontier !== RESOLVED_FRONTIER), ...REQUIRED_SUCCESSORS]);
  if (!sameMembers(compiled?.open_frontiers, expectedOpen)) errors.push('compiled v38 open-frontier preservation mismatch');
  if (array(compiled?.open_frontiers).includes(RESOLVED_FRONTIER)) errors.push('compiled v38 retained resolved linkage-confidence frontier');
  const integrity = object(compiled?.control_integrity);
  for (const key of ['base_floor_qualified', 'base_integrity_preserved', 'all_graph_effect_none', 'no_thesis_evidence_consumption', 'no_real_world_conclusion', 'no_preference_change_claim', 'no_intent_inference', 'all_required_pc40_refusal_rules_present', 'complete_linkage_confidence_assurance_path_preserved']) if (integrity[key] !== true) errors.push(`compiled v38 integrity failed: ${key}`);
  const control = array(compiled?.controls).find(item => item?.control_id === 'PC-40');
  if (!control) errors.push('compiled v38 PC-40 missing');
  else {
    for (const [key, value] of Object.entries(EXPECTED_LINKAGE_CONFIDENCE_METRICS)) if (control?.proof_summary?.[key] !== value) errors.push(`PC-40 metric mismatch: ${key}`);
    for (const key of FALSE_CLASSIFICATIONS) requireFalse(control?.proof_summary?.[key], `PC-40 classification.${key}`, errors);
    if (control?.proof_summary?.complete_linkage_confidence_assurance_supported_in_at_least_one_world !== true) errors.push('PC-40 complete path missing');
    if (control?.graph_effect !== 'none' || control?.counts_toward_thesis_evidence !== false || control?.conclusion_generated !== false || control?.real_world_effect_claimed !== false || control?.preference_change_present !== false || control?.manipulative_intent_inferable !== false) errors.push('PC-40 authority boundary mismatch');
  }
  if (compiled?.promotion_boundary?.promotion_requirement_count !== 1485 || unique(compiled?.promotion_boundary?.real_case_requires).length !== 1485 || compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence !== false) errors.push('compiled v38 promotion boundary mismatch');
  validateChain(compiled, errors);
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v38 caveat missing');
  return errors;
}

export function renderPreferenceCustodyManifestV38Markdown(compiled) {
  const control = compiled.controls.find(item => item.control_id === 'PC-40');
  const lines = [
    '# Preference Custody laboratory floor v38',
    '',
    `**Status:** ${compiled.status}`,
    '',
    `**Controls:** ${compiled.control_count}`,
    '',
    `**Promotion requirements:** ${compiled.promotion_boundary.promotion_requirement_count}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    `> ${compiled.interpretation_contract.copy_ready_caveat}`,
    '',
    '## PC-40 proof summary',
    ''
  ];
  for (const [key, value] of Object.entries(control.proof_summary)) if (typeof value !== 'object') lines.push(`- ${key}: ${value}`);
  lines.push('', '## Open frontiers', '');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  return `${lines.join('\n')}\n`;
}
