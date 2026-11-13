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
// Scope (narrowed 2026-10-23): BEFORE describes the merge base and still pins
// it. The rule it protects is that the evidence-lake registry merge moved no
// hop edge and no research-graph edge. Until 2026-10-23 "current graph ==
// merge base" was an exact proxy for that; the 2026-10-23 promotion is a
// deliberate admission that added edges, so the proxy no longer holds. The
// rule is now checked directly: every merge-base edge survives byte-for-byte,
// and no edge (old or new) touches a row the merge added (see the endpoint
// check in section 3). The current edge set is pinned separately below.
const CURRENT = Object.freeze({
  edge_count: 314, // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 308 -> 314 (the six pairs among Sneha Revanur, Sunny Gandhi, Adam Billen and Nathan Calvin). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 297 -> 308 (the ten pairs among Inherent's four co-founders and Matt Clifford, and Ben Buchanan-Tantum Collins). 2026-11-10 lens-hunt promotion: 280 -> 297 (Black-Clifford, Clark-Clifford, the 15 UKSA Challenge Panel pairs; SAGE 17 adds a basis to the existing Ben Warner-Marc Warner edge). 2026-10-23 final re-pin: 299 -> 280 (five year-only a16z American Dynamism 2022 session surfaces set hop_eligible false, reason year_precision_only; the Form D person-row merge removes duplicate bases, not edges). 2026-10-23 five-lane merge: 133 -> 299 (fund-portfolios, conventions, capital-factory, uk-public-money, synthetic-constituency). 2026-10-23 promotion: 93 -> 133 hop edges (Stratos, Traysar, Pallas team-page bases)
  edge_id_sha256: '8d14dd050e0d76885a564c9015923f079f4a1c7720a287cb6132580fbf35ffa2', // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster) (was 12634502…). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship") (was 75d1b9f0…). 2026-11-10 lens-hunt promotion (was 94660c2d…). 2026-10-23 final re-pin (was bf7e8fa2…).  2026-10-23 five-lane merge (was 2626c63a… after the 2026-10-23 promotion)
  edges_sha256: '6683acede76344f72926f5fb2c0aff9780d0070409465b7361c9a6e20de1ccb0', // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster) (was ff9a6d81…). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship") (was bd30fd4e…). 2026-11-10 lens-hunt promotion (was c428a4b3…). 2026-10-23 final re-pin (was 50589dd4…).  2026-10-23 five-lane merge (was 141b236b… after the 2026-10-23 promotion)
  rejected_hop_surfaces: 3782, // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 3,783 -> 3,782 (the roster is a hop base). 2026-11-13 amplification chain: 3765 -> 3783 (the 18 surfaces of the lane, every one hop_eligible false; the edge count and both edge hashes are unchanged). 2026-11-12 UK meetings, second intake: 3694 -> 3765 (the 71 second-intake meeting surfaces, every one hop_eligible false; the edge count and both edge hashes are unchanged). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 3696 -> 3694 (the two ruled surfaces are hop bases). 2026-11-12 UK contract awards: 2308 -> 3696 (the 1,388 award surfaces, every one hop_eligible false; the edge count and both edge hashes are unchanged). 2026-11-12 Bitter Struggle chain: 2277 -> 2308 (the 31 surfaces of the lane, every one hop_eligible false; the edge count and both edge hashes are unchanged). 2026-11-12 UK ministerial meetings: 2199 -> 2277 (the 78 meetings-register surfaces, every one hop_eligible false; the edge count and both edge hashes are unchanged). 2026-11-10 hand-judged Form D filings: 1683 -> 2199 (the 516 hand-judged Form D surfaces, every one hop_eligible false; the edge count and both edge hashes are unchanged). 2026-11-10 Form D data sets: 1245 -> 1683 (the 438 data-set Form D surfaces, every one hop_eligible false; the edge count and both edge hashes are unchanged). 2026-11-10 follow-up: 1244 -> 1245 (the Voyager signatories' surface, hop_eligible false). 2026-11-10 one-pass entry: 1097 -> 1244 (the 147 surfaces of the two lanes, every one hop_eligible false; the edge count and both edge hashes are unchanged). 2026-11-10 lens-hunt promotion: 1096 -> 1097 (four SAGE surfaces added, three single-actor; the summit and AI Growth Zones surfaces leave the refused set). 2026-10-23 final re-pin: 1091 -> 1096 (the five year-only a16z 2022 surfaces). 2026-10-23 five-lane merge: 836 -> 1091. 2026-10-23 promotion: 35 -> 836 (single-person LinkedIn role surfaces create no hop)
  rejected_hop_pairs: 0,
  research_edges: 11441, // 2026-11-13 amplification chain: 11397 -> 11441 (one research-graph edge per new participation row, 44 rows). 2026-11-12 UK meetings, second intake: 11069 -> 11397 (one research-graph edge per participant and surface: the 579 rows give 328, since repeat meetings with one entity on one return share an edge). 2026-11-12 UK contract awards: 8272 -> 11069 (one research-graph edge per new participation row, 2,797 rows). 2026-11-12 Bitter Struggle chain: 8141 -> 8272 (one research-graph edge per new participation row, 131 rows). 2026-11-12 UK ministerial meetings: 7319 -> 8141 (one research-graph edge per participant and surface: the 1,440 rows give 822, since repeat meetings with one entity on one return share an edge and the dense DSIT return for October to December 2025 is contained). 2026-11-10 hand-judged Form D filings: 6266 -> 7319 (one research-graph edge per new participation row, 1,053 rows). 2026-11-10 Form D data sets: 4970 -> 6266 (one research-graph edge per new participation row, 1,296 rows). 2026-11-10 follow-up: 4831 -> 4970 (139 more participation rows). 2026-11-10 one-pass entry: 4506 -> 4831 (one research-graph edge per new participation row, 325 rows). 2026-11-10 lens-hunt promotion: 4487 -> 4506. 2026-10-23 final re-pin: 4467 -> 4487 (the eight surfaces the privacy guard no longer holds back add topology edges). 2026-10-23 five-lane merge: 3216 -> 4467. 2026-10-23 promotion: 392 -> 3216 research-graph edges
});

