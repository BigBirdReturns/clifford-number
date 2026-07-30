import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { readJsonl, root } from './ledger.mjs';

export const SUBJECT_OBJECT_RESOLUTION_SCHEMA_VERSION = 'subject-object-resolution@1';
export const SUBJECT_OBJECT_RESOLUTION_STATUS = 'accepted_graph_inert_subject_object';

let cachedIndex = null;

function registryPaths() {
  const directory = path.join(root, 'data/project');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter(name => /^lake-subject-object-registry-wave-\d+\.jsonl$/.test(name))
    .sort((left, right) => left.localeCompare(right))
    .map(name => `data/project/${name}`);
}

function key(caseId, localSubjectId) {
  return `${caseId}\0${localSubjectId}`;
}

function validateRow(row, sourcePath) {
  const prefix = `${sourcePath}:${row.subject_object_id ?? 'missing-subject-object-id'}`;
  assert.equal(row.schema_version, SUBJECT_OBJECT_RESOLUTION_SCHEMA_VERSION, `${prefix}: schema drift`);
  assert.match(row.subject_object_id ?? '', /^SUBJECTOBJECT-[a-f0-9]{24}$/, `${prefix}: malformed subject-object ID`);
  assert.ok(row.source_case_id && row.local_subject_id && row.object_kind, `${prefix}: required semantics missing`);
  assert.ok(row.source_decision_id && row.source_unresolved_subject_id, `${prefix}: source adjudication provenance missing`);
  assert.ok(row.source_claim_ids?.length > 0, `${prefix}: source claim custody missing`);
  assert.ok(row.receipt_ids?.length > 0, `${prefix}: receipt custody missing`);
  assert.equal(row.status, SUBJECT_OBJECT_RESOLUTION_STATUS, `${prefix}: status drift`);
  assert.equal(row.actor_or_organization_join_authorized, false, `${prefix}: actor/organization join opened`);
  assert.equal(row.identity_resolution_created, false, `${prefix}: identity resolution overclaim`);
  assert.equal(row.relationship_created, false, `${prefix}: relationship effect drift`);
  assert.equal(row.participation_created, false, `${prefix}: participation effect drift`);
  assert.equal(row.automatic_cross_case_join_authorized, false, `${prefix}: automatic cross-case join opened`);
  assert.equal(row.cross_case_graph_join_authorized, false, `${prefix}: graph join opened`);
  assert.equal(row.cross_case_hop_creation_authorized, false, `${prefix}: hop creation opened`);
  assert.equal(row.review_dependency?.required_to_decide, false, `${prefix}: reviewer permission dependency`);
  assert.equal(row.reversibility?.mode, 'append_preserving_supersession', `${prefix}: reversibility drift`);
  assert.equal(row.graph_effect, 'none', `${prefix}: graph effect drift`);
}

export function loadSubjectObjectResolutionIndex({ refresh = false } = {}) {
  if (cachedIndex && !refresh) return cachedIndex;
  const paths = registryPaths();
  const byCaseAndLocal = new Map();
  const byId = new Map();
  const entries = [];
  for (const sourcePath of paths) {
    for (const row of readJsonl(sourcePath)) {
      validateRow(row, sourcePath);
      const localKey = key(row.source_case_id, row.local_subject_id);
      assert.ok(!byCaseAndLocal.has(localKey), `${sourcePath}:${row.subject_object_id}: duplicate case-local subject-object resolution`);
      assert.ok(!byId.has(row.subject_object_id), `${sourcePath}:${row.subject_object_id}: duplicate subject-object ID`);
      const entry = { row, source_path: sourcePath };
      byCaseAndLocal.set(localKey, entry);
      byId.set(row.subject_object_id, entry);
      entries.push(entry);
    }
  }
  cachedIndex = {
    schema_version: 'subject-object-resolution-index@1',
    registry_paths: paths,
    entries: entries.sort((left, right) => left.row.subject_object_id.localeCompare(right.row.subject_object_id)),
    by_case_and_local: byCaseAndLocal,
    by_id: byId,
    boundaries: {
      subject_object_is_actor_or_organization: false,
      subject_object_creates_relationship: false,
      subject_object_creates_participation: false,
      automatic_cross_case_join_authorized: false,
      graph_effect: 'none'
    }
  };
  return cachedIndex;
}

export function resolveSubjectObject(caseId, localSubjectId, index = loadSubjectObjectResolutionIndex()) {
  const entry = index.by_case_and_local.get(key(caseId, localSubjectId));
  if (!entry) return null;
  const row = entry.row;
  return {
    schema_version: 'compiled-subject-object@1',
    subject_object_id: row.subject_object_id,
    case_id: row.source_case_id,
    local_subject_id: row.local_subject_id,
    object_kind: row.object_kind,
    source_decision_id: row.source_decision_id,
    source_unresolved_subject_id: row.source_unresolved_subject_id,
    source_claim_ids: [...row.source_claim_ids],
    supporting_claim_ids: [...(row.supporting_claim_ids ?? [])],
    receipt_ids: [...row.receipt_ids],
    resolution_status: 'resolved_to_typed_subject_object',
    actor_or_organization_join_authorized: false,
    identity_resolution_created: false,
    relationship_created: false,
    participation_created: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    review_dependency: { required_to_decide: false },
    graph_effect: 'none'
  };
}

export function summarizeSubjectObjects(claims, { caseId, registryPaths: paths = [] } = {}) {
  const references = claims.filter(claim => claim.subject_object);
  const objects = new Map();
  for (const claim of references) {
    const item = claim.subject_object;
    const existing = objects.get(item.subject_object_id) ?? {
      subject_object_id: item.subject_object_id,
      case_id: caseId ?? item.case_id,
      local_subject_id: item.local_subject_id,
      object_kind: item.object_kind,
      source_decision_id: item.source_decision_id,
      source_unresolved_subject_id: item.source_unresolved_subject_id,
      claim_ids: [],
      receipt_ids: [],
      actor_or_organization_join_authorized: false,
      relationship_created: false,
      participation_created: false,
      graph_effect: 'none'
    };
    existing.claim_ids = [...new Set([...existing.claim_ids, claim.claim_id])].sort();
    existing.receipt_ids = [...new Set([...existing.receipt_ids, ...(item.receipt_ids ?? [])])].sort();
    objects.set(item.subject_object_id, existing);
  }
  const rows = [...objects.values()].sort((left, right) => left.subject_object_id.localeCompare(right.subject_object_id));
  const objectKindCounts = Object.fromEntries([...new Set(rows.map(row => row.object_kind))]
    .sort()
    .map(objectKind => [objectKind, rows.filter(row => row.object_kind === objectKind).length]));
  return {
    schema_version: 'compiled-subject-object-projection@1',
    case_id: caseId ?? null,
    registry_paths: [...paths],
    counts: {
      subject_references: claims.length,
      typed_subject_object_references: references.length,
      distinct_subject_objects: rows.length,
      generic_unresolved_references: claims.filter(claim => claim.subject_identity?.resolution_status !== 'resolved_local_to_canonical' && !claim.subject_object).length
    },
    object_kind_counts: objectKindCounts,
    subject_objects: rows,
    graph_effect: 'none'
  };
}
