import { createHash } from 'node:crypto';
import { validatePreferenceCustodyManifestV36Build } from './preference-custody-manifest-v36.mjs';
import {
  EXPECTED_RECORD_LINKAGE_METRICS,
  validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild
} from './preference-record-linkage-temporal-succession-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V37_SCHEMA_VERSION = 'preference-custody-control-manifest-v37@1';
export const PREFERENCE_CUSTODY_MANIFEST_V37_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v37-build@1';
const REQUIRED_CONTROL_IDS = Array.from({ length: 39 }, (_, index) => `PC-${String(index + 1).padStart(2, '0')}`);
const RESOLVED_FRONTIER = 'record_linkage_namespace_temporal_identity_and_succession_assurance';
const REQUIRED_SUCCESSORS = [
  'cross_source_linkage_confidence_ambiguity_adjudication_and_falsification_governance',
  'temporal_identity_version_transition_succession_retroactive_correction_and_durability_assurance'
];
const FALSE_CLASSIFICATIONS = [
  'one_hundred_linked_records_identifies_one_hundred_valid_same_entity_links',
  'one_hundred_percent_linkage_coverage_identifies_absence_of_false_positive_false_negative_or_ambiguous_links',
  'zero_published_unmatched_records_identifies_zero_hidden_unmatched_records',
  'zero_published_ambiguous_links_identifies_complete_ambiguity_adjudication',
  'current_namespace_status_identifies_namespace_separation_and_collision_free_custody',
  'shared_identifier_identifies_same_entity_across_namespaces',
  'alias_difference_identifies_different_entity',
  'complete_temporal_continuity_identifies_nonoverlapping_validity_and_temporal_consistency',
  'current_identifier_identifies_persistent_entity_after_retirement_or_recycling',
  'successor_entity_identifies_persistent_predecessor_identity',
  'complete_succession_continuity_identifies_source_complete_predecessor_successor_custody',
  'silently_bridged_gap_identifies_observed_continuity',
  'retroactive_relink_identifies_append_preserving_correction',
  'historical_linkage_assurance_identifies_current_assurance_after_succession',
  'public_linkage_verified_status_identifies_complete_current_correctable_authorized_evidence',
  'linkage_or_succession_failure_identifies_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_supported',
  'manipulative_intent_inferable',
  'real_world_effect_claimed',
  'graph_effect_present',
  'preference_change_present'
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
  push({ event_id: `${manifest.manifest_id}:base`, event_type: 'qualified_v36_floor_snapshot', evidence_class: 'compiled_synthetic_control_floor', authority: 'preference_custody_v36_compiler', source_event_ids: [], payload: { manifest_id: base.manifest_id, schema_version: base.schema_version, control_count: base.control_count, snapshot_sha256: sha256(base) } });
  push({ event_id: `${manifest.manifest_id}:pc39`, event_type: 'pc39_record_linkage_namespace_temporal_identity_succession_and_version_control_admitted', evidence_class: 'compiled_synthetic_control', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [`${manifest.manifest_id}:base`], payload: { control, snapshot_sha256: sha256(control) } });
  push({ event_id: `${manifest.manifest_id}:frontier`, event_type: 'record_linkage_temporal_succession_frontier_transition_sealed', evidence_class: 'laboratory_frontier_contract', authority: 'preference_custody_v37_compiler', source_event_ids: [`${manifest.manifest_id}:pc39`], payload: { transition: manifest.frontier_transition, open_frontiers: openFrontiers } });
  push({ event_id: `${manifest.manifest_id}:promotion`, event_type: 'record_linkage_real_case_promotion_boundary_sealed', evidence_class: 'laboratory_promotion_contract', authority: 'preference_custody_v37_compiler', source_event_ids: [`${manifest.manifest_id}:frontier`], payload: { identification_requirement: manifest.identification_requirement, real_case_requires: requirements } });
  push({ event_id: `${manifest.manifest_id}:interpretation`, event_type: 'interpretation_sealed', evidence_class: 'candidate_inference', authority: 'preference_custody_v37_analyst', source_event_ids: [`${manifest.manifest_id}:promotion`], payload: { allowed_interpretation: 'qualified thirty-nine-control synthetic Preference Custody floor', graph_effect: 'none', real_world_evidence_state: 'none' } });
  return events;
}

