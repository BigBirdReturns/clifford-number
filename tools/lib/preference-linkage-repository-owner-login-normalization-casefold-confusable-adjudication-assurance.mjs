import { createHash } from 'node:crypto';
import { types as nodeTypes } from 'node:util';

export const BUILD_SCHEMA_VERSION = 'preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance-build@1';
export const FIXTURE_SCHEMA_VERSION = 'preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance-fixture@1';
export const REQUIRED_REFUSAL_RULES = Object.freeze([
  'one_normalized_string_is_not_normalization_form_unicode_data_version_implementation_decomposition_combining_class_composition_exclusion_recomposition_quick_check_idempotence_and_equivalence_class_custody',
  'one_case_insensitive_comparison_is_not_full_simple_casefold_locale_tailoring_turkic_final_sigma_dotted_dotless_i_display_case_and_canonical_case_custody',
  'one_script_label_is_not_script_extensions_mixed_script_allowed_script_set_and_restricted_identifier_profile_custody',
  'one_confusable_skeleton_is_not_algorithm_version_mapping_table_normalization_order_whole_script_mixed_script_candidate_universe_and_collision_set_custody',
  'one_collision_disposition_is_not_adjudicator_identity_authority_evidence_rejected_candidate_exception_expiration_and_appeal_custody',
  'matching_repository_replays_are_not_proof_that_the_same_unicode_data_normalization_implementation_locale_script_skeleton_candidate_universe_and_adjudication_policy_were_used',
  'historical_normalization_collision_assurance_is_not_current_after_unicode_data_algorithm_implementation_locale_script_skeleton_collision_policy_adjudicator_exception_correction_release_or_use_succession',
  'normalization_or_collision_failure_is_not_proof_of_ownership_transfer_impersonation_compromise_misconduct_coordination_common_purpose_intent_or_graph_linkage',
  'binding_public_authority_requires_separate_current_public_authorization_receipts',
  'synthetic_normalization_collision_burdens_are_not_real_world_defect_prevalence_causal_effect_ownership_compromise_or_institutional_performance_estimates'
]);

const EXPECTED_FIXTURE_SHA256 = 'c2bba8d5fb8158f47b9d7907fa0a7c782df6ee5f9cfd3a2f8941842a4e0cf075';
const EXPECTED_WORLD_SNAPSHOTS = Object.freeze({
  complete_owner_login_normalization_casefold_confusable_collision_assurance: '5ee90500ebd083c568cede846fe399462a370d9c919c7a51bc842e515afaea1e',
  normalization_form_or_unicode_data_version_substitution: 'f1e2b50d71532c9a7b9e93a700a822bb4a8b16d99f5ff7023c76bee62f02615d',
  normalization_implementation_conformance_gap: '70e2fc0284b82e743536852910bb57cf61764923b6af22676cadd13e9f54b2b4',
  casefold_locale_tailoring_substitution: 'cee7b1f60cec167805ebaed134f833965d4d98515e65c3f0f9ae5b059d50be2b',
  script_inventory_or_mixed_script_policy_gap: 'e4cdea4bb2f6c1fd8a86c60faef4663475801d48c4d996d56d384c95704f90df',
  confusable_skeleton_mapping_substitution: 'f7350fada23ea2b4a394a155dbb3c69e1dc5e3e7a5fdd6c6b1e518bc6cb9c312',
  collision_candidate_set_or_adjudication_gap: 'cd81d1c71712607465f8cd993f002f4a0c358bc603b54ab5e14ec06d7c274eae',
  historical_normalization_collision_assurance_inherited_after_succession: 'bd98b8737b4a654c6ccb6ce5b9b202d99e6bb4a4c0fc3a5057337ee773baaddc'
});

