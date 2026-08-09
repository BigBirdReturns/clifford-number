import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';
import {
  loadPreferenceCustodyV54SourceBundle,
  preferenceCustodyManifestV55Snapshot,
  preferenceCustodyV54SourceBundleSnapshot,
  validatePreferenceCustodyManifestV55
} from './preference-custody-manifest-v55.mjs';
import {
  PREFERENCE_LINKAGE_REPOSITORY_OWNER_LOGIN_IMMUTABLE_OWNER_ID_ACCOUNT_STATE_OWNER_RENAME_ASSURANCE_BUILD_SCHEMA_VERSION,
  REQUIRED_PREFERENCE_LINKAGE_REPOSITORY_OWNER_LOGIN_IMMUTABLE_OWNER_ID_ACCOUNT_STATE_OWNER_RENAME_ASSURANCE_REFUSAL_RULES,
  validatePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceBuild,
  validatePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture
} from './preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.mjs';

export const PREFERENCE_CUSTODY_MANIFEST_V56_SCHEMA_VERSION = 'preference-custody-control-manifest-v56@1';
export const PREFERENCE_CUSTODY_MANIFEST_V56_BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v56-build@1';
export const PREFERENCE_CUSTODY_V55_SOURCE_BUNDLE_SCHEMA_VERSION = 'preference-custody-v55-source-bundle@1';

