import { createHash } from 'node:crypto';

export const PREFERENCE_RECORD_LINKAGE_TEMPORAL_SUCCESSION_ASSURANCE_FIXTURE_SCHEMA_VERSION = 'preference-record-linkage-temporal-succession-assurance-fixture@1';
export const PREFERENCE_RECORD_LINKAGE_TEMPORAL_SUCCESSION_ASSURANCE_BUILD_SCHEMA_VERSION = 'preference-record-linkage-temporal-succession-assurance-build@1';

const BASELINE = {
  operative_release_id: 'RELEASE-INCIDENT-V1',
  operative_release_version: 1,
  source_records: 100,
  linked_records: 100,
  published_linkage_coverage_pct: 100,
  published_unmatched_records: 0,
  published_ambiguous_links: 0,
  public_linkage_status: 'linkage_verified',
  namespace_status: 'current',
  temporal_continuity: 'complete',
  succession_continuity: 'complete',
  approved_use: 'longitudinal_exposure_estimation'
};

const REQUIRED_REFUSAL_RULES = [
  'one_hundred_linked_records_is_not_one_hundred_valid_same_entity_links',
  'one_hundred_percent_linkage_coverage_is_not_absence_of_false_positive_false_negative_or_ambiguous_links',
  'zero_published_unmatched_records_is_not_zero_hidden_unmatched_records',
  'zero_published_ambiguous_links_is_not_complete_ambiguity_adjudication',
  'current_namespace_status_is_not_namespace_separation_or_collision_free_custody',
  'shared_identifier_is_not_same_entity_across_namespaces',
  'alias_difference_is_not_different_entity',
  'complete_temporal_continuity_is_not_nonoverlapping_validity_or_temporal_consistency',
  'current_identifier_is_not_persistent_entity_after_retirement_or_recycling',
  'successor_entity_is_not_persistent_predecessor_identity',
  'complete_succession_continuity_is_not_source_complete_predecessor_successor_custody',
  'silently_bridged_gap_is_not_observed_continuity',
  'retroactive_relink_is_not_append_preserving_correction',
  'historical_linkage_assurance_is_not_current_after_source_namespace_alias_entity_temporal_succession_or_version_change',
  'public_linkage_verified_status_is_not_complete_current_correctable_or_authorized_evidence',
  'linkage_or_succession_failure_is_not_proof_of_coercion_manipulation_discrimination_breach_misconduct_coordination_common_purpose_or_intent',
  'binding_public_authority_requires_separate_current_public_authorization_receipts'
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

const WORLD_EXPECTATIONS = {
  'complete-cross-source-linkage-namespace-temporal-succession-and-version-custody': {
    linkage: { false_positive_cross_namespace_links: 0, false_negative_alias_links: 0, hidden_unmatched_records: 0, ambiguous_link_records: 0 },
    namespace: { namespace_collision_count: 0, alias_fragmentation_count: 0, shared_identifier_without_namespace_count: 0, namespace_crosswalk_complete: true },
    temporal_identity: { overlapping_validity_interval_records: 0, temporal_contradiction_records: 0, recycled_identifier_count: 0, validity_interval_custody_complete: true },
    succession: { successor_conflation_count: 0, predecessor_successor_gap_count: 0, silently_bridged_gap_count: 0, succession_source_custody_complete: true },
    versioning: { retroactive_relinked_records: 0, overwritten_version_records: 0, unaudited_backfill_records: 0, append_only_history_complete: true },
    governance: { current_lineage_complete: true, correction_path_complete: true, ambiguity_adjudication_complete: true, binding_public_authority: false, unsupported_decisions: 0, stale_decisions: 0 }
  },
  'namespace-collision-and-cross-namespace-false-linkage': {
    linkage: { false_positive_cross_namespace_links: 30, false_negative_alias_links: 0, hidden_unmatched_records: 0, ambiguous_link_records: 20 },
    namespace: { namespace_collision_count: 20, alias_fragmentation_count: 0, shared_identifier_without_namespace_count: 25, namespace_crosswalk_complete: false },
    temporal_identity: { overlapping_validity_interval_records: 0, temporal_contradiction_records: 0, recycled_identifier_count: 0, validity_interval_custody_complete: true },
    succession: { successor_conflation_count: 0, predecessor_successor_gap_count: 0, silently_bridged_gap_count: 0, succession_source_custody_complete: true },
    versioning: { retroactive_relinked_records: 0, overwritten_version_records: 0, unaudited_backfill_records: 0, append_only_history_complete: true },
    governance: { current_lineage_complete: true, correction_path_complete: true, ambiguity_adjudication_complete: false, binding_public_authority: false, unsupported_decisions: 100, stale_decisions: 0 }
  },
  'alias-fragmentation-and-same-entity-false-split': {
    linkage: { false_positive_cross_namespace_links: 0, false_negative_alias_links: 25, hidden_unmatched_records: 25, ambiguous_link_records: 0 },
    namespace: { namespace_collision_count: 0, alias_fragmentation_count: 20, shared_identifier_without_namespace_count: 0, namespace_crosswalk_complete: true },
    temporal_identity: { overlapping_validity_interval_records: 0, temporal_contradiction_records: 0, recycled_identifier_count: 0, validity_interval_custody_complete: true },
    succession: { successor_conflation_count: 0, predecessor_successor_gap_count: 0, silently_bridged_gap_count: 0, succession_source_custody_complete: true },
    versioning: { retroactive_relinked_records: 0, overwritten_version_records: 0, unaudited_backfill_records: 0, append_only_history_complete: true },
    governance: { current_lineage_complete: true, correction_path_complete: true, ambiguity_adjudication_complete: true, binding_public_authority: false, unsupported_decisions: 100, stale_decisions: 0 }
  },
  'overlapping-validity-intervals-and-temporal-contradiction': {
    linkage: { false_positive_cross_namespace_links: 0, false_negative_alias_links: 0, hidden_unmatched_records: 0, ambiguous_link_records: 0 },
    namespace: { namespace_collision_count: 0, alias_fragmentation_count: 0, shared_identifier_without_namespace_count: 0, namespace_crosswalk_complete: true },
    temporal_identity: { overlapping_validity_interval_records: 40, temporal_contradiction_records: 30, recycled_identifier_count: 0, validity_interval_custody_complete: false },
    succession: { successor_conflation_count: 0, predecessor_successor_gap_count: 0, silently_bridged_gap_count: 0, succession_source_custody_complete: true },
    versioning: { retroactive_relinked_records: 0, overwritten_version_records: 0, unaudited_backfill_records: 0, append_only_history_complete: true },
    governance: { current_lineage_complete: true, correction_path_complete: true, ambiguity_adjudication_complete: true, binding_public_authority: false, unsupported_decisions: 100, stale_decisions: 0 }
  },
  'identifier-recycling-after-retirement': {
    linkage: { false_positive_cross_namespace_links: 0, false_negative_alias_links: 0, hidden_unmatched_records: 0, ambiguous_link_records: 0 },
    namespace: { namespace_collision_count: 0, alias_fragmentation_count: 0, shared_identifier_without_namespace_count: 0, namespace_crosswalk_complete: true },
    temporal_identity: { overlapping_validity_interval_records: 0, temporal_contradiction_records: 0, recycled_identifier_count: 15, validity_interval_custody_complete: true },
    succession: { successor_conflation_count: 0, predecessor_successor_gap_count: 0, silently_bridged_gap_count: 0, succession_source_custody_complete: true },
    versioning: { retroactive_relinked_records: 0, overwritten_version_records: 0, unaudited_backfill_records: 0, append_only_history_complete: true },
    governance: { current_lineage_complete: true, correction_path_complete: true, ambiguity_adjudication_complete: true, binding_public_authority: false, unsupported_decisions: 100, stale_decisions: 0 }
  },
  'successor-replacement-conflated-with-persistent-entity': {
    linkage: { false_positive_cross_namespace_links: 0, false_negative_alias_links: 0, hidden_unmatched_records: 0, ambiguous_link_records: 0 },
    namespace: { namespace_collision_count: 0, alias_fragmentation_count: 0, shared_identifier_without_namespace_count: 0, namespace_crosswalk_complete: true },
    temporal_identity: { overlapping_validity_interval_records: 0, temporal_contradiction_records: 0, recycled_identifier_count: 0, validity_interval_custody_complete: true },
    succession: { successor_conflation_count: 20, predecessor_successor_gap_count: 0, silently_bridged_gap_count: 0, succession_source_custody_complete: true },
    versioning: { retroactive_relinked_records: 0, overwritten_version_records: 0, unaudited_backfill_records: 0, append_only_history_complete: true },
    governance: { current_lineage_complete: true, correction_path_complete: true, ambiguity_adjudication_complete: true, binding_public_authority: false, unsupported_decisions: 100, stale_decisions: 0 }
  },
  'predecessor-successor-gap-silently-bridged-without-source-custody': {
    linkage: { false_positive_cross_namespace_links: 0, false_negative_alias_links: 0, hidden_unmatched_records: 0, ambiguous_link_records: 0 },
    namespace: { namespace_collision_count: 0, alias_fragmentation_count: 0, shared_identifier_without_namespace_count: 0, namespace_crosswalk_complete: true },
    temporal_identity: { overlapping_validity_interval_records: 0, temporal_contradiction_records: 0, recycled_identifier_count: 0, validity_interval_custody_complete: true },
    succession: { successor_conflation_count: 0, predecessor_successor_gap_count: 25, silently_bridged_gap_count: 20, succession_source_custody_complete: false },
    versioning: { retroactive_relinked_records: 0, overwritten_version_records: 0, unaudited_backfill_records: 0, append_only_history_complete: true },
    governance: { current_lineage_complete: true, correction_path_complete: true, ambiguity_adjudication_complete: true, binding_public_authority: false, unsupported_decisions: 100, stale_decisions: 0 }
  },
  'retroactive-relink-and-backfill-without-append-preserving-version-lineage': {
    linkage: { false_positive_cross_namespace_links: 0, false_negative_alias_links: 0, hidden_unmatched_records: 0, ambiguous_link_records: 0 },
    namespace: { namespace_collision_count: 0, alias_fragmentation_count: 0, shared_identifier_without_namespace_count: 0, namespace_crosswalk_complete: true },
    temporal_identity: { overlapping_validity_interval_records: 0, temporal_contradiction_records: 0, recycled_identifier_count: 0, validity_interval_custody_complete: true },
    succession: { successor_conflation_count: 0, predecessor_successor_gap_count: 0, silently_bridged_gap_count: 0, succession_source_custody_complete: true },
    versioning: { retroactive_relinked_records: 40, overwritten_version_records: 30, unaudited_backfill_records: 25, append_only_history_complete: false },
    governance: { current_lineage_complete: false, correction_path_complete: false, ambiguity_adjudication_complete: true, binding_public_authority: false, unsupported_decisions: 100, stale_decisions: 100 }
  }
};

const EXPECTED_WORLD_IDS = Object.keys(WORLD_EXPECTATIONS);
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const array = value => Array.isArray(value) ? value : [];
const text = value => String(value ?? '').trim();
const canonical = value => Array.isArray(value)
  ? value.map(canonical)
  : value && typeof value === 'object'
    ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
    : value;
const stable = value => JSON.stringify(canonical(value));
const sha256 = value => createHash('sha256').update(stable(value)).digest('hex');
const sum = (worlds, path) => worlds.reduce((total, world) => total + path.split('.').reduce((value, key) => value?.[key], world), 0);
const count = (worlds, predicate) => worlds.filter(predicate).length;
const sameMembers = (left, right) => stable([...new Set(array(left))].sort()) === stable([...new Set(array(right))].sort());
const requireFalse = (value, label, errors) => { if (value !== false) errors.push(`${label} must remain false`); };

function deriveFlags(world) {
  const linkage = object(world.linkage);
  const namespace = object(world.namespace);
  const temporal = object(world.temporal_identity);
  const succession = object(world.succession);
  const versioning = object(world.versioning);
  const governance = object(world.governance);
  const flags = {
    linkage_confidence_complete:
      linkage.false_positive_cross_namespace_links === 0 &&
      linkage.false_negative_alias_links === 0 &&
      linkage.hidden_unmatched_records === 0 &&
      linkage.ambiguous_link_records === 0,
    namespace_complete:
      namespace.namespace_collision_count === 0 &&
      namespace.shared_identifier_without_namespace_count === 0 &&
      namespace.namespace_crosswalk_complete === true,
    alias_complete:
      namespace.alias_fragmentation_count === 0 &&
      linkage.false_negative_alias_links === 0,
    temporal_identity_complete:
      temporal.overlapping_validity_interval_records === 0 &&
      temporal.temporal_contradiction_records === 0 &&
      temporal.validity_interval_custody_complete === true,
    identifier_lifecycle_complete: temporal.recycled_identifier_count === 0,
    succession_complete:
      succession.successor_conflation_count === 0 &&
      succession.predecessor_successor_gap_count === 0 &&
      succession.silently_bridged_gap_count === 0 &&
      succession.succession_source_custody_complete === true,
    version_lineage_complete:
      versioning.retroactive_relinked_records === 0 &&
      versioning.overwritten_version_records === 0 &&
      versioning.unaudited_backfill_records === 0 &&
      versioning.append_only_history_complete === true,
    ambiguity_adjudication_complete:
      governance.ambiguity_adjudication_complete === true &&
      linkage.ambiguous_link_records === 0,
    current_lineage_complete:
      governance.current_lineage_complete === true &&
      governance.correction_path_complete === true
  };
  flags.complete_record_linkage_assurance = Object.values(flags).every(Boolean);
  return flags;
}

function mechanismFor(world, flags) {
  if (flags.complete_record_linkage_assurance) return 'complete_record_linkage_temporal_succession_assurance';
  if (world.namespace.namespace_collision_count > 0) return 'namespace_collision_cross_namespace_false_linkage';
  if (world.namespace.alias_fragmentation_count > 0) return 'alias_fragmentation_same_entity_false_split';
  if (world.temporal_identity.temporal_contradiction_records > 0) return 'overlapping_validity_temporal_contradiction';
  if (world.temporal_identity.recycled_identifier_count > 0) return 'identifier_recycling_after_retirement';
  if (world.succession.successor_conflation_count > 0) return 'successor_replacement_conflated_with_persistent_entity';
  if (world.succession.silently_bridged_gap_count > 0) return 'predecessor_successor_gap_silently_bridged';
  return 'retroactive_relink_backfill_without_append_preserving_lineage';
}

function seal(event, previousEventSha256) {
  const unsigned = { ...canonical(event), previous_event_sha256: previousEventSha256 };
  return { ...unsigned, event_sha256: sha256(unsigned) };
}

function custodyChain(fixture, world, flags, publicSignature, provenanceSignature, mechanism) {
  const events = [];
  let previous = null;
  const push = event => {
    const sealed = seal(event, previous);
    events.push(sealed);
    previous = sealed.event_sha256;
  };
  const id = fixture.fixture_id;
  const worldId = world.world_id;
  push({ event_id: `${id}:${worldId}:public`, event_type: 'record_linkage_publication_surface_frozen', evidence_class: 'synthetic_public_claim', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [], payload: { baseline: fixture.baseline, public_status_signature_sha256: publicSignature } });
  push({ event_id: `${id}:${worldId}:linkage`, event_type: 'cross_source_record_linkage_state', evidence_class: 'synthetic_operational_state', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [`${id}:${worldId}:public`], payload: { linkage: world.linkage } });
  push({ event_id: `${id}:${worldId}:namespace`, event_type: 'namespace_alias_and_crosswalk_state', evidence_class: 'synthetic_operational_state', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [`${id}:${worldId}:linkage`], payload: { namespace: world.namespace } });
  push({ event_id: `${id}:${worldId}:temporal`, event_type: 'temporal_identity_validity_interval_state', evidence_class: 'synthetic_operational_state', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [`${id}:${worldId}:namespace`], payload: { temporal_identity: world.temporal_identity } });
  push({ event_id: `${id}:${worldId}:identifier`, event_type: 'identifier_retirement_recycling_and_lifecycle_state', evidence_class: 'synthetic_operational_state', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [`${id}:${worldId}:temporal`], payload: { recycled_identifier_count: world.temporal_identity.recycled_identifier_count } });
  push({ event_id: `${id}:${worldId}:succession`, event_type: 'predecessor_successor_transition_state', evidence_class: 'synthetic_operational_state', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [`${id}:${worldId}:identifier`], payload: { succession: world.succession } });
  push({ event_id: `${id}:${worldId}:version`, event_type: 'retroactive_relink_backfill_and_version_lineage_state', evidence_class: 'synthetic_operational_state', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [`${id}:${worldId}:succession`], payload: { versioning: world.versioning } });
  push({ event_id: `${id}:${worldId}:governance`, event_type: 'lineage_correction_ambiguity_and_authority_state', evidence_class: 'synthetic_governance_state', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [`${id}:${worldId}:version`], payload: { governance: world.governance } });
  push({ event_id: `${id}:${worldId}:flags`, event_type: 'record_linkage_assurance_flags_derived', evidence_class: 'deterministic_derived_state', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [`${id}:${worldId}:governance`], payload: { flags, provenance_signature_sha256: provenanceSignature } });
  push({ event_id: `${id}:${worldId}:mechanism`, event_type: 'record_linkage_provenance_mechanism_classified', evidence_class: 'synthetic_control_classification', authority: 'record_linkage_temporal_succession_compiler', source_event_ids: [`${id}:${worldId}:flags`], payload: { mechanism, graph_effect: 'none', real_world_evidence_state: 'none' } });
  return events;
}

function metricsFor(worlds) {
  return {
    world_count: worlds.length,
    distinct_public_status_signatures: new Set(worlds.map(world => world.public_status_signature_sha256)).size,
    distinct_record_linkage_provenance_signatures: new Set(worlds.map(world => world.record_linkage_provenance_signature_sha256)).size,
    complete_record_linkage_assurance_worlds: count(worlds, world => world.flags.complete_record_linkage_assurance),
    namespace_collision_worlds: count(worlds, world => world.namespace.namespace_collision_count > 0),
    alias_fragmentation_worlds: count(worlds, world => world.namespace.alias_fragmentation_count > 0),
    temporal_contradiction_worlds: count(worlds, world => world.temporal_identity.temporal_contradiction_records > 0),
    identifier_recycling_worlds: count(worlds, world => world.temporal_identity.recycled_identifier_count > 0),
    successor_conflation_worlds: count(worlds, world => world.succession.successor_conflation_count > 0),
    succession_gap_worlds: count(worlds, world => world.succession.silently_bridged_gap_count > 0),
    retroactive_relink_worlds: count(worlds, world => world.versioning.retroactive_relinked_records > 0),
    linkage_confidence_complete_worlds: count(worlds, world => world.flags.linkage_confidence_complete),
    namespace_complete_worlds: count(worlds, world => world.flags.namespace_complete),
    alias_complete_worlds: count(worlds, world => world.flags.alias_complete),
    temporal_identity_complete_worlds: count(worlds, world => world.flags.temporal_identity_complete),
    identifier_lifecycle_complete_worlds: count(worlds, world => world.flags.identifier_lifecycle_complete),
    succession_complete_worlds: count(worlds, world => world.flags.succession_complete),
    version_lineage_complete_worlds: count(worlds, world => world.flags.version_lineage_complete),
    ambiguity_adjudication_complete_worlds: count(worlds, world => world.flags.ambiguity_adjudication_complete),
    current_lineage_complete_worlds: count(worlds, world => world.flags.current_lineage_complete),
    total_false_positive_cross_namespace_links: sum(worlds, 'linkage.false_positive_cross_namespace_links'),
    total_false_negative_alias_links: sum(worlds, 'linkage.false_negative_alias_links'),
    total_hidden_unmatched_records: sum(worlds, 'linkage.hidden_unmatched_records'),
    total_ambiguous_link_records: sum(worlds, 'linkage.ambiguous_link_records'),
    total_namespace_collisions: sum(worlds, 'namespace.namespace_collision_count'),
    total_alias_fragmentations: sum(worlds, 'namespace.alias_fragmentation_count'),
    total_shared_identifiers_without_namespace: sum(worlds, 'namespace.shared_identifier_without_namespace_count'),
    total_overlapping_validity_interval_records: sum(worlds, 'temporal_identity.overlapping_validity_interval_records'),
    total_temporal_contradiction_records: sum(worlds, 'temporal_identity.temporal_contradiction_records'),
    total_recycled_identifiers: sum(worlds, 'temporal_identity.recycled_identifier_count'),
    total_successor_conflations: sum(worlds, 'succession.successor_conflation_count'),
    total_predecessor_successor_gaps: sum(worlds, 'succession.predecessor_successor_gap_count'),
    total_silently_bridged_gaps: sum(worlds, 'succession.silently_bridged_gap_count'),
    total_retroactive_relinked_records: sum(worlds, 'versioning.retroactive_relinked_records'),
    total_overwritten_version_records: sum(worlds, 'versioning.overwritten_version_records'),
    total_unaudited_backfill_records: sum(worlds, 'versioning.unaudited_backfill_records'),
    total_stale_linkage_decisions: sum(worlds, 'governance.stale_decisions'),
    total_unsupported_linkage_decisions: sum(worlds, 'governance.unsupported_decisions'),
    binding_public_authority_worlds: count(worlds, world => world.governance.binding_public_authority === true)
  };
}

export const EXPECTED_RECORD_LINKAGE_METRICS = {
  world_count: 8,
  distinct_public_status_signatures: 1,
  distinct_record_linkage_provenance_signatures: 8,
  complete_record_linkage_assurance_worlds: 1,
  namespace_collision_worlds: 1,
  alias_fragmentation_worlds: 1,
  temporal_contradiction_worlds: 1,
  identifier_recycling_worlds: 1,
  successor_conflation_worlds: 1,
  succession_gap_worlds: 1,
  retroactive_relink_worlds: 1,
  linkage_confidence_complete_worlds: 6,
  namespace_complete_worlds: 7,
  alias_complete_worlds: 7,
  temporal_identity_complete_worlds: 7,
  identifier_lifecycle_complete_worlds: 7,
  succession_complete_worlds: 6,
  version_lineage_complete_worlds: 7,
  ambiguity_adjudication_complete_worlds: 7,
  current_lineage_complete_worlds: 7,
  total_false_positive_cross_namespace_links: 30,
  total_false_negative_alias_links: 25,
  total_hidden_unmatched_records: 25,
  total_ambiguous_link_records: 20,
  total_namespace_collisions: 20,
  total_alias_fragmentations: 20,
  total_shared_identifiers_without_namespace: 25,
  total_overlapping_validity_interval_records: 40,
  total_temporal_contradiction_records: 30,
  total_recycled_identifiers: 15,
  total_successor_conflations: 20,
  total_predecessor_successor_gaps: 25,
  total_silently_bridged_gaps: 20,
  total_retroactive_relinked_records: 40,
  total_overwritten_version_records: 30,
  total_unaudited_backfill_records: 25,
  total_stale_linkage_decisions: 100,
  total_unsupported_linkage_decisions: 700,
  binding_public_authority_worlds: 0
};

export function validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture) {
  const errors = [];
  if (fixture?.schema_version !== PREFERENCE_RECORD_LINKAGE_TEMPORAL_SUCCESSION_ASSURANCE_FIXTURE_SCHEMA_VERSION) errors.push('fixture schema mismatch');
  if (fixture?.fixture_id !== 'same-linkage-verified-status-different-provenance-v1') errors.push('fixture identity mismatch');
  if (fixture?.issue !== 870 || fixture?.parent_program_issue !== 594) errors.push('fixture issue lineage mismatch');
  if (fixture?.status !== 'synthetic_control' || fixture?.graph_effect !== 'none') errors.push('fixture status or graph effect mismatch');
  requireFalse(fixture?.counts_toward_thesis_evidence, 'fixture thesis evidence', errors);
  if (stable(fixture?.baseline) !== stable(BASELINE)) errors.push('frozen linkage publication surface mismatch');
  if (!sameMembers(fixture?.required_refusal_rules, REQUIRED_REFUSAL_RULES) || array(fixture?.required_refusal_rules).length !== REQUIRED_REFUSAL_RULES.length) errors.push('required refusal-rule ledger mismatch');
  const expectedClassification = object(fixture?.expected_classification);
  for (const key of FALSE_CLASSIFICATIONS) requireFalse(expectedClassification[key], `expected classification.${key}`, errors);
  if (expectedClassification.complete_record_linkage_assurance_supported_in_at_least_one_world !== true) errors.push('expected complete assurance path missing');
  const worlds = array(fixture?.worlds);
  if (worlds.length !== 8) errors.push('fixture must contain eight worlds');
  if (!sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS) || new Set(worlds.map(world => world?.world_id)).size !== worlds.length) errors.push('fixture world identity denominator mismatch');
  for (const world of worlds) {
    const worldId = text(world?.world_id);
    const expected = WORLD_EXPECTATIONS[worldId];
    if (!expected) { errors.push(`unexpected world: ${worldId || '<blank>'}`); continue; }
    if (!text(world.description)) errors.push(`${worldId} description missing`);
    for (const section of ['linkage', 'namespace', 'temporal_identity', 'succession', 'versioning', 'governance']) {
      if (stable(world?.[section]) !== stable(expected[section])) errors.push(`${worldId} ${section} contract mismatch`);
    }
    const flags = deriveFlags(world);
    if (stable(world?.expected_flags) !== stable(flags)) errors.push(`${worldId} expected flags mismatch`);
    if (world?.governance?.binding_public_authority !== false) errors.push(`${worldId} binding public authority must remain false`);
  }
  const complete = worlds.filter(world => deriveFlags(world).complete_record_linkage_assurance);
  if (complete.length !== 1 || complete[0]?.world_id !== EXPECTED_WORLD_IDS[0]) errors.push('exactly one complete record-linkage assurance world is required');
  return errors;
}