export function validatePreferenceCustodyManifestV37(manifest) {
  const errors = [];
  if (manifest?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V37_SCHEMA_VERSION) errors.push('v37 schema mismatch');
  if (manifest?.manifest_id !== 'preference-custody-laboratory-floor-v37') errors.push('v37 manifest identity mismatch');
  if (manifest?.issue !== 594 || manifest?.control_issue !== 870) errors.push('v37 issue custody mismatch');
  if (manifest?.status !== 'synthetic_control_floor_extension' || manifest?.graph_effect !== 'none') errors.push('v37 status or graph effect mismatch');
  requireFalse(manifest?.counts_toward_thesis_evidence, 'v37 thesis evidence', errors);
  const base = object(manifest?.base_floor);
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v36' || base.source_manifest_path !== 'data/research/preference-custody/control-manifest-v36.json' || base.expected_build_schema !== 'preference-custody-control-manifest-v36-build@1' || base.expected_control_count !== 38) errors.push('v37 base floor contract mismatch');
  const extension = object(manifest?.extension_control);
  if (extension.control_id !== 'PC-39' || extension.fixture_id !== 'same-linkage-verified-status-different-provenance-v1' || extension.failure_class !== 'record_linkage_namespace_temporal_identity_succession_versioning_and_lineage_equifinality' || extension.source_fixture_path !== 'data/research/preference-custody/record-linkage-temporal-succession-assurance.fixture.json' || extension.build_artifact_path !== 'build/research/preference-record-linkage-temporal-succession-assurance.json' || extension.expected_build_schema !== 'preference-record-linkage-temporal-succession-assurance-build@1') errors.push('v37 extension contract mismatch');
  if (unique(extension.required_refusal_rules).length !== 17) errors.push('v37 refusal-rule contract must contain seventeen unique rules');
  if (manifest?.identification_requirement?.stage !== 'record_linkage_namespace_temporal_identity_succession_versioning_and_lineage') errors.push('v37 identification stage mismatch');
  if (manifest?.frontier_transition?.resolved_base_frontier !== RESOLVED_FRONTIER) errors.push('v37 resolved frontier mismatch');
  if (!sameMembers(manifest?.frontier_transition?.successor_frontiers, REQUIRED_SUCCESSORS)) errors.push('v37 successor frontier mismatch');
  if (unique(manifest?.real_case_requirements_added).length !== 48) errors.push('v37 must add exactly forty-eight unique real-case requirements');
  for (const item of array(manifest?.real_case_requirements_added)) if (!/^[a-z0-9_]+$/.test(item)) errors.push(`invalid v37 requirement: ${item}`);
  if (array(manifest?.prohibited_inferences).length < 15) errors.push('v37 prohibited-inference ledger incomplete');
  if (manifest?.interpretation_contract?.contract_id !== PREFERENCE_CUSTODY_MANIFEST_V37_SCHEMA_VERSION || !text(manifest?.interpretation_contract?.copy_ready_caveat)) errors.push('v37 interpretation contract incomplete');
  return errors;
}

