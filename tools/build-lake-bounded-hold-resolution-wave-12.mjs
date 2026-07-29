#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-bounded-hold-resolution-wave-12-policy.json';
const full = relative => path.join(root, relative);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}
function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
}
function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}
function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key]) ]));
}
function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}
function stableId(prefix, parts) {
  return `${prefix}-${sha256(Buffer.from(parts.join('\0'))).slice(0, 24)}`;
}
function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(value => value !== null && value !== undefined && String(value).length).map(String))]
    .sort((left, right) => left.localeCompare(right));
}
function normalize(value) {
  return String(value ?? '').normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[’']/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, ' ');
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-bounded-hold-resolution-wave-12-policy@1');
const implementationPaths = [
  'tools/build-lake-bounded-hold-resolution-wave-12.mjs',
  'tools/build-lake-canonical-identity-extension-wave-12.mjs',
  'tools/reconcile-lake-bounded-hold-resolution-wave-12.mjs',
  'tools/validate-lake-bounded-hold-resolution-wave-12.mjs',
  'test/lake-bounded-hold-resolution-wave-12.test.js'
];
for (const relative of [...policy.input_paths, ...implementationPaths]) {
  if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 12 input: ${relative}`);
}

const wave11Decisions = readJsonl('data/project/lake-canonical-adjudication-registry-wave-11.jsonl');
const holds = wave11Decisions.filter(row => row.adjudication_status === 'bounded_hold');
const sources = readJsonl(policy.source_registry_path);
const actorsDoc = readJson('data/canonical/actors.json');
const organizationsDoc = readJson('data/canonical/organizations.json');
const aliasesDoc = readJson('data/canonical/aliases.json');
const publicInterestMap = readJson('data/research/clifford-cross-corpus-public-interest-map.json');
const participation = readJsonl('data/ledger/participation.jsonl');
const active = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(holds.length, policy.expected.bounded_hold_rows, 'Wave 12 bounded-hold denominator drift');
const holdByIdentity = new Map(holds.map(row => [row.identity_value, row]));
assert.deepEqual([...holdByIdentity.keys()].sort(), Object.keys(policy.resolutions).sort(), 'Wave 12 policy does not cover the exact hold denominator');
assert.equal(new Set(sources.map(row => row.source_id)).size, sources.length, 'duplicate Wave 12 source ID');
const sourceById = new Map(sources.map(row => [row.source_id, row]));
const currentIds = new Set([...actorsDoc.actors.map(row => row.id), ...organizationsDoc.organizations.map(row => row.id)]);
const aliasTerms = new Map();
for (const row of aliasesDoc.aliases) aliasTerms.set(`${row.kind}:${normalize(row.alias)}`, row.canonical_id);

const decisionRows = [];
const localResolutionRows = [];
const actorAdditions = [];
const organizationAdditions = [];
const aliasAdditions = [];
const materializedIds = new Set();
const canonicalOwnerById = new Map();

for (const [localSubjectId, resolution] of Object.entries(policy.resolutions).sort(([left], [right]) => left.localeCompare(right))) {
  const hold = holdByIdentity.get(localSubjectId);
  assert.ok(hold, `${localSubjectId}: Wave 11 hold missing`);
  assert.ok(['actor', 'organization'].includes(resolution.canonical_kind), `${localSubjectId}: invalid canonical kind`);
  assert.match(resolution.canonical_id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/, `${localSubjectId}: malformed canonical ID`);
  assert.ok(resolution.canonical_label, `${localSubjectId}: canonical label missing`);
  assert.ok(resolution.source_ids.length > 0, `${localSubjectId}: no source custody`);
  const sourceRows = resolution.source_ids.map(sourceId => {
    const source = sourceById.get(sourceId);
    assert.ok(source, `${localSubjectId}: missing source ${sourceId}`);
    assert.ok(source.supports_subjects.includes(localSubjectId), `${sourceId}: does not declare support for ${localSubjectId}`);
    assert.equal(source.publicly_inspectable, true, `${sourceId}: source is not publicly inspectable`);
    if (source.repository_path) assert.ok(fs.existsSync(full(source.repository_path)), `${sourceId}: repository source missing`);
    return source;
  });

  const canonicalIdAlreadyExists = currentIds.has(resolution.canonical_id);
  const previouslyPlanned = canonicalOwnerById.get(resolution.canonical_id);
  if (resolution.materialize_record) {
    assert.equal(canonicalIdAlreadyExists, false, `${localSubjectId}: canonical target already exists`);
    assert.equal(previouslyPlanned, undefined, `${localSubjectId}: duplicate materialization owner for ${resolution.canonical_id}`);
    canonicalOwnerById.set(resolution.canonical_id, localSubjectId);
    materializedIds.add(resolution.canonical_id);
    const provenance = {
      source: 'lake-bounded-hold-resolution-wave-12',
      source_local_subject_id: localSubjectId,
      source_wave11_adjudication_id: hold.adjudication_id,
      source_ids: resolution.source_ids,
      canonical_status: 'bounded_source_custodied_canonical_record',
      graph_effect: 'none'
    };
    if (resolution.canonical_kind === 'actor') {
      actorAdditions.push({ id: resolution.canonical_id, label: resolution.canonical_label, kind: 'person', ...provenance });
    } else {
      organizationAdditions.push({
        id: resolution.canonical_id,
        label: resolution.canonical_label,
        kind: resolution.organization_kind ?? 'organization',
        ...(resolution.broad_institution ? { broad_institution: true } : {}),
        ...provenance
      });
    }
    for (const alias of resolution.aliases ?? []) {
      const key = `${resolution.canonical_kind}:${normalize(alias)}`;
      assert.ok(!aliasTerms.has(key), `${localSubjectId}: alias ${alias} collides with ${aliasTerms.get(key)}`);
      aliasTerms.set(key, resolution.canonical_id);
      aliasAdditions.push({
        alias,
        canonical_id: resolution.canonical_id,
        kind: resolution.canonical_kind,
        source: 'lake-bounded-hold-resolution-wave-12',
        source_local_subject_id: localSubjectId,
        source_ids: resolution.source_ids,
        graph_effect: 'none'
      });
    }
  } else {
    assert.ok(materializedIds.has(resolution.canonical_id) || currentIds.has(resolution.canonical_id), `${localSubjectId}: non-owner resolution target is not materialized`);
  }

  const decisionId = stableId('HOLDDEC', [localSubjectId, resolution.canonical_id, ...resolution.source_ids]);
  const localResolutionId = stableId('LOCALCANON', [localSubjectId, resolution.canonical_id]);
  const sourceCustody = sourceRows.map(source => ({
    source_id: source.source_id,
    source_type: source.source_type,
    evidence_class: source.evidence_class,
    publicly_inspectable: source.publicly_inspectable,
    exact_bytes_preserved: source.exact_bytes_preserved,
    repository_path: source.repository_path ?? null,
    url: source.url ?? null,
    receipt_ids: source.receipt_ids ?? []
  }));
  decisionRows.push({
    schema_version: 'bounded-hold-resolution-decision@1',
    decision_id: decisionId,
    wave11_adjudication_id: hold.adjudication_id,
    wave11_acquisition_id: hold.acquisition_id,
    local_subject_id: localSubjectId,
    canonical_id: resolution.canonical_id,
    canonical_kind: resolution.canonical_kind,
    canonical_label: resolution.canonical_label,
    resolution_status: 'accepted_local_to_canonical_resolution',
    canonical_record_materialized: resolution.materialize_record,
    source_ids: resolution.source_ids,
    source_custody: sourceCustody,
    explicit_same_entity_assertion: true,
    shared_identity_namespace: 'clifford-number/canonical-v1',
    unambiguous_target: true,
    evidence_basis: sourceRows.flatMap(source => source.supports),
    counterevidence: [hold.decision_reason, ...(hold.counterevidence ?? [])],
    uncertainty: [
      'identity_resolution_does_not_validate_every_case_claim',
      ...(sourceRows.some(source => source.exact_bytes_preserved === false) ? ['one_or_more_remote_sources_are_locator_preserved_not_exact_byte_archived'] : [])
    ],
    review_dependency: {
      required_to_decide: false,
      effect: 'new_custodied_counterevidence_may_supersede_this_resolution_but_missing_review_does_not_block_the_current_reversible_action'
    },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'append_a_superseding_local_canonical_resolution_and_retire_or_redirect_the_current_mapping_without_deleting_this_decision'
    },
    accepted_local_canonical_resolution: true,
    accepted_cross_case_identity_bridge: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  });
  localResolutionRows.push({
    schema_version: 'local-canonical-resolution@1',
    resolution_id: localResolutionId,
    source_case_id: hold.case_id,
    local_subject_id: localSubjectId,
    canonical_id: resolution.canonical_id,
    canonical_kind: resolution.canonical_kind,
    source_decision_id: decisionId,
    source_ids: resolution.source_ids,
    status: 'accepted_graph_inert_local_resolution',
    explicit_same_entity_assertion: true,
    entities_merged: false,
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridge: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    review_dependency: { required_to_decide: false },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'append_a_superseding_resolution_row_and_update_current_local_resolution_without_deleting_this_row'
    },
    graph_effect: 'none'
  });
}

actorAdditions.sort((left, right) => left.id.localeCompare(right.id));
organizationAdditions.sort((left, right) => left.id.localeCompare(right.id));
aliasAdditions.sort((left, right) => `${left.kind}:${left.canonical_id}:${left.alias}`.localeCompare(`${right.kind}:${right.canonical_id}:${right.alias}`));
decisionRows.sort((left, right) => left.decision_id.localeCompare(right.decision_id));
localResolutionRows.sort((left, right) => left.resolution_id.localeCompare(right.resolution_id));
assert.equal(actorAdditions.length, policy.expected.new_actor_records);
assert.equal(organizationAdditions.length, policy.expected.new_organization_records);
assert.equal(actorAdditions.length + organizationAdditions.length, policy.expected.new_entity_records);
assert.equal(decisionRows.length, policy.expected.resolved_local_subjects);
assert.equal(localResolutionRows.length, policy.expected.resolved_local_subjects);
assert.equal(new Set([...actorAdditions, ...organizationAdditions].map(row => row.id)).size, policy.expected.new_entity_records);
assert.equal(new Set(aliasAdditions.map(row => `${row.kind}:${normalize(row.alias)}`)).size, aliasAdditions.length);

const fingerprintPaths = [...new Set([policyPath, ...policy.input_paths, ...implementationPaths])].sort();
const inputManifest = fingerprintPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputManifest.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
const mutationPlan = {
  schema_version: 'lake-bounded-hold-mutation-plan-wave-12@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  before: {
    actor_rows: actorsDoc.actors.length,
    organization_rows: organizationsDoc.organizations.length,
    alias_rows: aliasesDoc.aliases.length,
    participation_rows: participation.length,
    active_entities: active.entities.length,
    active_claims: active.claims.length,
    hop_edges: hopGraph.edges.length,
    participation_digest_sha256: stableDigest(participation),
    active_claim_digest_sha256: stableDigest(active.claims),
    hop_edge_digest_sha256: stableDigest(hopGraph.edges),
    hop_rejected_surface_digest_sha256: stableDigest(hopGraph.rejected_hop_surfaces),
    hop_rejected_pair_digest_sha256: stableDigest(hopGraph.rejected_hop_pairs),
    public_interest_actor_count: publicInterestMap.inventory.canonical.actors,
    public_interest_organization_count: publicInterestMap.inventory.canonical.organizations
  },
  mutations: {
    actor_additions: actorAdditions,
    organization_additions: organizationAdditions,
    alias_additions: aliasAdditions,
    participation_additions: []
  },
  local_resolutions: localResolutionRows,
  expected_after: {
    actor_rows: actorsDoc.actors.length + actorAdditions.length,
    organization_rows: organizationsDoc.organizations.length + organizationAdditions.length,
    alias_rows: aliasesDoc.aliases.length + aliasAdditions.length,
    participation_rows: participation.length,
    active_entities: active.entities.length + actorAdditions.length + organizationAdditions.length,
    active_claims: active.claims.length,
    hop_edges: hopGraph.edges.length,
    accepted_local_canonical_resolutions: localResolutionRows.length,
    accepted_cross_case_identity_bridges: 0,
    claim_delta: 0,
    graph_edge_delta: 0
  },
  boundaries: policy.boundaries
};
const projection = {
  schema_version: 'bounded-hold-resolution-index-wave-12@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  source_paths: {
    decisions: policy.decision_registry_path,
    local_resolutions: policy.local_resolution_registry_path,
    mutation_plan: policy.mutation_plan_path,
    sources: policy.source_registry_path
  },
  counts: {
    source_rows: sources.length,
    decision_rows: decisionRows.length,
    local_resolution_rows: localResolutionRows.length,
    actor_additions: actorAdditions.length,
    organization_additions: organizationAdditions.length,
    alias_additions: aliasAdditions.length
  },
  decisions: decisionRows,
  local_resolutions: localResolutionRows,
  mutations: mutationPlan.mutations,
  accepted_cross_case_identity_bridges: 0,
  graph_effect: 'none'
};
const plan = {
  schema_version: 'lake-bounded-hold-resolution-wave-12-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  before: mutationPlan.before,
  expected_after: mutationPlan.expected_after,
  completion: {
    complete_hold_denominator_adjudicated: decisionRows.length === policy.expected.bounded_hold_rows,
    every_resolution_has_public_source_custody: decisionRows.every(row => row.source_custody.length > 0 && row.source_custody.every(source => source.publicly_inspectable)),
    every_resolution_has_explicit_assertion: decisionRows.every(row => row.explicit_same_entity_assertion === true),
    reversible_mutation_plan_present: true,
    canonical_mutations_applied: false,
    identity_extension_registry_built: false,
    accepted_local_canonical_resolutions: localResolutionRows.length,
    accepted_cross_case_identity_bridges: 0,
    participation_rows_added: 0,
    claim_delta: 0,
    graph_edge_delta: 0,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};

writeJsonl(policy.decision_registry_path, decisionRows);
writeJsonl(policy.local_resolution_registry_path, localResolutionRows);
writeJson(policy.mutation_plan_path, mutationPlan);
writeJson(policy.projection_path, projection);
writeJson(policy.plan_path, plan);
const report = `# Bounded-hold resolution Wave 12\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Resolution denominator\n\n\`\`\`text\nWave 11 bounded holds:               ${holds.length}\nsource records:                      ${sources.length}\naccepted local/canonical resolutions:${localResolutionRows.length}\nnew actor records planned:           ${actorAdditions.length}\nnew organization records planned:    ${organizationAdditions.length}\naliases planned:                     ${aliasAdditions.length}\naccepted cross-case identity bridges:0\nparticipation additions:             0\nclaim delta:                         0\ngraph edge delta:                    0\nhuman-permission dependencies:       0\n\`\`\`\n\n## Judgment\n\nAll twelve former holds now have public or repository-preserved source custody, explicit same-entity assertions, unique canonical targets, and reversible actions. The two City of Arcadia local IDs resolve to one canonical municipal record. Company-source replacements cure private-only custody without treating Crucible selection as performance, acceptance, or deployment.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);
console.log('bounded-hold resolution Wave 12 built');
console.log(`  holds / decisions / local resolutions: ${holds.length} / ${decisionRows.length} / ${localResolutionRows.length}`);
console.log(`  actors / organizations / aliases planned: ${actorAdditions.length} / ${organizationAdditions.length} / ${aliasAdditions.length}`);
console.log('  cross-case bridges, participation, claims, graph, and hop effects: 0');
