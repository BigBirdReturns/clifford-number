import { readFileSync } from 'node:fs';
import {
  loadPreferenceCustodyV58SourceBundle,
  preferenceCustodyManifestV59Snapshot,
  validateManifest as validatePreferenceCustodyManifestV59,
  validateBuild as validatePreferenceCustodyManifestV59Build
} from './preference-custody-manifest-v59.mjs';
import {
  BUILD_SCHEMA_VERSION as PC62_BUILD_SCHEMA_VERSION,
  REQUIRED_REFUSAL_RULES as PC62_REFUSAL_RULES,
  canonicalize,
  sha256,
  stableJson,
  validateBuild as validatePC62Build,
  validateCanonicalJsonValue,
  validateFixture as validatePC62Fixture
} from './preference-linkage-repository-owner-login-normalization-casefold-confusable-adjudication-assurance.mjs';

export const MANIFEST_SCHEMA_VERSION = 'preference-custody-control-manifest-v60@1';
export const BUILD_SCHEMA_VERSION = 'preference-custody-control-manifest-v60-build@1';
export const V59_SOURCE_BUNDLE_SCHEMA_VERSION = 'preference-custody-v59-source-bundle@1';
const EXPECTED_MANIFEST_SHA256 = 'be39860e77298f8680dedc8ccbdddbfd0dab53f246a6deecb5b47750166a5d8a';
const RESOLVED_FRONTIER = 'linkage_interval_repository_owner_login_unicode_normalization_algorithm_casefold_locale_confusable_skeleton_and_collision_adjudication_governance';
const SUCCESSOR_FRONTIERS = Object.freeze([
  'linkage_interval_repository_owner_login_unicode_data_normalization_form_implementation_decomposition_composition_and_equivalence_class_governance',
  'linkage_interval_repository_owner_login_casefold_locale_script_confusable_mapping_collision_exception_and_appeal_governance'
]);
const PRESERVED_ALIAS_NAMESPACE_FRONTIER = 'linkage_interval_repository_owner_login_alias_validity_rename_redirect_recycled_reserved_namespace_and_identity_reuse_governance';
const PRESERVED_PROFILE_API_FRONTIER = 'linkage_interval_repository_owner_profile_api_url_canonicalization_redirect_endpoint_version_pairing_and_observation_time_governance';
const PRESERVED_ACCOUNT_FRONTIER = 'linkage_interval_owner_account_type_active_suspended_deleted_ghost_restoration_site_admin_and_metadata_governance';
const PRESERVED_SIBLINGS = Object.freeze([
  'linkage_interval_owner_rename_event_predecessor_successor_timestamp_redirect_repository_owner_pair_and_transfer_continuity_governance',
  'linkage_interval_repository_numeric_node_id_transfer_event_predecessor_successor_timestamp_redirect_and_namespace_governance',
  'linkage_interval_repository_canonical_url_visibility_fork_parent_source_network_and_redirect_governance',
  'linkage_interval_default_branch_tag_release_review_time_commit_ref_object_reachability_and_asset_identity_governance'
]);