const ROOT_KEYS = Object.freeze([
  'schema_version', 'fixture_id', 'issue', 'parent_program_issue', 'captured_at',
  'status', 'graph_effect', 'counts_toward_thesis_evidence', 'baseline',
  'interpretation_contract', 'required_refusal_rules', 'expected_classification', 'worlds'
]);
const BASELINE_KEYS = Object.freeze([
  'operative_release', 'published_candidate_pairs', 'published_interval_bearing_pairs',
  'published_nominal_coverage', 'published_empirical_coverage', 'published_interval_misses',
  'published_mean_interval_width', 'public_repository_status', 'public_owner_status',
  'public_owner_login_status', 'public_owner_unicode_status', 'public_owner_confusable_status',
  'public_owner_collision_status', 'public_immutable_owner_id_status',
  'published_repository_replays', 'published_matching_repository_replays', 'approved_use'
]);
const INTERPRETATION_KEYS = Object.freeze(['what_this_is', 'what_this_is_not', 'copy_ready_caveat']);
const CLASSIFICATION_KEYS = Object.freeze([
  'public_unicode_badge_identifies_complete_normalization_implementation',
  'public_confusable_badge_identifies_complete_skeleton_mapping',
  'public_collision_badge_identifies_complete_candidate_set_and_adjudication',
  'one_normalized_output_identifies_canonical_equivalence_class',
  'one_casefolded_output_identifies_locale_policy',
  'one_confusable_skeleton_identifies_complete_collision_universe',
  'matching_repository_replays_establish_current_normalization_collision_assurance',
  'ownership_established', 'impersonation_established', 'security_compromise_established',
  'graph_effect_present', 'binding_public_authority_present',
  'complete_owner_login_normalization_casefold_confusable_collision_assurance_supported_in_at_least_one_world'
]);
const WORLD_KEYS = Object.freeze([
  'world_id', 'description', 'normalization_profile', 'implementation_conformance',
  'casefold_locale', 'script_policy', 'confusable_mapping', 'collision_adjudication',
  'lineage', 'expected_mechanism', 'expected_flags'
]);

