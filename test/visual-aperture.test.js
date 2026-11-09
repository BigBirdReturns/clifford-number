import assert from 'node:assert/strict';
import { readFileSync as readFileSyncRaw } from 'node:fs';
import vm from 'node:vm';
// Source-shape regexes below are written against LF. A Windows checkout with
// core.autocrlf has CRLF in the working tree; read text as LF so the contract,
// not the line ending, is what is tested.
const readFileSync = (path, encoding) => {
  const value = readFileSyncRaw(path, encoding);
  return typeof value === 'string' ? value.replace(/\r\n/g, '\n') : value;
};
import {
  computeCorridors,
  dayIndex,
  diagnosePathFilters,
  evidenceRank,
  humanLabel,
  isoFromDayIndex,
  normalizeEvidence,
  periodBounds,
  selectBudgetedParticipants,
  semanticLevelForScale,
  shortestFilteredPath,
  summarizeClusters
} from '../src/visual-aperture-core.mjs';
import {
  TIMELINE_BY,
  TIMELINE_DESKTOP_METRICS,
  TIMELINE_DOMAIN_PADDING_DAYS,
  TIMELINE_HOP_FILTERS,
  TIMELINE_MAX_LANES,
  TIMELINE_PHONE_METRICS,
  buildTimelineModel,
  layoutTimeline,
  rowInWindow
} from '../src/visual-aperture-timeline.mjs';

const actors = [
  ['actor-a', 'Actor A'], ['actor-b', 'Actor B'], ['actor-c', 'Actor C'],
  ['anchor', 'Anchor'], ...Array.from({ length: 12 }, (_, index) => [`roster-${index + 1}`, `Roster ${index + 1}`])
].map(([id, label]) => ({ id, label }));

const participation = (surfaceId, actorId, role, evidence = 'official', start = '2024-01', end = '2024-12') => ({
  surface_id: surfaceId,
  participant_type: 'actor',
  actor_id: actorId,
  role,
  participation_type: role.toLowerCase().replace(/\s+/g, '_'),
  time_start: start,
  time_end: end,
  evidence_class: evidence,
  receipt_ids: [`receipt-${surfaceId}-${actorId}`]
});

const surfaceGraph = {
  actors,
  surfaces: [
    {
      surface_id: 'policy-board-2024', surface_label: 'Policy Board, 2024', surface_type: 'government_advisory_surface',
      hop_eligible: true, time_start: '2024', time_end: '2024', receipt_ids: ['receipt-policy-board'],
      participants: [participation('policy-board-2024', 'actor-a', 'Member'), participation('policy-board-2024', 'actor-b', 'Chair')]
    },
    {
      surface_id: 'venture-round-2024', surface_label: 'Venture Round, 2024', surface_type: 'capital_surface',
      hop_eligible: true, time_start: '2024', time_end: '2024', receipt_ids: ['receipt-venture-round'],
      participants: [participation('venture-round-2024', 'actor-b', 'Investor', 'primary_public'), participation('venture-round-2024', 'anchor', 'Founder', 'primary_public')]
    },
    {
      surface_id: 'conference-roster-2024', surface_label: 'Conference Roster, 2024', surface_type: 'event_roster_surface',
      hop_eligible: false, time_start: '2024-06', time_end: '2024-06', receipt_ids: ['receipt-roster'],
      participants: Array.from({ length: 12 }, (_, index) => participation(
        'conference-roster-2024', `roster-${index + 1}`,
        index < 3 ? 'Public official' : index < 7 ? 'Company leader' : 'Listed participant',
        index === 11 ? 'reported' : 'primary_public', '2024-06', '2024-06'
      ))
    },
    {
      surface_id: 'product-council-2023', surface_label: 'Product Council, 2023', surface_type: 'company_board_surface',
      hop_eligible: true, time_start: '2023', time_end: '2023', receipt_ids: ['receipt-product'],
      participants: [participation('product-council-2023', 'actor-a', 'Adviser', 'reported', '2023', '2023'), participation('product-council-2023', 'actor-c', 'Executive', 'reported', '2023', '2023')]
    }
  ]
};

