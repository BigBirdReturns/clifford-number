import assert from 'node:assert/strict';
import { readFileSync as readFileSyncRaw } from 'node:fs';
import vm from 'node:vm';
import * as socialField from '../src/social-field.js';
import {
  LEDGER_FIELD_SCHEMA,
  buildFieldLedgerIndex,
  buildLedgerFieldModel,
  buildSocialFieldModel,
  heat,
  heatBreakdownText,
  heatClassForSurfaceType,
  HEAT_FORMULA
} from '../src/social-field.js';
import { evidenceRank, humanLabel, normalizeEvidence } from '../src/visual-aperture-core.mjs';
import { buildApertureExportPacket } from '../src/visual-aperture-export.mjs';
import { APERTURE_QUERY_KEYS, readApertureState, writeApertureState } from '../src/visual-aperture-state.mjs';

// Source-shape regexes are written against LF; a Windows checkout with
// core.autocrlf would otherwise test the line ending, not the contract.
const readFileSync = (path, encoding) => {
  const value = readFileSyncRaw(path, encoding);
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n') : value;
};

const surfaceGraph = JSON.parse(readFileSync('build/surface-graph.json', 'utf8'));
const hopGraph = JSON.parse(readFileSync('build/hop-graph.json', 'utf8'));
const receiptGraph = JSON.parse(readFileSync('build/receipt-graph.json', 'utf8'));
const totalRows = surfaceGraph.surfaces.reduce((sum, surface) => sum + (surface.participants ?? []).length, 0);

// --- the ledger field model: one node per record, one edge per participation row -------------------------
const model = buildLedgerFieldModel(surfaceGraph);
assert.equal(model.schema_version, LEDGER_FIELD_SCHEMA);
assert.equal(model.graph_effect, 'none');
assert.equal(model.nodes.length, surfaceGraph.actors.length + surfaceGraph.organizations.length + surfaceGraph.surfaces.length + model.counts.unlisted_participants, 'every actor, organization and surface is a node');
assert.equal(model.counts.rows, totalRows, 'the model counts every participation row');
assert.equal(model.edges.length, totalRows - model.counts.rows_without_participant, 'one edge per row with a participant');
assert.equal(model.counts.actor_rows + model.counts.organization_rows, model.edges.length);
assert.equal(new Set(model.edges.map(edge => edge.id)).size, model.edges.length, 'edge ids are unique');
for (const edge of model.edges) {
  assert.ok(edge.to.startsWith('surface-'), 'every edge ends on a surface node');
  assert.ok(!edge.from.startsWith('surface-'), 'no edge starts on a surface node');
  assert.equal(edge.topology, true);
}
const participantIds = new Set(model.edges.map(edge => edge.from));
for (const node of model.nodes) {
  if (node.type === 'surface') assert.ok(!participantIds.has(node.id), 'a surface is never a participant: no surface-to-surface line');
}
assert.ok(!model.nodes.some(node => 'degree' in node || 'score' in node), 'the model carries no degree or score');

// --- the ledger index keys every row to the field --------------------------------------------------------------
const ledger = buildFieldLedgerIndex(surfaceGraph, model);
assert.equal(ledger.counts.rows, totalRows);
assert.equal(ledger.counts.off_field_rows, model.counts.rows_without_participant, 'every row with a participant is drawn');
const rowsByOrdinal = new Map(ledger.rows.map(row => [Number(row.row_id.split('::').at(-1)), row]));
for (const edge of model.edges) {
  const row = rowsByOrdinal.get(edge.row_ordinal);
  assert.ok(row, `edge ${edge.id} names ledger row ${edge.row_ordinal}`);
  assert.equal(row.surface_id, edge.surface_id);
  assert.equal(row.node_id, edge.from);
}

// --- the field: channels come from the printed heat and nothing else -----------------------------------------
const field = buildSocialFieldModel(model, { ledger, atDay: ledger.range.last_day, reinforcement: false });
assert.equal(field.nodes.length, model.nodes.length);
assert.equal(field.links.length, model.edges.length);
assert.equal(field.metrics.pair_reinforcement_count, 0, 'the ledger field computes no pair counts');
assert.equal(field.heat_formula, HEAT_FORMULA);
const anchor = field.nodeById.get(hopGraph.anchor_actor_id);
assert.ok(anchor, 'the hop anchor is on the field');
assert.equal(anchor.heat_kind, 'residue');
const anchorHeat = heat(ledger.rowsByNode.get(anchor.id), ledger.range.last_day);
assert.equal(anchor.heat_value, anchorHeat.total, 'the node carries exactly the printed sum');
const fullText = heatBreakdownText(anchorHeat, { noun: 'residue', limit: Number.MAX_SAFE_INTEGER });
assert.equal((fullText.match(/ × 0\.8\^/g) ?? []).length, anchorHeat.touches.length, 'with the limit lifted every term prints');
for (const node of field.nodes) {
  if (!node.heat) { assert.equal(node.heat_value, 0); continue; }
  assert.equal(node.heat_value, node.heat.total);
  if (node.ontology === 'surface') assert.equal(node.heat_class, heatClassForSurfaceType(ledger.rowsBySurfaceNode.get(node.id)[0].surface_type));
}

