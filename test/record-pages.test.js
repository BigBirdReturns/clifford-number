import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

import * as timeline from '../src/visual-aperture-timeline.mjs';
import { EVIDENCE_RANK } from '../src/evidence-rank.js';
import {
  shortestRoute, strongestEvidenceRoute, bestDatedRoute, officialOnlyRoute, asOfRoute, blockedSegments, routeProjections
} from '../src/route-projections.js';
import { releaseDelta, summarizeDelta } from '../src/release-delta.js';

/* The record-page model behind app.js's actor, organization, surface, type and
   year pages, exercised over the real build artifacts. app.js is loaded the way
   test/route-modes.test.js loads it: ES imports stripped, the trailing init()
   cut, the rest run as a classic script so every top-level function is a
   callable global. The timeline module's exports are injected into the vm
   context exactly as the standalone flattener supplies them on globalThis. */

const raw = fs.readFileSync('app.js', 'utf8');
const importLines = raw.match(/^import[^\n]*\n/gm) ?? [];
assert.ok(importLines.some(line => line.includes("from './src/visual-aperture-timeline.mjs'")), 'app.js imports the ledger timeline model');
assert.ok(importLines.every(line => line.trim().endsWith(';')), 'every app.js import stays on one line so tools/build-standalone.mjs can strip it');
const withoutImports = raw.replace(/^import[^\n]*\n/gm, '');
const cutIndex = withoutImports.indexOf('\ninit().catch(');
assert.notEqual(cutIndex, -1);
const source = withoutImports.slice(0, cutIndex);

const context = {
  console, window: {}, structuredClone, URL, EVIDENCE_RANK,
  shortestRoute, strongestEvidenceRoute, bestDatedRoute, officialOnlyRoute, asOfRoute, blockedSegments, routeProjections,
  releaseDelta, summarizeDelta,
  ...timeline
};
vm.createContext(context);
vm.runInContext(source, context);
// vm-realm arrays carry the vm's Array.prototype, so compare realm-neutral copies.
const same = (actual, expected, message) => assert.deepEqual(JSON.parse(JSON.stringify(actual)), expected, message);

for (const name of ['actorRecordModel', 'organizationRecordModel', 'surfaceRecordModel', 'typeRecordModel', 'yearRecordModel', 'recordFloorPartition', 'recordStatusText', 'ledgerText', 'atlasInspectorOrigin', 'inspectorBreadcrumbModel', 'renderActor', 'renderOrg', 'renderSurface', 'renderType', 'renderYear']) {
  assert.equal(typeof context[name], 'function', `app.js exposes ${name} as a top-level function`);
}

// --- no composite score drives a record page
assert.doesNotMatch(source, /Structural context index|Factory Score|machine_score|factory_score|surface_type_recurrence|deniability|laundry_score|surface_density|metricPanelRatio/, 'no score bar or score field survives on the record pages');
assert.match(source, /data-ap-open-timeline="\$\{esc\(timelineToken\)\}"/, 'record pages hand the aperture an Open-in-the-timeline token');
assert.match(source, /Patterns in the rows/);
assert.match(source, /Copy ledger as text/);
assert.match(source, /machine-derived from ledger; no editorial profile yet/);
assert.doesNotMatch(source, /data-ap-time-pair|<line[^>]*data-record/, 'no person-to-person line is drawn on a record page');

const surfaceGraph = JSON.parse(fs.readFileSync('build/surface-graph.json', 'utf8'));
const hopGraph = JSON.parse(fs.readFileSync('build/hop-graph.json', 'utf8'));
const receiptGraph = JSON.parse(fs.readFileSync('build/receipt-graph.json', 'utf8'));
const scores = JSON.parse(fs.readFileSync('build/scores.json', 'utf8'));
const model = timeline.buildTimelineModel(surfaceGraph, hopGraph);

