import assert from 'node:assert/strict';
import { combinations } from '../tools/lib/ledger.mjs';
import { deriveHopEdges, buildAdjacency, shortestPath } from '../tools/lib/hops.mjs';

// Gate 2.2 acceptance fixture (BUILD-INSTRUCTIONS 2.2, constitution 1.7:
// "Density discipline"). Acceptance criterion, quoted verbatim from
// BUILD-INSTRUCTIONS 2.2:
//   "a fixture proving a 100-member roster does not reduce median pairwise
//    Clifford Numbers below the value computed without it."
//
// This runs entirely on a SYNTHETIC in-memory ledger; it never touches real
// data under data/. Eight real actors are wired together by small, legitimately
// hop-eligible surfaces (population 2-4 each) so that every pairwise Clifford
// Number sits in 1..4. Then a 100-member directory_roster_surface that contains
// all eight (plus 92 filler actors) is added and DELIBERATELY marked
// hop_eligible: true, to prove the population guard alone stops it — the
// per-row flag is not trusted.

const BROAD_SURFACE_THRESHOLD = 20; // from data/canonical/surface-types.json density_rule
const REAL_ACTORS = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6', 'a7', 'a8'];

// Small hop-eligible surfaces: three overlapping triangles plus a dyad, chained
// a1..a8 through shared actors a3, a5, a7. Every surface population is 2..4.
function baseSurfaces() {
  return [
    surface('s1-triangle', ['a1', 'a2', 'a3']),
    surface('s2-triangle', ['a3', 'a4', 'a5']),
    surface('s3-triangle', ['a5', 'a6', 'a7']),
    surface('s4-dyad', ['a7', 'a8']),
  ];
}

function surface(id, actorIds) {
  return {
    surface: {
      surface_id: id,
      surface_label: id,
      surface_type: 'employment_investment_surface',
      hop_eligible: true,
      receipt_ids: [`r-${id}`],
    },
    participants: actorIds.map(actorId => ({
      surface_id: id,
      participant_type: 'actor',
      actor_id: actorId,
      role: 'member',
      evidence_class: 'official',
      receipt_ids: [`r-${id}`],
    })),
  };
}

// The 100-member roster: all eight real actors + 92 filler actors, on a
// directory_roster_surface, DELIBERATELY flagged hop_eligible: true.
function rosterSurface() {
  const filler = Array.from({ length: 92 }, (_, i) => `filler-${i + 1}`);
  const members = [...REAL_ACTORS, ...filler];
  assert.equal(members.length, 100, 'roster must have exactly 100 members');
  return {
    surface: {
      surface_id: 'directory-roster-100',
      surface_label: 'Directory Roster (100 members)',
      surface_type: 'directory_roster_surface',
      hop_eligible: true, // deliberate: the population guard must reject it anyway
      receipt_ids: ['r-roster'],
    },
    participants: members.map(actorId => ({
      surface_id: 'directory-roster-100',
      participant_type: 'actor',
      actor_id: actorId,
      role: 'listed',
      evidence_class: 'official',
      receipt_ids: ['r-roster'],
    })),
  };
}

function median(values) {
  const sorted = [...values].sort((x, y) => x - y);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// Derive the hop graph from a list of {surface, participants} entries and return
// the median pairwise Clifford Number over the eight real actors, plus the
// builder's rejectedHopSurfaces for inspection.
function computeOverRealActors(entries, broadSurfaceThreshold) {
  const surfaces = entries.map(e => e.surface);
  const participationBySurface = new Map();
  for (const e of entries) participationBySurface.set(e.surface.surface_id, e.participants);

  const { edges, rejectedHopSurfaces } = deriveHopEdges({
    surfaces,
    participationBySurface,
    broadOrgIds: new Set(),
    broadSurfaceThreshold,
  });
  const adjacency = buildAdjacency(edges);

  const numbers = [];
  for (const [a, b] of combinations(REAL_ACTORS)) {
    const { number } = shortestPath(adjacency, a, b);
    assert.notEqual(number, null, `real actors ${a} and ${b} must be connected`);
    assert.ok(number >= 1 && number <= 4, `pairwise Clifford Number ${a}-${b} = ${number} must be in 1..4`);
    numbers.push(number);
  }
  return { median: median(numbers), rejectedHopSurfaces };
}

// (a) Median pairwise Clifford Number over the 8 real actors WITHOUT the roster.
const without = computeOverRealActors(baseSurfaces(), BROAD_SURFACE_THRESHOLD);

// (b) Median WITH the roster surface included, guard active (threshold 20).
const withRoster = computeOverRealActors([...baseSurfaces(), rosterSurface()], BROAD_SURFACE_THRESHOLD);

// (c) Acceptance criterion (BUILD-INSTRUCTIONS 2.2): "a fixture proving a
// 100-member roster does not reduce median pairwise Clifford Numbers below the
// value computed without it." The two medians must be EQUAL — the roster added
// zero edges because the density guard rejected it.
assert.equal(withRoster.median, without.median,
  `roster must not reduce median pairwise Clifford Number: with=${withRoster.median} without=${without.median}`);

// (d) The roster must be visibly rejected for population, not silently ignored.
const rejected = withRoster.rejectedHopSurfaces.find(r => r.surface_id === 'directory-roster-100');
assert.ok(rejected, 'roster surface must appear in rejectedHopSurfaces');
assert.equal(rejected.reason, 'population_exceeds_density_threshold',
  `roster rejection reason must be population_exceeds_density_threshold, got ${rejected.reason}`);
assert.equal(rejected.population, 100, `roster rejected population must be 100, got ${rejected.population}`);

// (e) Control: with the guard disabled (threshold Infinity), the roster is a
// legitimate hop basis and directly connects all eight actors, collapsing every
// pairwise distance to 1. The median must DROP below the guarded value — this
// proves the fixture has teeth (without the guard the roster genuinely shortens
// paths), so the equality in (c) is a real property of the guard, not an artifact.
const noGuard = computeOverRealActors([...baseSurfaces(), rosterSurface()], Infinity);
assert.ok(noGuard.median < without.median,
  `control: without the guard the roster must shorten paths (median ${noGuard.median} < ${without.median})`);

console.log(`density.test: median without roster = ${without.median}, with roster (guarded) = ${withRoster.median}, control without guard = ${noGuard.median}`);
console.log('density.test: OK');
