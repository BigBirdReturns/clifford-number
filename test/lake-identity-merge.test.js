import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import {
  BASE_COMMIT, MAP_FILE, applyRegistryPlan, buildManifest, buildMentionRows, buildResolutionRows,
  diffRows, hopEdgeFingerprint, loadArchive, loadMain, planRegistryMerge, syncMapInventory,
} from '../tools/lib/lake-identity-merge.mjs';
import { entityId } from '../tools/lib/axm-id.mjs';
import { loadMergeState, validateLakeIdentityMerge } from '../tools/validate-lake-identity-merge.mjs';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));

// ---------------------------------------------------------------------------
// 1. Registry growth must not move the hop graph. These constants are the hop
// edge set of the base commit d8392cfb (before the evidence-lake registry
// merge). An admission that deliberately adds or removes a hop edge must
// update them in the same commit; registry growth alone must not.
// ---------------------------------------------------------------------------
const BEFORE = Object.freeze({
  edge_count: 93,
  edge_id_sha256: '9e56cb05bd0a339e7f0ebd582a563deaf7626b741ec0719dccb0e7d1ffc8309b',
  edges_sha256: '45dbebd366a8e25dd3ebd58a397a025a740d0d248b834810c7381afaa7100c18',
  rejected_hop_surfaces: 35,
  rejected_hop_pairs: 0,
});
const BEFORE_RESEARCH_EDGES = Object.freeze({
  count: 392,
  sha256: 'e46a8132031fd2ae55ddab17b31d93fcd2f12fa3d9ebbbc2e8dd7714486de03e',
});

const hopGraph = readJson('build/hop-graph.json');
const after = hopEdgeFingerprint(hopGraph);
assert.equal(after.edge_count, BEFORE.edge_count, 'registry growth must not change the hop edge count');
assert.equal(after.edge_id_sha256, BEFORE.edge_id_sha256, 'registry growth must not change the sorted hop edge ids');
assert.equal(after.edges_sha256, BEFORE.edges_sha256, 'registry growth must not change any hop basis, role, window or receipt');
assert.equal(hopGraph.rejected_hop_surfaces.length, BEFORE.rejected_hop_surfaces);
assert.equal(hopGraph.rejected_hop_pairs.length, BEFORE.rejected_hop_pairs);

// The constants above really are the base commit's edge set, when its object is
// available (a shallow checkout may not carry it).
let baseHopGraph = null;
try {
  baseHopGraph = JSON.parse(execFileSync('git', ['show', `${BASE_COMMIT}:build/hop-graph.json`], {
    encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'],
  }));
} catch { /* base commit not present in this checkout */ }
if (baseHopGraph) {
  const before = hopEdgeFingerprint(baseHopGraph);
  assert.equal(before.edge_count, BEFORE.edge_count);
  assert.equal(before.edge_id_sha256, BEFORE.edge_id_sha256);
  assert.equal(before.edges_sha256, BEFORE.edges_sha256);
  assert.deepEqual(after, before, 'hop edge set before and after the merge must be identical');
  assert.deepEqual(hopGraph.edges.map(edge => `${edge.actor_a}||${edge.actor_b}`).sort(),
    baseHopGraph.edges.map(edge => `${edge.actor_a}||${edge.actor_b}`).sort());
}

// The research graph gains overlay nodes for new registry rows but no edge.
const research = readJson('graph.json');
assert.equal(research.edges.length, BEFORE_RESEARCH_EDGES.count, 'registry growth must not add a research-graph edge');
assert.equal(createHash('sha256').update(JSON.stringify(research.edges)).digest('hex'), BEFORE_RESEARCH_EDGES.sha256);

