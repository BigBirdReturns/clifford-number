#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { readJson, writeJson } from './lib/ledger.mjs';
import {
  loadSubjectObjectResolutionIndex,
  resolveSubjectObject,
  summarizeSubjectObjects
} from './lib/subject-object-resolution.mjs';

const target = process.argv.find(argument => argument.startsWith('--target='))?.split('=')[1] ?? 'all';
assert.ok(['cases', 'catalog', 'all'].includes(target), `unknown Wave 16 projection target: ${target}`);

function uniqueSorted(values) {
  return [...new Set((values ?? [])
    .filter(value => value !== null && value !== undefined && String(value).length > 0)
    .map(String))]
    .sort((left, right) => left.localeCompare(right));
}

const index = loadSubjectObjectResolutionIndex({ refresh: true });
assert.ok(index.entries.length > 0, 'Wave 16 subject-object registry is empty');

function projectClaim(caseId, claim) {
  const subjectObject = resolveSubjectObject(caseId, claim.subject_id, index);
  if (subjectObject) {
    assert.notEqual(claim.subject_identity?.resolution_status, 'resolved_local_to_canonical', `${caseId}/${claim.claim_id}: one subject cannot be both canonical identity and nonidentity object`);
    return { ...claim, subject_object: subjectObject };
  }
  const next = { ...claim };
  delete next.subject_object;
  return next;
}

function projectCaseClaims(caseId, caseItem) {
  const byClaimId = new Map();
  caseItem.claims = (caseItem.claims ?? []).map(claim => {
    const projected = projectClaim(caseId, claim);
    byClaimId.set(projected.claim_id, projected);
    return projected;
  });
  const projectEvent = event => ({
    ...event,
    claims: (event.claims ?? []).map(claim => byClaimId.get(claim.claim_id) ?? projectClaim(caseId, claim))
  });
  caseItem.events = (caseItem.events ?? []).map(projectEvent);
  caseItem.sections = (caseItem.sections ?? []).map(section => ({
    ...section,
    records: (section.records ?? []).map(projectEvent)
  }));
  return caseItem;
}

function projectCases() {
  const caseIndex = readJson('build/cases/index.json');
  const allClaims = [];
  const caseProjectionRows = [];
  for (const entry of caseIndex.cases ?? []) {
    const caseItem = projectCaseClaims(entry.case_id, readJson(entry.href));
    const projection = summarizeSubjectObjects(caseItem.claims, {
      caseId: entry.case_id,
      registryPaths: index.registry_paths
    });
    caseItem.subject_object_projection = projection;
    caseItem.counts = {
      ...caseItem.counts,
      typed_subject_object_references: projection.counts.typed_subject_object_references,
      distinct_subject_objects: projection.counts.distinct_subject_objects,
      generic_unresolved_subject_references: projection.counts.generic_unresolved_references
    };
    writeJson(entry.href, caseItem);
    entry.counts = {
      ...entry.counts,
      typed_subject_object_references: projection.counts.typed_subject_object_references,
      distinct_subject_objects: projection.counts.distinct_subject_objects,
      generic_unresolved_subject_references: projection.counts.generic_unresolved_references
    };
    entry.subject_object_counts = projection.counts;
    allClaims.push(...caseItem.claims.map(claim => ({ ...claim, case_id: entry.case_id })));
    caseProjectionRows.push({
      case_id: entry.case_id,
      counts: projection.counts,
      object_kind_counts: projection.object_kind_counts,
      subject_object_ids: projection.subject_objects.map(row => row.subject_object_id),
      graph_effect: 'none'
    });
  }
  const globalProjection = summarizeSubjectObjects(allClaims, {
    caseId: null,
    registryPaths: index.registry_paths
  });
  caseIndex.subject_object_projection = {
    schema_version: 'compiled-case-subject-object-index@1',
    registry_paths: index.registry_paths,
    counts: globalProjection.counts,
    object_kind_counts: globalProjection.object_kind_counts,
    cases: caseProjectionRows,
    graph_effect: 'none'
  };
  writeJson('build/cases/index.json', caseIndex);
  console.log('Wave 16 subject objects projected into compiled cases');
  console.log(`  typed references / distinct objects / generic unresolved: ${globalProjection.counts.typed_subject_object_references} / ${globalProjection.counts.distinct_subject_objects} / ${globalProjection.counts.generic_unresolved_references}`);
  return globalProjection;
}