const NORMALIZATION_BOOL = Object.freeze([
  'observed_login_literal_bound', 'login_utf8_bytes_bound', 'login_unicode_codepoints_bound',
  'unicode_scalar_value_validity_bound', 'normalization_form_bound', 'unicode_data_version_bound',
  'normalized_output_identity_bound', 'normalized_equivalence_class_identity_bound',
  'immutable_numeric_owner_id_bound', 'owner_node_id_bound', 'owner_database_id_consistency_bound'
]);
const NORMALIZATION_COUNT = Object.freeze(['normalization_form_unicode_version_substitutions']);
const IMPLEMENTATION_BOOL = Object.freeze([
  'normalization_algorithm_identity_bound', 'normalization_algorithm_version_bound',
  'normalization_implementation_identity_bound', 'normalization_implementation_version_bound',
  'canonical_decomposition_table_bound', 'compatibility_decomposition_policy_bound',
  'canonical_combining_class_table_bound', 'composition_exclusion_table_bound',
  'recomposition_policy_bound', 'normalization_quick_check_policy_bound',
  'stream_safe_text_policy_bound', 'normalization_idempotence_checked', 'canonical_ordering_checked'
]);
const IMPLEMENTATION_COUNT = Object.freeze(['normalization_implementation_conformance_gaps']);
const CASEFOLD_BOOL = Object.freeze([
  'casefold_algorithm_identity_bound', 'casefold_algorithm_version_bound', 'casefold_mode_bound',
  'casefold_unicode_data_version_bound', 'casefold_locale_policy_bound', 'locale_tailoring_table_bound',
  'turkic_casefold_policy_bound', 'final_sigma_policy_bound', 'dotted_dotless_i_policy_bound',
  'display_case_bound', 'canonical_case_bound'
]);
const CASEFOLD_COUNT = Object.freeze(['casefold_locale_tailoring_substitutions']);
const SCRIPT_BOOL = Object.freeze([
  'script_inventory_bound', 'script_extensions_inventory_bound', 'mixed_script_policy_bound',
  'allowed_script_set_bound', 'restricted_identifier_profile_bound'
]);
const SCRIPT_COUNT = Object.freeze(['script_inventory_mixed_script_gaps']);
const CONFUSABLE_BOOL = Object.freeze([
  'confusable_skeleton_bound', 'confusable_algorithm_identity_bound',
  'confusable_algorithm_version_bound', 'confusables_data_version_bound',
  'skeleton_mapping_table_bound', 'skeleton_normalization_order_bound',
  'whole_script_confusable_policy_bound', 'mixed_script_confusable_policy_bound'
]);
const CONFUSABLE_COUNT = Object.freeze(['confusable_skeleton_substitutions']);
const COLLISION_BOOL = Object.freeze([
  'confusable_candidate_universe_bound', 'collision_set_bound', 'collision_detection_time_bound',
  'collision_adjudication_identity_bound', 'collision_adjudicator_authority_bound',
  'collision_evidence_ledger_bound', 'rejected_collision_candidates_bound',
  'accepted_collision_exception_bound', 'collision_exception_expiration_bound',
  'collision_appeal_process_bound'
]);
const COLLISION_COUNT = Object.freeze(['collision_candidate_set_gaps', 'collision_adjudication_appeal_gaps']);
const LINEAGE_BOOL = Object.freeze([
  'assurance_current', 'approved_unicode_data_lineage_current',
  'approved_normalization_lineage_current', 'approved_implementation_lineage_current',
  'approved_casefold_lineage_current', 'approved_locale_lineage_current',
  'approved_script_lineage_current', 'approved_confusable_lineage_current',
  'approved_collision_lineage_current', 'approved_adjudicator_lineage_current',
  'approved_exception_lineage_current', 'approved_policy_lineage_current',
  'approved_correction_lineage_current', 'approved_release_lineage_current',
  'approved_use_lineage_current', 'monitoring_defined', 'invalidation_defined',
  'quarantine_defined', 'correction_defined', 'rollback_defined', 'rereview_defined',
  'republication_defined', 'appeal_defined', 'durability_defined'
]);
const LINEAGE_COUNT = Object.freeze([
  'unreconciled_normalization_collision_decisions',
  'stale_normalization_collision_decisions',
  'unsupported_normalization_collision_decisions'
]);
const FLAG_KEYS = Object.freeze([
  'complete_normalization_profile', 'complete_implementation_conformance',
  'complete_casefold_locale', 'complete_script_policy', 'complete_confusable_mapping',
  'complete_collision_adjudication', 'current_normalization_collision_lineage',
  'complete_owner_login_normalization_casefold_confusable_collision_assurance'
]);
const BUILD_KEYS = Object.freeze([
  'schema_version', 'fixture_id', 'issue', 'captured_at', 'status', 'graph_effect',
  'counts_toward_thesis_evidence', 'fixture_snapshot_sha256', 'public_surface',
  'worlds', 'metrics', 'expected_classification', 'refusal_rules', 'custody_chain',
  'custody_chain_head_sha256', 'interpretation_contract'
]);
const BUILD_WORLD_KEYS = Object.freeze([
  'world_id', 'description', 'public_signature_sha256', 'governance_signature_sha256',
  'normalization_profile', 'implementation_conformance', 'casefold_locale', 'script_policy',
  'confusable_mapping', 'collision_adjudication', 'lineage', 'mechanism', 'flags'
]);
const METRIC_KEYS = Object.freeze([
  'worlds', 'public_normalization_collision_signatures',
  'normalization_collision_governance_signatures',
  'complete_normalization_collision_assurance_worlds',
  'normalization_form_unicode_version_substitutions',
  'normalization_implementation_conformance_gaps',
  'casefold_locale_tailoring_substitutions', 'script_inventory_mixed_script_gaps',
  'confusable_skeleton_substitutions', 'collision_candidate_set_gaps',
  'collision_adjudication_appeal_gaps', 'unreconciled_normalization_collision_decisions',
  'stale_normalization_collision_decisions', 'unsupported_normalization_collision_decisions',
  'binding_public_authority_worlds'
]);

export const canonicalize = value => Array.isArray(value)
  ? value.map(canonicalize)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]))
    : value;
export const stableJson = value => JSON.stringify(canonicalize(value));
export const sha256 = value => createHash('sha256')
  .update(typeof value === 'string' ? value : stableJson(value))
  .digest('hex');

const unique = values => [...new Set(values)];
const NODE_EXOTIC_BRAND_PREDICATES = Object.freeze([
  'isArgumentsObject', 'isAnyArrayBuffer', 'isArrayBuffer', 'isSharedArrayBuffer',
  'isDataView', 'isTypedArray', 'isDate', 'isMap', 'isSet', 'isWeakMap',
  'isWeakSet', 'isMapIterator', 'isSetIterator', 'isRegExp', 'isNativeError',
  'isPromise', 'isBoxedPrimitive', 'isBooleanObject', 'isNumberObject',
  'isStringObject', 'isSymbolObject', 'isBigIntObject', 'isGeneratorObject',
  'isModuleNamespaceObject', 'isKeyObject', 'isCryptoKey', 'isExternal'
].filter(name => typeof nodeTypes[name] === 'function'));
function nodeExoticBrand(value) {
  for (const name of NODE_EXOTIC_BRAND_PREDICATES) {
    try {
      if (nodeTypes[name](value)) return name;
    } catch {
      return `${name}:uninspectable`;
    }
  }
  return null;
}

