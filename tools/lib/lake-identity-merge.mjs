// Evidence-lake identity merge (WP4): registry growth only.
//
// The archived evidence-lake programme (archive/evidence-lake-identity, waves
// 01-20) grew the canonical registries and adjudicated case-local identifiers.
// This module plans how those rows land on the canonical registries of main:
//
//   * archive-only actors, organizations and aliases are appended verbatim, so
//     each row keeps its archived receipts and provenance;
//   * when an archive row conflicts with a main row for the same entity, main
//     wins, the archive row is not added, and the difference is recorded;
//   * the wave-15 identity decisions become graph-inert, case-qualified
//     local-subject resolution rows (aliases are global and not case-qualified,
//     so a case-local subject id never becomes an alias);
//   * the wave-09 uncovered name-like identifiers are written out as the open
//     frontier and are not resolved here.
//
// Nothing in this module creates a participation row, a surface, a relation, a
// hop, or a cross-case join. The hop compiler never reads the files it writes
// except the three canonical registries, and growth of those registries alone
// does not add an edge (test/lake-identity-merge.test.js pins the edge set).
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { entityId } from './axm-id.mjs';

export const ARCHIVE_DIR = 'archive/evidence-lake-identity';
export const BASE_COMMIT = 'd8392cfb19b8fd870bc65e5a3dcf9a8ae4bcfb07';

export const REGISTRY_FILES = Object.freeze({
  actors: 'data/canonical/actors.json',
  organizations: 'data/canonical/organizations.json',
  aliases: 'data/canonical/aliases.json',
});
export const RESOLUTIONS_FILE = 'data/canonical/local-subject-resolutions.jsonl';
export const MENTIONS_FILE = 'data/canonical/unresolved-mentions.jsonl';
export const MANIFEST_FILE = 'data/canonical/lake-identity-merge.json';

const PROJECT = `${ARCHIVE_DIR}/data/project`;
export const ARCHIVE_SOURCES = Object.freeze({
  actors: `${ARCHIVE_DIR}/data/canonical/actors.json`,
  organizations: `${ARCHIVE_DIR}/data/canonical/organizations.json`,
  aliases: `${ARCHIVE_DIR}/data/canonical/aliases.json`,
  adjudications: `${PROJECT}/lake-unresolved-subject-adjudication-registry-wave-15.jsonl`,
  resolutions16: `${PROJECT}/lake-local-canonical-resolution-registry-wave-16.jsonl`,
  resolutions12: `${PROJECT}/lake-local-canonical-resolution-registry-wave-12.jsonl`,
  mentions: `${PROJECT}/lake-canonical-identity-mention-registry-wave-09.jsonl`,
  wave11Adjudications: `${PROJECT}/lake-canonical-adjudication-registry-wave-11.jsonl`,
  extensions: [
    `${PROJECT}/lake-canonical-identity-extension-registry-wave-11.jsonl`,
    `${PROJECT}/lake-canonical-identity-extension-registry-wave-12.jsonl`,
    `${PROJECT}/lake-canonical-identity-extension-registry-wave-16.jsonl`,
  ],
});

// Keys an archived row carries as receipts/provenance. A merged row must keep
// every one of these exactly as archived.
export const PROVENANCE_KEYS = Object.freeze([
  'source', 'source_case_id', 'source_acquisition_id', 'source_routing_id',
  'source_local_subject_id', 'source_wave11_adjudication_id', 'source_ids',
  'source_decision_id', 'source_unresolved_subject_id',
  'receipt_ids', 'canonical_status', 'graph_effect',
]);

// Flags every resolution and frontier row must keep false.
export const INERT_FLAGS = Object.freeze([
  'entities_merged', 'relationship_created', 'participation_created',
  'accepted_cross_case_identity_bridge', 'automatic_cross_case_join_authorized',
  'cross_case_graph_join_authorized', 'cross_case_hop_creation_authorized',
]);

export const EXPECTED = Object.freeze({
  identityDecisions: 17,
  nonidentityObjects: 40,
  mentionsTotal: 229,
  mentionsCanonical: 121,
  mentionsUncovered: 104,
});