const MANIFEST_KEYS = Object.freeze([
  'schema_version', 'manifest_id', 'issue', 'control_issue', 'captured_at', 'status',
  'graph_effect', 'counts_toward_thesis_evidence', 'base_floor', 'extension_control',
  'identification_requirement', 'frontier_transition', 'preserved_alias_namespace_frontier',
  'preserved_profile_api_frontier', 'preserved_account_frontier',
  'real_case_requirements_added', 'prohibited_inferences', 'interpretation_contract'
]);
const BASE_KEYS = Object.freeze(['manifest_id', 'source_manifest_path', 'expected_build_schema', 'expected_control_count']);
const EXTENSION_KEYS = Object.freeze([
  'control_id', 'fixture_id', 'failure_class', 'source_fixture_path',
  'build_artifact_path', 'expected_build_schema', 'required_refusal_rules'
]);
const IDENTIFICATION_KEYS = Object.freeze(['stage', 'required_state', 'refused_inference']);
const TRANSITION_KEYS = Object.freeze(['resolved_base_frontier', 'successor_frontiers']);
const INTERPRETATION_KEYS = Object.freeze(['contract_id', 'what_this_is', 'what_this_is_not', 'copy_ready_caveat']);
const BUILD_KEYS = Object.freeze([
  'schema_version', 'manifest_id', 'issue', 'control_issue', 'captured_at', 'status',
  'graph_effect', 'counts_toward_thesis_evidence', 'conclusion_generated',
  'real_world_evidence_state', 'control_count', 'controls', 'composition',
  'control_integrity', 'identification_requirements', 'refusal_rule_union',
  'open_frontiers', 'frontier_transition', 'preserved_alias_namespace_frontier',
  'preserved_profile_api_frontier', 'preserved_account_frontier', 'promotion_boundary',
  'custody_chain', 'custody_chain_head_sha256', 'prohibited_inferences', 'interpretation_contract'
]);
const COMPOSITION_KEYS = Object.freeze([
  'base_manifest_id', 'base_schema_version', 'base_control_count', 'extension_control_id',
  'manifest_snapshot_sha256', 'base_floor_snapshot_sha256', 'extension_snapshot_sha256',
  'v59_source_bundle_schema_version', 'v59_source_bundle_sha256', 'base_controls_sha256',
  'base_promotion_requirements_sha256', 'base_refusal_rule_union_sha256',
  'base_identification_requirements_sha256', 'base_open_frontiers_sha256',
  'base_prohibited_inferences_sha256', 'base_interpretation_contract_sha256',
  'base_promotion_requirement_count', 'added_promotion_requirement_count',
  'final_promotion_requirement_count', 'base_open_frontiers'
]);
const INTEGRITY_KEYS = Object.freeze([
  'base_floor_qualified', 'base_integrity_preserved', 'v59_complete_source_bundle_bound',
  'all_graph_effect_none', 'no_thesis_evidence_consumption', 'no_real_world_conclusion',
  'no_preference_change_claim', 'no_intent_inference', 'no_security_compromise_claim',
  'no_ownership_finding', 'no_impersonation_finding',
  'all_required_pc62_refusal_rules_present', 'complete_normalization_collision_path_preserved',
  'unicode_implementation_successor_preserved', 'casefold_confusable_successor_preserved',
  'alias_namespace_frontier_preserved', 'profile_api_frontier_preserved',
  'account_lifecycle_frontier_preserved', 'owner_rename_transfer_sibling_preserved',
  'repository_transfer_event_sibling_preserved', 'canonical_location_fork_sibling_preserved',
  'branch_tag_release_commit_sibling_preserved', 'all_unresolved_base_frontiers_preserved'
]);
const PROMOTION_KEYS = Object.freeze([
  'promotion_authority', 'promotion_requirement_count', 'real_case_requires',
  'laboratory_controls_are_real_world_evidence'
]);

const plain = value => value !== null
  && typeof value === 'object'
  && !Array.isArray(value)
  && Object.getPrototypeOf(value) === Object.prototype;
const unique = values => [...new Set(values)];
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
function seal(event, previous_event_sha256) {
  const unsigned = { ...canonicalize(event), previous_event_sha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}
function collectDates(value, label, output, seen = new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);
  if (Object.prototype.hasOwnProperty.call(value, 'captured_at')) {
    output.push([`${label}.captured_at`, value.captured_at]);
  }
  for (const key of Object.keys(value)) collectDates(value[key], `${label}.${key}`, output, seen);
}

export function loadPreferenceCustodyV59SourceBundle(load = path => JSON.parse(readFileSync(path, 'utf8'))) {
  return {
    manifest: load('data/research/preference-custody/control-manifest-v59.json'),
    baseBuild: load('build/research/preference-custody-laboratory-floor-v58.json'),
    targetBuild: load('build/research/preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.json'),
    targetFixture: load('data/research/preference-custody/preference-linkage-repository-owner-login-unicode-casefold-alias-reuse-assurance.fixture.json'),
    baseSources: loadPreferenceCustodyV58SourceBundle(load)
  };
}
export const preferenceCustodyV59SourceBundleSnapshot = bundle => sha256({
  schema_version: V59_SOURCE_BUNDLE_SCHEMA_VERSION,
  source_bundle: bundle
});
export const preferenceCustodyManifestV60Snapshot = manifest => sha256(manifest);