const WEB_EXOTIC_BRAND_PROBES = Object.freeze([
  typeof URL === 'function'
    ? ['URL', URL.prototype, value => Reflect.apply(Object.getOwnPropertyDescriptor(URL.prototype, 'href').get, value, [])]
    : null,
  typeof URLSearchParams === 'function'
    ? ['URLSearchParams', URLSearchParams.prototype, value => Reflect.apply(URLSearchParams.prototype.has, value, ['__pc62_probe__'])]
    : null,
  typeof Headers === 'function'
    ? ['Headers', Headers.prototype, value => Reflect.apply(Headers.prototype.has, value, ['x-pc62-probe'])]
    : null,
  typeof FormData === 'function'
    ? ['FormData', FormData.prototype, value => Reflect.apply(FormData.prototype.has, value, ['__pc62_probe__'])]
    : null
].filter(Boolean));

function isExpectedBrandRejection(error) {
  return error !== null && typeof error === 'object' && error.name === 'TypeError';
}

function webExoticBrand(value) {
  for (const [name, prototype, probe] of WEB_EXOTIC_BRAND_PROBES) {
    try {
      probe(value);
      return name;
    } catch (error) {
      if (!isExpectedBrandRejection(error)) return `${name}:uninspectable`;
    }

    let originalPrototype;
    try {
      originalPrototype = Object.getPrototypeOf(value);
    } catch {
      return `${name}:prototype-uninspectable`;
    }
    if (originalPrototype !== Object.prototype || !Object.isExtensible(value)) continue;

    let matched = false;
    let probeError = null;
    let restoreError = null;
    try {
      if (!Reflect.setPrototypeOf(value, prototype)) continue;
      try {
        probe(value);
        matched = true;
      } catch (error) {
        probeError = error;
      }
    } finally {
      try {
        if (!Reflect.setPrototypeOf(value, originalPrototype)) {
          restoreError = new TypeError('prototype restoration refused');
        }
      } catch (error) {
        restoreError = error;
      }
    }
    if (restoreError !== null) return `${name}:prototype-restore-failed`;
    if (matched) return name;
    if (probeError !== null && !isExpectedBrandRejection(probeError)) {
      return `${name}:uninspectable`;
    }
  }
  return null;
}

function retainedExoticBrand(value) {
  const nodeBrand = nodeExoticBrand(value);
  if (nodeBrand !== null) return `Node exotic brand ${nodeBrand}`;
  const webBrand = webExoticBrand(value);
  if (webBrand !== null) return `Web exotic brand ${webBrand}`;
  return null;
}

const plain = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && !nodeTypes.isProxy(value)
  && retainedExoticBrand(value) === null
  && Object.getPrototypeOf(value) === Object.prototype;

export function validateCanonicalJsonValue(value, label = 'value', errors = [], seen = new WeakSet()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return errors;
  if (typeof value === 'number') {
    if (!Number.isFinite(value)) errors.push(`${label} must be finite`);
    if (Object.is(value, -0)) errors.push(`${label} must not be negative zero`);
    return errors;
  }
  if (typeof value !== 'object') {
    errors.push(`${label} contains unsupported ${typeof value}`);
    return errors;
  }
  try {
    if (nodeTypes.isProxy(value)) {
      errors.push(`${label} must not be a proxy`);
      return errors;
    }
  } catch {
    errors.push(`${label} proxy state could not be inspected`);
    return errors;
  }
  if (!Object.isExtensible(value)) {
    errors.push(`${label} must be an extensible canonical JSON container`);
    return errors;
  }
  const exoticBrand = retainedExoticBrand(value);
  if (exoticBrand !== null) {
    errors.push(`${label} must not retain ${exoticBrand}`);
    return errors;
  }
  if (seen.has(value)) {
    errors.push(`${label} contains a repeated identity or cycle`);
    return errors;
  }
  seen.add(value);
  const isArray = Array.isArray(value);
  if (Object.getPrototypeOf(value) !== (isArray ? Array.prototype : Object.prototype)) {
    errors.push(`${label} must use a canonical JSON prototype`);
    return errors;
  }
  const keys = Reflect.ownKeys(value);
  for (const key of keys) if (typeof key !== 'string') errors.push(`${label} contains a symbol key`);
  if (isArray) {
    const named = keys.filter(key => typeof key === 'string'
      && key !== 'length'
      && !/^(0|[1-9]\d*)$/.test(key));
    if (named.length) errors.push(`${label} array contains named keys`);
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.prototype.hasOwnProperty.call(value, String(index))) {
        errors.push(`${label} array is sparse at ${index}`);
      }
    }
    for (const key of keys) {
      if (typeof key === 'string' && /^(0|[1-9]\d*)$/.test(key) && Number(key) >= value.length) {
        errors.push(`${label} array contains out-of-range index ${key}`);
      }
    }
  }
  for (const key of keys) {
    if ((isArray && key === 'length') || typeof key !== 'string') continue;
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      errors.push(`${label}.${key} must be an enumerable data property`);
      continue;
    }
    validateCanonicalJsonValue(descriptor.value, `${label}.${key}`, errors, seen);
  }
  return errors;
}

