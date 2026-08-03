import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV33Build } from './preference-custody-manifest-v33.mjs';
import {
  EXPECTED_POPULATION_COVERAGE_TURNOVER_METRICS,
  FALSE_POPULATION_COVERAGE_TURNOVER_CLASSIFICATIONS,
  validatePreferencePopulationCoverageTurnoverAssuranceBuild,
} from './preference-population-coverage-turnover-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V34_SCHEMA_VERSION = 'preference-custody-control-manifest-v34@1';
export const PREFERENCE_CUSTODY_MANIFEST_V34_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v34-build@1';

const REQUIRED_SUCCESSOR_FRONTIERS = [
  'hard_to_enumerate_population_nonresponse_missingness_mechanism_and_external_frame_assurance',
  'population_entry_exit_migration_merger_split_reactivation_snapshot_alignment_and_turnover_governance',
];
const PRESERVED_FRONTIERS = [
  'identity_collision_fragmentation_unit_boundary_duplicate_and_cross_source_linkage_assurance',
  'eligibility_proxy_rule_exception_override_appeal_imputation_and_succession_governance',
  'awareness_comprehension_invitation_delivery_reachability_usability_and_assistance_governance',
  'latent_need_never_attempted_request_intake_identity_documentation_and_logging_governance',
  'queue_wait_rationing_priority_denial_disposition_and_completion_durability_governance',
  'price_availability_affordability_access_quality_provider_mix_and_market_lineage_assurance',
  'strategic_response_substitution_multiple_equilibria_welfare_incidence_replication_and_scale_succession_governance',
];

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(value => text(value)).filter(Boolean))];
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };

function custodyChain(events) {
  let previous = null;
  return events.map(([event_id, stage, payload], index) => {
    const unsigned = {
      event_id,
      stage,
      source_event_ids: index ? [events[index - 1][0]] : [],
      previous_event_sha256: previous,
      payload,
    };
    const event = { ...unsigned, event_sha256: sha256(unsigned) };
    previous = event.event_sha256;
    return event;
  });
}