// --- Ben Warner: 10 rows, 6 types, 8 organizations, 12 hop partners, Clifford Number 2
const warner = context.actorRecordModel(model, hopGraph, scores.actors.find(item => item.actor_id === 'ben-warner'), 'ben-warner');
assert.equal(warner.row_count, 10);
assert.equal(warner.surface_count, 10);
assert.equal(warner.surface_total, 139);
assert.equal(warner.type_count, 6);
assert.equal(warner.organization_count, 8);
assert.equal(warner.hop_partner_count, 12);
assert.equal(warner.clifford.number, 2);
assert.equal(warner.receipt_ids.length, 14);
assert.equal(warner.rows[0].time_start, '2018-01-24', 'rows are date-sorted');
assert.equal(warner.rows.at(-1).time_start, '2026-07-08');
same(warner.facts.map(fact => fact.text), [
  '10 documented surfaces of 139',
  'across 6 surface types',
  'with 8 organizations on those surfaces',
  '2018-01-24 → 2026-08-11 · 5 active years',
  '6 hop-eligible · 4 context-only',
  '14 receipts on 10 rows: 7 official · 3 primary public',
  'Clifford Number 2'
], 'every fact names its noun and, where it is a share, its denominator');
assert.equal(warner.organization_counts.find(entry => entry.id === 'electric-twin').count, 6, 'Electric Twin on 6 of the 10 surfaces (judge fix: 6, not 7)');
same(warner.recurring.map(entry => [entry.actor_id, entry.surface_ids.length]), [['alex-cooper', 3]], 'counted co-presence on non-dense surfaces only');
same(warner.recurring[0].dates, ['2023-09-28', '2025-09-12', '2025-09-27']);
same(warner.dense_memberships, [], 'Ben Warner is on no dense roster');
const marcWarner = warner.hop_partners.find(partner => partner.actor_id === 'marc-warner');
same(marcWarner.bases.map(basis => basis.day), ['2018-01-24'], 'a basis names its day; no envelope is read');
assert.ok(warner.hop_partners.every(partner => partner.bases.every(basis => basis.surface_id && basis.day && basis.evidence_class)));
assert.equal(warner.machine_sentence, 'Documented on 10 surfaces of 6 types between 2018-01-24 and 2026-08-11, beside 8 organizations.');

// Marc Warner / Saul Klein: two single-day bases, nothing between them.
const marc = context.actorRecordModel(model, hopGraph, null, 'marc-warner');
same(marc.hop_partners.find(partner => partner.actor_id === 'saul-klein').bases.map(basis => basis.day), ['2018-01-24', '2024-10-10']);

// Zero-row and legacy-only people are honest records, not blank pages.
const hogarth = context.actorRecordModel(model, hopGraph, scores.actors.find(item => item.actor_id === 'ian-hogarth'), 'ian-hogarth');
assert.equal(hogarth.row_count, 0);
same(hogarth.facts.map(fact => fact.text), ['0 documented surfaces of 139', 'Clifford Number N/A']);
assert.equal(hogarth.machine_sentence, 'No participation row in this release.');

// --- Electric Twin: 18 surfaces, 15 people, declared surface factory; MoD: broad institution
const twin = context.organizationRecordModel(model, surfaceGraph.organizations.find(item => item.id === 'electric-twin'), 'electric-twin');
assert.equal(twin.surface_count, 18);
assert.equal(twin.row_count, 18);
assert.equal(twin.people_count, 15);
assert.equal(twin.type_count, 6);
assert.equal(twin.declared.surface_factory, true);
assert.equal(twin.declared.broad_institution, false);
assert.equal(twin.facts[0].text, '18 documented surfaces of 139');
assert.equal(twin.facts[2].text, '15 people documented on them');
assert.equal(twin.rows[0].time_start, '2023-09-28');
assert.equal(twin.summary.last_day, '2026-08-12');
same(twin.dense_lines, []);
const mod = context.organizationRecordModel(model, surfaceGraph.organizations.find(item => item.id === 'mod'), 'mod');
assert.equal(mod.surface_count, 13);
assert.equal(mod.declared.broad_institution, true);
assert.equal(mod.declared.surface_factory, false);
const dialogOrg = context.organizationRecordModel(model, surfaceGraph.organizations.find(item => item.id === 'dialog'), 'dialog');
same(dialogOrg.dense_lines.map(line => line.listed_count), [112], 'the roster is one contained line, never 112 names in the people count');
assert.equal(dialogOrg.people_count, 0);

