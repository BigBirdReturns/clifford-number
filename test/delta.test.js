import assert from 'node:assert/strict';
import { diffCompiles, renderMarkdown, isEmpty } from '../tools/delta.mjs';

// Two small in-memory hop-graph compiles exercising every delta category:
//   - new hop pair            (carol||dave, brand-new edge)
//   - removed basis           (alice||bob loses old-shared-surface)
//   - window_closed           (alice||bob keep-surface: open valid_until dated)
//   - evidence upgrade        (alice||bob keep-surface: reported -> official)
//   - receipt gained          (alice||bob keep-surface: +r-new)
//   - rejection change        (roster-surface enters rejected_hop_surfaces)
// The FROM compile carries a surface-graph so surface labels/receipts resolve;
// the TO compile omits it, proving the union-of-bases fallback also works.

const fromCompile = {
  id: 'REF_FROM',
  source: 'test',
  hop: {
    generated: '2026-01-01T00:00:00.000Z',
    case: 'synthetic',
    edges: [
      {
        actor_a: 'alice', actor_b: 'bob',
        surfaces: [
          {
            surface_id: 'keep-surface', surface_label: 'Shared advisory',
            surface_type: 'government_advisory_surface',
            actor_a_role: 'member', actor_b_role: 'member',
            evidence_class: 'reported',
            receipt_ids: ['r-old'],
            valid_from: '2019-01-01', valid_until: null,
            temporal_status: 'dated',
          },
          {
            surface_id: 'old-shared-surface', surface_label: 'Legacy co-presence',
            surface_type: 'directory_roster_surface',
            actor_a_role: 'listed', actor_b_role: 'listed',
            evidence_class: 'reported',
            receipt_ids: ['r-legacy'],
            valid_from: '2015-01-01', valid_until: '2016-12-31',
            temporal_status: 'dated',
          },
        ],
      },
    ],
    rejected_hop_surfaces: [],
  },
  surface: {
    surfaces: [
      { surface_id: 'keep-surface', surface_label: 'Shared advisory', receipt_ids: ['r-old'] },
      { surface_id: 'old-shared-surface', surface_label: 'Legacy co-presence', receipt_ids: ['r-legacy'] },
    ],
    actors: [
      { id: 'alice', label: 'Alice A' },
      { id: 'bob', label: 'Bob B' },
      { id: 'carol', label: 'Carol C' },
      { id: 'dave', label: 'Dave D' },
    ],
  },
};

const toCompile = {
  id: 'REF_TO',
  source: 'test',
  hop: {
    generated: '2026-06-01T00:00:00.000Z',
    case: 'synthetic',
    edges: [
      {
        actor_a: 'alice', actor_b: 'bob',
        surfaces: [
          {
            surface_id: 'keep-surface', surface_label: 'Shared advisory',
            surface_type: 'government_advisory_surface',
            actor_a_role: 'member', actor_b_role: 'member',
            evidence_class: 'official',                 // upgrade: reported -> official
            receipt_ids: ['r-old', 'r-new'],            // receipt gained: r-new
            valid_from: '2019-01-01', valid_until: '2024-12-31', // window closed
            temporal_status: 'dated',
          },
          // old-shared-surface removed -> removed_bases
        ],
      },
      {
        actor_a: 'carol', actor_b: 'dave',              // new hop pair
        surfaces: [
          {
            surface_id: 'new-pair-surface', surface_label: 'Fresh company surface',
            surface_type: 'founder_officer_surface',
            actor_a_role: 'director', actor_b_role: 'director',
            evidence_class: 'primary_public',
            receipt_ids: ['r-pair'],
            valid_from: '2023-01-01', valid_until: null,
            temporal_status: 'dated',
          },
        ],
      },
    ],
    // roster-surface newly rejected by the density rule
    rejected_hop_surfaces: [
      { surface_id: 'roster-surface', reason: 'population_exceeds_density_threshold', population: 42, threshold: 20 },
    ],
  },
  // no surface-graph on purpose: labels/receipts fall back to the bases.
};

const diff = diffCompiles(fromCompile, toCompile, { caseId: 'synthetic' });

// --- categorization ---
assert.equal(isEmpty(diff), false, 'a non-trivial diff must not be empty');
assert.equal(diff.case, 'synthetic');
assert.equal(diff.from.generated, '2026-01-01T00:00:00.000Z');
assert.equal(diff.to.generated, '2026-06-01T00:00:00.000Z');

