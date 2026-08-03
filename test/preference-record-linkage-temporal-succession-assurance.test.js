import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import {
  EXPECTED_RECORD_LINKAGE_METRICS,
  compilePreferenceRecordLinkageTemporalSuccessionAssuranceFixture,
  validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture,
  validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild
} from '../tools/lib/preference-record-linkage-temporal-succession-assurance.mjs';

const fixturePath = 'data/research/preference-custody/record-linkage-temporal-succession-assurance.fixture.json';
const buildPath = 'build/research/preference-record-linkage-temporal-succession-assurance.json';
execFileSync(process.execPath, ['tools/compile-preference-record-linkage-temporal-succession-assurance.mjs'], { stdio: 'pipe' });
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
const build = JSON.parse(readFileSync(buildPath, 'utf8'));
const markdown = readFileSync('build/research/preference-record-linkage-temporal-succession-assurance.md', 'utf8');

assert.deepEqual(validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture), []);
assert.deepEqual(validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(build), []);
assert.deepEqual(build.metrics, EXPECTED_RECORD_LINKAGE_METRICS);
assert.equal(build.classification.complete_record_linkage_assurance_supported_in_at_least_one_world, true);
for (const [key, value] of Object.entries(build.classification)) {
  if (key !== 'complete_record_linkage_assurance_supported_in_at_least_one_world') assert.equal(value, false, key);
}

const byId = Object.fromEntries(build.worlds.map(world => [world.world_id, world]));
assert.equal(byId['complete-cross-source-linkage-namespace-temporal-succession-and-version-custody'].flags.complete_record_linkage_assurance, true);
assert.equal(byId['namespace-collision-and-cross-namespace-false-linkage'].linkage.false_positive_cross_namespace_links, 30);
assert.equal(byId['namespace-collision-and-cross-namespace-false-linkage'].flags.namespace_complete, false);
assert.equal(byId['alias-fragmentation-and-same-entity-false-split'].namespace.alias_fragmentation_count, 20);
assert.equal(byId['alias-fragmentation-and-same-entity-false-split'].flags.alias_complete, false);
assert.equal(byId['overlapping-validity-intervals-and-temporal-contradiction'].temporal_identity.temporal_contradiction_records, 30);
assert.equal(byId['identifier-recycling-after-retirement'].temporal_identity.recycled_identifier_count, 15);
assert.equal(byId['successor-replacement-conflated-with-persistent-entity'].succession.successor_conflation_count, 20);
assert.equal(byId['predecessor-successor-gap-silently-bridged-without-source-custody'].succession.silently_bridged_gap_count, 20);
assert.equal(byId['retroactive-relink-and-backfill-without-append-preserving-version-lineage'].versioning.retroactive_relinked_records, 40);
assert.equal(byId['retroactive-relink-and-backfill-without-append-preserving-version-lineage'].flags.version_lineage_complete, false);

for (const world of build.worlds) {
  assert.equal(world.custody_chain.length, 10);
  assert.match(world.public_status_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.record_linkage_provenance_signature_sha256, /^[0-9a-f]{64}$/);
  assert.match(world.custody_chain_head_sha256, /^[0-9a-f]{64}$/);
  assert.equal(world.custody_chain.at(-1).event_sha256, world.custody_chain_head_sha256);
}
assert.equal(build.worlds[0].custody_chain[0].event_type, 'record_linkage_publication_surface_frozen');
assert.equal(build.worlds[0].custody_chain[3].event_type, 'temporal_identity_validity_interval_state');
assert.equal(build.worlds[0].custody_chain[5].event_type, 'predecessor_successor_transition_state');
assert.equal(build.worlds[0].custody_chain[9].event_type, 'record_linkage_provenance_mechanism_classified');
assert.match(markdown, /Record linkage, namespace, temporal identity, and succession custody/);
assert.match(markdown, /total_false_positive_cross_namespace_links: 30/);
assert.match(markdown, /retroactive-relink-and-backfill-without-append-preserving-version-lineage/);
assert.doesNotMatch(markdown, /named actor caused|real longitudinal identity|publicly authorized/i);

