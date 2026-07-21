import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  computeCorridors,
  diagnosePathFilters,
  periodBounds,
  selectBudgetedParticipants,
  semanticLevelForScale,
  shortestFilteredPath,
  summarizeClusters
} from '../src/visual-aperture-core.mjs';

const actors = [
  ['actor-a', 'Actor A'], ['actor-b', 'Actor B'], ['actor-c', 'Actor C'],
  ['anchor', 'Anchor'], ...Array.from({ length: 12 }, (_, index) => [`roster-${index + 1}`, `Roster ${index + 1}`])
].map(([id, label]) => ({ id, label }));

const participation = (surfaceId, actorId, role, evidence = 'official', start = '2024-01', end = '2024-12') => ({
  surface_id: surfaceId,
  participant_type: 'actor',
  actor_id: actorId,
  role,
  participation_type: role.toLowerCase().replace(/\s+/g, '_'),
  time_start: start,
  time_end: end,
  evidence_class: evidence,
  receipt_ids: [`receipt-${surfaceId}-${actorId}`]
});

const surfaceGraph = {
  actors,
  surfaces: [
    {
      surface_id: 'policy-board-2024', surface_label: 'Policy Board, 2024', surface_type: 'government_advisory_surface',
      hop_eligible: true, time_start: '2024', time_end: '2024', receipt_ids: ['receipt-policy-board'],
      participants: [participation('policy-board-2024', 'actor-a', 'Member'), participation('policy-board-2024', 'actor-b', 'Chair')]
    },
    {
      surface_id: 'venture-round-2024', surface_label: 'Venture Round, 2024', surface_type: 'capital_surface',
      hop_eligible: true, time_start: '2024', time_end: '2024', receipt_ids: ['receipt-venture-round'],
      participants: [participation('venture-round-2024', 'actor-b', 'Investor', 'primary_public'), participation('venture-round-2024', 'anchor', 'Founder', 'primary_public')]
    },
    {
      surface_id: 'conference-roster-2024', surface_label: 'Conference Roster, 2024', surface_type: 'event_roster_surface',
      hop_eligible: false, time_start: '2024-06', time_end: '2024-06', receipt_ids: ['receipt-roster'],
      participants: Array.from({ length: 12 }, (_, index) => participation(
        'conference-roster-2024', `roster-${index + 1}`,
        index < 3 ? 'Public official' : index < 7 ? 'Company leader' : 'Listed participant',
        index === 11 ? 'reported' : 'primary_public', '2024-06', '2024-06'
      ))
    },
    {
      surface_id: 'product-council-2023', surface_label: 'Product Council, 2023', surface_type: 'company_board_surface',
      hop_eligible: true, time_start: '2023', time_end: '2023', receipt_ids: ['receipt-product'],
      participants: [participation('product-council-2023', 'actor-a', 'Adviser', 'reported', '2023', '2023'), participation('product-council-2023', 'actor-c', 'Executive', 'reported', '2023', '2023')]
    }
  ]
};

const hopGraph = {
  anchor_actor_id: 'anchor',
  edges: [
    {
      actor_a: 'actor-a', actor_b: 'actor-b', surfaces: [{
        surface_id: 'policy-board-2024', surface_label: 'Policy Board, 2024', surface_type: 'government_advisory_surface',
        actor_a_role: 'Member', actor_b_role: 'Chair', evidence_class: 'official',
        valid_from: '2024-01-01', valid_until: '2024-12-31', temporal_status: 'dated', receipt_ids: ['receipt-policy-board']
      }]
    },
    {
      actor_a: 'actor-b', actor_b: 'anchor', surfaces: [{
        surface_id: 'venture-round-2024', surface_label: 'Venture Round, 2024', surface_type: 'capital_surface',
        actor_a_role: 'Investor', actor_b_role: 'Founder', evidence_class: 'primary_public',
        valid_from: '2024-04-01', valid_until: '2024-12-31', temporal_status: 'dated', receipt_ids: ['receipt-venture-round']
      }]
    },
    {
      actor_a: 'actor-a', actor_b: 'actor-c', surfaces: [{
        surface_id: 'product-council-2023', surface_label: 'Product Council, 2023', surface_type: 'company_board_surface',
        actor_a_role: 'Adviser', actor_b_role: 'Executive', evidence_class: 'reported',
        valid_from: '2023-01-01', valid_until: '2023-12-31', temporal_status: 'dated', receipt_ids: ['receipt-product']
      }]
    },
    {
      actor_a: 'actor-c', actor_b: 'anchor', surfaces: [{
        surface_id: 'undated-surface', surface_label: 'Undated Surface', surface_type: 'forum_surface',
        actor_a_role: 'Listed', actor_b_role: 'Listed', evidence_class: 'reported',
        valid_from: null, valid_until: null, temporal_status: 'undated', receipt_ids: ['receipt-undated']
      }]
    }
  ]
};