// --- Dialog surface: 112 listed, 3 elsewhere (matt-clifford 8, joe-lonsdale 2, dan-driscoll 1), sorted by that column.
// joe-lonsdale joined the count with the archived defense-corridor receipts (2026-10-23): 8VC and Cicero Institute control rows.
const dialogSurface = surfaceGraph.surfaces.find(item => item.surface_id === 'dialog-public-directory-exposure-2026-06-16');
const dialog = context.surfaceRecordModel(model, hopGraph, receiptGraph, dialogSurface);
assert.equal(dialog.dense, true);
assert.equal(dialog.participant_count, 112);
assert.equal(dialog.elsewhere_count, 3);
assert.equal(dialog.nowhere_else_count, 109);
same(dialog.participants.slice(0, 3).map(entry => [entry.row.entity_id, entry.elsewhere]), [['matt-clifford', 8], ['joe-lonsdale', 2], ['dan-driscoll', 1]]);
assert.ok(dialog.participants.slice(3).every(entry => entry.elsewhere === 0));
assert.equal(dialog.basis_count, 0);
assert.equal(dialog.hop_status, 'Context only · reason: dense_directory_listing_not_shared_participation');
assert.equal(dialog.window_text, '2026-06-16');
assert.equal(dialog.organization_rows.length, 1);
same(dialog.evidence_counts, { primary_public: 112, reported: 1 });
assert.ok(dialog.facts.some(fact => fact.text === '3 of 112 listed people appear on any other documented surface'));
// Every Dialog row carries exactly the surface's 3 receipts, so the page
// renders them once and each row points at that panel instead of repeating
// 3 cards inside 113 closed details elements.
assert.ok(dialog.rows.every(row => context.recordReceiptsMatchSurface(row.receipt_ids, dialogSurface.receipt_ids)), 'every Dialog row carries exactly the surface receipts');
assert.match(context.recordSurfaceRowReceiptsCell(dialog.rows[0], dialogSurface.receipt_ids), /^<button type="button" class="ledger-receipts-ref" data-record-scroll="record-surface-receipts">same 3 receipts as the surface<\/button>$/);
assert.equal(context.recordReceiptsMatchSurface(['b', 'a', 'a'], ['a', 'b']), true, 'order and duplicates do not matter');
assert.equal(context.recordReceiptsMatchSurface(['a'], ['a', 'b']), false, 'a subset is not the same set');
assert.equal(context.recordReceiptsMatchSurface(['a', 'b', 'c'], ['a', 'b']), false, 'a row with a receipt of its own keeps its full list');
assert.equal(context.recordReceiptsMatchSurface([], []), false, 'no receipts is never "the same receipts"');
assert.match(source, /id="record-surface-receipts" tabindex="-1"/, 'the surface receipts panel is the reference target');
// Organization rows carry receipt_ids and get the same receipts cell as the
// people rows, in a ledger table of their own on the surface page.
assert.equal(dialog.organization_rows[0].entity_id, 'dialog');
assert.ok(dialog.organization_rows[0].receipt_ids.length >= 1, 'the Dialog organization row carries receipt ids');
assert.ok(model.rows.filter(row => row.participant_type === 'organization').every(row => row.receipt_ids.length >= 1), 'every organization participation row carries receipt ids');
assert.match(source, /const organizationColumns = \['#', 'Organization', 'Role', 'Window', 'Evidence', 'Receipts'\];/);
assert.match(source, /recordTable\(organizationColumns, record\.organization_rows, organizationCellsFor, \{ rowAttributes: recordRowAttributes \}\)/, 'organization rows render through the same ledger table');
assert.match(source, /const organizationCellsFor = \(row, index\) => \[[^\]]*receiptsCellFor\(row\)\s*\]/, 'organization rows use the same receipts cell as actor rows');

