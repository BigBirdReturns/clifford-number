import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { assertPublicOnly, contactDataPatternHit, privateDataHit, privateFieldNameHit } from '../src/evidence.js';
import * as core from '../src/visual-aperture-core.mjs';
import * as social from '../src/social-field.js';
import {
  buildSocialFieldModel, buildEcologyEventModel, buildFieldLedgerIndex, buildResearchNetworkModel,
  activeEcologyEvents, ecologyEventsForNode, ecologyPlayheadLabel, isSurfaceNode, socialFieldNeighbors,
  normalizeEcologyWindow, rowInWindow, eventInWindow, fieldWindowFactors, nodeLedgerSummary, ecologyWindowLabel, ecologyDay, dayIso,
  nodeCountLabel, ledgerCountsForNode, windowCountPhrase,
  ONTOLOGY_COLORS, heat, heatClassForSurfaceType, heatMixColor, heatBreakdownText, heatTimeForWindow, applyFieldHeat,
  HEAT_FORMULA, HEAT_CLASS_COLORS, HEAT_WEIGHTS, HEAT_NONE_COLOR
} from '../src/social-field.js';

const nodes = [
  { id: 'a', label: 'Actor A', type: 'person', cluster: 'policy' },
  { id: 'b', label: 'Actor B', type: 'person', cluster: 'policy' },
  { id: 'c', label: 'Actor C', type: 'person', cluster: 'capital' },
  { id: 'org-x', label: 'Org X', type: 'company', cluster: 'capital' },
  { id: 'surface-one', label: 'Surface One', type: 'surface', cluster: 'policy' },
  { id: 'surface-two', label: 'Surface Two', type: 'surface', cluster: 'policy' },
  { id: 'surface-open', label: 'Open-ended programme', type: 'surface', cluster: 'policy' },
  { id: 'surface-year', label: 'Year-precision campaign', type: 'surface', cluster: 'policy' },
  { id: 'surface-undated', label: 'Undated context surface', type: 'surface', cluster: 'policy' }
];
const edges = [
  ['a', 'surface-one'], ['b', 'surface-one'], ['c', 'surface-one'],
  ['a', 'surface-two'], ['b', 'surface-two'],
  ['org-x', 'surface-open'], ['c', 'surface-year'], ['b', 'surface-undated']
].map(([from, to], index) => ({
  id: `edge-${index}`, from, to, type: 'topology', topology: true,
  evidence_class: 'official'
}));
// One undated research-context edge: it must never be sliced by the time window.
edges.push({ id: 'edge-research', from: 'a', to: 'org-x', type: 'adviser', evidence_class: 'reported', claim: 'Reported adviser context.' });
const model = { mode: 'research', nodes, edges, nodeById: new Map(nodes.map(node => [node.id, node])) };
const first = buildSocialFieldModel(model);
const second = buildSocialFieldModel(model);

assert.equal(first.nodes.length, nodes.length);
assert.equal(first.links.length, edges.length);
assert.deepEqual(first.links.map(link => [link.source, link.target]), edges.map(edge => [edge.from, edge.to]));
assert.equal(first.metrics.topology_link_count, 8);
assert.equal(first.metrics.surface_count, 5);
assert.equal(first.nodeById.size, nodes.length, 'the field carries a hoisted nodeById map');
assert.equal(isSurfaceNode(first.nodes.find(node => node.id === 'surface-one')), true);
const a = first.nodes.find(node => node.id === 'a');
const b = first.nodes.find(node => node.id === 'b');
const c = first.nodes.find(node => node.id === 'c');
const orgX = first.nodes.find(node => node.id === 'org-x');
const surfaceOne = first.nodes.find(node => node.id === 'surface-one');
const aAgain = second.nodes.find(node => node.id === 'a');
assert.equal(a.strongest_repeat, 2);
assert.equal(b.strongest_repeat, 2);
assert.equal(c.strongest_repeat, 1);
// Size is a documented count with a legend label, never a composite score.
// Without a ledger the count comes from the drawn arcs and says so.
assert.equal(a.arc_surface_count, 2);
assert.equal(c.arc_surface_count, 2);
assert.equal(a.size_count, 2);
assert.equal(a.count_source, 'arcs');
assert.equal(a.ledger_row_count, null);
assert.equal(surfaceOne.size_count, 3, 'a surface node is sized by its documented participant count');
assert.equal(surfaceOne.count_kind, 'participants');
assert.equal(orgX.size_count, 1);
assert.equal(nodeCountLabel(a), '2 documented surfaces');
assert.equal(nodeCountLabel(surfaceOne), '3 documented participants');
assert.equal(nodeCountLabel(first.nodes.find(node => node.id === 'surface-open')), '1 documented participant');
// Heat is a sum of ledger rows and nothing else: without a ledger no node
// carries it, and no hidden composite (degree, clustering, repeat) stands in.
for (const node of first.nodes) {
  assert.equal('heat' in node, false, `node ${node.id} carries no heat without a ledger`);
  assert.equal('heat_color' in node, false);
  for (const banned of ['machine_score', 'factory_score', 'recurrence_score', 'composite_score']) assert.equal(banned in node, false);
}
assert.equal('hottest' in first, false, 'no heat ranking is published');
assert.equal(first.heat_formula, HEAT_FORMULA);

// heat() on a two-row fixture: one capital touch on 2025-09-27 and one policy
// touch on 2020-01-01, evaluated at 2026-01-01: 2 x 0.8^0.26 + 1 x 0.8^6.0.
// Two more rows (one undated, one after t) must add nothing.
const heatFixture = [
  { row_id: 'r-capital', surface_type: 'employment_investment_surface', time_start: '2025-09-27', start_day: ecologyDay('2025-09-27') },
  { row_id: 'r-policy', surface_type: 'policy_document_surface', time_start: '2020-01-01', start_day: ecologyDay('2020-01-01') },
  { row_id: 'r-undated', surface_type: 'procurement_contract_surface', time_start: null, start_day: null },
  { row_id: 'r-later', surface_type: 'procurement_contract_surface', time_start: '2026-03-01', start_day: ecologyDay('2026-03-01') }
];
const heatAt2026 = heat(heatFixture, '2026-01-01');
const capitalYears = (ecologyDay('2026-01-01') - ecologyDay('2025-09-27')) / 365.25;
const policyYears = (ecologyDay('2026-01-01') - ecologyDay('2020-01-01')) / 365.25;
assert.ok(Math.abs(capitalYears - 0.26) < 0.005 && Math.abs(policyYears - 6.0) < 0.005, 'the fixture is 0.26 and 6.0 years before t');
assert.ok(Math.abs(heatAt2026.total - (2 * 0.8 ** capitalYears + 1 * 0.8 ** policyYears)) < 1e-6, `heat = 2x0.8^0.26 + 1x0.8^6.0, got ${heatAt2026.total}`);
assert.ok(Math.abs(heatAt2026.total - (2 * 0.8 ** 0.26 + 0.8 ** 6.0)) < 2e-3, 'and agrees with the rounded exponents (0.26 is 96 days)');
assert.equal(heat(heatFixture, ecologyDay('2026-01-01')).total, heatAt2026.total, 't may be a day integer or an ISO date');
assert.equal(heat(heatFixture.slice(0, 2).map(({ start_day, ...row }) => row), '2026-01-01').total, heatAt2026.total, 'a row without start_day is dated from time_start');
assert.ok(Math.abs(heatAt2026.by_class.capital - 2 * 0.8 ** capitalYears) < 1e-9);
assert.ok(Math.abs(heatAt2026.by_class.policy - 0.8 ** policyYears) < 1e-9);
assert.equal(heatAt2026.by_class.procurement, 0, 'an undated row and a row after t add nothing');
assert.deepEqual(heatAt2026.undated.map(row => row.row_id), ['r-undated'], 'the undated row is listed as such');
assert.deepEqual(heatAt2026.later.map(row => row.row_id), ['r-later']);
assert.deepEqual(heatAt2026.touches.map(touch => [touch.row_id, touch.heat_class, touch.weight]), [['r-capital', 'capital', 2], ['r-policy', 'policy', 1]]);
assert.equal(heat([], '2026-01-01').total, 0);
assert.equal(heatBreakdownText(heatAt2026), 'heat 2.15 = 2 touches at 2026-01-01: capital 2 × 0.8^0.26 = 1.89 (2025-09-27) + policy 1 × 0.8^6.00 = 0.26 (2020-01-01) · 1 undated row contributes nothing · 1 row dated after t not yet counted');
assert.deepEqual({ ...HEAT_WEIGHTS }, { policy: 1, appointment: 1, procurement: 2, capital: 2 });
assert.equal(heatClassForSurfaceType('board_advisory_surface'), 'appointment');
assert.equal(heatClassForSurfaceType('directory_roster_surface'), 'appointment');
assert.equal(heatClassForSurfaceType('defence_industrial_surface'), 'procurement');
assert.equal(heatClassForSurfaceType('laundering_chain_connector'), 'capital');
assert.equal(heatClassForSurfaceType('something_new_surface'), 'policy', 'an unknown type is policy');
assert.equal(heatMixColor({ policy: 0, appointment: 0, procurement: 0, capital: 3 }), HEAT_CLASS_COLORS.capital);
assert.equal(heatMixColor({ policy: 1, appointment: 0, procurement: 0, capital: 1 }), '#2993ab', 'an even mix of policy and capital');
assert.equal(heatMixColor({}), HEAT_NONE_COLOR);
assert.equal(HEAT_FORMULA, 'heat = Σ touches weight(class) × 0.8^years; policy 1 · appointment 1 · procurement 2 · capital 2');
console.log('heat accumulation: PASS');
assert.equal(a.ontology, 'person'); assert.equal(orgX.ontology, 'organization'); assert.equal(surfaceOne.ontology, 'surface');
assert.equal(a.color, ONTOLOGY_COLORS.person);
assert.equal(orgX.color, ONTOLOGY_COLORS.organization);
assert.equal(surfaceOne.color, ONTOLOGY_COLORS.surface);
for (const link of first.links) assert.equal('heat' in link, false);
assert.equal(first.links.find(link => link.id === 'edge-research').topology_only, false);
assert.deepEqual([a.x, a.y, a.z], [aAgain.x, aAgain.y, aAgain.z]);