function exactKeys(value, expected, label, errors) {
  if (!plain(value)) {
    errors.push(`${label} must be a plain object`);
    return;
  }
  if (stableJson(Object.keys(value).sort()) !== stableJson([...expected].sort())) {
    errors.push(`${label} key ledger mismatch`);
  }
}
function isoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function sectionComplete(section, boolKeys, countKeys) {
  return boolKeys.every(key => section[key] === true) && countKeys.every(key => section[key] === 0);
}
function completeFlags(world) {
  const output = {
    complete_normalization_profile: sectionComplete(world.normalization_profile, NORMALIZATION_BOOL, NORMALIZATION_COUNT),
    complete_implementation_conformance: sectionComplete(world.implementation_conformance, IMPLEMENTATION_BOOL, IMPLEMENTATION_COUNT),
    complete_casefold_locale: sectionComplete(world.casefold_locale, CASEFOLD_BOOL, CASEFOLD_COUNT),
    complete_script_policy: sectionComplete(world.script_policy, SCRIPT_BOOL, SCRIPT_COUNT),
    complete_confusable_mapping: sectionComplete(world.confusable_mapping, CONFUSABLE_BOOL, CONFUSABLE_COUNT),
    complete_collision_adjudication: sectionComplete(world.collision_adjudication, COLLISION_BOOL, COLLISION_COUNT),
    current_normalization_collision_lineage: LINEAGE_BOOL.every(key => world.lineage[key] === true)
      && world.lineage.binding_public_authority === false
      && LINEAGE_COUNT.every(key => world.lineage[key] === 0)
  };
  output.complete_owner_login_normalization_casefold_confusable_collision_assurance = Object.values(output).every(Boolean);
  return output;
}
function validateSection(section, boolKeys, countKeys, label, errors) {
  if (!plain(section)) {
    errors.push(`${label} must be a plain object`);
    return false;
  }
  exactKeys(section, [...boolKeys, ...countKeys], label, errors);
  for (const key of boolKeys) if (typeof section[key] !== 'boolean') errors.push(`${label}.${key} must be boolean`);
  for (const key of countKeys) {
    if (!Number.isInteger(section[key]) || section[key] < 0) errors.push(`${label}.${key} must be a nonnegative integer`);
  }
  return true;
}
function validateWorld(world, index, errors) {
  if (!plain(world)) {
    errors.push(`world ${index} must be a plain object`);
    return;
  }
  exactKeys(world, WORLD_KEYS, `world ${index}`, errors);
  const sectionsValid = [
    validateSection(world.normalization_profile, NORMALIZATION_BOOL, NORMALIZATION_COUNT, `world ${index} normalization`, errors),
    validateSection(world.implementation_conformance, IMPLEMENTATION_BOOL, IMPLEMENTATION_COUNT, `world ${index} implementation`, errors),
    validateSection(world.casefold_locale, CASEFOLD_BOOL, CASEFOLD_COUNT, `world ${index} casefold`, errors),
    validateSection(world.script_policy, SCRIPT_BOOL, SCRIPT_COUNT, `world ${index} script`, errors),
    validateSection(world.confusable_mapping, CONFUSABLE_BOOL, CONFUSABLE_COUNT, `world ${index} confusable`, errors),
    validateSection(world.collision_adjudication, COLLISION_BOOL, COLLISION_COUNT, `world ${index} collision`, errors),
    validateSection(world.lineage, [...LINEAGE_BOOL, 'binding_public_authority'], LINEAGE_COUNT, `world ${index} lineage`, errors)
  ].every(Boolean);
  const flagsValid = plain(world.expected_flags);
  exactKeys(world.expected_flags, FLAG_KEYS, `world ${index} flags`, errors);
  if (typeof world.world_id !== 'string' || !world.world_id) errors.push(`world ${index} id missing`);
  if (typeof world.description !== 'string' || !world.description) errors.push(`world ${index} description missing`);
  if (world.expected_mechanism !== world.world_id) errors.push(`world ${index} mechanism mismatch`);
  if (sectionsValid && flagsValid && stableJson(world.expected_flags) !== stableJson(completeFlags(world))) {
    errors.push(`world ${index} flag ledger mismatch`);
  }
  const expected = typeof world.world_id === 'string' ? EXPECTED_WORLD_SNAPSHOTS[world.world_id] : undefined;
  if (!expected || sha256(world) !== expected) errors.push(`world ${index} frozen state snapshot mismatch`);
}

