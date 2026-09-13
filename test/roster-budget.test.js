import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

import { actorParticipants, groupDenseSurface, selectBudgetedParticipants } from '../src/roster-budget.js';

const surfaceGraph = JSON.parse(fs.readFileSync('build/surface-graph.json', 'utf8'));
const denseSurface = surfaceGraph.surfaces.find(s => s.surface_id === 'dialog-society-membership');

function reconcile(result) {
  return result.visible.length + result.hiddenByBudget + result.filteredOut;
}

// ---------------------------------------------------------------------------
// Real build/surface-graph.json fixture (dialog-society-membership)

test('the dialog-society-membership surface exists and is dense', () => {
  assert.ok(denseSurface, 'expected build/surface-graph.json to contain dialog-society-membership');
  assert.ok(actorParticipants(denseSurface).length > 100, 'expected a dense roster (>100 actor participants)');
});

test('groupDenseSurface groups sum exactly to the actor-participant total (real dense surface)', () => {
  const groups = groupDenseSurface(denseSurface);
  const total = actorParticipants(denseSurface).length;
  const sum = groups.reduce((acc, group) => acc + group.count, 0);
  assert.equal(sum, total);
  // Every group's participants array length must match its own count.
  for (const group of groups) assert.equal(group.participants.length, group.count);
  // Groups are sorted by descending count, then label.
  for (let i = 1; i < groups.length; i++) {
    assert.ok(
      groups[i - 1].count > groups[i].count ||
      (groups[i - 1].count === groups[i].count && groups[i - 1].label.localeCompare(groups[i].label) <= 0)
    );
  }
});

test('selectBudgetedParticipants on the real dense surface: honest accounting reconciles', () => {
  const result = selectBudgetedParticipants(denseSurface, { budget: 18 });
  assert.equal(result.totalActors, actorParticipants(denseSurface).length);
  assert.equal(result.eligibleCount, result.totalActors, 'no evidence floor or as-of filter is active, so every actor is eligible');
  assert.equal(result.filteredOut, 0, 'no query is active, so nothing is filtered out by query');
  assert.equal(reconcile(result), result.eligibleCount);
  assert.equal(result.visible.length, 18);
  assert.equal(result.hiddenByBudget, result.eligibleCount - 18);
});

test('selectBudgetedParticipants on the real dense surface is deterministic across repeated calls', () => {
  const first = selectBudgetedParticipants(denseSurface, { budget: 12, query: 'director' });
  const second = selectBudgetedParticipants(denseSurface, { budget: 12, query: 'director' });
  assert.deepEqual(first.visible.map(p => p.actor_id), second.visible.map(p => p.actor_id));
  assert.deepEqual(first, second);
});

test('selectBudgetedParticipants on the real dense surface: an evidence floor filters some actors out', () => {
  const open = selectBudgetedParticipants(denseSurface, { evidenceFloor: 'open', budget: 200 });
  const strict = selectBudgetedParticipants(denseSurface, { evidenceFloor: 'primary_public', budget: 200 });
  assert.ok(strict.eligibleCount < open.eligibleCount, 'a primary_public floor must exclude the reported-evidence actors present in this roster');
  assert.equal(reconcile(strict), strict.eligibleCount);
});

// ---------------------------------------------------------------------------
// Small synthetic fixtures

function makeSyntheticSurface() {
  return {
    surface_id: 'synthetic-roster',
    surface_label: 'Synthetic roster',
    participants: [
      { participant_type: 'actor', actor_id: 'p1', role: 'Minister for Widgets', participation_type: 'public_office', evidence_class: 'official', time_start: '2020', time_end: '2022', receipt_ids: ['r1'] },
      { participant_type: 'actor', actor_id: 'p2', role: 'Fund manager', participation_type: 'investor', evidence_class: 'primary_public', time_start: '2019', time_end: '', receipt_ids: ['r2'] },
      { participant_type: 'actor', actor_id: 'p3', role: 'Chief Executive Officer', participation_type: 'leadership', evidence_class: 'reported', time_start: '', time_end: '', receipt_ids: [] },
      { participant_type: 'actor', actor_id: 'p4', role: 'Research scientist', participation_type: 'staff', evidence_class: 'judgment', time_start: '2021-06', time_end: '2021-09', receipt_ids: [] },
      { participant_type: 'actor', actor_id: 'p5', role: 'Registered member', participation_type: 'roster_entry', evidence_class: 'open', time_start: '', time_end: '', receipt_ids: [] },
      { participant_type: 'actor', actor_id: 'p6', role: 'Unclassified role', participation_type: 'mystery', evidence_class: 'reported', time_start: '', time_end: '', receipt_ids: [] },
      { participant_type: 'organization', actor_id: null, role: 'Sponsor', participation_type: 'sponsor', evidence_class: 'reported' },
      { participant_type: 'actor', actor_id: '', role: 'Missing id', participation_type: 'other', evidence_class: 'open' },
    ],
  };
}