// ---------------------------------------------------------------------------
// 2. The planner, on synthetic registries: main wins, nothing is lost, and the
// merge is idempotent.
// ---------------------------------------------------------------------------
const mainFixture = () => ({
  namespace: 'test-case',
  actors: [{ id: 'ada', label: 'Ada Lovelace', kind: 'person', plain: { who: 'main text' } }],
  organizations: [{ id: 'royal-society', label: 'Royal Society', kind: 'company' }],
  surfaces: [{ surface_id: 'salon', surface_label: 'Somerville Salon' }],
  aliases: [{ alias: 'Countess of Lovelace', canonical_id: 'ada', kind: 'actor' }],
  legacyNodes: [{ id: 'legacy-person', label: 'Legacy Person', type: 'person', description: 'Bridged by main.', tags: ['t'] }],
});
const archiveFixture = () => ({
  actors: [
    { id: 'ada', label: 'Ada Lovelace', kind: 'person', source: 'wave-11', receipt_ids: ['r-ada'], graph_effect: 'none' },
    { id: 'charles', label: 'Charles Babbage', kind: 'person', source: 'wave-11', receipt_ids: ['r-charles'], graph_effect: 'none' },
    { id: 'legacy-person', label: 'Legacy Person', kind: 'person', source: 'wave-11', receipt_ids: ['r-legacy'] },
    { id: 'ada-2', label: 'ada lovelace', kind: 'person', source: 'wave-11' },
  ],
  organizations: [
    { id: 'analytical-engine', label: 'Analytical Engine Society', kind: 'organization', receipt_ids: ['r-ae'] },
    { id: 'royal-society-2', label: 'ROYAL SOCIETY', kind: 'company' },
  ],
  aliases: [
    { alias: 'Countess of Lovelace', canonical_id: 'ada', kind: 'actor', source: 'wave-12' },
    { alias: 'COUNTESS OF LOVELACE', canonical_id: 'charles', kind: 'actor' },
    { alias: 'Babbage', canonical_id: 'charles', kind: 'actor', receipt_ids: ['r-b'] },
    { alias: 'Ghost', canonical_id: 'ghost', kind: 'actor' },
  ],
});

{
  const main = mainFixture();
  const plan = planRegistryMerge({ main, archive: archiveFixture() });
  assert.deepEqual(plan.add.actors.map(row => row.id), ['charles'], 'only the archive-only, non-conflicting actor is added');
  assert.deepEqual(plan.add.organizations.map(row => row.id), ['analytical-engine']);
  assert.deepEqual(plan.add.aliases.map(row => row.alias), ['Babbage']);
  assert.deepEqual(plan.add.actors[0].receipt_ids, ['r-charles'], 'an added row keeps its archived receipts verbatim');

  const reasons = Object.fromEntries(plan.conflicts.map(row => [`${row.registry}:${row.id}`, row.reason]));
  assert.deepEqual(reasons, {
    'actors:legacy-person': 'legacy_graph_bridge_entity',
    'actors:ada-2': 'axm_entity_id_collision_with_main',
    'organizations:royal-society-2': 'axm_entity_id_collision_with_main',
    'aliases:COUNTESS OF LOVELACE': 'alias_text_maps_to_different_entity',
    'aliases:Ghost': 'canonical_target_not_on_main',
  });
  const collision = plan.conflicts.find(row => row.id === 'ada-2');
  assert.equal(collision.main_entity.id, 'ada', 'the collision names the main entity that wins');
  assert.equal(collision.axm_entity_id, entityId('test-case', 'Ada Lovelace'));
  assert.equal(plan.conflicts.find(row => row.id === 'legacy-person').main_legacy_node.description, 'Bridged by main.');

  // A shared row that differs is recorded, never overwritten.
  assert.equal(plan.shared.actors.length, 1);
  assert.equal(plan.shared.actors[0].id, 'ada');
  assert.deepEqual(plan.shared.actors[0].main_only_fields, ['plain']);
  assert.deepEqual(Object.keys(plan.shared.actors[0].archive_only_fields), ['source', 'receipt_ids', 'graph_effect']);
  assert.deepEqual(plan.shared.aliases.map(row => row.alias), ['Countess of Lovelace']);
  const grown = applyRegistryPlan(main, plan);
  assert.deepEqual(grown.actors[0], main.actors[0], 'main rows are carried through untouched');
  assert.equal(grown.actors.length, 2);

  // Idempotent: replanning on the grown registries adds nothing more.
  const replan = planRegistryMerge({ main: { ...main, ...grown }, archive: archiveFixture() });
  assert.deepEqual([replan.add.actors, replan.add.organizations, replan.add.aliases], [[], [], []]);
  assert.deepEqual(replan.conflicts.map(row => row.reason).sort(), plan.conflicts.map(row => row.reason).sort());

  // Lifting the legacy hold adds the bridged row, still never colliding rows.
  const promoted = planRegistryMerge({ main, archive: archiveFixture(), includeLegacyBridged: true });
  assert.ok(promoted.add.actors.some(row => row.id === 'legacy-person'));
  assert.ok(!promoted.add.actors.some(row => row.id === 'ada-2'));

  // An id already used by the other registry is refused rather than merged.
  const crossed = planRegistryMerge({
    main,
    archive: { actors: [{ id: 'royal-society', label: 'Someone Else', kind: 'person' }], organizations: [], aliases: [] },
  });
  assert.equal(crossed.conflicts[0].reason, 'id_used_by_other_main_entity');
}