const hopGraph = readJson('build/hop-graph.json');
const after = hopEdgeFingerprint(hopGraph);
assert.equal(after.edge_count, CURRENT.edge_count, 'hop edge count must match the last deliberate admission');
assert.equal(after.edge_id_sha256, CURRENT.edge_id_sha256, 'sorted hop edge ids must match the last deliberate admission');
assert.equal(after.edges_sha256, CURRENT.edges_sha256, 'hop bases, roles, windows and receipts must match the last deliberate admission');
assert.equal(hopGraph.rejected_hop_surfaces.length, CURRENT.rejected_hop_surfaces);
assert.equal(hopGraph.rejected_hop_pairs.length, CURRENT.rejected_hop_pairs);

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
  // Narrowed 2026-10-23: was assert.deepEqual(after, before) (current == base).
  // Now: every merge-base hop edge survives with every one of its bases unchanged
  // (same pair, bases, roles, windows, receipts); later admissions may only add
  // edges or add bases to an edge. Narrowed again 2026-11-10: the SAGE 17
  // attendee list adds a second basis to the merge-base Ben Warner-Marc Warner
  // edge, which moves that edge's derived surface_count, evidence_weight and
  // temporal envelope but removes or alters no merge-base basis.
  const current = new Map(hopGraph.edges.map(edge => [`${edge.actor_a}||${edge.actor_b}`, edge]));
  for (const edge of baseHopGraph.edges) {
    const key = `${edge.actor_a}||${edge.actor_b}`;
    assert.ok(current.has(key), `merge-base hop edge ${key} must survive`);
    const now = current.get(key);
    const nowBases = new Set(now.surfaces.map(basis => JSON.stringify(basis)));
    for (const basis of edge.surfaces) assert.ok(nowBases.has(JSON.stringify(basis)), `merge-base hop edge ${key} basis ${basis.surface_id} must be unchanged`);
    if (now.surfaces.length === edge.surfaces.length) assert.equal(JSON.stringify(now), JSON.stringify(edge), `merge-base hop edge ${key} must be unchanged`);
  }
}

// The research graph gains overlay nodes for new registry rows but no edge.
// Narrowed 2026-10-23: was research.edges.length === 392 with a fixed hash
// (registry growth was the only change since the merge). Now: the 392
// merge-era edges are all still present by id and unchanged,
// and no research-graph edge touches a row the registry merge added.
const research = readJson('graph.json');
assert.equal(research.edges.length, CURRENT.research_edges, 'research-graph edge count must match the last deliberate admission');
{
  const lakeAdded = (() => { const m = readJson('data/canonical/lake-identity-merge.json'); return new Set([...m.added.actors, ...m.added.organizations]); })();
  assert.ok(research.edges.every(edge => !lakeAdded.has(edge.from) && !lakeAdded.has(edge.to)), 'registry growth must not add a research-graph edge');
  let baseResearch = null;
  try {
    baseResearch = JSON.parse(execFileSync('git', ['show', `${BASE_COMMIT}:graph.json`], {
      encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'],
    }));
  } catch { /* base commit not present in this checkout */ }
  if (baseResearch) {
    assert.equal(baseResearch.edges.length, BEFORE_RESEARCH_EDGES.count);
    assert.equal(createHash('sha256').update(JSON.stringify(baseResearch.edges)).digest('hex'), BEFORE_RESEARCH_EDGES.sha256);
    const byId = new Map(research.edges.map(edge => [edge.id, edge]));
    // 2026-11-10 lens-hunt promotion (on the owner's go-ahead of that day): the AI Safety Summit appointment surface was
    // re-admitted as a two-person joint appointment, so its topology rows carry the new surface label in
    // their derived claim and cite the archived GOV.UK page beside the original extract. On that surface
    // only, the claim may change and source_ids may grow; every other field and every original receipt holds.
    const READMITTED = new Set(['ai-safety-summit-representative-appointment-2023-08-10']);
    for (const edge of baseResearch.edges) {
      const now = byId.get(edge.id);
      if (!READMITTED.has(edge.canonical_surface_id)) {
        assert.equal(JSON.stringify(now), JSON.stringify(edge), `merge-base research edge ${edge.id} must survive unchanged`);
        continue;
      }
      assert.ok(now, `merge-base research edge ${edge.id} must survive`);
      const strip = ({ claim, source_ids, ...rest }) => JSON.stringify(rest);
      assert.equal(strip(now), strip(edge), `merge-base research edge ${edge.id} may change only its claim and add receipts`);
      for (const id of edge.source_ids) assert.ok(now.source_ids.includes(id), `merge-base research edge ${edge.id} must keep receipt ${id}`);
    }
  }
}

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

console.log(`lake-identity-merge.test: OK (all 93 merge-base hop edges keep their bases unchanged, ${CURRENT.edge_count} current; no edge touches a merged row; main-wins planning; 15 resolution rows + 2 pending; 104 frontier mentions; tamper checks)`);
