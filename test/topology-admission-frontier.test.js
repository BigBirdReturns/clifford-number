import assert from 'node:assert/strict';
import { analyzeTopologyAdmissionFrontier } from '../tools/build-topology-admission-frontier.mjs';

function fixture() {
  return {
    generated: '2026-08-13T00:00:00.000Z',
    actors: [
      { id: 'actor-a' },
      { id: 'actor-b' },
      { id: 'actor-c' },
    ],
    organizations: [{ id: 'organization-x' }],
    surfaces: [
      {
        surface_id: 'bounded-event',
        surface_label: 'Bounded event',
        surface_type: 'event_surface',
        hop_eligible: true,
        receipt_ids: ['receipt-event'],
        evidence_class: 'official',
        time_start: '2026-01-01',
        time_end: '2026-01-01',
      },
      {
        surface_id: 'organization-context',
        surface_label: 'Organization context',
        surface_type: 'institution_surface',
        hop_eligible: false,
        receipt_ids: ['receipt-organization'],
      },
    ],
    participation: [
      {
        surface_id: 'bounded-event',
        participant_type: 'actor',
        actor_id: 'actor-a',
        receipt_ids: ['receipt-a'],
      },
      {
        surface_id: 'bounded-event',
        participant_type: 'actor',
        actor_id: 'actor-b',
        receipt_ids: ['receipt-b'],
      },
      {
        surface_id: 'bounded-event',
        participant_type: 'organization',
        organization_id: 'organization-x',
        receipt_ids: ['receipt-organization'],
      },
      {
        surface_id: 'organization-context',
        participant_type: 'organization',
        organization_id: 'organization-x',
        receipt_ids: ['receipt-organization'],
      },
    ],
    hopGraph: {
      edges: [
        {
          actor_a: 'actor-a',
          actor_b: 'actor-b',
          surfaces: [
            {
              surface_id: 'bounded-event',
              receipt_ids: ['receipt-event', 'receipt-a', 'receipt-b'],
              actor_a_participation: {
                actor_id: 'actor-a',
                role: null,
                participation_type: null,
                evidence_class: null,
                window: { valid_from: null, valid_until: null, dated: false },
                receipt_ids: ['receipt-a'],
              },
              actor_b_participation: {
                actor_id: 'actor-b',
                role: null,
                participation_type: null,
                evidence_class: null,
                window: { valid_from: null, valid_until: null, dated: false },
                receipt_ids: ['receipt-b'],
              },
            },
          ],
        },
      ],
      rejected_hop_surfaces: [],
      rejected_hop_pairs: [],
    },
  };
}

const valid = analyzeTopologyAdmissionFrontier(fixture());
assert.deepEqual(valid.errors, []);
assert.equal(valid.report.counts.admitted_surfaces, 1);
assert.equal(valid.report.counts.context_only_surfaces_without_explicit_refusal, 1);
assert.equal(valid.report.counts.expected_actor_pair_bases, 1);
assert.equal(valid.report.counts.compiled_actor_pair_bases, 1);
assert.equal(valid.report.counts.temporally_refused_actor_pairs, 0);
assert.equal(valid.report.counts.covered_actor_pair_bases, 1);
assert.equal(valid.report.counts.missing_actor_pair_bases, 0);
assert.deepEqual(valid.report.admitted_surfaces[0].actor_ids, ['actor-a', 'actor-b']);
assert.deepEqual(valid.report.admitted_surfaces[0].organization_ids, ['organization-x']);
assert.equal(valid.report.admitted_surfaces[0].compiled_actor_pair_count, 1);
assert.equal(valid.report.context_only_surfaces_without_explicit_refusal[0].actor_count, 0);

const temporalRefusal = fixture();
temporalRefusal.hopGraph.edges = [];
temporalRefusal.hopGraph.rejected_hop_pairs = [
  {
    surface_id: 'bounded-event',
    actor_a: 'actor-a',
    actor_b: 'actor-b',
    reason: 'no_temporal_overlap',
    actor_a_window: {
      valid_from: '2026-01-01',
      valid_until: '2026-01-01',
      dated: true,
    },
    actor_b_window: {
      valid_from: '2026-01-02',
      valid_until: '2026-01-02',
      dated: true,
    },
    surface_window: {
      valid_from: '2026-01-01',
      valid_until: '2026-01-02',
      dated: true,
    },
    receipt_ids: ['receipt-event', 'receipt-a', 'receipt-b'],
    publication_status: 'verified',
  },
];
const temporalRefusalResult = analyzeTopologyAdmissionFrontier(temporalRefusal);
assert.deepEqual(temporalRefusalResult.errors, []);
assert.equal(temporalRefusalResult.report.counts.compiled_actor_pair_bases, 0);
assert.equal(temporalRefusalResult.report.counts.temporally_refused_actor_pairs, 1);
assert.equal(temporalRefusalResult.report.counts.covered_actor_pair_bases, 1);
assert.equal(temporalRefusalResult.report.counts.missing_actor_pair_bases, 0);
assert.deepEqual(
  temporalRefusalResult.report.admitted_surfaces[0].missing_actor_pair_keys,
  [],
);
assert.equal(
  temporalRefusalResult.report.admitted_surfaces[0].temporal_refusals[0].reason,
  'no_temporal_overlap',
);