const EXPECTED_MANIFEST_SNAPSHOT_SHA256 = "fd950ca6771faf7a42fa39015c3627cfadcb19f7422286709718ea88c45f545d";
const EXPECTED_V55_BASE_BUILD_SHA256 = '8e5057e5ecc32c17e706c275e5f4b7b07bf2cfbe525ab35794a6aec559009f2b';
const EXPECTED_V55_SOURCE_BUNDLE_SHA256 = '553edd1444223ff5283da65d31ca24f570f29aa36868c9adf1a2e56e71317507';
const EXPECTED_MANIFEST_LITERAL = Object.freeze({"schema_version":"preference-custody-control-manifest-v56@1","manifest_id":"preference-custody-laboratory-floor-v56","issue":594,"control_issue":1592,"captured_at":"2026-08-08","status":"synthetic_control_floor_extension","graph_effect":"none","counts_toward_thesis_evidence":false,"base_floor":{"manifest_id":"preference-custody-laboratory-floor-v55","source_manifest_path":"data/research/preference-custody/control-manifest-v55.json","expected_build_schema":"preference-custody-control-manifest-v55-build@1","expected_control_count":57},"extension_control":{"control_id":"PC-58","fixture_id":"same-linkage-owner-login-id-state-rename-status-different-owner-identity-states-v1","failure_class":"linkage_interval_repository_owner_login_immutable_owner_numeric_node_id_owner_type_account_state_canonical_profile_api_location_owner_rename_predecessor_successor_timestamp_redirect_repository_owner_pair_transfer_correction_and_current_lineage_equifinality","source_fixture_path":"data/research/preference-custody/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.fixture.json","build_artifact_path":"build/research/preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance.json","expected_build_schema":"preference-linkage-repository-owner-login-immutable-owner-id-account-state-owner-rename-assurance-build@1","required_refusal_rules":["one_owner_login_is_not_immutable_owner_numeric_and_node_identity","one_owner_numeric_id_is_not_owner_node_id_database_id_consistency_type_account_state_locations_and_rename_custody","one_reachable_profile_is_not_canonical_profile_api_location_normalization_redirect_account_state_and_lineage_custody","one_current_account_badge_is_not_active_suspended_deleted_and_site_admin_state_custody","one_rename_redirect_is_not_owner_rename_event_predecessor_successor_timestamp_actor_receipt_and_correction_custody","one_current_owner_surface_is_not_predecessor_successor_profile_and_api_redirect_chain_custody","one_repository_owner_login_is_not_immutable_owner_repository_pairing_transfer_fork_network_branch_release_commit_object_and_protection_continuity","matching_repository_replays_are_not_exact_owner_login_immutable_id_account_state_rename_event_repository_pairing_and_current_lineage","historical_owner_assurance_is_not_current_after_owner_account_rename_repository_transfer_namespace_policy_correction_release_or_use_succession","owner_identity_failure_is_not_proof_of_misconduct_breach_manipulation_discrimination_coordination_common_purpose_intent_ownership_or_security_compromise","binding_public_authority_requires_separate_current_public_authorization_receipts","synthetic_owner_identity_burdens_are_not_real_world_defect_prevalence_causal_effect_ownership_or_institutional_performance_estimates"]},"identification_requirement":{"stage":"linkage_interval_repository_owner_login_immutable_owner_id_account_state_and_owner_rename","required_state":"bound_owner_login_immutable_numeric_and_node_ids_account_state_profile_api_location_owner_rename_predecessor_successor_timestamp_redirect_repository_continuity_correction_and_current_lineage_custody","refused_inference":"public_owner_login_id_account_state_and_rename_badges_do_not_identify_complete_current_owner_identity_custody"},"frontier_transition":{"resolved_base_frontier":"linkage_interval_repository_owner_login_immutable_owner_id_account_state_and_owner_rename_governance","successor_frontiers":["linkage_interval_repository_owner_login_canonical_profile_api_location_account_type_state_and_suspension_governance","linkage_interval_owner_rename_event_predecessor_successor_timestamp_redirect_repository_owner_pair_and_transfer_continuity_governance"]},"real_case_requirements_added":["linkage_interval_v56_artifact_identity_owner_version_and_release","linkage_interval_v56_repository_owner_login_identity","linkage_interval_v56_repository_owner_immutable_numeric_id","linkage_interval_v56_repository_owner_node_id","linkage_interval_v56_repository_owner_database_id_consistency","linkage_interval_v56_repository_owner_type_identity","linkage_interval_v56_repository_owner_account_state","linkage_interval_v56_repository_owner_suspended_state","linkage_interval_v56_repository_owner_deleted_or_ghost_state","linkage_interval_v56_repository_owner_site_admin_state","linkage_interval_v56_repository_owner_canonical_profile_url","linkage_interval_v56_repository_owner_api_url","linkage_interval_v56_repository_owner_url_normalization","linkage_interval_v56_repository_owner_profile_redirect_chain","linkage_interval_v56_repository_owner_api_redirect_chain","linkage_interval_v56_repository_owner_avatar_url_identity","linkage_interval_v56_repository_owner_created_at_identity","linkage_interval_v56_repository_owner_updated_at_identity","linkage_interval_v56_repository_owner_rename_event_identity","linkage_interval_v56_repository_owner_prior_login_identity","linkage_interval_v56_repository_owner_successor_login_identity","linkage_interval_v56_repository_owner_rename_timestamp","linkage_interval_v56_repository_owner_rename_actor_or_system_receipt","linkage_interval_v56_repository_owner_predecessor_profile_url","linkage_interval_v56_repository_owner_successor_profile_url","linkage_interval_v56_repository_owner_predecessor_api_url","linkage_interval_v56_repository_owner_successor_api_url","linkage_interval_v56_repository_owner_canonical_redirect_continuity","linkage_interval_v56_repository_owner_api_redirect_continuity","linkage_interval_v56_repository_owner_rename_correction_lineage","linkage_interval_v56_repository_owner_login_repository_pair","linkage_interval_v56_repository_owner_immutable_id_repository_pair","linkage_interval_v56_repository_owner_node_id_repository_pair","linkage_interval_v56_repository_numeric_id_continuity","linkage_interval_v56_repository_full_name_continuity","linkage_interval_v56_repository_canonical_url_continuity","linkage_interval_v56_repository_api_url_continuity","linkage_interval_v56_repository_clone_remote_continuity","linkage_interval_v56_repository_transfer_lineage_continuity","linkage_interval_v56_repository_fork_network_continuity","linkage_interval_v56_repository_visibility_state_continuity","linkage_interval_v56_repository_archived_disabled_template_state_continuity","linkage_interval_v56_repository_default_branch_identity_continuity","linkage_interval_v56_repository_tag_release_binding_continuity","linkage_interval_v56_repository_review_time_commit_reachability","linkage_interval_v56_repository_advertised_object_namespace_continuity","linkage_interval_v56_repository_protection_policy_continuity","linkage_interval_v56_negative_control_owner_login_substitution","linkage_interval_v56_negative_control_owner_numeric_id_substitution","linkage_interval_v56_negative_control_owner_node_id_substitution","linkage_interval_v56_negative_control_owner_type_account_state_substitution","linkage_interval_v56_negative_control_owner_rename_event_substitution","linkage_interval_v56_negative_control_owner_predecessor_successor_substitution","linkage_interval_v56_negative_control_owner_redirect_chain_substitution","linkage_interval_v56_repository_owner_current_lineage_invalidation","linkage_interval_v56_repository_owner_monitoring_and_quarantine","linkage_interval_v56_repository_owner_correction_rollback_rereview_republication_appeal_and_durability","linkage_interval_v56_repository_owner_identity_rename_transfer_release_use_succession_and_public_claim_authority"],"prohibited_inferences":["Do not treat floor v56 or PC-58 as evidence that any named person, organization, institution, platform, owner, account, profile, repository, rename event, predecessor, successor, redirect, or transfer was actually valid or complete.","Do not infer immutable owner numeric or node identity from one owner login.","Do not infer owner node ID, database-ID consistency, type, account state, locations, and rename custody from one owner numeric ID.","Do not infer canonical profile/API location, normalization, redirect, account state, and lineage custody from one reachable profile.","Do not infer complete active, suspended, deleted, ghost, or site-admin state from one current account badge.","Do not infer owner-rename event, predecessor/successor login, timestamp, actor receipt, and correction custody from one rename redirect.","Do not infer predecessor/successor profile and API redirect-chain custody from one current owner surface.","Do not infer immutable owner/repository pairing, transfer, fork-network, branch, release, commit, object, and protection continuity from one repository owner login.","Do not treat matching repository replays as proof that the same owner login, immutable ID, account state, rename event, repository pairing, and current lineage were evaluated.","Do not infer current owner assurance after owner, account, rename, repository, transfer, namespace, policy, correction, release, or use succession.","Do not infer public authorization or ownership from complete owner-identity custody.","Do not infer coercion, manipulation, discrimination, breach, misconduct, coordination, common purpose, intent, ownership, or security compromise from owner-identity failure.","Do not treat synthetic owner-identity burdens as real-world defect prevalence, causal effects, ownership, welfare trajectories, or institutional-performance estimates.","Do not collapse complete owner identity into proof that reviewed source produced an artifact or executed output.","Do not collapse exact owner-rename custody into a real graph edge, publication, adoption, or institutional relationship.","Do not treat a complete synthetic owner-identity path as a public-authority verdict."],"interpretation_contract":{"contract_id":"preference-custody-control-manifest-v56@1","what_this_is":"A compositional successor floor preserving the qualified fifty-seven-control v55 base and adding PC-58 owner-login, immutable-owner-ID, account-state, owner-rename, repository-continuity, correction, and current-lineage equifinality.","what_this_is_not":"A real ownership finding, repository review, source audit, release audit, artifact verification, security finding, interval-validity finding, causal effect, graph fact, allegation, or public-authority verdict.","copy_ready_caveat":"Preference Custody floor v56 composes the qualified v55 controls with PC-58. It separates complete-looking owner-login, immutable-ID, account-state, and rename badges from complete owner identity, locations, rename-event, repository-continuity, correction, and current-lineage custody."}});
const EXPECTED_MANIFEST_KEYS = Object.freeze(["schema_version","manifest_id","issue","control_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","base_floor","extension_control","identification_requirement","frontier_transition","real_case_requirements_added","prohibited_inferences","interpretation_contract"]);
const EXPECTED_BASE_FLOOR_KEYS = Object.freeze(["manifest_id","source_manifest_path","expected_build_schema","expected_control_count"]);
const EXPECTED_EXTENSION_KEYS = Object.freeze(["control_id","fixture_id","failure_class","source_fixture_path","build_artifact_path","expected_build_schema","required_refusal_rules"]);
const EXPECTED_IDENTIFICATION_KEYS = Object.freeze(["stage","required_state","refused_inference"]);
const EXPECTED_FRONTIER_KEYS = Object.freeze(["resolved_base_frontier","successor_frontiers"]);
const EXPECTED_INTERPRETATION_KEYS = Object.freeze(["contract_id","what_this_is","what_this_is_not","copy_ready_caveat"]);
const EXPECTED_SOURCE_BUNDLE_KEYS = Object.freeze(["manifest","baseBuild","targetBuild","targetFixture","baseSources"]);
const RESOLVED_FRONTIER = "linkage_interval_repository_owner_login_immutable_owner_id_account_state_and_owner_rename_governance";
const REQUIRED_SUCCESSORS = Object.freeze(["linkage_interval_repository_owner_login_canonical_profile_api_location_account_type_state_and_suspension_governance","linkage_interval_owner_rename_event_predecessor_successor_timestamp_redirect_repository_owner_pair_and_transfer_continuity_governance"]);
const PRESERVED_SIBLINGS = Object.freeze(["linkage_interval_repository_numeric_node_id_transfer_event_predecessor_successor_timestamp_redirect_and_namespace_governance","linkage_interval_repository_canonical_url_visibility_fork_parent_source_network_and_redirect_governance","linkage_interval_default_branch_tag_release_review_time_commit_ref_object_reachability_and_asset_identity_governance"]);
const BUILD_KEYS = Object.freeze(["schema_version","manifest_id","issue","control_issue","captured_at","status","graph_effect","counts_toward_thesis_evidence","conclusion_generated","real_world_evidence_state","control_count","controls","composition","control_integrity","identification_requirements","refusal_rule_union","open_frontiers","frontier_transition","promotion_boundary","custody_chain","custody_chain_head_sha256","prohibited_inferences","interpretation_contract"]);
const COMPOSITION_KEYS = Object.freeze(["base_manifest_id","base_schema_version","base_control_count","extension_control_id","manifest_snapshot_sha256","base_floor_snapshot_sha256","extension_snapshot_sha256","v55_source_bundle_schema_version","v55_source_bundle_sha256","base_controls_sha256","base_promotion_requirements_sha256","base_refusal_rule_union_sha256","base_identification_requirements_sha256","base_open_frontiers_sha256","base_prohibited_inferences_sha256","base_interpretation_contract_sha256","base_promotion_requirement_count","added_promotion_requirement_count","final_promotion_requirement_count","base_open_frontiers"]);
const CONTROL_INTEGRITY_KEYS = Object.freeze(["base_floor_qualified","base_integrity_preserved","v55_complete_source_bundle_bound","all_graph_effect_none","no_thesis_evidence_consumption","no_real_world_conclusion","no_preference_change_claim","no_intent_inference","no_security_compromise_claim","no_ownership_finding","all_required_pc58_refusal_rules_present","complete_owner_identity_path_preserved","owner_profile_account_successor_preserved","owner_rename_transfer_successor_preserved","repository_transfer_event_sibling_preserved","canonical_location_fork_sibling_preserved","branch_tag_release_commit_sibling_preserved","all_unresolved_base_frontiers_preserved"]);
const PROMOTION_KEYS = Object.freeze(["promotion_authority","promotion_requirement_count","real_case_requires","laboratory_controls_are_real_world_evidence"]);