assert.deepEqual(
  diffRows({ id: 'a', label: 'Short Main', plain: { who: 'x' } }, { id: 'a', label: 'Short Archive', source: 's' }),
  {
    archive_only_fields: { source: 's' },
    main_only_fields: ['plain'],
    changed_fields: [{ key: 'label', main: 'Short Main', archive: 'Short Archive' }],
  },
);
assert.deepEqual(
  diffRows({ id: 'a', plain: { who: 'main' } }, { id: 'a', plain: { who: 'archive' } }).changed_fields,
  [{ key: 'plain' }],
  'long or structured differences are recorded by key, not copied',
);

// Resolution rows: a decision aimed at a collision-refused row follows main's
// entity; one aimed at a held-back row is pending, never silently dropped.
{
  const archive = {
    adjudications: [
      { adjudication_id: 'D1', disposition: 'identity_existing_provenance' },
      { adjudication_id: 'D2', disposition: 'identity_new_canonical_plan' },
      { adjudication_id: 'D3', disposition: 'identity_existing_controlled' },
    ],
    resolutions16: [
      { resolution_id: 'R1', source_decision_id: 'D1', source_case_id: 'c', local_subject_id: 'l1', canonical_id: 'dup', canonical_kind: 'organization' },
      { resolution_id: 'R2', source_decision_id: 'D2', source_case_id: 'c', local_subject_id: 'l2', canonical_id: 'held', canonical_kind: 'organization' },
      { resolution_id: 'R3', source_decision_id: 'D3', source_case_id: 'c', local_subject_id: 'l3', canonical_id: 'there', canonical_kind: 'organization' },
    ],
  };
  const registries = { actors: [], organizations: [{ id: 'there' }, { id: 'winner' }] };
  const conflicts = [
    { registry: 'organizations', id: 'dup', reason: 'axm_entity_id_collision_with_main', label: 'Dup', main_entity: { registry: 'organizations', id: 'winner' } },
    { registry: 'organizations', id: 'held', reason: 'legacy_graph_bridge_entity', label: 'Held' },
  ];
  const { rows, pending } = buildResolutionRows({ archive, registries, conflicts });
  assert.deepEqual(rows.map(row => [row.resolution_id, row.canonical_id]), [['R1', 'winner'], ['R3', 'there']]);
  assert.equal(rows[0].archive_canonical_id, 'dup');
  assert.match(rows[0].main_wins_note, /same AXM entity id as main entity winner/);
  assert.deepEqual(pending.map(row => [row.resolution_id, row.blocked_by]), [['R2', 'organizations:held (legacy_graph_bridge_entity)']]);
  assert.throws(() => buildResolutionRows({ archive, registries, conflicts: [] }), /neither on main nor a recorded conflict/);
  assert.throws(() => buildResolutionRows({
    archive: { ...archive, adjudications: [{ adjudication_id: 'D1', disposition: 'bounded_nonidentity_object' }] },
    registries, conflicts,
  }), /not a wave-15 identity decision/);
}

// The public-interest map inventory is synced by text edit and only once.
{
  const sample = [
    '{', '  "inventory": {', '    "canonical": {', '      "actors": 170,', '      "organizations": 32,', '      "surfaces": 54', '    },',
    '    "interpretation": "Base text."', '  },', '  "lanes": []', '}', '',
  ].join('\n');
  const synced = syncMapInventory(sample, { actors: 177, organizations: 48, addedActors: 7, addedOrganizations: 16 });
  const parsed = JSON.parse(synced);
  assert.equal(parsed.inventory.canonical.actors, 177);
  assert.equal(parsed.inventory.canonical.organizations, 48);
  assert.match(parsed.inventory.interpretation, /7 actors and 16 organizations merged from the archived evidence-lake registries as registry growth only/);
  assert.equal(syncMapInventory(synced, { actors: 177, organizations: 48, addedActors: 7, addedOrganizations: 16 }), synced);
  assert.throws(() => syncMapInventory('{}', { actors: 1, organizations: 1 }), /inventory\.canonical block not found/);
}
{
  const map = readJson(MAP_FILE);
  const registries = { actors: readJson('data/canonical/actors.json').actors, organizations: readJson('data/canonical/organizations.json').organizations };
  assert.equal(map.inventory.canonical.actors, registries.actors.length);
  assert.equal(map.inventory.canonical.organizations, registries.organizations.length);
  assert.match(map.inventory.interpretation, /archived evidence-lake registries/);
}