export function validatePreferenceCustodyManifestV34(manifest) {
  const errors = [];
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V34_SCHEMA_VERSION) errors.push('v34 schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v34') errors.push('v34 manifest_id mismatch');
  if (manifest?.issue !== 594 || manifest?.control_issue !== 850) errors.push('v34 issue custody mismatch');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v34 status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v34 graph effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v34 thesis evidence', errors);
  const base = object(manifest?.base_floor);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v33' || base.expected_build_schema !== 'preference-custody-control-manifest-v33-build@1' || base.expected_control_count !== 35) errors.push('v34 base floor mismatch');
  const extension = object(manifest?.extension_control);
  if (extension.control_id !== 'PC-36' || extension.fixture_id !== 'same-population-coverage-verified-status-different-operational-states-v1' || extension.expected_build_schema !== 'preference-population-coverage-turnover-assurance-build@1') errors.push('v34 extension mismatch');
  if (extension.failure_class !== 'population_frame_coverage_hard_to_enumerate_nonresponse_missingness_boundary_turnover_snapshot_alignment_and_lineage_equifinality') errors.push('v34 failure class mismatch');
  if (array(extension.required_refusal_rules).length !== 16) errors.push('v34 required refusal rules must contain sixteen rules');
  if (manifest?.identification_requirement?.stage !== 'population_frame_coverage_hard_to_enumerate_missingness_boundary_turnover_snapshot_and_lineage') errors.push('v34 identification stage mismatch');
  if (manifest?.frontier_transition?.resolved_base_frontier !== 'population_frame_coverage_hard_to_enumerate_missingness_and_turnover_governance') errors.push('v34 resolved frontier mismatch');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(manifest?.frontier_transition?.successor_frontiers).includes(frontier)) errors.push(`v34 successor missing: ${frontier}`);
  if (unique(manifest?.real_case_requirements_added).length !== 64) errors.push('v34 must add 64 unique requirements');
  for (const item of array(manifest?.real_case_requirements_added)) if (!/^[a-z0-9_]+$/.test(item)) errors.push(`invalid v34 requirement: ${item}`);
  if (array(manifest?.prohibited_inferences).length < 12) errors.push('v34 prohibited inferences incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id) || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v34 interpretation contract incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV34(manifest, baseBuild, coverageBuild) {
  const errors = validatePreferenceCustodyManifestV34(manifest);
  if (errors.length) throw new Error(`invalid v34 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV33Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v33 base:\n- ${baseErrors.join('\n- ')}`);
  const coverageErrors = validatePreferencePopulationCoverageTurnoverAssuranceBuild(coverageBuild);
  if (coverageErrors.length) throw new Error(`invalid PC-36 build:\n- ${coverageErrors.join('\n- ')}`);

  const extension = manifest.extension_control;
  const control = {
    control_id: 'PC-36',
    fixture_id: coverageBuild.fixture_id,
    failure_class: extension.failure_class,
    source_fixture_path: extension.source_fixture_path,
    build_artifact_path: extension.build_artifact_path,
    build_schema_version: coverageBuild.schema_version,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_effect_claimed: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    required_refusal_rules: extension.required_refusal_rules,
    observed_refusal_rules: coverageBuild.refusal_rules,
    proof_summary: { ...coverageBuild.metrics, ...coverageBuild.classification },
  };
  const openFrontiers = unique([
    ...baseBuild.open_frontiers.filter(item => item !== manifest.frontier_transition.resolved_base_frontier),
    ...manifest.frontier_transition.successor_frontiers,
  ]);
  const requirements = [...baseBuild.promotion_boundary.real_case_requires, ...manifest.real_case_requirements_added];
  const controls = [...baseBuild.controls, control];
  const custody = custodyChain([
    ['PC34-FLOOR-SNAPSHOT', 'base-floor', { manifest_id: baseBuild.manifest_id, control_count: baseBuild.control_count, head_sha256: baseBuild.custody_chain_head_sha256 }],
    ['PC36-CONTROL-SNAPSHOT', 'extension', { control_id: 'PC-36', fixture_id: coverageBuild.fixture_id, metrics: coverageBuild.metrics }],
    ['PC36-FRONTIER-TRANSITION', 'frontier', { resolved: manifest.frontier_transition.resolved_base_frontier, successors: manifest.frontier_transition.successor_frontiers, open_frontiers: openFrontiers }],
    ['PC36-PROMOTION-BOUNDARY', 'promotion', { base_requirement_count: baseBuild.promotion_boundary.real_case_requires.length, added_requirement_count: manifest.real_case_requirements_added.length, final_requirement_count: requirements.length }],
    ['PC36-INTERPRETATION', 'interpretation', { contract: manifest.interpretation_contract, graph_effect: 'none', real_world_evidence_state: 'none' }],
  ]);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V34_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: manifest.status,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    control_count: controls.length,
    controls,
    composition: {
      base_manifest_id: baseBuild.manifest_id,
      base_control_count: baseBuild.control_count,
      extension_control_id: 'PC-36',
      base_floor_snapshot_sha256: sha256(baseBuild),
      extension_snapshot_sha256: sha256(coverageBuild),
      base_promotion_requirement_count: baseBuild.promotion_boundary.real_case_requires.length,
      added_promotion_requirement_count: manifest.real_case_requirements_added.length,
      final_promotion_requirement_count: requirements.length,
    },
    control_integrity: {
      base_floor_qualified: true,
      base_integrity_preserved: true,
      all_graph_effect_none: controls.every(item => item.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(item => item.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: true,
      no_preference_change_claim: true,
      no_intent_inference: true,
      all_required_pc36_refusal_rules_present: extension.required_refusal_rules.every(rule => coverageBuild.refusal_rules.includes(rule)),
      complete_population_coverage_assurance_path_preserved: coverageBuild.metrics.complete_population_coverage_assurance_worlds === 1,
    },
    identification_requirements: [...baseBuild.identification_requirements, manifest.identification_requirement],
    refusal_rule_union: unique([...baseBuild.refusal_rule_union, ...coverageBuild.refusal_rules]),
    open_frontiers: openFrontiers,
    frontier_transition: manifest.frontier_transition,
    promotion_boundary: {
      ...baseBuild.promotion_boundary,
      promotion_requirement_count: requirements.length,
      real_case_requires: requirements,
      laboratory_controls_are_real_world_evidence: false,
    },
    custody_chain: custody,
    custody_chain_head_sha256: custody.at(-1).event_sha256,
    prohibited_inferences: [...baseBuild.prohibited_inferences, ...manifest.prohibited_inferences],
    interpretation_contract: manifest.interpretation_contract,
  };
}

function validateCustodyChain(compiled, errors) {
  const events = array(compiled?.custody_chain);
  if (events.length !== 5) errors.push('compiled v34 custody chain must contain five events');
  let previous = null;
  const seen = new Set();
  for (const event of events) {
    if (event.previous_event_sha256 !== previous) errors.push('compiled v34 custody previous hash mismatch');
    for (const id of array(event.source_event_ids)) if (!seen.has(id)) errors.push('compiled v34 custody source missing');
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event.event_sha256 !== sha256(unsigned)) errors.push('compiled v34 custody event hash mismatch');
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (previous !== compiled?.custody_chain_head_sha256) errors.push('compiled v34 custody head mismatch');
}

export function validatePreferenceCustodyManifestV34Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V34_BUILD_SCHEMA_VERSION) errors.push('compiled v34 schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v34' || compiled?.control_issue !== 850) errors.push('compiled v34 identity mismatch');
  if (compiled?.status !== 'synthetic_control_floor_extension') errors.push('compiled v34 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v34 graph effect mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v34 thesis evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v34 conclusion', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v34 real-world evidence mismatch');
  if (compiled?.control_count !== 36 || array(compiled?.controls).length !== 36) errors.push('compiled v34 control count mismatch');
  const composition = object(compiled?.composition);
  if (composition.base_control_count !== 35 || composition.base_promotion_requirement_count !== 1213 || composition.added_promotion_requirement_count !== 64 || composition.final_promotion_requirement_count !== 1277) errors.push('compiled v34 composition mismatch');
  const control = array(compiled?.controls).at(-1);
  if (control?.control_id !== 'PC-36' || control?.fixture_id !== 'same-population-coverage-verified-status-different-operational-states-v1') errors.push('compiled v34 extension control mismatch');
  for (const [key, value] of Object.entries(EXPECTED_POPULATION_COVERAGE_TURNOVER_METRICS)) if (control?.proof_summary?.[key] !== value) errors.push(`compiled v34 metric mismatch: ${key}`);
  for (const key of FALSE_POPULATION_COVERAGE_TURNOVER_CLASSIFICATIONS) requireFalse(control?.proof_summary?.[key], `compiled v34 classification.${key}`, errors);
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v34 successor missing: ${frontier}`);
  if (array(compiled?.open_frontiers).includes('population_frame_coverage_hard_to_enumerate_missingness_and_turnover_governance')) errors.push('compiled v34 retained resolved frontier');
  for (const frontier of PRESERVED_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v34 preserved frontier missing: ${frontier}`);
  const integrity = object(compiled?.control_integrity);
  for (const key of ['base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption','no_real_world_conclusion','no_preference_change_claim','no_intent_inference','all_required_pc36_refusal_rules_present','complete_population_coverage_assurance_path_preserved']) if (integrity[key] !== true) errors.push(`compiled v34 integrity failed: ${key}`);
  if (compiled?.promotion_boundary?.promotion_requirement_count !== 1277 || array(compiled?.promotion_boundary?.real_case_requires).length !== 1277) errors.push('compiled v34 promotion boundary mismatch');
  if (compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence !== false) errors.push('compiled v34 laboratory boundary mismatch');
  validateCustodyChain(compiled, errors);
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v34 caveat missing');
  return errors;
}

export function renderPreferenceCustodyManifestV34Markdown(compiled) {
  const control = compiled.controls.at(-1);
  const lines = [
    '# Preference Custody laboratory floor v34',
    '',
    `**Controls:** ${compiled.control_count}`,
    '',
    `**Graph effect:** ${compiled.graph_effect}`,
    '',
    `> ${compiled.interpretation_contract.copy_ready_caveat}`,
    '',
    '## PC-36 proof summary',
    '',
  ];
  for (const [key, value] of Object.entries(control.proof_summary)) if (typeof value !== 'object') lines.push(`- ${key}: ${value}`);
  lines.push('', '## Open frontiers', '');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  return `${lines.join('\n')}\n`;
}