// A hop surface lists its bases by day; a surface with only the compiler's generic reason says so.
const frontier = context.surfaceRecordModel(model, hopGraph, receiptGraph, surfaceGraph.surfaces.find(item => item.surface_id === 'frontier-ai-taskforce-external-advisory-board-appointments-2023-09-07'));
assert.equal(frontier.basis_count, 21);
same(frontier.basis_days, ['2023-09-07']);
assert.equal(frontier.hop_status, 'Hop-eligible · 21 admitted actor-pair bases dated 2023-09-07');
assert.equal(frontier.dense, false);
same(frontier.participants.map(entry => entry.row.entity_id), frontier.actor_rows.map(row => row.entity_id), 'a non-dense surface keeps ledger order');
const unrecorded = context.surfaceRecordModel(model, hopGraph, receiptGraph, surfaceGraph.surfaces.find(item => item.surface_id === 'electric-twin-ben-warner-director-tenure-2023-09-28'));
assert.equal(unrecorded.hop_status, 'Context only · no reason recorded in the ledger');
assert.equal(unrecorded.window_text, '2023-09-28 → 2026-08-11');
const openEnded = context.surfaceRecordModel(model, hopGraph, receiptGraph, surfaceGraph.surfaces.find(item => item.surface_id === 'detachment-201-program-context-2025'));
assert.equal(openEnded.window_text, '2025-06-13 → end not recorded');
const yearPrecision = context.surfaceRecordModel(model, hopGraph, receiptGraph, surfaceGraph.surfaces.find(item => item.surface_id === 'vote-leave-data-science-2016'));
assert.equal(yearPrecision.window_text, '2016 · year precision');

// --- type and year pages
const employment = context.typeRecordModel(model, 'employment_investment_surface');
// Counts updated for the defense-corridor staging merge (2026-10-23): +19 NatSec100 capital-exit
// surfaces (organization-only) and +29 surfaces overall; actor rows are unchanged. Then, with the archived
// A/B receipts: 27 -> 38 surfaces, 59 -> 133 rows, 15 -> 16 actor rows, 44 -> 117 organization rows (139 overall).
assert.equal(employment.surfaces.length, 38);
assert.equal(employment.rows.length, 133);
assert.equal(employment.actor_rows.length, 16);
assert.equal(employment.organization_rows.length, 117);
assert.equal(employment.facts[0].text, '38 surfaces of 139');
assert.equal(context.typeRecordModel(model, 'no_such_type'), null);
const year2025 = context.yearRecordModel(model, '2025', receiptGraph.receipts);
assert.equal(year2025.surfaces_started, 23);
assert.equal(year2025.hop_bases, 28, 'bases dated in the year are counted by basis day (28), never by edge envelope');
assert.equal(year2025.rows_active.length, 129);
assert.equal(year2025.rows_started, 108);
assert.ok(year2025.rows_active.every(entry => entry.row.start_day != null));
assert.equal(context.yearRecordModel(model, '2019', receiptGraph.receipts), null, 'no row touches 2019: the envelope years are not pages');
assert.equal(context.yearRecordModel(model, 'abcd', receiptGraph.receipts), null);

// --- the evidence floor is never silent
const official = context.recordFloorPartition(warner.rows, 'official');
assert.equal(official.shown.length, 7);
assert.equal(official.hidden_by_floor, 3);
assert.equal(context.recordStatusText(official, warner.rows.length), 'Showing 7 of 10 rows · 3 hidden by the evidence floor (Official only)');
assert.equal(context.recordStatusText(context.recordFloorPartition(warner.rows, 'open'), warner.rows.length), 'Showing 10 of 10 rows · nothing hidden by a filter');
const text = context.ledgerText(warner, warner.rows);
const lines = text.split('\n');
assert.equal(lines[0].startsWith('Dr. Ben Warner — 10 documented surfaces of 139'), true);
assert.equal(lines.filter(line => /^\d{2}\. /.test(line)).length, 10);
assert.match(lines[2], /^01\. 2018-01-24 · Faculty Science officer \/ employee overlap, 24 January 2018 · Commercial Principal/);
assert.equal(lines.at(-1), 'Documented participation on bounded public surfaces only. Shared context does not establish contact, influence, coordination, agreement, or wrongdoing.');