// --- the runtime's facts and markup, run against the real artifacts ----------------------------------------------
const runtime = readFileSync('src/visual-aperture-field-runtime.js', 'utf8');
const esc = value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
const state = {
  mode: 'field',
  root: null,
  data: { surfaceGraph, hopGraph, receiptGraph },
  actors: new Map(surfaceGraph.actors.map(actor => [actor.id, actor])),
  surfaces: new Map(surfaceGraph.surfaces.map(surface => [surface.surface_id, surface])),
  receipts: new Map(receiptGraph.receipts.map(receipt => [receipt.receipt_id, receipt])),
  route: { fromId: null, toId: null },
  overview: { page: 1 },
  field: { selectedId: null, query: '' },
  galaxy: null
};
const hopActorIds = [...new Set(hopGraph.edges.flatMap(edge => [edge.actor_a, edge.actor_b]))];
const context = vm.createContext({
  state,
  cliffordSocialField: socialField,
  document: undefined,
  esc,
  shortLabel: (value, max = 32) => { const text = String(value ?? ''); return text.length > max ? `${text.slice(0, max - 1)}…` : text; },
  humanLabel, normalizeEvidence, evidenceRank,
  evidenceLabel: value => humanLabel(normalizeEvidence(value)),
  evidenceBadge: value => `<span class="aperture-badge">${esc(value)}</span>`,
  unique: values => [...new Set((values ?? []).filter(Boolean))],
  receiptTitle: id => id,
  routeActorIds: () => hopActorIds,
  addressActionMarkup: () => '',
  Number, Math, Map, Set, String, Array, Object, JSON
});
vm.runInContext(`${runtime}\nglobalThis.__field = { initializeFieldDefaults, fieldFacts, fieldCountersMarkup, fieldLegendMarkup, fieldTilesMarkup, fieldInspectorMarkup, fieldWelcomeMarkup, fieldSnapshot, applyFieldSnapshot, currentFieldExportView, fieldCount, fieldArrivalAvailable };`, context);
const api = context.__field;
api.initializeFieldDefaults();
assert.equal(state.mode, 'field', 'without a WebGL loader the arrival mode is left alone');
assert.equal(state.field.selectedId, hopGraph.anchor_actor_id, 'the anchor actor is selected on arrival');
assert.equal(api.fieldArrivalAvailable(), false, 'no loader and no canvas here');

const facts = api.fieldFacts();
assert.equal(facts.rows, totalRows);
assert.equal(facts.links, model.edges.length);
assert.equal(facts.nodes, model.nodes.length);
assert.equal(facts.actors, surfaceGraph.actors.length);
assert.equal(facts.organizations, surfaceGraph.organizations.length);
assert.equal(facts.surfaces, surfaceGraph.surfaces.length);
assert.equal(facts.receipts, receiptGraph.receipts.length);
assert.equal(facts.hops, hopGraph.edges.length);
assert.equal(facts.rows_by_evidence.reduce((sum, item) => sum + item.count, 0), totalRows, 'evidence classes partition the rows');
assert.equal(facts.surfaces_by_class.reduce((sum, item) => sum + item.count, 0), surfaceGraph.surfaces.length, 'heat classes partition the surfaces');
assert.equal(facts.receipts_by_archive.reduce((sum, item) => sum + item.count, 0), receiptGraph.receipts.length, 'archive kinds partition the receipts');
const years = facts.rows_by_year;
assert.equal(years.in_range + years.before + years.after + years.undated, totalRows, 'the year bars, the before/after counts and the undated count partition the rows');
assert.equal(years.years.length, 11, '2016 to 2026');
assert.equal(facts.dated_rows + facts.undated_rows, totalRows);
assert.equal(facts.last_date, ledger.range.last_date);