function readJsonFile(root, relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function readJsonlFile(root, relativePath) {
  return fs.readFileSync(path.join(root, relativePath), 'utf8')
    .split(/\r?\n/)
    .filter(line => line.trim())
    .map((line, index) => {
      try { return JSON.parse(line); } catch (error) {
        throw new Error(`${relativePath}:${index + 1}: invalid JSONL: ${error.message}`);
      }
    });
}

export function loadArchive(root) {
  return {
    actors: readJsonFile(root, ARCHIVE_SOURCES.actors).actors,
    organizations: readJsonFile(root, ARCHIVE_SOURCES.organizations).organizations,
    aliases: readJsonFile(root, ARCHIVE_SOURCES.aliases).aliases,
    adjudications: readJsonlFile(root, ARCHIVE_SOURCES.adjudications),
    resolutions16: readJsonlFile(root, ARCHIVE_SOURCES.resolutions16),
    resolutions12: readJsonlFile(root, ARCHIVE_SOURCES.resolutions12),
    mentions: readJsonlFile(root, ARCHIVE_SOURCES.mentions),
    wave11Adjudications: readJsonlFile(root, ARCHIVE_SOURCES.wave11Adjudications),
    extensions: ARCHIVE_SOURCES.extensions.flatMap(file => readJsonlFile(root, file)),
  };
}

export function loadMain(root) {
  const surfaces = readJsonlFile(root, 'data/ledger/surfaces.jsonl');
  return {
    actors: readJsonFile(root, REGISTRY_FILES.actors).actors,
    organizations: readJsonFile(root, REGISTRY_FILES.organizations).organizations,
    aliases: readJsonFile(root, REGISTRY_FILES.aliases).aliases,
    surfaces,
    legacyNodes: readJsonFile(root, 'graph.json').nodes
      .filter(node => node.projection_layer !== 'canonical_surface_overlay'),
    namespace: readJsonFile(root, 'cases.json').default_case_id,
  };
}

const stable = value => JSON.stringify(value);
const aliasKey = text => String(text).normalize('NFC').toLowerCase();

// Field-level difference between a main row and an archive row for the same
// entity. Values are kept only for archive-only provenance keys and short
// scalars; long prose is recorded by key so the manifest does not copy text
// that main deliberately bounded.
export function diffRows(mainRow, archiveRow) {
  const archiveOnly = {};
  const mainOnly = [];
  const changed = [];
  for (const key of Object.keys(archiveRow)) {
    if (!(key in mainRow)) archiveOnly[key] = archiveRow[key];
    else if (stable(mainRow[key]) !== stable(archiveRow[key])) {
      const short = typeof mainRow[key] === 'string' && typeof archiveRow[key] === 'string'
        && mainRow[key].length <= 120 && archiveRow[key].length <= 120;
      changed.push(short ? { key, main: mainRow[key], archive: archiveRow[key] } : { key });
    }
  }
  for (const key of Object.keys(mainRow)) if (!(key in archiveRow)) mainOnly.push(key);
  return { archive_only_fields: archiveOnly, main_only_fields: mainOnly, changed_fields: changed };
}

// Plans the three registry merges. Pure: reads only its arguments.
//
// Main represents an actor or organization that exists only in the legacy
// research graph (graph.json) through the compiler's legacy bridge: the surface
// app indexes it with the legacy description and tags and renders the legacy
// page, and test/compiler.test.js asserts that bridge for Alex Karp. Main
// promotes such an id to the canonical registry together with its participation
// and an editorial profile. An archived provisional record has neither, so
// adding it would replace the bridge entry with an empty canonical page. Main
// wins: those rows are held back and recorded. `includeLegacyBridged` lifts the
// hold for the promotion that does bring a profile and participation.
export function planRegistryMerge({ main, archive, includeLegacyBridged = false }) {
  const ns = main.namespace;
  const legacyBridged = new Map();
  if (!includeLegacyBridged) {
    for (const node of main.legacyNodes ?? []) legacyBridged.set(node.id, node);
  }
  const byAxm = new Map();
  const note = (axm, ref) => { if (!byAxm.has(axm)) byAxm.set(axm, ref); };
  for (const row of main.actors) note(entityId(ns, row.label), { registry: 'actors', id: row.id });
  for (const row of main.organizations) note(entityId(ns, row.label), { registry: 'organizations', id: row.id });
  for (const row of main.surfaces) note(entityId(ns, row.surface_label), { registry: 'surfaces', id: row.surface_id });
  const aliasDerived = new Map();
  for (const row of main.aliases) {
    const axm = entityId(ns, row.alias);
    if (!aliasDerived.has(axm)) aliasDerived.set(axm, row.canonical_id);
  }

  const actorById = new Map(main.actors.map(row => [row.id, row]));
  const orgById = new Map(main.organizations.map(row => [row.id, row]));
  const surfaceIds = new Set(main.surfaces.map(row => row.surface_id));
  const plan = {
    add: { actors: [], organizations: [], aliases: [] },
    shared: { actors: [], organizations: [], aliases: [] },
    conflicts: [],
  };

  function planEntities(registry, archiveRows, ownById, otherById) {
    for (const row of archiveRows) {
      const existing = ownById.get(row.id);
      if (existing) {
        const diff = diffRows(existing, row);
        if (diff.changed_fields.length || Object.keys(diff.archive_only_fields).length || diff.main_only_fields.length) {
          plan.shared[registry].push({ id: row.id, ...diff });
        }
        continue;
      }
      if (otherById.has(row.id) || surfaceIds.has(row.id)) {
        plan.conflicts.push({ registry, id: row.id, reason: 'id_used_by_other_main_entity', label: row.label, archive_row: row });
        continue;
      }
      const bridged = legacyBridged.get(row.id);
      if (bridged) {
        plan.conflicts.push({
          registry, id: row.id, reason: 'legacy_graph_bridge_entity', label: row.label,
          main_legacy_node: { id: bridged.id, label: bridged.label, type: bridged.type, description: bridged.description ?? null, tags: bridged.tags ?? [] },
          archive_row: row,
        });
        continue;
      }
      const axm = entityId(ns, row.label);
      const clash = byAxm.get(axm);
      if (clash) {
        plan.conflicts.push({
          registry, id: row.id, reason: 'axm_entity_id_collision_with_main', label: row.label,
          axm_entity_id: axm, main_entity: clash, archive_row: row,
        });
        continue;
      }
      const aliasClash = aliasDerived.get(axm);
      if (aliasClash && aliasClash !== row.id) {
        plan.conflicts.push({
          registry, id: row.id, reason: 'axm_entity_id_collision_with_main_alias', label: row.label,
          axm_entity_id: axm, main_entity: { registry: 'aliases', id: aliasClash }, archive_row: row,
        });
        continue;
      }
      plan.add[registry].push(row);
      note(axm, { registry, id: row.id });
    }
  }
  planEntities('actors', archive.actors, actorById, orgById);
  planEntities('organizations', archive.organizations, orgById, actorById);

  const addedActorIds = new Set(plan.add.actors.map(row => row.id));
  const addedOrgIds = new Set(plan.add.organizations.map(row => row.id));
  const targetKnown = (kind, id) => (kind === 'actor'
    ? actorById.has(id) || addedActorIds.has(id)
    : orgById.has(id) || addedOrgIds.has(id));
  const mainAliasByText = new Map(main.aliases.map(row => [aliasKey(row.alias), row]));
  for (const row of archive.aliases) {
    const existing = mainAliasByText.get(aliasKey(row.alias));
    if (existing) {
      if (existing.canonical_id === row.canonical_id) {
        const diff = diffRows(existing, row);
        if (diff.changed_fields.length || Object.keys(diff.archive_only_fields).length || diff.main_only_fields.length) {
          plan.shared.aliases.push({ alias: row.alias, canonical_id: row.canonical_id, ...diff });
        }
      } else {
        plan.conflicts.push({
          registry: 'aliases', id: row.alias, reason: 'alias_text_maps_to_different_entity',
          main_canonical_id: existing.canonical_id, archive_canonical_id: row.canonical_id, archive_row: row,
        });
      }
      continue;
    }
    if (!targetKnown(row.kind, row.canonical_id)) {
      plan.conflicts.push({
        registry: 'aliases', id: row.alias, reason: 'canonical_target_not_on_main',
        archive_canonical_id: row.canonical_id, archive_row: row,
      });
      continue;
    }
    plan.add.aliases.push(row);
  }
  return plan;
}

export function applyRegistryPlan(main, plan) {
  return {
    actors: [...main.actors, ...plan.add.actors],
    organizations: [...main.organizations, ...plan.add.organizations],
    aliases: [...main.aliases, ...plan.add.aliases],
  };
}

// The wave-16 integration rows are the applied form of the 17 wave-15 identity
// decisions (frontier-ai-taskforce was superseded onto aisi there). A decision
// whose canonical target was held back (see planRegistryMerge) cannot be
// applied: its row is returned in `pending` and nothing is written for it.
export function buildResolutionRows({ archive, registries, conflicts }) {
  const decisionById = new Map(archive.adjudications.map(row => [row.adjudication_id, row]));
  const actorIds = new Set(registries.actors.map(row => row.id));
  const orgIds = new Set(registries.organizations.map(row => row.id));
  const conflictByTarget = new Map(conflicts
    .filter(row => row.registry === 'actors' || row.registry === 'organizations')
    .map(row => [`${row.registry === 'actors' ? 'actor' : 'organization'}:${row.id}`, row]));
  const rows = [];
  const pending = [];
  for (const archived of archive.resolutions16) {
    const decision = decisionById.get(archived.source_decision_id);
    if (!decision || !decision.disposition.startsWith('identity_')) {
      throw new Error(`resolution ${archived.resolution_id} cites ${archived.source_decision_id}, which is not a wave-15 identity decision`);
    }
    const row = { ...archived, decision_wave: 15, integration_wave: 16, scope: 'case_local_only' };
    const present = (archived.canonical_kind === 'actor' ? actorIds : orgIds).has(archived.canonical_id);
    if (!present) {
      const conflict = conflictByTarget.get(`${archived.canonical_kind}:${archived.canonical_id}`);
      if (!conflict) throw new Error(`resolution ${archived.resolution_id} targets ${archived.canonical_id}, which is neither on main nor a recorded conflict`);
      if (conflict.reason === 'axm_entity_id_collision_with_main') {
        row.archive_canonical_id = archived.canonical_id;
        row.canonical_id = conflict.main_entity.id;
        row.main_wins_note = `archive canonical id ${archived.canonical_id} was not added: its label ${JSON.stringify(conflict.label)} derives the same AXM entity id as main entity ${conflict.main_entity.id}`;
      } else {
        pending.push({
          resolution_id: archived.resolution_id,
          source_decision_id: archived.source_decision_id,
          source_case_id: archived.source_case_id,
          local_subject_id: archived.local_subject_id,
          canonical_id: archived.canonical_id,
          canonical_kind: archived.canonical_kind,
          blocked_by: `${conflict.registry}:${conflict.id} (${conflict.reason})`,
        });
        continue;
      }
    }
    rows.push(row);
  }
  return { rows, pending };
}

export function buildMentionRows({ archive, registries, resolutionRows }) {
  const canonicalIds = new Set([...registries.actors, ...registries.organizations].map(row => row.id));
  const resolutionByLocal = new Map(resolutionRows.map(row => [`${row.source_case_id}|${row.local_subject_id}`, row]));
  const adjudicationByLocal = new Map(archive.adjudications.map(row => [`${row.source_case_id}|${row.local_subject_id}`, row]));
  const w12ByLocal = new Map(archive.resolutions12.map(row => [`${row.source_case_id}|${row.local_subject_id}`, row]));
  const w16ByLocal = new Map(archive.resolutions16.map(row => [`${row.source_case_id}|${row.local_subject_id}`, row]));
  const w11ByMention = new Map(archive.wave11Adjudications.map(row => [row.source_mention_id, row]));

  return archive.mentions
    .filter(row => row.mapping_status === 'uncovered_name_like_identifier')
    .map(row => {
      const local = `${row.case_id}|${row.identity_value}`;
      const later = [];
      const w11 = w11ByMention.get(row.mention_id);
      if (w11) later.push({ wave: 11, row_id: w11.adjudication_id, disposition: w11.adjudicated_kind, status: w11.adjudication_status, canonical_target_id: w11.canonical_target_id ?? w11.proposed_canonical_id ?? null });
      const w12 = w12ByLocal.get(local);
      if (w12) later.push({ wave: 12, row_id: w12.resolution_id, disposition: 'local_canonical_resolution', canonical_target_id: w12.canonical_id });
      const w15 = adjudicationByLocal.get(local);
      if (w15) later.push({ wave: 15, row_id: w15.adjudication_id, disposition: w15.disposition, canonical_target_id: w15.canonical_target?.canonical_id ?? null, object_kind: w15.object_kind ?? null });
      const w16 = w16ByLocal.get(local);
      if (w16) later.push({ wave: 16, row_id: w16.resolution_id, disposition: 'local_canonical_resolution', canonical_target_id: w16.canonical_id });
      const applied = resolutionByLocal.get(local);
      return {
        schema_version: 'unresolved-mention@1',
        mention_id: row.mention_id,
        case_id: row.case_id,
        case_title: row.case_title,
        identity_value: row.identity_value,
        normalized_term: row.normalized_term,
        controlled_stem: row.controlled_stem,
        identifier_shape: row.identifier_shape,
        mapping_status: row.mapping_status,
        occurrence_ids: row.occurrence_ids,
        record_ids: row.record_ids,
        receipt_ids: row.receipt_ids,
        claim_statuses: row.claim_statuses,
        evidence_classes: row.evidence_classes,
        blocking_conditions: row.blocking_conditions,
        source: {
          registry: ARCHIVE_SOURCES.mentions,
          wave: 9,
          classification_schema: row.schema_version,
        },
        coverage_at_merge: {
          exact_canonical_id: canonicalIds.has(row.identity_value) ? row.identity_value : null,
          local_subject_resolution_id: applied ? applied.resolution_id : null,
        },
        archive_later_dispositions: later,
        canonical_mapping_resolved: false,
        accepted_production_identity_bridge: false,
        automatic_cross_case_join_authorized: false,
        cross_case_graph_join_authorized: false,
        cross_case_hop_creation_authorized: false,
        graph_effect: 'none',
      };
    });
}

export function buildManifest({ main, archive, plan, registries, resolutionRows, pendingResolutions, mentionRows }) {
  const open = mentionRows.filter(row => !row.coverage_at_merge.exact_canonical_id && !row.coverage_at_merge.local_subject_resolution_id);
  const nonidentity = archive.adjudications.filter(row => row.disposition === 'bounded_nonidentity_object');
  return {
    schema_version: 'lake-identity-merge@1',
    purpose: 'Registry growth only: merges the evidence-lake identity registries (archive/evidence-lake-identity, waves 01-20) onto the canonical registries. No participation row, surface, relation, hop edge or cross-case join is created.',
    base_commit: BASE_COMMIT,
    source: {
      archive: ARCHIVE_DIR,
      registries: { actors: ARCHIVE_SOURCES.actors, organizations: ARCHIVE_SOURCES.organizations, aliases: ARCHIVE_SOURCES.aliases },
      adjudication_registry: ARCHIVE_SOURCES.adjudications,
      resolution_registry: ARCHIVE_SOURCES.resolutions16,
      mention_registry: ARCHIVE_SOURCES.mentions,
    },
    counts: {
      base: { actors: main.actors.length, organizations: main.organizations.length, aliases: main.aliases.length },
      archive: { actors: archive.actors.length, organizations: archive.organizations.length, aliases: archive.aliases.length },
      added: { actors: plan.add.actors.length, organizations: plan.add.organizations.length, aliases: plan.add.aliases.length },
      at_merge: { actors: registries.actors.length, organizations: registries.organizations.length, aliases: registries.aliases.length },
    },
    added: {
      actors: plan.add.actors.map(row => row.id),
      organizations: plan.add.organizations.map(row => row.id),
      aliases: plan.add.aliases.map(row => ({ alias: row.alias, canonical_id: row.canonical_id })),
    },
    main_wins: {
      not_added: plan.conflicts,
      shared_rows_that_differ: plan.shared,
    },
    decisions: {
      wave_15_identity_decisions: archive.adjudications.filter(row => row.disposition.startsWith('identity_')).length,
      applied_as_resolution_rows: resolutionRows.length,
      resolution_rows_file: RESOLUTIONS_FILE,
      pending: {
        wave_15_identity_decisions_not_applied: pendingResolutions,
        wave_12_local_resolutions_not_applied: archive.resolutions12.map(row => ({ resolution_id: row.resolution_id, source_case_id: row.source_case_id, local_subject_id: row.local_subject_id, canonical_id: row.canonical_id })),
        wave_15_typed_nonidentity_objects: nonidentity.map(row => ({ adjudication_id: row.adjudication_id, subject_object_id: row.subject_object_id, source_case_id: row.source_case_id, local_subject_id: row.local_subject_id, object_kind: row.object_kind })),
        reason: 'current schema has no place for typed non-identity objects; the wave-12 hold resolutions are outside the 17 wave-15 decisions; an identity decision whose canonical target was held back (legacy-bridge entity) cannot be applied until that target is promoted',
      },
    },
    unresolved_mentions: {
      file: MENTIONS_FILE,
      written: mentionRows.length,
      census_total: archive.mentions.length,
      census_exact_canonical: archive.mentions.filter(row => row.mapping_status === 'exact_canonical_id').length,
      with_exact_canonical_id_at_merge: mentionRows.filter(row => row.coverage_at_merge.exact_canonical_id).length,
      with_local_subject_resolution_row: mentionRows.filter(row => row.coverage_at_merge.local_subject_resolution_id).length,
      with_neither_at_merge: open.length,
    },
    boundary: {
      graph_effect: 'none',
      participation_rows_added: 0,
      surfaces_added: 0,
      hop_edges_added: 0,
      cross_case_joins_authorized: false,
    },
  };
}

// The public-interest map pins the canonical actor and organization counts in
// its inventory (validate-clifford-cross-corpus-public-interest-map compares
// them with the live registries). Text-level edit: the file is curated and
// carries its own escaping, so it is never re-serialized.
export const MAP_FILE = 'data/research/clifford-cross-corpus-public-interest-map.json';
const MAP_NOTE_MARKER = 'archived evidence-lake registries';

export function syncMapInventory(text, { actors, organizations, addedActors, addedOrganizations }) {
  const counts = /("canonical": \{\s*"actors": )\d+(,\s*"organizations": )\d+/;
  if (!counts.test(text)) throw new Error('public-interest map inventory.canonical block not found');
  let out = text.replace(counts, `$1${actors}$2${organizations}`);
  if (!out.includes(MAP_NOTE_MARKER) && (addedActors || addedOrganizations)) {
    const note = ` The canonical actor and organization counts also include ${addedActors} actors and ${addedOrganizations} organizations merged from the ${MAP_NOTE_MARKER} as registry growth only: they hold no participation row, and no surface, hop edge or cross-case join follows from them.`;
    const tail = /(\n    "interpretation": "[^\n]*)"(\n  \},\n  "lanes")/;
    if (!tail.test(out)) throw new Error('public-interest map inventory.interpretation not found');
    out = out.replace(tail, (_, head, rest) => `${head}${note}"${rest}`);
  }
  return out;
}

export function serializeJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

export function serializeJsonl(rows) {
  return rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
}

// Fingerprint of the hop edge set: count, sha256 of the sorted edge ids, and
// sha256 of the complete edge array (surfaces, roles, windows, receipts).
export function hopEdgeFingerprint(hopGraph) {
  const ids = hopGraph.edges.map(edge => `${edge.actor_a}||${edge.actor_b}`).sort();
  return {
    edge_count: hopGraph.edges.length,
    edge_id_sha256: createHash('sha256').update(ids.join('\n')).digest('hex'),
    edges_sha256: createHash('sha256').update(JSON.stringify(hopGraph.edges)).digest('hex'),
  };
}
