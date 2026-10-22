#!/usr/bin/env node
// Validates the evidence-lake identity merge (WP4): every archived actor,
// organization and alias is either on the canonical registries with its
// archived receipts and provenance, or recorded as a main-wins refusal; the
// case-qualified resolution rows and the unresolved-mention frontier equal what
// the archive derives; and every archived AXM identifier still reproduces under
// the current Genesis contract. Nothing here reads or writes a graph edge.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { entityId, legacyEntityId } from './lib/axm-id.mjs';
import {
  EXPECTED, INERT_FLAGS, MANIFEST_FILE, MENTIONS_FILE, PROVENANCE_KEYS, RESOLUTIONS_FILE,
  buildMentionRows, buildResolutionRows, loadArchive, loadMain,
} from './lib/lake-identity-merge.mjs';

const KNOWN_REASONS = new Set([
  'legacy_graph_bridge_entity',
  'axm_entity_id_collision_with_main',
  'axm_entity_id_collision_with_main_alias',
  'id_used_by_other_main_entity',
  'alias_text_maps_to_different_entity',
  'canonical_target_not_on_main',
]);

function readJson(root, file) { return JSON.parse(fs.readFileSync(path.join(root, file), 'utf8')); }
function readJsonl(root, file) {
  return fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);
const aliasKey = text => String(text).normalize('NFC').toLowerCase();

export function loadMergeState(root) {
  return {
    main: loadMain(root),
    archive: loadArchive(root),
    manifest: readJson(root, MANIFEST_FILE),
    resolutions: readJsonl(root, RESOLUTIONS_FILE),
    mentions: readJsonl(root, MENTIONS_FILE),
    identity: readJson(root, 'build/axm-identity.json'),
  };
}

