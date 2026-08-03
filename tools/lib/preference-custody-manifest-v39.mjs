import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV38Build } from './preference-custody-manifest-v38.mjs';
import { EXPECTED_CANDIDATE_SEARCH_METRICS, validatePreferenceCandidatePairBlockingRecallAssuranceBuild } from './preference-candidate-pair-blocking-recall-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V39_SCHEMA_VERSION = 'preference-custody-control-manifest-v39@1';
export const PREFERENCE_CUSTODY_MANIFEST_V39_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v39-build@1';
const REQUIRED_CONTROL_IDS = Array.from({ length: 41 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`);
const RESOLVED_FRONTIER = 'candidate_pair_blocking_recall_search_space_and_missed_match_assurance';
const REQUIRED_SUCCESSORS = [
  "eligible_pair_universe_source_combination_denominator_and_exclusion_assurance",
  "blocking_key_normalization_partition_candidate_cap_recall_audit_alternate_search_and_missed_match_governance"
];
const FALSE_CLASSIFICATIONS = [
  "one_hundred_published_eligible_pairs_identifies_complete_eligible_pair_universe",
  "one_hundred_published_candidate_pairs_identifies_complete_search_space",
  "one_hundred_percent_published_blocking_recall_identifies_true_blocking_recall",
  "zero_published_omitted_pairs_identifies_zero_hidden_omissions",
  "zero_published_missed_matches_identifies_zero_true_missed_matches",
  "four_source_systems_identifies_complete_source_combination_coverage",
  "deterministic_blocking_keys_identify_recall_preservation",
  "normalization_pipeline_identifies_rare_noisy_transliterated_versioned_and_missing_identifier_coverage",
  "partition_canopy_window_or_top_k_rule_identifies_complete_candidate_recall",
  "candidate_cap_budget_cost_or_early_stop_identifies_admissible_pruning",
  "omitted_pair_ledger_identifies_complete_independent_review",
  "force_classified_nonmatches_identify_adjudicated_omissions",
  "aggregate_recall_identifies_subgroup_source_pair_geography_and_time_recall",
  "candidate_rule_labels_identify_independent_recall_ground_truth",
  "alternate_search_recovery_identifies_complete_search_assurance",
  "failed_falsification_identifies_valid_search_after_rule_selection",
  "historical_candidate_search_assurance_identifies_current_assurance_after_succession",
  "public_candidate_search_verified_status_identifies_complete_current_correctable_authorized_evidence",
  "candidate_search_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent",
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
  push({ event_id: `${manifest.manifest_id}:base`, event_type: 'qualified_v38_floor_snapshot', evidence_class: 'compiled_synthetic_control_floor', authority: 'preference_custody_v38_compiler', source_event_ids: [], payload: { manifest_id: base.manifest_id, schema_version: base.schema_version, control_count: base.control_count, snapshot_sha256: sha256(base) } });
  push({ event_id: `${manifest.manifest_id}:pc41`, event_type: 'pc41_candidate_pair_blocking_recall_control_admitted', evidence_class: 'compiled_synthetic_control', authority: 'candidate_pair_blocking_recall_compiler', source_event_ids: [`${manifest.manifest_id}:base`], payload: { control, snapshot_sha256: sha256(control) } });
  push({ event_id: `${manifest.manifest_id}:frontier`, event_type: 'candidate_pair_search_frontier_transition_sealed', evidence_class: 'laboratory_frontier_contract', authority: 'preference_custody_v39_compiler', source_event_ids: [`${manifest.manifest_id}:pc41`], payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers } });
  push({ event_id: `${manifest.manifest_id}:promotion`, event_type: 'candidate_search_real_case_promotion_boundary_sealed', evidence_class: 'laboratory_promotion_contract', authority: 'preference_custody_v39_compiler', source_event_ids: [`${manifest.manifest_id}:frontier`], payload: { identification_requirement: manifest.identification_requirement, real_case_requires: requirements } });
  push({ event_id: `${manifest.manifest_id}:interpretation`, event_type: 'interpretation_sealed', evidence_class: 'candidate_inference', authority: 'preference_custody_v39_analyst', source_event_ids: [`${manifest.manifest_id}:promotion`], payload: { allowed_interpretation: 'qualified forty-one-control synthetic Preference Custody floor', graph_effect: 'none', real_world_evidence_state: 'none' } });
  return events;
}

export function validatePreferenceCustodyManifestV39(manifest) {
  const errors = [];
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V39_SCHEMA_VERSION) errors.push('v39 schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v39') errors.push('v39 manifest identity mismatch');
  if (manifest?.issue !== 594 || manifest?.control_issue !== 907) errors.push('v39 issue custody mismatch');
  if (manifest?.status !== 'synthetic_control_floor_extension' || manifest?.graph_effect !== 'none') errors.push('v39 status or graph effect mismatch');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v39 thesis evidence', errors);
  const base = object(manifest?.base_floor);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v38' || base.source_manifest_path !== 'data/research/preference-custody/control-manifest-v38.json' || base.expected_build_schema !== 'preference-custody-control-manifest-v38-build@1' || base.expected_control_count !== 40) errors.push('v39 base floor contract mismatch');
  const extension = object(manifest?.extension_control);
  if (extension.control_id !== 'PC-41' || extension.fixture_id !== 'same-candidate-search-verified-status-different-operational-states-v1' || extension.failure_class !== 'eligible_pair_universe_source_combination_blocking_partition_candidate_cap_recall_audit_alternate_search_missed_match_and_lineage_equifinality' || extension.source_fixture_path !== 'data/research/preference-custody/candidate-pair-blocking-recall-assurance.fixture.json' || extension.build_artifact_path !== 'build/research/preference-candidate-pair-blocking-recall-assurance.json' || extension.expected_build_schema !== 'preference-candidate-pair-blocking-recall-assurance-build@1') errors.push('v39 extension contract mismatch');
  if (unique(extension.required_refusal_rules).length !== 19) errors.push('v39 refusal-rule contract must contain nineteen unique rules');
  if (manifest?.identification_requirement?.stage !== 'eligible_pair_universe_source_combination_blocking_partition_resource_recall_audit_alternate_search_missed_match_and_lineage') errors.push('v39 identification stage mismatch');
  if (manifest?.frontier_transition?.resolved_base_frontier !== RESOLVED_FRONTIER) errors.push('v39 resolved frontier mismatch');
  if (!sameMembers(manifest?.frontier_transition?.successor_frontiers, REQUIRED_SUCCESSORS)) errors.push('v39 successor frontier mismatch');
  if (unique(manifest?.real_case_requirements_added).length !== 48) errors.push('v39 must add exactly forty-eight unique real-case requirements');
  for (const item of array(manifest?.real_case_requirements_added)) if (!/^[a-z0-9_]+$/.test(item)) errors.push(`invalid v39 requirement: ${item}`);
  if (array(manifest?.prohibited_inferences).length < 18) errors.push('v39 prohibited-inference ledger incomplete');
  if (manifest?.interpretation_contract?.contract_id !== PREFERENCE_CUSTODY_MANIFEST_V39_SCHEMA_VERSION || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v39 interpretation contract incomplete');
  return errors;
}

function validateBaseSources(baseBuild, baseSources) {
  if (!baseSources) return ['v39 base source bundle is required'];
  return validatePreferenceCustodyManifestV38Build(baseBuild, baseSources.manifest, baseSources.baseBuild, baseSources.confidenceBuild, baseSources.confidenceFixture);
}

export function compilePreferenceCustodyManifestV39(manifest, baseBuild, candidateBuild, candidateFixture, baseSources) {
  const errors = validatePreferenceCustodyManifestV39(manifest);
  if (errors.length) throw new Error(`invalid v39 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validateBaseSources(baseBuild, baseSources);
  if (baseErrors.length) throw new Error(`invalid v38 base:\n- ${baseErrors.join('\n- ')}`);
  const candidateErrors = validatePreferenceCandidatePairBlockingRecallAssuranceBuild(candidateBuild, candidateFixture);
  if (candidateErrors.length) throw new Error(`invalid PC-41 build:\n- ${candidateErrors.join('\n- ')}`);
  if (baseBuild.control_count !== 40 || baseBuild.manifest_id !== 'preference-custody-laboratory-floor-v38') throw new Error('v39 base identity mismatch');
  const baseOpen = unique(baseBuild.open_frontiers);
  if (!baseOpen.includes(RESOLVED_FRONTIER)) throw new Error('v39 base does not contain the resolved candidate-pair frontier');
  const requiredRules = manifest.extension_control.required_refusal_rules;
  const control = {
    control_id: 'PC-41',
    fixture_id: candidateBuild.fixture_id,
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
    observed_refusal_rules: [...candidateBuild.required_refusal_rules],
    proof_summary: { ...candidateBuild.metrics, ...candidateBuild.classification }
  };
  const openFrontiers = unique([...baseOpen.filter(frontier => frontier !== RESOLVED_FRONTIER), ...manifest.frontier_transition.successor_frontiers]);
  const baseRequirements = unique(baseBuild.promotion_boundary.real_case_requires);
  const requirements = unique([...baseRequirements, ...manifest.real_case_requirements_added]);
  if (requirements.length - baseRequirements.length !== 48) throw new Error('v39 requirement extension is not exactly forty-eight');
  const controls = [...baseBuild.controls, control];
  const custody = chain(manifest, baseBuild, control, openFrontiers, requirements);
  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V39_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v39_qualified',
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
      extension_control_id: 'PC-41',
      base_floor_snapshot_sha256: sha256(baseBuild),
      extension_snapshot_sha256: sha256(candidateBuild),
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
      all_required_pc41_refusal_rules_present: requiredRules.every(rule => candidateBuild.required_refusal_rules.includes(rule)),
      complete_candidate_search_assurance_path_preserved: candidateBuild.metrics.complete_candidate_search_assurance_worlds === 1
    },
    identification_requirements: [...baseBuild.identification_requirements, manifest.identification_requirement],
    refusal_rule_union: unique([...baseBuild.refusal_rule_union, ...candidateBuild.required_refusal_rules]),
    open_frontiers: openFrontiers,
    frontier_transition: manifest.frontier_transition,
    promotion_boundary: { ...baseBuild.promotion_boundary, promotion_requirement_count: requirements.length, real_case_requires: requirements, laboratory_controls_are_real_world_evidence: false },
    custody_chain: custody,
    custody_chain_head_sha256: custody.at(-1).event_sha256,
    prohibited_inferences: [...baseBuild.prohibited_inferences, ...manifest.prohibited_inferences],
    interpretation_contract: manifest.interpretation_contract
  };
}