const counters = api.fieldCountersMarkup(facts, state.field.selectedId);
for (const needle of [api.fieldCount(facts.nodes), api.fieldCount(facts.links), api.fieldCount(facts.receipts), api.fieldCount(facts.hops), facts.first_date, facts.last_date]) {
  assert.ok(counters.includes(esc(needle)), `the header strip prints ${needle}`);
}
assert.ok(api.fieldLegendMarkup().includes(HEAT_FORMULA), 'the legend prints the formula');
const tiles = api.fieldTilesMarkup(facts, state.field.selectedId);
assert.equal((tiles.match(/class="aperture-field-tile"/g) ?? []).length, 8, 'eight instrument tiles (six ledger facts, the heat source and the lens tile)');
assert.ok((tiles.match(/aperture-field-denominator/g) ?? []).length >= 8, 'every tile names a denominator');
assert.ok(tiles.includes('Where the heat comes from'), 'the heat-source split is a tile');
assert.ok(facts.heat_by_status && Math.abs(facts.heat_by_status.families.reduce((sum, family) => sum + family.heat, 0) - facts.heat_by_status.total) < 1e-6, 'the status split sums to the total heat');
assert.ok(tiles.includes('data-ap-field-tile="lens"'), 'the lens tile is present');
assert.ok(tiles.includes(`of ${api.fieldCount(totalRows)} participation rows`));
assert.ok(tiles.includes(`of ${api.fieldCount(surfaceGraph.surfaces.length)} bounded surfaces`));
assert.ok(tiles.includes(`of ${api.fieldCount(receiptGraph.receipts.length)} receipts`));
assert.ok(tiles.includes('undated, not placed'), 'undated rows are counted, never placed on the year axis');
assert.doesNotMatch(tiles, /coverage|%\s*</, 'no percentage without a denominator');
assert.equal((tiles.match(/aperture-field-years/g) ?? []).length, 1);

const callout = api.fieldInspectorMarkup(state.field.selectedId);
assert.ok(callout.includes(esc(anchor.label)));
assert.ok(callout.includes(esc(fullText)), 'the callout prints the heat line with every term');
assert.ok(callout.includes(HEAT_FORMULA));
for (const touch of anchorHeat.touches) assert.ok(callout.includes(touch.date), `term ${touch.date} is on the callout`);
const anchorSummary = socialField.nodeLedgerSummary(ledger, anchor.id);
for (const id of anchorSummary.receipt_ids) assert.ok(callout.includes(`data-open-receipt="${esc(id)}"`), `receipt ${id} is a link`);
assert.ok(callout.includes('data-ap-action="field-open-record"'));
assert.doesNotMatch(callout, /degree|machine_score|factory_score|Structural context index|Factory Score/);
assert.ok(api.fieldWelcomeMarkup(facts).includes(HEAT_FORMULA));

api.applyFieldSnapshot({ selectedId: 'no-such-node' });
assert.equal(state.field.selectedId, null, 'an unknown selection clears');
api.applyFieldSnapshot({ selectedId: `surface-${surfaceGraph.surfaces[0].surface_id}` });
assert.equal(state.field.selectedId, `surface-${surfaceGraph.surfaces[0].surface_id}`);
assert.equal(api.fieldSnapshot().selectedId, `surface-${surfaceGraph.surfaces[0].surface_id}`);
api.applyFieldSnapshot({ selectedId: anchor.id });

// --- the field packet -----------------------------------------------------------------------------------------------
const view = api.currentFieldExportView();
assert.equal(view.rows.length, anchorSummary.rows_total, 'the packet carries every row of the selected node');
const packet = buildApertureExportPacket({ mode: 'field', generatedAt: '2026-11-08T12:00:00Z', exactViewUrl: 'https://example.test/explorer.html?ap_v=1&ap_mode=field', view });
assert.equal(packet.mode, 'field');
assert.equal(packet.view.selected.node_id, anchor.id);
assert.equal(packet.view.selected.heat.touches.length, anchorHeat.touches.length, 'every heat term travels in the packet');
assert.equal(packet.view.counts.rows, totalRows);
assert.ok(packet.caption.includes('one link per row'));
assert.ok(packet.caption.includes(HEAT_FORMULA));
assert.ok(packet.receipt_ids.length > 0);
assert.equal(packet.interpretation_contract.graph_effect, 'none');
assert.equal(packet.view.table.rows.length, view.rows.length);