// ---------------------------------------------------------------------------
// 3. The merged repository state.
// ---------------------------------------------------------------------------
const state = loadMergeState('.');
assert.deepEqual(validateLakeIdentityMerge(state), [], 'merged repository state must validate');

const { manifest, main, archive, resolutions, mentions } = state;
assert.deepEqual(manifest.counts.base, { actors: 170, organizations: 32, aliases: 65 });
assert.deepEqual(manifest.counts.archive, { actors: 161, organizations: 65, aliases: 30 });
assert.deepEqual(manifest.counts.added, { actors: 7, organizations: 16, aliases: 7 });
assert.deepEqual(manifest.counts.at_merge, { actors: 177, organizations: 48, aliases: 72 });
assert.ok(main.actors.length >= 177 && main.organizations.length >= 48 && main.aliases.length >= 72);

// Every archive-only row is added or refused for a recorded reason.
const refusals = new Map(manifest.main_wins.not_added.map(row => [`${row.registry}:${row.id}`, row.reason]));
assert.equal(refusals.get('organizations:anduril'), 'axm_entity_id_collision_with_main');
assert.equal(refusals.get('aliases:Anduril'), 'alias_text_maps_to_different_entity');
assert.equal(refusals.get('actors:alex-karp'), 'legacy_graph_bridge_entity');
assert.equal(manifest.main_wins.not_added.filter(row => row.reason === 'legacy_graph_bridge_entity').length, 35);
assert.equal(manifest.main_wins.not_added.length, 37);
const anduril = manifest.main_wins.not_added.find(row => row.id === 'anduril');
assert.equal(anduril.main_entity.id, 'anduril-industries');
const archivedAnduril = archive.extensions.find(row => row.registry_row_type === 'entity_extension' && row.local_id === 'anduril');
const identityLayer = state.identity.entities.find(entity => entity.local_id === 'anduril-industries');
assert.equal(archivedAnduril.axm_entity_id, identityLayer.axm_entity_id,
  'the refused archive organization and main\'s anduril-industries are the same content-addressed entity');

// Wave-15 decisions: 15 of 17 applied as case-qualified rows, 2 pending.
assert.equal(resolutions.length, 15);
assert.equal(manifest.decisions.wave_15_identity_decisions, 17);
assert.equal(manifest.decisions.pending.wave_15_identity_decisions_not_applied.length, 2);
assert.deepEqual(manifest.decisions.pending.wave_15_identity_decisions_not_applied.map(row => row.local_subject_id).sort(), ['code-first-girls', 'detachment-201']);
assert.equal(manifest.decisions.pending.wave_15_typed_nonidentity_objects.length, 40);
const byLocal = new Map(resolutions.map(row => [row.local_subject_id, row]));
assert.equal(byLocal.get('anduril-industries').canonical_id, 'anduril-industries');
assert.equal(byLocal.get('anduril-industries').archive_canonical_id, 'anduril');
assert.equal(byLocal.get('frontier-ai-taskforce').canonical_id, 'aisi', 'the superseded plan resolves onto the existing AISI entity');
assert.equal(byLocal.get('no10').canonical_id, 'no-10');
assert.equal(byLocal.get('ai-safety-institute').canonical_id, 'aisi');
for (const row of resolutions) {
  assert.equal(row.graph_effect, 'none');
  assert.equal(row.accepted_cross_case_identity_bridge, false);
  assert.equal(row.cross_case_hop_creation_authorized, false);
}

// The frontier: 104 uncovered mentions, none resolved, each with case and id.
assert.equal(mentions.length, 104);
assert.equal(archive.mentions.length, 229);
assert.equal(new Set(mentions.map(row => row.mention_id)).size, 104);
assert.ok(mentions.every(row => /^CANMENTION-[0-9a-f]{24}$/.test(row.mention_id) && row.case_id && row.identity_value));
assert.ok(mentions.every(row => row.mapping_status === 'uncovered_name_like_identifier' && row.canonical_mapping_resolved === false));
assert.deepEqual([...new Set(mentions.map(row => row.case_id))].sort(),
  ['anduril-access-ownership', 'arcadia-field-autopsy', 'field-autopsy-03', 'uk-ai-policy']);