test('actorParticipants excludes non-actor participants and actors with no id', () => {
  const surface = makeSyntheticSurface();
  const actors = actorParticipants(surface);
  assert.equal(actors.length, 6);
  assert.ok(actors.every(p => p.participant_type === 'actor' && p.actor_id));
});

test('groupDenseSurface: synthetic roster group counts sum to the actor-participant total', () => {
  const surface = makeSyntheticSurface();
  const groups = groupDenseSurface(surface);
  const total = actorParticipants(surface).length;
  const sum = groups.reduce((acc, group) => acc + group.count, 0);
  assert.equal(sum, total);
  const byId = Object.fromEntries(groups.map(g => [g.id, g.count]));
  assert.equal(byId.public_office, 1); // p1: "minister"
  assert.equal(byId.capital, 1); // p2: "invest" / "fund"
  assert.equal(byId.leadership, 1); // p3: "chief" / "officer"
  assert.equal(byId.operators, 1); // p4: "research" / "staff"/"scientist"
  assert.equal(byId.listed_or_attending, 1); // p5: "member" / "register"
  assert.equal(byId.mystery, 1); // p6: falls back to its own participation_type
});

test('selectBudgetedParticipants: pinned actors are always visible even beyond budget', () => {
  const surface = makeSyntheticSurface();
  const result = selectBudgetedParticipants(surface, {
    budget: 2,
    pinnedIds: new Set(['p4', 'p5', 'p6']),
  });
  assert.equal(result.totalActors, 6);
  assert.equal(result.eligibleCount, 6);
  const visibleIds = new Set(result.visible.map(p => p.actor_id));
  assert.ok(visibleIds.has('p4') && visibleIds.has('p5') && visibleIds.has('p6'), 'all three pinned actors must be visible even though budget is 2');
  // Budget floor rises to the pinned count (3), so exactly 3 are visible: the 3 pins.
  assert.equal(result.visible.length, 3);
  assert.equal(reconcile(result), result.eligibleCount);
});

test('selectBudgetedParticipants: pins exceeding the nominal budget do not hide unrelated eligible actors incorrectly', () => {
  const surface = makeSyntheticSurface();
  // 4 pins, budget nominally 1: floor rises to 4 (all pins visible), remaining
  // budget for unpinned is 0.
  const result = selectBudgetedParticipants(surface, {
    budget: 1,
    pinnedIds: new Set(['p1', 'p2', 'p3', 'p4']),
  });
  assert.equal(result.visible.length, 4);
  assert.equal(result.hiddenByBudget, result.eligibleCount - 4);
  assert.equal(reconcile(result), result.eligibleCount);
});

test('selectBudgetedParticipants: evidence floor and as-of together filter, and the accounting reconciles', () => {
  const surface = makeSyntheticSurface();
  const result = selectBudgetedParticipants(surface, {
    evidenceFloor: 'primary_public', // ranks 0..2: excludes p3 (reported), p4 (judgment), p6 (reported); p5 (open) also excluded
    budget: 50,
  });
  // Eligible by evidence floor alone: p1 (official), p2 (primary_public).
  assert.equal(result.eligibleCount, 2);
  assert.equal(reconcile(result), 2);
  assert.deepEqual(result.visible.map(p => p.actor_id).sort(), ['p1', 'p2']);
});