const hopGraph = {
  anchor_actor_id: 'anchor',
  edges: [
    {
      actor_a: 'actor-a', actor_b: 'actor-b', surfaces: [{
        surface_id: 'policy-board-2024', surface_label: 'Policy Board, 2024', surface_type: 'government_advisory_surface',
        actor_a_role: 'Member', actor_b_role: 'Chair', evidence_class: 'official',
        valid_from: '2024-01-01', valid_until: '2024-12-31', temporal_status: 'dated', receipt_ids: ['receipt-policy-board']
      }]
    },
    {
      actor_a: 'actor-b', actor_b: 'anchor', surfaces: [{
        surface_id: 'venture-round-2024', surface_label: 'Venture Round, 2024', surface_type: 'capital_surface',
        actor_a_role: 'Investor', actor_b_role: 'Founder', evidence_class: 'primary_public',
        valid_from: '2024-04-01', valid_until: '2024-12-31', temporal_status: 'dated', receipt_ids: ['receipt-venture-round']
      }]
    },
    {
      actor_a: 'actor-a', actor_b: 'actor-c', surfaces: [{
        surface_id: 'product-council-2023', surface_label: 'Product Council, 2023', surface_type: 'company_board_surface',
        actor_a_role: 'Adviser', actor_b_role: 'Executive', evidence_class: 'reported',
        valid_from: '2023-01-01', valid_until: '2023-12-31', temporal_status: 'dated', receipt_ids: ['receipt-product']
      }]
    },
    {
      actor_a: 'actor-c', actor_b: 'anchor', surfaces: [{
        surface_id: 'undated-surface', surface_label: 'Undated Surface', surface_type: 'forum_surface',
        actor_a_role: 'Listed', actor_b_role: 'Listed', evidence_class: 'reported',
        valid_from: null, valid_until: null, temporal_status: 'undated', receipt_ids: ['receipt-undated']
      }]
    }
  ]
};

assert.deepEqual(periodBounds('2024-02'), { start: '2024-02-01', end: '2024-02-29' });
assert.equal(periodBounds('2024-02-31'), null);
assert.equal(periodBounds('2024-13'), null);

let previous = 'corpus';
previous = semanticLevelForScale(1.46, previous);
assert.equal(previous, 'corpus', 'hysteresis should prevent a one-pixel semantic jump');
previous = semanticLevelForScale(1.7, previous);
assert.equal(previous, 'machine');
previous = semanticLevelForScale(1.43, previous);
assert.equal(previous, 'machine', 'reverse hysteresis should retain the current representation');
previous = semanticLevelForScale(1.1, previous);
assert.equal(previous, 'corpus');
assert.equal(semanticLevelForScale(4.4, 'surface'), 'evidence');

const clusters = summarizeClusters(surfaceGraph);
assert.ok(clusters.some(cluster => cluster.id === 'policy' && cluster.surfaceCount === 1));
assert.ok(clusters.some(cluster => cluster.id === 'capital' && cluster.surfaceCount === 1));
assert.ok(clusters.some(cluster => cluster.id === 'forums' && cluster.actorCount === 12));
assert.ok(computeCorridors(surfaceGraph).some(corridor => corridor.from === 'capital' && corridor.to === 'policy' && corridor.actorCount === 1));

const route = shortestFilteredPath(hopGraph, 'actor-a', 'anchor', { asOf: '2024', evidenceFloor: 'primary_public' });
assert.equal(route.number, 2);
assert.deepEqual(route.actorPath, ['actor-a', 'actor-b', 'anchor']);
assert.deepEqual(route.hops.map(hop => hop.basis.surface_id), ['policy-board-2024', 'venture-round-2024']);
assert.equal(shortestFilteredPath(hopGraph, 'actor-a', 'anchor', { asOf: '2023', evidenceFloor: 'primary_public' }), null);
assert.equal(shortestFilteredPath(hopGraph, 'actor-a', 'anchor', { asOf: '2024', evidenceFloor: 'official' }), null);