export function compilePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture) {
  const errors = validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture);
  if (errors.length) throw new Error(`invalid record-linkage fixture:\n- ${errors.join('\n- ')}`);
  const publicSignature = sha256(fixture.baseline);
  const worlds = fixture.worlds.map(source => {
    const world = canonical(source);
    const flags = deriveFlags(world);
    const provenance = { linkage: world.linkage, namespace: world.namespace, temporal_identity: world.temporal_identity, succession: world.succession, versioning: world.versioning, governance: world.governance };
    const provenanceSignature = sha256(provenance);
    const mechanism = mechanismFor(world, flags);
    const chain = custodyChain(fixture, world, flags, publicSignature, provenanceSignature, mechanism);
    return {
      world_id: world.world_id,
      description: world.description,
      linkage: world.linkage,
      namespace: world.namespace,
      temporal_identity: world.temporal_identity,
      succession: world.succession,
      versioning: world.versioning,
      governance: world.governance,
      flags,
      mechanism,
      public_status_signature_sha256: publicSignature,
      record_linkage_provenance_signature_sha256: provenanceSignature,
      custody_chain: chain,
      custody_chain_head_sha256: chain.at(-1).event_sha256
    };
  });
  return {
    schema_version: PREFERENCE_RECORD_LINKAGE_TEMPORAL_SUCCESSION_ASSURANCE_BUILD_SCHEMA_VERSION,
    fixture_id: fixture.fixture_id,
    issue: fixture.issue,
    parent_program_issue: fixture.parent_program_issue,
    captured_at: fixture.captured_at,
    status: 'synthetic_record_linkage_temporal_succession_control_qualified',
    graph_effect: 'none',
    counts_toward_thesis_evidence: false,
    conclusion_generated: false,
    baseline: canonical(fixture.baseline),
    required_refusal_rules: [...fixture.required_refusal_rules],
    fixture_sha256: sha256(fixture),
    worlds,
    metrics: metricsFor(worlds),
    classification: { ...fixture.expected_classification }
  };
}