export function validateFixture(fixture) {
  const errors = [];
  validateCanonicalJsonValue(fixture, 'PC-62 fixture', errors);
  if (errors.length) return unique(errors);
  if (!plain(fixture)) {
    errors.push('PC-62 fixture must be a plain object');
    return unique(errors);
  }
  exactKeys(fixture, ROOT_KEYS, 'PC-62 fixture', errors);
  exactKeys(fixture.baseline, BASELINE_KEYS, 'PC-62 baseline', errors);
  exactKeys(fixture.interpretation_contract, INTERPRETATION_KEYS, 'PC-62 interpretation', errors);
  exactKeys(fixture.expected_classification, CLASSIFICATION_KEYS, 'PC-62 classification', errors);
  if (!Array.isArray(fixture.required_refusal_rules)
      || stableJson(fixture.required_refusal_rules) !== stableJson(REQUIRED_REFUSAL_RULES)) {
    errors.push('PC-62 refusal-rule ledger mismatch');
  }
  if (!Array.isArray(fixture.worlds) || fixture.worlds.length !== 8) errors.push('PC-62 fixture must contain eight worlds');
  if (fixture.schema_version !== FIXTURE_SCHEMA_VERSION
      || fixture.fixture_id !== 'same-linkage-owner-login-status-different-normalization-casefold-confusable-adjudication-states-v1'
      || fixture.issue !== 1893
      || fixture.parent_program_issue !== 594) {
    errors.push('PC-62 fixture identity mismatch');
  }
  if (fixture.captured_at !== '2026-08-10' || !isoDate(fixture.captured_at)) errors.push('PC-62 capture date mismatch');
  if (fixture.status !== 'synthetic_repository_owner_login_normalization_collision_control'
      || fixture.graph_effect !== 'none'
      || fixture.counts_toward_thesis_evidence !== false) {
    errors.push('PC-62 authority/status mismatch');
  }
  if (Array.isArray(fixture.worlds)) fixture.worlds.forEach((world, index) => validateWorld(world, index, errors));
  const ids = Array.isArray(fixture.worlds)
    ? fixture.worlds
      .filter(world => world !== null && typeof world === 'object')
      .map(world => world.world_id)
    : [];
  if (ids.length !== new Set(ids).size) errors.push('PC-62 world ids must be unique');
  if (sha256(fixture) !== EXPECTED_FIXTURE_SHA256) errors.push(`PC-62 fixture snapshot mismatch: ${sha256(fixture)}`);
  return unique(errors);
}