export function validateManifest(manifest) {
  const errors = [];
  validateCanonicalJsonValue(manifest, 'Preference Custody v60 manifest', errors);
  if (errors.length) return unique(errors);
  exactKeys(manifest, MANIFEST_KEYS, 'Preference Custody v60 manifest', errors);
  exactKeys(manifest.base_floor, BASE_KEYS, 'Preference Custody v60 base floor', errors);
  exactKeys(manifest.extension_control, EXTENSION_KEYS, 'Preference Custody v60 extension', errors);
  exactKeys(manifest.identification_requirement, IDENTIFICATION_KEYS, 'Preference Custody v60 identification', errors);
  exactKeys(manifest.frontier_transition, TRANSITION_KEYS, 'Preference Custody v60 frontier transition', errors);
  exactKeys(manifest.interpretation_contract, INTERPRETATION_KEYS, 'Preference Custody v60 interpretation', errors);
  if (manifest.schema_version !== MANIFEST_SCHEMA_VERSION
      || manifest.manifest_id !== 'preference-custody-laboratory-floor-v60'
      || manifest.issue !== 594
      || manifest.control_issue !== 1893) {
    errors.push('Preference Custody v60 identity mismatch');
  }
  if (manifest.captured_at !== '2026-08-10' || !isoDate(manifest.captured_at)) {
    errors.push('Preference Custody v60 capture date mismatch');
  }
  if (manifest.status !== 'synthetic_control_floor_extension'
      || manifest.graph_effect !== 'none'
      || manifest.counts_toward_thesis_evidence !== false) {
    errors.push('Preference Custody v60 authority/status mismatch');
  }
  if (manifest.base_floor.manifest_id !== 'preference-custody-laboratory-floor-v59'
      || manifest.base_floor.expected_build_schema !== 'preference-custody-control-manifest-v59-build@1'
      || manifest.base_floor.expected_control_count !== 61) {
    errors.push('Preference Custody v60 base contract mismatch');
  }
  if (manifest.extension_control.control_id !== 'PC-62'
      || manifest.extension_control.expected_build_schema !== PC62_BUILD_SCHEMA_VERSION
      || stableJson(manifest.extension_control.required_refusal_rules) !== stableJson(PC62_REFUSAL_RULES)) {
    errors.push('Preference Custody v60 extension contract mismatch');
  }
  if (manifest.frontier_transition.resolved_base_frontier !== RESOLVED_FRONTIER
      || stableJson(manifest.frontier_transition.successor_frontiers) !== stableJson(SUCCESSOR_FRONTIERS)
      || manifest.preserved_alias_namespace_frontier !== PRESERVED_ALIAS_NAMESPACE_FRONTIER
      || manifest.preserved_profile_api_frontier !== PRESERVED_PROFILE_API_FRONTIER
      || manifest.preserved_account_frontier !== PRESERVED_ACCOUNT_FRONTIER) {
    errors.push('Preference Custody v60 frontier transition mismatch');
  }
  if (!Array.isArray(manifest.real_case_requirements_added)
      || manifest.real_case_requirements_added.length !== 62
      || unique(manifest.real_case_requirements_added).length !== 62) {
    errors.push('Preference Custody v60 must add exactly 62 unique requirements');
  }
  if (!Array.isArray(manifest.prohibited_inferences)
      || manifest.prohibited_inferences.length !== 12
      || unique(manifest.prohibited_inferences).length !== 12) {
    errors.push('Preference Custody v60 prohibited-inference ledger mismatch');
  }
  if (sha256(manifest) !== EXPECTED_MANIFEST_SHA256) {
    errors.push(`Preference Custody v60 manifest snapshot mismatch: ${sha256(manifest)}`);
  }
  return unique(errors);
}

function validateInputs(manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = validateManifest(manifest);
  if (errors.length) return errors;
  const root = { manifest, baseBuild, targetBuild, targetFixture, baseSources };
  validateCanonicalJsonValue(root, 'Preference Custody v60 input graph', errors);
  if (errors.length) return unique(errors);
  const snapshot = structuredClone(root);
  const base = snapshot.baseBuild;
  const target = snapshot.targetBuild;
  const fixture = snapshot.targetFixture;
  const sources = snapshot.baseSources;
  const currentManifest = snapshot.manifest;
  errors.push(...validatePC62Fixture(fixture));
  errors.push(...validatePC62Build(target, fixture));
  errors.push(...validatePreferenceCustodyManifestV59(sources.manifest));
  errors.push(...validatePreferenceCustodyManifestV59Build(
    base,
    sources.manifest,
    sources.baseBuild,
    sources.targetBuild,
    sources.targetFixture,
    sources.baseSources
  ));
  if (base.schema_version !== currentManifest.base_floor.expected_build_schema
      || base.manifest_id !== currentManifest.base_floor.manifest_id
      || base.control_count !== 61) {
    errors.push('Preference Custody v60 base build identity mismatch');
  }
  if (base.promotion_boundary?.promotion_requirement_count !== 2586) {
    errors.push('Preference Custody v59 promotion denominator mismatch');
  }
  if (base.controls?.at(-1)?.control_id !== 'PC-61') {
    errors.push('Preference Custody v59 terminal control mismatch');
  }
  if (!base.open_frontiers?.includes(RESOLVED_FRONTIER)) {
    errors.push('Preference Custody v60 resolved frontier absent from qualified base');
  }
  if (!base.open_frontiers?.includes(PRESERVED_ALIAS_NAMESPACE_FRONTIER)) {
    errors.push('Preference Custody v60 preserved alias/namespace frontier absent from qualified base');
  }
  if (target.fixture_snapshot_sha256 !== sha256(fixture)) {
    errors.push('PC-62 fixture/build source divergence');
  }
  const dates = [];
  collectDates(snapshot, 'v60-inputs', dates);
  for (const [label, date] of dates) {
    if (!isoDate(date)) errors.push(`${label} must be an exact ISO date`);
    else if (date > currentManifest.captured_at) errors.push(`${label} postdates Preference Custody v60`);
  }
  return unique(errors);
}