const neighbors = socialFieldNeighbors(first, 'a');
assert.equal(neighbors.has('surface-one'), true);
assert.equal(neighbors.has('surface-two'), true);
assert.equal(neighbors.has('b'), false, 'projection must not synthesize actor-to-actor adjacency');

for (const node of first.nodes) {
  const radius = Math.hypot(node.x, node.y, node.z);
  assert.ok(radius > 180 && radius < 200, `node ${node.id} must seed on the spherical shell`);
}
console.log('social-field.test: PASS');


const surfaceGraph = {
  surfaces: [
    {
      surface_id: 'one', surface_label: 'Surface One', surface_type: 'board_advisory_surface',
      time_start: '2024-01-01', time_end: '2024-12-31', receipt_ids: ['surface-r1'],
      participants: [
        { actor_id: 'a', participant_type: 'actor', participation_type: 'director_appointment', role: 'Director', time_start: '2024-02-01', time_end: '2024-12-31', evidence_class: 'official', receipt_ids: ['a-r1'] },
        { actor_id: 'b', participant_type: 'actor', participation_type: 'government_adviser', role: 'Adviser', time_start: '2024-03-01', time_end: '2024-04-01', evidence_class: 'primary_public', receipt_ids: ['b-r1'] }
      ]
    },
    {
      surface_id: 'two', surface_label: 'Dense Directory', surface_type: 'directory_roster_surface',
      time_start: '2026-06-16', time_end: '2026-06-16', receipt_ids: ['directory-r1'],
      participants: Array.from({ length: 40 }, (_, index) => ({ actor_id: index ? `missing-${index}` : 'c', participant_type: 'actor', participation_type: 'listed_in_directory', role: 'Directory entry', time_start: '2026-06-16', time_end: '2026-06-16', evidence_class: 'primary_public', receipt_ids: ['directory-r1'] }))
    },
    {
      // No node exists in the research graph for this surface: the privacy guard
      // suppressed it. Its rows must survive the index, labelled, not omitted.
      surface_id: 'guarded', surface_label: 'Guarded email surface', surface_type: 'government_advisory_surface',
      time_start: '2020-03-08', time_end: '2020-03-08', receipt_ids: ['guard-r1'],
      participants: [
        { actor_id: 'a', participant_type: 'actor', participation_type: 'email_sender', role: 'Sender', time_start: '2020-03-08', time_end: '2020-03-08', evidence_class: 'official', receipt_ids: ['guard-r1'] }
      ]
    },
    {
      surface_id: 'open', surface_label: 'Open-ended programme', surface_type: 'government_program_surface',
      time_start: '2025-06-13', time_end: '', receipt_ids: ['open-r1'],
      participants: [
        { organization_id: 'org-x', participant_type: 'organization', participation_type: 'program_owner', role: 'Programme owner', time_start: '2025-06-13', time_end: '', evidence_class: 'official', receipt_ids: ['open-r1'] }
      ]
    },
    {
      surface_id: 'year', surface_label: 'Year-precision campaign', surface_type: 'campaign_surface',
      time_start: '2016', time_end: '2016', receipt_ids: ['year-r1'],
      participants: [
        { actor_id: 'c', participant_type: 'actor', participation_type: 'contractor', role: 'Contractor', time_start: '2016', time_end: '2016', evidence_class: 'official', receipt_ids: ['year-r1'] }
      ]
    },
    {
      // No date at all: the row exists, is drawn, and is never time-sliced.
      surface_id: 'undated', surface_label: 'Undated context surface', surface_type: 'government_advisory_surface',
      time_start: null, time_end: null, receipt_ids: ['undated-r1'],
      participants: [
        { actor_id: 'b', participant_type: 'actor', participation_type: 'adviser', role: 'Adviser', time_start: null, time_end: null, evidence_class: 'reported', receipt_ids: ['undated-r1'] }
      ]
    }
  ]
};
const eventModel = buildEcologyEventModel(surfaceGraph, model);
assert.equal(eventModel.schema_version, 'clifford-ecology-events@1');
assert.equal(eventModel.graph_effect, 'none');
assert.equal(eventModel.canonical_for_clifford_number, false);
assert.equal(eventModel.counts.events, 5, 'the guarded surface has no field node and yields no pulse; every other row does');
assert.equal(eventModel.counts.dense_surface_events, 1);
assert.equal(eventModel.counts.suppressed_dense_participations, 40);
assert.equal(eventModel.events.filter(event => event.event_kind === 'participation').length, 4);
assert.equal(eventModel.events.filter(event => event.dense_roster_contained).length, 1);
assert.deepEqual(eventModel.events.filter(event => event.event_kind === 'participation').map(event => event.channel).sort(), ['governance', 'policy', 'policy', 'procurement']);
assert.equal(ecologyEventsForNode(eventModel, 'a').length, 1);
assert.equal(ecologyEventsForNode(eventModel, 'surface-one').length, 2);
assert.equal(ecologyPlayheadLabel(eventModel, 0), '2016-01-01');
assert.equal(ecologyPlayheadLabel(eventModel, 1), '2026-06-16');
// An open-ended row's event is open-ended too (no single-day collapse), so its
// pulse is in every later window exactly as its row is.
const openEvent = eventModel.events.find(event => event.surface_id === 'open');
assert.equal(openEvent.open_ended, true);
assert.equal(openEvent.end_day, null);
assert.equal(openEvent.time_end, null);
assert.equal(openEvent.time_label, '2025-06-13 → no end recorded');
assert.equal(eventModel.events.filter(event => event.open_ended).length, 1);
console.log('ecology event projection: PASS');

// The ledger index keeps every row, including rows the field cannot draw.
const ledger = buildFieldLedgerIndex(surfaceGraph, model);
assert.equal(ledger.counts.rows, 46);
assert.equal(ledger.counts.actor_rows, 45);
assert.equal(ledger.counts.organization_rows, 1);
assert.equal(ledger.counts.dated_rows, 45);
assert.equal(ledger.counts.undated_rows, 1);
assert.equal(ledger.counts.privacy_guard_rows, 1);
assert.equal(ledger.counts.dense_contained_rows, 40);
assert.equal(ledger.counts.open_ended_rows, 1);
const guardedRow = ledger.rows.find(row => row.surface_id === 'guarded');
assert.equal(guardedRow.on_field, false);
assert.equal(guardedRow.off_field_reason, 'privacy_guard');
const openRow = ledger.rows.find(row => row.surface_id === 'open');
assert.equal(openRow.end_day, null);
assert.equal(openRow.time_label, '2025-06-13 → no end recorded');
const yearRow = ledger.rows.find(row => row.surface_id === 'year');
assert.equal(yearRow.precision, 'year');
assert.equal(dayIso(yearRow.start_day), '2016-01-01');
assert.equal(dayIso(yearRow.end_day), '2016-12-31');
assert.equal(ledger.range.first_date, '2016-01-01');
assert.equal(ledger.range.last_date, '2026-06-16');
assert.deepEqual(ledger.rowsByLinkKey.get('a||surface-one').map(row => row.role), ['Director']);
const withRows = buildSocialFieldModel(model, { ledger });
assert.equal(withRows.links.find(link => link.id === 'edge-0').rows[0].role, 'Director', 'topology arcs carry their participation row');
assert.deepEqual(withRows.links.find(link => link.id === 'edge-research').rows, [], 'research arcs carry no ledger row');
// With a ledger, size and halo come from the ledger's counts, not the drawn arcs.
// The fixture graph and ledger deliberately disagree: the graph draws a and b
// on surface-two, the ledger lists 40 directory entries (c and 39 unresolved
// ids) there. The ledger decides the count; the arc count is kept, named as such.
const cWithLedger = withRows.nodeById.get('c');
assert.equal(cWithLedger.count_source, 'ledger');
assert.equal(cWithLedger.size_count, 2, 'c: the contained directory row and the year-precision campaign');
assert.equal(cWithLedger.ledger_row_count, 2);
assert.equal(cWithLedger.arc_surface_count, 2);
const denseWithLedger = withRows.nodeById.get('surface-two');
assert.equal(denseWithLedger.size_count, 40, 'a dense surface is sized by its ledger rows, not by the arcs the field draws');
assert.equal(denseWithLedger.arc_participant_count, 2);
assert.equal(nodeCountLabel(denseWithLedger), '40 documented participants');
const bWithLedger = withRows.nodeById.get('b');
assert.equal(bWithLedger.size_count, 2, 'b is on two ledger surfaces (one dated, one undated) although three arcs are drawn for it');
assert.equal(bWithLedger.arc_surface_count, 3);
assert.equal(nodeCountLabel(bWithLedger), '2 documented surfaces');
assert.deepEqual(ledgerCountsForNode(ledger, 'surface-guarded'), { rows: 1, surfaces: 1, count_kind: 'participants' });
assert.equal(ledgerCountsForNode(null, 'a'), null);