// --- the receipt dialog's origin: the aperture publishes it, app.js reads it honestly
assert.equal(context.atlasInspectorOrigin({}), null, 'no aperture origin published: the dialog keeps its plain label');
context.__cliffordApertureOrigin = { mode: 'Timeline', objectLabel: 'Dr. Ben Warner', objectId: 'lane::ben-warner', selectObject: id => { context.__selected = id; } };
const origin = context.atlasInspectorOrigin({ getBoundingClientRect: () => ({ left: 10, top: 20, width: 30, height: 40 }) });
assert.equal(origin.mode, 'Timeline');
assert.equal(origin.objectLabel, 'Dr. Ben Warner');
assert.equal(origin.objectId, 'lane::ben-warner');
same(origin.rect, { left: 10, top: 20, width: 30, height: 40 });
origin.selectObject('lane::ben-warner');
assert.equal(context.__selected, 'lane::ben-warner');
same(context.inspectorBreadcrumbModel({ mode: origin.mode, objectLabel: origin.objectLabel, objectId: origin.objectId, claimLabel: 'Companies House officers' }).map(crumb => crumb.label), ['Timeline', 'Dr. Ben Warner', 'Companies House officers']);
context.__cliffordApertureOrigin = 'not an object';
assert.equal(context.atlasInspectorOrigin({}), null, 'a malformed origin is ignored, never rendered');
context.__cliffordApertureOrigin = { mode: '', objectLabel: '' };
assert.equal(context.atlasInspectorOrigin({}), null, 'an empty origin produces no crumb');