export function compileManifest(manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = validateInputs(manifest, baseBuild, targetBuild, targetFixture, baseSources);
  if (errors.length) throw new Error(errors.join('; '));
  const currentManifest = structuredClone(manifest);
  const base = structuredClone(baseBuild);
  const target = structuredClone(targetBuild);
  const sources = structuredClone(baseSources);
  const controls = [
    ...base.controls,
    {
      control_id: 'PC-62',
      fixture_id: currentManifest.extension_control.fixture_id,
      failure_class: currentManifest.extension_control.failure_class,
      build_schema_version: target.schema_version,
      fixture_snapshot_sha256: target.fixture_snapshot_sha256,
      build_snapshot_sha256: sha256(target),
      world_count: target.metrics.worlds,
      complete_assurance_worlds: target.metrics.complete_normalization_collision_assurance_worlds,
      public_signature_count: target.metrics.public_normalization_collision_signatures,
      governance_signature_count: target.metrics.normalization_collision_governance_signatures
    }
  ];
  const identification = [...base.identification_requirements, currentManifest.identification_requirement];
  const refusals = unique([...base.refusal_rule_union, ...currentManifest.extension_control.required_refusal_rules]);
  const openFrontiers = unique([
    ...base.open_frontiers.filter(frontier => frontier !== RESOLVED_FRONTIER),
    ...SUCCESSOR_FRONTIERS
  ]);
  const requirements = [...base.promotion_boundary.real_case_requires, ...currentManifest.real_case_requirements_added];
  const prohibited = [...base.prohibited_inferences, ...currentManifest.prohibited_inferences];
  const composition = {
    base_manifest_id: base.manifest_id,
    base_schema_version: base.schema_version,
    base_control_count: base.control_count,
    extension_control_id: 'PC-62',
    manifest_snapshot_sha256: sha256(currentManifest),
    base_floor_snapshot_sha256: sha256(base),
    extension_snapshot_sha256: sha256(target),
    v59_source_bundle_schema_version: V59_SOURCE_BUNDLE_SCHEMA_VERSION,
    v59_source_bundle_sha256: preferenceCustodyV59SourceBundleSnapshot(sources),
    base_controls_sha256: sha256(base.controls),
    base_promotion_requirements_sha256: sha256(base.promotion_boundary.real_case_requires),
    base_refusal_rule_union_sha256: sha256(base.refusal_rule_union),
    base_identification_requirements_sha256: sha256(base.identification_requirements),
    base_open_frontiers_sha256: sha256(base.open_frontiers),
    base_prohibited_inferences_sha256: sha256(base.prohibited_inferences),
    base_interpretation_contract_sha256: sha256(base.interpretation_contract),
    base_promotion_requirement_count: 2586,
    added_promotion_requirement_count: 62,
    final_promotion_requirement_count: 2648,
    base_open_frontiers: base.open_frontiers
  };
  const integrity = {
    base_floor_qualified: true,
    base_integrity_preserved: true,
    v59_complete_source_bundle_bound: true,
    all_graph_effect_none: true,
    no_thesis_evidence_consumption: true,
    no_real_world_conclusion: true,
    no_preference_change_claim: true,
    no_intent_inference: true,
    no_security_compromise_claim: true,
    no_ownership_finding: true,
    no_impersonation_finding: true,
    all_required_pc62_refusal_rules_present: currentManifest.extension_control.required_refusal_rules.every(rule => refusals.includes(rule)),
    complete_normalization_collision_path_preserved: target.metrics.complete_normalization_collision_assurance_worlds === 1,
    unicode_implementation_successor_preserved: openFrontiers.includes(SUCCESSOR_FRONTIERS[0]),
    casefold_confusable_successor_preserved: openFrontiers.includes(SUCCESSOR_FRONTIERS[1]),
    alias_namespace_frontier_preserved: openFrontiers.includes(PRESERVED_ALIAS_NAMESPACE_FRONTIER),
    profile_api_frontier_preserved: openFrontiers.includes(PRESERVED_PROFILE_API_FRONTIER),
    account_lifecycle_frontier_preserved: openFrontiers.includes(PRESERVED_ACCOUNT_FRONTIER),
    owner_rename_transfer_sibling_preserved: openFrontiers.includes(PRESERVED_SIBLINGS[0]),
    repository_transfer_event_sibling_preserved: openFrontiers.includes(PRESERVED_SIBLINGS[1]),
    canonical_location_fork_sibling_preserved: openFrontiers.includes(PRESERVED_SIBLINGS[2]),
    branch_tag_release_commit_sibling_preserved: openFrontiers.includes(PRESERVED_SIBLINGS[3]),
    all_unresolved_base_frontiers_preserved: base.open_frontiers
      .filter(frontier => frontier !== RESOLVED_FRONTIER)
      .every(frontier => openFrontiers.includes(frontier))
  };
  const chain = [];
  chain.push(seal({
    event: 'qualified_v59_base_bound',
    base_manifest_id: base.manifest_id,
    base_snapshot_sha256: sha256(base),
    base_source_bundle_sha256: preferenceCustodyV59SourceBundleSnapshot(sources)
  }, null));
  chain.push(seal({
    event: 'pc62_extension_admitted',
    control_id: 'PC-62',
    fixture_snapshot_sha256: target.fixture_snapshot_sha256,
    build_snapshot_sha256: sha256(target)
  }, chain.at(-1).event_sha256));
  chain.push(seal({
    event: 'frontier_transition_bound',
    resolved_frontier: RESOLVED_FRONTIER,
    successor_frontiers: SUCCESSOR_FRONTIERS,
    preserved_alias_namespace_frontier: PRESERVED_ALIAS_NAMESPACE_FRONTIER,
    preserved_profile_api_frontier: PRESERVED_PROFILE_API_FRONTIER,
    preserved_account_frontier: PRESERVED_ACCOUNT_FRONTIER
  }, chain.at(-1).event_sha256));
  chain.push(seal({
    event: 'promotion_boundary_bound',
    base_requirement_count: 2586,
    added_requirement_count: 62,
    final_requirement_count: 2648,
    requirements_sha256: sha256(requirements)
  }, chain.at(-1).event_sha256));
  chain.push(seal({
    event: 'interpretation_sealed',
    interpretation_sha256: sha256(currentManifest.interpretation_contract),
    graph_effect: 'none',
    real_world_evidence_state: 'none',
    binding_public_authority: false
  }, chain.at(-1).event_sha256));
  return {
    schema_version: BUILD_SCHEMA_VERSION,
    manifest_id: currentManifest.manifest_id,
    issue: currentManifest.issue,
    control_issue: currentManifest.control_issue,
    captured_at: currentManifest.captured_at,
    status: 'synthetic_control_floor_compiled',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    real_world_evidence_state: 'none',
    control_count: 62,
    controls,
    composition,
    control_integrity: integrity,
    identification_requirements: identification,
    refusal_rule_union: refusals,
    open_frontiers: openFrontiers,
    frontier_transition: currentManifest.frontier_transition,
    preserved_alias_namespace_frontier: PRESERVED_ALIAS_NAMESPACE_FRONTIER,
    preserved_profile_api_frontier: PRESERVED_PROFILE_API_FRONTIER,
    preserved_account_frontier: PRESERVED_ACCOUNT_FRONTIER,
    promotion_boundary: {
      promotion_authority: 'laboratory_only',
      promotion_requirement_count: 2648,
      real_case_requires: requirements,
      laboratory_controls_are_real_world_evidence: false
    },
    custody_chain: chain,
    custody_chain_head_sha256: chain.at(-1).event_sha256,
    prohibited_inferences: prohibited,
    interpretation_contract: currentManifest.interpretation_contract
  };
}