function validateChain(world, errors) {
  const chain = array(world?.custody_chain);
  const expectedTypes = [
    'record_linkage_publication_surface_frozen',
    'cross_source_record_linkage_state',
    'namespace_alias_and_crosswalk_state',
    'temporal_identity_validity_interval_state',
    'identifier_retirement_recycling_and_lifecycle_state',
    'predecessor_successor_transition_state',
    'retroactive_relink_backfill_and_version_lineage_state',
    'lineage_correction_ambiguity_and_authority_state',
    'record_linkage_assurance_flags_derived',
    'record_linkage_provenance_mechanism_classified'
  ];
  if (chain.length !== expectedTypes.length) errors.push(`${world?.world_id} custody chain length mismatch`);
  let previous = null;
  const seen = new Set();
  for (let index = 0; index < chain.length; index += 1) {
    const event = chain[index];
    if (event?.event_type !== expectedTypes[index]) errors.push(`${world?.world_id} custody event type mismatch at ${index}`);
    if (event?.previous_event_sha256 !== previous) errors.push(`${world?.world_id} custody previous hash mismatch`);
    for (const sourceId of array(event?.source_event_ids)) if (!seen.has(sourceId)) errors.push(`${world?.world_id} custody source missing: ${sourceId}`);
    const unsigned = { ...event };
    delete unsigned.event_sha256;
    if (event?.event_sha256 !== sha256(unsigned)) errors.push(`${world?.world_id} custody hash mismatch`);
    if (text(event?.event_id)) seen.add(event.event_id);
    previous = event?.event_sha256;
  }
  if (previous !== world?.custody_chain_head_sha256) errors.push(`${world?.world_id} custody head mismatch`);
}