// new hop pair
assert.equal(diff.new_hop_pairs.length, 1, 'one new hop pair');
assert.equal(diff.new_hop_pairs[0].pair, 'carol||dave');
assert.equal(diff.new_hop_pairs[0].bases[0].surface_id, 'new-pair-surface');
assert.equal(diff.removed_hop_pairs.length, 0);

// removed basis (pair survived, one surface dropped)
assert.equal(diff.removed_bases.length, 1, 'one removed basis');
assert.equal(diff.removed_bases[0].surface_id, 'old-shared-surface');
assert.equal(diff.removed_bases[0].pair, 'alice||bob');
assert.equal(diff.new_bases.length, 0, 'no new bases on surviving pairs');

// window_closed on keep-surface
assert.equal(diff.window_changes.length, 1, 'one window change');
const wc = diff.window_changes[0];
assert.equal(wc.surface_id, 'keep-surface');
assert.ok(wc.classifications.some(c => c.type === 'window_closed'), 'must classify as window_closed');
assert.equal(wc.to.valid_until, '2024-12-31');

// evidence upgrade reported -> official (official is stronger => moved UP)
assert.equal(diff.evidence_changes.length, 1, 'one evidence change');
const ec = diff.evidence_changes[0];
assert.equal(ec.from_evidence, 'reported');
assert.equal(ec.to_evidence, 'official');
assert.equal(ec.direction, 'upgraded', 'reported -> official is an upgrade (lower weight = stronger)');
assert.ok(ec.to_weight < ec.from_weight, 'upgrade means the evidence weight fell');

// receipt gained
assert.equal(diff.receipt_changes.length, 1, 'one receipt change');
const rc = diff.receipt_changes[0];
assert.deepEqual(rc.gained, ['r-new']);
assert.deepEqual(rc.lost, []);
assert.ok(rc.receipt_ids.includes('r-new') && rc.receipt_ids.includes('r-old'), 'receipts in effect carry both ids');

// rejection change (density rule)
assert.equal(diff.rejection_changes.entering.length, 1, 'one surface entered the rejected set');
assert.equal(diff.rejection_changes.entering[0].surface_id, 'roster-surface');
assert.equal(diff.rejection_changes.entering[0].reason, 'population_exceeds_density_threshold');
assert.equal(diff.rejection_changes.leaving.length, 0);

// surfaces union: new-pair-surface & roster-surface appear only in TO; but the
// TO compile has no surface-graph, so the surface set is the union of bases
// (roster-surface is rejected, not a basis, so it is NOT a "new surface").
const newSurfaceIds = diff.new_surfaces.map(s => s.surface_id);
assert.ok(newSurfaceIds.includes('new-pair-surface'), 'new-pair-surface is a new surface');
assert.deepEqual(diff.removed_surfaces.map(s => s.surface_id), ['old-shared-surface']);

// --- markdown renderer mentions every category WITH its receipts ---
const md = renderMarkdown(diff);
function mentions(substr) { assert.ok(md.includes(substr), `markdown must mention: ${substr}`); }
mentions('New hop pairs');
mentions('Carol C and Dave D');       // resolved actor labels
mentions('r-pair');                    // new pair receipts
mentions('Removed bases');
mentions('Legacy co-presence');
mentions('r-legacy');                  // removed basis receipts
mentions('Window changes');
mentions('window closed');
mentions('Evidence changes');
mentions('reported → official');
mentions('moved UP the evidence ladder');
mentions('Receipt changes');
mentions('gained r-new');
mentions('r-old, r-new');              // receipts in effect
mentions('Rejection changes');
mentions('roster-surface');
mentions('density rule');              // the density-rejection is called out as a story
mentions('New surfaces');
mentions('Fresh company surface');
mentions('documented co-presence, nothing more'); // shared disclaimer

// --- empty delta is a report, never an error ---
const emptyDiff = diffCompiles(fromCompile, fromCompile, { caseId: 'synthetic' });
assert.equal(isEmpty(emptyDiff), true, 'a compile against itself is empty');
assert.ok(renderMarkdown(emptyDiff).includes('no changes between these compiles'),
  'empty delta renders the no-changes line');

console.log('delta.test: OK');