export function compilePreferenceCustodyManifestV37(manifest, baseBuild, linkageBuild, linkageFixture) {
  const errors = validatePreferenceCustodyManifestV37(manifest);
  if (errors.length) throw new Error(`invalid v37 manifest:\n- ${errors.join('\n- ')}`);
  const baseErrors = validatePreferenceCustodyManifestV36Build(baseBuild);
  if (baseErrors.length) throw new Error(`invalid v36 base:\n- ${baseErrors.join('\n- ')}`);
  const linkageErrors = validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(linkageBuild, linkageFixture);
  if (linkageErrors.length) throw new Error(`invalid PC-39 build:\n- ${linkageErrors.join('\n- ')}`);
  if (baseBuild.control_count !== 38 || baseBuild.manifest_id !== 'preference-custody-laboratory-floor-v36') throw new Error('v37 base identity mismatch');
  const baseOpen = unique(baseBuild.open_frontiers);
  if (!baseOpen.includes(RESOLVED_FRONTIER)) throw new Error('v37 base does not contain the resolved record-linkage frontier');
  const requiredRules = manifest.extension_control.required_refusal_rules;
  const control = {
    control_id: 'PC-39',
    fixture_id: linkageBuild.fixture_id,
    failure_class: manifest.extension_control.failure_class,
    source_fixture_path: manifest.extension_control.source_fixture_path,
    build_artifact_path: manifest.extension_control.build_artifact_path,
    build_schema_version: linkageBuild.schema_version,
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_effect_claimed: false,
    preference_change_present: false,
    manipulative_intent_inferable: false,
    required_refusal_rules: [...requiredRules],
    observed_refusal_rules: [...linkageBuild.required_refusal_rules],
    proof_summary: { ...linkageBuild.metrics, ...linkageBuild.classification }
  };
  const openFrontiers = unique([...baseOpen.filter(frontier => frontier !== RESOLVED_FRONTIER), ...manifest.frontier_transition.successor_frontiers]);
  const baseRequirements = unique(baseBuild.promotion_boundary.real_case_requires);
  const requirements = unique([...baseRequirements, ...manifest.real_case_requirements_added]);
  if (requirements.length - baseRequirements.length !== 48) throw new Error('v37 requirement extension is not exactly forty-eight');
  const controls = [...baseBuild.controls, control];
  const custody = chain(manifest, baseBuild, control, openFrontiers, requirements);
  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V37_BUILD_SCHEMA_VERSION,
    manifest_id: manifest.manifest_id,
    issue: manifest.issue,
    control_issue: manifest.control_issue,
    captured_at: manifest.captured_at,
    status: 'laboratory_floor_v37_qualified',
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
      extension_control_id: 'PC-39',
      base_floor_snapshot_sha256: sha256(baseBuild),
      extension_snapshot_sha256: sha256(linkageBuild),
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
      all_required_pc39_refusal_rules_present: requiredRules.every(rule => linkageBuild.required_refusal_rules.includes(rule)),
      complete_record_linkage_assurance_path_preserved: linkageBuild.metrics.complete_record_linkage_assurance_worlds === 1
    },
    identification_requirements: [...baseBuild.identification_requirements, manifest.identification_requirement],
    refusal_rule_union: unique([...baseBuild.refusal_rule_union, ...linkageBuild.required_refusal_rules]),
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
  if (events.length !== 5) errors.push('compiled v37 custody chain must contain five events');
  let previous = null; const seen = new Set();
  for (const event of events) {
    if (event?.previous_event_sha256 !== previous) errors.push('compiled v37 custody previous hash mismatch');
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push('compiled v37 custody source missing');
    const unsigned = { ...event }; delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push('compiled v37 custody event hash mismatch');
    if (text(event?.event_id)) seen.add(event.event_id);
    previous = event?.event_sha256;
  }
  if (previous !== compiled?.custody_chain_head_sha256) errors.push('compiled v37 custody head mismatch');
}