export function validateBuild(build, manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const errors = [];
  validateCanonicalJsonValue(build, 'Preference Custody v60 build', errors);
  if (errors.length) return unique(errors);
  exactKeys(build, BUILD_KEYS, 'Preference Custody v60 build', errors);
  exactKeys(build.composition, COMPOSITION_KEYS, 'Preference Custody v60 composition', errors);
  exactKeys(build.control_integrity, INTEGRITY_KEYS, 'Preference Custody v60 integrity', errors);
  exactKeys(build.frontier_transition, TRANSITION_KEYS, 'Preference Custody v60 frontier transition', errors);
  exactKeys(build.promotion_boundary, PROMOTION_KEYS, 'Preference Custody v60 promotion', errors);
  exactKeys(build.interpretation_contract, INTERPRETATION_KEYS, 'Preference Custody v60 interpretation', errors);
  const inputErrors = validateInputs(manifest, baseBuild, targetBuild, targetFixture, baseSources);
  errors.push(...inputErrors);
  if (inputErrors.length) return unique(errors);
  let expected;
  try {
    expected = compileManifest(manifest, baseBuild, targetBuild, targetFixture, baseSources);
  } catch (error) {
    return unique([...errors, `Preference Custody v60 deterministic compile failed: ${error.message}`]);
  }
  if (stableJson(build) !== stableJson(expected)) {
    errors.push('Preference Custody v60 build differs from deterministic compilation');
  }
  if (build.control_count !== 62
      || stableJson(build.controls.slice(0, 61)) !== stableJson(baseBuild.controls)
      || build.controls.at(-1)?.control_id !== 'PC-62') {
    errors.push('Preference Custody v60 control denominator mismatch');
  }
  if (build.promotion_boundary.promotion_requirement_count !== 2648
      || build.composition.base_promotion_requirement_count !== 2586
      || build.composition.added_promotion_requirement_count !== 62
      || build.composition.final_promotion_requirement_count !== 2648) {
    errors.push('Preference Custody v60 promotion denominator mismatch');
  }
  if (build.open_frontiers.includes(RESOLVED_FRONTIER)) {
    errors.push('Preference Custody v60 resolved frontier remains open');
  }
  for (const frontier of [
    ...SUCCESSOR_FRONTIERS,
    PRESERVED_ALIAS_NAMESPACE_FRONTIER,
    PRESERVED_PROFILE_API_FRONTIER,
    PRESERVED_ACCOUNT_FRONTIER,
    ...PRESERVED_SIBLINGS
  ]) {
    if (!build.open_frontiers.includes(frontier)) {
      errors.push(`Preference Custody v60 missing required frontier ${frontier}`);
    }
  }
  for (const frontier of baseBuild.open_frontiers.filter(value => value !== RESOLVED_FRONTIER)) {
    if (!build.open_frontiers.includes(frontier)) {
      errors.push(`Preference Custody v60 dropped base frontier ${frontier}`);
    }
  }
  if (Object.values(build.control_integrity).some(value => value !== true)) {
    errors.push('Preference Custody v60 integrity ledger contains false');
  }
  let previous = null;
  for (const [index, event] of build.custody_chain.entries()) {
    const { event_sha256, ...unsigned } = event;
    if (unsigned.previous_event_sha256 !== previous || event_sha256 !== sha256(unsigned)) {
      errors.push(`Preference Custody v60 custody event ${index} mismatch`);
    }
    previous = event_sha256;
  }
  if (build.custody_chain_head_sha256 !== previous) {
    errors.push('Preference Custody v60 custody chain head mismatch');
  }
  return unique(errors);
}

export function renderMarkdown(build) {
  return `# Preference Custody laboratory floor v60\n\nSynthetic compositional floor only. Graph effect: **${build.graph_effect}**. Real-world evidence: **${build.real_world_evidence_state}**.\n\n| Measure | Value |\n| --- | ---: |\n| Base controls | ${build.composition.base_control_count} |\n| PC-62 extension | 1 |\n| Final controls | ${build.control_count} |\n| Base promotion requirements | ${build.composition.base_promotion_requirement_count} |\n| Requirements added | ${build.composition.added_promotion_requirement_count} |\n| Final promotion requirements | ${build.promotion_boundary.promotion_requirement_count} |\n\nResolved frontier: \`${build.frontier_transition.resolved_base_frontier}\`.\n\nSuccessor frontiers:\n${build.frontier_transition.successor_frontiers.map(frontier => `- \`${frontier}\``).join('\n')}\n\nThe qualified v59 base is recursively source-bound and byte-preserved. PC-62 creates no real ownership, impersonation, account-state, security, graph, publication, adoption, causal, intent, or public-authority conclusion.\n`;
}