export function validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(build, fixture) {
  const errors = [];
  if (build?.schema_version !== PREFERENCE_RECORD_LINKAGE_TEMPORAL_SUCCESSION_ASSURANCE_BUILD_SCHEMA_VERSION) errors.push('build schema mismatch');
  if (build?.fixture_id !== 'same-linkage-verified-status-different-provenance-v1' || build?.issue !== 870 || build?.parent_program_issue !== 594) errors.push('build identity or issue lineage mismatch');
  if (build?.status !== 'synthetic_record_linkage_temporal_succession_control_qualified' || build?.graph_effect !== 'none') errors.push('build status or graph effect mismatch');
  requireFalse(build?.counts_toward_thesis_evidence, 'build thesis evidence', errors);
  requireFalse(build?.conclusion_generated, 'build conclusion', errors);
  if (stable(build?.baseline) !== stable(BASELINE)) errors.push('build public surface mismatch');
  if (!sameMembers(build?.required_refusal_rules, REQUIRED_REFUSAL_RULES) || array(build?.required_refusal_rules).length !== REQUIRED_REFUSAL_RULES.length) errors.push('build refusal-rule ledger mismatch');
  if (!/^[0-9a-f]{64}$/.test(text(build?.fixture_sha256))) errors.push('build fixture hash invalid');
  if (!fixture) errors.push('build fixture source is required');
  else {
    const fixtureErrors = validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture);
    if (fixtureErrors.length) errors.push(...fixtureErrors.map(error => `build fixture source invalid: ${error}`));
    else {
      if (build?.fixture_sha256 !== sha256(fixture)) errors.push('build fixture hash does not match supplied fixture');
      const expectedBuild = compilePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture);
      if (stable(build) !== stable(expectedBuild)) errors.push('build does not deterministically reconstruct from supplied fixture');
    }
  }
  const worlds = array(build?.worlds);
  if (worlds.length !== 8 || !sameMembers(worlds.map(world => world?.world_id), EXPECTED_WORLD_IDS)) errors.push('build world denominator mismatch');
  for (const world of worlds) {
    const worldId = text(world?.world_id);
    const expected = WORLD_EXPECTATIONS[worldId];
    if (!expected) { errors.push(`build unexpected world: ${worldId || '<blank>'}`); continue; }
    for (const section of ['linkage', 'namespace', 'temporal_identity', 'succession', 'versioning', 'governance']) if (stable(world?.[section]) !== stable(expected[section])) errors.push(`${worldId} build ${section} mismatch`);
    const flags = deriveFlags(world);
    if (stable(world?.flags) !== stable(flags)) errors.push(`${worldId} build flags mismatch`);
    const publicSignature = sha256(BASELINE);
    if (world?.public_status_signature_sha256 !== publicSignature) errors.push(`${worldId} public signature mismatch`);
    const provenance = { linkage: world.linkage, namespace: world.namespace, temporal_identity: world.temporal_identity, succession: world.succession, versioning: world.versioning, governance: world.governance };
    if (world?.record_linkage_provenance_signature_sha256 !== sha256(provenance)) errors.push(`${worldId} provenance signature mismatch`);
    if (world?.mechanism !== mechanismFor(world, flags)) errors.push(`${worldId} mechanism mismatch`);
    if (world?.governance?.binding_public_authority !== false) errors.push(`${worldId} build authority leak`);
    validateChain(world, errors);
  }
  for (const [key, expected] of Object.entries(EXPECTED_RECORD_LINKAGE_METRICS)) if (build?.metrics?.[key] !== expected) errors.push(`metric mismatch: ${key}`);
  for (const key of FALSE_CLASSIFICATIONS) requireFalse(build?.classification?.[key], `classification.${key}`, errors);
  if (build?.classification?.complete_record_linkage_assurance_supported_in_at_least_one_world !== true) errors.push('build complete assurance path missing');
  return errors;
}

export function renderPreferenceRecordLinkageTemporalSuccessionAssuranceMarkdown(build) {
  const lines = [
    '# Record linkage, namespace, temporal identity, and succession custody',
    '',
    `**Status:** ${build.status}`,
    '',
    `**Worlds:** ${build.metrics.world_count}`,
    '',
    `**Public status signatures:** ${build.metrics.distinct_public_status_signatures}`,
    '',
    `**Provenance signatures:** ${build.metrics.distinct_record_linkage_provenance_signatures}`,
    '',
    '> A complete-looking linkage publication does not identify complete cross-source, namespace, alias, temporal, identifier-lifecycle, succession, version, correction, or authority custody.',
    '',
    '## Deterministic burden surface',
    ''
  ];
  for (const [key, value] of Object.entries(build.metrics)) lines.push(`- ${key}: ${value}`);
  lines.push('', '## Worlds', '');
  for (const world of build.worlds) lines.push(`- **${world.world_id}** — ${world.mechanism}`);
  lines.push('', '## Claim boundary', '', 'This synthetic control creates no real identity map, longitudinal entity history, exposure trajectory, causal conclusion, named-actor allegation, graph effect, or public-authority verdict.');
  return `${lines.join('\n')}\n`;
}