// Window semantics: [from, to] in days, swap when reversed, clamp to the range,
// all-time when both sides are open or cover the range.
const allTime = normalizeEcologyWindow(ledger.range, null);
assert.equal(allTime.unbounded, true);
assert.equal(normalizeEcologyWindow(ledger.range, { fromDay: ledger.range.first_day, toDay: ledger.range.last_day }).unbounded, true);
const reversed = normalizeEcologyWindow(ledger.range, { fromDay: ecologyDay('2024-12-31'), toDay: ecologyDay('2024-01-01') });
assert.equal(dayIso(reversed.startDay), '2024-01-01');
assert.equal(dayIso(reversed.endDay), '2024-12-31');
assert.equal(reversed.unbounded, false);
assert.equal(ecologyWindowLabel(ledger.range, reversed), '2024-01-01 → 2024-12-31');
assert.equal(ecologyWindowLabel(ledger.range, null), '2016-01-01 → 2026-06-16 · all time');
const window2024 = reversed;
assert.equal(rowInWindow(guardedRow, window2024), false);
assert.equal(rowInWindow(openRow, window2024), false);
const laterWindow = normalizeEcologyWindow(ledger.range, { fromDay: ecologyDay('2026-01-01'), toDay: null });
assert.equal(rowInWindow(openRow, laterWindow), true, 'an open-ended row overlaps every later window');
assert.equal(eventInWindow(openEvent, laterWindow), true, 'and so does its pulse');
assert.equal(eventInWindow(openEvent, window2024), false);
assert.equal(rowInWindow(guardedRow, allTime), true);
// An undated row is never time-sliced: inside no window, outside none, dimmed never.
const undatedRow = ledger.rows.find(row => row.surface_id === 'undated');
assert.equal(undatedRow.dated, false);
assert.equal(undatedRow.on_field, true);
assert.equal(undatedRow.time_label, 'undated');
assert.equal(rowInWindow(undatedRow, window2024), true, 'an undated row is never outside a window');
assert.equal(rowInWindow(undatedRow, allTime), true);
const factors2024 = fieldWindowFactors(ledger, window2024);
assert.equal(factors2024.rows_total, 46);
assert.equal(factors2024.rows_in_window, 2);
assert.equal(factors2024.rows_undated, 1, 'the undated row is named apart, not counted on either side');
assert.deepEqual([...factors2024.inWindowNodeIds].sort(), ['a', 'b', 'surface-one'], 'an undated row lights no node');
assert.deepEqual([...factors2024.inWindowLinkKeys].sort(), ['a||surface-one', 'b||surface-one']);
assert.equal(factors2024.datedNodeIds.has('a'), true);
assert.equal(factors2024.datedNodeIds.has('org-x'), true);
assert.equal(factors2024.datedNodeIds.has('surface-undated'), false, 'a node with only undated rows holds the constant mid opacity');
assert.equal(fieldWindowFactors(ledger, null).unbounded, true);
const summaryB = nodeLedgerSummary(ledger, 'b', window2024);
assert.equal(summaryB.rows_total, 2);
assert.equal(summaryB.rows_in_window, 1);
assert.equal(summaryB.rows_undated, 1);
assert.equal(windowCountPhrase(summaryB, window2024), '1 of 2 rows in window · 1 undated row never time-sliced');
assert.equal(windowCountPhrase(summaryB, allTime), '2 rows');
assert.equal(windowCountPhrase(nodeLedgerSummary(ledger, 'a', window2024), window2024), '1 of 2 rows in window');
assert.equal(windowCountPhrase(factors2024, window2024), '2 of 46 rows in window · 1 undated row never time-sliced');
const summaryA = nodeLedgerSummary(ledger, 'a', window2024);
assert.equal(summaryA.rows.length, 2);
assert.equal(summaryA.rows_in_window, 1);
assert.equal(summaryA.surface_count, 2);
assert.equal(summaryA.off_field_rows, 1);
assert.equal(dayIso(summaryA.first_day), '2020-03-08');
assert.deepEqual(summaryA.rows.map(row => row.surface_id), ['guarded', 'one'], 'rows list oldest first');

// Pulses exist only inside their row's window: no shoulder, none in all-time.
const eventA = eventModel.events.find(event => event.participant_node_id === 'a');
assert.equal(eventInWindow(eventA, window2024), true);
assert.equal(eventInWindow(eventA, normalizeEcologyWindow(ledger.range, { fromDay: ecologyDay('2025-01-01'), toDay: ecologyDay('2025-01-02') })), false, 'the day after the row ends is outside: no 45-day shoulder');
assert.equal(eventInWindow(eventA, normalizeEcologyWindow(ledger.range, { fromDay: ecologyDay('2024-01-01'), toDay: ecologyDay('2024-01-31') })), false, 'the month before the row starts is outside');
assert.equal(eventInWindow(eventA, allTime), false, 'the all-time state draws no pulse');
assert.deepEqual(activeEcologyEvents(eventModel, null), []);
assert.equal(activeEcologyEvents(eventModel, window2024).length, 2);
assert.equal(activeEcologyEvents(eventModel, 0).length, 1, 'a numeric playhead position still resolves to a single-day window');
console.log('field ledger index and time window: PASS');