const INPUT_VALIDATION_CACHE = new Map();
let LAST_VALIDATED_INPUT = null;

function deepFreeze(value, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor && 'value' in descriptor) deepFreeze(descriptor.value, seen);
  }
  return Object.freeze(value);
}

const record = value => {
  try {
    return value !== null && typeof value === 'object' && !Array.isArray(value) && !nodeTypes.isProxy(value);
  } catch {
    return false;
  }
};
const array = value => {
  try {
    return Array.isArray(value) && !nodeTypes.isProxy(value) ? value : [];
  } catch {
    return [];
  }
};
const text = value => String(value ?? '').trim();
const canonical = value =>
  Array.isArray(value)
    ? value.map(canonical)
    : value && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
      : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(typeof value === 'string' ? value : stable(value)).digest('hex');
const unique = values => [...new Set(array(values).map(text).filter(Boolean))];
const isoDate = value => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
};

function requireExactKeys(value, expected, label, errors) {
  if (!record(value)) {
    errors.push(`${label} must be an object`);
    return;
  }
  let keys;
  try {
    keys = Object.keys(value);
  } catch (error) {
    errors.push(`${label} keys could not be inspected: ${error.message}`);
    return;
  }
  if (stable(keys.sort()) !== stable([...expected].sort())) errors.push(`${label} keys mismatch`);
}

const NON_JSON_EXOTIC_TYPE_CHECKS = Object.freeze([
  'isAnyArrayBuffer','isArgumentsObject','isArrayBufferView','isBoxedPrimitive','isCryptoKey',
  'isDate','isExternal','isGeneratorObject','isKeyObject','isMap','isMapIterator',
  'isModuleNamespaceObject','isNativeError','isPromise','isRegExp','isSet','isSetIterator',
  'isWeakMap','isWeakSet'
]);

function brandCall(value, constructorName, property, mode = 'getter') {
  const C = globalThis[constructorName];
  if (typeof C !== 'function') return false;
  const descriptor = Object.getOwnPropertyDescriptor(C.prototype, property);
  try {
    if (mode === 'getter' && typeof descriptor?.get === 'function') {
      descriptor.get.call(value);
      return true;
    }
    if (mode === 'method' && typeof C.prototype[property] === 'function') {
      C.prototype[property].call(value, '__pc58_v56_brand_probe__');
      return true;
    }
  } catch {
    return false;
  }
  return false;
}

function nonJsonExoticKind(value) {
  for (const name of NON_JSON_EXOTIC_TYPE_CHECKS) {
    const predicate = nodeTypes[name];
    if (typeof predicate !== 'function') continue;
    try {
      if (predicate(value)) return name;
    } catch {
      return `${name}_uninspectable`;
    }
  }
  const checks = [
    ['AbortController','signal','getter'],['AbortSignal','aborted','getter'],
    ['URL','href','getter'],['URLSearchParams','append','method'],['Blob','size','getter'],
    ['Request','url','getter'],['Response','status','getter'],['Headers','get','method'],
    ['FormData','get','method']
  ];
  for (const [name, property, mode] of checks) {
    if (brandCall(value, name, property, mode)) return name;
  }
  return null;
}

function inspectCanonicalJsonTree(value, label, errors, seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) errors.push(`${label} contains a non-finite number`);
    else if (Object.is(value, -0)) errors.push(`${label} contains negative zero`);
    return;
  }
  if (typeof value !== 'object') {
    errors.push(`${label} contains unsupported ${typeof value}`);
    return;
  }
  try {
    if (nodeTypes.isProxy(value)) {
      errors.push(`${label} contains a proxy object`);
      return;
    }
  } catch {
    errors.push(`${label} proxy state is uninspectable`);
    return;
  }
  const exotic = nonJsonExoticKind(value);
  if (exotic !== null) {
    errors.push(`${label} contains a non-JSON exotic object (${exotic})`);
    return;
  }
  if (seen.has(value)) {
    errors.push(`${label} contains a cycle or repeated object identity`);
    return;
  }
  seen.add(value);
  let proto;
  let keys;
  try {
    proto = Object.getPrototypeOf(value);
    keys = Reflect.ownKeys(value);
  } catch (error) {
    errors.push(`${label} cannot be inspected: ${error.message}`);
    return;
  }
  const isArray = Array.isArray(value);
  let length = null;
  if (isArray) {
    if (proto !== Array.prototype) errors.push(`${label} array prototype must be canonical`);
    try {
      length = value.length;
    } catch (error) {
      errors.push(`${label} array length cannot be read: ${error.message}`);
      return;
    }
    if (!Number.isSafeInteger(length) || length < 0) errors.push(`${label} array length is invalid`);
    const numericKeys = keys.filter(
      key => typeof key === 'string' && key !== 'length' && /^(0|[1-9]\d*)$/.test(key) && Number(key) < length
    );
    if (numericKeys.length !== length) errors.push(`${label} contains a sparse array hole`);
  } else if (proto !== Object.prototype) {
    errors.push(`${label} object prototype must be canonical`);
  }
  for (const key of keys) {
    if (isArray && key === 'length') continue;
    if (isArray && (typeof key !== 'string' || !/^(0|[1-9]\d*)$/.test(key) || Number(key) >= length)) {
      errors.push(`${label} contains an undeclared array property ${String(key)}`);
      continue;
    }
    if (typeof key !== 'string') {
      errors.push(`${label} contains a symbol key`);
      continue;
    }
    let descriptor;
    try {
      descriptor = Object.getOwnPropertyDescriptor(value, key);
    } catch (error) {
      errors.push(`${label} descriptor ${key} cannot be read: ${error.message}`);
      continue;
    }
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      errors.push(`${label} property ${key} must be an enumerable data property`);
      continue;
    }
    inspectCanonicalJsonTree(descriptor.value, `${label}.${key}`, errors, seen);
  }
}

