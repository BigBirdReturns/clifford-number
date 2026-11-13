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
// 170 on the base; 177 after the evidence-lake registry merge (WP4). The seven
// added actors hold no participation row, so every figure below is unchanged.
// 198 / 62 / 135 after the archived defense-corridor A/B receipts (2026-10-23): 21 actors entered,
// and three primary_public team pages (Stratos 9 people, Traysar 3, Pallas 2) add 40 bases.
// The anchor components and the zero reported-basis count are unchanged.
assert.equal(actual.global.canonical_actor_count, 524); // 2026-11-13 amplification chain: 516 -> 524 (8 people minted by the amplification-chain lane; every new surface is hop_eligible false, so the hop figures below are unchanged). 2026-11-12 Bitter Struggle chain: 468 -> 516 (48 people minted by the bitter-struggle-chain lane; every new surface is hop_eligible false, so the hop figures below are unchanged). 2026-11-10 follow-up: 459 -> 468. 2026-11-10 one-pass entry: 411 -> 459 (48 actors minted by the lens-hunt-official lane; every new surface is hop_eligible false, so the hop figures below are unchanged). 2026-11-10 lens-hunt promotion: 404 -> 411 (Jonathan Black, Feryal Clark and five UKSA Challenge Panel members).  2026-10-23 final re-pin: 293 -> 404 (the five 2026-10-23 research-dig lanes; this test was last re-pinned before them because DUPLICATE_BASIS_KEY stopped it).  2026-10-23 promotion: 198 -> 293 actors (LinkedIn role-crossing people); hop figures below unchanged
assert.equal(actual.global.accepted_edge_actor_count, 150); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 146 -> 150 (Sneha Revanur, Sunny Gandhi, Adam Billen and Nathan Calvin). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 141 -> 146 (Tantum Collins, Edward Hughes, Louis Kirsch, Kaloyan Aleksiev and Ben Buchanan). 2026-11-10 lens-hunt promotion: 134 -> 141.  2026-10-23 final re-pin: 62 -> 134
assert.equal(actual.global.basis_count, 335); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 329 -> 335 (the six roster pairs). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 318 -> 329 (ten Inherent pairs and the co-authorship pair). 2026-11-10 lens-hunt promotion: 300 -> 318 (summit and AI Growth Zones pairs, SAGE 17, the 15 UKSA panel pairs).  2026-10-23 final re-pin: 135 -> 300 (after the Form D person-row merge and the year-only a16z 2022 sessions leaving the hop set)
assert.deepEqual(actual.global.evidence_counts, { official: 141, primary_public: 194 }); // 2026-11-13 owner ruling on hop bases ("Yes, pick some", the pick delegated to the supervising session: Encode's team roster): 188 -> 194 (the roster is first-party). 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): primary_public 177 -> 188 (both ruled surfaces are first-party). 2026-11-10 lens-hunt promotion: official 123 -> 141.  2026-10-23 final re-pin: { official: 75, primary_public: 60 } -> this
assert.equal(actual.global.reported_basis_count, 0);
assert.equal(actual.global.disposition_count, 0);
assert.equal(actual.anchor_components.actor_count, 47); // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 42 -> 47 (five people numbered). 2026-11-10 lens-hunt promotion: 35 -> 42.  2026-10-23 final re-pin: 33 -> 35
assert.equal(actual.anchor_components.edge_count, 100); // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 89 -> 100. 2026-11-10 lens-hunt promotion: 72 -> 89.  2026-10-23 final re-pin: 70 -> 72
assert.equal(actual.anchor_components.basis_count, 103); // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 92 -> 103. 2026-11-10 lens-hunt promotion: 74 -> 92.  2026-10-23 final re-pin: 72 -> 74
assert.equal(actual.anchor_components.reported_basis_count, 0);
// 5 / 2 before the defense-corridor staging merge (2026-10-23); the four FY2025 Air Force
// award line items are trade-press reported, organization-only and non-hop (+8 rows, +4 surfaces).
// 13 / 6 -> 39 / 17 after the archived A/B receipts (2026-10-23). Every reported surface stays
// non-hop: the Texas Venture Partners roles (Times of Israel, reported) share a date but have no
// upgrade disposition, so the promote tool keeps that surface non-hop.
// 2026-10-23 promotion: 39 / 17 -> 1,483 / 736 after the LinkedIn role crossings entered as
// evidence class "reported", one single-person surface per role (719 surfaces). They stay
// non-hop like every other reported surface; the exact lists below pin the non-LinkedIn
// reported surfaces as before, and the LinkedIn role surfaces are pinned by count and shape.
const isLinkedInRoleSurface = id => /-linkedin-\d{4}-(\d{4}|present)$/.test(id);
const LINKEDIN_ROLE_SURFACES = 719; // 2026-10-23 promotion
assert.equal(actual.reported_ledger_boundary.reported_participation_rows, 1624); // 2026-11-13 amplification chain: 1,622 -> 1,624 (the two rows of the Washington Post report via the Anchorage Daily News). 2026-11-12 Bitter Struggle chain: 1,615 -> 1,622 (the rows of the three reported surfaces from The Stack and TNW). 2026-10-23 final re-pin: 1,483 -> 1615.  2026-10-23 promotion: 39 -> 1,483
assert.equal(actual.reported_ledger_boundary.reported_surface_rows, 772); // 2026-11-13 amplification chain: 771 -> 772 (the Washington Post report via the Anchorage Daily News, non-hop). 2026-11-12 Bitter Struggle chain: 768 -> 771 (the three reported surfaces from The Stack and TNW, all non-hop). 2026-10-23 final re-pin: 736 -> 768.  2026-10-23 promotion: 17 -> 736
for (const key of ['non_hop_surface_ids', 'reported_surface_ids', 'reported_evidence_surface_ids']) {
  assert.equal(actual.reported_ledger_boundary[key].filter(isLinkedInRoleSurface).length, LINKEDIN_ROLE_SURFACES, `${key}: LinkedIn role surfaces`);
}
assert.deepEqual(actual.reported_ledger_boundary.accepted_reported_surface_ids, [], 'no reported surface is accepted as a hop basis');
// 2026-10-23 final re-pin: 18 -> 50 non-LinkedIn reported surfaces (+32 from the research-dig lanes). Every one stays non-hop.
// 2026-11-12 Bitter Struggle chain: + the three reported surfaces from The Stack and TNW (Matt Clifford's reported Anthropic appointment and ARIA exit, and ARIA's reported licence with Anthropic). Every one stays non-hop.
// 2026-11-13 amplification chain: + the Washington Post report via the Anchorage Daily News (Jacob Coxon's group chat). It stays non-hop.
assert.deepEqual(actual.reported_ledger_boundary.non_hop_surface_ids.filter(id => !isLinkedInRoleSurface(id)), [
  'afwerx-austin-hub-at-capital-factory-2018-06-27',
  'argentina-capital-humano-social-digital-twin-announcement-2026-05-27',
  'aria-anthropic-commercial-licence-reported-2026-09-07',
  'army-futures-command-austin-selection-2018-07-12',
  'army-futures-command-hq-news-conference-2018-07-13',
  'army-futures-command-ribbon-cutting-press-2018-08-24',
  'axios-published-aaru-simulated-statistic-reported-2026-05-05',
  'cap-table-as-reported-traysar',
  'capital-factory-center-for-defense-innovation-2019',
  'capital-factory-fed-supernova-2021-09-28',
  'capital-factory-fed-supernova-2022-09-27',
  'capital-factory-fed-supernova-2025-08-19',
  'capital-factory-founding-2009',
  'capital-factory-leadership-as-reported-2026-06-17',
  'capital-factory-station-dc-2024-07',
  'capital-factory-team-page-2026-10-23',
  'dialog-leadership-role-observations-2026-06-16',
  'dialog-matt-clifford-invitation-nonattendance-2026-06-16',
  'dialog-public-directory-exposure-2026-06-16',
  'diux-austin-roll-out-press-2016-09-14',
  'funding-round-traysar-seed',
  'gartner-synthetic-population-vendor-race-self-report-arima-2026-05-29',
  'gartner-synthetic-population-vendor-race-self-report-bluepill-2026-05-12',
  'gartner-synthetic-population-vendor-race-self-report-qloo-2026-09-15',
  'gartner-synthetic-population-vendor-race-self-report-stravito-2026-04-30',
  'gartner-synthetic-population-vendor-race-self-report-verve-2026-10-23',
  'jacob-coxon-group-chat-retweets-reported-2026-09-11',
  'joshua-baer-death-2026-06-16',
  'matt-clifford-anthropic-managing-director-international-affairs-reported-2026-09-02',
  'matt-clifford-aria-chair-exit-announced-reported-2026-09-07',
  'news-uk-times-podcast-name-synthetic-panel-decision-2025-11-04',
  'nightdragon-capital-factory-partnership-2025-08-18',
  'no10-synthetic-voters-experiment-reported-2025-07-07',
  'partnership-claim-stratos-ventures-israeli-mod',
  'partnership-claim-stratos-ventures-nato-diana',
  'partnership-claim-stratos-ventures-u-s-centcom-port-of-miami-via-the-lab-miami',
  'partnership-claim-stratos-ventures-u-s-dod',
  'procurement-award-ussocom-idiq-reported',
  'qloo-vendor-reported-clients-2026-09-15',
  'republican-strategists-mirofish-simulated-voters-reported-2026-04-14',
  'silent-ventures-team-page-2026-10-23',
  'station-austin-launch-2026-03-10',
  'station-nwa-walton-family-foundation-grant-2026-01-13',
  'station-texas-founding-executive-director-2025-05-20',
  'stratos-ventures-portfolio-page-2026-10-23',
  'texas-venture-partners-team-page-2026-04-06',
  'uk-politicians-synthetic-focus-groups-reported-2026-10-22',
  'undp-culturepulse-israel-palestine-simulation-contract-2023-08',
  'us-air-force-fy2025-award-castelion',
  'us-air-force-fy2025-award-dataminr',
  'us-air-force-fy2025-award-jetzero',
  'us-air-force-fy2025-award-sierra-space',
  'vehicle-control-station-austin',
  'venturebeat-synthetic-audience-vendors-named-2026-04-26',
]);
// 2026-10-23 final re-pin: 17 -> 49 non-LinkedIn reported surfaces (+32 from the research-dig lanes). Every one stays non-hop.
// 2026-11-12 Bitter Struggle chain: + the same three reported surfaces. Every one stays non-hop.
// 2026-11-13 amplification chain: + the same Washington Post report. It stays non-hop.
assert.deepEqual(actual.reported_ledger_boundary.reported_surface_ids.filter(id => !isLinkedInRoleSurface(id)), [
  'afwerx-austin-hub-at-capital-factory-2018-06-27',
  'argentina-capital-humano-social-digital-twin-announcement-2026-05-27',
  'aria-anthropic-commercial-licence-reported-2026-09-07',
  'army-futures-command-austin-selection-2018-07-12',
  'army-futures-command-hq-news-conference-2018-07-13',
  'army-futures-command-ribbon-cutting-press-2018-08-24',
  'axios-published-aaru-simulated-statistic-reported-2026-05-05',
  'cap-table-as-reported-traysar',
  'capital-factory-center-for-defense-innovation-2019',
  'capital-factory-fed-supernova-2021-09-28',
  'capital-factory-fed-supernova-2022-09-27',
  'capital-factory-fed-supernova-2025-08-19',
  'capital-factory-founding-2009',
  'capital-factory-leadership-as-reported-2026-06-17',
  'capital-factory-station-dc-2024-07',
  'capital-factory-team-page-2026-10-23',
  'dialog-leadership-role-observations-2026-06-16',
  'dialog-matt-clifford-invitation-nonattendance-2026-06-16',
  'diux-austin-roll-out-press-2016-09-14',
  'funding-round-traysar-seed',
  'gartner-synthetic-population-vendor-race-self-report-arima-2026-05-29',
  'gartner-synthetic-population-vendor-race-self-report-bluepill-2026-05-12',
  'gartner-synthetic-population-vendor-race-self-report-qloo-2026-09-15',
  'gartner-synthetic-population-vendor-race-self-report-stravito-2026-04-30',
  'gartner-synthetic-population-vendor-race-self-report-verve-2026-10-23',
  'jacob-coxon-group-chat-retweets-reported-2026-09-11',
  'joshua-baer-death-2026-06-16',
  'matt-clifford-anthropic-managing-director-international-affairs-reported-2026-09-02',
  'matt-clifford-aria-chair-exit-announced-reported-2026-09-07',
  'news-uk-times-podcast-name-synthetic-panel-decision-2025-11-04',
  'nightdragon-capital-factory-partnership-2025-08-18',
  'no10-synthetic-voters-experiment-reported-2025-07-07',
  'partnership-claim-stratos-ventures-israeli-mod',
  'partnership-claim-stratos-ventures-nato-diana',
  'partnership-claim-stratos-ventures-u-s-centcom-port-of-miami-via-the-lab-miami',
  'partnership-claim-stratos-ventures-u-s-dod',
  'procurement-award-ussocom-idiq-reported',
  'qloo-vendor-reported-clients-2026-09-15',
  'republican-strategists-mirofish-simulated-voters-reported-2026-04-14',
  'silent-ventures-team-page-2026-10-23',
  'station-austin-launch-2026-03-10',
  'station-nwa-walton-family-foundation-grant-2026-01-13',
  'station-texas-founding-executive-director-2025-05-20',
  'stratos-ventures-portfolio-page-2026-10-23',
  'texas-venture-partners-team-page-2026-04-06',
  'uk-politicians-synthetic-focus-groups-reported-2026-10-22',
  'undp-culturepulse-israel-palestine-simulation-contract-2023-08',
  'us-air-force-fy2025-award-castelion',
  'us-air-force-fy2025-award-dataminr',
  'us-air-force-fy2025-award-jetzero',
  'us-air-force-fy2025-award-sierra-space',
  'vehicle-control-station-austin',
  'venturebeat-synthetic-audience-vendors-named-2026-04-26',
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
