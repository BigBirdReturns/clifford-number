import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV30Build } from './preference-custody-manifest-v30.mjs';
import {
  EXPECTED_ELIGIBILITY_OUTREACH_METRICS,
  FALSE_ELIGIBILITY_OUTREACH_CLASSIFICATIONS,
  validatePreferenceEligibilityOutreachAssuranceBuild
} from './preference-eligibility-outreach-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V31_SCHEMA_VERSION = 'preference-custody-control-manifest-v31@1';
export const PREFERENCE_CUSTODY_MANIFEST_V31_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v31-build@1';

const REQUIRED_CONTROL_IDS = Array.from({ length: 33 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`);
const REQUIRED_SUCCESSOR_FRONTIERS = [
  'source_population_inclusion_exclusion_appeal_and_proxy_rule_governance',
  'awareness_comprehension_invitation_delivery_reachability_usability_and_assistance_governance'
];
const PRESERVED_LATENT_NEED_FRONTIER = 'latent_need_never_attempted_request_intake_identity_documentation_and_logging_governance';
const PRESERVED_QUEUE_FRONTIER = 'queue_wait_rationing_priority_denial_disposition_and_completion_durability_governance';

const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const unique = values => [...new Set(array(values).map(value => text(value)).filter(Boolean))];
const sorted = values => [...values].sort((left, right) => String(left).localeCompare(String(right)));
const sameMembers = (left, right) => JSON.stringify(sorted(unique(left))) === JSON.stringify(sorted(unique(right)));
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const sha256 = value => createHash('sha256').update(JSON.stringify(canonical(value))).digest('hex');
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };
const sealedEvent = (event, previousEventSha256) => {
  const unsigned = { ...event, previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
};

function summarizePc33(control, build) {
  return {
    control_id: control.control_id,
    fixture_id: control.fixture_id,
    failure_class: control.failure_class,
    source_fixture_path: control.source_fixture_path,
    build_artifact_path: control.build_artifact_path,
    build_schema_version: build.schema_version,
    graph_effect: build.graph_effect,
    counts_toward_thesis_evidence: build.counts_toward_thesis_evidence,
    conclusion_generated: build.conclusion_generated,
    real_world_effect_claimed: build.classification?.real_world_effect_claimed,
    preference_change_present: build.preference_change_present,
    manipulative_intent_inferable: build.classification?.manipulative_intent_inferable,
    required_refusal_rules: control.required_refusal_rules,
    observed_refusal_rules: array(build.refusal_rules),
    proof_summary: {
      ...Object.fromEntries(Object.keys(EXPECTED_ELIGIBILITY_OUTREACH_METRICS).map(key => [key, build.metrics?.[key]])),
      ...Object.fromEntries(FALSE_ELIGIBILITY_OUTREACH_CLASSIFICATIONS.map(key => [key, build.classification?.[key]])),
      complete_eligibility_outreach_assurance_supported_in_at_least_one_world: build.classification?.complete_eligibility_outreach_assurance_supported_in_at_least_one_world
    }
  };
}

function buildChain(manifest, baseBuild, extensionControl, openFrontiers, promotionRequirements) {
  const events = [];
  let previous = null;
  const push = event => { const sealed = sealedEvent(event, previous); events.push(sealed); previous = sealed.event_sha256; };
  push({
    event_id: `${manifest.manifest_id}:base`,
    event_type: 'qualified_v30_floor_snapshot',
    evidence_class: 'compiled_synthetic_control_floor',
    authority: 'preference_custody_v30_compiler',
    source_event_ids: [],
    payload: { manifest_id: baseBuild.manifest_id, schema_version: baseBuild.schema_version, control_count: baseBuild.control_count, snapshot_sha256: sha256(baseBuild) }
  });
  push({
    event_id: `${manifest.manifest_id}:pc33`,
    event_type: 'pc33_source_population_rule_awareness_invitation_reachability_usability_assistance_and_lineage_control_admitted',
    evidence_class: 'compiled_synthetic_control',
    authority: 'eligibility_outreach_assurance_compiler',
    source_event_ids: [`${manifest.manifest_id}:base`],
    payload: { control: extensionControl, snapshot_sha256: sha256(extensionControl) }
  });
  push({
    event_id: `${manifest.manifest_id}:frontier`,
    event_type: 'eligibility_outreach_frontier_transition_sealed',
    evidence_class: 'laboratory_frontier_contract',
    authority: 'preference_custody_v31_compiler',
    source_event_ids: [`${manifest.manifest_id}:pc33`],
    payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers }
  });
  push({
    event_id: `${manifest.manifest_id}:promotion`,
    event_type: 'eligibility_outreach_real_case_promotion_boundary_sealed',
    evidence_class: 'laboratory_promotion_contract',
    authority: 'preference_custody_v31_compiler',
    source_event_ids: [`${manifest.manifest_id}:frontier`],
    payload: { identification_requirement: manifest.identification_requirement, real_case_requires: promotionRequirements }
  });
  push({
    event_id: `${manifest.manifest_id}:interpretation`,
    event_type: 'interpretation_sealed',
    evidence_class: 'candidate_inference',
    authority: 'preference_custody_v31_analyst',
    source_event_ids: [`${manifest.manifest_id}:promotion`],
    payload: {
      allowed_interpretation: 'qualified thirty-three-control synthetic Preference Custody floor',
      refused_promotions: [
        'laboratory_control_as_named_population_or_service_finding',
        'declared_eligibility_as_operational_source_population',
        'published_inclusion_coverage_as_valid_rule_custody',
        'zero_published_exclusion_as_zero_true_exclusion',
        'notice_publication_as_awareness_or_comprehension',
        'sending_or_delivery_rate_as_correct_delivery_acknowledgment_or_understanding',
        'channel_existence_as_geographic_or_temporal_reachability',
        'nominal_reachability_as_complete_usability_or_assistance',
        'historical_assurance_as_current_lineage',
        'eligibility_outreach_verified_status_as_public_authorization'
      ]
    }
  });
  return events;
}

export function validatePreferenceCustodyManifestV31(manifest) {
  const errors = [];
  const base = object(manifest?.base_floor);
  const control = object(manifest?.extension_control);
  const requirement = object(manifest?.identification_requirement);
  const transition = object(manifest?.frontier_transition);
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V31_SCHEMA_VERSION) errors.push('preference custody v31 manifest schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v31') errors.push('manifest_id must remain preference-custody-laboratory-floor-v31');
  if (manifest?.control_issue !== 831) errors.push('v31 control issue must remain 831');
  if (manifest?.status !== 'synthetic_control_floor_extension') errors.push('v31 manifest status mismatch');
  if (manifest?.graph_effect !== 'none') errors.push('v31 manifest graph_effect must remain none');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v31 manifest counts_toward_thesis_evidence', errors);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v30') errors.push('v31 base manifest must remain floor v30');
  if (!text(base.source_manifest_path) || base.expected_build_schema !== 'preference-custody-control-manifest-v30-build@1' || base.expected_control_count !== 32) errors.push('v31 base floor contract is incomplete');
  if (control.control_id !== 'PC-33') errors.push('v31 extension control must remain PC-33');
  if (control.fixture_id !== 'same-eligibility-outreach-verified-status-different-operational-states-v1') errors.push('PC-33 fixture identity mismatch');
  if (control.failure_class !== 'eligibility_source_population_inclusion_exclusion_awareness_invitation_reachability_usability_assistance_and_lineage_equifinality') errors.push('PC-33 failure class mismatch');
  if (!text(control.source_fixture_path) || !text(control.build_artifact_path) || control.expected_build_schema !== 'preference-eligibility-outreach-assurance-build@1') errors.push('PC-33 source or build contract is incomplete');
  if (unique(control.required_refusal_rules).length !== 16) errors.push('PC-33 refusal-rule contract must contain exactly sixteen unique items');
  if (requirement.stage !== 'eligibility_source_population_rule_awareness_invitation_reachability_usability_assistance_and_lineage') errors.push('v31 identification stage mismatch');
  if (!text(requirement.required_state) || !text(requirement.refused_inference)) errors.push('v31 eligibility-outreach identification requirement is incomplete');
  if (transition.resolved_base_frontier !== 'eligibility_source_population_exclusion_awareness_invitation_and_reachability_assurance') errors.push('v31 resolved frontier mismatch');
  if (!sameMembers(transition.successor_frontiers, REQUIRED_SUCCESSOR_FRONTIERS)) errors.push('v31 successor frontiers are incomplete');
  if (unique(manifest?.real_case_requirements_added).length !== 64) errors.push('v31 eligibility-outreach requirements must contain exactly sixty-four unique items');
  if (array(manifest?.real_case_requirements_added).some(item => !/^[a-z0-9_]+$/.test(text(item)))) errors.push('v31 requirements must be lowercase underscore-delimited identifiers');
  if (unique(manifest?.prohibited_inferences).length < 15) errors.push('v31 prohibited-inference ledger is incomplete');
  if (!text(manifest?.interpretation_contract?.contract_id) || !text(manifest?.interpretation_contract?.what_this_is) || !text(manifest?.interpretation_contract?.what_this_is_not) || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v31 interpretation contract is incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV31(manifest, baseBuild, eligibilityOutreachBuild) {
  const errors = validatePreferenceCustodyManifestV31(manifest);
  if (errors.length) throw new Error(`invalid preference custody v31 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV30Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v30 base build:\n- ${baseErrors.join('\n- ')}`);
  const controlErrors = validatePreferenceEligibilityOutreachAssuranceBuild(eligibilityOutreachBuild);
  if (controlErrors.length) throw new Error(`invalid PC-33 build:\n- ${controlErrors.join('\n- ')}`);

  const extension = summarizePc33(manifest.extension_control, eligibilityOutreachBuild);
  const controls = [...baseBuild.controls, extension];
  const identificationRequirements = [...baseBuild.identification_requirements, manifest.identification_requirement];
  const refusalRules = unique([...baseBuild.refusal_rule_union, ...eligibilityOutreachBuild.refusal_rules]);
  const openFrontiers = unique([
    ...baseBuild.open_frontiers.filter(frontier => frontier !== manifest.frontier_transition.resolved_base_frontier),
    ...manifest.frontier_transition.successor_frontiers
  ]);
  const promotionRequirements = unique([...baseBuild.promotion_boundary.real_case_requires, ...manifest.real_case_requirements_added]);
  const allRequiredRulesPresent = manifest.extension_control.required_refusal_rules.every(rule => extension.observed_refusal_rules.includes(rule));
  const completePathPreserved = extension.proof_summary.complete_eligibility_outreach_assurance_supported_in_at_least_one_world === true;
  const chain = buildChain(manifest, baseBuild, extension, openFrontiers, promotionRequirements);

  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V31_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v31_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    control_count: controls.length,
    controls,
    composition: {
      base_manifest_id: baseBuild.manifest_id,
      base_control_count: baseBuild.control_count,
      extension_control_id: 'PC-33',
      base_floor_snapshot_sha256: sha256(baseBuild),
      extension_snapshot_sha256: sha256(extension),
      base_promotion_requirement_count: baseBuild.promotion_boundary.real_case_requires.length,
      added_promotion_requirement_count: manifest.real_case_requirements_added.length,
      final_promotion_requirement_count: promotionRequirements.length
    },
    control_integrity: {
      base_floor_qualified: true,
      base_integrity_preserved: controls.slice(0, 32).every((control, index) => JSON.stringify(canonical(control)) === JSON.stringify(canonical(baseBuild.controls[index]))),
      all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
      no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
      no_real_world_conclusion: controls.every(control => control.conclusion_generated === false && control.real_world_effect_claimed === false),
      no_preference_change_claim: controls.every(control => control.preference_change_present === false),
      no_intent_inference: controls.every(control => control.manipulative_intent_inferable === false),
      all_required_pc33_refusal_rules_present: allRequiredRulesPresent,
      complete_eligibility_outreach_assurance_path_preserved: completePathPreserved
    },
    identification_requirements: identificationRequirements,
    refusal_rule_union: refusalRules,
    open_frontiers: openFrontiers,
    frontier_transition: manifest.frontier_transition,
    promotion_boundary: {
      laboratory_controls_are_real_world_evidence: false,
      real_case_requires: promotionRequirements,
      promotion_authority: baseBuild.promotion_boundary.promotion_authority
    },
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1)?.event_sha256 ?? null,
    prohibited_inferences: [...baseBuild.prohibited_inferences, ...manifest.prohibited_inferences],
    interpretation_contract: manifest.interpretation_contract
  };
}

export function validatePreferenceCustodyManifestV31Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V31_BUILD_SCHEMA_VERSION) errors.push('preference custody v31 build schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v31') errors.push('compiled v31 manifest identity mismatch');
  if (compiled?.control_issue !== 831) errors.push('compiled v31 control issue must remain 831');
  if (compiled?.status !== 'laboratory_floor_v31_qualified') errors.push('compiled v31 status mismatch');
  if (compiled?.graph_effect !== 'none') errors.push('compiled v31 graph_effect must remain none');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v31 counts_toward_thesis_evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v31 conclusion_generated', errors);
  if (compiled?.real_world_evidence_state !== 'none') errors.push('compiled v31 real_world_evidence_state must remain none');
  if (compiled?.control_count !== 33) errors.push('compiled v31 must preserve thirty-three controls');
  if (!sameMembers(array(compiled?.controls).map(control => control.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v31 control IDs are incomplete');
  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v30' || composition.base_control_count !== 32 || composition.extension_control_id !== 'PC-33') errors.push('compiled v31 composition mismatch');
  for (const key of ['base_floor_snapshot_sha256','extension_snapshot_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v31 ${key} is invalid`);
  if (composition.base_promotion_requirement_count !== 1021 || composition.added_promotion_requirement_count !== 64 || composition.final_promotion_requirement_count !== 1085) errors.push('compiled v31 promotion counts mismatch');
  if (composition.final_promotion_requirement_count !== unique(compiled?.promotion_boundary?.real_case_requires).length) errors.push('compiled v31 promotion count does not match boundary');
  const integrity = object(compiled?.control_integrity);
  for (const key of ['base_floor_qualified','base_integrity_preserved','all_graph_effect_none','no_thesis_evidence_consumption','no_real_world_conclusion','no_preference_change_claim','no_intent_inference','all_required_pc33_refusal_rules_present','complete_eligibility_outreach_assurance_path_preserved']) if (integrity[key] !== true) errors.push(`compiled v31 control_integrity.${key} must be true`);
  const pc33 = array(compiled?.controls).find(control => control.control_id === 'PC-33');
  if (!pc33) {
    errors.push('compiled v31 PC-33 control is missing');
  } else {
    const proof = object(pc33.proof_summary);
    for (const [key, value] of Object.entries(EXPECTED_ELIGIBILITY_OUTREACH_METRICS)) if (proof[key] !== value) errors.push(`PC-33 ${key} must equal ${value}`);
    for (const key of FALSE_ELIGIBILITY_OUTREACH_CLASSIFICATIONS) if (proof[key] !== false) errors.push(`PC-33 ${key} must remain false`);
    if (proof.complete_eligibility_outreach_assurance_supported_in_at_least_one_world !== true) errors.push('PC-33 must preserve one complete path');
  }
  if (!array(compiled?.identification_requirements).some(item => item.stage === 'eligibility_source_population_rule_awareness_invitation_reachability_usability_assistance_and_lineage')) errors.push('compiled v31 eligibility-outreach identification stage is missing');
  if (array(compiled?.open_frontiers).includes('eligibility_source_population_exclusion_awareness_invitation_and_reachability_assurance')) errors.push('compiled v31 must remove resolved eligibility-outreach frontier');
  for (const frontier of REQUIRED_SUCCESSOR_FRONTIERS) if (!array(compiled?.open_frontiers).includes(frontier)) errors.push(`compiled v31 successor frontier missing: ${frontier}`);
  if (!array(compiled?.open_frontiers).includes(PRESERVED_LATENT_NEED_FRONTIER)) errors.push('compiled v31 must preserve latent-need request-intake frontier');
  if (!array(compiled?.open_frontiers).includes(PRESERVED_QUEUE_FRONTIER)) errors.push('compiled v31 must preserve queue-rationing-denial-completion frontier');
  requireFalse(compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence, 'compiled v31 laboratory controls as evidence', errors);
  const chain = array(compiled?.custody_chain);
  if (chain.length !== 5) errors.push('compiled v31 custody chain must contain five events');
  const seen = new Set();
  let previous = null;
  for (const event of chain) {
    if (!text(event?.event_id)) errors.push('compiled v31 custody event requires event_id');
    if (seen.has(event?.event_id)) errors.push(`duplicate compiled v31 event ${event.event_id}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`compiled v31 event ${event?.event_id} previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`compiled v31 event ${event?.event_id} references unseen source ${sourceId}`);
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`compiled v31 event ${event?.event_id} hash mismatch`);
    seen.add(event.event_id);
    previous = event.event_sha256;
  }
  if (chain.at(-1)?.event_sha256 !== compiled?.custody_chain_head_sha256) errors.push('compiled v31 custody head mismatch');
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v31 caveat is required');
  return errors;
}