const missingRefusal = fixture();
missingRefusal.surfaces.push({
  surface_id: 'unrefused-directory',
  surface_label: 'Unrefused directory',
  surface_type: 'directory_surface',
  hop_eligible: false,
  receipt_ids: ['receipt-directory'],
});
missingRefusal.participation.push(
  {
    surface_id: 'unrefused-directory',
    participant_type: 'actor',
    actor_id: 'actor-a',
    receipt_ids: ['receipt-a'],
  },
  {
    surface_id: 'unrefused-directory',
    participant_type: 'actor',
    actor_id: 'actor-c',
    receipt_ids: ['receipt-c'],
  },
);
const missingRefusalResult = analyzeTopologyAdmissionFrontier(missingRefusal);
assert.ok(missingRefusalResult.errors.includes(
  'surface unrefused-directory is non-hop with 2 distinct actor participants but has no hop_refusal_reason',
));
assert.equal(missingRefusalResult.report.counts.multi_actor_nonhop_without_refusal, 1);

const missingPairBasis = fixture();
missingPairBasis.hopGraph.edges = [];
const missingPairResult = analyzeTopologyAdmissionFrontier(missingPairBasis);
assert.ok(missingPairResult.errors.includes(
  'hop-eligible surface bounded-event is missing compiled or temporally refused pair actor-a|actor-b',
));

const unreceiptedActor = fixture();
unreceiptedActor.participation.find(row => row.actor_id === 'actor-b').receipt_ids = [];
const unreceiptedActorResult = analyzeTopologyAdmissionFrontier(unreceiptedActor);
assert.ok(unreceiptedActorResult.errors.includes(
  'hop-eligible surface bounded-event actor actor-b has no receipted participation row',
));

const organizationEndpoint = fixture();
organizationEndpoint.hopGraph.edges = [
  {
    actor_a: 'actor-a',
    actor_b: 'organization-x',
    surfaces: [
      {
        surface_id: 'bounded-event',
        receipt_ids: ['receipt-event'],
      },
    ],
  },
];
const organizationEndpointResult = analyzeTopologyAdmissionFrontier(organizationEndpoint);
assert.ok(organizationEndpointResult.errors.includes(
  'hop edge actor-a|organization-x uses organization endpoint organization-x',
));
assert.ok(organizationEndpointResult.errors.includes(
  'hop edge actor-a|organization-x uses unknown actor endpoint organization-x',
));
assert.ok(organizationEndpointResult.errors.includes(
  'hop edge actor-a|organization-x basis bounded-event lacks actor participation for organization-x',
));

const singletonAdmitted = fixture();
singletonAdmitted.participation = singletonAdmitted.participation.filter(row =>
  !(row.surface_id === 'bounded-event' && row.actor_id === 'actor-b'));
singletonAdmitted.hopGraph.edges = [];
const singletonAdmittedResult = analyzeTopologyAdmissionFrontier(singletonAdmitted);
assert.ok(singletonAdmittedResult.errors.includes(
  'hop-eligible surface bounded-event has fewer than two distinct actor participants',
));


const unrelatedReceiptedStint = fixture();
const originalActorB = unrelatedReceiptedStint.participation.find(row =>
  row.surface_id === 'bounded-event' && row.actor_id === 'actor-b');
originalActorB.receipt_ids = [];
unrelatedReceiptedStint.participation.push({
  surface_id: 'bounded-event',
  participant_type: 'actor',
  actor_id: 'actor-b',
  role: 'later unrelated stint',
  time_start: '2027-01-01',
  time_end: '2027-01-01',
  evidence_class: 'official',
  receipt_ids: ['receipt-b-later'],
});
const unrelatedBasis = unrelatedReceiptedStint.hopGraph.edges[0].surfaces[0];
unrelatedBasis.actor_b_participation.receipt_ids = [];
unrelatedBasis.receipt_ids = ['receipt-event', 'receipt-a', 'receipt-b-later'];
const unrelatedReceiptedStintResult = analyzeTopologyAdmissionFrontier(
  unrelatedReceiptedStint,
);
assert.ok(unrelatedReceiptedStintResult.errors.includes(
  'hop edge actor-a|actor-b basis bounded-event exact actor_b participation has no receipt_ids',
), 'a receipt on another stint must not satisfy the exact compiled basis');

const mismatchedExactStint = fixture();
const mismatchedBasis = mismatchedExactStint.hopGraph.edges[0].surfaces[0];
mismatchedBasis.actor_b_participation.receipt_ids = ['receipt-b-other'];
mismatchedBasis.receipt_ids.push('receipt-b-other');
const mismatchedExactStintResult = analyzeTopologyAdmissionFrontier(
  mismatchedExactStint,
);
assert.ok(mismatchedExactStintResult.errors.includes(
  'hop edge actor-a|actor-b basis bounded-event exact actor_b participation matched 0 canonical rows',
), 'the exact stint object must resolve to one canonical participation row');

console.log('topology-admission-frontier.test: OK');
