import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  evaluateReportedHopEvidenceUpgrades,
  reportedHopBasisKey,
} from '../tools/lib/reported-hop-evidence-upgrades.mjs';

const readJson = path => JSON.parse(readFileSync(path, 'utf8'));
const readJsonl = path => readFileSync(path, 'utf8')
  .split('\n')
  .filter(Boolean)
  .map(line => JSON.parse(line));

const actualContract = readJson('data/research/reported-hop-evidence-upgrades.json');
const actual = evaluateReportedHopEvidenceUpgrades({
  actors: readJson('data/canonical/actors.json').actors,
  contract: actualContract,
  hopGraph: readJson('build/hop-graph.json'),
  participation: readJsonl('data/ledger/participation.jsonl'),
  surfaces: readJsonl('data/ledger/surfaces.jsonl'),
});

assert.deepEqual(actual.errors, []);
assert.equal(actual.global.canonical_actor_count, 170);
assert.equal(actual.global.accepted_edge_actor_count, 48);
assert.equal(actual.global.basis_count, 95);
assert.deepEqual(actual.global.evidence_counts, { official: 75, primary_public: 20 });
assert.equal(actual.global.reported_basis_count, 0);
assert.equal(actual.global.disposition_count, 0);
assert.equal(actual.anchor_components.actor_count, 33);
assert.equal(actual.anchor_components.edge_count, 70);
assert.equal(actual.anchor_components.basis_count, 72);
assert.equal(actual.anchor_components.reported_basis_count, 0);
assert.equal(actual.reported_ledger_boundary.reported_participation_rows, 5);
assert.equal(actual.reported_ledger_boundary.reported_surface_rows, 2);
assert.deepEqual(actual.reported_ledger_boundary.non_hop_surface_ids, [
  'dialog-leadership-role-observations-2026-06-16',
  'dialog-matt-clifford-invitation-nonattendance-2026-06-16',
  'dialog-public-directory-exposure-2026-06-16',
]);
assert.deepEqual(actual.reported_ledger_boundary.reported_surface_ids, [
  'dialog-leadership-role-observations-2026-06-16',
  'dialog-matt-clifford-invitation-nonattendance-2026-06-16',
]);
assert.deepEqual(
  actual.reported_ledger_boundary.reported_evidence_surface_ids,
  actual.reported_ledger_boundary.non_hop_surface_ids,
);

const actors = [
  { id: 'anchor', anchor: true },
  { id: 'target' },
  { id: 'outside-a' },
  { id: 'outside-b' },
];
const reportedBasis = {
  evidence_class: 'reported',
  receipt_ids: ['report-1'],
  surface_id: 'reported-surface',
  temporal_status: 'dated',
  valid_from: '2025-01-01',
  valid_until: '2025-01-01',
};
const reportedEdge = { actor_a: 'anchor', actor_b: 'target', surfaces: [reportedBasis] };
const reportedKey = reportedHopBasisKey(reportedEdge, reportedBasis);
const baseInputs = {
  actors,
  contract: structuredClone(actualContract),
  hopGraph: { anchor_actor_id: 'anchor', edges: [reportedEdge] },
  participation: [
    {
      actor_id: 'anchor',
      evidence_class: 'reported',
      participant_type: 'actor',
      surface_id: 'reported-surface',
    },
  ],
  surfaces: [
    {
      evidence_class: 'reported',
      hop_eligible: true,
      surface_id: 'reported-surface',
    },
  ],
};
const validDisposition = {
  actor_a: 'anchor',
  actor_b: 'target',
  attempted_at: '2026-09-05',
  basis_key: reportedKey,
  basis_receipt_ids: ['report-1'],
  note: 'The declared official and first-party routes were checked; no stronger public source was found.',
  result: 'attempted_no_stronger_public_source_found',
  searched_routes: [
    { locator: 'https://example.test/search', outcome: 'no matching public record', venue: 'official register' },
  ],
  surface_id: 'reported-surface',
  temporal_status: 'dated',
  valid_from: '2025-01-01',
  valid_until: '2025-01-01',
};

function evaluate(overrides = {}) {
  return evaluateReportedHopEvidenceUpgrades({
    ...baseInputs,
    ...overrides,
  });
}

function errorCodes(result) {
  return result.errors.map(error => error.code);
}

assert.ok(errorCodes(evaluate()).includes('MISSING_DISPOSITION'));

const admittedContract = structuredClone(actualContract);
admittedContract.dispositions = [validDisposition];
assert.deepEqual(evaluate({ contract: admittedContract }).errors, []);

const wrongReceipts = structuredClone(admittedContract);
wrongReceipts.dispositions[0].basis_receipt_ids = ['different-report'];
assert.ok(errorCodes(evaluate({ contract: wrongReceipts })).includes('DISPOSITION_RECEIPT_MISMATCH'));
const missingSearch = structuredClone(admittedContract);
missingSearch.dispositions[0].searched_routes = [];
assert.ok(errorCodes(evaluate({ contract: missingSearch })).includes('SEARCH_ROUTES'));