const clone = value => structuredClone(value);
const mutations = [
  ['schema drift', value => { value.schema_version = 'invalid'; }],
  ['fixture identity drift', value => { value.fixture_id = 'invalid'; }],
  ['issue drift', value => { value.issue = 869; }],
  ['parent issue drift', value => { value.parent_program_issue = 593; }],
  ['status drift', value => { value.status = 'real_control'; }],
  ['graph effect leak', value => { value.graph_effect = 'asserted'; }],
  ['thesis evidence leak', value => { value.counts_toward_thesis_evidence = true; }],
  ['release identity drift', value => { value.baseline.operative_release_id = 'OTHER'; }],
  ['release version drift', value => { value.baseline.operative_release_version = 2; }],
  ['source record drift', value => { value.baseline.source_records = 99; }],
  ['linked record drift', value => { value.baseline.linked_records = 99; }],
  ['coverage drift', value => { value.baseline.published_linkage_coverage_pct = 99; }],
  ['unmatched publication drift', value => { value.baseline.published_unmatched_records = 1; }],
  ['ambiguous publication drift', value => { value.baseline.published_ambiguous_links = 1; }],
  ['public status drift', value => { value.baseline.public_linkage_status = 'partial'; }],
  ['namespace status drift', value => { value.baseline.namespace_status = 'stale'; }],
  ['temporal continuity drift', value => { value.baseline.temporal_continuity = 'partial'; }],
  ['succession continuity drift', value => { value.baseline.succession_continuity = 'partial'; }],
  ['approved use drift', value => { value.baseline.approved_use = 'other'; }],
  ['missing refusal rule', value => { value.required_refusal_rules.pop(); }],
  ['duplicate refusal rule', value => { value.required_refusal_rules.at(-1) && (value.required_refusal_rules[value.required_refusal_rules.length - 1] = value.required_refusal_rules[0]); }],
  ['classification escalation', value => { value.expected_classification.binding_public_authority_supported = true; }],
  ['missing world', value => { value.worlds.pop(); }],
  ['duplicate world id', value => { value.worlds[7].world_id = value.worlds[0].world_id; }],
  ['missing description', value => { value.worlds[0].description = ''; }],
  ['namespace false-positive burden drift', value => { value.worlds[1].linkage.false_positive_cross_namespace_links = 29; }],
  ['namespace collision burden drift', value => { value.worlds[1].namespace.namespace_collision_count = 19; }],
  ['alias fragmentation burden drift', value => { value.worlds[2].namespace.alias_fragmentation_count = 19; }],
  ['alias false-negative burden drift', value => { value.worlds[2].linkage.false_negative_alias_links = 24; }],
  ['temporal overlap burden drift', value => { value.worlds[3].temporal_identity.overlapping_validity_interval_records = 39; }],
  ['temporal contradiction burden drift', value => { value.worlds[3].temporal_identity.temporal_contradiction_records = 29; }],
  ['recycled identifier burden drift', value => { value.worlds[4].temporal_identity.recycled_identifier_count = 14; }],
  ['successor conflation burden drift', value => { value.worlds[5].succession.successor_conflation_count = 19; }],
  ['succession gap burden drift', value => { value.worlds[6].succession.predecessor_successor_gap_count = 24; }],
  ['silent bridge burden drift', value => { value.worlds[6].succession.silently_bridged_gap_count = 19; }],
  ['retroactive relink burden drift', value => { value.worlds[7].versioning.retroactive_relinked_records = 39; }],
  ['append-only escalation', value => { value.worlds[7].versioning.append_only_history_complete = true; }],
  ['current lineage escalation', value => { value.worlds[7].governance.current_lineage_complete = true; }],
  ['authority leak', value => { value.worlds[0].governance.binding_public_authority = true; }],
  ['complete flag tamper', value => { value.worlds[0].expected_flags.complete_record_linkage_assurance = false; }]
];
assert.equal(mutations.length, 40);
for (const [label, mutate] of mutations) {
  const value = clone(fixture);
  mutate(value);
  assert.ok(validatePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(value).length > 0, label);
}

const buildTamperCases = [
  ['metric tamper', value => { value.metrics.total_false_positive_cross_namespace_links = 29; }],
  ['classification tamper', value => { value.classification.binding_public_authority_supported = true; }],
  ['chain payload tamper', value => { value.worlds[0].custody_chain[2].payload.namespace.namespace_collision_count = 1; }],
  ['custody head tamper', value => { value.worlds[0].custody_chain_head_sha256 = '0'.repeat(64); }],
  ['public signature tamper', value => { value.worlds[0].public_status_signature_sha256 = '0'.repeat(64); }],
  ['provenance signature tamper', value => { value.worlds[0].record_linkage_provenance_signature_sha256 = '0'.repeat(64); }],
  ['mechanism tamper', value => { value.worlds[0].mechanism = 'invalid'; }],
  ['build refusal deletion', value => { value.required_refusal_rules.pop(); }]
];
for (const [label, mutate] of buildTamperCases) {
  const value = clone(build);
  mutate(value);
  assert.ok(validatePreferenceRecordLinkageTemporalSuccessionAssuranceBuild(value).length > 0, label);
}

const recompiled = compilePreferenceRecordLinkageTemporalSuccessionAssuranceFixture(fixture);
assert.deepEqual(recompiled, build);
console.log('Preference record-linkage temporal-succession assurance adversarial tests: PASS (40 fixture mutations plus build tamper checks)');