export function renderPreferenceCustodyManifestV31Markdown(compiled) {
  const proof = compiled.controls.find(control => control.control_id === 'PC-33').proof_summary;
  const lines = [
    '# Preference custody laboratory floor v31','',
    `**Status:** ${compiled.status}`,'',
    `**Controls:** ${compiled.control_count}`,'',
    `**Composition:** ${compiled.composition.base_manifest_id} + ${compiled.composition.extension_control_id}`,'',
    `**Real-world evidence state:** ${compiled.real_world_evidence_state}`,'',
    '> ' + compiled.interpretation_contract.copy_ready_caveat,'',
    '## Frozen base','',
    `- Base manifest: ${compiled.composition.base_manifest_id}`,
    `- Base controls: ${compiled.composition.base_control_count}`,
    `- Base snapshot: ${compiled.composition.base_floor_snapshot_sha256}`,
    `- Added promotion requirements: ${compiled.composition.added_promotion_requirement_count}`,
    `- Final promotion requirements: ${compiled.composition.final_promotion_requirement_count}`,'',
    '## PC-33: eligibility source-population, exclusion, awareness, invitation, and reachability custody',''
  ];
  for (const [key, value] of Object.entries(proof)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Floor integrity','');
  for (const [key, value] of Object.entries(compiled.control_integrity)) lines.push(`- ${key}: ${value}`);
  lines.push('','## Open frontiers','');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  lines.push('','## Promotion boundary','',
    `- Laboratory controls are real-world evidence: ${compiled.promotion_boundary.laboratory_controls_are_real_world_evidence}`,
    `- Promotion authority: ${compiled.promotion_boundary.promotion_authority}`,'',
    '### Required real-case evidence','');
  for (const item of compiled.promotion_boundary.real_case_requires) lines.push(`- ${item}`);
  lines.push('','## Prohibited inferences','');
  for (const item of compiled.prohibited_inferences) lines.push(`- ${item}`);
  lines.push('',`**Custody head:** ${compiled.custody_chain_head_sha256}`,'');
  return lines.join('\n');
}