test('selectBudgetedParticipants: as-of gates on window overlap, with no separate "undated" bucket', () => {
  const surface = makeSyntheticSurface();
  // p1: 2020-2022 (overlaps 2021). p4: 2021-06..2021-09 (overlaps 2021). Others
  // have empty time_start/time_end, which overlaps nothing under an active as-of.
  const result = selectBudgetedParticipants(surface, { asOf: '2021', budget: 50 });
  assert.deepEqual(result.visible.map(p => p.actor_id).sort(), ['p1', 'p4']);
  assert.equal(result.eligibleCount, 2);
  assert.equal(reconcile(result), 2);
});

test('selectBudgetedParticipants: query filtering is honestly counted in filteredOut, not silently dropped', () => {
  const surface = makeSyntheticSurface();
  const result = selectBudgetedParticipants(surface, { query: 'minister', budget: 50 });
  assert.equal(result.eligibleCount, 6, 'query does not affect eligibility, only which eligible actors are candidates');
  assert.deepEqual(result.visible.map(p => p.actor_id), ['p1']);
  assert.equal(result.filteredOut, 5);
  assert.equal(result.hiddenByBudget, 0);
  assert.equal(reconcile(result), result.eligibleCount);
});

test('selectBudgetedParticipants: a pinned actor bypasses the query filter (search-and-pin coexist)', () => {
  const surface = makeSyntheticSurface();
  const result = selectBudgetedParticipants(surface, {
    query: 'minister',
    pinnedIds: new Set(['p5']),
    budget: 50,
  });
  const visibleIds = result.visible.map(p => p.actor_id);
  assert.ok(visibleIds.includes('p5'), 'pinned actor must appear even though it does not match the query');
  assert.ok(visibleIds.includes('p1'), 'query match must still appear');
  // p5 no longer counts against filteredOut since it is a candidate (pinned).
  assert.equal(result.filteredOut, 4);
  assert.equal(reconcile(result), result.eligibleCount);
});

test('selectBudgetedParticipants: deterministic ordering — pinned, then evidence strength, then dated-ness, then label', () => {
  const surface = {
    surface_id: 'order-test',
    participants: [
      { participant_type: 'actor', actor_id: 'z-weak-undated', role: 'r', participation_type: 't', evidence_class: 'judgment', time_start: '', time_end: '' },
      { participant_type: 'actor', actor_id: 'a-weak-dated', role: 'r', participation_type: 't', evidence_class: 'judgment', time_start: '2020', time_end: '2020' },
      { participant_type: 'actor', actor_id: 'm-strong', role: 'r', participation_type: 't', evidence_class: 'confirmed', time_start: '', time_end: '' },
      { participant_type: 'actor', actor_id: 'pinned-weakest', role: 'r', participation_type: 't', evidence_class: 'open', time_start: '', time_end: '' },
    ],
  };
  const result = selectBudgetedParticipants(surface, {
    budget: 50,
    pinnedIds: new Set(['pinned-weakest']),
  });
  assert.deepEqual(result.visible.map(p => p.actor_id), ['pinned-weakest', 'm-strong', 'a-weak-dated', 'z-weak-undated']);
});

test('selectBudgetedParticipants: labels are used for query matching and tie-break ordering when provided', () => {
  const surface = {
    surface_id: 'label-test',
    participants: [
      { participant_type: 'actor', actor_id: 'id-1', role: 'r', participation_type: 't', evidence_class: 'confirmed' },
      { participant_type: 'actor', actor_id: 'id-2', role: 'r', participation_type: 't', evidence_class: 'confirmed' },
    ],
  };
  const labels = new Map([['id-1', 'Zoe Actor'], ['id-2', 'Amy Actor']]);
  const result = selectBudgetedParticipants(surface, { budget: 50, labels });
  assert.deepEqual(result.visible.map(p => p.actor_id), ['id-2', 'id-1']); // Amy before Zoe

  const queried = selectBudgetedParticipants(surface, { budget: 50, labels, query: 'zoe' });
  assert.deepEqual(queried.visible.map(p => p.actor_id), ['id-1']);
});

test('selectBudgetedParticipants tolerates an empty/missing surface', () => {
  const result = selectBudgetedParticipants(undefined);
  assert.deepEqual(result, { visible: [], eligibleCount: 0, hiddenByBudget: 0, filteredOut: 0, totalActors: 0 });
});

test('groupDenseSurface tolerates an empty/missing surface', () => {
  assert.deepEqual(groupDenseSurface(undefined), []);
  assert.deepEqual(groupDenseSurface({ participants: [] }), []);
});