export function validatePreferenceCustodyManifestV37Build(compiled) {
  const errors = [];
  if (compiled?.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V37_BUILD_SCHEMA_VERSION) errors.push('compiled v37 schema mismatch');
  if (compiled?.manifest_id !== 'preference-custody-laboratory-floor-v37' || compiled?.control_issue !== 870) errors.push('compiled v37 identity mismatch');
  if (compiled?.status !== 'laboratory_floor_v37_qualified' || compiled?.graph_effect !== 'none' || compiled?.real_world_evidence_state !== 'none') errors.push('compiled v37 status boundary mismatch');
  requireFalse(compiled?.counts_toward_thesis_evidence, 'compiled v37 thesis evidence', errors);
  requireFalse(compiled?.conclusion_generated, 'compiled v37 conclusion', errors);
  if (compiled?.control_count !== 39 || array(compiled?.controls).length !== 39 || !sameMembers(array(compiled?.controls).map(control => control?.control_id), REQUIRED_CONTROL_IDS)) errors.push('compiled v37 must preserve thirty-nine exact controls');
  const composition = object(compiled?.composition);
  if (composition.base_manifest_id !== 'preference-custody-laboratory-floor-v36' || composition.base_schema_version !== 'preference-custody-control-manifest-v36-build@1' || composition.base_control_count !== 38 || composition.extension_control_id !== 'PC-39') errors.push('compiled v37 composition identity mismatch');
  if (composition.base_promotion_requirement_count !== 1389 || composition.added_promotion_requirement_count !== 48 || composition.final_promotion_requirement_count !== 1437) errors.push('compiled v37 promotion counts mismatch');
  for (const key of ['base_floor_snapshot_sha256', 'extension_snapshot_sha256', 'base_controls_sha256', 'base_promotion_requirements_sha256']) if (!/^[0-9a-f]{64}$/.test(text(composition[key]))) errors.push(`compiled v37 invalid hash: ${key}`);
  const compiledBaseControls = array(compiled?.controls).slice(0, 38);
  if (composition.base_controls_sha256 !== sha256(compiledBaseControls)) errors.push('compiled v37 base controls hash mismatch');
  const compiledBaseRequirements = unique(array(compiled?.promotion_boundary?.real_case_requires).slice(0, 1389));
  if (composition.base_promotion_requirements_sha256 !== sha256(compiledBaseRequirements)) errors.push('compiled v37 base promotion requirements hash mismatch');
  const expectedOpen = unique([...array(composition.base_open_frontiers).filter(frontier => frontier !== RESOLVED_FRONTIER), ...REQUIRED_SUCCESSORS]);
  if (!sameMembers(compiled?.open_frontiers, expectedOpen)) errors.push('compiled v37 open-frontier preservation mismatch');
  if (array(compiled?.open_frontiers).includes(RESOLVED_FRONTIER)) errors.push('compiled v37 retained resolved record-linkage frontier');
  const integrity = object(compiled?.control_integrity);
  for (const key of ['base_floor_qualified', 'base_integrity_preserved', 'all_graph_effect_none', 'no_thesis_evidence_consumption', 'no_real_world_conclusion', 'no_preference_change_claim', 'no_intent_inference', 'all_required_pc39_refusal_rules_present', 'complete_record_linkage_assurance_path_preserved']) if (integrity[key] !== true) errors.push(`compiled v37 integrity failed: ${key}`);
  const control = array(compiled?.controls).find(item => item?.control_id === 'PC-39');
  if (!control) errors.push('compiled v37 PC-39 missing');
  else {
    for (const [key, value] of Object.entries(EXPECTED_RECORD_LINKAGE_METRICS)) if (control?.proof_summary?.[key] !== value) errors.push(`PC-39 metric mismatch: ${key}`);
    for (const key of FALSE_CLASSIFICATIONS) requireFalse(control?.proof_summary?.[key], `PC-39 classification.${key}`, errors);
    if (control?.proof_summary?.complete_record_linkage_assurance_supported_in_at_least_one_world !== true) errors.push('PC-39 complete path missing');
    if (control?.graph_effect !== 'none' || control?.counts_toward_thesis_evidence !== false || control?.conclusion_generated !== false || control?.real_world_effect_claimed !== false || control?.preference_change_present !== false || control?.manipulative_intent_inferable !== false) errors.push('PC-39 authority boundary mismatch');
  }
  if (compiled?.promotion_boundary?.promotion_requirement_count !== 1437 || unique(compiled?.promotion_boundary?.real_case_requires).length !== 1437 || compiled?.promotion_boundary?.laboratory_controls_are_real_world_evidence !== false) errors.push('compiled v37 promotion boundary mismatch');
  validateChain(compiled, errors);
  if (!text(compiled?.interpretation_contract?.copy_ready_caveat)) errors.push('compiled v37 caveat missing');
  return errors;
}

export function renderPreferenceCustodyManifestV37Markdown(compiled) {
  const control = compiled.controls.find(item => item.control_id === 'PC-39');
  const lines = [
    '# Preference Custody laboratory floor v37',
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
    '## PC-39 proof summary',
    ''
  ];
  for (const [key, value] of Object.entries(control.proof_summary)) if (typeof value !== 'object') lines.push(`- ${key}: ${value}`);
  lines.push('', '## Open frontiers', '');
  for (const frontier of compiled.open_frontiers) lines.push(`- ${frontier}`);
  return `${lines.join('\n')}\n`;
}