// --- every entity page, zero-row pages included, is an article.record[data-record-kind]:
// the receipt dialog reads that wrapper for its "Record / <label>" crumb.
for (const name of ['renderActor', 'renderOrg', 'renderSurface', 'renderType', 'renderYear']) {
  const start = source.indexOf(`\nfunction ${name}(`);
  assert.notEqual(start, -1, `${name} is defined`);
  const body = source.slice(start, source.indexOf('\nfunction ', start + 1));
  const assignments = [...body.matchAll(/\$\('#detail'\)\.innerHTML = ([^\n]{0,120})/g)].map(match => match[1]);
  assert.ok(assignments.length >= 1, `${name} renders into #detail`);
  for (const html of assignments) assert.match(html, /^`<article class="record record--\w+" data-record-kind="\w+" data-record-id=/, `${name}: ${html.slice(0, 40)}… must be wrapped in article.record[data-record-kind]`);
  if (name === 'renderActor' || name === 'renderOrg') assert.equal(assignments.length, 2, `${name} renders both its zero-row page and its ledger page`);
}

// --- the hero eyebrow: app.js writes it from the loaded graphs; the aperture
// later writes the same two strings from the same artifacts.
same(context.heroCountsText(surfaceGraph, hopGraph), { nodes: `${surfaceGraph.actors.length} actors · ${surfaceGraph.surfaces.length} surfaces`, edges: `${hopGraph.edges.length} admitted hops` });
// 93 -> 133 with the archived defense-corridor A/B receipts (Stratos 36, Traysar 3, Pallas 1 team-page pairs).
assert.equal(context.heroCountsText(surfaceGraph, hopGraph).edges, '133 admitted hops');
same(context.heroCountsText(null, null), { nodes: '0 actors · 0 surfaces', edges: '0 admitted hops' });
const part2Source = fs.readFileSync('src/visual-aperture-part-2.js', 'utf8');
for (const template of ['`${actorCount} actors · ${surfaceCount} surfaces`', '`${hopCount} admitted hops`']) {
  assert.ok(source.includes(template) && part2Source.includes(template), `app.js and the aperture share the hero template ${template}`);
}
assert.match(source, /\r?\n  renderHeroCounts\(\);\r?\n/, 'init writes the hero counts as soon as the data is loaded');

// --- the browse index: one section per kind, capped, every kind represented
const browseKinds = ['actor', 'organization', 'surface', 'type', 'year', 'case', 'track', 'chain', 'claim', 'receipt', 'candidate'];
const browseItems = [
  ...Array.from({ length: 12 }, (_, i) => ({ kind: 'actor', id: `a${i}`, label: `Person ${String(i).padStart(2, '0')}` })),
  ...browseKinds.filter(kind => kind !== 'actor').map(kind => ({ kind, id: `${kind}-1`, label: `${kind} one` }))
];
const browse = context.browseIndexModel(browseItems, { cap: 8, hasRows: item => (item.id === 'a11' ? 0 : 1) });
same(browse.sections.map(section => section.kind), browseKinds, 'every searchable kind is a section, in the fixed order');
same([browse.sections[0].items.length, browse.sections[0].total, browse.sections[0].hidden, browse.sections[0].expanded], [8, 12, 4, false], 'a section is cut at the cap and counts what it hides');
assert.equal(browse.sections[0].items[0].id, 'a11', 'records with ledger rows lead their section');
assert.equal(browse.visible.length, 8 + 10, 'the visible list is the flat option list the keyboard handler indexes');
assert.equal(browse.total, 22);
const opened = context.browseIndexModel(browseItems, { cap: 8, expanded: new Set(['actor']) });
same([opened.sections[0].items.length, opened.sections[0].hidden, opened.sections[0].expanded], [12, 0, true], 'Show all opens one section past its cap');
assert.equal(opened.sections[0].items[0].label, 'Person 00', 'without the row signal a section is alphabetical');
same(context.browseIndexModel([]).sections, [], 'no records, no sections');

// --- the trajectory strip: dated steps in date order under the name, coloured by surface class
for (const name of ['recordTrajectoryModel', 'recordTrajectoryMarkup', 'trajectoryClass', 'trajectoryAmountText', 'trajectoryAmountLookup']) {
  assert.equal(typeof context[name], 'function', `app.js exposes ${name} as a top-level function`);
}
same(['policy_document_surface', 'government_advisory_surface', 'campaign_surface', 'model_governance_surface', 'category_formation_surface', 'board_advisory_surface', 'directory_roster_surface', 'procurement_contract_surface', 'customer_vendor_surface', 'defence_industrial_surface', 'employment_investment_surface', 'founder_officer_surface', 'public_private_fund_surface', 'laundering_chain_connector', 'no_such_type', null].map(type => context.trajectoryClass(type)),
  ['policy', 'policy', 'policy', 'policy', 'policy', 'appointment', 'appointment', 'procurement', 'procurement', 'procurement', 'capital', 'capital', 'capital', 'capital', 'policy', 'policy'], 'surface type to class, unknown falls back to policy');
assert.equal(context.trajectoryAmountText(200000000), '£200,000,000');
assert.equal(context.trajectoryAmountText(950), '£950');
assert.equal(context.trajectoryAmountText(null), null);
const surfaceById = new Map(surfaceGraph.surfaces.map(item => [item.surface_id, item]));
const amountFor = context.trajectoryAmountLookup(surfaceId => surfaceById.get(surfaceId));
const warnerTrajectory = context.recordTrajectoryModel(warner.rows, { amountFor });
assert.equal(warnerTrajectory.dated.length, 10);
assert.equal(warnerTrajectory.undated.length, 0);
same(warnerTrajectory.dated.map(step => step.time_start), JSON.parse(JSON.stringify(warner.rows.map(row => row.time_start))), 'steps follow the date-sorted ledger rows');
same(warnerTrajectory.dated.map(step => step.class), ['capital', 'policy', 'policy', 'appointment', 'capital', 'capital', 'capital', 'capital', 'policy', 'procurement']);
assert.equal(warnerTrajectory.line, 'First documented 2018-01-24 as employee role observation; latest 2026-07-08 as speaker. Classes touched: capital, policy, appointment, procurement.');
const warnerStrip = context.recordTrajectoryMarkup(warnerTrajectory);
assert.match(warnerStrip, /^<section class="record-trajectory" id="record-trajectory"/);
assert.match(warnerStrip, /<span class="panel-label" id="record-trajectory-title">Trajectory<\/span>/);
assert.equal((warnerStrip.match(/<li class="trajectory-step trajectory-step--/g) ?? []).length, 10);
assert.match(warnerStrip, /data-record-mark="[^"]+"[^>]*>2018-01-24<\/button><span class="trajectory-class"><span class="trajectory-dot" aria-hidden="true"><\/span>capital<\/span><a class="trajectory-surface" href="#surface\//, 'a step is date, class dot and name, surface link, role');
assert.doesNotMatch(warnerStrip, /Undated/, 'no undated heading without undated rows');
// Organization pages: the strip is built from the organization's own rows, with amounts.
const ukGov = context.organizationRecordModel(model, surfaceGraph.organizations.find(item => item.id === 'uk-government'), 'uk-government');
const ukGovTrajectory = context.recordTrajectoryModel(ukGov.rows, { amountFor });
const barrowStep = ukGovTrajectory.steps.find(step => step.surface_id === 'team-barrow-public-private-fund-2026');
assert.equal(barrowStep.amount_text, '£200,000,000', 'a row carrying funding_amount_gbp shows the amount');
assert.equal(barrowStep.class, 'capital');
assert.match(context.recordTrajectoryMarkup(ukGovTrajectory), /<span class="trajectory-amount">£200,000,000<\/span>/);
const twinTrajectory = context.recordTrajectoryModel(twin.rows, { amountFor });
assert.equal(twinTrajectory.steps.length, twin.rows.length);
assert.equal(twinTrajectory.dated[0].time_start, '2023-09-28');
// Undated rows follow the dated ones under "Undated".
const synthetic = context.recordTrajectoryModel([
  { key: 'u', surface_id: 's-u', surface_label: 'Undated surface', surface_type: 'procurement_contract_surface', role: 'supplier', participation_type: 'supplier', precision: 'undated', start_day: null, time_start: null },
  { key: 'b', surface_id: 's-b', surface_label: 'Later', surface_type: 'founder_officer_surface', role: 'Founder', participation_type: 'founder_officer', precision: 'day', kind: 'day', start_day: 20, time_start: '2024-01-02' },
  { key: 'a', surface_id: 's-a', surface_label: 'Earlier', surface_type: 'government_advisory_surface', role: 'Adviser', participation_type: 'special_adviser', precision: 'day', kind: 'day', start_day: 10, time_start: '2020-01-01' }
]);
same(synthetic.dated.map(step => step.key), ['a', 'b']);
same(synthetic.undated.map(step => step.key), ['u']);
assert.equal(synthetic.line, 'First documented 2020-01-01 as special adviser; latest 2024-01-02 as founder officer. Classes touched: policy, capital, procurement. 1 undated row listed after.');
const syntheticStrip = context.recordTrajectoryMarkup(synthetic);
assert.ok(syntheticStrip.indexOf('Earlier') < syntheticStrip.indexOf('Later') && syntheticStrip.indexOf('Later') < syntheticStrip.indexOf('<h4 class="trajectory-undated-head">Undated</h4>') && syntheticStrip.indexOf('Undated</h4>') < syntheticStrip.indexOf('Undated surface'), 'dated in order, then the Undated heading, then the undated rows');
assert.equal(context.recordTrajectoryMarkup(context.recordTrajectoryModel([])), '', 'no rows, no strip');
// Page order: the strip comes directly after the heading, before who/why, the stats block and the profile receipts.
for (const name of ['renderActor', 'renderOrg']) {
  const start = source.indexOf(`\nfunction ${name}(`);
  const body = source.slice(start, source.indexOf('\nfunction ', start + 1));
  assert.match(body, /recordHeading\([^\n]*\)\}\$\{recordTrajectoryMarkup\(trajectory\)\}<div class="badge-row record-kind-line">/, `${name}: the trajectory strip sits directly under the name`);
  assert.match(body, /recordTrajectoryModel\(record\.rows, \{ amountFor: trajectoryAmountLookup\(surface\) \}\)/, `${name}: the strip is built from the page's own rows`);
}
const actorStart = source.indexOf('\nfunction renderActor(');
const actorBody = source.slice(actorStart, source.indexOf('\nfunction ', actorStart + 1));
assert.match(actorBody, /\$\{recordTrajectoryMarkup\(trajectory\)\}<div class="badge-row record-kind-line">\$\{badges\}<\/div>\$\{profileHtml\}\$\{recordFacts\(record\.facts\)\}\$\{profileReceipts\}<aside class="profile-boundary"><strong>What this entry supports:<\/strong> documented participation on named public-role surfaces\. <strong>What it does not support:<\/strong> claims about motive, agreement, influence, coordination, character, or wrongdoing\.<\/aside>/, 'actor head: strip, who/why, stats, receipts, then the unchanged supports / does-not-support pair');

// --- registration
assert.match(JSON.parse(fs.readFileSync('package.json', 'utf8')).scripts.test, /node test\/record-pages\.test\.js/);

console.log(`record-pages.test.js: OK (ben-warner ${warner.row_count} rows / ${warner.type_count} types / ${warner.organization_count} organizations / CN ${warner.clifford.number}; electric-twin ${twin.surface_count} surfaces / ${twin.people_count} people; dialog ${dialog.participant_count} listed / ${dialog.elsewhere_count} elsewhere; 2025: ${year2025.rows_active.length} rows active, ${year2025.hop_bases} bases)`);