const diagnostics = diagnosePathFilters(hopGraph, { asOf: '2024', evidenceFloor: 'primary_public' });
assert.equal(diagnostics.totalEdges, 4);
assert.equal(diagnostics.traversableEdges, 2);
assert.ok(diagnostics.evidenceBlockedBases >= 2);
assert.ok(diagnostics.undatedBlockedBases >= 0);

const dense = surfaceGraph.surfaces.find(surface => surface.surface_id === 'conference-roster-2024');
const labels = new Map(actors.map(actor => [actor.id, actor.label]));
const pinned = selectBudgetedParticipants(dense, { budget: 4, pinnedIds: new Set(['roster-12']), labels });
assert.equal(pinned.visible.length, 4);
assert.equal(pinned.visible[0].actor_id, 'roster-12');
assert.equal(pinned.totalActors, 12);
assert.equal(pinned.hiddenByBudget, 8);

const searched = selectBudgetedParticipants(dense, { query: 'Public official', budget: 12, labels });
assert.equal(searched.visible.length, 3);
assert.ok(searched.visible.every(item => item.role === 'Public official'));
assert.equal(searched.filteredOut, 9);

const uiEntry = readFileSync('src/visual-aperture.js', 'utf8');
const timelineRuntime = readFileSync('src/visual-aperture-timeline-runtime.js', 'utf8');
const ui = [...Array.from({ length: 11 }, (_, index) => index + 1).map(index => readFileSync(`src/visual-aperture-part-${index}.js`, 'utf8')), timelineRuntime].join('\n');
const css = ['layout', 'svg', 'responsive', 'timeline'].map(part => readFileSync(`src/visual-aperture-${part}.css`, 'utf8')).join('\n');
const core = readFileSync('src/visual-aperture-core.mjs', 'utf8');