assert.deepEqual(periodBounds('2024-02'), { start: '2024-02-01', end: '2024-02-29' });
assert.equal(periodBounds('2024-02-31'), null);
assert.equal(periodBounds('2024-13'), null);

let previous = 'corpus';
previous = semanticLevelForScale(1.46, previous);
assert.equal(previous, 'corpus', 'hysteresis should prevent a one-pixel semantic jump');
previous = semanticLevelForScale(1.7, previous);
assert.equal(previous, 'machine');
previous = semanticLevelForScale(1.43, previous);
assert.equal(previous, 'machine', 'reverse hysteresis should retain the current representation');
previous = semanticLevelForScale(1.1, previous);
assert.equal(previous, 'corpus');
assert.equal(semanticLevelForScale(4.4, 'surface'), 'evidence');

const clusters = summarizeClusters(surfaceGraph);
assert.ok(clusters.some(cluster => cluster.id === 'policy' && cluster.surfaceCount === 1));
assert.ok(clusters.some(cluster => cluster.id === 'capital' && cluster.surfaceCount === 1));
assert.ok(clusters.some(cluster => cluster.id === 'forums' && cluster.actorCount === 12));
assert.ok(computeCorridors(surfaceGraph).some(corridor => corridor.from === 'capital' && corridor.to === 'policy' && corridor.actorCount === 1));

const route = shortestFilteredPath(hopGraph, 'actor-a', 'anchor', { asOf: '2024', evidenceFloor: 'primary_public' });
assert.equal(route.number, 2);
assert.deepEqual(route.actorPath, ['actor-a', 'actor-b', 'anchor']);
assert.deepEqual(route.hops.map(hop => hop.basis.surface_id), ['policy-board-2024', 'venture-round-2024']);
assert.equal(shortestFilteredPath(hopGraph, 'actor-a', 'anchor', { asOf: '2023', evidenceFloor: 'primary_public' }), null);
assert.equal(shortestFilteredPath(hopGraph, 'actor-a', 'anchor', { asOf: '2024', evidenceFloor: 'official' }), null);

const diagnostics = diagnosePathFilters(hopGraph, { asOf: '2024', evidenceFloor: 'primary_public' });
assert.equal(diagnostics.totalEdges, 4);
assert.equal(diagnostics.traversableEdges, 2);
assert.ok(diagnostics.evidenceBlockedBases >= 2);
assert.ok(diagnostics.undatedBlockedBases >= 0);

const dense = surfaceGraph.surfaces.find(surface => surface.surface_id === 'conference-roster-2024');
const labels = new Map(actors.map(actor => [actor.id, actor.label]));
const pinned = selectBudgetedParticipants(dense, { budget: 4, pinnedIds: new Set(['roster-12']), labels });
assert.equal(pinned.visible.length, 4);
assert.equal(pinned.visible[0].actor_id, 'roster-12');
assert.equal(pinned.totalActors, 12);
assert.equal(pinned.hiddenByBudget, 8);

const searched = selectBudgetedParticipants(dense, { query: 'Public official', budget: 12, labels });
assert.equal(searched.visible.length, 3);
assert.ok(searched.visible.every(item => item.role === 'Public official'));
assert.equal(searched.filteredOut, 9);

const uiEntry = readFileSync('src/visual-aperture.js', 'utf8');
const ui = Array.from({ length: 11 }, (_, index) => index + 1).map(index => readFileSync(`src/visual-aperture-part-${index}.js`, 'utf8')).join('\n');
const css = ['layout', 'svg', 'responsive'].map(part => readFileSync(`src/visual-aperture-${part}.css`, 'utf8')).join('\n');
const core = readFileSync('src/visual-aperture-core.mjs', 'utf8');

assert.match(uiEntry, /visual-aperture-part-\$\{index \+ 1\}\.js/);
assert.match(ui, /readData\('build\/surface-graph\.json'\)/);
assert.match(ui, /readData\('build\/hop-graph\.json'\)/);
assert.match(ui, /readData\('build\/receipt-graph\.json'\)/);
assert.doesNotMatch(ui, /sampleData|fixture/i, 'the public aperture must not have an authored fallback fixture');
assert.match(ui, /actor → bounded surface → actor/);
assert.match(ui, /no pairwise lines|manufacturing pairwise adjacency/i);
assert.match(ui, /data-open-receipt/);
assert.match(ui, /diagnosePathFilters/);
assert.match(ui, /selectBudgetedParticipants/);
assert.match(core, /semanticLevelForScale/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /\.aperture-inspector\.is-open/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /\.aperture-overview table/);

console.log('visual-aperture.test.js: OK');
