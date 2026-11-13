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

// --- Ben Warner: 17 rows, 6 types, 12 organizations, 17 hop partners, Clifford Number 2
// 2026-11-10 lens-hunt promotion: four SAGE attendee-list surfaces (2020-03-18, 2020-10-22, 2020-12-03, 2021-01-07) and the UKSA review Challenge Panel (2023-06-09) add five rows: 12 -> 17 rows, 9 -> 12 organizations (SAGE, Cabinet Office, UKSA), 12 -> 17 hop partners (the five other panel members), 17 -> 24 receipts.
// 2026-10-23 five-lane merge: the synthetic-constituency lane adds two Ben Warner rows (Electric Twin seven-panels comparison co-author, 2026-07-29; named in the No 10 synthetic-voters column, 2025-07-07): 10 -> 12 rows, 8 -> 9 organizations, 14 -> 17 receipts.
const warner = context.actorRecordModel(model, hopGraph, scores.actors.find(item => item.actor_id === 'ben-warner'), 'ben-warner');
assert.equal(warner.row_count, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(warner.surface_count, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(warner.surface_total, 3759); // 2026-11-12 UK contract awards: 2,371 -> 3,759. 2026-11-12 Bitter Struggle chain: 2,340 -> 2,371. 2026-11-12 UK ministerial meetings: 2,262 -> 2,340. 2026-11-10 hand-judged Form D filings: 1,746 -> 2,262. 2026-11-10 Form D data sets: 1308 -> 1746. 2026-11-10 follow-up: 1307 -> 1308. 2026-11-10 one-pass entry: 1160 -> 1307. 2026-11-10 lens-hunt promotion: 1155 -> 1160. 2026-10-23 five-lane merge: 858 -> 1155. 2026-10-23 promotion: 139 -> 858 surfaces
assert.equal(warner.type_count, 6);
assert.equal(warner.organization_count, 12); // 2026-11-10 lens-hunt promotion: 9 -> 12. 2026-10-23 five-lane merge: 8 -> 9
assert.equal(warner.hop_partner_count, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17.
assert.equal(warner.clifford.number, 2);
assert.equal(warner.receipt_ids.length, 24); // 2026-11-10 lens-hunt promotion: 17 -> 24. 2026-10-23 five-lane merge: 14 -> 17
assert.equal(warner.rows[0].time_start, '2018-01-24', 'rows are date-sorted');
assert.equal(warner.rows.at(-1).time_start, '2026-07-29'); // 2026-10-23 five-lane merge: 2026-07-08 -> 2026-07-29
same(warner.facts.map(fact => fact.text), [
  '17 documented surfaces of 3759', // 2026-11-12 UK contract awards: of 2,371 -> of 3,759 surfaces. 2026-11-12 Bitter Struggle chain: of 2,340 -> of 2,371 surfaces. 2026-11-12 UK ministerial meetings: of 2,262 -> of 2,340 surfaces. 2026-11-10 hand-judged Form D filings: of 1,746 -> of 2,262 surfaces. 2026-11-10 Form D data sets: 1308 -> 1746 (of 1,308 -> of 1,746 surfaces). 2026-11-10 follow-up: of 1,307 -> of 1,308 surfaces. 2026-11-10 one-pass entry: of 1,160 -> of 1,307 surfaces. 2026-11-10 lens-hunt promotion: 12 of 1155 -> 17 of 1160. 2026-10-23 five-lane merge: '10 documented surfaces of 858' -> 12 of 1155
  'across 6 surface types',
  'with 12 organizations on those surfaces', // 2026-11-10 lens-hunt promotion: 9 -> 12. 2026-10-23 five-lane merge: 8 -> 9
  '2018-01-24 → 2026-08-11 · 6 active years', // 2026-11-10 lens-hunt promotion: 5 -> 6 active years (2021, SAGE 75)
  '8 hop-eligible · 9 context-only', // 2026-11-10 lens-hunt promotion: 6 -> 8 hop-eligible (SAGE 17, UKSA panel), 6 -> 9 context-only (SAGE 63, 71, 75). 2026-10-23 five-lane merge: 4 -> 6 context-only
  '24 receipts on 17 rows: 12 official · 4 primary public · 1 reported', // 2026-11-10 lens-hunt promotion: was '17 receipts on 12 rows: 7 official · 4 primary public · 1 reported'. 2026-10-23 five-lane merge: was '14 receipts on 10 rows: 7 official · 3 primary public'
  'Clifford Number 2'
], 'every fact names its noun and, where it is a share, its denominator');
// 2026-10-23 five-lane merge: 6 -> 7 (the seven-panels comparison is an Electric Twin surface); the judge fix (count surfaces, not rows) is unchanged.
assert.equal(warner.organization_counts.find(entry => entry.id === 'electric-twin').count, 7, 'Electric Twin on 7 of the 17 surfaces');
same(warner.recurring.map(entry => [entry.actor_id, entry.surface_ids.length]), [['alex-cooper', 3], ['dominic-cummings', 2], ['marc-warner', 2], ['michael-muthukrishna', 2]], 'counted co-presence on non-dense surfaces only'); // 2026-11-10 lens-hunt promotion: + marc-warner (SAGE 17).  2026-10-23 five-lane merge: was [['alex-cooper', 3]]
same(warner.recurring[0].dates, ['2023-09-28', '2025-09-12', '2025-09-27']);
same(warner.dense_memberships, [], 'Ben Warner is on no dense roster');
const marcWarner = warner.hop_partners.find(partner => partner.actor_id === 'marc-warner');
same(marcWarner.bases.map(basis => basis.day), ['2018-01-24', '2020-03-18'], 'a basis names its day; no envelope is read'); // 2026-11-10 lens-hunt promotion: + 2020-03-18 (SAGE 17)
assert.ok(warner.hop_partners.every(partner => partner.bases.every(basis => basis.surface_id && basis.day && basis.evidence_class)));
assert.equal(warner.machine_sentence, 'Documented on 17 surfaces of 6 types between 2018-01-24 and 2026-08-11, beside 12 organizations.'); // 2026-11-10 lens-hunt promotion: Documented on 12 surfaces of 6 types between 2018-01-24 and 2026-08-11, beside 9 organizations. -> Documented on 17 surfaces of 6 types between 2018-01-24 and 2026-08-11, beside 12 organizations.. 2026-10-23 five-lane merge: 10 surfaces / 8 organizations -> 12 / 9

// Marc Warner / Saul Klein: two single-day bases, nothing between them.
const marc = context.actorRecordModel(model, hopGraph, null, 'marc-warner');
same(marc.hop_partners.find(partner => partner.actor_id === 'saul-klein').bases.map(basis => basis.day), ['2018-01-24', '2024-10-10']);

// Zero-row and legacy-only people are honest records, not blank pages.
// Narrowed 2026-10-23 five-lane merge: the fixture was ian-hogarth, who now has one row (Frontier AI
// Taskforce Faculty contract, 2023-10-18), so he is no longer a zero-row person. The rule is unchanged and
// now runs on jade-leung, a scored actor with no participation row. Old: hogarth.row_count === 0 and facts
// ['0 documented surfaces of 858', 'Clifford Number N/A']. New: the same assertions on jade-leung, 1155 surfaces.
// Narrowed 2026-11-12 UK ministerial meetings: jade-leung now has one row (a DSIT meeting of 28 September
// 2023), so the fixture moves to dan-rosenfield, a scored actor with no participation row and no Clifford
// number. The rule and the assertions are unchanged.
const hogarth = context.actorRecordModel(model, hopGraph, scores.actors.find(item => item.actor_id === 'dan-rosenfield'), 'dan-rosenfield');
assert.equal(hogarth.row_count, 0);
same(hogarth.facts.map(fact => fact.text), ['0 documented surfaces of 3759', 'Clifford Number N/A']); // 2026-11-12 UK contract awards: of 2,371 -> of 3,759 surfaces. 2026-11-12 Bitter Struggle chain: of 2,340 -> of 2,371 surfaces. 2026-11-12 UK ministerial meetings: of 2,262 -> of 2,340 surfaces. 2026-11-10 hand-judged Form D filings: of 1,746 -> of 2,262 surfaces. 2026-11-10 Form D data sets: 1308 -> 1746 (of 1,308 -> of 1,746 surfaces). 2026-11-10 follow-up: of 1,307 -> of 1,308 surfaces. 2026-11-10 one-pass entry: of 1,160 -> of 1,307 surfaces. 2026-11-10 lens-hunt promotion: 1155 -> 1160 surfaces.  2026-10-23 five-lane merge: 858 -> 1155 surfaces
assert.equal(hogarth.machine_sentence, 'No participation row in this release.');

// --- Electric Twin: 22 surfaces, 16 people, declared surface factory; MoD: broad institution
// 2026-10-23 five-lane merge: Electric Twin 18 -> 22 surfaces and rows, 15 -> 16 people; MoD 13 -> 14 surfaces.
const twin = context.organizationRecordModel(model, surfaceGraph.organizations.find(item => item.id === 'electric-twin'), 'electric-twin');
assert.equal(twin.surface_count, 22); // 2026-10-23 five-lane merge: 18 -> 22
assert.equal(twin.row_count, 22); // 2026-10-23 five-lane merge: 18 -> 22
assert.equal(twin.people_count, 16); // 2026-10-23 five-lane merge: 15 -> 16
assert.equal(twin.type_count, 6);
assert.equal(twin.declared.surface_factory, true);
assert.equal(twin.declared.broad_institution, false);
assert.equal(twin.facts[0].text, '22 documented surfaces of 3759'); // 2026-11-12 UK contract awards: of 2,371 -> of 3,759 surfaces. 2026-11-12 Bitter Struggle chain: of 2,340 -> of 2,371 surfaces. 2026-11-12 UK ministerial meetings: of 2,262 -> of 2,340 surfaces. 2026-11-10 hand-judged Form D filings: of 1,746 -> of 2,262 surfaces. 2026-11-10 Form D data sets: 1308 -> 1746 (of 1,308 -> of 1,746 surfaces). 2026-11-10 follow-up: of 1,307 -> of 1,308 surfaces. 2026-11-10 one-pass entry: of 1,160 -> of 1,307 surfaces. 2026-11-10 lens-hunt promotion: 22 documented surfaces of 1155 -> 22 documented surfaces of 1160. 2026-10-23 five-lane merge: '18 documented surfaces of 858' -> 22 of 1155
assert.equal(twin.facts[2].text, '16 people documented on them'); // 2026-10-23 five-lane merge: 15 -> 16
assert.equal(twin.rows[0].time_start, '2023-09-28');
assert.equal(twin.summary.last_day, '2026-08-12');
same(twin.dense_lines, []);
const mod = context.organizationRecordModel(model, surfaceGraph.organizations.find(item => item.id === 'mod'), 'mod');
assert.equal(mod.surface_count, 369); // 2026-11-12 UK contract awards: 19 -> 369. 2026-11-12 UK ministerial meetings: 14 -> 19. 2026-10-23 five-lane merge: 13 -> 14
assert.equal(mod.declared.broad_institution, true);
assert.equal(mod.declared.surface_factory, false);
const dialogOrg = context.organizationRecordModel(model, surfaceGraph.organizations.find(item => item.id === 'dialog'), 'dialog');
same(dialogOrg.dense_lines.map(line => line.listed_count), [112], 'the roster is one contained line, never 112 names in the people count');
assert.equal(dialogOrg.people_count, 0);

// --- Dialog surface: 112 listed, 6 elsewhere (matt-clifford 12, joe-lonsdale 9, jim-himes 3, tyler-cowen 2, wes-moore 2, dan-driscoll 1), sorted by that column (2026-10-23 five-lane merge; was 3 elsewhere).
// joe-lonsdale joined the count with the archived defense-corridor receipts (2026-10-23): 8VC and Cicero Institute control rows.
const dialogSurface = surfaceGraph.surfaces.find(item => item.surface_id === 'dialog-public-directory-exposure-2026-06-16');
const dialog = context.surfaceRecordModel(model, hopGraph, receiptGraph, dialogSurface);
assert.equal(dialog.dense, true);
assert.equal(dialog.participant_count, 112);
assert.equal(dialog.elsewhere_count, 40); // 2026-11-12 UK ministerial meetings: 33 -> 40. 2026-11-10 hand-judged Form D filings: 21 -> 33. 2026-11-10 Form D data sets: 6 -> 21 (fifteen listed people now hold data-set Form D rows). 2026-10-23 five-lane merge: 4 -> 6. 2026-10-23 promotion: jim-himes (3 elsewhere) joins matt-clifford, joe-lonsdale, dan-driscoll
assert.equal(dialog.nowhere_else_count, 72); // 2026-11-12 UK ministerial meetings: 79 -> 72. 2026-11-10 hand-judged Form D filings: 91 -> 79. 2026-11-10 Form D data sets: 106 -> 91. 2026-10-23 five-lane merge: 108 -> 106. 2026-10-23 promotion: 109 -> 108
same(dialog.participants.slice(0, 40).map(entry => [entry.row.entity_id, entry.elsewhere]), [['karen-karniol-tambour', 131], ['joe-lonsdale', 112], ['mike-novogratz', 108], ['henry-kravis', 42], ['elon-musk', 41], ['matt-clifford', 23], ['chamath-palihapitiya', 16], ['scott-bessent', 15], ['matt-cohler', 13], ['reid-hoffman', 9], ['wes-moore', 8], ['eric-schmidt', 7], ['severin-hacker', 5], ['thasunda-brown-duckett', 5], ['tom-tugendhat', 5], ['adam-grant', 4], ['immad-akhund', 4], ['mario-schlosser', 4], ['scott-stephenson', 4], ['shivon-zilis', 4], ['adam-d-angelo', 3], ['jim-himes', 3], ['jonathan-haidt', 3], ['jonathan-ross', 3], ['cesar-carvalho', 2], ['garry-kasparov', 2], ['strauss-zelnick', 2], ['tyler-cowen', 2], ['wences-casares', 2], ['atul-gawande', 1], ['dan-driscoll', 1], ['jared-kushner', 1], ['jens-spahn', 1], ['joseph-gordon-levitt', 1], ['kim-scott', 1], ['lawrence-summers', 1], ['pete-shadbolt', 1], ['scott-belsky', 1], ['scott-cook', 1], ['stan-mcchrystal', 1]]); // 2026-11-12 Bitter Struggle chain: matt-clifford 18 -> 23 (five new surfaces: the Inherent advisory role, the Action Plan lead-reviewer term, the AISI Advisory Board, and the reported Anthropic appointment and ARIA exit). 2026-11-12 UK ministerial meetings: was the 33 names above it; seven listed people join with meeting rows (eric-schmidt, tom-tugendhat, jonathan-haidt, garry-kasparov, atul-gawande, jens-spahn, stan-mcchrystal), and Matt Clifford, Reid Hoffman and Wes Moore gain rows. 2026-11-10 hand-judged Form D filings: was the 21 names above it; twelve listed people join with hand-judged Form D rows (Karen Karniol-Tambour, Mike Novogratz, Henry Kravis, Scott Bessent and eight more) and Elon Musk, Matt Cohler, Wes Moore and Joe Lonsdale gain rows. 2026-11-10 Form D data sets: was slice(0, 6) = [['joe-lonsdale', 13], ['matt-clifford', 12], ['jim-himes', 3], ['tyler-cowen', 2], ['wes-moore', 2], ['dan-driscoll', 1]]; the data-set filings add rows for Joe Lonsdale, Matt Clifford (Entrepreneur First funds) and thirteen other listed people, and fifteen join the column. 2026-11-10 one-pass entry: was [['matt-clifford', 12], ['joe-lonsdale', 9], ...]; Joe Lonsdale gains four 8VC Form D filings. 2026-10-23 five-lane merge: was slice(0, 4) = [['matt-clifford', 8], ['jim-himes', 3], ['joe-lonsdale', 2], ['dan-driscoll', 1]]; tyler-cowen and wes-moore join. 2026-10-23 promotion: jim-himes added
assert.ok(dialog.participants.slice(40).every(entry => entry.elsewhere === 0)); // 2026-11-12 UK ministerial meetings: slice(33) -> slice(40). 2026-11-10 hand-judged Form D filings: slice(21) -> slice(33). 2026-11-10 Form D data sets: slice(6) -> slice(21). 2026-10-23 five-lane merge: slice(4) -> slice(6). 2026-10-23 promotion: 3 -> 4 elsewhere
assert.equal(dialog.basis_count, 0);
assert.equal(dialog.hop_status, 'Context only · reason: dense_directory_listing_not_shared_participation');
assert.equal(dialog.window_text, '2026-06-16');
assert.equal(dialog.organization_rows.length, 1);
same(dialog.evidence_counts, { primary_public: 112, reported: 1 });
assert.ok(dialog.facts.some(fact => fact.text === '40 of 112 listed people appear on any other documented surface')); // 2026-11-12 UK ministerial meetings: '33 of 112' -> '40 of 112'. 2026-11-10 hand-judged Form D filings: '21 of 112' -> '33 of 112'. 2026-11-10 Form D data sets: 6 -> 21 ('6 of 112' -> '21 of 112'). 2026-10-23 five-lane merge: '4 of 112' -> '6 of 112'
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
assert.equal(employment.surfaces.length, 1603); // 2026-11-12 Bitter Struggle chain: 1,601 -> 1,603. 2026-11-10 hand-judged Form D filings: 1,085 -> 1,601. 2026-11-10 Form D data sets: 647 -> 1085. 2026-11-10 follow-up: 646 -> 647. 2026-11-10 one-pass entry: 510 -> 646. 2026-10-23 five-lane merge: 429 -> 510. 2026-10-23 promotion: 38 -> 429 (LinkedIn role surfaces are employment surfaces)
assert.equal(employment.rows.length, 3889); // 2026-11-12 Bitter Struggle chain: 3,878 -> 3,889. 2026-11-10 hand-judged Form D filings: 2,825 -> 3,878. 2026-11-10 Form D data sets: 1529 -> 2825. 2026-11-10 follow-up: 1520 -> 1529. 2026-11-10 one-pass entry: 1300 -> 1520. 2026-10-23 final re-pin: 1339 -> 1300. 2026-10-23 five-lane merge: 919 -> 1339. 2026-10-23 promotion: 133 -> 919
assert.equal(employment.actor_rows.length, 1845); // 2026-11-12 Bitter Struggle chain: 1,838 -> 1,845. 2026-11-10 hand-judged Form D filings: 1,319 -> 1,838. 2026-11-10 Form D data sets: 588 -> 1319. 2026-11-10 follow-up: 579 -> 588. 2026-11-10 one-pass entry: 507 -> 579. 2026-10-23 final re-pin: 546 -> 507. 2026-10-23 five-lane merge: 409 -> 546. 2026-10-23 promotion: 16 -> 409
assert.equal(employment.organization_rows.length, 2044); // 2026-11-12 Bitter Struggle chain: 2,040 -> 2,044. 2026-11-10 hand-judged Form D filings: 1,506 -> 2,040. 2026-11-10 Form D data sets: 941 -> 1506. 2026-11-10 one-pass entry: 793 -> 941. 2026-10-23 five-lane merge: 510 -> 793. 2026-10-23 promotion: 117 -> 510
assert.equal(employment.facts[0].text, '1603 surfaces of 3759'); // 2026-11-12 UK contract awards: of 2,371 -> of 3,759 surfaces. 2026-11-12 Bitter Struggle chain: 1,601 surfaces of 2,340 -> 1,603 surfaces of 2,371 (the Inherent seed round and Matt Clifford's reported Anthropic appointment are employment and investment surfaces). 2026-11-12 UK ministerial meetings: of 2,262 -> of 2,340 surfaces. 2026-11-10 hand-judged Form D filings: 1,085 surfaces of 1,746 -> 1,601 surfaces of 2,262 (the 516 hand-judged Form D filings are employment and investment surfaces).2026-11-10 Form D data sets: 647 surfaces of 1,308 -> 1,085 surfaces of 1,746 (the 438 data-set Form D filings are employment and investment surfaces). 2026-11-10 follow-up: 646 surfaces of 1,307 -> 647 surfaces of 1,308 (the Voyager signatories' surface). 2026-11-10 one-pass entry: 510 surfaces of 1,160 -> 646 surfaces of 1,307 (123 Form D filings and 13 drafted surfaces are employment and investment surfaces). 2026-11-10 lens-hunt promotion: 510 surfaces of 1155 -> 510 surfaces of 1160. 2026-10-23 five-lane merge: '429 surfaces of 858' -> 510 of 1155
assert.equal(context.typeRecordModel(model, 'no_such_type'), null);
const year2025 = context.yearRecordModel(model, '2025', receiptGraph.receipts);
assert.equal(year2025.surfaces_started, 588); // 2026-11-12 UK contract awards: 318 -> 588. 2026-11-12 Bitter Struggle chain: 309 -> 318. 2026-11-12 UK ministerial meetings: 286 -> 309. 2026-11-10 hand-judged Form D filings: 210 -> 286. 2026-11-10 Form D data sets: 164 -> 210. 2026-11-10 follow-up: 163 -> 164. 2026-11-10 one-pass entry: 150 -> 163. 2026-11-10 lens-hunt promotion: 148 -> 150. 2026-10-23 five-lane merge: 92 -> 148. 2026-10-23 promotion: 23 -> 92
assert.equal(year2025.hop_bases, 62, 'bases dated in the year are counted by basis day (62), never by edge envelope'); // 2026-11-10 lens-hunt promotion: 61 -> 62. 2026-10-23 final re-pin: 66 -> 61 (duplicate Form D bases removed by the one-row-per-person merge). 2026-10-23 five-lane merge: 28 -> 66
assert.equal(year2025.rows_active.length, 2260); // 2026-11-12 UK contract awards: 1,720 -> 2,260. 2026-11-12 Bitter Struggle chain: 1,681 -> 1,720. 2026-11-12 UK ministerial meetings: 1,097 -> 1,681. 2026-11-10 hand-judged Form D filings: 944 -> 1,097. 2026-11-10 Form D data sets: 800 -> 944. 2026-11-10 follow-up: 791 -> 800. 2026-11-10 one-pass entry: 764 -> 791. 2026-11-10 lens-hunt promotion: 761 -> 764. 2026-10-23 final re-pin: 768 -> 761. 2026-10-23 five-lane merge: 539 -> 768. 2026-10-23 promotion: 129 -> 539
assert.equal(year2025.rows_started, 1965); // 2026-11-12 UK contract awards: 1,425 -> 1,965. 2026-11-12 Bitter Struggle chain: 1,388 -> 1,425. 2026-11-12 UK ministerial meetings: 804 -> 1,388. 2026-11-10 hand-judged Form D filings: 651 -> 804. 2026-11-10 Form D data sets: 507 -> 651. 2026-11-10 follow-up: 498 -> 507. 2026-11-10 one-pass entry: 471 -> 498. 2026-11-10 lens-hunt promotion: 468 -> 471. 2026-10-23 final re-pin: 474 -> 468. 2026-10-23 five-lane merge: 246 -> 474. 2026-10-23 promotion: 108 -> 246
assert.ok(year2025.rows_active.every(entry => entry.row.start_day != null));
// 2026-10-23 promotion: LinkedIn role rows now touch every year from 1982 on, so 2019 has rows
// and is a page. The rule (a year no row touches is not a page) is checked on 1950 instead.
assert.ok(context.yearRecordModel(model, '2019', receiptGraph.receipts), '2019 now has rows');
assert.equal(context.yearRecordModel(model, '1950', receiptGraph.receipts), null, 'no row touches 1950: a year with no row is not a page');
assert.equal(context.yearRecordModel(model, 'abcd', receiptGraph.receipts), null);

// --- the evidence floor is never silent
const official = context.recordFloorPartition(warner.rows, 'official');
assert.equal(official.shown.length, 12); // 2026-11-10 lens-hunt promotion: 7 -> 12.
assert.equal(official.hidden_by_floor, 5); // 2026-10-23 five-lane merge: 3 -> 5
assert.equal(context.recordStatusText(official, warner.rows.length), 'Showing 12 of 17 rows · 5 hidden by the evidence floor (Official only)'); // 2026-11-10 lens-hunt promotion: Showing 7 of 12 rows · 5 hidden by the evidence floor (Official only) -> Showing 12 of 17 rows · 5 hidden by the evidence floor (Official only). 2026-10-23 five-lane merge: 7 of 10 · 3 hidden -> 7 of 12 · 5 hidden
assert.equal(context.recordStatusText(context.recordFloorPartition(warner.rows, 'open'), warner.rows.length), 'Showing 17 of 17 rows · nothing hidden by a filter'); // 2026-11-10 lens-hunt promotion: Showing 12 of 12 rows · nothing hidden by a filter -> Showing 17 of 17 rows · nothing hidden by a filter. 2026-10-23 five-lane merge: 10 -> 12
const text = context.ledgerText(warner, warner.rows);
const lines = text.split('\n');
assert.equal(lines[0].startsWith('Dr. Ben Warner — 17 documented surfaces of 3759'), true); // 2026-11-12 UK contract awards: of 2,371 -> of 3,759 surfaces. 2026-11-12 Bitter Struggle chain: of 2,340 -> of 2,371 surfaces. 2026-11-12 UK ministerial meetings: of 2,262 -> of 2,340 surfaces. 2026-11-10 hand-judged Form D filings: of 1,746 -> of 2,262 surfaces. 2026-11-10 Form D data sets: 1308 -> 1746 (of 1,308 -> of 1,746 surfaces). 2026-11-10 follow-up: of 1,307 -> of 1,308 surfaces. 2026-11-10 one-pass entry: of 1,160 -> of 1,307 surfaces. 2026-11-10 lens-hunt promotion: 12 of 1155 -> 17 of 1160.  2026-10-23 five-lane merge: '10 documented surfaces of 858' -> 12 of 1155
assert.equal(lines.filter(line => /^\d{2}\. /.test(line)).length, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
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
assert.equal(context.heroCountsText(surfaceGraph, hopGraph).edges, '308 admitted hops'); // 2026-11-12 owner ruling on hop bases ("Inherent and co-authorship"): 297 admitted hops -> 308 admitted hops. 2026-11-10 lens-hunt promotion: 280 admitted hops -> 297 admitted hops. 2026-10-23 final re-pin: 299 -> 280 (the five year-only a16z 2022 sessions are hop_eligible false, year_precision_only). 2026-10-23 five-lane merge: 133 -> 299
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
assert.equal(warnerTrajectory.dated.length, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
assert.equal(warnerTrajectory.undated.length, 0);
same(warnerTrajectory.dated.map(step => step.time_start), JSON.parse(JSON.stringify(warner.rows.map(row => row.time_start))), 'steps follow the date-sorted ledger rows');
same(warnerTrajectory.dated.map(step => step.class), ['capital', 'policy', 'policy', 'policy', 'policy', 'policy', 'policy', 'appointment', 'appointment', 'capital', 'policy', 'capital', 'capital', 'capital', 'policy', 'procurement', 'policy']); // 2026-11-10 lens-hunt promotion: + four SAGE policy steps (2020-03-18 to 2021-01-07) and the 2023-06-09 UKSA panel appointment.  2026-10-23 five-lane merge: two policy steps added (2025-07-07, 2026-07-29)
assert.equal(warnerTrajectory.line, 'First documented 2018-01-24 as employee role observation; latest 2026-07-29 as co author. Classes touched: capital, policy, appointment, procurement.'); // 2026-10-23 five-lane merge: latest 2026-07-08 as speaker -> 2026-07-29 as co author
const warnerStrip = context.recordTrajectoryMarkup(warnerTrajectory);
assert.match(warnerStrip, /^<section class="record-trajectory" id="record-trajectory"/);
assert.match(warnerStrip, /<span class="panel-label" id="record-trajectory-title">Trajectory<\/span>/);
assert.equal((warnerStrip.match(/<li class="trajectory-step trajectory-step--/g) ?? []).length, 17); // 2026-11-10 lens-hunt promotion: 12 -> 17. 2026-10-23 five-lane merge: 10 -> 12
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