function metrics(worlds) {
  const sum = (section, key) => worlds.reduce((total, world) => total + world[section][key], 0);
  return {
    worlds: worlds.length,
    public_normalization_collision_signatures: new Set(worlds.map(world => world.public_signature_sha256)).size,
    normalization_collision_governance_signatures: new Set(worlds.map(world => world.governance_signature_sha256)).size,
    complete_normalization_collision_assurance_worlds: worlds.filter(world => world.flags.complete_owner_login_normalization_casefold_confusable_collision_assurance).length,
    normalization_form_unicode_version_substitutions: sum('normalization_profile', 'normalization_form_unicode_version_substitutions'),
    normalization_implementation_conformance_gaps: sum('implementation_conformance', 'normalization_implementation_conformance_gaps'),
    casefold_locale_tailoring_substitutions: sum('casefold_locale', 'casefold_locale_tailoring_substitutions'),
    script_inventory_mixed_script_gaps: sum('script_policy', 'script_inventory_mixed_script_gaps'),
    confusable_skeleton_substitutions: sum('confusable_mapping', 'confusable_skeleton_substitutions'),
    collision_candidate_set_gaps: sum('collision_adjudication', 'collision_candidate_set_gaps'),
    collision_adjudication_appeal_gaps: sum('collision_adjudication', 'collision_adjudication_appeal_gaps'),
    unreconciled_normalization_collision_decisions: sum('lineage', 'unreconciled_normalization_collision_decisions'),
    stale_normalization_collision_decisions: sum('lineage', 'stale_normalization_collision_decisions'),
    unsupported_normalization_collision_decisions: sum('lineage', 'unsupported_normalization_collision_decisions'),
    binding_public_authority_worlds: worlds.filter(world => world.lineage.binding_public_authority).length
  };
}
function seal(event, previous_event_sha256) {
  const unsigned = { ...canonicalize(event), previous_event_sha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

export function compileFixture(fixture) {
  const errors = validateFixture(fixture);
  if (errors.length) throw new Error(errors.join('; '));
  const snapshot = structuredClone(fixture);
  const publicSignature = sha256(snapshot.baseline);
  const worlds = snapshot.worlds.map(world => ({
    world_id: world.world_id,
    description: world.description,
    public_signature_sha256: publicSignature,
    governance_signature_sha256: sha256({
      normalization_profile: world.normalization_profile,
      implementation_conformance: world.implementation_conformance,
      casefold_locale: world.casefold_locale,
      script_policy: world.script_policy,
      confusable_mapping: world.confusable_mapping,
      collision_adjudication: world.collision_adjudication,
      lineage: world.lineage
    }),
    normalization_profile: world.normalization_profile,
    implementation_conformance: world.implementation_conformance,
    casefold_locale: world.casefold_locale,
    script_policy: world.script_policy,
    confusable_mapping: world.confusable_mapping,
    collision_adjudication: world.collision_adjudication,
    lineage: world.lineage,
    mechanism: world.expected_mechanism,
    flags: world.expected_flags
  }));
  const compiledMetrics = metrics(worlds);
  const chain = [];
  chain.push(seal({ event: 'fixture_bound', fixture_id: snapshot.fixture_id, fixture_snapshot_sha256: sha256(snapshot) }, null));
  chain.push(seal({ event: 'public_surface_bound', public_surface_sha256: sha256(snapshot.baseline), world_count: worlds.length }, chain.at(-1).event_sha256));
  chain.push(seal({ event: 'normalization_collision_states_bound', world_state_sha256: sha256(worlds.map(world => ({ world_id: world.world_id, governance_signature_sha256: world.governance_signature_sha256 }))) }, chain.at(-1).event_sha256));
  chain.push(seal({ event: 'metrics_and_refusals_bound', metrics_sha256: sha256(compiledMetrics), refusal_rules_sha256: sha256(snapshot.required_refusal_rules) }, chain.at(-1).event_sha256));
  chain.push(seal({ event: 'interpretation_sealed', interpretation_sha256: sha256(snapshot.interpretation_contract), graph_effect: 'none', binding_public_authority: false }, chain.at(-1).event_sha256));
  return {
    schema_version: BUILD_SCHEMA_VERSION,
    fixture_id: snapshot.fixture_id,
    issue: snapshot.issue,
    captured_at: snapshot.captured_at,
    status: 'synthetic_repository_owner_login_normalization_collision_control_compiled',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    fixture_snapshot_sha256: sha256(snapshot),
    public_surface: snapshot.baseline,
    worlds,
    metrics: compiledMetrics,
    expected_classification: snapshot.expected_classification,
    refusal_rules: snapshot.required_refusal_rules,
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1).event_sha256,
    interpretation_contract: snapshot.interpretation_contract
  };
}

export function validateBuild(build, fixture) {
  const errors = [];
  validateCanonicalJsonValue(build, 'PC-62 build', errors);
  if (errors.length) return unique(errors);
  if (!plain(build)) {
    errors.push('PC-62 build must be a plain object');
    return unique(errors);
  }
  exactKeys(build, BUILD_KEYS, 'PC-62 build', errors);
  exactKeys(build.public_surface, BASELINE_KEYS, 'PC-62 build public surface', errors);
  exactKeys(build.metrics, METRIC_KEYS, 'PC-62 build metrics', errors);
  exactKeys(build.expected_classification, CLASSIFICATION_KEYS, 'PC-62 build classification', errors);
  exactKeys(build.interpretation_contract, INTERPRETATION_KEYS, 'PC-62 build interpretation', errors);
  if (!Array.isArray(build.worlds) || build.worlds.length !== 8) {
    errors.push('PC-62 build must contain eight worlds');
  } else {
    build.worlds.forEach((world, index) => {
      if (!plain(world)) {
        errors.push(`PC-62 build world ${index} must be a plain object`);
        return;
      }
      exactKeys(world, BUILD_WORLD_KEYS, `PC-62 build world ${index}`, errors);
      validateSection(world.normalization_profile, NORMALIZATION_BOOL, NORMALIZATION_COUNT, `PC-62 build world ${index} normalization`, errors);
      validateSection(world.implementation_conformance, IMPLEMENTATION_BOOL, IMPLEMENTATION_COUNT, `PC-62 build world ${index} implementation`, errors);
      validateSection(world.casefold_locale, CASEFOLD_BOOL, CASEFOLD_COUNT, `PC-62 build world ${index} casefold`, errors);
      validateSection(world.script_policy, SCRIPT_BOOL, SCRIPT_COUNT, `PC-62 build world ${index} script`, errors);
      validateSection(world.confusable_mapping, CONFUSABLE_BOOL, CONFUSABLE_COUNT, `PC-62 build world ${index} confusable`, errors);
      validateSection(world.collision_adjudication, COLLISION_BOOL, COLLISION_COUNT, `PC-62 build world ${index} collision`, errors);
      validateSection(world.lineage, [...LINEAGE_BOOL, 'binding_public_authority'], LINEAGE_COUNT, `PC-62 build world ${index} lineage`, errors);
      exactKeys(world.flags, FLAG_KEYS, `PC-62 build world ${index} flags`, errors);
    });
  }
  if (!Array.isArray(build.refusal_rules) || !Array.isArray(build.custody_chain) || build.custody_chain.length !== 5) {
    errors.push('PC-62 build array denominator mismatch');
  }
  const fixtureErrors = validateFixture(fixture);
  errors.push(...fixtureErrors);
  if (fixtureErrors.length) return unique(errors);
  let expected;
  try {
    expected = compileFixture(fixture);
  } catch (error) {
    return unique([...errors, `PC-62 deterministic compile failed: ${error.message}`]);
  }
  if (stableJson(build) !== stableJson(expected)) errors.push('PC-62 build differs from deterministic compilation');
  const expectedMetrics = {
    worlds: 8,
    public_normalization_collision_signatures: 1,
    normalization_collision_governance_signatures: 8,
    complete_normalization_collision_assurance_worlds: 1,
    normalization_form_unicode_version_substitutions: 100,
    normalization_implementation_conformance_gaps: 90,
    casefold_locale_tailoring_substitutions: 80,
    script_inventory_mixed_script_gaps: 70,
    confusable_skeleton_substitutions: 60,
    collision_candidate_set_gaps: 50,
    collision_adjudication_appeal_gaps: 40,
    unreconciled_normalization_collision_decisions: 40,
    stale_normalization_collision_decisions: 100,
    unsupported_normalization_collision_decisions: 700,
    binding_public_authority_worlds: 0
  };
  if (stableJson(build.metrics) !== stableJson(expectedMetrics)) errors.push('PC-62 metric denominator mismatch');
  let previous = null;
  for (const [index, event] of build.custody_chain.entries()) {
    const { event_sha256, ...unsigned } = event;
    if (unsigned.previous_event_sha256 !== previous || event_sha256 !== sha256(unsigned)) {
      errors.push(`PC-62 custody event ${index} mismatch`);
    }
    previous = event_sha256;
  }
  if (build.custody_chain_head_sha256 !== previous) errors.push('PC-62 custody chain head mismatch');
  return unique(errors);
}

export function renderMarkdown(build) {
  return `# PC-62 normalization implementation, locale casefold, confusable skeleton, and collision adjudication assurance\n\nSynthetic control only. Graph effect: **${build.graph_effect}**.\n\n| Measure | Value |\n| --- | ---: |\n${Object.entries(build.metrics).map(([key, value]) => `| ${key.replaceAll('_', ' ')} | ${value} |`).join('\n')}\n\nThe eight worlds preserve one public owner-login normalization and collision surface while separating complete assurance from Unicode-data, implementation, locale-casefold, script-policy, skeleton-mapping, collision-set, adjudication, exception, appeal, and stale-succession failures. No real ownership, impersonation, compromise, graph, publication, adoption, or public-authority finding is created.\n`;
}