function validateStructuredCloneShape(original, cloned, label, errors, seen = new WeakSet()) {
  if (original === null || typeof original !== 'object') return;
  if (seen.has(original)) return;
  seen.add(original);
  const isArray = Array.isArray(original);
  if (cloned === null || typeof cloned !== 'object' || Array.isArray(cloned) !== isArray) {
    errors.push(`${label} is not preserved as a canonical JSON container by structured cloning`);
    return;
  }
  if (Object.getPrototypeOf(cloned) !== (isArray ? Array.prototype : Object.prototype)) {
    errors.push(`${label} contains a structured-clone-visible non-JSON exotic object`);
    return;
  }
  for (const key of Reflect.ownKeys(original)) {
    if (isArray && key === 'length') continue;
    if (typeof key !== 'string') continue;
    const source = Object.getOwnPropertyDescriptor(original, key);
    if (!source || !('value' in source)) continue;
    const target = Object.getOwnPropertyDescriptor(cloned, key);
    if (!target || !('value' in target)) {
      errors.push(`${label}.${key} is not preserved by structured cloning`);
      continue;
    }
    validateStructuredCloneShape(source.value, target.value, `${label}.${key}`, errors, seen);
  }
}

function validateCanonicalJsonTree(value, label, errors, seen = new WeakSet()) {
  const start = errors.length;
  inspectCanonicalJsonTree(value, label, errors, seen);
  if (errors.length !== start) return;
  let cloned;
  try {
    cloned = structuredClone(value);
  } catch (error) {
    errors.push(`${label} cannot be structured-cloned as canonical JSON: ${error.message}`);
    return;
  }
  validateStructuredCloneShape(value, cloned, label, errors);
}

function collectCaptureDates(value, path, output, seen = new WeakSet()) {
  if (value === null || typeof value !== 'object') return;
  if (seen.has(value)) return;
  seen.add(value);
  if (Object.prototype.hasOwnProperty.call(value, 'captured_at')) {
    output.push([`${path}.captured_at`, value.captured_at]);
  }
  for (const key of Object.keys(value)) {
    collectCaptureDates(value[key], `${path}.${key}`, output, seen);
  }
}


