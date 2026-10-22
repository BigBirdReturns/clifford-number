import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import * as core from '../src/visual-aperture-core.mjs';
import * as social from '../src/social-field.js';
import {
  buildSocialFieldModel, buildEcologyEventModel, buildFieldLedgerIndex, buildResearchNetworkModel,
  activeEcologyEvents, ecologyEventsForNode, ecologyPlayheadLabel, isSurfaceNode, socialFieldNeighbors,
  normalizeEcologyWindow, rowInWindow, eventInWindow, fieldWindowFactors, nodeLedgerSummary, ecologyWindowLabel, ecologyDay, dayIso,
  nodeCountLabel, ledgerCountsForNode,
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
assert.equal(bWithLedger.size_count, 1, 'b is on one ledger surface although two arcs are drawn for it');
assert.equal(bWithLedger.arc_surface_count, 2);
assert.equal(nodeCountLabel(bWithLedger), '1 documented surface');
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
// Size, halo and tooltip count come from the ledger and agree with the inspector
// (nodeLedgerSummary) for every node on the field.
const realNode = id => realField.nodeById.get(id);
assert.equal(realNode('matt-clifford').size_count, 9, 'Matt Clifford: 9 documented surfaces (the Dialog roster row counts)');
assert.equal(realNode('ben-warner').size_count, 10, 'Ben Warner: 10 documented surfaces (the privacy-guarded row counts)');
assert.equal(realNode('electric-twin').size_count, 18);
assert.equal(realNode('surface-dialog-public-directory-exposure-2026-06-16').size_count, 113, 'the Dialog roster surface is sized by its 113 ledger rows, not by its arcs');
assert.equal(realNode('surface-dialog-public-directory-exposure-2026-06-16').arc_participant_count, 0, 'the field draws no arc into the contained roster, so an arc count would size it as empty');
assert.equal(realField.metrics.max_size_count, 113, 'the largest documented count is the Dialog roster surface with 113 participation rows');
assert.equal(nodeCountLabel(realNode('matt-clifford')), '9 documented surfaces');
assert.equal(nodeCountLabel(realNode('surface-dialog-public-directory-exposure-2026-06-16')), '113 documented participants');
assert.equal(nodeCountLabel(realNode('joe-lonsdale')), '1 documented surface', 'a Dialog roster actor has a ledger row and the tooltip says so');
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
assert.equal(nodesWithoutLedgerRows, 103, '103 of 346 field nodes carry no ledger row (research context only)');
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
// Every receipt on a row is a button: no "+N more" stub on the five rows that carry four.
const fourReceiptRows = realLedger.rows.filter(row => row.receipt_ids.length > 3);
assert.equal(fourReceiptRows.length, 5);
assert.ok(fourReceiptRows.every(row => row.receipt_ids.length === 4));
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

const rowsMarkup = context.fieldRowsMarkup('ben-warner');
assert.match(rowsMarkup, /10 rows · all time/);
assert.equal((rowsMarkup.match(/not drawn on the field \(privacy guard\)/g) ?? []).length, 2, 'the guarded row is labelled on the row and counted in the header');
assert.equal((rowsMarkup.match(/data-ap-off-field="privacy_guard"/g) ?? []).length, 1);
assert.equal((rowsMarkup.match(/data-ap-row=/g) ?? []).length, 10);
runtimeState.ecology.fromDay = ecologyDay('2025-01-01');
runtimeState.ecology.toDay = ecologyDay('2025-12-31');
const windowedMarkup = context.fieldRowsMarkup('ben-warner');
assert.match(windowedMarkup, /4 of 10 rows in window/);
assert.equal((windowedMarkup.match(/is-outside/g) ?? []).length, 6, 'out-of-window rows dim and stay listed');
assert.match(context.ecologyClockLabel(), /^2025-01-01 → 2025-12-31 · 63 of 286 rows in window$/);
runtimeState.ecology.fromDay = null;
runtimeState.ecology.toDay = null;
assert.match(context.ecologyClockLabel(), /· all time · 286 rows$/);

// A node with more than APERTURE_FIELD_ROW_LIMIT rows: every row is rendered
// (the later ones inside a details element), nothing is "not shown here", and
// the header's denominator is the ledger's whatever the window.
const electricTwinMarkup = context.fieldRowsMarkup('electric-twin');
assert.equal((electricTwinMarkup.match(/data-ap-row=/g) ?? []).length, 18, 'all 18 Electric Twin rows are rendered');
assert.match(electricTwinMarkup, /<span data-ap-window-count data-ap-node="electric-twin">18 rows · all time<\/span>/);
assert.match(electricTwinMarkup, /<details class="aperture-field-rows-more"><summary>Show the 8 later rows \(the list continues oldest first\)<\/summary>/);
assert.doesNotMatch(electricTwinMarkup, /not shown here|earlier-listed/, 'no row is cut from the list');
assert.equal((context.fieldRowsMarkup('ben-warner').match(/<details/g) ?? []).length, 0, 'ten rows or fewer need no details element');
runtimeState.ecology.fromDay = ecologyDay('2025-06-01');
runtimeState.ecology.toDay = null;
const electricTwinWindowed = context.fieldRowsMarkup('electric-twin');
assert.match(electricTwinWindowed, /17 of 18 rows in window/);
assert.equal((electricTwinWindowed.match(/is-outside/g) ?? []).length, 1, 'the one 2023 single-day row dims; the 17 later or still-open rows do not');
assert.match(context.fieldRowsMarkup('mod'), /6 of 13 rows in window/);
// syncInspectorWindowMarks recomputes the header from the ledger summary of the
// node it names, not from the rows it can see in the DOM.
const windowHeader = { dataset: { apNode: 'electric-twin' }, textContent: 'stale' };
const visibleRow = {
  dataset: { apStart: String(ecologyDay('2023-09-28')), apEnd: String(ecologyDay('2023-09-28')) },
  classList: { toggles: [], toggle(name, force) { this.toggles.push([name, force]); } },
  style: {}
};
const undatedRow = { dataset: { apStart: '', apEnd: '' }, classList: { toggles: [], toggle(name, force) { this.toggles.push([name, force]); } }, style: {} };
const previousRoot = runtimeState.root;
runtimeState.root = {
  dataset: {},
  querySelector: selector => (selector === '[data-ap-window-count]' ? windowHeader : null),
  querySelectorAll: selector => (selector === '[data-ap-row]' ? [visibleRow, undatedRow] : [])
};
context.syncInspectorWindowMarks();
assert.equal(windowHeader.textContent, '17 of 18 rows in window', 'two visible items do not become the denominator');
assert.deepEqual(visibleRow.classList.toggles, [['is-outside', true]]);
assert.equal(visibleRow.style.opacity, '.45');
runtimeState.ecology.fromDay = null;
runtimeState.ecology.toDay = null;
context.syncInspectorWindowMarks();
assert.equal(windowHeader.textContent, '18 rows · all time');
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
assert.doesNotMatch(runtimeSource, /reinforcement heat|node\.heat/, 'no heat channel survives in the runtime');
assert.match(partOneSource, /ecology: \{ fromDay: null, toDay: null, [^}]*playing: false/, 'playing defaults to false');
assert.match(partTenSource, /ap-ecology-time-to/);
assert.match(partTenSource, /ecology-all-time/);
assert.match(loaderSource, /\{ \.\.\.social, \.\.\.renderer \}/, 'the loader exposes the whole social-field API to the runtime');
console.log('field runtime contract: PASS');