// No merged row appears in a hop edge: registry growth only.
const grownIds = new Set([...manifest.added.actors, ...manifest.added.organizations]);
for (const edge of hopGraph.edges) {
  assert.ok(!grownIds.has(edge.actor_a) && !grownIds.has(edge.actor_b), `merged row ${edge.actor_a}/${edge.actor_b} must not be a hop endpoint`);
}

// ---------------------------------------------------------------------------
// 4. The validator rejects tampering with the merge.
// ---------------------------------------------------------------------------
const clone = () => structuredClone(state);
const errorsFor = mutate => { const copy = clone(); mutate(copy); return validateLakeIdentityMerge(copy); };

assert.ok(errorsFor(s => { s.main.actors = s.main.actors.filter(row => row.id !== 'anita-baldwin'); })
  .some(message => /anita-baldwin/.test(message)), 'dropping a merged actor must fail');
assert.ok(errorsFor(s => { s.main.organizations.find(row => row.id === 'sanyao-pds').receipt_ids = ['forged']; })
  .some(message => /sanyao-pds lost archived receipt_ids/.test(message)), 'rewriting archived receipts must fail');
assert.ok(errorsFor(s => { s.manifest.main_wins.not_added = s.manifest.main_wins.not_added.filter(row => row.id !== 'anduril'); })
  .some(message => /anduril is neither on the canonical registry nor recorded/.test(message)), 'an unrecorded refusal must fail');
assert.ok(errorsFor(s => { s.resolutions.pop(); })
  .some(message => /stale or edited/.test(message)), 'dropping a resolution row must fail');
assert.ok(errorsFor(s => { s.resolutions[0].accepted_cross_case_identity_bridge = true; })
  .some(message => /accepted_cross_case_identity_bridge must be false/.test(message)), 'a cross-case bridge must fail');
assert.ok(errorsFor(s => { s.mentions.pop(); })
  .some(message => /holds 103 rows, expected 104/.test(message)), 'dropping a frontier mention must fail');
assert.ok(errorsFor(s => { s.mentions[0].canonical_mapping_resolved = true; })
  .some(message => /canonical_mapping_resolved must be false/.test(message)), 'resolving a frontier mention must fail');
assert.ok(errorsFor(s => { s.manifest.boundary.hop_edges_added = 1; })
  .some(message => /boundary\.hop_edges_added/.test(message)), 'a boundary breach must fail');
assert.ok(errorsFor(s => { s.identity.entities = s.identity.entities.filter(entity => entity.local_id !== 'erik-wahl'); })
  .some(message => /no entity for erik-wahl/.test(message)), 'an unbuilt identity entity must fail');
assert.ok(errorsFor(s => { const index = s.archive.extensions.findIndex(row => row.registry_row_type === 'entity_extension'); s.archive.extensions[index] = { ...s.archive.extensions[index], axm_entity_id: 'e1_' + 'a'.repeat(52) }; })
  .some(message => /no longer reproduces/.test(message)), 'a drifting AXM contract must fail');

// A freshly derived manifest agrees with the committed one on everything the
// archive determines.
{
  const regenerated = buildResolutionRows({ archive, registries: { actors: main.actors, organizations: main.organizations }, conflicts: manifest.main_wins.not_added });
  const rebuiltMentions = buildMentionRows({ archive, registries: { actors: main.actors, organizations: main.organizations }, resolutionRows: regenerated.rows });
  assert.equal(rebuiltMentions.length, mentions.length);
  const probe = buildManifest({
    main: { actors: Array(manifest.counts.base.actors), organizations: Array(manifest.counts.base.organizations), aliases: Array(manifest.counts.base.aliases) },
    archive, plan: { add: { actors: [], organizations: [], aliases: [] }, conflicts: manifest.main_wins.not_added, shared: manifest.main_wins.shared_rows_that_differ },
    registries: { actors: main.actors, organizations: main.organizations, aliases: main.aliases },
    resolutionRows: regenerated.rows, pendingResolutions: regenerated.pending, mentionRows: rebuiltMentions,
  });
  assert.deepEqual(probe.decisions, manifest.decisions);
  assert.deepEqual(probe.main_wins.not_added, manifest.main_wins.not_added);
}

// Loading the real main state exposes the legacy bridge the planner relies on.
assert.ok(loadMain('.').legacyNodes.some(node => node.id === 'alex-karp'), 'main still bridges Alex Karp from the legacy graph');
assert.ok(loadArchive('.').adjudications.length === 57);

console.log('lake-identity-merge.test: OK (hop edge set unchanged: 93 edges, same ids and bases; main-wins planning; 15 resolution rows + 2 pending; 104 frontier mentions; tamper checks)');