function validateChronology(floorDate, values) {
  const errors = [];
  if (!isoDate(floorDate)) return ['Preference Custody v56 floor date is invalid'];
  const dates = [];
  for (const [label, value] of values) collectCaptureDates(value, label, dates);
  for (const [label, date] of dates) {
    if (!isoDate(date)) errors.push(`${label} must be an exact ISO date`);
    else if (date > floorDate) errors.push(`${label} postdates Preference Custody v56`);
  }
  return errors;
}
function seal(event, previous_event_sha256) {
  const unsigned = { ...canonical(event), previous_event_sha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

export function loadPreferenceCustodyV55SourceBundle(load) {
  return {
    manifest: load('data/research/preference-custody/control-manifest-v55.json'),
    baseBuild: load('build/research/preference-custody-laboratory-floor-v54.json'),
    targetBuild: load('build/research/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.json'),
    targetFixture: load('data/research/preference-custody/preference-linkage-repository-owner-immutable-owner-id-repository-id-transfer-lineage-assurance.fixture.json'),
    baseSources: loadPreferenceCustodyV54SourceBundle(load)
  };
}
export const preferenceCustodyV55SourceBundleSnapshot = sourceBundle => sha256({ schema_version: PREFERENCE_CUSTODY_V55_SOURCE_BUNDLE_SCHEMA_VERSION, source_bundle: sourceBundle });
export const preferenceCustodyManifestV56Snapshot = manifest => sha256(manifest);

export function validatePreferenceCustodyManifestV56(manifest) {
  const errors = [];
  validateCanonicalJsonTree(manifest, 'Preference Custody v56 manifest', errors);
  if (errors.length) return unique(errors);
  if (!record(manifest)) return ['Preference Custody v56 manifest must be an object'];
  requireExactKeys(manifest, EXPECTED_MANIFEST_KEYS, 'Preference Custody v56 manifest', errors);
  for (const field of ['base_floor','extension_control','identification_requirement','frontier_transition','interpretation_contract']) if (!record(manifest[field])) errors.push(`Preference Custody v56 manifest ${field} must be an object`);
  for (const field of ['real_case_requirements_added','prohibited_inferences']) if (!Array.isArray(manifest[field])) errors.push(`Preference Custody v56 manifest ${field} must be an array`);
  if (record(manifest.extension_control) && !Array.isArray(manifest.extension_control.required_refusal_rules)) errors.push('Preference Custody v56 extension required_refusal_rules must be an array');
  if (record(manifest.frontier_transition) && !Array.isArray(manifest.frontier_transition.successor_frontiers)) errors.push('Preference Custody v56 successor_frontiers must be an array');
  if (errors.length) return unique(errors);
  requireExactKeys(manifest.base_floor, EXPECTED_BASE_FLOOR_KEYS, 'Preference Custody v56 base floor', errors);
  requireExactKeys(manifest.extension_control, EXPECTED_EXTENSION_KEYS, 'Preference Custody v56 extension', errors);
  requireExactKeys(manifest.identification_requirement, EXPECTED_IDENTIFICATION_KEYS, 'Preference Custody v56 identification requirement', errors);
  requireExactKeys(manifest.frontier_transition, EXPECTED_FRONTIER_KEYS, 'Preference Custody v56 frontier transition', errors);
  requireExactKeys(manifest.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'Preference Custody v56 interpretation contract', errors);
  if (errors.length) return unique(errors);
  const base = manifest.base_floor;
  const extension = manifest.extension_control;
  const transition = manifest.frontier_transition;
  if (manifest.schema_version !== PREFERENCE_CUSTODY_MANIFEST_V56_SCHEMA_VERSION || manifest.manifest_id !== 'preference-custody-laboratory-floor-v56') errors.push('Preference Custody v56 identity mismatch');
  if (manifest.issue !== 594 || manifest.control_issue !== 1592) errors.push('Preference Custody v56 issue binding mismatch');
  if (manifest.captured_at !== "2026-08-08" || !isoDate(manifest.captured_at)) errors.push('Preference Custody v56 capture date mismatch');
  if (manifest.status !== 'synthetic_control_floor_extension' || manifest.graph_effect !== 'none' || manifest.counts_toward_thesis_evidence !== false) errors.push('Preference Custody v56 authority/status mismatch');
  if (base.manifest_id !== 'preference-custody-laboratory-floor-v55' || base.source_manifest_path !== 'data/research/preference-custody/control-manifest-v55.json' || base.expected_build_schema !== 'preference-custody-control-manifest-v55-build@1' || base.expected_control_count !== 57) errors.push('Preference Custody v56 base-floor contract mismatch');
  if (extension.control_id !== 'PC-58' || extension.fixture_id !== 'same-linkage-owner-login-id-state-rename-status-different-owner-identity-states-v1' || extension.expected_build_schema !== PREFERENCE_LINKAGE_REPOSITORY_OWNER_LOGIN_IMMUTABLE_OWNER_ID_ACCOUNT_STATE_OWNER_RENAME_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('Preference Custody v56 extension contract mismatch');
  if (stable(extension.required_refusal_rules) !== stable(REQUIRED_PREFERENCE_LINKAGE_REPOSITORY_OWNER_LOGIN_IMMUTABLE_OWNER_ID_ACCOUNT_STATE_OWNER_RENAME_ASSURANCE_REFUSAL_RULES)) errors.push('Preference Custody v56 extension refusal-rule ledger mismatch');
  if (transition.resolved_base_frontier !== RESOLVED_FRONTIER || stable(transition.successor_frontiers) !== stable(REQUIRED_SUCCESSORS)) errors.push('Preference Custody v56 frontier transition mismatch');
  if (manifest.real_case_requirements_added.length !== 58 || unique(manifest.real_case_requirements_added).length !== 58) errors.push('Preference Custody v56 must add exactly 58 unique promotion requirements');
  if (manifest.prohibited_inferences.length !== 16 || unique(manifest.prohibited_inferences).length !== 16) errors.push('Preference Custody v56 prohibited-inference ledger mismatch');
  const snapshot = preferenceCustodyManifestV56Snapshot(manifest);
  if (snapshot !== EXPECTED_MANIFEST_SNAPSHOT_SHA256 || stable(manifest) !== stable(EXPECTED_MANIFEST_LITERAL)) errors.push(`Preference Custody v56 manifest snapshot mismatch: ${snapshot}`);
  return unique(errors);
}

function validateCustodyChainShape(build, label, errors) {
  if (!Array.isArray(build?.custody_chain) || build.custody_chain.length !== 5) { errors.push(`${label} custody chain must contain five events`); return; }
  let previous = null;
  for (const [index, event] of build.custody_chain.entries()) {
    if (!record(event)) { errors.push(`${label} custody event ${index} must be an object`); continue; }
    if (event.previous_event_sha256 !== previous) errors.push(`${label} custody event ${index} previous hash mismatch`);
    const { event_sha256, ...unsigned } = event;
    if (event_sha256 !== sha256(unsigned)) errors.push(`${label} custody event ${index} hash mismatch`);
    previous = event_sha256;
  }
  if (build.custody_chain_head_sha256 !== previous) errors.push(`${label} custody chain head mismatch`);
}

function validateQualifiedV55Base(baseBuild, baseSources, errors) {
  if (!record(baseSources)) return;
  errors.push(...validatePreferenceCustodyManifestV55(baseSources.manifest));
  if (sha256(baseBuild) !== EXPECTED_V55_BASE_BUILD_SHA256) errors.push('Preference Custody v55 exact qualified base build identity mismatch');
  if (preferenceCustodyV55SourceBundleSnapshot(baseSources) !== EXPECTED_V55_SOURCE_BUNDLE_SHA256) errors.push('Preference Custody v55 exact transitive source-bundle identity mismatch');
  if (baseBuild?.schema_version !== 'preference-custody-control-manifest-v55-build@1' || baseBuild?.manifest_id !== 'preference-custody-laboratory-floor-v55' || baseBuild?.control_count !== 57) errors.push('Preference Custody v55 qualified base identity mismatch');
  if (!record(baseBuild?.composition)) errors.push('Preference Custody v55 qualified base composition missing');
  else {
    if (baseBuild.composition.manifest_snapshot_sha256 !== preferenceCustodyManifestV55Snapshot(baseSources.manifest)) errors.push('Preference Custody v55 manifest/source divergence');
    if (baseBuild.composition.base_floor_snapshot_sha256 !== sha256(baseSources.baseBuild)) errors.push('Preference Custody v55 base-build/source divergence');
    if (baseBuild.composition.extension_snapshot_sha256 !== sha256(baseSources.targetBuild)) errors.push('Preference Custody v55 extension/source divergence');
    if (baseBuild.composition.v54_source_bundle_sha256 !== preferenceCustodyV54SourceBundleSnapshot(baseSources.baseSources)) errors.push('Preference Custody v55 transitive-source divergence');
    if (baseBuild.composition.base_controls_sha256 !== sha256(baseSources.baseBuild?.controls)) errors.push('Preference Custody v55 base-control divergence');
    if (baseBuild.composition.base_promotion_requirements_sha256 !== sha256(baseSources.baseBuild?.promotion_boundary?.real_case_requires)) errors.push('Preference Custody v55 base-promotion divergence');
    if (baseBuild.composition.base_refusal_rule_union_sha256 !== sha256(baseSources.baseBuild?.refusal_rule_union)) errors.push('Preference Custody v55 base-refusal divergence');
    if (baseBuild.composition.base_identification_requirements_sha256 !== sha256(baseSources.baseBuild?.identification_requirements)) errors.push('Preference Custody v55 base-identification divergence');
    if (baseBuild.composition.base_open_frontiers_sha256 !== sha256(baseSources.baseBuild?.open_frontiers)) errors.push('Preference Custody v55 base-frontier divergence');
    if (baseBuild.composition.base_prohibited_inferences_sha256 !== sha256(baseSources.baseBuild?.prohibited_inferences)) errors.push('Preference Custody v55 base-prohibited-inference divergence');
    if (baseBuild.composition.base_interpretation_contract_sha256 !== sha256(baseSources.baseBuild?.interpretation_contract)) errors.push('Preference Custody v55 base-interpretation divergence');
  }
  if (!Array.isArray(baseBuild?.controls) || baseBuild.controls.length !== 57 || baseBuild.controls.at(-1)?.control_id !== 'PC-57') errors.push('Preference Custody v55 qualified controls mismatch');
  if (baseBuild?.controls?.at(-1)?.build_snapshot_sha256 !== sha256(baseSources.targetBuild)) errors.push('Preference Custody v55 extension build hash mismatch');
  if (baseBuild?.controls?.at(-1)?.fixture_snapshot_sha256 !== baseSources.targetBuild?.fixture_snapshot_sha256) errors.push('Preference Custody v55 extension fixture hash mismatch');
  if (baseBuild?.promotion_boundary?.promotion_requirement_count !== 2348) errors.push('Preference Custody v55 promotion denominator mismatch');
  if (!record(baseBuild?.control_integrity) || Object.values(baseBuild.control_integrity).some(value => value !== true)) errors.push('Preference Custody v55 qualified integrity ledger mismatch');
  validateCustodyChainShape(baseBuild, 'Preference Custody v55 qualified base', errors);
}

function validateInputBundle(manifest, liveBaseBuild, liveTargetBuild, liveTargetFixture, liveBaseSources) {
  const manifestErrors = validatePreferenceCustodyManifestV56(manifest);
  if (manifestErrors.length) return manifestErrors;
  if (LAST_VALIDATED_INPUT && LAST_VALIDATED_INPUT.manifest === manifest && LAST_VALIDATED_INPUT.baseBuild === liveBaseBuild && LAST_VALIDATED_INPUT.targetBuild === liveTargetBuild && LAST_VALIDATED_INPUT.targetFixture === liveTargetFixture && LAST_VALIDATED_INPUT.baseSources === liveBaseSources) return [...LAST_VALIDATED_INPUT.result];
  const errors = [];
  const liveRoot = { manifest, baseBuild: liveBaseBuild, targetBuild: liveTargetBuild, targetFixture: liveTargetFixture, baseSources: liveBaseSources };
  validateCanonicalJsonTree(liveRoot, 'Preference Custody v56 live input graph', errors, new WeakSet());
  if (errors.length) return unique(errors);
  let snapshot;
  try { snapshot = structuredClone(liveRoot); } catch (error) { return [`Preference Custody v56 input snapshot failed: ${error.message}`]; }
  const liveDigest = sha256(liveRoot);
  const snapshotDigest = sha256(snapshot);
  if (liveDigest !== snapshotDigest) errors.push('Preference Custody v56 live/snapshot input digest mismatch');
  const cacheKey = sha256({ inputs: snapshotDigest });
  const cached = INPUT_VALIDATION_CACHE.get(cacheKey);
  if (cached) return [...cached];
  const { manifest: snapshotManifest, baseBuild, targetBuild, targetFixture, baseSources } = snapshot;
  requireExactKeys(baseSources, EXPECTED_SOURCE_BUNDLE_KEYS, 'Preference Custody v55 source bundle', errors);
  errors.push(...validatePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceFixture(targetFixture));
  errors.push(...validatePreferenceLinkageRepositoryOwnerLoginImmutableOwnerIdAccountStateOwnerRenameAssuranceBuild(targetBuild, targetFixture));
  if (baseBuild?.schema_version !== snapshotManifest.base_floor.expected_build_schema || baseBuild?.manifest_id !== snapshotManifest.base_floor.manifest_id || baseBuild?.control_count !== snapshotManifest.base_floor.expected_control_count) errors.push('Preference Custody v56 base build identity mismatch');
  if (baseSources?.manifest?.manifest_id !== 'preference-custody-laboratory-floor-v55') errors.push('Preference Custody v55 source manifest identity mismatch');
  validateQualifiedV55Base(baseBuild, baseSources, errors);
  errors.push(...validateChronology(snapshotManifest.captured_at, [['v55-base-build', baseBuild], ['pc58-build', targetBuild], ['pc58-fixture', targetFixture], ['v55-source-bundle', baseSources]]));
  if (sha256(liveRoot) !== liveDigest) errors.push('Preference Custody v56 live input mutated during validation');
  if (sha256(snapshot) !== snapshotDigest) errors.push('Preference Custody v56 input snapshot mutated during validation');
  const result = unique(errors);
  INPUT_VALIDATION_CACHE.set(cacheKey, [...result]);
  if (result.length === 0) {
    deepFreeze(manifest); deepFreeze(liveBaseBuild); deepFreeze(liveTargetBuild); deepFreeze(liveTargetFixture); deepFreeze(liveBaseSources);
    LAST_VALIDATED_INPUT = { manifest, baseBuild: liveBaseBuild, targetBuild: liveTargetBuild, targetFixture: liveTargetFixture, baseSources: liveBaseSources, result: [...result] };
  }
  return result;
}

function extensionControl(manifest, targetBuild) {
  return {
    control_id: 'PC-58', fixture_id: manifest.extension_control.fixture_id, failure_class: manifest.extension_control.failure_class,
    source_fixture_path: manifest.extension_control.source_fixture_path, build_artifact_path: manifest.extension_control.build_artifact_path,
    graph_effect: 'none', counts_toward_thesis_evidence: false, conclusion_generated: false, real_world_effect_claimed: false,
    preference_change_present: false, manipulative_intent_inferable: false, security_compromise_claimed: false, ownership_finding_claimed: false,
    required_refusal_rules: [...manifest.extension_control.required_refusal_rules], observed_refusal_rules: [...targetBuild.required_refusal_rules],
    fixture_snapshot_sha256: targetBuild.fixture_snapshot_sha256, build_snapshot_sha256: sha256(targetBuild), public_signature_count: targetBuild.public_signature_count,
    owner_identity_governance_signature_count: targetBuild.owner_identity_governance_signature_count,
    complete_assurance_world_count: targetBuild.complete_assurance_world_count, metrics: canonical(targetBuild.metrics), classification: canonical(targetBuild.classification)
  };
}
function custodyChain(manifest, baseBuild, targetBuild, parts) {
  const events = [
    { event_id: `${manifest.manifest_id}:manifest`, event_type: 'manifest_frozen', authority: 'preference_custody_v56_analyst', evidence_class: 'candidate_inference', source_event_ids: [], payload: { manifest_snapshot_sha256: parts.manifestSnapshot, graph_effect: 'none' } },
    { event_id: `${manifest.manifest_id}:base`, event_type: 'qualified_base_bound', authority: 'preference_custody_v56_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:manifest`], payload: { base_manifest_id: baseBuild.manifest_id, base_control_count: baseBuild.control_count, base_floor_snapshot_sha256: parts.baseSnapshot, v55_source_bundle_sha256: parts.sourceSnapshot } },
    { event_id: `${manifest.manifest_id}:extension`, event_type: 'pc58_extension_bound', authority: 'preference_custody_v56_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:base`], payload: { control_id: 'PC-58', extension_snapshot_sha256: parts.targetSnapshot, complete_assurance_world_count: targetBuild.complete_assurance_world_count } },
    { event_id: `${manifest.manifest_id}:promotion`, event_type: 'promotion_boundary_extended', authority: 'preference_custody_v56_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:extension`], payload: { base_promotion_requirement_count: baseBuild.promotion_boundary.promotion_requirement_count, added_promotion_requirement_count: manifest.real_case_requirements_added.length, final_promotion_requirement_count: parts.finalRequirementCount, laboratory_controls_are_real_world_evidence: false } },
    { event_id: `${manifest.manifest_id}:interpretation`, event_type: 'interpretation_sealed', authority: 'preference_custody_v56_analyst', evidence_class: 'candidate_inference', source_event_ids: [`${manifest.manifest_id}:promotion`], payload: { graph_effect: 'none', real_world_evidence_state: 'none', interpretation_contract: canonical(manifest.interpretation_contract) } }
  ];
  let previous = null;
  return events.map(event => { const sealed = seal(event, previous); previous = sealed.event_sha256; return sealed; });
}

export function compilePreferenceCustodyManifestV56(manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = validateInputBundle(manifest, baseBuild, targetBuild, targetFixture, baseSources);
  if (errors.length) throw new Error(errors.join('\n'));
  const extension = extensionControl(manifest, targetBuild);
  const controls = [...structuredClone(baseBuild.controls), extension];
  const openFrontiers = unique([...baseBuild.open_frontiers.filter(frontier => frontier !== RESOLVED_FRONTIER), ...manifest.frontier_transition.successor_frontiers]);
  const promotionRequirements = unique([...baseBuild.promotion_boundary.real_case_requires, ...manifest.real_case_requirements_added]);
  const manifestSnapshot = preferenceCustodyManifestV56Snapshot(manifest);
  const baseSnapshot = sha256(baseBuild);
  const targetSnapshot = sha256(targetBuild);
  const sourceSnapshot = preferenceCustodyV55SourceBundleSnapshot(baseSources);
  const finalRequirementCount = promotionRequirements.length;
  const composition = {
    base_manifest_id: baseBuild.manifest_id, base_schema_version: baseBuild.schema_version, base_control_count: baseBuild.control_count,
    extension_control_id: 'PC-58', manifest_snapshot_sha256: manifestSnapshot, base_floor_snapshot_sha256: baseSnapshot,
    extension_snapshot_sha256: targetSnapshot, v55_source_bundle_schema_version: PREFERENCE_CUSTODY_V55_SOURCE_BUNDLE_SCHEMA_VERSION,
    v55_source_bundle_sha256: sourceSnapshot, base_controls_sha256: sha256(baseBuild.controls),
    base_promotion_requirements_sha256: sha256(baseBuild.promotion_boundary.real_case_requires), base_refusal_rule_union_sha256: sha256(baseBuild.refusal_rule_union),
    base_identification_requirements_sha256: sha256(baseBuild.identification_requirements), base_open_frontiers_sha256: sha256(baseBuild.open_frontiers),
    base_prohibited_inferences_sha256: sha256(baseBuild.prohibited_inferences), base_interpretation_contract_sha256: sha256(baseBuild.interpretation_contract),
    base_promotion_requirement_count: baseBuild.promotion_boundary.promotion_requirement_count, added_promotion_requirement_count: manifest.real_case_requirements_added.length,
    final_promotion_requirement_count: finalRequirementCount, base_open_frontiers: [...baseBuild.open_frontiers]
  };
  const unresolvedBaseFrontiers = baseBuild.open_frontiers.filter(frontier => frontier !== RESOLVED_FRONTIER);
  const integrity = {
    base_floor_qualified: true,
    base_integrity_preserved: sha256(controls.slice(0, 57)) === sha256(baseBuild.controls),
    v55_complete_source_bundle_bound: true,
    all_graph_effect_none: controls.every(control => control.graph_effect === 'none'),
    no_thesis_evidence_consumption: controls.every(control => control.counts_toward_thesis_evidence === false),
    no_real_world_conclusion: controls.every(control => control.conclusion_generated === false),
    no_preference_change_claim: controls.every(control => control.preference_change_present !== true),
    no_intent_inference: controls.every(control => control.manipulative_intent_inferable !== true),
    no_security_compromise_claim: controls.every(control => control.security_compromise_claimed !== true),
    no_ownership_finding: controls.every(control => control.ownership_finding_claimed !== true),
    all_required_pc58_refusal_rules_present: manifest.extension_control.required_refusal_rules.every(rule => extension.observed_refusal_rules.includes(rule)),
    complete_owner_identity_path_preserved: targetBuild.complete_assurance_world_count === 1,
    owner_profile_account_successor_preserved: openFrontiers.includes(REQUIRED_SUCCESSORS[0]),
    owner_rename_transfer_successor_preserved: openFrontiers.includes(REQUIRED_SUCCESSORS[1]),
    repository_transfer_event_sibling_preserved: openFrontiers.includes(PRESERVED_SIBLINGS[0]),
    canonical_location_fork_sibling_preserved: openFrontiers.includes(PRESERVED_SIBLINGS[1]),
    branch_tag_release_commit_sibling_preserved: openFrontiers.includes(PRESERVED_SIBLINGS[2]),
    all_unresolved_base_frontiers_preserved: unresolvedBaseFrontiers.every(frontier => openFrontiers.includes(frontier))
  };
  const chain = custodyChain(manifest, baseBuild, targetBuild, { manifestSnapshot, baseSnapshot, targetSnapshot, sourceSnapshot, finalRequirementCount });
  return {
    schema_version: PREFERENCE_CUSTODY_MANIFEST_V56_BUILD_SCHEMA_VERSION, manifest_id: manifest.manifest_id, issue: manifest.issue,
    control_issue: manifest.control_issue, captured_at: manifest.captured_at, status: 'synthetic_preference_custody_floor_v56_compiled',
    graph_effect: 'none', counts_toward_thesis_evidence: false, conclusion_generated: false, real_world_evidence_state: 'none',
    control_count: controls.length, controls, composition, control_integrity: integrity,
    identification_requirements: [...structuredClone(baseBuild.identification_requirements), canonical(manifest.identification_requirement)],
    refusal_rule_union: unique([...baseBuild.refusal_rule_union, ...manifest.extension_control.required_refusal_rules]),
    open_frontiers: openFrontiers, frontier_transition: canonical(manifest.frontier_transition),
    promotion_boundary: { promotion_authority: baseBuild.promotion_boundary.promotion_authority, promotion_requirement_count: finalRequirementCount, real_case_requires: promotionRequirements, laboratory_controls_are_real_world_evidence: false },
    custody_chain: chain, custody_chain_head_sha256: chain.at(-1).event_sha256,
    prohibited_inferences: unique([...baseBuild.prohibited_inferences, ...manifest.prohibited_inferences]),
    interpretation_contract: canonical(manifest.interpretation_contract)
  };
}

function validateChain(build, errors) {
  if (!Array.isArray(build.custody_chain) || build.custody_chain.length !== 5) { errors.push('Preference Custody v56 custody chain must contain five events'); return; }
  if (build.custody_chain.some(event => !record(event))) { errors.push('Preference Custody v56 custody events must be objects'); return; }
  let previous = null;
  for (const [index, event] of build.custody_chain.entries()) {
    if (event.previous_event_sha256 !== previous) errors.push(`Preference Custody v56 custody event ${index} previous hash mismatch`);
    const { event_sha256, ...unsigned } = event;
    if (event_sha256 !== sha256(unsigned)) errors.push(`Preference Custody v56 custody event ${index} hash mismatch`);
    previous = event_sha256;
  }
  if (build.custody_chain_head_sha256 !== previous) errors.push('Preference Custody v56 custody chain head mismatch');
}

export function validatePreferenceCustodyManifestV56Build(build, manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = [];
  validateCanonicalJsonTree(build, 'Preference Custody v56 build', errors);
  if (errors.length) return unique(errors);
  if (!record(build)) return ['Preference Custody v56 build must be an object'];
  requireExactKeys(build, BUILD_KEYS, 'Preference Custody v56 build', errors);
  for (const field of ['controls','identification_requirements','refusal_rule_union','open_frontiers','custody_chain','prohibited_inferences']) if (!Array.isArray(build[field])) errors.push(`Preference Custody v56 build ${field} must be an array`);
  for (const field of ['composition','control_integrity','frontier_transition','promotion_boundary','interpretation_contract']) if (!record(build[field])) errors.push(`Preference Custody v56 build ${field} must be an object`);
  if (Array.isArray(build.controls) && build.controls.some(control => !record(control))) errors.push('Preference Custody v56 controls must contain objects');
  if (Array.isArray(build.custody_chain) && build.custody_chain.some(event => !record(event))) errors.push('Preference Custody v56 custody events must contain objects');
  if (errors.length) return unique(errors);
  requireExactKeys(build.composition, COMPOSITION_KEYS, 'Preference Custody v56 composition', errors);
  requireExactKeys(build.control_integrity, CONTROL_INTEGRITY_KEYS, 'Preference Custody v56 control integrity', errors);
  requireExactKeys(build.frontier_transition, EXPECTED_FRONTIER_KEYS, 'Preference Custody v56 frontier transition', errors);
  requireExactKeys(build.promotion_boundary, PROMOTION_KEYS, 'Preference Custody v56 promotion boundary', errors);
  requireExactKeys(build.interpretation_contract, EXPECTED_INTERPRETATION_KEYS, 'Preference Custody v56 interpretation contract', errors);
  if (errors.length) return unique(errors);
  const inputErrors = validateInputBundle(manifest, baseBuild, targetBuild, targetFixture, baseSources);
  errors.push(...inputErrors);
  if (inputErrors.length) return unique(errors);
  let expected;
  try { expected = compilePreferenceCustodyManifestV56(manifest, baseBuild, targetBuild, targetFixture, baseSources); }
  catch (error) { errors.push(`Preference Custody v56 deterministic compile failed: ${error.message}`); return unique(errors); }
  if (stable(build) !== stable(expected)) errors.push('Preference Custody v56 build differs from deterministic compilation');
  if (build.control_count !== 58 || stable(build.controls.slice(0, 57)) !== stable(baseBuild.controls) || build.controls.at(-1)?.control_id !== 'PC-58') errors.push('Preference Custody v56 control denominator mismatch');
  if (build.promotion_boundary.promotion_requirement_count !== 2406 || build.composition.base_promotion_requirement_count !== 2348 || build.composition.added_promotion_requirement_count !== 58 || build.composition.final_promotion_requirement_count !== 2406) errors.push('Preference Custody v56 promotion denominator mismatch');
  if (build.open_frontiers.includes(RESOLVED_FRONTIER)) errors.push('Preference Custody v56 resolved frontier remains open');
  for (const frontier of [...REQUIRED_SUCCESSORS, ...PRESERVED_SIBLINGS]) if (!build.open_frontiers.includes(frontier)) errors.push(`Preference Custody v56 missing required open frontier ${frontier}`);
  for (const frontier of baseBuild.open_frontiers.filter(frontier => frontier !== RESOLVED_FRONTIER)) if (!build.open_frontiers.includes(frontier)) errors.push(`Preference Custody v56 dropped base frontier ${frontier}`);
  if (Object.values(build.control_integrity).some(value => value !== true)) errors.push('Preference Custody v56 integrity ledger contains a false value');
  validateChain(build, errors);
  return unique(errors);
}

export function renderPreferenceCustodyManifestV56Markdown(build) {
  return `# Preference Custody laboratory floor v56

Synthetic compositional floor only. Graph effect: **${build.graph_effect}**. Real-world evidence: **${build.real_world_evidence_state}**.

| Measure | Value |
| --- | ---: |
| Base controls | ${build.composition.base_control_count} |
| PC-58 extension | 1 |
| Final controls | ${build.control_count} |
| Base promotion requirements | ${build.composition.base_promotion_requirement_count} |
| Requirements added | ${build.composition.added_promotion_requirement_count} |
| Final promotion requirements | ${build.promotion_boundary.promotion_requirement_count} |

Resolved frontier: \`${build.frontier_transition.resolved_base_frontier}\`.

Successor frontiers:
${build.frontier_transition.successor_frontiers.map(frontier => `- \`${frontier}\``).join('\n')}

The qualified v55 base is hash-bound and byte-preserved. PC-58 creates no real ownership, owner-account finding, rename finding, repository review, transfer finding, release, security, effect, graph, allegation, adoption, or public-authority conclusion.
`;
}