export function validateLakeIdentityMerge(state) {
  const { main, archive, manifest, resolutions, mentions, identity } = state;
  const errors = [];
  const fail = message => errors.push(message);
  const ns = main.namespace;

  const actorById = new Map(main.actors.map(row => [row.id, row]));
  const orgById = new Map(main.organizations.map(row => [row.id, row]));
  const aliasByText = new Map(main.aliases.map(row => [aliasKey(row.alias), row]));
  const refused = new Map((manifest.main_wins?.not_added ?? []).map(row => [`${row.registry}:${row.id}`, row]));

  if (manifest.schema_version !== 'lake-identity-merge@1') fail(`${MANIFEST_FILE}: unexpected schema_version ${manifest.schema_version}`);
  for (const [key, value] of Object.entries(manifest.boundary ?? {})) {
    const expected = key === 'graph_effect' ? 'none' : (key === 'cross_case_joins_authorized' ? false : 0);
    if (value !== expected) fail(`${MANIFEST_FILE}: boundary.${key} must be ${JSON.stringify(expected)}`);
  }

  // 1. Every archived registry row is accounted for.
  for (const [registry, rows, byId] of [['actors', archive.actors, actorById], ['organizations', archive.organizations, orgById]]) {
    for (const row of rows) {
      const refusal = refused.get(`${registry}:${row.id}`);
      if (byId.has(row.id)) continue;
      if (!refusal) { fail(`archive ${registry} row ${row.id} is neither on the canonical registry nor recorded as a main-wins refusal`); continue; }
      if (!KNOWN_REASONS.has(refusal.reason)) fail(`${registry}:${row.id} has unknown refusal reason ${refusal.reason}`);
      if (!same(refusal.archive_row, row)) fail(`${registry}:${row.id} refusal does not preserve the archived row`);
      if (refusal.reason === 'axm_entity_id_collision_with_main') {
        const target = (refusal.main_entity.registry === 'actors' ? actorById : orgById).get(refusal.main_entity.id);
        if (!target) fail(`${registry}:${row.id} collides with ${refusal.main_entity.id}, which is no longer on main`);
        else if (entityId(ns, target.label) !== entityId(ns, row.label)) fail(`${registry}:${row.id} no longer collides with ${refusal.main_entity.id}; rerun tools/merge-lake-identity.mjs`);
      }
      if (refusal.reason === 'legacy_graph_bridge_entity' && !main.legacyNodes.some(node => node.id === row.id)) {
        fail(`${registry}:${row.id} is recorded as a legacy-bridge entity but is no longer a legacy graph node`);
      }
    }
  }
  for (const row of archive.aliases) {
    const existing = aliasByText.get(aliasKey(row.alias));
    if (existing && existing.canonical_id === row.canonical_id) continue;
    const refusal = refused.get(`aliases:${row.alias}`);
    if (!refusal) fail(`archive alias ${JSON.stringify(row.alias)} is neither on the canonical registry nor recorded as a main-wins refusal`);
    else if (existing && refusal.main_canonical_id !== existing.canonical_id) fail(`alias ${JSON.stringify(row.alias)} refusal names ${refusal.main_canonical_id}, main now has ${existing.canonical_id}`);
  }
  for (const key of refused.keys()) {
    const [registry, ...rest] = key.split(':');
    const id = rest.join(':');
    if (registry === 'aliases') continue;
    const row = (registry === 'actors' ? archive.actors : archive.organizations).find(candidate => candidate.id === id);
    if (!row) fail(`main-wins refusal ${key} names no archived row`);
  }

  // 2. Added rows keep their archived receipts and provenance.
  const archiveActor = new Map(archive.actors.map(row => [row.id, row]));
  const archiveOrg = new Map(archive.organizations.map(row => [row.id, row]));
  for (const [registry, ids, byId, archived] of [
    ['actors', manifest.added?.actors ?? [], actorById, archiveActor],
    ['organizations', manifest.added?.organizations ?? [], orgById, archiveOrg],
  ]) {
    for (const id of ids) {
      const row = byId.get(id);
      const source = archived.get(id);
      if (!row || !source) { fail(`${registry}:${id} is recorded as added but missing from ${row ? 'the archive' : 'the registry'}`); continue; }
      for (const key of PROVENANCE_KEYS) {
        if (key in source && !same(row[key], source[key])) fail(`${registry}:${id} lost archived ${key}`);
      }
      if (row.label !== source.label || row.kind !== source.kind) fail(`${registry}:${id} label or kind differs from the archive`);
    }
  }
  for (const added of manifest.added?.aliases ?? []) {
    const row = aliasByText.get(aliasKey(added.alias));
    const source = archive.aliases.find(candidate => aliasKey(candidate.alias) === aliasKey(added.alias));
    if (!row || !source) { fail(`alias ${JSON.stringify(added.alias)} is recorded as added but missing`); continue; }
    if (row.canonical_id !== added.canonical_id) fail(`alias ${JSON.stringify(added.alias)} no longer points at ${added.canonical_id}`);
    for (const key of PROVENANCE_KEYS) if (key in source && !same(row[key], source[key])) fail(`alias ${JSON.stringify(added.alias)} lost archived ${key}`);
  }

  // 3. Counts: base + added = at merge; the registries only grow from there.
  const counts = manifest.counts ?? {};
  for (const name of ['actors', 'organizations', 'aliases']) {
    if (counts.base?.[name] + counts.added?.[name] !== counts.at_merge?.[name]) fail(`counts.${name}: base + added != at_merge`);
    if (counts.added?.[name] !== (manifest.added?.[name] ?? []).length) fail(`counts.added.${name} disagrees with the added list`);
    if (main[name].length < counts.at_merge?.[name]) fail(`${name} registry holds fewer rows (${main[name].length}) than the merge recorded (${counts.at_merge?.[name]})`);
  }
  const ids = [...main.actors, ...main.organizations].map(row => row.id);
  if (new Set(ids).size !== ids.length) fail('an actor or organization id is used twice across the registries');

  // 4. AXM identity: every registry row has its content-addressed entity.
  const entityByLocal = new Map((identity.entities ?? []).map(entity => [entity.local_id, entity]));
  for (const row of [...main.actors, ...main.organizations]) {
    const entity = entityByLocal.get(row.id);
    if (!entity) fail(`build/axm-identity.json has no entity for ${row.id}; rebuild`);
    else if (entity.axm_entity_id !== entityId(ns, row.label)) fail(`${row.id}: axm entity id does not derive from namespace and label`);
    else if (!entity.legacy_axm_ids.includes(legacyEntityId(ns, row.label))) fail(`${row.id}: legacy query token missing`);
  }
  // Every identifier the archive recorded reproduces under the current contract.
  let reproduced = 0;
  for (const row of archive.extensions) {
    if (row.registry_row_type === 'entity_extension') {
      if (entityId(ns, row.canonical_label) !== row.axm_entity_id) fail(`archive extension ${row.local_id}: AXM entity id no longer reproduces`);
      else reproduced += 1;
    } else if (row.registry_row_type === 'alias_extension') {
      if (entityId(ns, row.alias) !== row.axm_alias_id) fail(`archive extension alias ${row.alias}: AXM alias id no longer reproduces`);
      else reproduced += 1;
    }
  }
  if (reproduced !== archive.extensions.length) fail(`only ${reproduced} of ${archive.extensions.length} archived AXM identifiers reproduce`);

  // 5. Case-qualified resolution rows for the wave-15 identity decisions.
  const registries = { actors: main.actors, organizations: main.organizations };
  const conflicts = manifest.main_wins?.not_added ?? [];
  let regenerated;
  try { regenerated = buildResolutionRows({ archive, registries, conflicts }); } catch (error) { fail(`resolution rows cannot be derived: ${error.message}`); }
  if (regenerated) {
    if (!same(regenerated.rows, resolutions)) fail(`${RESOLUTIONS_FILE} is stale or edited; rerun tools/merge-lake-identity.mjs`);
    if (regenerated.rows.length + regenerated.pending.length !== EXPECTED.identityDecisions) fail(`expected ${EXPECTED.identityDecisions} identity decisions, derived ${regenerated.rows.length + regenerated.pending.length}`);
  }
  const identityDecisions = archive.adjudications.filter(row => row.disposition.startsWith('identity_'));
  if (identityDecisions.length !== EXPECTED.identityDecisions) fail(`archive holds ${identityDecisions.length} identity decisions, expected ${EXPECTED.identityDecisions}`);
  if (archive.adjudications.filter(row => row.disposition === 'bounded_nonidentity_object').length !== EXPECTED.nonidentityObjects) fail(`archive holds a different number of typed non-identity objects than ${EXPECTED.nonidentityObjects}`);
  const seenLocal = new Set();
  for (const row of resolutions) {
    const key = `${row.source_case_id}|${row.local_subject_id}`;
    if (seenLocal.has(key)) fail(`resolution ${row.resolution_id} repeats ${key}`);
    seenLocal.add(key);
    const target = (row.canonical_kind === 'actor' ? actorById : orgById).get(row.canonical_id);
    if (!target) fail(`resolution ${row.resolution_id} targets ${row.canonical_id}, which is not a canonical ${row.canonical_kind}`);
    for (const flag of INERT_FLAGS) if (row[flag] !== false) fail(`resolution ${row.resolution_id}: ${flag} must be false`);
    if (row.graph_effect !== 'none' || row.scope !== 'case_local_only') fail(`resolution ${row.resolution_id} must be graph-inert and case-local`);
    if (row.archive_canonical_id && !conflicts.some(entry => entry.id === row.archive_canonical_id && entry.reason === 'axm_entity_id_collision_with_main')) {
      fail(`resolution ${row.resolution_id} rewrites ${row.archive_canonical_id} without a recorded main-wins collision`);
    }
  }

  // 6. The unresolved-mention frontier equals the archive's wave-09 census.
  const uncovered = archive.mentions.filter(row => row.mapping_status === 'uncovered_name_like_identifier');
  if (archive.mentions.length !== EXPECTED.mentionsTotal
    || archive.mentions.filter(row => row.mapping_status === 'exact_canonical_id').length !== EXPECTED.mentionsCanonical
    || uncovered.length !== EXPECTED.mentionsUncovered) {
    fail('archive mention census no longer matches 229 mentions / 121 canonical / 104 uncovered');
  }
  if (mentions.length !== EXPECTED.mentionsUncovered) fail(`${MENTIONS_FILE} holds ${mentions.length} rows, expected ${EXPECTED.mentionsUncovered}`);
  const ids09 = new Set();
  for (const row of mentions) {
    if (ids09.has(row.mention_id)) fail(`${MENTIONS_FILE}: ${row.mention_id} repeats`);
    ids09.add(row.mention_id);
    if (!row.case_id || !row.mention_id) fail(`${MENTIONS_FILE}: a row lacks case_id or mention_id`);
    for (const flag of ['canonical_mapping_resolved', 'accepted_production_identity_bridge', 'automatic_cross_case_join_authorized', 'cross_case_graph_join_authorized', 'cross_case_hop_creation_authorized']) {
      if (row[flag] !== false) fail(`${MENTIONS_FILE}: ${row.mention_id} ${flag} must be false`);
    }
    if (row.graph_effect !== 'none') fail(`${MENTIONS_FILE}: ${row.mention_id} must be graph-inert`);
    const coverage = row.coverage_at_merge ?? {};
    if (coverage.exact_canonical_id && !(actorById.has(coverage.exact_canonical_id) || orgById.has(coverage.exact_canonical_id))) fail(`${MENTIONS_FILE}: ${row.mention_id} cites a canonical id that is not on the registry`);
    if (coverage.local_subject_resolution_id && !resolutions.some(entry => entry.resolution_id === coverage.local_subject_resolution_id)) fail(`${MENTIONS_FILE}: ${row.mention_id} cites a resolution row that is not written`);
  }
  const strip = ({ coverage_at_merge, ...rest }) => rest;
  const expectedMentions = buildMentionRows({ archive, registries, resolutionRows: resolutions }).map(strip);
  if (!same(mentions.map(strip), expectedMentions)) fail(`${MENTIONS_FILE} differs from the archive wave-09 census; rerun tools/merge-lake-identity.mjs`);
  const summary = manifest.unresolved_mentions ?? {};
  if (summary.written !== mentions.length) fail('manifest unresolved_mentions.written disagrees with the file');
  const open = mentions.filter(row => !row.coverage_at_merge.exact_canonical_id && !row.coverage_at_merge.local_subject_resolution_id).length;
  if (summary.with_neither_at_merge !== open) fail('manifest unresolved_mentions.with_neither_at_merge disagrees with the file');

  return errors;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const state = loadMergeState(root);
  const errors = validateLakeIdentityMerge(state);
  if (errors.length) {
    console.error(`validate-lake-identity-merge: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  const { counts, unresolved_mentions: mentions } = state.manifest;
  console.log(`validate-lake-identity-merge: OK (${counts.base.actors}->${state.main.actors.length} actors, ${counts.base.organizations}->${state.main.organizations.length} organizations, ${counts.base.aliases}->${state.main.aliases.length} aliases; ${state.resolutions.length} resolution rows; ${mentions.written} frontier mentions; ${state.archive.extensions.length} archived AXM ids reproduce)`);
}