function validateChain(compiled, errors) {
  const events = array(compiled?.custody_chain);
  if (events.length !== 5) errors.push('compiled v39 custody chain must contain five events');
  let previous = null; const seen = new Set();
  for (const event of events) {
    if (event?.previous_event_sha256 !== previous) errors.push('compiled v39 custody previous hash mismatch');
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push('compiled v39 custody source missing');
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push('compiled v39 custody event hash mismatch');
    if (text(event?.event_id)) seen.add(event.event_id);
    previous = event?.event_sha256;
  }
  if (previous !== compiled?.custody_chain_head_sha256) errors.push('compiled v39 custody head mismatch');
}

export function validatePreferenceCustodyManifestV39Build(compiled, manifest, baseBuild, candidateBuild, candidateFixture, baseSources) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V39_BUILD_SCHEMA_VERSION) errors.push('compiled v39 schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v39' || compiled?.control_issue !== 907) errors.push('compiled v39 identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v39_qualified' || compiled?.graph_effect !== 'none' || compiled?.real_world_evidence_state !== 'none') errors.push('compiled v39 status boundary mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v39 thesis evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v39 conclusion', errors);
  if (compiled?.control_count !== 41 || array(compiled?.controls).length !== 41 || !sameMembers(array(compiled?.controls).map(control => control?.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v39 must preserve forty-one exact controls');
  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v38' || composition.base_schema_version !== 'preference-custody-control-manifest-v38-build@1' || composition.base_control_count !== 40 || composition.extension_control_id !== 'PC-41') errors.push('compiled v39 composition identity mismatch');
  if (composition.base_promotion_requirement_count !== 1485 || composition.added_promotion_requirement_count !== 48 || composition.final_promotion_requirement_count !== 1533) errors.push('compiled v39 promotion counts mismatch');
  for (const key of ['base_floor_snapshot_sha256', 'extension_snapshot_sha256', 'base_controls_sha256', 'base_promotion_requirements_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v39 invalid hash: ${key}`);
  if (!manifest) errors.push('compiled v39 manifest source is required');
  if (!baseBuild) errors.push('compiled v39 base source is required');
  if (!candidateBuild) errors.push('compiled v39 PC-41 source is required');
  if (!candidateFixture) errors.push('compiled v39 PC-41 fixture source is required');
  if (!baseSources) errors.push('compiled v39 v38 source bundle is required');
  if (manifest && baseBuild && candidateBuild && candidateFixture && baseSources) {
    try {
      const expectedBuild = compilePreferenceCustodyManifestV39(manifest, baseBuild, candidateBuild, candidateFixture, baseSources);
      if (composition.base_floor_snapshot_sha256 !== sha256(baseBuild)) errors.push('compiled v39 base floor snapshot hash mismatch');
      if (composition.extension_snapshot_sha256 !== sha256(candidateBuild)) errors.push('compiled v39 extension snapshot hash mismatch');
      if (stable(compiled) !== stable(expectedBuild)) errors.push('compiled v39 build does not deterministically reconstruct from supplied sources');
    } catch (error) {
      errors.push(`compiled v39 source reconstruction failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
  const compiledBaseControls = array(compiled?.controls).slice(0, 40);
  if (composition.base_controls_sha256 !== sha256(compiledBaseControls)) errors.push('compiled v39 base controls hash mismatch');
  const compiledBaseRequirements = unique(array(compiled?.promotion_boundary?.real_case_requires).slice(0, 1485));
  if (composition.base_promotion_requirements_sha256 !== sha256(compiledBaseRequirements)) errors.push('compiled v39 base promotion requirements hash mismatch');
  const expectedOpen = unique([...array(composition.base_open_frontiers).filter(frontier => frontier !== RESOLVED_FRONTIER), ...REQUIRED_SUCCESSORS]);
  if (!sameMembers(compiled?.open_frontiers, expectedOpen)) errors.push('compiled v39 open-frontier preservation mismatch');
  if (array(compiled?.open_frontiers).includes(RESOLVED_FRONTIER)) errors.push('compiled v39 retained resolved candidate-pair frontier');
  if (!array(compiled?.open_frontiers).includes('linkage_score_calibration_threshold_ambiguity_adjudication_falsification_and_error_governance')) errors.push('compiled v39 lost independent linkage-score frontier');
  const integrity = object(compiled?.control_integrity);
  for (const key of ['base_floor_qualified', 'base_integrity_preserved', 'all_graph_effect_none', 'no_thesis_evidence_consumption', 'no_real_world_conclusion', 'no_preference_change_claim', 'no_intent_inference', 'all_required_pc41_refusal_rules_present', 'complete_candidate_search_assurance_path_preserved']) if (integrity[key] !== true) errors.push(`compiled v39 integrity failed: ${key}`);
  const control = array(compiled?.controls).find(item => item?.control_id === 'PC-41');
  if (!control) errors.push('compiled v39 PC-41 missing');
  else {
    for (const [key, value] of Object.entries(EXPECTED_CANDIDATE_SEARCH_METRICS)) if (control?.proof_summary?.[key] !== value) errors.push(`PC-41 metric mismatch: ${key}`);
    for (const key of FALSE_CLASSIFICATIONS) requireFalse(control?.proof_summary?.[key], `PC-41 classification.${key}`, errors);
    if (control?.proof_summary?.complete_candidate_search_assurance_supported_in_at_least_one_world !== true) errors.push('PC-41 complete path missing');
    if (control?.graph_effect !== 'none' || control?.counts_toward_thesis_evidence !== false || control?.conclusion_generated !== false || control?.real_world_effect_claimed !== false || control?.preference_change_present !== false || control?.manipulative_intent_inferable !== false) errors.push('PC-41 authority boundary mismatch');
  }
  if (compiled?.promotion_boundary?.promotion_requirement_count !== 1533 || unique(compiled?.promotion_boundary?.real_case_requires).length !== 1533 || compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence !== false) errors.push('compiled v39 promotion boundary mismatch');
  validateChain(compiled, errors);
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v39 caveat missing');
  return errors;
}

export function renderPreferenceCustodyManifestV39Markdown(compiled) {
  const control = compiled.controls.find(item => item.control_id === 'PC-41');
  const lines = ['# Preference Custody laboratory floor v39', '', `**Status:** ${compiled.status}`, '', `**Controls:** ${compiled.control_count}`, '', `**Promotion requirements:** ${compiled.promotion_boundary.promotion_requirement_count}`, '', `**Graph effect:** ${compiled.graph_effect}`, '', `> ${compiled.interpretation_contract.copy_ready_caveat}`, '', '## PC-41 proof summary', ''];
  for (const [key, value] of Object.entries(control.proof_summary)) if (typeof value !== 'object') lines.push(`- ${key}: ${value}`);
  lines.push('', '## Open frontiers', '');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  return `${lines.join('\n')}\n`;
}
