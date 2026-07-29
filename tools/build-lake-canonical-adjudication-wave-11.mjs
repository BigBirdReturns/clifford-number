#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-canonical-adjudication-wave-11-policy.json';
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
  return [...new Set((values ?? []).filter(value => value !== null && value !== undefined && String(value).length > 0).map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function normalizeTerm(value) {
  return String(value ?? '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, ' and ')
    .replace(/[’']/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function slug(value) {
  return normalizeTerm(value).replace(/\s+/g, '-');
}

function labelTerms(label) {
  const raw = String(label ?? '');
  const terms = new Set([normalizeTerm(raw)]);
  for (const part of raw.split('/')) terms.add(normalizeTerm(part));
  for (const match of raw.matchAll(/\(([^)]+)\)/g)) terms.add(normalizeTerm(match[1]));
  return [...terms].filter(Boolean);
}

function sortById(rows) {
  return [...rows].sort((left, right) => String(left.id ?? left.alias ?? '').localeCompare(String(right.id ?? right.alias ?? '')));
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-canonical-adjudication-wave-11-policy@1');
const implementationPaths = [
  'tools/build-lake-canonical-adjudication-wave-11.mjs',
  'tools/build-lake-canonical-identity-extension-wave-11.mjs',
  'tools/reconcile-lake-canonical-adjudication-wave-11.mjs',
  'tools/validate-lake-canonical-adjudication-wave-11.mjs',
  'test/lake-canonical-adjudication-wave-11.test.js'
];
for (const relative of [...policy.input_paths, ...implementationPaths]) {
  if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 11 input: ${relative}`);
}

const candidates = readJsonl('data/project/lake-canonical-acquisition-registry-wave-10.jsonl');
const routingRows = readJsonl('data/project/lake-subject-ontology-routing-registry-wave-10.jsonl');
const wave10Receipt = readJson('data/project/lake-subject-ontology-routing-wave-10.json');
const actorsDoc = readJson('data/canonical/actors.json');
const organizationsDoc = readJson('data/canonical/organizations.json');
const aliasesDoc = readJson('data/canonical/aliases.json');
const participation = readJsonl('data/ledger/participation.jsonl');
const active = readJson('build/axm-identity.json');
const hopGraph = readJson('build/hop-graph.json');

assert.equal(candidates.length, policy.expected.candidate_rows, 'Wave 11 candidate denominator drift');
assert.equal(wave10Receipt.counts.canonical_acquisition_rows, candidates.length, 'Wave 10 receipt/candidate denominator mismatch');
assert.equal(actorsDoc.actors.length, policy.expected.baseline_actor_rows, 'Wave 11 actor baseline drift');
assert.equal(organizationsDoc.organizations.length, policy.expected.baseline_organization_rows, 'Wave 11 organization baseline drift');
assert.equal(aliasesDoc.aliases.length, policy.expected.baseline_alias_rows, 'Wave 11 alias baseline drift');
assert.equal(active.entities.length, policy.expected.baseline_active_entities, 'Wave 11 active entity baseline drift');
assert.equal(active.claims.length, policy.expected.baseline_active_claims, 'Wave 11 active claim baseline drift');

const routingById = new Map(routingRows.map(row => [row.routing_id, row]));
const actorById = new Map(actorsDoc.actors.map(row => [row.id, row]));
const organizationById = new Map(organizationsDoc.organizations.map(row => [row.id, row]));
const aliasRows = aliasesDoc.aliases;

const termIndex = new Map();
function indexTerm(term, target) {
  if (!term) return;
  if (!termIndex.has(term)) termIndex.set(term, []);
  termIndex.get(term).push(target);
}
for (const actor of actorsDoc.actors) {
  for (const term of [normalizeTerm(actor.id), ...labelTerms(actor.label)]) indexTerm(term, { kind: 'actor', canonical_id: actor.id, label: actor.label, origin: 'canonical_actor' });
}
for (const organization of organizationsDoc.organizations) {
  for (const term of [normalizeTerm(organization.id), ...labelTerms(organization.label)]) indexTerm(term, { kind: 'organization', canonical_id: organization.id, label: organization.label, origin: 'canonical_organization' });
}
for (const alias of aliasRows) {
  indexTerm(normalizeTerm(alias.alias), { kind: alias.kind, canonical_id: alias.canonical_id, label: alias.alias, origin: 'declared_alias' });
}
for (const [term, rows] of termIndex) {
  const seen = new Set();
  termIndex.set(term, rows.filter(row => {
    const key = `${row.kind}:${row.canonical_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).sort((left, right) => `${left.kind}:${left.canonical_id}`.localeCompare(`${right.kind}:${right.canonical_id}`)));
}

function correctedKind(candidate) {
  return policy.kind_overrides[candidate.identity_value] ?? candidate.candidate_kind;
}

function proposedCanonicalId(candidate, kind) {
  if (policy.canonical_id_overrides[candidate.identity_value]) return policy.canonical_id_overrides[candidate.identity_value];
  const stripped = candidate.identity_value.replace(kind === 'actor' ? /^p-/ : /^org-/, '');
  return slug(stripped);
}

function proposedLabel(candidate) {
  return policy.label_overrides[candidate.identity_value] ?? candidate.suggested_label;
}

function existingMatches(kind, id, label) {
  const exactId = [];
  if (actorById.has(id)) exactId.push({ kind: 'actor', canonical_id: id, label: actorById.get(id).label, origin: 'canonical_id' });
  if (organizationById.has(id)) exactId.push({ kind: 'organization', canonical_id: id, label: organizationById.get(id).label, origin: 'canonical_id' });
  const terms = uniqueSorted([normalizeTerm(id), normalizeTerm(label)]);
  const lexical = [];
  for (const term of terms) lexical.push(...(termIndex.get(term) ?? []));
  const unique = [];
  const seen = new Set();
  for (const row of [...exactId, ...lexical]) {
    const key = `${row.kind}:${row.canonical_id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(row);
  }
  return {
    all: unique,
    same_kind: unique.filter(row => row.kind === kind),
    opposite_kind: unique.filter(row => row.kind !== kind)
  };
}

const candidateDrafts = candidates.map(candidate => {
  const kind = correctedKind(candidate);
  const id = ['actor', 'organization'].includes(kind) ? proposedCanonicalId(candidate, kind) : null;
  const label = proposedLabel(candidate);
  return { candidate, routing: routingById.get(candidate.source_routing_id) ?? null, kind, proposed_id: id, proposed_label: label };
});

const clusterByKey = new Map();
for (const draft of candidateDrafts.filter(row => ['actor', 'organization'].includes(row.kind))) {
  const key = `${draft.kind}:${draft.proposed_id}`;
  if (!clusterByKey.has(key)) clusterByKey.set(key, []);
  clusterByKey.get(key).push(draft.candidate.acquisition_id);
}

const actorDisqualifying = new Set(policy.actor_disqualifying_tokens);
const orgDisqualifying = policy.organization_disqualifying_tokens;
const lowAllowed = new Set(policy.materialize_low_confidence);
const broadOverrides = new Set(policy.broad_institution_overrides);

function tokenSet(value) {
  return new Set(String(value).toLowerCase().split('-').filter(Boolean));
}

function actorShapeOk(id) {
  const tokens = id.split('-').filter(Boolean);
  if (tokens.length < 2 || tokens.length > 5) return false;
  if (!tokens.every(token => /^[a-z]+$/.test(token))) return false;
  return !tokens.some(token => actorDisqualifying.has(token));
}

function organizationShapeOk(id) {
  if (!id || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)) return false;
  return !orgDisqualifying.some(fragment => id.includes(fragment));
}

function newRecordGate(draft) {
  const { candidate, kind, proposed_id: id } = draft;
  if (!candidate.source_custody_present) return { allowed: false, reason: 'source_custody_absent' };
  if (!candidate.publicly_inspectable_custody_present) return { allowed: false, reason: 'publicly_inspectable_custody_absent' };
  const confidenceAllowed = candidate.typing_confidence === 'high'
    || candidate.typing_confidence === 'medium'
    || lowAllowed.has(candidate.identity_value)
    || Boolean(policy.kind_overrides[candidate.identity_value]);
  if (!confidenceAllowed) return { allowed: false, reason: 'low_confidence_without_explicit_policy_allowance' };
  if (kind === 'actor' && !actorShapeOk(id)) return { allowed: false, reason: 'actor_identifier_shape_or_type_conflict' };
  if (kind === 'organization' && !organizationShapeOk(id)) return { allowed: false, reason: 'organization_identifier_shape_or_type_conflict' };
  return { allowed: true, reason: 'source_custodied_public_unique_typed_candidate' };
}

const decisions = [];
const newActors = [];
const newOrganizations = [];
const aliasAdditions = [];
const reroutes = [];

for (const draft of candidateDrafts) {
  const { candidate, routing, kind, proposed_id: proposedId, proposed_label: proposedLabel } = draft;
  const adjudicationId = stableId('CANONDEC', [candidate.acquisition_id, kind, proposedId ?? '', proposedLabel]);
  const counterevidence = [];
  const uncertainty = [];
  let status;
  let reason;
  let mutationType = 'none';
  let canonicalTargetId = null;
  let materializationAuthorized = false;
  let matches = { all: [], same_kind: [], opposite_kind: [] };
  let cluster = [];

  if (kind === 'nonidentity') {
    status = 'reroute_nonidentity';
    reason = 'subject_type_corrected_outside_actor_organization_identity';
    reroutes.push({
      schema_version: 'canonical-adjudication-reroute@1',
      reroute_id: stableId('CANREROUTE', [candidate.acquisition_id, policy.nonidentity_routes[candidate.identity_value]]),
      acquisition_id: candidate.acquisition_id,
      identity_value: candidate.identity_value,
      destination_registry: policy.nonidentity_routes[candidate.identity_value],
      reason,
      receipt_ids: candidate.receipt_ids,
      source_custody_present: candidate.source_custody_present,
      canonical_mutation_applied: false,
      graph_effect: 'none'
    });
  } else {
    matches = existingMatches(kind, proposedId, proposedLabel);
    cluster = clusterByKey.get(`${kind}:${proposedId}`) ?? [];
    const explicitHold = policy.hold_overrides[candidate.identity_value];
    if (explicitHold) {
      status = 'bounded_hold';
      reason = explicitHold;
    } else if (matches.opposite_kind.length) {
      status = 'kind_conflict_with_existing_canonical';
      reason = 'proposed_identifier_or_label_resolves_to_opposite_canonical_kind';
      counterevidence.push(...matches.opposite_kind.map(row => `${row.kind}:${row.canonical_id}`));
    } else if (matches.same_kind.length > 1) {
      status = 'ambiguous_existing_canonical_collision';
      reason = 'proposed_identifier_or_label_resolves_to_multiple_same_kind_canonical_records';
      counterevidence.push(...matches.same_kind.map(row => `${row.kind}:${row.canonical_id}`));
    } else if (matches.same_kind.length === 1) {
      const target = matches.same_kind[0];
      canonicalTargetId = target.canonical_id;
      const existingAliasTerms = new Set(aliasRows.filter(row => row.kind === kind && row.canonical_id === target.canonical_id).map(row => normalizeTerm(row.alias)));
      const targetLabel = kind === 'actor' ? actorById.get(target.canonical_id)?.label : organizationById.get(target.canonical_id)?.label;
      if (normalizeTerm(proposedLabel) === normalizeTerm(targetLabel) || existingAliasTerms.has(normalizeTerm(proposedLabel))) {
        status = 'duplicate_existing_canonical';
        reason = 'candidate_already_covered_by_existing_canonical_id_label_or_alias';
      } else {
        status = 'materialize_alias_to_existing';
        reason = 'unique_same_kind_existing_canonical_match_with_new_nonconflicting_alias';
        mutationType = 'alias_addition';
        materializationAuthorized = true;
        aliasAdditions.push({
          alias: proposedLabel,
          canonical_id: target.canonical_id,
          kind,
          source: 'lake-canonical-adjudication-wave-11',
          source_acquisition_id: candidate.acquisition_id,
          receipt_ids: candidate.receipt_ids,
          graph_effect: 'none'
        });
      }
    } else if (cluster.length > 1) {
      status = 'candidate_cluster_conflict';
      reason = 'multiple_wave10_candidates_propose_the_same_global_canonical_identifier_without_an_explicit_same_entity_assertion';
      counterevidence.push(...cluster.filter(id => id !== candidate.acquisition_id));
    } else {
      const gate = newRecordGate(draft);
      if (!gate.allowed) {
        status = 'bounded_hold';
        reason = gate.reason;
      } else {
        status = kind === candidate.candidate_kind ? 'materialize_new_canonical_record' : 'materialize_type_corrected_canonical_record';
        reason = gate.reason;
        mutationType = kind === 'actor' ? 'new_actor' : 'new_organization';
        canonicalTargetId = proposedId;
        materializationAuthorized = true;
        const provenance = {
          source: 'lake-canonical-adjudication-wave-11',
          source_case_id: candidate.case_id,
          source_acquisition_id: candidate.acquisition_id,
          source_routing_id: candidate.source_routing_id,
          receipt_ids: candidate.receipt_ids,
          canonical_status: 'bounded_provisional_canonical_record',
          graph_effect: 'none'
        };
        if (kind === 'actor') {
          newActors.push({ id: proposedId, label: proposedLabel, kind: 'person', ...provenance });
        } else {
          newOrganizations.push({
            id: proposedId,
            label: proposedLabel,
            kind: policy.organization_kind_overrides[candidate.identity_value] ?? 'organization',
            ...(broadOverrides.has(candidate.identity_value) ? { broad_institution: true } : {}),
            ...provenance
          });
        }
        for (const alias of policy.alias_additions[candidate.identity_value] ?? []) {
          aliasAdditions.push({
            alias,
            canonical_id: proposedId,
            kind,
            source: 'lake-canonical-adjudication-wave-11',
            source_acquisition_id: candidate.acquisition_id,
            receipt_ids: candidate.receipt_ids,
            graph_effect: 'none'
          });
        }
      }
    }
  }

  if (candidate.typing_confidence === 'low') uncertainty.push('wave10_semantic_typing_confidence_low');
  if (!candidate.publicly_inspectable_custody_present) uncertainty.push('source_not_publicly_inspectable');
  if (candidate.claim_statuses?.includes('review_required')) uncertainty.push('one_or_more_supporting_case_claims_remain_review_required');
  if (kind !== candidate.candidate_kind) uncertainty.push(`wave10_kind_corrected_from_${candidate.candidate_kind}_to_${kind}`);
  if (!materializationAuthorized) counterevidence.push(reason);

  decisions.push({
    schema_version: 'canonical-acquisition-adjudication-decision@1',
    adjudication_id: adjudicationId,
    acquisition_id: candidate.acquisition_id,
    source_routing_id: candidate.source_routing_id,
    source_mention_id: candidate.source_mention_id,
    case_id: candidate.case_id,
    identity_value: candidate.identity_value,
    wave10_candidate_kind: candidate.candidate_kind,
    adjudicated_kind: kind,
    proposed_canonical_id: proposedId,
    proposed_label: proposedLabel,
    typing_confidence: candidate.typing_confidence,
    typing_rule_id: candidate.typing_rule_id,
    source_custody_present: candidate.source_custody_present,
    publicly_inspectable_custody_present: candidate.publicly_inspectable_custody_present,
    receipt_ids: candidate.receipt_ids,
    occurrence_count: candidate.occurrence_count,
    claim_statuses: candidate.claim_statuses,
    evidence_classes: candidate.evidence_classes,
    existing_canonical_matches: matches.all,
    candidate_cluster_acquisition_ids: cluster,
    adjudication_status: status,
    decision_reason: reason,
    mutation_type: mutationType,
    canonical_target_id: canonicalTargetId,
    materialization_authorized: materializationAuthorized,
    counterevidence: uniqueSorted(counterevidence),
    uncertainty: uniqueSorted(uncertainty),
    review_dependency: {
      required_to_decide: false,
      effect: 'new_custodied_evidence_may_supersede_this_bounded_decision_but_missing_review_does_not_block_the_current_reversible_action'
    },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'append_a_superseding_adjudication_and_update_or_retire_the_canonical_record_without_deleting_this_decision'
    },
    canonical_record_proves_case_claims: false,
    accepted_identity_bridge: false,
    participation_created: false,
    relationship_created: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  });
}

decisions.sort((left, right) => left.adjudication_id.localeCompare(right.adjudication_id));
reroutes.sort((left, right) => left.reroute_id.localeCompare(right.reroute_id));
const dedupeBy = (rows, keyOf, label) => {
  const map = new Map();
  for (const row of rows) {
    const key = keyOf(row);
    if (map.has(key)) throw new Error(`duplicate Wave 11 ${label}: ${key}`);
    map.set(key, row);
  }
  return [...map.values()];
};
const actorAdditions = sortById(dedupeBy(newActors, row => row.id, 'actor ID'));
const organizationAdditions = sortById(dedupeBy(newOrganizations, row => row.id, 'organization ID'));
const aliasMutationRows = dedupeBy(aliasAdditions, row => `${row.kind}:${normalizeTerm(row.alias)}`, 'alias term')
  .sort((left, right) => `${left.kind}:${left.alias}`.localeCompare(`${right.kind}:${right.alias}`));

for (const row of actorAdditions) {
  assert.ok(!actorById.has(row.id) && !organizationById.has(row.id), `${row.id}: Wave 11 new actor collides with existing canonical ID`);
}
for (const row of organizationAdditions) {
  assert.ok(!actorById.has(row.id) && !organizationById.has(row.id), `${row.id}: Wave 11 new organization collides with existing canonical ID`);
}
const allFinalIds = new Set([...actorById.keys(), ...organizationById.keys()]);
for (const row of [...actorAdditions, ...organizationAdditions]) {
  assert.ok(!allFinalIds.has(row.id), `${row.id}: duplicate Wave 11 final ID`);
  allFinalIds.add(row.id);
}

const statusCounts = {};
const mutationCounts = {};
for (const row of decisions) {
  statusCounts[row.adjudication_status] = (statusCounts[row.adjudication_status] ?? 0) + 1;
  mutationCounts[row.mutation_type] = (mutationCounts[row.mutation_type] ?? 0) + 1;
}
const sortObject = object => Object.fromEntries(Object.entries(object).sort(([left], [right]) => left.localeCompare(right)));

const fingerprintPaths = [...new Set([policyPath, ...policy.input_paths, ...implementationPaths])].sort();
const inputManifest = fingerprintPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputManifest.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

const mutationPlan = {
  schema_version: 'lake-canonical-mutation-plan-wave-11@1',
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
    hop_edge_digest_sha256: stableDigest(hopGraph.edges),
    hop_rejected_surface_digest_sha256: stableDigest(hopGraph.rejected_hop_surfaces),
    hop_rejected_pair_digest_sha256: stableDigest(hopGraph.rejected_hop_pairs),
    participation_digest_sha256: stableDigest(participation),
    active_claim_digest_sha256: stableDigest(active.claims)
  },
  decision_counts: {
    candidates: decisions.length,
    by_status: sortObject(statusCounts),
    by_mutation_type: sortObject(mutationCounts),
    materialization_authorized: decisions.filter(row => row.materialization_authorized).length,
    held_or_rerouted: decisions.filter(row => !row.materialization_authorized).length
  },
  mutations: {
    actor_additions: actorAdditions,
    organization_additions: organizationAdditions,
    alias_additions: aliasMutationRows,
    nonidentity_reroutes: reroutes,
    participation_additions: []
  },
  expected_after: {
    actor_rows: actorsDoc.actors.length + actorAdditions.length,
    organization_rows: organizationsDoc.organizations.length + organizationAdditions.length,
    alias_rows: aliasesDoc.aliases.length + aliasMutationRows.length,
    participation_rows: participation.length,
    active_entities: active.entities.length + actorAdditions.length + organizationAdditions.length,
    active_claims: active.claims.length,
    accepted_identity_bridges: 0,
    graph_edge_delta: 0,
    claim_delta: 0
  },
  boundaries: policy.boundaries
};

const projection = {
  schema_version: 'canonical-adjudication-index-wave-11@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  source_paths: {
    decisions: policy.decision_registry_path,
    mutation_plan: policy.mutation_plan_path
  },
  counts: mutationPlan.decision_counts,
  decisions,
  mutations: mutationPlan.mutations,
  accepted_identity_bridges: 0,
  participation_additions: 0,
  graph_effect: 'none'
};

const plan = {
  schema_version: 'lake-canonical-adjudication-wave-11-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputManifest,
  before: mutationPlan.before,
  decision_counts: mutationPlan.decision_counts,
  expected_after: mutationPlan.expected_after,
  completion: {
    candidate_denominator_adjudicated: decisions.length === candidates.length,
    every_decision_has_counterevidence_or_materialization_basis: decisions.every(row => row.materialization_authorized || row.counterevidence.length > 0),
    reversible_materialization_plan_present: actorAdditions.length + organizationAdditions.length + aliasMutationRows.length >= policy.expected.minimum_materialized_new_records,
    canonical_mutations_applied: false,
    identity_extension_registry_built: false,
    accepted_identity_bridges: 0,
    participation_rows_added: 0,
    graph_effects_created: 0,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};

writeJsonl(policy.decision_registry_path, decisions);
writeJson(policy.mutation_plan_path, mutationPlan);
writeJson(policy.projection_path, projection);
writeJson(policy.plan_path, plan);

const report = `# Canonical acquisition adjudication Wave 11\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Decision denominator\n\n\`\`\`text\ncandidates adjudicated:              ${decisions.length}\nnew actor records planned:           ${actorAdditions.length}\nnew organization records planned:    ${organizationAdditions.length}\nalias additions planned:             ${aliasMutationRows.length}\nnonidentity reroutes:                 ${reroutes.length}\nmaterialization-authorized decisions:${decisions.filter(row => row.materialization_authorized).length}\nheld or rerouted decisions:          ${decisions.filter(row => !row.materialization_authorized).length}\naccepted identity bridges:           0\nparticipation rows added:            0\ngraph effects:                       0\nhuman-permission dependencies:       0\n\`\`\`\n\n## Status counts\n\n${Object.entries(sortObject(statusCounts)).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n\n## Judgment\n\nThe existing evidence supports a reversible canonical-registry expansion for the unambiguous, source-custodied, publicly inspectable subset. Ambiguous acronyms, contextual local identifiers, candidate clusters, private-only identities, and nonidentity subjects remain explicit bounded refusals or typed reroutes. No canonical addition creates participation, relationship, graph, hop, or cross-case identity authority.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('canonical acquisition adjudication Wave 11 built');
console.log(`  decisions: ${decisions.length}`);
console.log(`  new actors / organizations / aliases: ${actorAdditions.length} / ${organizationAdditions.length} / ${aliasMutationRows.length}`);
console.log(`  held or rerouted: ${decisions.filter(row => !row.materialization_authorized).length}`);
console.log('  participation, relationship, graph, and hop effects: 0');