// Real-data pins (build/surface-graph.json and graph.json are committed artifacts).
const realGraph = JSON.parse(readFileSync('graph.json', 'utf8'));
const realSurfaceGraph = JSON.parse(readFileSync('build/surface-graph.json', 'utf8'));
const realModel = buildResearchNetworkModel(realGraph);
const realLedger = buildFieldLedgerIndex(realSurfaceGraph, realModel);
const realEvents = buildEcologyEventModel(realSurfaceGraph, realModel);
const realField = buildSocialFieldModel(realModel, { ledger: realLedger });
assert.equal(realLedger.counts.rows, 12233); // 2026-11-13 amplification chain: 12,190 -> 12,233. 2026-11-12 UK meetings, second intake: 11,611 -> 12,190. 2026-11-12 UK contract awards: 8,814 -> 11,611. 2026-11-12 Bitter Struggle chain: 8,683 -> 8,814. 2026-11-12 UK ministerial meetings: 7,243 -> 8,683. 2026-11-10 hand-judged Form D filings: 6,190 -> 7,243. 2026-11-10 Form D data sets: 4,894 -> 6,190. 2026-11-10 follow-up: 4755 -> 4894. 2026-11-10 one-pass entry: 4430 -> 4755. 2026-11-10 lens-hunt promotion: 4411 -> 4430. 2026-10-23 final re-pin: 4451 -> 4411. 2026-10-23 five-lane merge: 3,118 -> 4,451. 2026-10-23 promotion: 286 -> 3,118 rows
assert.equal(realLedger.counts.actor_rows, 3287); // 2026-11-13 amplification chain: 3,263 -> 3,287. 2026-11-12 UK meetings, second intake: 3,050 -> 3,263. 2026-11-12 Bitter Struggle chain: 2,985 -> 3,050. 2026-11-12 UK ministerial meetings: 2,658 -> 2,985. 2026-11-10 hand-judged Form D filings: 2,139 -> 2,658. 2026-11-10 Form D data sets: 1,408 -> 2,139. 2026-11-10 follow-up: 1399 -> 1408. 2026-11-10 one-pass entry: 1313 -> 1399. 2026-11-10 lens-hunt promotion: 1300 -> 1313. 2026-10-23 final re-pin: 1340 -> 1300. 2026-10-23 five-lane merge: 959 -> 1,340. 2026-10-23 promotion: 200 -> 959 (joshua-baer listing routed to the actor)
assert.equal(realLedger.counts.organization_rows, 8946); // 2026-11-13 amplification chain: 8,927 -> 8,946. 2026-11-12 UK meetings, second intake: 8,561 -> 8,927. 2026-11-12 UK contract awards: 5,764 -> 8,561. 2026-11-12 Bitter Struggle chain: 5,698 -> 5,764. 2026-11-12 UK ministerial meetings: 4,585 -> 5,698. 2026-11-10 hand-judged Form D filings: 4,051 -> 4,585. 2026-11-10 Form D data sets: 3,486 -> 4,051. 2026-11-10 follow-up: 3356 -> 3486. 2026-11-10 one-pass entry: 3117 -> 3356. 2026-11-10 lens-hunt promotion: 3111 -> 3117. 2026-10-23 five-lane merge: 2,159 -> 3,111. 2026-10-23 promotion: 86 -> 2,159
assert.equal(realLedger.counts.privacy_guard_rows, 0); // 2026-10-23 final re-pin: 22 -> 0 (privacy guard scope fix, owner decision: the eight surfaces held back only because a label or a role type contained "email", "address", "medical" or "emergency" are drawn; contact-data patterns find nothing in this release). 2026-10-23 five-lane merge: 6 -> 22 (six more surfaces trip guard tokens: two Contracts Finder Faculty awards, two SEC Form D filings for Yourself Online, the Army Applications Laboratory address row and the NHS commissioning-support award). 2026-10-23 promotion: 4 -> 6 (the Steven Hertzberg / Australian Medical Network role surface trips the "medical" guard token)
assert.equal(realLedger.counts.dense_contained_rows, 231); // 2026-11-12 UK ministerial meetings: 142 -> 231. 2026-10-23 five-lane merge: 113 -> 142 (rndf-2023-programme-roster is now dense)
assert.equal(realLedger.counts.unresolved_rows, 0);
assert.equal(realLedger.counts.open_ended_rows, 314); // 2026-10-23 final re-pin: 315 -> 314. 2026-10-23 promotion: 1 -> 315 (LinkedIn roles stated "Present" keep time_end open)
assert.equal(realLedger.counts.undated_rows, 0, 'every row in this release is dated; the undated rule is latent');
assert.equal(realEvents.events.filter(event => event.open_ended).length, 314, 'every open-ended row pulses open-ended'); // 2026-10-23 final re-pin: 315 -> 314. 2026-10-23 promotion: 1 -> 315
assert.ok(realEvents.events.some(event => event.open_ended && event.surface_id === 'detachment-201-program-context-2025'), 'the detachment-201 / us-army row pulses open-ended');
// A pulse is drawn exactly when its row is in the window: 0 disagreements over
// every drawn participation row and every calendar year of the range.
// 2026-11-12 UK ministerial meetings (supervisor ruling): a ministers' meetings return holds several dated rows
// for one entity (one per meeting), so each row is paired with its own pulse by its start day as well as
// surface, node and type (was surface, node and type only, which paired such rows with one pulse). The rule stays 0.
const eventByRowKey = new Map(realEvents.events.filter(event => event.event_kind === 'participation').map(event => [`${event.surface_id}::${event.participant_node_id}::${event.participation_type}::${event.start_day}`, event]));
let rowEventPairs = 0, rowEventDisagreements = 0;
for (let year = 2016; year <= 2026; year += 1) {
  const yearWindow = normalizeEcologyWindow(realLedger.range, { fromDay: ecologyDay(String(year)), toDay: ecologyDay(String(year), true) });
  for (const row of realLedger.rows) {
    const event = row.on_field ? eventByRowKey.get(`${row.surface_id}::${row.node_id}::${row.participation_type}::${row.start_day}`) : null;
    if (!event) continue;
    rowEventPairs += 1;
    if (rowInWindow(row, yearWindow) !== eventInWindow(event, yearWindow)) rowEventDisagreements += 1;
  }
}
assert.equal(rowEventPairs, 101123); // 2026-11-13 amplification chain: 100,705 -> 101,123. 2026-11-12 UK meetings, second intake: 94,336 -> 100,705. 2026-11-12 UK contract awards: 63,569 -> 94,336. 2026-11-12 Bitter Struggle chain: 62,194 -> 63,569. 2026-11-12 UK ministerial meetings: 57,871 -> 62,194. 2026-11-10 hand-judged Form D filings: 46,288 -> 57,871. 2026-11-10 Form D data sets: 32,032 -> 46,288. 2026-11-10 follow-up: 31933 -> 32032. 2026-11-10 one-pass entry: 29370 -> 31933. 2026-11-10 lens-hunt promotion: 29161 -> 29370. 2026-10-23 final re-pin: 29359 -> 29161. 2026-10-23 five-lane merge: 19,184 -> 29,359. 2026-10-23 promotion: 1,716 -> 19,184 row-year pairs
assert.equal(rowEventDisagreements, 0, 'the pulse is drawn only, and always, inside its row\'s window');
assert.deepEqual(realLedger.rows.filter(row => row.off_field_reason === 'privacy_guard').map(row => row.node_id).sort(), []); // 2026-10-23 final re-pin: was the 22 rows of the eight word-matched surfaces (ben-warner-cummings-shafi-contain-delay-email-2020-03-08, steven-hertzberg-australian-medical-network-founder-linkedin-1995-1997, sec-form-d-0001797630-19-000001, sec-form-d-0001797630-21-000001, army-applications-laboratory-address-capital-factory-2026-10-23, cf-award-cabinet-office-faculty-2019-10-14-8e4b2d57, cf-award-nhs-supply-chain-faculty-2020-12-01-d1e0d017, cf-award-nhs-south-central-and-west-commissioning-support-unit-faculty-2023-03-01-2e2da92d). Earlier: 2026-10-23 five-lane merge: was the six nodes of the Warner email and Hertzberg rows; the guard now also holds back cf-award-cabinet-office-faculty-2019-10-14, cf-award-nhs-supply-chain-faculty-2020-12-01, cf-award-nhs-south-central-and-west-commissioning-support-unit-faculty-2023-03-01, sec-form-d-0001797630-19-000001, sec-form-d-0001797630-21-000001 and army-applications-laboratory-address-capital-factory-2026-10-23. 2026-10-23 promotion: + Hertzberg / Australian Medical Network ("medical" token)
// Privacy guard scope, pinned 2026-10-23 (owner decision; src/evidence.js, tools/build-graph.mjs).
// Old behaviour: any BANNED_PRIVATE_FIELDS word anywhere in a surface's id, label, participation types or
// receipt ids (or in a whole serialized record) suppressed it, so a label that described a document or named
// a company was held back. New behaviour: contact-data PATTERNS (email address, phone number, street address)
// in every field value; the bare word list only in field NAMES (fields that hold contact or private data).
for (const label of [
  'Ben Warner email to Imran Shafi and Dominic Cummings on contain-to-delay triggers, 8 March 2020',
  'Cabinet Office award to FACULTY SCIENCE LIMITED: Filing and Sorting Emails (Alpha), 2019-10-14',
  'NHS Supply Chain award to FACULTY SCIENCE LIMITED: Medical IT, 2020-12-01',
  'Steven Hertzberg: Australian Medical Network role observation (LinkedIn), 1995–1997'
]) {
  assert.equal(privateDataHit({ surface_label: label, notes: label, role: label }), null, `a descriptive word is not contact data: ${label}`);
}
assert.equal(privateDataHit({ participation_type: 'issuer_address_care_of', role: 'address-only link' }), null, 'a role type that says "address" is not an address');
assert.equal(privateDataHit({ notes: 'Supplier registered office 54 Welbeck Street, London' }, { streetAddress: false }), null, 'an organization-only record may carry its registered office');
assert.equal(contactDataPatternHit('write to jane.doe@example.org'), 'email');
assert.equal(contactDataPatternHit('call (512) 555-0100'), 'phone');
assert.equal(contactDataPatternHit('+44 20 7946 0000'), 'phone');
assert.equal(contactDataPatternHit('020 7946 0000'), 'phone');
assert.equal(contactDataPatternHit('lives at 12 Acacia Avenue'), 'street_address');
assert.equal(contactDataPatternHit('sec-form-d-0001797630-19-000001'), null, 'an SEC accession is not a phone number');
assert.equal(contactDataPatternHit('2019-10-14 to 2020-12-01'), null, 'dates are not phone numbers');
assert.equal(privateDataHit({ surface_label: 'Board minutes', notes: 'contact jane.doe@example.org' }).kind, 'email', 'an email address is hidden in any field');
assert.equal(privateDataHit({ receipt_ids: ['call 512-555-0100'] }).kind, 'phone', 'a phone number is hidden in any field, arrays included');
assert.equal(privateDataHit({ role: 'Adviser', personal_email: 'redacted' }).kind, 'field:email', 'a contact-data field is hidden by its name');
assert.equal(privateFieldNameHit('surface_label'), null);
assert.equal(privateFieldNameHit('home_address'), 'address');
assert.throws(() => assertPublicOnly({ label: 'x', phone: '0' }), /Private or sensitive field rejected: field:phone/);
assert.doesNotThrow(() => assertPublicOnly({ label: 'Ben Warner email to Imran Shafi' }));
assert.equal(realLedger.range.first_date, '1982-05-01'); // 2026-10-23 promotion: 2016-01-01 -> 1982-05-01 (earliest LinkedIn role)
assert.equal(realLedger.range.last_date, '2026-11-13'); // 2026-11-13 amplification chain: end of record 2026-11-10 -> 2026-11-13 (NIK's quote-post, and Encode's team page and DePue's about page dated by the retrieval day, are the latest surfaces). 2026-11-12 Bitter Struggle chain: 2026-10-23 -> 2026-11-10 (end of record 2026-10-23 -> 2026-11-10, the publication day of The Bitter Struggle, the latest surface). 2026-10-23 promotion: 2026-08-12 -> 2026-10-23
assert.equal(realEvents.counts.events, 9249); // 2026-11-13 amplification chain: 9,210 -> 9,249. 2026-11-12 UK meetings, second intake: 8,631 -> 9,210. 2026-11-12 UK contract awards: 5,834 -> 8,631. 2026-11-12 Bitter Struggle chain: 5,708 -> 5,834. 2026-11-12 UK ministerial meetings: 5,301 -> 5,708. 2026-11-10 hand-judged Form D filings: 4,248 -> 5,301. 2026-11-10 Form D data sets: 2,952 -> 4,248. 2026-11-10 follow-up: 2943 -> 2952. 2026-11-10 one-pass entry: 2707 -> 2943. 2026-11-10 lens-hunt promotion: 2688 -> 2707. 2026-10-23 final re-pin: 2706 -> 2688. 2026-10-23 five-lane merge: 1,759 -> 2,706. 2026-10-23 promotion: 163 -> 1,759
assert.equal(realField.metrics.node_count, 6896); // 2026-11-13 amplification chain: 6,861 -> 6,896. 2026-11-12 UK meetings, second intake: 6,790 -> 6,861. 2026-11-12 UK contract awards: 5,402 -> 6,790. 2026-11-12 Bitter Struggle chain: 5,315 -> 5,402. 2026-11-12 UK ministerial meetings: 5,237 -> 5,315. 2026-11-10 hand-judged Form D filings: 4,480 -> 5,237. 2026-11-10 Form D data sets: 3,763 -> 4,480. 2026-11-10 follow-up: 3650 -> 3763. 2026-11-10 one-pass entry: 3355 -> 3650. 2026-11-10 lens-hunt promotion: 3341 -> 3355. 2026-10-23 final re-pin: 3333 -> 3341. 2026-10-23 five-lane merge: 2,752 -> 3,333. 2026-10-23 promotion: 346 -> 2,752
assert.equal(realField.metrics.link_count, 11440); // 2026-11-13 amplification chain: 11,397 -> 11,440. 2026-11-12 UK meetings, second intake: 11,069 -> 11,397. 2026-11-12 UK contract awards: 8,272 -> 11,069. 2026-11-12 Bitter Struggle chain: 8,141 -> 8,272. 2026-11-12 UK ministerial meetings: 7,319 -> 8,141. 2026-11-10 hand-judged Form D filings: 6,266 -> 7,319. 2026-11-10 Form D data sets: 4,970 -> 6,266. 2026-11-10 follow-up: 4831 -> 4970. 2026-11-10 one-pass entry: 4506 -> 4831. 2026-11-10 lens-hunt promotion: 4487 -> 4506. 2026-10-23 final re-pin: 4467 -> 4487. 2026-10-23 five-lane merge: 3,216 -> 4,467. 2026-10-23 promotion: 392 -> 3,216
assert.equal(realField.links.filter(link => link.rows.length).length, 11217, 'every canonical overlay arc carries its participation row'); // 2026-11-13 amplification chain: 11,174 -> 11,217. 2026-11-12 UK meetings, second intake: 10,846 -> 11,174. 2026-11-12 UK contract awards: 8,049 -> 10,846. 2026-11-12 Bitter Struggle chain: 7,918 -> 8,049. 2026-11-12 UK ministerial meetings: 7,096 -> 7,918. 2026-11-10 hand-judged Form D filings: 6,043 -> 7,096. 2026-11-10 Form D data sets: 4,747 -> 6,043. 2026-11-10 follow-up: 4608 -> 4747. 2026-11-10 one-pass entry: 4283 -> 4608. 2026-11-10 lens-hunt promotion: 4264 -> 4283. 2026-10-23 final re-pin: 4244 -> 4264. 2026-10-23 five-lane merge: 2,993 -> 4,244. 2026-10-23 promotion: 169 -> 2,993
// Size, halo and tooltip count come from the ledger and agree with the inspector
// (nodeLedgerSummary) for every node on the field.
const realNode = id => realField.nodeById.get(id);
assert.equal(realNode('matt-clifford').size_count, 24, 'Matt Clifford: 24 documented surfaces (the Dialog roster row counts)'); // 2026-11-12 Bitter Struggle chain: 19 -> 24 (five new surfaces: the Inherent advisory role, the Action Plan lead-reviewer term, the AISI Advisory Board, and the reported Anthropic appointment and ARIA exit). 2026-11-12 UK ministerial meetings: 17 -> 19 (two ministerial meeting returns list him, Jeremy Hunt on 24 January 2024 and Kanishka Narayan on 17 September 2025). 2026-11-10 Form D data sets: 13 -> 17 (four Entrepreneur First Form D filings that list him). 2026-10-23 five-lane merge: 9 -> 13
assert.equal(realNode('ben-warner').size_count, 17, 'Ben Warner: 17 documented surfaces (the 2020-03-08 email row, drawn since the 2026-10-23 guard fix, counts; four SAGE meetings and the UKSA Challenge Panel added 2026-11-10)'); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(realNode('electric-twin').size_count, 22); // 2026-10-23 five-lane merge: 18 -> 22
assert.equal(realNode('surface-dialog-public-directory-exposure-2026-06-16').size_count, 113, 'the Dialog roster surface is sized by its 113 ledger rows, not by its arcs');
assert.equal(realNode('surface-dialog-public-directory-exposure-2026-06-16').arc_participant_count, 0, 'the field draws no arc into the contained roster, so an arc count would size it as empty');
assert.equal(realField.metrics.max_size_count, 833, 'the largest documented count is the Capital Factory portfolio-page block with 833 participation rows'); // 2026-10-23 promotion: 113 (Dialog) -> 833 (Capital Factory portfolio page)
assert.equal(realNode('surface-capital-factory-portfolio-page-2026-10-23').size_count, 833, 'the Capital Factory portfolio page is one dense block sized by its 833 ledger rows');
assert.equal(nodeCountLabel(realNode('matt-clifford')), '24 documented surfaces'); // 2026-11-12 Bitter Struggle chain: 19 documented surfaces -> 24 documented surfaces (five new surfaces: the Inherent advisory role, the Action Plan lead-reviewer term, the AISI Advisory Board, and the reported Anthropic appointment and ARIA exit). 2026-11-12 UK ministerial meetings: 17 documented surfaces -> 19 documented surfaces. 2026-11-10 Form D data sets: 13 documented surfaces -> 17 documented surfaces. 2026-10-23 five-lane merge: 9 -> 13
assert.equal(nodeCountLabel(realNode('surface-dialog-public-directory-exposure-2026-06-16')), '113 documented participants');
assert.equal(nodeCountLabel(realNode('joe-lonsdale')), '113 documented surfaces', 'a Dialog roster actor has a ledger row and the tooltip says so'); // 2026-11-10 hand-judged Form D filings: 112 documented surfaces -> 113 documented surfaces. 2026-11-10 Form D data sets: 14 documented surfaces -> 112 documented surfaces. 2026-11-10 one-pass entry: 10 -> 14 (four 8VC Form D filings). 2026-10-23 five-lane merge: 3 -> 10. 2026-10-23 promotion: 1 -> 3 (8VC and Cicero rows)
assert.equal(nodeCountLabel(realNode('alex-karp')), '0 documented surfaces · research context · no ledger rows', 'only a node with no ledger row is called research context');
let tooltipInspectorDisagreements = 0;
let nodesWithoutLedgerRows = 0;
for (const node of realField.nodes) {
  const summary = nodeLedgerSummary(realLedger, node.id);
  const inspectorCount = String(node.id).startsWith('surface-') ? summary.rows.length : summary.surface_count;
  if (node.size_count !== inspectorCount || node.ledger_row_count !== summary.rows.length) tooltipInspectorDisagreements += 1;
  if (node.ledger_row_count === 0) nodesWithoutLedgerRows += 1;
  assert.equal(nodeCountLabel(node).includes('no ledger rows'), summary.rows.length === 0, `${node.id}: "no ledger rows" is said only when the ledger has none`);
}
assert.equal(tooltipInspectorDisagreements, 0, 'the tooltip count and the inspector count agree on every node');
assert.equal(nodesWithoutLedgerRows, 87, '87 of 5,402 field nodes carry no ledger row (research context only)'); // 2026-11-12 Bitter Struggle chain: 88 -> 87 (Sam Altman, a research-graph node until now, is a listed participant of the White House meeting of 4 May 2023). 2026-11-12 UK ministerial meetings: 89 -> 88 (Jade Leung, a research-graph node until now, is listed on a DSIT meeting return). 2026-11-10 follow-up: 90 -> 89 (Wayve, a research-graph node until now, is on the techUK roundtable addendum). 2026-11-10 one-pass entry: 92 -> 90 (European Commission and Google DeepMind, research-graph nodes until now, carry ledger rows). 2026-10-23 five-lane merge: 96 of 2,752 -> 92 of 3,333. 2026-10-23 promotion: 103 of 346 -> 96 of 2,752
const window2025 = normalizeEcologyWindow(realLedger.range, { fromDay: ecologyDay('2025-01-01'), toDay: ecologyDay('2025-12-31') });
const realFactors = fieldWindowFactors(realLedger, window2025);
assert.equal(realFactors.rows_in_window, 2375); // 2026-11-13 amplification chain: 2,369 -> 2,375. 2026-11-12 UK meetings, second intake: 2,260 -> 2,369. 2026-11-12 UK contract awards: 1,720 -> 2,260. 2026-11-12 Bitter Struggle chain: 1,681 -> 1,720. 2026-11-12 UK ministerial meetings: 1,097 -> 1,681. 2026-11-10 hand-judged Form D filings: 944 -> 1,097. 2026-11-10 Form D data sets: 800 -> 944. 2026-11-10 follow-up: 791 -> 800. 2026-11-10 one-pass entry: 764 -> 791. 2026-11-10 lens-hunt promotion: 761 -> 764. 2026-10-23 final re-pin: 768 -> 761. 2026-10-23 five-lane merge: 539 -> 768. 2026-10-23 promotion: 63 -> 539
const benWarner = nodeLedgerSummary(realLedger, 'ben-warner', window2025);
assert.equal(benWarner.rows.length, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(benWarner.rows_in_window, 5); // 2026-10-23 five-lane merge: 4 -> 5 (the 2025-07-07 synthetic-voters row)
assert.equal(benWarner.surface_count, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(benWarner.off_field_rows, 0); // 2026-10-23 final re-pin: 1 -> 0 (his 2020-03-08 email surface is no longer privacy-guarded)
assert.equal(dayIso(benWarner.first_day), '2018-01-24');
assert.equal(dayIso(benWarner.last_day), '2026-08-11');
assert.equal(benWarner.receipt_ids.length, 24); // 2026-11-10 lens-hunt promotion: 17 -> 24. 2026-10-23 five-lane merge: 14 -> 17
assert.equal(activeEcologyEvents(realEvents, null).length, 0);
assert.equal(activeEcologyEvents(realEvents, window2025).length, 1940); // 2026-11-13 amplification chain: 1,934 -> 1,940. 2026-11-12 UK meetings, second intake: 1,825 -> 1,934. 2026-11-12 UK contract awards: 1,285 -> 1,825. 2026-11-12 Bitter Struggle chain: 1,246 -> 1,285. 2026-11-12 UK ministerial meetings: 1,012 -> 1,246. 2026-11-10 hand-judged Form D filings: 859 -> 1,012. 2026-11-10 Form D data sets: 715 -> 859. 2026-11-10 follow-up: 706 -> 715. 2026-11-10 one-pass entry: 679 -> 706. 2026-11-10 lens-hunt promotion: 676 -> 679. 2026-10-23 final re-pin: 683 -> 676. 2026-10-23 five-lane merge: 494 -> 683. 2026-10-23 promotion: 60 -> 494
console.log('field ledger real-data pins: PASS');

// Heat on the real field at the end of record: every surface's heat and every
// object's residue is heat() of its own ledger rows; nothing else enters.
const endOfRecord = realLedger.range.last_day;
assert.equal(heatTimeForWindow(realLedger.range, null), endOfRecord, 'with no window, t is the end of record');
assert.equal(heatTimeForWindow(realLedger.range, window2025), ecologyDay('2025-12-31'), 'with a window, t is its end');
let heatDisagreements = 0, colourDisagreements = 0;
for (const node of realField.nodes) {
  const surfaceNode = node.id.startsWith('surface-');
  const rows = surfaceNode ? (realLedger.rowsBySurfaceNode.get(node.id) ?? []) : (realLedger.rowsByNode.get(node.id) ?? []);
  if (!rows.length) { if (node.heat !== null || node.heat_value !== 0) heatDisagreements += 1; continue; }
  if (Math.abs(node.heat_value - heat(rows, endOfRecord).total) > 1e-9) heatDisagreements += 1;
  const expected = surfaceNode ? HEAT_CLASS_COLORS[heatClassForSurfaceType(rows[0].surface_type)]
    : node.ontology === 'person' ? heatMixColor(node.heat.by_class) : ONTOLOGY_COLORS[node.ontology];
  if (node.color !== expected) colourDisagreements += 1;
}
assert.equal(heatDisagreements, 0, 'every node\'s heat is heat() of its own ledger rows');
assert.equal(colourDisagreements, 0, 'canonical surface = its class colour; person = class mix; anything else keeps its ontology fill');
const roster = realNode('surface-dialog-public-directory-exposure-2026-06-16');
assert.equal(roster.heat_class, 'appointment');
assert.equal(roster.heat.touches.length + roster.heat.undated.length + roster.heat.later.length, 113, 'the roster is one block: its 113 rows sum on one node');
assert.equal(realField.nodes.filter(node => node.id.includes('dialog-public-directory')).length, 1);
// Moving t restyles in place and is reversible.
const heatBefore = realNode('ben-warner').heat_value;
applyFieldHeat(realField, realLedger, ecologyDay('2020-01-01'));
assert.ok(realNode('ben-warner').heat_value < heatBefore, 'earlier t, less residue');
assert.equal(realNode('ben-warner').heat.at_date, '2020-01-01');
applyFieldHeat(realField, realLedger, endOfRecord);
assert.equal(realNode('ben-warner').heat_value, heatBefore);
assert.match(heatBreakdownText(realNode('ben-warner').heat, { noun: 'residue' }), /^residue \d+(\.\d+)? = \d+ touches at 2026-11-13: /); // 2026-11-13 amplification chain: end of record 2026-11-10 -> 2026-11-13. 2026-11-12 Bitter Struggle chain: end of record 2026-10-23 -> 2026-11-10, the publication day of The Bitter Struggle, the latest surface. 2026-10-23 promotion: end of record 2026-08-12 -> 2026-10-23
console.log('heat real-data pins: PASS');

const rendererSource = readFileSync('src/atlas-webgl.js', 'utf8');
assert.match(rendererSource, /enableNodeDrag\?\.|enableNodeDrag/);
assert.match(rendererSource, /enableNodeDrag\(false\)/, 'individual field nodes must not advertise meaningless drag agency');
assert.doesNotMatch(rendererSource, /particleCount|updateParticles/, 'ambient particles without dated evidence must not animate links');
assert.doesNotMatch(rendererSource, /heat_color|reinforcement heat|strongest_repeat|documented_degree|clustering|machine_score|factory_score|recurrence_score/, 'no hidden composite (degree, clustering, repeat, machine or factory score) drives a visual channel or a tooltip');
assert.match(rendererSource, /nodeSizeForHeat\(node\.heat_value\)/, 'core size derives from the printed heat or residue');
assert.match(rendererSource, /applyFieldHeat\(field, fieldLedger, day\)/, 'moving t re-applies the printed accumulation');
assert.match(rendererSource, /heatTimeForWindow/, 't is the window end');
assert.match(rendererSource, /size_count/, 'without a ledger, size falls back to the documented count');
assert.match(rendererSource, /escapeHtml\(nodeCountLabel\(node\)\)/, 'the tooltip prints the shared ledger count label');
assert.doesNotMatch(rendererSource, /no ledger rows/, 'the renderer does not word the count itself: social-field owns the one label');
assert.match(rendererSource, /setTimeWindow/);
assert.match(rendererSource, /eventInWindow/);
assert.doesNotMatch(rendererSource, /pulseDays|ecologyTemporalIntensity/, 'the 45-day pulse shoulder is gone');
assert.doesNotMatch(rendererSource, /new Map\(field\.nodes/, 'the nodeById map is hoisted out of the per-frame path');
assert.doesNotMatch(rendererSource, /function ecologyFrame|ecologyRaf/, 'no continuous pulse loop: pulses update on demand');
assert.equal((rendererSource.match(/material\.needsUpdate/g) ?? []).length, 1, 'material.needsUpdate is set only when the transparent flag flips');
assert.match(rendererSource, /geometry\.attributes\.position\.needsUpdate = true/, 'arc rebuilds still mark their geometry');
assert.match(rendererSource, /onLinkSelect\?\.\(link\)/, 'arc clicks hand the whole link to the runtime');
assert.match(rendererSource, /setObjectStrength\(link\.__lineObj/, '3d-force-graph binds custom link objects at __lineObj; arc factors must address that object');
assert.doesNotMatch(rendererSource, /link\.__threeObj/, 'reading the node binding on a link leaves every arc factor inert');
assert.match(rendererSource, /selectLink/);
assert.doesNotMatch(rendererSource, /function shellForce|function clusterForce/, 'dead layout forces are deleted');
assert.match(rendererSource, /const ARC_LIFT = Object\.freeze\(\{ topology: 8, research: 12 \}\)/, 'one lift constant per arc kind');
assert.equal((rendererSource.match(/ARC_LIFT\.topology/g) ?? []).length, 2, 'the arc and the pulse bead that rides it share the topology lift');
assert.doesNotMatch(rendererSource, /lift = 12 \+ Math\.min/, 'no weight-scaled pulse lift floats the bead off its arc');
assert.ok(eventModel.events.every(event => event.graph_effect == null), 'display events remain graph-inert objects inside a graph-inert projection');
assert.ok(eventModel.events.filter(event => event.event_kind === 'participation').every(event => event.surface_node_id.startsWith('surface-')));
console.log('ecology renderer contract: PASS');

// Runtime contract. The classic-script field runtime is evaluated in a vm
// context seeded with the core helpers and part-1's shared state, then driven
// with the real field: an arc opens its participation row or its claim, rows
// the field cannot draw are labelled, the window header counts its rows, and
// the animation lifecycle reports its state.
const runtimeSource = readFileSync('src/visual-aperture-social-field-runtime.js', 'utf8');
const partOneSource = readFileSync('src/visual-aperture-part-1.js', 'utf8');
const partTenSource = readFileSync('src/visual-aperture-part-10.js', 'utf8');
const loaderSource = readFileSync('src/visual-aperture.js', 'utf8');
const realCatalog = JSON.parse(readFileSync('build/public-catalog.json', 'utf8'));
const realReceiptGraph = JSON.parse(readFileSync('build/receipt-graph.json', 'utf8'));
const inspector = { label: null, html: '' };
const context = vm.createContext({
  console,
  EMBEDDED_DATA: { 'build/public-catalog.json': realCatalog },
  setInspector: (label, html) => { inspector.label = label; inspector.html = html; },
  routeActorIds: () => []
});
Object.assign(context, core);
vm.runInContext(partOneSource, context);
vm.runInContext(runtimeSource, context);
const runtimeState = vm.runInContext('state', context);
runtimeState.data = { surfaceGraph: realSurfaceGraph, legacyGraph: realGraph, receiptGraph: realReceiptGraph, hopGraph: { edges: [] } };
runtimeState.actors = new Map((realSurfaceGraph.actors ?? []).map(actor => [actor.id, actor]));
runtimeState.surfaces = new Map(realSurfaceGraph.surfaces.map(surface => [surface.surface_id, surface]));
runtimeState.receipts = new Map((realReceiptGraph.receipts ?? []).map(receipt => [receipt.receipt_id, receipt]));
runtimeState.legacyNodes = new Map(realGraph.nodes.map(node => [node.id, node]));
runtimeState.root = { querySelector: () => null, querySelectorAll: () => [], dataset: {} };
runtimeState.webgl = { renderer: null, model: realModel, ledger: realLedger, events: realEvents, eventApi: social, failed: false, rendered: true, active: true, intersecting: true };

const topologyLink = realField.links.find(link => link.topology_only && link.rows.some(row => row.node_id === 'ben-warner' && row.surface_id === 'electric-twin-incorporation-2023-09-28'));
assert.ok(topologyLink, 'the Ben Warner to Electric Twin incorporation arc carries its participation row');
assert.equal(context.selectFieldLink(topologyLink), true);
assert.equal(inspector.label, runtimeState.actors.get('ben-warner').label);
assert.match(inspector.html, /Participation row/);
assert.match(inspector.html, /Initial director appointed on the incorporation date/);
assert.match(inspector.html, /Electric Twin incorporation and initial-director surface, 28 September 2023/);
assert.match(inspector.html, /aperture-badge--official/);
assert.match(inspector.html, /data-open-receipt="companies-house-electric-twin-incorporation-2023-09-28"/);
assert.match(inspector.html, /data-ap-action="open-record" data-actor-id="ben-warner"/);
assert.match(inspector.html, /data-ap-surface="electric-twin-incorporation-2023-09-28"/);
assert.doesNotMatch(inspector.html, /not drawn on the field/, 'a drawn arc has no off-field note');
// Every receipt on a row is a button: no "+N more" stub on the rows that carry four or more.
const fourReceiptRows = realLedger.rows.filter(row => row.receipt_ids.length > 3);
assert.equal(fourReceiptRows.length, 102); // 2026-11-10 lens-hunt promotion: 95 -> 102. 2026-10-23 five-lane merge: 50 -> 95. 2026-10-23 promotion: 5 -> 50 rows with more than three receipts
for (const row of fourReceiptRows) {
  const item = context.fieldRowItem(row, context.ecologyWindow());
  assert.equal((item.match(/data-open-receipt=/g) ?? []).length, row.receipt_ids.length, `every receipt on ${row.surface_id} is a button`);
  assert.doesNotMatch(item, /\+\d+ more/);
}
fourReceiptRows.sort((a, b) => a.receipt_ids.length - b.receipt_ids.length); // 2026-10-23 promotion: the four-receipt probe below picks a row with exactly four
assert.equal(fourReceiptRows[0].receipt_ids.length, 4);
const fourReceiptItem = context.fieldRowItem(fourReceiptRows[0], context.ecologyWindow());
assert.equal((fourReceiptItem.match(/data-open-receipt=/g) ?? []).length, 4, 'all four receipts are buttons');
assert.doesNotMatch(fourReceiptItem, /\+\d+ more/);
assert.doesNotMatch(runtimeSource, /receiptButtons\(row\.receipt_ids, 3\)/, 'row receipts are not capped');

const researchLink = realField.links.find(link => link.id === 'e-mc-authors-action-plan');
assert.equal(researchLink.topology_only, false);
assert.deepEqual(researchLink.rows, []);
assert.equal(context.selectFieldLink(researchLink), true);
assert.match(inspector.html, /Research-context edge · undated · not a hop/);
assert.match(inspector.html, /Peter Kyle appointed Matt Clifford/);
assert.match(inspector.html, /data-ap-field-claim="clm-e-mc-authors-action-plan"/);
assert.match(inspector.html, /GOV\.UK, AI expert to lead Action Plan, 26 Jul 2024/, 'graph sources are named on the edge');
assert.match(inspector.html, /the time window never fades it/);
const claimKeys = await context.fieldClaimKeys();
assert.ok(claimKeys.get('clm-e-mc-authors-action-plan')?.endsWith('::clm-e-mc-authors-action-plan'), 'the research edge resolves to its catalogued claim key');
const researchLinks = realField.links.filter(link => !link.topology_only);
const rowlessTopology = realField.links.filter(link => link.topology_only && !link.rows.length);
assert.equal(researchLinks.length, 202);
assert.equal(rowlessTopology.length, 21, 'umbrella-membership overlays carry no participation row and read as claims');
const unresolvedClaims = [...researchLinks, ...rowlessTopology].filter(link => !claimKeys.has(`clm-${link.id}`));
assert.equal(unresolvedClaims.length, 0, `every arc without a participation row opens a catalogued claim: ${unresolvedClaims.map(link => link.id).join(', ')}`);
assert.equal(context.selectFieldLink(rowlessTopology[0]), true);
assert.match(inspector.html, /Documented topology edge · undated · not a hop/);

// The inspector's fact grid names the same count with the same noun as the tooltip.
const factGrid = id => context.fieldFactGrid(realField.nodeById.get(id), nodeLedgerSummary(realLedger, id));
assert.match(factGrid('joe-lonsdale'), /<strong>113<\/strong><span>documented surfaces<\/span>/); // 2026-11-10 hand-judged Form D filings: 112 -> 113. 2026-11-10 Form D data sets: 14 -> 112. 2026-11-10 one-pass entry: 10 -> 14. 2026-10-23 five-lane merge: 3 -> 10. 2026-10-23 promotion: 1 -> 3
assert.match(factGrid('joe-lonsdale'), /<strong>113<\/strong><span>participation rows<\/span>/); // 2026-11-10 hand-judged Form D filings: 112 -> 113. 2026-11-10 Form D data sets: 14 -> 112. 2026-11-10 one-pass entry: 10 -> 14. 2026-10-23 five-lane merge: 3 -> 10. 2026-10-23 promotion: 1 -> 3
assert.match(factGrid('matt-clifford'), /<strong>24<\/strong><span>documented surfaces<\/span>/); // 2026-11-12 Bitter Struggle chain: 19 -> 24. 2026-11-12 UK ministerial meetings: 17 -> 19. 2026-11-10 Form D data sets: 13 -> 17. 2026-10-23 five-lane merge: 9 -> 13
assert.match(factGrid('ben-warner'), /<strong>17<\/strong><span>documented surfaces<\/span>/); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.match(factGrid('surface-dialog-public-directory-exposure-2026-06-16'), /<strong>113<\/strong><span>documented participants<\/span>/);
assert.equal(factGrid('matt-clifford').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').includes(nodeCountLabel(realField.nodeById.get('matt-clifford'))), true, 'the fact grid contains the tooltip label verbatim');

const rowsMarkup = context.fieldRowsMarkup('ben-warner');
assert.match(rowsMarkup, /17 rows · all time/); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
// Narrowed 2026-10-23 final re-pin (privacy guard scope). Old: Ben Warner's real rows carried one guarded row,
// labelled on the row and counted in the header (2 labels, 1 off-field marker). His email surface is no longer
// guarded, so his real rows carry none; the labelling rule is now checked on the fixture ledger, whose 'guarded'
// surface has no research-graph node.
assert.equal((rowsMarkup.match(/not drawn on the field \(privacy guard\)/g) ?? []).length, 0, 'no guarded row on the real Ben Warner rows (2026-10-23 final re-pin: 2 -> 0)');
assert.equal((rowsMarkup.match(/data-ap-off-field="privacy_guard"/g) ?? []).length, 0); // 2026-10-23 final re-pin: 1 -> 0
{
  const realRuntimeLedger = runtimeState.webgl.ledger;
  runtimeState.webgl.ledger = ledger;
  const fixtureRowsMarkup = context.fieldRowsMarkup('a');
  runtimeState.webgl.ledger = realRuntimeLedger;
  assert.equal((fixtureRowsMarkup.match(/not drawn on the field \(privacy guard\)/g) ?? []).length, 2, 'the guarded row is labelled on the row and counted in the header');
  assert.equal((fixtureRowsMarkup.match(/data-ap-off-field="privacy_guard"/g) ?? []).length, 1);
}
assert.equal((rowsMarkup.match(/data-ap-row=/g) ?? []).length, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
runtimeState.ecology.fromDay = ecologyDay('2025-01-01');
runtimeState.ecology.toDay = ecologyDay('2025-12-31');
const windowedMarkup = context.fieldRowsMarkup('ben-warner');
assert.match(windowedMarkup, /5 of 17 rows in window/); // 2026-11-10 lens-hunt promotion: 5 of 12 -> 5 of 17. 2026-10-23 five-lane merge: 4 of 10 -> 5 of 12
assert.equal((windowedMarkup.match(/is-outside/g) ?? []).length, 12, 'out-of-window rows dim and stay listed'); // 2026-11-10 lens-hunt promotion: 7 -> 12. 2026-10-23 five-lane merge: 6 -> 7
assert.match(context.ecologyClockLabel(), /^2025-01-01 → 2025-12-31 · 2375 of 12233 rows in window$/); // 2026-11-13 amplification chain: 2,369 of 12,190 -> 2,375 of 12,233. 2026-11-12 UK meetings, second intake: 2,260 of 11,611 -> 2,369 of 12,190. 2026-11-12 UK contract awards: 1,720 of 8,814 -> 2,260 of 11,611. 2026-11-12 Bitter Struggle chain: 1,681 of 8,683 -> 1,720 of 8,814. 2026-11-12 UK ministerial meetings: 1,097 of 7,243 -> 1,681 of 8,683. 2026-11-10 hand-judged Form D filings: 944 of 6,190 -> 1,097 of 7,243. 2026-11-10 Form D data sets: 800 of 4,894 -> 944 of 6,190. 2026-11-10 follow-up: 791 of 4,755 -> 800 of 4,894. 2026-11-10 one-pass entry: 764 of 4,430 -> 791 of 4,755. 2026-11-10 lens-hunt promotion: 761 of 4,411 -> 764 of 4,430. 2026-10-23 final re-pin: 768 of 4,451 -> 761 of 4,411. 2026-10-23 five-lane merge: 539 of 3,118 -> 768 of 4,451. 2026-10-23 promotion: 63 of 286 -> 539 of 3,118
runtimeState.ecology.fromDay = null;
runtimeState.ecology.toDay = null;
assert.match(context.ecologyClockLabel(), /· all time · 12233 rows$/); // 2026-11-13 amplification chain: 12,190 -> 12,233. 2026-11-12 UK meetings, second intake: 11,611 -> 12,190. 2026-11-12 UK contract awards: 8,814 -> 11,611. 2026-11-12 Bitter Struggle chain: 8,683 -> 8,814. 2026-11-12 UK ministerial meetings: 7,243 -> 8,683. 2026-11-10 hand-judged Form D filings: 6,190 -> 7,243. 2026-11-10 Form D data sets: 4,894 -> 6,190. 2026-11-10 follow-up: 4,755 -> 4,894. 2026-11-10 one-pass entry: 4,430 -> 4,755. 2026-11-10 lens-hunt promotion: 4,411 -> 4,430. 2026-10-23 final re-pin: 4,451 -> 4,411. 2026-10-23 five-lane merge: 3,118 -> 4,451. 2026-10-23 promotion: 286 -> 3,118

// A node with more than APERTURE_FIELD_ROW_LIMIT rows: every row is rendered
// (the later ones inside a details element), nothing is "not shown here", and
// the header's denominator is the ledger's whatever the window.
const electricTwinMarkup = context.fieldRowsMarkup('electric-twin');
assert.equal((electricTwinMarkup.match(/data-ap-row=/g) ?? []).length, 22, 'all 22 Electric Twin rows are rendered'); // 2026-10-23 five-lane merge: 18 -> 22
assert.match(electricTwinMarkup, /<span data-ap-window-count data-ap-node="electric-twin">22 rows · all time<\/span>/); // 2026-10-23 five-lane merge: 18 -> 22
assert.match(electricTwinMarkup, /<details class="aperture-field-rows-more"><summary>Show the 12 later rows \(the list continues oldest first\)<\/summary>/); // 2026-10-23 five-lane merge: 8 -> 12 later rows
assert.doesNotMatch(electricTwinMarkup, /not shown here|earlier-listed/, 'no row is cut from the list');
// Narrowed 2026-10-23 five-lane merge: the fixture was ben-warner, who now has 12 rows, so he is no longer a
// ten-rows-or-fewer node. The rule is unchanged and now runs on joe-lonsdale (exactly 10 rows). Old:
// fieldRowsMarkup('ben-warner') has 0 <details>. New: fieldRowsMarkup('joe-lonsdale') has 0 <details>.
// Narrowed 2026-11-10 one-pass entry: joe-lonsdale now has 14 rows (four 8VC Form D filings), so he is no
// longer a ten-rows-or-fewer node. The rule is unchanged and now runs on justin-fanelli (exactly 10 rows,
// none of them from this pass). Old: fieldRowsMarkup('joe-lonsdale').
assert.equal((context.fieldRowsMarkup('justin-fanelli').match(/data-ap-row=/g) ?? []).length, 10, 'the fixture has exactly ten rows');
assert.equal((context.fieldRowsMarkup('justin-fanelli').match(/<details/g) ?? []).length, 0, 'ten rows or fewer need no details element');
runtimeState.ecology.fromDay = ecologyDay('2025-06-01');
runtimeState.ecology.toDay = null;
const electricTwinWindowed = context.fieldRowsMarkup('electric-twin');
assert.match(electricTwinWindowed, /21 of 22 rows in window/); // 2026-10-23 five-lane merge: 17 of 18 -> 21 of 22
assert.equal((electricTwinWindowed.match(/is-outside/g) ?? []).length, 1, 'the one 2023 single-day row dims; the 21 later or still-open rows do not'); // 2026-10-23 five-lane merge: 17 -> 21
assert.match(context.fieldRowsMarkup('mod'), /81 of 369 rows in window/); // 2026-11-12 UK contract awards: 9 of 19 -> 81 of 369 (the MoD buys on 344 of the award notices and is named on 6 more; 72 of those rows fall in the window). 2026-11-12 UK ministerial meetings: 7 of 14 -> 9 of 19 (MoD publishes five of the meeting returns; two fall in the window). 2026-10-23 five-lane merge: 6 of 13 -> 7 of 14
// syncInspectorWindowMarks recomputes the header from the ledger summary of the
// node it names, not from the rows it can see in the DOM.
const windowHeader = { dataset: { apNode: 'electric-twin' }, textContent: 'stale' };
const visibleRow = {
  dataset: { apStart: String(ecologyDay('2023-09-28')), apEnd: String(ecologyDay('2023-09-28')) },
  classList: { toggles: [], toggle(name, force) { this.toggles.push([name, force]); } },
  style: {}
};
const undatedItem = { dataset: { apStart: '', apEnd: '' }, classList: { toggles: [], toggle(name, force) { this.toggles.push([name, force]); } }, style: {} };
const previousRoot = runtimeState.root;
runtimeState.root = {
  dataset: {},
  querySelector: selector => (selector === '[data-ap-window-count]' ? windowHeader : null),
  querySelectorAll: selector => (selector === '[data-ap-row]' ? [visibleRow, undatedItem] : [])
};
context.syncInspectorWindowMarks();
assert.equal(windowHeader.textContent, '21 of 22 rows in window', 'two visible items do not become the denominator'); // 2026-10-23 five-lane merge: 17 of 18 -> 21 of 22
assert.deepEqual(visibleRow.classList.toggles, [['is-outside', true]]);
assert.equal(visibleRow.style.opacity, '.45');
assert.deepEqual(undatedItem.classList.toggles, [['is-outside', false]], 'an undated list row never dims');
assert.equal(undatedItem.style.opacity, '');
runtimeState.ecology.fromDay = null;
runtimeState.ecology.toDay = null;
context.syncInspectorWindowMarks();
assert.equal(windowHeader.textContent, '22 rows · all time'); // 2026-10-23 five-lane merge: 18 -> 22
assert.equal(visibleRow.style.opacity, '');
runtimeState.root = previousRoot;

const lifecycle = [];
runtimeState.mode = 'map';
runtimeState.webgl.renderer = { pause: () => lifecycle.push('pause'), resume: () => lifecycle.push('resume') };
context.syncFieldAnimation();
assert.equal(runtimeState.root.dataset.apertureAnimation, 'running');
runtimeState.webgl.intersecting = false;
context.syncFieldAnimation();
assert.equal(runtimeState.root.dataset.apertureAnimation, 'paused', 'an off-screen stage pauses the field');
runtimeState.webgl.intersecting = true;
context.document = { visibilityState: 'hidden' };
context.syncFieldAnimation();
assert.equal(runtimeState.root.dataset.apertureAnimation, 'paused', 'a hidden document pauses the field');
context.document = { visibilityState: 'visible' };
context.syncFieldAnimation();
assert.equal(runtimeState.root.dataset.apertureAnimation, 'running');
assert.deepEqual(lifecycle, ['resume', 'pause', 'pause', 'resume']);
assert.equal(runtimeState.ecology.playing, false, 'playback never starts on its own');

assert.doesNotMatch(runtimeSource, /onLinkSelect: \(\) => \{\}/, 'arc selection is wired');
assert.match(runtimeSource, /onLinkSelect: selectFieldLink/);
assert.match(runtimeSource, /data-open-claim=/, 'a research arc opens its claim through the public evidence dialog');
assert.match(runtimeSource, /apertureAnimation = running \? 'running' : 'paused'/);
assert.match(runtimeSource, /new IntersectionObserver/);
assert.match(runtimeSource, /addEventListener\('visibilitychange'/);
assert.match(runtimeSource, /prefers-reduced-motion: reduce/);
assert.match(runtimeSource, /rows in window/);
assert.doesNotMatch(runtimeSource, /level !== 'corpus'/, 'the field stays active at all four map levels');
assert.doesNotMatch(runtimeSource, /reinforcement heat|strongest_repeat|machine_score|factory_score|recurrence_score/, 'no hidden composite survives in the runtime');
// The formula is printed beside the field and in its controls, verbatim.
assert.ok(runtimeSource.includes("'heat = Σ touches weight(class) × 0.8^years; policy 1 · appointment 1 · procurement 2 · capital 2'"), 'the runtime prints the heat formula');
assert.equal(vm.runInContext('APERTURE_HEAT_FORMULA', context), HEAT_FORMULA, 'the printed formula is the computed one');
const legendMarkup = vm.runInContext('APERTURE_FIELD_LEGEND', context);
for (const [name, colour] of Object.entries(HEAT_CLASS_COLORS)) {
  assert.ok(legendMarkup.includes(`data-ap-heat-class="${name}"><i class="aperture-key aperture-key--heat" style="background:${colour}"`), `the legend keys ${name}`);
}
assert.ok(legendMarkup.includes(HEAT_FORMULA));
assert.ok(vm.runInContext('APERTURE_HEAT_CONTROL_LEGEND', context).includes(HEAT_FORMULA), 'the controls carry the formula');
const rosterHeat = context.fieldHeatInspectorMarkup('surface-dialog-public-directory-exposure-2026-06-16');
assert.match(rosterHeat, /data-ap-heat-sum>heat \d+(\.\d+)? = \d+ touches at 2026-11-13: appointment 1 × 0\.8\^/, 'the surface inspector prints its heat denominator'); // 2026-11-13 amplification chain: end of record 2026-11-10 -> 2026-11-13. 2026-11-12 Bitter Struggle chain: end of record 2026-10-23 -> 2026-11-10, the publication day of The Bitter Struggle, the latest surface. 2026-10-23 promotion: end of record 2026-10-23
const benHeat = context.fieldHeatInspectorMarkup('ben-warner');
assert.match(benHeat, /<h4>Residue at 2026-11-13<\/h4>/); // 2026-11-13 amplification chain: end of record 2026-11-10 -> 2026-11-13. 2026-11-12 Bitter Struggle chain: end of record 2026-10-23 -> 2026-11-10, the publication day of The Bitter Struggle, the latest surface. 2026-10-23 promotion: end of record 2026-10-23
assert.match(benHeat, /data-ap-heat-class="capital"/);
assert.equal(context.fieldHeatInspectorMarkup('alex-karp'), '', 'no ledger row, no printed heat');
assert.match(factGrid('ben-warner'), /data-ap-heat="ben-warner"/, 'a person\'s inspector prints its residue');
assert.match(partOneSource, /ecology: \{ fromDay: null, toDay: null, [^}]*playing: false/, 'playing defaults to false');
assert.match(partTenSource, /ap-ecology-time-to/);
assert.match(partTenSource, /ecology-all-time/);
assert.match(rendererSource, /^export \* from '\.\/social-field\.js';$/m, 'the renderer re-exports the whole social-field API, so the runtime gets it through the loader');
assert.match(loaderSource, /\{ \.\.\.renderer,/, 'the loader spreads the renderer module, which carries the social-field API');
const renderer = await import('../src/atlas-webgl.js').catch(() => null);
if (renderer) {
  for (const name of ['buildFieldLedgerIndex', 'nodeLedgerSummary', 'windowCountPhrase', 'rowInWindow', 'normalizeEcologyWindow', 'ecologyWindowLabel', 'dayIso', 'fieldWindowFactors']) {
    assert.equal(typeof renderer[name], 'function', `${name} reaches the runtime through the renderer module`);
  }
}
// --- decision heat (2026-11-10, on the owner's go-ahead of that day): the same sum over official_ rows, nothing reweighted
assert.equal(social.DECISION_HEAT_VERSION, 'decision-heat@1');
assert.deepEqual([...social.HEAT_BASES], ['all', 'decisions']);
assert.match(social.DECISION_HEAT_FORMULA, /^decision heat = the same sum over the rows on surfaces whose recorded status begins official_/);
assert.equal(social.isDecisionRow({ surface_status: 'official_award_notice' }), true);
assert.equal(social.isDecisionRow({ surface_status: 'reported_event' }), false);
assert.equal(social.isDecisionRow({ surface_status: 'unofficial_note' }), false, 'official_ is a prefix, not a substring');
assert.equal(social.isDecisionRow({}), false, 'a row with no recorded status is not a decision row');
const realStatus = new Map(realSurfaceGraph.surfaces.map(surface => [surface.surface_id, surface.status ?? null]));
for (const row of realLedger.rows) assert.equal(row.surface_status, realStatus.get(row.surface_id), 'every ledger row carries its surface status as recorded');
const realDecisionRows = social.heatBasisRows(realLedger.rows, 'decisions');
const realAllHeat = heat(realLedger.rows, realLedger.range.last_day);
const realDecisionHeat = heat(realDecisionRows, realLedger.range.last_day);
assert.ok(realDecisionRows.length > 0 && realDecisionRows.length < realLedger.rows.length, 'some rows are on official instruments and some are not');
assert.ok(realDecisionHeat.total > 0 && realDecisionHeat.total < realAllHeat.total);
const realHeatTermByRow = new Map(realAllHeat.touches.map(touch => [touch.row.row_id, touch.contribution]));
for (const touch of realDecisionHeat.touches) assert.equal(touch.contribution, realHeatTermByRow.get(touch.row.row_id), 'a decision term is the heat term of the same row, unchanged');
assert.equal(realField.heat_basis, 'all', 'a field is summed over all rows unless a basis is named');
console.log('field runtime contract: PASS');