assert.match(uiEntry, /visual-aperture-part-\$\{index \+ 1\}\.js/);
// Timeline mode: first tab, runtime between part-10 and the social-field runtime, no pair line anywhere.
assert.match(ui, /data-ap-mode="timeline"[^>]*>Timeline/);
assert.match(ui, /data-ap-mode="map"[^>]*>Network/);
assert.match(ui, /id="aperture-timeline"/);
assert.match(uiEntry, /from '\.\/visual-aperture-timeline\.mjs'/);
const loaderIndex = name => uiEntry.indexOf(`./visual-aperture-${name}.js`);
const partsTemplateIndex = uiEntry.indexOf('visual-aperture-part-${index + 1}.js');
assert.ok(partsTemplateIndex >= 0 && loaderIndex('timeline-runtime') > partsTemplateIndex, 'the timeline runtime loads after the shared handlers');
assert.ok(loaderIndex('timeline-runtime') < loaderIndex('social-field-runtime') && loaderIndex('timeline-runtime') < loaderIndex('part-11'), 'and before the social field and the mount');
assert.match(timelineRuntime, /data-ap-time-mark/);
assert.match(timelineRuntime, /data-ap-time-column/);
assert.match(timelineRuntime, /data-ap-time-block/);
assert.doesNotMatch(timelineRuntime, /data-ap-time-pair/, 'the reserved pair selector is never written by the runtime');
assert.doesNotMatch(timelineRuntime, /<line[^>]*(?:data-ap-time|data-lane|actor)/, 'no line element carries a row, lane or actor identity');
assert.doesNotMatch(timelineRuntime, /machine_score|factory_score|deniability|laundry_score|recurrence_score|Structural context index|Factory Score/, 'no composite score drives a visual channel');
assert.match(readFileSync('src/visual-aperture-part-9.js', 'utf8'), /if \(state\.mode !== 'map'\) deactivateApertureSocialField\(\);[\s\S]*if \(state\.mode === 'timeline'\) renderTimelineMode\(\);/, 'the GPU field is deactivated in timeline mode');
assert.match(readFileSync('src/visual-aperture-part-10.js', 'utf8'), /function handleAction\(button\) \{\r?\n  if \(handleTimelineAction\(button\)\) return;/);
// Heat is allowed only as the printed, ledger-derived accumulation: the field
// runtime prints its formula, and the field module computes exactly that sum.
const fieldRuntimeSource = readFileSync('src/visual-aperture-social-field-runtime.js', 'utf8');
const fieldModuleSource = readFileSync('src/social-field.js', 'utf8');
const printedHeatFormula = 'heat = Σ touches weight(class) × 0.8^years; policy 1 · appointment 1 · procurement 2 · capital 2';
assert.ok(fieldRuntimeSource.includes(printedHeatFormula), 'the field runtime prints the heat formula beside the field');
assert.ok(fieldModuleSource.includes(`HEAT_FORMULA = '${printedHeatFormula}'`), 'the field module carries the same formula it computes');
for (const source of [fieldRuntimeSource, fieldModuleSource]) {
  assert.doesNotMatch(source, /machine_score|factory_score|deniability|laundry_score|recurrence_score|Structural context index|Factory Score|reinforcement heat/, 'no hidden composite drives a field channel');
}
assert.match(readFileSync('src/visual-aperture-part-3.js', 'utf8'), /publishApertureOrigin\(label\)/, 'the origin hook publishes on every selection change');
// The Field tab (arrival, docs/explorer.md "Field"): first tab, its runtime loads
// after the social field and before the bounded runtime and the mount, it prints
// the same heat formula, and no hidden composite reaches it.
const fieldTabRuntime = readFileSync('src/visual-aperture-field-runtime.js', 'utf8');
assert.match(ui, /data-ap-mode="field"[^>]*>Field<\/button>\s*<button[^>]*data-ap-mode="map"/, 'Field is the first tab');
assert.ok(loaderIndex('field-runtime') > loaderIndex('social-field-runtime') && loaderIndex('field-runtime') < loaderIndex('bounded-runtime') && loaderIndex('field-runtime') < loaderIndex('part-11'), 'the field runtime loads after the social field and before the bounded runtime and the mount');
assert.match(uiEntry, /globalThis\.cliffordSocialField = social/, 'the pure field module is exposed under one name');
assert.ok(fieldTabRuntime.includes(printedHeatFormula), 'the field runtime prints the heat formula');
assert.doesNotMatch(fieldTabRuntime, /machine_score|factory_score|deniability|laundry_score|recurrence_score|Structural context index|Factory Score|reinforcement heat|documented_degree/, 'no hidden composite drives a field channel');
assert.match(readFileSync('src/visual-aperture-part-9.js', 'utf8'), /if \(state\.mode !== 'field'\) deactivateFieldStage\(\);[\s\S]*else if \(state\.mode === 'field'\) renderFieldMode\(\);/, 'the field stage is deactivated outside its mode');
assert.match(readFileSync('src/visual-aperture-part-1.js', 'utf8'), /globalThis\.__cliffordPublicData/, 'readData uses the app.js handoff before fetching');

// vm render of the runtime against the real artifacts: the SVG the page draws on
// arrival, counted. Lines exist only as axis, grid, lane rules and overview ticks.
const realSurfaceGraph = JSON.parse(readFileSync('build/surface-graph.json', 'utf8'));
const realHopGraph = JSON.parse(readFileSync('build/hop-graph.json', 'utf8'));
const realModel = buildTimelineModel(realSurfaceGraph, realHopGraph);
function renderTimelineStage(layout, phone) {
  layout.phone = phone;
  layout.containerWidth = layout.width;
  const context = vm.createContext({
    state: { mode: 'timeline', root: null, timeline: { selectedKey: null, windowFrom: '', windowTo: '', lanes: [], by: layout.by, model: realModel, rowIndex: new Map(), search: [], suggestion: null }, actors: new Map(), surfaces: new Map() },
    esc: value => String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]),
    shortLabel: (value, max = 32) => { const text = String(value ?? ''); return text.length > max ? `${text.slice(0, max - 1)}…` : text; },
    humanLabel, normalizeEvidence, evidenceRank, isoFromDayIndex, dayIndex,
    evidenceLabel: value => humanLabel(normalizeEvidence(value)),
    TIMELINE_DESKTOP_METRICS, TIMELINE_PHONE_METRICS, TIMELINE_BY, TIMELINE_HOP_FILTERS, TIMELINE_MAX_LANES, TIMELINE_DOMAIN_PADDING_DAYS, layoutTimeline, rowInWindow,
    LAYOUT: layout
  });
  vm.runInContext(`${timelineRuntime}\nglobalThis.__svg = buildTimelineStage(LAYOUT);`, context);
  const svg = context.__svg;
  const count = needle => (svg.match(new RegExp(needle, 'g')) ?? []).length;
  const lineClasses = count('<line class="aperture-time-(?:axis-year|axis-month|axis-base|lane-rule|grid|ov-row|ov-hop|ov-dense)"') + count('<line x1="0" y1="0" x2="0" y2="4"');
  return { marks: count('data-ap-time-mark="'), columns: count('data-ap-time-column="'), segments: count('aperture-time-column-segment'), blocks: count('data-ap-time-block="'), aggregates: count('data-ap-time-aggregate="'), lanes: count('data-ap-time-lane="'), lines: count('<line[\\s>]'), lineClasses, pair: count('data-ap-time-pair'), tabStops: count('tabindex="0"'), noStops: count('tabindex="-1"'), svg };
}
const desktopRender = renderTimelineStage(layoutTimeline(realModel, { plotWidth: 690 }), false);
assert.equal(desktopRender.marks, 112, 'desktop default: 112 marks'); // 2026-10-23 final re-pin: 134 -> 112. 2026-10-23 five-lane merge: 44 -> 134 (the hop-first default now ranks the Capital Factory Form D people, Sean O'Brien and Stephen Brotman into the 18 lanes) // 2026-10-23: hop-bearing lanes rank first (was 147 with row-count ranking) // 2026-10-23 owner decision: the 18-lane default People view (2.1.0: 79 on 15 lanes)
assert.equal(desktopRender.blocks, 2, 'plus two roster blocks'); // 2026-10-23 five-lane merge: 1 -> 2 (the Reagan National Defense Forum 2023 programme roster is dense, beside Dialog)
assert.equal(desktopRender.columns, 28, 'the default people share 28 drawn hop bases'); // 2026-10-23 final re-pin: 35 -> 28. 2026-10-23 five-lane merge: 15 -> 35 // 2026-10-23 hop-first ranking; 2.1.0: 16
assert.ok(desktopRender.segments > 0, 'hop columns draw segments'); // 2026-10-23 hop-first ranking; 2.1.0: 35
assert.equal(desktopRender.aggregates, 9, 'the default view folds clusters past two marks into +N'); // 2026-10-23 final re-pin: 13 -> 9. 2026-10-23 five-lane merge: 2 -> 13 // 2.1.0: 0 // 2026-10-23 hop-first default lanes: 12 -> 2
assert.equal(desktopRender.lanes, 21, '18 named + strip + two blocks'); // 2026-10-23 five-lane merge: 20 -> 21 (second roster block) // 2.1.0: 17
assert.equal(desktopRender.pair, 0);
// Roving focus: one Tab stop for the plot (the first mark), one for the lane
// labels, two overview handles; every other mark, column, block and label is
// reached with the arrow keys, not with Tab.
assert.equal(desktopRender.tabStops, 4, 'first mark + first lane label + two overview handles');
assert.equal(desktopRender.noStops, desktopRender.marks + desktopRender.columns + desktopRender.blocks + desktopRender.aggregates + desktopRender.lanes - 2);
assert.match(timelineRuntime, /function handleTimelineWheel\(event\) \{\n  if \(state\.mode !== 'timeline'\) return;\n(?:\s*\/\/.*\n)*\s*if \(!event\.ctrlKey && !event\.metaKey\) return;/, 'a plain wheel scrolls the page; only Ctrl/Cmd + wheel zooms the axis');
assert.equal(desktopRender.lines, desktopRender.lineClasses, 'every line is an axis, grid, lane rule, overview tick or hatch stroke');
assert.match(desktopRender.svg, /names listed/);
assert.match(desktopRender.svg, /Other people \(267\)/); // 2026-10-23 five-lane merge: 153 -> 267 // 2026-10-23 owner decision: was "People documented on one surface"
const phoneRender = renderTimelineStage(layoutTimeline(realModel, { plotWidth: 216, ...TIMELINE_PHONE_METRICS }), true);
assert.equal(phoneRender.marks, 75, 'phone default: 75 marks'); // 2026-10-23 final re-pin: 92 -> 75. 2026-10-23 five-lane merge: 39 -> 92 // 2026-10-23 owner decision: 18-lane default (2.1.0: 48) // 2026-10-23 hop-first default lanes: 85 -> 39
assert.equal(phoneRender.blocks, 2); // 2026-10-23 five-lane merge: 1 -> 2
assert.equal(phoneRender.columns, 23); // 2026-10-23 final re-pin: 29 -> 23. 2026-10-23 five-lane merge: 13 -> 29 // 2.1.0: 10 // 2026-10-23 hop-first default lanes: 0 -> 13
assert.equal(phoneRender.segments, 30); // 2026-10-23 final re-pin: 40 -> 30. 2026-10-23 five-lane merge: 28 -> 40 // 2.1.0: 20 // 2026-10-23 hop-first default lanes: 0 -> 28
assert.equal(phoneRender.pair, 0);
assert.equal(phoneRender.lines, phoneRender.lineClasses);
console.log(`visual-aperture.test.js: timeline render desktop ${desktopRender.marks} marks + ${desktopRender.blocks} block, ${desktopRender.columns} columns (${desktopRender.segments} segments); phone ${phoneRender.marks} + ${phoneRender.blocks}, ${phoneRender.columns} columns (${phoneRender.segments} segments)`);
assert.match(ui, /readData\('build\/surface-graph\.json'\)/);
assert.match(ui, /readData\('build\/hop-graph\.json'\)/);
assert.match(ui, /readData\('build\/receipt-graph\.json'\)/);
assert.doesNotMatch(ui, /sampleData|fixture/i, 'the public aperture must not have an authored fallback fixture');
assert.match(ui, /actor → bounded surface → actor/);
assert.match(ui, /no pairwise lines|manufacturing pairwise adjacency/i);
assert.match(ui, /data-open-receipt/);
assert.match(ui, /diagnosePathFilters/);
assert.match(ui, /selectBudgetedParticipants/);
assert.match(core, /semanticLevelForScale/);
assert.match(css, /@media \(max-width: 760px\)/);
assert.match(css, /\.aperture-inspector\.is-open/);
assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
assert.match(css, /\.aperture-overview table/);
const timelineCss = readFileSync('src/visual-aperture-timeline.css', 'utf8');
for (const breakpoint of ['860px', '760px', '430px', '340px']) assert.match(timelineCss, new RegExp(`@media \\(max-width: ${breakpoint}\\)`), `timeline css has the ${breakpoint} breakpoint`);
assert.match(timelineCss, /@media print/);
assert.match(timelineCss, /\.aperture-time-mark--hop \{ stroke: var\(--ap-amber\)/);
assert.match(timelineCss, /\.aperture-time-column-segment/);
assert.match(timelineCss, /repeat\(5, minmax\(0, 1fr\)\)/, 'five mode tabs fit a phone');
assert.match(readFileSync('src/visual-aperture.css', 'utf8'), /visual-aperture-timeline\.css/);

console.log('visual-aperture.test.js: OK');