const duplicate = structuredClone(admittedContract);
duplicate.dispositions.push(structuredClone(validDisposition));
assert.ok(errorCodes(evaluate({ contract: duplicate })).includes('DUPLICATE_DISPOSITION'));

const duplicateReceipt = structuredClone(admittedContract);
duplicateReceipt.dispositions[0].basis_receipt_ids.push('report-1');
assert.ok(errorCodes(evaluate({ contract: duplicateReceipt })).includes('DUPLICATE_DISPOSITION_RECEIPT'));

const invalidDate = structuredClone(admittedContract);
invalidDate.dispositions[0].attempted_at = '2026-02-31';
assert.ok(errorCodes(evaluate({ contract: invalidDate })).includes('ATTEMPT_DATE'));

const duplicateRoute = structuredClone(admittedContract);
duplicateRoute.dispositions[0].searched_routes.push(
  structuredClone(duplicateRoute.dispositions[0].searched_routes[0]),
);
assert.ok(errorCodes(evaluate({ contract: duplicateRoute })).includes('DUPLICATE_SEARCH_ROUTE'));

const duplicateStrongerClass = structuredClone(admittedContract);
duplicateStrongerClass.stronger_evidence_classes.push('official');
assert.ok(errorCodes(evaluate({ contract: duplicateStrongerClass })).includes('STRONGER_CLASSES'));

const incompleteContract = structuredClone(admittedContract);
delete incompleteContract.government_record_mapping;
assert.ok(errorCodes(evaluate({ contract: incompleteContract })).includes('CONTRACT_KEYS'));
assert.ok(errorCodes(evaluate({ contract: incompleteContract })).includes('GOVERNMENT_RECORD_MAPPING'));

const incompleteScope = structuredClone(admittedContract);
delete incompleteScope.scope.anchor_observation;
assert.ok(errorCodes(evaluate({ contract: incompleteScope })).includes('SCOPE_KEYS'));
assert.ok(errorCodes(evaluate({ contract: incompleteScope })).includes('SCOPE'));

const duplicateBasisGraph = structuredClone(baseInputs.hopGraph);
duplicateBasisGraph.edges[0].surfaces.push(structuredClone(reportedBasis));
assert.ok(errorCodes(evaluate({ hopGraph: duplicateBasisGraph })).includes('DUPLICATE_BASIS_KEY'));

const upgradedGraph = structuredClone(baseInputs.hopGraph);
upgradedGraph.edges[0].surfaces[0].evidence_class = 'primary_public';
assert.ok(errorCodes(evaluate({
  contract: admittedContract,
  hopGraph: upgradedGraph,
})).includes('STALE_DISPOSITION'));

const outsideReported = structuredClone(baseInputs.hopGraph);
outsideReported.edges = [
  {
    actor_a: 'anchor',
    actor_b: 'target',
    surfaces: [{ ...reportedBasis, evidence_class: 'official', receipt_ids: ['official-1'] }],
  },
  {
    actor_a: 'outside-a',
    actor_b: 'outside-b',
    surfaces: [{ ...reportedBasis, surface_id: 'outside-reported' }],
  },
];
const outsideResult = evaluate({ hopGraph: outsideReported });
assert.ok(errorCodes(outsideResult).includes('MISSING_DISPOSITION'),
  'the release-wide superset must not ignore a reported hop outside the primary anchor component');
const nonHopOnly = evaluate({
  hopGraph: {
    anchor_actor_id: 'anchor',
    edges: [
      {
        actor_a: 'anchor',
        actor_b: 'target',
        surfaces: [{ ...reportedBasis, evidence_class: 'official', receipt_ids: ['official-1'] }],
      },
    ],
  },
  participation: [
    {
      actor_id: 'outside-a',
      evidence_class: 'reported',
      participant_type: 'actor',
      surface_id: 'reported-non-hop',
    },
  ],
  surfaces: [
    { evidence_class: 'reported', hop_eligible: false, surface_id: 'reported-non-hop' },
  ],
});
assert.deepEqual(nonHopOnly.errors, []);
assert.equal(nonHopOnly.reported_ledger_boundary.reported_participation_rows, 1);
assert.deepEqual(nonHopOnly.reported_ledger_boundary.non_hop_surface_ids, ['reported-non-hop']);

const unflaggedActors = actors.map(actor => ({ ...actor, anchor: false }));
const noAnchor = evaluate({ actors: unflaggedActors });
assert.ok(errorCodes(noAnchor).includes('NO_ANCHOR'));
assert.ok(errorCodes(noAnchor).includes('PRIMARY_ANCHOR_FLAG'));

console.log('reported-hop-evidence-upgrades.test: OK');