// --- URL state ---------------------------------------------------------------------------------------------------------
assert.ok(APERTURE_QUERY_KEYS.includes('ap_field_sel'));
assert.equal(readApertureState('?ap_v=1&ap_mode=field&ap_field_sel=matt-clifford').field.selectedId, 'matt-clifford');
assert.equal(readApertureState(writeApertureState({ mode: 'field', field: { selectedId: 'surface-x' } })).field.selectedId, 'surface-x');
assert.ok(APERTURE_QUERY_KEYS.includes('ap_field_lens'));
assert.equal(readApertureState('?ap_v=1&ap_mode=field&ap_field_lens=hunt').field.lens, 'hunt', 'the lens travels in the URL');
assert.equal(readApertureState('?ap_v=1&ap_mode=field&ap_field_lens=queue').field.lens, 'queue', 'the queue lens travels in the URL');
assert.equal(readApertureState('?ap_v=1&ap_mode=field').field.lens, 'all', 'no lens reads as all');
assert.equal(readApertureState('?ap_v=1&ap_mode=field&ap_field_lens=bogus').field.lens, 'all', 'an unknown lens reads as all');
assert.equal(writeApertureState({ mode: 'field', field: { selectedId: null, lens: 'all' } }).get('ap_field_lens'), 'all', 'the lens key is always written, all at the default');
assert.equal(writeApertureState({ mode: 'field', field: { selectedId: null, lens: 'inforce' } }).get('ap_field_lens'), 'inforce');
assert.match(runtime, /function computeDecisionsLens[\s\S]*\/\^official_\/[\s\S]*function computeHuntLens[\s\S]*hop_eligible === true[\s\S]*hop_refusal_reason[\s\S]*function computeInForceLens[\s\S]*end_day/, 'each lens reads one recorded field');
assert.match(runtime, /function fieldLensLegendMarkup[\s\S]*everything else dimmed, nothing removed/, 'the legend prints the lens definition');
assert.match(runtime, /aperture-field-crumbs[\s\S]*data-ap-action="field-clear">Field<\/button>/, 'the callout opens with a breadcrumb back to the field');
assert.match(readFileSync('src/atlas-webgl.js', 'utf8'), /controls\.zoomToCursor = true/, 'wheel zoom is cursor-anchored');
assert.match(readFileSync('src/atlas-webgl.js', 'utf8'), /function applyLocality[\s\S]*rows lead off-screen at both ends/, 'edge locality fades through-traffic and names the count');
assert.match(readFileSync('src/atlas-webgl.js', 'utf8'), /zoomScale/, 'ink never magnifies: the sprite size cancels the camera distance');

// --- source shape ------------------------------------------------------------------------------------------------------
const part2 = readFileSync('src/visual-aperture-part-2.js', 'utf8');
const entry = readFileSync('src/visual-aperture.js', 'utf8');
const css = readFileSync('src/visual-aperture-field.css', 'utf8');
const renderer = readFileSync('src/atlas-webgl.js', 'utf8');
assert.match(part2, /data-ap-mode="field"[^>]*>Field<\/button>\s*<button[^>]*data-ap-mode="map"/, 'Field is the first tab');
assert.match(part2, /id="aperture-field-stage"/);
assert.match(part2, /id="aperture-field-tiles"/);
assert.match(entry, /globalThis\.cliffordSocialField = social/);
assert.ok(entry.indexOf('visual-aperture-field-runtime.js') > entry.indexOf('visual-aperture-social-field-runtime.js'), 'the field runtime loads after the social field runtime');
assert.ok(entry.indexOf('visual-aperture-field-runtime.js') < entry.indexOf('visual-aperture-bounded-runtime.js'), 'and before the bounded runtime');
assert.ok(runtime.includes(HEAT_FORMULA));
assert.doesNotMatch(runtime, /machine_score|factory_score|deniability|laundry_score|recurrence_score|Structural context index|Factory Score|documented_degree/, 'no hidden composite drives a field channel');
assert.match(runtime, /function galaxyAnimationAllowed[\s\S]*intersecting === false[\s\S]*visibilityState === 'hidden'/, 'the field pauses off-screen and when the tab is hidden');
assert.match(renderer, /export async function createGalaxyFieldRenderer/);
assert.match(renderer, /nodeSizeForHeat\(node\.heat_value\)[\s\S]*haloSizeForHeat\(node\.heat_value\)/, 'the renderer sizes and haloes by the printed heat');
assert.doesNotMatch(renderer.slice(renderer.indexOf('createGalaxyFieldRenderer')), /documented_degree|strongest_repeat|size_count \*|degree \*/, 'the galaxy renderer reads no degree');
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /@media \(max-width: 430px\)/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(readFileSync('src/visual-aperture-timeline.css', 'utf8'), /repeat\(5, minmax\(0, 1fr\)\)/, 'five mode tabs fit a phone');
assert.match(readFileSync('src/visual-aperture.css', 'utf8'), /visual-aperture-field\.css/);
const standaloneBuilder = readFileSync('tools/build-standalone.mjs', 'utf8');
for (const needle of ["read('src/visual-aperture-field-runtime.js')", "read('src/visual-aperture-field.css')", "globalThis.cliffordSocialField = ${isolateModule(read('src/social-field.js'))}"]) {
  assert.ok(standaloneBuilder.includes(needle), `the standalone builder inlines ${needle}`);
}
console.log(`visual-aperture-field.test.js: OK (${model.nodes.length} nodes, ${model.edges.length} row links, anchor ${anchor.label} residue ${anchorHeat.total.toFixed(2)} over ${anchorHeat.touches.length} terms)`);
