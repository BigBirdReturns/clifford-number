import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  buildSocialFieldModel, buildEcologyEventModel, buildFieldLedgerIndex, buildResearchNetworkModel,
  activeEcologyEvents, ecologyEventsForNode, ecologyPlayheadLabel, isSurfaceNode, socialFieldNeighbors,
  normalizeEcologyWindow, rowInWindow, eventInWindow, fieldWindowFactors, nodeLedgerSummary, ecologyWindowLabel, ecologyDay, dayIso,
  ONTOLOGY_COLORS
} from '../src/social-field.js';

const nodes = [
  { id: 'a', label: 'Actor A', type: 'person', cluster: 'policy' },
  { id: 'b', label: 'Actor B', type: 'person', cluster: 'policy' },
  { id: 'c', label: 'Actor C', type: 'person', cluster: 'capital' },
  { id: 'org-x', label: 'Org X', type: 'company', cluster: 'capital' },
  { id: 'surface-one', label: 'Surface One', type: 'surface', cluster: 'policy' },
  { id: 'surface-two', label: 'Surface Two', type: 'surface', cluster: 'policy' },
  { id: 'surface-open', label: 'Open-ended programme', type: 'surface', cluster: 'policy' },
  { id: 'surface-year', label: 'Year-precision campaign', type: 'surface', cluster: 'policy' }
];
const edges = [
  ['a', 'surface-one'], ['b', 'surface-one'], ['c', 'surface-one'],
  ['a', 'surface-two'], ['b', 'surface-two'],
  ['org-x', 'surface-open'], ['c', 'surface-year']
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
assert.equal(first.metrics.topology_link_count, 7);
assert.equal(first.metrics.surface_count, 4);
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
assert.equal(a.surface_count, 2);
assert.equal(c.surface_count, 2);
assert.equal(a.size_count, 2);
assert.equal(surfaceOne.size_count, 3, 'a surface node is sized by its documented participant count');
assert.equal(orgX.size_count, 1);
for (const node of first.nodes) {
  assert.equal('heat' in node, false, `node ${node.id} must not carry a composite heat score`);
  assert.equal('heat_color' in node, false);
}
assert.equal('hottest' in first, false, 'no heat ranking is published');
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
console.log('ecology event projection: PASS');

// The ledger index keeps every row, including rows the field cannot draw.
const ledger = buildFieldLedgerIndex(surfaceGraph, model);
assert.equal(ledger.counts.rows, 45);
assert.equal(ledger.counts.actor_rows, 44);
assert.equal(ledger.counts.organization_rows, 1);
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
assert.equal(rowInWindow(openRow, normalizeEcologyWindow(ledger.range, { fromDay: ecologyDay('2026-01-01'), toDay: null })), true, 'an open-ended row overlaps every later window');
assert.equal(rowInWindow(guardedRow, allTime), true);
const factors2024 = fieldWindowFactors(ledger, window2024);
assert.equal(factors2024.rows_total, 45);
assert.equal(factors2024.rows_in_window, 2);
assert.deepEqual([...factors2024.inWindowNodeIds].sort(), ['a', 'b', 'surface-one']);
assert.deepEqual([...factors2024.inWindowLinkKeys].sort(), ['a||surface-one', 'b||surface-one']);
assert.equal(factors2024.datedNodeIds.has('a'), true);
assert.equal(factors2024.datedNodeIds.has('org-x'), true);
assert.equal(fieldWindowFactors(ledger, null).unbounded, true);
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
assert.equal(realLedger.counts.rows, 286);
assert.equal(realLedger.counts.actor_rows, 200);
assert.equal(realLedger.counts.organization_rows, 86);
assert.equal(realLedger.counts.privacy_guard_rows, 4);
assert.equal(realLedger.counts.dense_contained_rows, 113);
assert.equal(realLedger.counts.unresolved_rows, 0);
assert.equal(realLedger.counts.open_ended_rows, 1);
assert.deepEqual(realLedger.rows.filter(row => row.off_field_reason === 'privacy_guard').map(row => row.node_id).sort(), ['ben-warner', 'dominic-cummings', 'imran-shafi', 'no-10']);
assert.equal(realLedger.range.first_date, '2016-01-01');
assert.equal(realLedger.range.last_date, '2026-08-12');
assert.equal(realEvents.counts.events, 163);
assert.equal(realField.metrics.node_count, 346);
assert.equal(realField.metrics.link_count, 392);
assert.equal(realField.links.filter(link => link.rows.length).length, 169, 'every canonical overlay arc carries its participation row');
assert.equal(realField.metrics.max_size_count, 18, 'the largest documented count is Electric Twin on 18 surfaces');
const window2025 = normalizeEcologyWindow(realLedger.range, { fromDay: ecologyDay('2025-01-01'), toDay: ecologyDay('2025-12-31') });
const realFactors = fieldWindowFactors(realLedger, window2025);
assert.equal(realFactors.rows_in_window, 63);
const benWarner = nodeLedgerSummary(realLedger, 'ben-warner', window2025);
assert.equal(benWarner.rows.length, 10);
assert.equal(benWarner.rows_in_window, 4);
assert.equal(benWarner.surface_count, 10);
assert.equal(benWarner.off_field_rows, 1);
assert.equal(dayIso(benWarner.first_day), '2018-01-24');
assert.equal(dayIso(benWarner.last_day), '2026-08-11');
assert.equal(benWarner.receipt_ids.length, 14);
assert.equal(activeEcologyEvents(realEvents, null).length, 0);
assert.equal(activeEcologyEvents(realEvents, window2025).length, 60);
console.log('field ledger real-data pins: PASS');

const rendererSource = readFileSync('src/atlas-webgl.js', 'utf8');
assert.match(rendererSource, /enableNodeDrag\?\.|enableNodeDrag/);
assert.match(rendererSource, /enableNodeDrag\(false\)/, 'individual field nodes must not advertise meaningless drag agency');
assert.doesNotMatch(rendererSource, /particleCount|updateParticles/, 'ambient particles without dated evidence must not animate links');
assert.doesNotMatch(rendererSource, /node\.heat|heat_color|reinforcement heat|strongest_repeat/, 'no composite heat score may drive a visual channel or a tooltip');
assert.match(rendererSource, /size_count/, 'node size and halo derive from the documented count');
assert.match(rendererSource, /setTimeWindow/);
assert.match(rendererSource, /eventInWindow/);
assert.doesNotMatch(rendererSource, /pulseDays|ecologyTemporalIntensity/, 'the 45-day pulse shoulder is gone');
assert.doesNotMatch(rendererSource, /new Map\(field\.nodes/, 'the nodeById map is hoisted out of the per-frame path');
assert.doesNotMatch(rendererSource, /function ecologyFrame|ecologyRaf/, 'no continuous pulse loop: pulses update on demand');
assert.equal((rendererSource.match(/material\.needsUpdate/g) ?? []).length, 1, 'material.needsUpdate is set only when the transparent flag flips');
assert.match(rendererSource, /geometry\.attributes\.position\.needsUpdate = true/, 'arc rebuilds still mark their geometry');
assert.match(rendererSource, /onLinkSelect\?\.\(link\)/, 'arc clicks hand the whole link to the runtime');
assert.match(rendererSource, /selectLink/);
assert.doesNotMatch(rendererSource, /function shellForce|function clusterForce/, 'dead layout forces are deleted');
assert.ok(eventModel.events.every(event => event.graph_effect == null), 'display events remain graph-inert objects inside a graph-inert projection');
assert.ok(eventModel.events.filter(event => event.event_kind === 'participation').every(event => event.surface_node_id.startsWith('surface-')));
console.log('ecology renderer contract: PASS');