function projectCatalog() {
  const catalog = readJson('build/public-catalog.json');
  const objectRows = new Map();
  let typedReferences = 0;
  let genericUnresolved = 0;
  catalog.claims = (catalog.claims ?? []).map(claim => {
    const subjectObject = resolveSubjectObject(claim.case_id, claim.subject_id, index);
    if (subjectObject) {
      assert.notEqual(claim.subject_identity?.resolution_status, 'resolved_local_to_canonical', `${claim.key}: one subject cannot be both canonical identity and nonidentity object`);
      typedReferences += 1;
      const existing = objectRows.get(subjectObject.subject_object_id) ?? {
        subject_object_id: subjectObject.subject_object_id,
        object_kind: subjectObject.object_kind,
        source_decision_id: subjectObject.source_decision_id,
        source_unresolved_subject_id: subjectObject.source_unresolved_subject_id,
        local_subjects: [],
        case_ids: [],
        claim_ids: [],
        receipt_ids: [],
        actor_or_organization_join_authorized: false,
        relationship_created: false,
        participation_created: false,
        graph_effect: 'none'
      };
      const localKey = `${claim.case_id}\0${claim.subject_id}`;
      if (!existing.local_subjects.some(item => `${item.case_id}\0${item.local_subject_id}` === localKey)) {
        existing.local_subjects.push({ case_id: claim.case_id, local_subject_id: claim.subject_id });
      }
      existing.case_ids = uniqueSorted([...existing.case_ids, claim.case_id]);
      existing.claim_ids = uniqueSorted([...existing.claim_ids, claim.key]);
      existing.receipt_ids = uniqueSorted([...existing.receipt_ids, ...(subjectObject.receipt_ids ?? [])]);
      existing.local_subjects.sort((left, right) => `${left.case_id}\0${left.local_subject_id}`.localeCompare(`${right.case_id}\0${right.local_subject_id}`));
      objectRows.set(subjectObject.subject_object_id, existing);
      return {
        ...claim,
        subject_object: subjectObject,
        subject_object_id: subjectObject.subject_object_id,
        subject_object_kind: subjectObject.object_kind,
        subject_object_search_keys: uniqueSorted([claim.subject_id, subjectObject.object_kind])
      };
    }
    if (claim.subject_identity?.resolution_status !== 'resolved_local_to_canonical') genericUnresolved += 1;
    const next = { ...claim };
    delete next.subject_object;
    delete next.subject_object_id;
    delete next.subject_object_kind;
    delete next.subject_object_search_keys;
    return next;
  });

  const claimByKey = new Map(catalog.claims.map(claim => [claim.key, claim]));
  catalog.cases = (catalog.cases ?? []).map(caseEntry => {
    const caseClaims = catalog.claims.filter(claim => claim.case_id === caseEntry.case_id);
    const typed = caseClaims.filter(claim => claim.subject_object_id).length;
    const distinct = new Set(caseClaims.map(claim => claim.subject_object_id).filter(Boolean)).size;
    const generic = caseClaims.filter(claim => claim.subject_identity?.resolution_status !== 'resolved_local_to_canonical' && !claim.subject_object_id).length;
    const featuredKey = caseEntry.featured_claim?.key;
    return {
      ...caseEntry,
      counts: {
        ...caseEntry.counts,
        typed_subject_object_references: typed,
        distinct_subject_objects: distinct,
        generic_unresolved_subject_references: generic
      },
      subject_object_counts: {
        subject_references: caseClaims.length,
        typed_subject_object_references: typed,
        distinct_subject_objects: distinct,
        generic_unresolved_references: generic
      },
      featured_claim: featuredKey && claimByKey.has(featuredKey)
        ? { ...caseEntry.featured_claim, subject_object: claimByKey.get(featuredKey).subject_object ?? null }
        : caseEntry.featured_claim
    };
  });

  const subjectObjects = [...objectRows.values()].sort((left, right) => left.subject_object_id.localeCompare(right.subject_object_id));
  const objectKindCounts = Object.fromEntries([...new Set(subjectObjects.map(row => row.object_kind))]
    .sort()
    .map(objectKind => [objectKind, subjectObjects.filter(row => row.object_kind === objectKind).length]));
  catalog.subject_object_projection = {
    schema_version: 'public-catalog-subject-object@1',
    registry_paths: index.registry_paths,
    scope: 'claim_subject_nonidentity_only',
    counts: {
      subject_references: catalog.claims.length,
      typed_subject_object_references: typedReferences,
      distinct_subject_objects: subjectObjects.length,
      generic_unresolved_subject_references: genericUnresolved
    },
    object_kind_counts: objectKindCounts,
    graph_effect: 'none'
  };
  catalog.counts = {
    ...catalog.counts,
    typed_subject_object_references: typedReferences,
    distinct_subject_objects: subjectObjects.length,
    generic_unresolved_subject_references: genericUnresolved
  };
  catalog.subject_objects = subjectObjects;
  writeJson('build/public-catalog.json', catalog);
  console.log('Wave 16 subject objects projected into public catalog');
  console.log(`  typed references / distinct objects / generic unresolved: ${typedReferences} / ${subjectObjects.length} / ${genericUnresolved}`);
  return catalog.subject_object_projection;
}

if (target === 'cases' || target === 'all') projectCases();
if (target === 'catalog' || target === 'all') {
  assert.ok(fs.existsSync('build/public-catalog.json'), 'public catalog missing for Wave 16 projection');
  projectCatalog();
}
