import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root } from './ledger.mjs';

export const SUBJECT_IDENTITY_SCHEMA_VERSION = 'subject-identity-projection@1';
export const SUBJECT_IDENTITY_SUMMARY_SCHEMA_VERSION = 'subject-identity-summary@1';
export const ACCEPTED_LOCAL_RESOLUTION_STATUS = 'accepted_graph_inert_local_resolution';
export const RESOLVED_SUBJECT_STATUS = 'resolved_local_to_canonical';
export const EXPLICIT_SUBJECT_RESOLUTION_BASIS = 'explicit_case_scoped_resolution';
export const EXACT_CANONICAL_SUBJECT_RESOLUTION_BASIS = 'exact_subject_id_equals_canonical_id';

let cachedIndex = null;

function uniqueSorted(values) {
  return [...new Set((values ?? [])
    .filter(value => value !== null && value !== undefined && String(value).length > 0)
    .map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function waveNumber(sourcePath) {
  const match = String(sourcePath).match(/wave-(\d+)\.jsonl$/);
  return match ? Number(match[1]) : 0;
}

function discoverResolutionRegistryPaths() {
  const directory = path.join(root, 'data/project');
  if (!fs.existsSync(directory)) return [];
  return fs.readdirSync(directory)
    .filter(name => /^lake-local-canonical-resolution-registry-wave-\d+\.jsonl$/.test(name))
    .sort((left, right) => {
      const waveDelta = waveNumber(left) - waveNumber(right);
      return waveDelta || left.localeCompare(right);
    })
    .map(name => `data/project/${name}`);
}

function assertResolutionContract(row, sourcePath) {
  const label = `${sourcePath}:${row.resolution_id ?? '<missing-resolution-id>'}`;
  if (row.schema_version !== 'local-canonical-resolution@1') throw new Error(`${label}: unsupported schema_version`);
  if (row.status !== ACCEPTED_LOCAL_RESOLUTION_STATUS) throw new Error(`${label}: resolution is not accepted`);
  if (!row.source_case_id || !row.local_subject_id || !row.canonical_id || !row.canonical_kind) throw new Error(`${label}: resolution endpoint missing`);
  if (!['actor', 'organization'].includes(row.canonical_kind)) throw new Error(`${label}: unsupported canonical kind ${row.canonical_kind}`);
  if (row.explicit_same_entity_assertion !== true) throw new Error(`${label}: explicit same-entity assertion missing`);
  if (row.entities_merged !== false) throw new Error(`${label}: source records may not be merged`);
  if (row.relationship_created !== false) throw new Error(`${label}: relationship creation is forbidden`);
  if (row.participation_created !== false) throw new Error(`${label}: participation creation is forbidden`);
  if (row.accepted_cross_case_identity_bridge !== false) throw new Error(`${label}: cross-case identity bridge is forbidden`);
  if (row.automatic_cross_case_join_authorized !== false) throw new Error(`${label}: automatic cross-case join is forbidden`);
  if (row.cross_case_graph_join_authorized !== false) throw new Error(`${label}: cross-case graph join is forbidden`);
  if (row.cross_case_hop_creation_authorized !== false) throw new Error(`${label}: cross-case hop creation is forbidden`);
  if (row.review_dependency?.required_to_decide !== false) throw new Error(`${label}: human permission dependency is forbidden`);
  if (row.reversibility?.mode !== 'append_preserving_supersession') throw new Error(`${label}: append-preserving correction route missing`);
  if (row.graph_effect !== 'none') throw new Error(`${label}: graph effect must remain none`);
}

function canonicalRegistry() {
  const actors = readJson('data/canonical/actors.json').actors ?? [];
  const organizations = readJson('data/canonical/organizations.json').organizations ?? [];
  const aliases = readJson('data/canonical/aliases.json').aliases ?? [];
  const canonicalById = new Map();
  for (const actor of actors) {
    if (canonicalById.has(actor.id)) throw new Error(`canonical ID collision: ${actor.id}`);
    canonicalById.set(actor.id, { id: actor.id, kind: 'actor', label: actor.label, record: actor });
  }
  for (const organization of organizations) {
    if (canonicalById.has(organization.id)) throw new Error(`canonical ID collision: ${organization.id}`);
    canonicalById.set(organization.id, { id: organization.id, kind: 'organization', label: organization.label, record: organization });
  }
  const aliasesByCanonical = new Map();
  for (const alias of aliases) {
    if (!aliasesByCanonical.has(alias.canonical_id)) aliasesByCanonical.set(alias.canonical_id, []);
    aliasesByCanonical.get(alias.canonical_id).push(alias.alias);
  }
  for (const [canonicalId, values] of aliasesByCanonical) aliasesByCanonical.set(canonicalId, uniqueSorted(values));
  return { canonicalById, aliasesByCanonical };
}

export function loadLocalCanonicalResolutionIndex({ refresh = false } = {}) {
  if (cachedIndex && !refresh) return cachedIndex;
  const registryPaths = discoverResolutionRegistryPaths();
  const { canonicalById, aliasesByCanonical } = canonicalRegistry();
  const entries = registryPaths.flatMap(sourcePath => readJsonl(sourcePath).map(row => ({
    row,
    source_path: sourcePath,
    wave: waveNumber(sourcePath)
  })));
  entries.sort((left, right) => left.wave - right.wave
    || left.source_path.localeCompare(right.source_path)
    || String(left.row.resolution_id).localeCompare(String(right.row.resolution_id)));

  const currentByCaseAndLocal = new Map();
  const historyByCaseAndLocal = new Map();
  for (const entry of entries) {
    assertResolutionContract(entry.row, entry.source_path);
    const canonical = canonicalById.get(entry.row.canonical_id);
    if (!canonical) throw new Error(`${entry.source_path}:${entry.row.resolution_id}: canonical target ${entry.row.canonical_id} is absent`);
    if (canonical.kind !== entry.row.canonical_kind) {
      throw new Error(`${entry.source_path}:${entry.row.resolution_id}: canonical kind ${entry.row.canonical_kind} disagrees with ${canonical.kind}`);
    }
    const key = `${entry.row.source_case_id}\0${entry.row.local_subject_id}`;
    if (!historyByCaseAndLocal.has(key)) historyByCaseAndLocal.set(key, []);
    const history = historyByCaseAndLocal.get(key);
    const prior = history.at(-1);
    if (prior && (prior.row.canonical_id !== entry.row.canonical_id || prior.row.canonical_kind !== entry.row.canonical_kind)) {
      if (entry.row.supersedes_resolution_id !== prior.row.resolution_id) {
        throw new Error(`${entry.source_path}:${entry.row.resolution_id}: conflicting target for ${entry.row.source_case_id}/${entry.row.local_subject_id} without explicit supersession`);
      }
    }
    history.push(entry);
    currentByCaseAndLocal.set(key, entry);
  }

  cachedIndex = {
    schema_version: 'local-canonical-resolution-index@1',
    registry_paths: registryPaths,
    rows: entries.map(entry => entry.row),
    entries,
    current_by_case_and_local: currentByCaseAndLocal,
    history_by_case_and_local: historyByCaseAndLocal,
    canonical_by_id: canonicalById,
    aliases_by_canonical: aliasesByCanonical,
    counts: {
      registry_files: registryPaths.length,
      resolution_rows: entries.length,
      current_resolutions: currentByCaseAndLocal.size,
      canonical_targets: new Set([...currentByCaseAndLocal.values()].map(entry => entry.row.canonical_id)).size,
      canonical_records: canonicalById.size
    },
    boundaries: {
      explicit_case_resolution_precedes_exact_canonical_id: true,
      exact_canonical_id_requires_byte_equal_subject_id: true,
      normalized_name_matching_authorized: false,
      alias_matching_authorized: false,
      source_records_mutated: false,
      source_records_merged: false,
      relationship_created: false,
      participation_created: false,
      automatic_cross_case_join_authorized: false,
      cross_case_graph_join_authorized: false,
      cross_case_hop_creation_authorized: false,
      graph_effect: 'none'
    }
  };
  return cachedIndex;
}

export function isResolvedSubjectIdentity(identity) {
  return Boolean(identity?.canonical_subject_id)
    && identity?.resolution_status === RESOLVED_SUBJECT_STATUS;
}

function projectionBoundaryFields() {
  return {
    source_records_mutated: false,
    source_records_merged: false,
    relationship_created: false,
    participation_created: false,
    accepted_cross_case_identity_bridge: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  };
}

export function resolveSubjectIdentity(caseId, localSubjectId, index = loadLocalCanonicalResolutionIndex()) {
  const local = String(localSubjectId ?? '');
  const entry = index.current_by_case_and_local.get(`${caseId}\0${local}`);
  if (entry) {
    const row = entry.row;
    const canonical = index.canonical_by_id.get(row.canonical_id);
    const aliases = index.aliases_by_canonical.get(row.canonical_id) ?? [];
    return {
      schema_version: SUBJECT_IDENTITY_SCHEMA_VERSION,
      case_id: caseId,
      local_subject_id: local,
      canonical_subject_id: row.canonical_id,
      canonical_kind: row.canonical_kind,
      canonical_label: canonical.label,
      canonical_aliases: aliases,
      resolution_id: row.resolution_id,
      resolution_status: RESOLVED_SUBJECT_STATUS,
      resolution_basis: EXPLICIT_SUBJECT_RESOLUTION_BASIS,
      source_ids: uniqueSorted(row.source_ids),
      search_keys: uniqueSorted([local, row.canonical_id, canonical.label, ...aliases]),
      ...projectionBoundaryFields()
    };
  }

  const exactCanonical = index.canonical_by_id.get(local);
  if (exactCanonical) {
    const aliases = index.aliases_by_canonical.get(local) ?? [];
    return {
      schema_version: SUBJECT_IDENTITY_SCHEMA_VERSION,
      case_id: caseId,
      local_subject_id: local,
      canonical_subject_id: local,
      canonical_kind: exactCanonical.kind,
      canonical_label: exactCanonical.label,
      canonical_aliases: aliases,
      resolution_id: null,
      resolution_status: RESOLVED_SUBJECT_STATUS,
      resolution_basis: EXACT_CANONICAL_SUBJECT_RESOLUTION_BASIS,
      source_ids: uniqueSorted(exactCanonical.record?.source_ids),
      search_keys: uniqueSorted([local, exactCanonical.label, ...aliases]),
      ...projectionBoundaryFields()
    };
  }

  return {
    schema_version: SUBJECT_IDENTITY_SCHEMA_VERSION,
    case_id: caseId,
    local_subject_id: local,
    canonical_subject_id: null,
    canonical_kind: null,
    canonical_label: null,
    canonical_aliases: [],
    resolution_id: null,
    resolution_status: 'local_only_unresolved',
    resolution_basis: 'none',
    source_ids: [],
    search_keys: uniqueSorted([local]),
    ...projectionBoundaryFields()
  };
}

export function summarizeSubjectIdentities(claims, { caseId = null, registryPaths = null } = {}) {
  const rowsByLocal = new Map();
  for (const claim of claims ?? []) {
    const identity = claim.subject_identity;
    if (!identity) throw new Error(`${claim.claim_id ?? '<claim>'}: subject_identity projection missing`);
    const key = `${identity.case_id}\0${identity.local_subject_id}`;
    if (!rowsByLocal.has(key)) {
      rowsByLocal.set(key, {
        case_id: identity.case_id,
        local_subject_id: identity.local_subject_id,
        canonical_subject_id: identity.canonical_subject_id,
        canonical_kind: identity.canonical_kind,
        canonical_label: identity.canonical_label,
        canonical_aliases: identity.canonical_aliases,
        resolution_id: identity.resolution_id,
        resolution_status: identity.resolution_status,
        resolution_basis: identity.resolution_basis,
        search_keys: identity.search_keys,
        claim_ids: []
      });
    }
    const row = rowsByLocal.get(key);
    if (row.canonical_subject_id !== identity.canonical_subject_id
      || row.resolution_id !== identity.resolution_id
      || row.resolution_status !== identity.resolution_status
      || row.resolution_basis !== identity.resolution_basis) {
      throw new Error(`${identity.case_id}/${identity.local_subject_id}: inconsistent subject identity projection`);
    }
    row.claim_ids.push(claim.claim_id);
  }
  const subjects = [...rowsByLocal.values()].map(row => ({
    ...row,
    claim_ids: uniqueSorted(row.claim_ids)
  })).sort((left, right) => `${left.case_id}\0${left.local_subject_id}`.localeCompare(`${right.case_id}\0${right.local_subject_id}`));
  const resolvedClaims = (claims ?? []).filter(claim => isResolvedSubjectIdentity(claim.subject_identity));
  return {
    schema_version: SUBJECT_IDENTITY_SUMMARY_SCHEMA_VERSION,
    case_id: caseId,
    scope: 'claim_subject_only',
    registry_paths: registryPaths ?? loadLocalCanonicalResolutionIndex().registry_paths,
    counts: {
      subject_references: (claims ?? []).length,
      resolved_subject_references: resolvedClaims.length,
      explicit_resolution_references: (claims ?? []).filter(claim => claim.subject_identity?.resolution_basis === EXPLICIT_SUBJECT_RESOLUTION_BASIS).length,
      exact_canonical_id_references: (claims ?? []).filter(claim => claim.subject_identity?.resolution_basis === EXACT_CANONICAL_SUBJECT_RESOLUTION_BASIS).length,
      unresolved_subject_references: (claims ?? []).length - resolvedClaims.length,
      distinct_local_subjects: subjects.length,
      distinct_canonical_subjects: new Set(subjects.map(row => row.canonical_subject_id).filter(Boolean)).size
    },
    subjects,
    boundaries: {
      subject_id_preserved: true,
      claim_text_mutated: false,
      explicit_case_resolution_precedes_exact_canonical_id: true,
      normalized_name_matching_authorized: false,
      alias_matching_authorized: false,
      source_records_mutated: false,
      source_records_merged: false,
      object_identity_inferred: false,
      relationship_created: false,
      participation_created: false,
      automatic_cross_case_join_authorized: false,
      cross_case_graph_join_authorized: false,
      cross_case_hop_creation_authorized: false,
      graph_effect: 'none'
    }
  };
}
