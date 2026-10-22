import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import {
  DENSE_ACTOR_ROWS,
  TIMELINE_CLUSTER_SLOTS,
  TIMELINE_DESKTOP_METRICS,
  TIMELINE_MAX_LANES,
  TIMELINE_MODEL_SCHEMA,
  TIMELINE_PHONE_METRICS,
  buildTimelineModel,
  defaultTimelineDomain,
  defaultTimelineLanes,
  entityLaneLayout,
  entityTimelineSummary,
  filterTimelineRows,
  layoutTimeline,
  rowInWindow,
  rowPrecision,
  timelineDay
} from '../src/visual-aperture-timeline.mjs';
import { dayIndex, isoFromDayIndex } from '../src/visual-aperture-core.mjs';

const surfaceGraph = JSON.parse(readFileSync('build/surface-graph.json', 'utf8'));
const hopGraph = JSON.parse(readFileSync('build/hop-graph.json', 'utf8'));
const source = readFileSync('src/visual-aperture-timeline.mjs', 'utf8');

// --- day helpers (core.mjs owns the day index; social-field.js's ecologyDay is not duplicated)
assert.equal(dayIndex('1970-01-02'), 1);
assert.equal(isoFromDayIndex(dayIndex('2026-08-12')), '2026-08-12');
assert.equal(isoFromDayIndex(timelineDay('2016')), '2016-01-01');
assert.equal(isoFromDayIndex(timelineDay('2016', true)), '2016-12-31');
assert.equal(isoFromDayIndex(timelineDay('2024-02', true)), '2024-02-29');
assert.equal(timelineDay(''), null);
assert.equal(timelineDay(null), null);
assert.equal(timelineDay('2024-02-31'), null);
assert.equal(rowPrecision('2016', '2016'), 'year');
assert.equal(rowPrecision('2024-02', '2024-02'), 'month');
assert.equal(rowPrecision('2025-06-13', ''), 'open');
assert.equal(rowPrecision('2025-06-13', null), 'open');
assert.equal(rowPrecision('', '2025-06-13'), 'undated');
assert.equal(rowPrecision('2025-06-13', '2025-06-13'), 'day');

// --- the module is pure: no DOM, no fetch, no scores, no temporal_envelope
assert.doesNotMatch(source, /\b(?:document|window|globalThis|navigator|localStorage)\.[A-Za-z_$]|\bfetch\s*\(|\bimport\s*\(/, 'no DOM, no fetch, no dynamic import');
assert.equal((source.match(/^import\s/gm) ?? []).length, 1, 'exactly one import statement, on one line, for the flattener');
assert.doesNotMatch(source, /\.temporal_envelope/, 'hop columns come from bases, never from the edge envelope');
assert.doesNotMatch(source, /machine_score|factory_score|deniability|laundry_score|recurrence_score|heat/);
assert.doesNotMatch(source, /data-ap-time-pair/);

// --- real-data model (SPEC j, fix d)
const model = buildTimelineModel(surfaceGraph, hopGraph);
assert.equal(model.schema_version, TIMELINE_MODEL_SCHEMA);
assert.equal(TIMELINE_MODEL_SCHEMA, 'clifford-timeline-model@1');
assert.equal(model.derived, true);
assert.equal(model.graph_effect, 'none');
assert.equal(DENSE_ACTOR_ROWS, 20);
assert.equal(TIMELINE_MAX_LANES, 18, '15 default People lanes plus three added before a default is dropped');
assert.equal(TIMELINE_CLUSTER_SLOTS, 6);

assert.equal(model.counts.rows, 286);
assert.equal(model.counts.actor_rows, 200);
assert.equal(model.counts.organization_rows, 86);
assert.deepEqual(model.counts.kinds, { day: 263, span: 20, year: 2, open: 1, undated: 0 });
assert.deepEqual(model.counts.actor_kinds, { day: 188, span: 11, year: 1, open: 0, undated: 0 });
assert.deepEqual(model.counts.organization_kinds, { day: 75, span: 9, year: 1, open: 1, undated: 0 });
assert.equal(model.counts.hop_bases, 95);
assert.equal(model.hopBases.length, 95);
assert.equal(model.counts.hop_day_surfaces, 19, '95 bases group into 19 (day, surface) objects');
assert.equal(model.hopDays.size, 19);
assert.equal(model.counts.hop_days, 18, 'over 18 distinct days');
assert.equal(model.counts.hop_bases_by_year['2025'], 28, 'fix (d): 28 bases dated 2025');
assert.equal(model.counts.dense_surfaces, 1);
assert.equal(model.counts.dense_rows, 113);
assert.equal(model.counts.refusal_reasons, 35);
assert.equal(model.counts.refusal_reasons_unrecorded, 5);
assert.equal(model.counts.surfaces_without_evidence_class, 10);
assert.equal(model.counts.duplicate_keys, 0);
assert.equal(model.rowsByKey.size, 286, 'row key surface_id::participant_type::entity_id is unique');
assert.ok(model.rows.every(row => row.key === `${row.surface_id}::${row.participant_type}::${row.entity_id}`));
assert.ok(model.rows.every(row => Array.isArray(row.receipt_ids) && row.receipt_ids.length > 0), 'every row keeps its receipts');
assert.ok(model.rows.every(row => typeof row.evidence_class === 'string'), 'every row keeps its evidence class');
assert.ok(model.hopBases.every(basis => basis.day != null && basis.end_day === basis.day), 'every basis is a dated single day');
assert.deepEqual(model.range, {
  first_day: '2016-01-01', last_day: '2026-08-12',
  first_day_index: dayIndex('2016-01-01'), last_day_index: dayIndex('2026-08-12'),
  distinct_start_days: 42,
  years_with_rows: ['2016', '2018', '2020', '2021', '2022', '2023', '2024', '2025', '2026']
});
assert.equal(model.lanes.actor.size, 163);
assert.equal(model.lanes.organization.size, 27);
assert.equal(model.lanes.type.size, 14);
assert.equal(model.lanes.surface.size, 54);

// Year precision and the one open-ended row are handled as the design says.
const yearRows = model.rows.filter(row => row.kind === 'year');
assert.deepEqual(yearRows.map(row => row.entity_id).sort(), ['dominic-cummings', 'vote-leave']);
for (const row of yearRows) {
  assert.equal(row.precision, 'year');
  assert.equal(isoFromDayIndex(row.start_day), '2016-01-01');
  assert.equal(isoFromDayIndex(row.end_day), '2016-12-31');
}
const openRow = model.rows.find(row => row.kind === 'open');
assert.equal(openRow.key, 'detachment-201-program-context-2025::organization::us-army');
assert.equal(openRow.precision, 'open');
assert.equal(openRow.end_day, null);
assert.equal(openRow.time_end, '');

// Refusal reasons: ledger reason wins, the compiler's generic reason is marked unrecorded.
assert.deepEqual(model.refusalReasons.get('ben-warner-no10-digital-data-role-observation-2020-2021'), { reason: 'broad_institution_context_only', reason_recorded: true });
assert.deepEqual(model.refusalReasons.get('electric-twin-ben-warner-director-tenure-2023-09-28'), { reason: 'surface_not_hop_eligible', reason_recorded: false });
const unrecordedRow = model.rowsByKey.get('electric-twin-ben-warner-director-tenure-2023-09-28::actor::ben-warner');
assert.equal(unrecordedRow.reason_recorded, false);
assert.equal(unrecordedRow.surface_hop_eligible, false);
assert.equal(unrecordedRow.kind, 'span');

// Ben Warner lane (fix d: electric-twin 6; 7 official and 3 primary_public).
const benWarner = model.lanes.actor.get('ben-warner');
assert.equal(benWarner.row_count, 10);
assert.equal(benWarner.surface_count, 10);
assert.equal(benWarner.hop_eligible_surface_count, 6);
assert.equal(benWarner.first_day, '2018-01-24');
assert.equal(benWarner.last_day, '2026-08-11');
assert.deepEqual(benWarner.evidence_counts, { official: 7, primary_public: 3 });
assert.equal(benWarner.co_organization_counts['electric-twin'], 6);
assert.equal(benWarner.co_organization_counts['no-10'], 2);
assert.equal(benWarner.hop_basis_count, 12);
assert.deepEqual(benWarner.kind_counts, { day: 8, span: 2 });
assert.deepEqual(
  benWarner.rows.map(row => `${row.kind}:${row.time_start}..${row.time_end}`),
  ['day:2018-01-24..2018-01-24', 'day:2020-03-08..2020-03-08', 'span:2020-03-13..2021-05-13', 'span:2023-09-28..2026-08-11',
    'day:2023-09-28..2023-09-28', 'day:2025-08-05..2025-08-05', 'day:2025-09-12..2025-09-12', 'day:2025-09-27..2025-09-27',
    'day:2026-02-11..2026-02-11', 'day:2026-07-08..2026-07-08']
);
const electricTwin = model.lanes.organization.get('electric-twin');
assert.equal(electricTwin.row_count, 18);
assert.equal(electricTwin.kind_counts.span, 5, 'fix (d): electric-twin 5 spans');
assert.equal(electricTwin.first_day, '2023-09-28');
assert.equal(electricTwin.last_day, '2026-08-12');

// The Dialog roster: exactly one dense object, 112 listed names, 2 documented elsewhere.
assert.equal(model.dense.length, 1);
const dialog = model.dense[0];
assert.equal(dialog.surface_id, 'dialog-public-directory-exposure-2026-06-16');
assert.equal(dialog.listed_count, 112);
assert.equal(dialog.row_count, 113);
assert.equal(dialog.member_keys.length, 113);
assert.equal(dialog.iso_day, '2026-06-16');
assert.deepEqual(dialog.evidence_counts, { primary_public: 112, reported: 1 });
assert.equal(dialog.refusal_reason, 'dense_directory_listing_not_shared_participation');
assert.equal(dialog.hop_eligible, false);
assert.equal(dialog.receipt_ids.length, 3);
assert.deepEqual(dialog.elsewhere.map(entry => [entry.actor_id, entry.other_surface_count]), [['matt-clifford', 8], ['dan-driscoll', 1]]);
assert.equal(dialog.nowhere_else_count, 110);

// --- default lanes (fix a: first_day then label)
const actorLanes = defaultTimelineLanes(model, 'actor');
assert.deepEqual(actorLanes.lanes.map(lane => lane.id), [
  'dominic-cummings', 'ben-warner', 'marc-warner', 'saul-klein', 'matt-clifford', 'simon-case', 'alex-cooper',
  'fiona-hill', 'george-robertson', 'john-healey', 'keir-starmer', 'richard-barrons',
  'rich-drake', 'michael-muthukrishna', 'dan-driscoll'
]);
assert.deepEqual(actorLanes.lanes.map(lane => lane.row_count), [2, 10, 2, 2, 9, 3, 5, 2, 2, 4, 2, 2, 3, 2, 2], '52 rows on the 15 named lanes');
assert.ok(actorLanes.lanes.slice(7, 12).every(lane => lane.first_day === '2024-07-17'), 'the five SDR actors tie on first day and order by label');
assert.equal(actorLanes.strip.row_count, 38);
assert.equal(actorLanes.strip.entity_count, 38);
assert.equal(actorLanes.strip.label, 'People documented on one surface');
assert.equal(actorLanes.blocks.length, 1);
const organizationLanes = defaultTimelineLanes(model, 'organization');
assert.equal(organizationLanes.lanes.length, 14);
assert.equal(organizationLanes.lanes.reduce((sum, lane) => sum + lane.row_count, 0), 73);
assert.equal(organizationLanes.strip.row_count, 13);
assert.equal(organizationLanes.blocks.length, 0);
assert.equal(defaultTimelineLanes(model, 'organization', { order: 'surface_count' }).lanes[0].id, 'electric-twin');
const typeLanes = defaultTimelineLanes(model, 'type');
assert.equal(typeLanes.lanes.length, 14);
assert.equal(typeLanes.lanes.reduce((sum, lane) => sum + lane.row_count, 0), 54, 'type lanes hold surfaces, not participation rows');
assert.equal(typeLanes.strip.row_count, 0);
const pinnedLanes = defaultTimelineLanes(model, 'actor', { laneIds: ['ben-warner', 'nobody', 'marc-warner', 'ben-warner'] });
assert.deepEqual(pinnedLanes.lanes.map(lane => lane.id), ['ben-warner', 'marc-warner']);
assert.equal(pinnedLanes.pinned, true);
assert.equal(pinnedLanes.strip.row_count, 200 - 10 - 2 - 112, 'the strip holds every other actor row; dense rows stay in the block unless the actor has a lane');
assert.equal(defaultTimelineLanes(model, 'actor', { laneIds: [...model.lanes.actor.keys()].slice(0, 20) }).lanes.length, 18, 'at most 18 named lanes');
assert.equal(defaultTimelineLanes(model, 'actor', { laneIds: ['auren-hoffman', ...actorLanes.lanes.map(lane => lane.id)] }).lanes.length, 16, 'adding one lane to the 15 defaults drops none of them');

// --- default domain by row share
assert.deepEqual(defaultTimelineDomain(model, 690), { from: '2023-01-01', to: '2026-09-11', from_day: dayIndex('2023-01-01'), to_day: dayIndex('2026-09-11'), auto: true, share: 0.92, threshold: 0.85 });
assert.equal(defaultTimelineDomain(model, 880).from, '2023-01-01');
assert.deepEqual(defaultTimelineDomain(model, 216), { from: '2025-01-01', to: '2026-09-11', from_day: dayIndex('2025-01-01'), to_day: dayIndex('2026-09-11'), auto: true, share: 0.738, threshold: 0.7 });

// --- filters
assert.equal(filterTimelineRows(model.rows, { hop: 'hop' }).length + filterTimelineRows(model.rows, { hop: 'context' }).length, 286);
assert.ok(filterTimelineRows(model.rows, { hop: 'hop' }).every(row => row.surface_hop_eligible));
assert.ok(filterTimelineRows(model.rows, { evidenceFloor: 'official' }).every(row => row.evidence_class === 'official'));
assert.equal(filterTimelineRows(model.rows, { evidenceFloor: 'official' }).length, 136);

// --- layout: desktop (690 and 880 plot widths) and phone (216)
function checkColumns(layout) {
  const laneById = new Map(layout.lanes.map(lane => [lane.id, lane]));
  const markByKey = new Map(layout.marks.map(mark => [mark.key, mark]));
  for (const column of layout.columns) {
    assert.ok(column.segments.length >= 1);
    assert.ok(column.basis_count >= 1);
    assert.ok(column.receipt_ids.length >= 1);
    assert.equal(column.hop_eligible, true);
    for (const key of column.mark_keys) assert.equal(markByKey.get(key).surface_id, column.surface_id, 'a column touches marks of ONE surface only');
    for (const segment of column.segments) {
      const lane = laneById.get(segment.laneId);
      assert.notEqual(lane.kind, 'block');
      for (const key of segment.mark_keys) {
        const mark = markByKey.get(key);
        assert.equal(mark.laneId, segment.laneId);
        assert.equal(mark.surface_id, column.surface_id);
        assert.ok(mark.y >= segment.y1 && mark.y + mark.h <= segment.y2);
        assert.ok(column.actor_ids.includes(mark.entity_id), 'a segment touches only people on that surface');
      }
      if (lane.kind === 'entity') assert.ok(column.actor_ids.includes(lane.entity_id), 'no column touches a lane whose actor is not on that surface');
    }
    const expectedKeys = layout.marks
      .filter(mark => mark.surface_id === column.surface_id && mark.start_day <= column.day && (mark.kind === 'open' || (mark.end_day ?? mark.start_day) >= column.day))
      .map(mark => mark.key).sort();
    assert.deepEqual([...column.mark_keys].sort(), expectedKeys, 'every drawn mark of that surface on that day is touched, and nothing else');
  }
}
function checkMarks(layout, minWidth) {
  for (const mark of layout.marks) {
    assert.ok(mark.w >= minWidth, `mark ${mark.key} width ${mark.w}`);
    assert.ok(mark.x >= layout.plotLeft - 1e-9 && mark.x + mark.w <= layout.plotLeft + layout.plotWidth + layout.metrics.slotOffset * 2 + layout.metrics.markWidth + 1e-9, `mark ${mark.key} inside the plot`);
    assert.ok(model.rowsByKey.has(mark.key), 'every mark is one ledger row');
    assert.ok(typeof mark.evidence_class === 'string');
    assert.ok(typeof mark.hop_eligible === 'boolean');
    assert.ok(mark.receipt_ids.length >= 1);
    assert.ok(mark.surface_id);
    assert.ok(mark.slot < mark.stack && mark.stack <= TIMELINE_CLUSTER_SLOTS);
    const lane = layout.lanes.find(candidate => candidate.id === mark.laneId);
    assert.ok(mark.y >= lane.y && mark.y + mark.h <= lane.y + lane.height, 'a mark stays inside its lane');
  }
  assert.equal(new Set(layout.marks.map(mark => mark.key)).size, layout.marks.length, 'no row is drawn twice');
  for (const lane of layout.lanes) {
    const ticks = layout.marks.filter(mark => mark.laneId === lane.id && mark.kind === 'day').sort((a, b) => a.x - b.x);
    for (let index = 1; index < ticks.length; index += 1) {
      if (ticks[index].clusterId === ticks[index - 1].clusterId) continue;
      assert.ok(ticks[index].x - ticks[index - 1].x >= layout.metrics.markWidth, `unstacked ticks never overlap: ${ticks[index - 1].key} / ${ticks[index].key}`);
    }
  }
  assert.ok(!('lines' in layout));
}
// Counts name their denominator and every filter says what it hid: each
// candidate row of the grouping is drawn once (mark, +N or block member) or
// sits in exactly one hidden list.
function checkAccounting(layout, sourceModel = model) {
  const c = layout.counts;
  assert.equal(c.rows_in_view + c.filtered + c.pre_domain + c.post_domain + c.undated, c.candidate_rows, 'in view + hidden = candidate rows');
  assert.equal(c.candidate_rows + c.rows_outside_grouping, c.total_rows, 'candidates + rows outside the grouping = the denominator');
  assert.ok(c.in_window <= c.rows_in_view);
  if (!layout.window.active) assert.equal(c.in_window, c.rows_in_view);
  assert.ok(c.pre_domain_overlapping <= c.pre_domain, 'overlapping rows are a subset of the pre-domain rows');
  const viewKeys = new Set([
    ...layout.marks.map(mark => mark.key),
    ...layout.aggregates.flatMap(aggregate => aggregate.hidden_keys),
    ...layout.blocks.flatMap(block => block.visible_member_keys)
  ]);
  assert.equal(viewKeys.size, c.rows_in_view, 'rows in view are unique row keys, never a mark plus a block member twice');
  const hiddenLists = ['filtered', 'pre_domain', 'post_domain', 'undated'];
  const hiddenKeys = hiddenLists.flatMap(name => layout.hidden[name]);
  assert.equal(new Set(hiddenKeys).size, hiddenKeys.length, 'hidden lists are unique and disjoint');
  for (const key of hiddenKeys) assert.ok(!viewKeys.has(key), `${key} is hidden and drawn at once`);
  for (const key of layout.hidden.pre_domain_overlapping) assert.ok(layout.hidden.pre_domain.includes(key));
  assert.equal(c.filtered, layout.hidden.filtered.length);
  assert.equal(c.pre_domain, layout.hidden.pre_domain.length);
  assert.equal(c.post_domain, layout.hidden.post_domain.length);
  assert.equal(c.undated, layout.hidden.undated.length);
  for (const block of layout.blocks) {
    assert.ok(block.visible_row_count >= 1, 'a block is drawn only when at least one member passes the filters');
    assert.equal(block.visible_member_keys.length, block.visible_row_count);
    assert.equal(block.visible_row_count + block.filtered_count, block.row_count);
    const members = block.member_keys.map(key => sourceModel.rowsByKey.get(key));
    assert.deepEqual(filterTimelineRows(members, layout.filters).map(row => row.key).sort(), [...block.visible_member_keys].sort(), 'block members pass the same filters as every other row');
    for (const key of block.filtered_member_keys) assert.ok(layout.hidden.filtered.includes(key) || viewKeys.has(key), 'a dropped member is listed as filtered unless its own lane draws it');
    assert.ok(block.in_window_count <= block.visible_row_count);
  }
  for (const aggregate of layout.aggregates) {
    assert.equal(Object.values(aggregate.evidence_counts).reduce((sum, value) => sum + value, 0), aggregate.count, 'a +N carries the evidence classes of the rows it hides');
    assert.ok(aggregate.hop_eligible_count <= aggregate.count);
    assert.ok(aggregate.in_window_count <= aggregate.count);
  }
  for (const column of layout.columns) {
    assert.deepEqual([...new Set(column.pairs.flatMap(pair => [pair.actor_a, pair.actor_b]))].sort(), column.actor_ids, 'column actors are the actors of the bases that pass the floor');
    assert.equal(Object.values(column.evidence_counts).reduce((sum, value) => sum + value, 0), column.basis_count);
    assert.ok(column.basis_count <= column.total_basis_count);
  }
}

for (const plotWidth of [690, 880]) {
  const layout = layoutTimeline(model, { plotWidth });
  assert.equal(layout.by, 'actor');
  assert.equal(layout.domain.from, '2023-01-01');
  assert.equal(layout.domain.to, '2026-09-11');
  assert.equal(layout.domain.auto, true);
  assert.equal(layout.counts.named_lanes, 15);
  assert.equal(layout.counts.strip_rows, 38);
  assert.equal(layout.counts.marks, 79, 'desktop: 41 lane + 36 strip + 2 personal Dialog marks');
  assert.equal(layout.counts.blocks, 1);
  assert.equal(layout.counts.drawn, 80, `SPEC (j): 80 marks at plot width ${plotWidth}`);
  assert.equal(layout.counts.columns, 16, `SPEC (j): 16 columns at plot width ${plotWidth}`);
  assert.equal(layout.counts.aggregates, 0);
  assert.equal(layout.counts.pre_domain, 11);
  assert.equal(layout.counts.post_domain, 0);
  assert.equal(layout.counts.undated, 0);
  assert.equal(layout.counts.filtered, 0);
  assert.equal(layout.counts.total_rows, 286);
  assert.equal(layout.counts.candidate_rows, 201, '200 actor rows plus the Dialog organization row carried by the block');
  assert.equal(layout.counts.rows_outside_grouping, 85, 'the other organization rows are not part of a People view');
  assert.equal(layout.counts.rows_in_view, 190, '79 marks + 113 block members, the two cross-referenced Dialog rows counted once');
  assert.equal(layout.counts.in_window, 190);
  assert.equal(layout.counts.block_visible_rows, 113);
  assert.deepEqual(layout.hidden.pre_domain_overlapping, ['simon-case-cabinet-secretary-2020-2024::actor::simon-case'], 'a tenure span that began before the domain and is active inside it is flagged, not called pre-domain');
  assert.equal(layout.counts.pre_domain_overlapping, 1);
  assert.equal(layout.counts.max_named_stack, 2);
  assert.equal(layout.counts.max_strip_stack, 6);
  checkAccounting(layout);
  assert.equal(layout.lanes.length, 17);
  assert.equal(layout.lanes.find(lane => lane.kind === 'strip').height, 68);
  assert.equal(layout.lanes.find(lane => lane.kind === 'block').height, 32);
  assert.ok(layout.lanes.filter(lane => lane.kind === 'entity').every(lane => lane.height === 28));
  assert.equal(layout.height, 15 * 28 + 68 + 32);
  assert.ok(layout.height <= 650 - 36 - 40, 'the default desktop stage fits the 650px budget');
  assert.deepEqual(layout.axisTicks.filter(tick => tick.kind === 'year').map(tick => tick.label), ['2023', '2024', '2025', '2026']);
  checkMarks(layout, 4);
  checkColumns(layout);
  assert.deepEqual(layout.columns.map(column => column.iso_day), [
    '2023-09-07', '2023-09-28', '2023-11-02', '2024-07-17', '2024-07-31', '2024-10-10', '2025-01-13', '2025-03-06',
    '2025-06-13', '2025-08-05', '2025-12-08', '2026-02-11', '2026-02-11', '2026-04-27', '2026-06-10', '2026-07-08'
  ]);
  const sdr = layout.columns.find(column => column.iso_day === '2024-07-17');
  assert.equal(sdr.surface_id, 'strategic-defence-review-2024-2025');
  assert.equal(sdr.basis_count, 10);
  assert.deepEqual(sdr.actor_ids, ['fiona-hill', 'george-robertson', 'john-healey', 'keir-starmer', 'richard-barrons']);
  assert.deepEqual(sdr.segments.map(segment => segment.laneId), ['fiona-hill', 'george-robertson', 'john-healey', 'keir-starmer', 'richard-barrons'], 'per-lane segments (fix b)');
  const block = layout.blocks[0];
  assert.equal(block.listed_count, 112);
  assert.equal(block.surface_id, dialog.surface_id);
  assert.equal(block.member_keys.length, 113);
  assert.equal(block.visible_row_count, 113);
  assert.equal(block.visible_listed_count, 112);
  assert.equal(block.filtered_count, 0);
  assert.equal(block.hop_eligible, false);
  assert.equal(layout.lanes.find(lane => lane.kind === 'block').visible_row_count, 113);
  assert.deepEqual(block.elsewhere.map(entry => entry.actor_id), ['matt-clifford', 'dan-driscoll']);
  assert.equal(layout.marks.filter(mark => mark.surface_id === dialog.surface_id).length, 2, 'only the two cross-referenced people get personal Dialog marks');
  assert.ok(layout.marks.filter(mark => mark.surface_id === dialog.surface_id).every(mark => ['matt-clifford', 'dan-driscoll'].includes(mark.entity_id)));
  assert.ok(layout.overview.ticks.filter(tick => tick.kind === 'row').length === 286);
  assert.equal(layout.overview.ticks.filter(tick => tick.kind === 'hop').length, 19);
  assert.equal(layout.overview.ticks.filter(tick => tick.kind === 'dense').length, 1);
  assert.equal(layout.overview.from, '2016-01-01');
  assert.equal(layout.overview.to, '2026-09-11');
  // Same-day different-surface marks shift by the slot offset so each column stays over its own marks.
  const warnerDay = layout.marks.filter(mark => mark.entity_id === 'ben-warner' && mark.iso_start === '2023-09-28').sort((a, b) => a.surface_id < b.surface_id ? -1 : 1);
  assert.equal(warnerDay.length, 2);
  assert.equal(warnerDay[1].x - warnerDay[0].x, TIMELINE_DESKTOP_METRICS.slotOffset);
  assert.equal(warnerDay[0].clusterId, warnerDay[1].clusterId, 'the tick and the span starting on one day stack');
  assert.notEqual(warnerDay[0].slot, warnerDay[1].slot);
}

const phone = layoutTimeline(model, { plotWidth: 216, ...TIMELINE_PHONE_METRICS });
assert.equal(phone.domain.from, '2025-01-01');
assert.equal(phone.domain.to, '2026-09-11');
assert.equal(phone.counts.marks, 48);
assert.equal(phone.counts.blocks, 1);
assert.equal(phone.counts.drawn, 49, 'SPEC (j): 49 marks on phone');
assert.equal(phone.counts.columns, 10, 'SPEC (j): 10 columns on phone');
assert.equal(phone.counts.pre_domain, 42);
assert.equal(phone.counts.pre_domain_overlapping, 8, 'the 2023-2024 tenure and SDR spans are still active in the 2025 domain');
assert.equal(phone.counts.rows_in_view, 159, '48 marks + 113 block members - 2 counted once');
assert.equal(phone.counts.candidate_rows, 201);
checkAccounting(phone);
assert.ok(phone.lanes.every(lane => lane.height <= 56));
assert.equal(phone.lanes.find(lane => lane.kind === 'strip').height, 56);
assert.equal(phone.lanes.find(lane => lane.kind === 'block').height, 28);
assert.equal(phone.height, 15 * 24 + 56 + 28);
assert.ok(phone.height <= 510 - 30 - 34, 'the default phone stage fits without inner scroll');
checkMarks(phone, 3);
checkColumns(phone);
const warnerSeptember = phone.marks.filter(mark => mark.entity_id === 'ben-warner' && ['2025-09-12', '2025-09-27'].includes(mark.iso_start));
assert.equal(warnerSeptember.length, 2);
assert.ok(warnerSeptember[1].x - warnerSeptember[0].x > 2, '15 days apart stay at distinct x positions at 216px');
assert.equal(warnerSeptember[0].clusterId, warnerSeptember[1].clusterId, 'the +3px surface offset would make them overlap, so they stack instead');
assert.notEqual(warnerSeptember[0].slot, warnerSeptember[1].slot);
const driscollJune = phone.marks.filter(mark => mark.entity_id === 'dan-driscoll').sort((a, b) => a.x - b.x);
assert.equal(driscollJune.length, 2);
assert.ok(driscollJune[1].x - driscollJune[0].x >= TIMELINE_PHONE_METRICS.markWidth || driscollJune[0].clusterId === driscollJune[1].clusterId,
  '6 days apart at 216px: either side by side without overlap or stacked, never overlapping');

// Organizations and surface types never gain a column; the type view hatches the 10 unrecorded classes.
const organizationLayout = layoutTimeline(model, { by: 'organization', plotWidth: 690 });
assert.equal(organizationLayout.counts.named_lanes, 14);
assert.equal(organizationLayout.counts.strip_rows, 13);
assert.equal(organizationLayout.counts.columns, 0);
assert.equal(organizationLayout.counts.blocks, 0);
assert.equal(organizationLayout.counts.marks + organizationLayout.counts.pre_domain, 86);
assert.equal(organizationLayout.counts.candidate_rows, 86);
assert.equal(organizationLayout.counts.rows_outside_grouping, 200, 'actor rows are not part of an Organizations view');
assert.deepEqual(organizationLayout.hidden.pre_domain_overlapping, ['simon-case-cabinet-secretary-2020-2024::organization::cabinet-office']);
checkAccounting(organizationLayout);
const typeLayout = layoutTimeline(model, { by: 'type', plotWidth: 690, domainFrom: '2016-01-01', domainTo: '2026-09-11' });
assert.equal(typeLayout.counts.named_lanes, 14);
assert.equal(typeLayout.counts.marks, 54);
assert.equal(typeLayout.counts.total_rows, 54, 'the surface-type view counts surfaces');
assert.equal(typeLayout.counts.rows_in_view, 54);
checkAccounting(typeLayout);
assert.equal(typeLayout.counts.columns, 0);
assert.equal(typeLayout.marks.filter(mark => !mark.evidence_recorded).length, 10);
assert.ok(typeLayout.marks.filter(mark => !mark.evidence_recorded).every(mark => mark.evidence_class === null));
assert.ok(typeLayout.marks.every(mark => mark.key.startsWith('surface::')));

// Full range: the marc-warner|saul-klein edge yields two columns and nothing spans the gap between them.
const fullRange = layoutTimeline(model, { plotWidth: 690, domainFrom: '2016-01-01', domainTo: '2026-09-11' });
assert.equal(fullRange.counts.columns, 19);
assert.equal(fullRange.counts.pre_domain, 0);
const faculty = fullRange.columns.filter(column => column.actor_ids.includes('marc-warner') && column.actor_ids.includes('saul-klein'));
assert.deepEqual(faculty.map(column => column.iso_day), ['2018-01-24', '2024-10-10']);
assert.ok(fullRange.marks.filter(mark => ['marc-warner', 'saul-klein'].includes(mark.entity_id)).every(mark => mark.kind === 'day'), 'no mark spans 2019-2023 for them');
const yearMark = fullRange.marks.find(mark => mark.key === 'vote-leave-data-science-2016::actor::dominic-cummings');
assert.equal(yearMark.kind, 'year');
assert.equal(yearMark.iso_start, '2016-01-01');
assert.equal(yearMark.iso_end, '2016-12-31');
assert.ok(yearMark.w > 60, 'a year-precision row is a bar across the whole year, not a tick');
const openMark = layoutTimeline(model, { by: 'organization', plotWidth: 690 }).marks.find(mark => mark.kind === 'open');
assert.equal(openMark.entity_id, 'us-army');
assert.equal(openMark.clipped_end, true);
assert.ok(openMark.w > 100, 'the open-ended row runs to the domain edge');
assert.ok(fullRange.counts.aggregates >= 1, 'at 0.18 px/day the strip clusters past six slots and collapses into +N');
assert.equal(fullRange.counts.marks + fullRange.counts.aggregated_rows, 52 + 38, 'collapsed rows are still counted: 52 named-lane rows + 38 strip rows');
assert.equal(fullRange.counts.rows_in_view, 201, 'the whole People view: 90 lane rows + 113 block members - 2 counted once');
assert.equal(fullRange.counts.pre_domain_overlapping, 0);
checkAccounting(fullRange);

// Window (fix e): out-of-window marks are dimmed, never removed; status counts name the denominator.
const windowed = layoutTimeline(model, { plotWidth: 690, windowFrom: '2025-01-01', windowTo: '2025-12-31' });
assert.equal(windowed.window.active, true);
assert.equal(windowed.counts.marks, 79, 'the window removes nothing');
assert.equal(windowed.marks.filter(mark => mark.in_window).length, 32);
assert.equal(windowed.marks.filter(mark => !mark.in_window).length, 47);
assert.equal(windowed.counts.in_window, 32);
assert.equal(windowed.counts.rows_in_view, 190);
assert.equal(windowed.blocks[0].in_window, false);
assert.equal(windowed.blocks[0].in_window_count, 0);
checkAccounting(windowed);
assert.ok(windowed.marks.find(mark => mark.key === 'electric-twin-ben-warner-director-tenure-2023-09-28::actor::ben-warner').in_window, 'a span covering the window is in it');
assert.equal(layoutTimeline(model, { plotWidth: 690 }).window.active, false);

// Hop and evidence filters remove rows and say how many: the dense block's
// members go through the same filters and are counted when they drop.
const dialogMemberKeys = [...dialog.member_keys].sort();
const hopOnly = layoutTimeline(model, { plotWidth: 690, hop: 'hop' });
assert.ok(hopOnly.marks.every(mark => mark.hop_eligible));
assert.equal(hopOnly.counts.columns, 16);
assert.equal(hopOnly.counts.blocks, 0, 'the Dialog roster is context-only');
assert.equal(hopOnly.counts.marks, 56);
assert.equal(hopOnly.counts.rows_in_view, 56);
assert.equal(hopOnly.counts.filtered, 137, '24 context rows on lanes + the 113 Dialog rows, the two cross-referenced rows counted once');
assert.equal(hopOnly.counts.pre_domain, 8);
assert.ok(dialogMemberKeys.every(key => hopOnly.hidden.filtered.includes(key)), 'every roster member the hop filter hides is listed');
checkAccounting(hopOnly);
const contextOnly = layoutTimeline(model, { plotWidth: 690, hop: 'context' });
assert.ok(contextOnly.marks.every(mark => !mark.hop_eligible));
assert.equal(contextOnly.counts.columns, 0);
assert.equal(contextOnly.counts.blocks, 1);
assert.equal(contextOnly.counts.marks, 23);
assert.equal(contextOnly.counts.rows_in_view, 134, '23 marks + 113 block members - 2 counted once');
assert.equal(contextOnly.counts.filtered, 64);
checkAccounting(contextOnly);
assert.equal(hopOnly.counts.marks + contextOnly.counts.marks, 79);
assert.equal(hopOnly.counts.filtered + contextOnly.counts.filtered, 201, 'hop and context filters partition the People view');
const officialOnly = layoutTimeline(model, { plotWidth: 690, evidenceFloor: 'official' });
assert.ok(officialOnly.marks.every(mark => mark.evidence_class === 'official'));
assert.ok(officialOnly.counts.columns < 16, 'primary_public bases drop below the official floor');
assert.equal(officialOnly.counts.columns, 12);
assert.equal(officialOnly.counts.blocks, 0, 'no Dialog row is official (112 primary_public, 1 reported), so the block is not drawn');
assert.equal(officialOnly.counts.marks, 59);
assert.equal(officialOnly.counts.rows_in_view, 59);
assert.equal(officialOnly.counts.filtered, 132);
assert.equal(officialOnly.counts.pre_domain, 10);
assert.ok(dialogMemberKeys.every(key => officialOnly.hidden.filtered.includes(key)), 'every roster member below the floor is listed');
assert.ok(!officialOnly.marks.some(mark => mark.surface_id === dialog.surface_id));
checkAccounting(officialOnly);
for (const column of officialOnly.columns) assert.ok(column.pairs.every(pair => pair.evidence_class === 'official'));
const primaryPublic = layoutTimeline(model, { plotWidth: 690, evidenceFloor: 'primary_public' });
assert.equal(primaryPublic.counts.blocks, 1);
assert.equal(primaryPublic.blocks[0].visible_row_count, 112, 'the one reported row drops below the primary_public floor');
assert.equal(primaryPublic.blocks[0].visible_listed_count, 111, 'that row is a listed name; the organization row is primary_public');
assert.equal(primaryPublic.blocks[0].filtered_count, 1);
assert.deepEqual(primaryPublic.blocks[0].filtered_member_keys, [`${dialog.surface_id}::actor::alexus-grynkewich`]);
assert.ok(primaryPublic.hidden.filtered.includes(`${dialog.surface_id}::actor::alexus-grynkewich`));
assert.equal(primaryPublic.counts.filtered, 5);
assert.equal(primaryPublic.counts.rows_in_view, 185);
checkAccounting(primaryPublic);
// A year chip puts the roster day outside the domain: its rows are listed as post-domain, not lost.
const year2024 = layoutTimeline(model, { plotWidth: 690, domainFrom: '2024-01-01', domainTo: '2024-12-31' });
assert.equal(year2024.counts.blocks, 0);
assert.equal(year2024.counts.marks, 16);
assert.equal(year2024.counts.columns, 3);
assert.equal(year2024.counts.pre_domain, 26);
assert.equal(year2024.counts.post_domain, 159);
assert.ok(dialogMemberKeys.every(key => year2024.hidden.post_domain.includes(key)));
assert.deepEqual(year2024.hidden.pre_domain_overlapping, [
  'electric-twin-ben-warner-director-tenure-2023-09-28::actor::ben-warner',
  'simon-case-cabinet-secretary-2020-2024::actor::simon-case',
  'electric-twin-alex-cooper-director-tenure-2023-09-28::actor::alex-cooper'
], 'spans active in 2024 that began earlier are flagged for the status text');
checkAccounting(year2024);
const pinnedLayout = layoutTimeline(model, { plotWidth: 690, laneIds: ['ben-warner'], hop: 'hop', evidenceFloor: 'official' });
assert.equal(pinnedLayout.counts.candidate_rows, 201, 'pinned lanes: the strip carries every other actor row, the block its roster');
checkAccounting(pinnedLayout);

// --- entity summaries and the single-lane layout the entity pages reuse
const summary = entityTimelineSummary(model, 'actor', 'ben-warner');
assert.equal(summary.row_count, 10);
assert.equal(summary.surface_count, 10);
assert.equal(summary.hop_eligible_surface_count, 6);
assert.equal(summary.context_surface_count, 4);
assert.equal(summary.rows[0].time_start, '2018-01-24');
assert.equal(summary.rows.at(-1).time_start, '2026-07-08', 'rows are date-sorted, not ledger-ordered');
assert.equal(summary.receipt_ids.length, 14);
assert.equal(entityTimelineSummary(model, 'actor', 'nobody'), null);
assert.equal(entityTimelineSummary(model, 'organization', 'electric-twin').kind_counts.span, 5);
assert.equal(entityTimelineSummary(model, 'surface', dialog.surface_id).row_count, 113);
const lane = entityLaneLayout(model, 'actor', 'ben-warner', { plotWidth: 600 });
assert.equal(lane.lanes.length, 1);
assert.equal(lane.counts.marks, 10);
assert.equal(lane.counts.columns, 0);
assert.equal(lane.counts.blocks, 0);
assert.equal(lane.domain.from, '2016-01-01');
assert.equal(lane.domain.to, '2026-09-11');
assert.equal(lane.height, 28);
checkAccounting(lane);
assert.equal(lane.counts.candidate_rows, 10, 'a single-lane layout considers that lane only');
const orgLane = entityLaneLayout(model, 'organization', 'electric-twin', { plotWidth: 600 });
assert.equal(orgLane.counts.marks + orgLane.counts.aggregated_rows, 18, 'at 0.15 px/day the 2026 rows chain past six slots into a +N aggregate');
assert.equal(orgLane.counts.rows_in_view, 18);
checkAccounting(orgLane);
assert.equal(orgLane.marks.filter(mark => mark.kind === 'span').length, 5);
assert.equal(entityLaneLayout(model, 'organization', 'electric-twin', { plotWidth: 1400 }).counts.marks, 18, 'wide enough, every row is its own mark');
const dialogLane = entityLaneLayout(model, 'surface', dialog.surface_id, { plotWidth: 600 });
assert.equal(dialogLane.lanes.length, 1);
assert.equal(dialogLane.counts.marks, TIMELINE_CLUSTER_SLOTS - 1, '113 rows on one day: five drawn, the rest collapse into +N');
assert.equal(dialogLane.counts.aggregates, 1);
assert.equal(dialogLane.aggregates[0].count, 113 - (TIMELINE_CLUSTER_SLOTS - 1));
assert.equal(dialogLane.counts.marks + dialogLane.counts.aggregated_rows, 113);
assert.equal(dialogLane.counts.rows_in_view, 113);
assert.deepEqual(dialogLane.aggregates[0].evidence_counts, { primary_public: 108 }, 'the +N says which evidence classes it hides');
assert.ok(dialogLane.marks.some(mark => mark.evidence_class === 'reported'), 'the one reported row sorts into the drawn slots by key');
checkAccounting(dialogLane);
assert.equal(dialogLane.lanes[0].height, 8 + 10 * TIMELINE_CLUSTER_SLOTS);

// --- synthetic fixture: undated, month, open, year, dense and two surfaces on one day
const fixtureActors = ['a', 'b', 'c', 'd', ...Array.from({ length: 21 }, (_, index) => `r${index + 1}`)].map(id => ({ id, label: id.toUpperCase() }));
const participant = (surface_id, actor_id, time_start, time_end, evidence_class = 'official') => ({ surface_id, participant_type: 'actor', actor_id, role: 'Member', participation_type: 'member', time_start, time_end, evidence_class, receipt_ids: [`r-${surface_id}`] });
const fixture = {
  actors: fixtureActors,
  organizations: [{ id: 'org', label: 'Org' }],
  surfaces: [
    { surface_id: 's-day', surface_label: 'Day surface', surface_type: 'board_surface', hop_eligible: true, time_start: '2024-05-01', time_end: '2024-05-01', receipt_ids: ['r-s-day'],
      participants: [participant('s-day', 'a', '2024-05-01', '2024-05-01'), participant('s-day', 'b', '2024-05-01', '2024-05-01'), { surface_id: 's-day', participant_type: 'organization', organization_id: 'org', role: 'Venue', participation_type: 'venue', time_start: '2024-05-01', time_end: '2024-05-01', evidence_class: 'official', receipt_ids: [] }] },
    { surface_id: 's-same-day', surface_label: 'Second surface, same day', surface_type: 'capital_surface', hop_eligible: false, hop_refusal_reason: 'organization_only_evidence', time_start: '2024-05-01', time_end: '2024-05-01', receipt_ids: ['r-s-same-day'],
      participants: [participant('s-same-day', 'a', '2024-05-01', '2024-05-01', 'primary_public'), participant('s-same-day', 'c', '2024-05-01', '2024-05-01', 'primary_public')] },
    { surface_id: 's-undated', surface_label: 'Undated surface', surface_type: 'forum_surface', hop_eligible: false, time_start: null, time_end: null, receipt_ids: ['r-s-undated'],
      participants: [participant('s-undated', 'b', null, null, 'reported')] },
    { surface_id: 's-month', surface_label: 'Month surface', surface_type: 'forum_surface', hop_eligible: false, time_start: '2024-02', time_end: '2024-02', receipt_ids: ['r-s-month'],
      participants: [participant('s-month', 'c', '2024-02', '2024-02')] },
    { surface_id: 's-open', surface_label: 'Open surface', surface_type: 'forum_surface', hop_eligible: false, time_start: '2024-09-01', time_end: '', receipt_ids: ['r-s-open'],
      participants: [participant('s-open', 'd', '2024-09-01', '')] },
    { surface_id: 's-year', surface_label: 'Year surface', surface_type: 'campaign_surface', hop_eligible: false, time_start: '2023', time_end: '2023', receipt_ids: ['r-s-year'],
      participants: [participant('s-year', 'd', '2023', '2023')] },
    { surface_id: 's-dense', surface_label: 'Dense roster', surface_type: 'directory_roster_surface', hop_eligible: false, hop_refusal_reason: 'dense_directory_listing_not_shared_participation', time_start: '2024-11-11', time_end: '2024-11-11', receipt_ids: ['r-s-dense'],
      participants: [participant('s-dense', 'a', '2024-11-11', '2024-11-11', 'primary_public'), ...Array.from({ length: 21 }, (_, index) => participant('s-dense', `r${index + 1}`, '2024-11-11', '2024-11-11', 'primary_public'))] }
  ]
};
const fixtureHops = {
  edges: [{ actor_a: 'a', actor_b: 'b', temporal_envelope: { valid_from: '1999-01-01', valid_until: '2099-12-31' }, surfaces: [{ surface_id: 's-day', surface_label: 'Day surface', surface_type: 'board_surface', actor_a_role: 'Member', actor_b_role: 'Member', evidence_class: 'official', valid_from: '2024-05-01', valid_until: '2024-05-01', temporal_status: 'dated', receipt_ids: ['r-s-day'] }] }],
  rejected_hop_surfaces: [{ surface_id: 's-same-day', reason: 'organization_only_evidence' }, { surface_id: 's-undated', reason: 'surface_not_hop_eligible' }, { surface_id: 's-dense', reason: 'dense_directory_listing_not_shared_participation' }]
};
const fixtureModel = buildTimelineModel(fixture, fixtureHops);
assert.deepEqual(fixtureModel.counts.kinds, { day: 27, span: 1, year: 1, open: 1, undated: 1 });
const undated = fixtureModel.rowsByKey.get('s-undated::actor::b');
assert.equal(undated.kind, 'undated');
assert.equal(undated.precision, 'undated');
assert.equal(undated.start_day, null);
assert.equal(rowInWindow(undated, dayIndex('2030-01-01'), dayIndex('2030-12-31')), true, 'undated rows are never sliced');
const month = fixtureModel.rowsByKey.get('s-month::actor::c');
assert.equal(month.kind, 'span');
assert.equal(month.precision, 'month');
assert.equal(isoFromDayIndex(month.start_day), '2024-02-01');
assert.equal(isoFromDayIndex(month.end_day), '2024-02-29');
assert.equal(fixtureModel.dense.length, 1);
assert.equal(fixtureModel.dense[0].listed_count, 22);
assert.deepEqual(fixtureModel.dense[0].elsewhere.map(entry => entry.actor_id), ['a']);
assert.equal(fixtureModel.dense[0].nowhere_else_count, 21);
assert.deepEqual(fixtureModel.refusalReasons.get('s-undated'), { reason: 'surface_not_hop_eligible', reason_recorded: false });
assert.equal(fixtureModel.range.first_day, '2023-01-01');
const fixtureLayout = layoutTimeline(fixtureModel, { plotWidth: 400, domainFrom: '2023-01-01', domainTo: '2025-01-01' });
assert.deepEqual(fixtureLayout.lanes.filter(lane => lane.kind === 'entity').map(lane => lane.entity_id), ['d', 'c', 'a', 'b'], 'first day then label');
assert.deepEqual(fixtureLayout.hidden.undated, ['s-undated::actor::b'], 'undated rows are listed, never positioned');
assert.ok(!fixtureLayout.marks.some(mark => mark.key === 's-undated::actor::b'));
assert.equal(fixtureLayout.counts.undated, 1);
assert.equal(fixtureLayout.counts.blocks, 1);
assert.equal(fixtureLayout.blocks[0].listed_count, 22);
assert.equal(fixtureLayout.marks.filter(mark => mark.surface_id === 's-dense').length, 1, 'only the cross-referenced person gets a personal mark');
assert.equal(fixtureLayout.marks.filter(mark => mark.surface_id === 's-dense')[0].entity_id, 'a');
assert.ok(!fixtureLayout.marks.some(mark => /^r\d+$/.test(mark.entity_id)), 'roster-only names are never drawn individually');
assert.equal(fixtureLayout.counts.columns, 1);
assert.deepEqual(fixtureLayout.columns[0].segments.map(segment => segment.laneId).sort(), ['a', 'b']);
assert.ok(!fixtureLayout.columns[0].segments.some(segment => segment.laneId === 'c'), 'c shares the day on another surface and is not touched');
const sameDay = fixtureLayout.marks.filter(mark => mark.entity_id === 'a' && mark.iso_start === '2024-05-01').sort((x, y) => x.surface_id < y.surface_id ? -1 : 1);
assert.equal(sameDay[1].x - sameDay[0].x, TIMELINE_DESKTOP_METRICS.slotOffset);
assert.equal(fixtureLayout.columns[0].x, sameDay[0].x, 'the column stands over its own surface marks');
assert.equal(fixtureLayout.marks.find(mark => mark.key === 's-open::actor::d').clipped_end, true);
assert.equal(fixtureLayout.marks.find(mark => mark.key === 's-year::actor::d').kind, 'year');
assert.equal(fixtureLayout.counts.total_rows, 31);
assert.equal(fixtureLayout.counts.candidate_rows, 30, '30 actor rows; the venue organization row is outside the People view');
assert.equal(fixtureLayout.counts.rows_in_view, 29, '8 marks + 22 block members with a\'s dense row counted once');
assert.equal(fixtureLayout.counts.rows_outside_grouping, 1);
checkAccounting(fixtureLayout, fixtureModel);
const fixtureOfficial = layoutTimeline(fixtureModel, { plotWidth: 400, domainFrom: '2023-01-01', domainTo: '2025-01-01', evidenceFloor: 'official' });
assert.equal(fixtureOfficial.counts.blocks, 0, 'a roster with no member at the floor is not drawn');
assert.equal(fixtureOfficial.counts.filtered, 25, '22 roster rows + the two primary_public rows on the same-day surface + the reported undated row (filters run before placement)');
assert.equal(fixtureOfficial.counts.undated, 0);
assert.ok(fixtureModel.dense[0].member_keys.every(key => fixtureOfficial.hidden.filtered.includes(key)));
assert.equal(fixtureOfficial.counts.rows_in_view, 5);
checkAccounting(fixtureOfficial, fixtureModel);
const fixtureEarly = layoutTimeline(fixtureModel, { plotWidth: 400, domainFrom: '2024-06-01', domainTo: '2024-10-01' });
assert.equal(fixtureEarly.counts.blocks, 0, 'the roster day is after the domain');
assert.ok(fixtureModel.dense[0].member_keys.every(key => fixtureEarly.hidden.post_domain.includes(key)), 'its members are listed as post-domain');
assert.deepEqual(fixtureEarly.hidden.pre_domain_overlapping, [], 'the year bar ended in 2023 and the day rows are single days');
checkAccounting(fixtureEarly, fixtureModel);
assert.equal(layoutTimeline(fixtureModel, { plotWidth: 400, laneIds: ['b'] }).lanes.filter(lane => lane.kind === 'entity').length, 1);

// --- the standalone flattening (tools/build-standalone.mjs): core then timeline, imports stripped
const standaloneBuilder = readFileSync('tools/build-standalone.mjs', 'utf8');
assert.match(standaloneBuilder, /'src\/visual-aperture-timeline\.mjs'/, 'the module is in apertureModuleFiles');
assert.match(standaloneBuilder, /isolateModule\(source\)/, 'import-bearing modules go through isolateModule');
function isolateModule(moduleSource) {
  const exportedNames = [...moduleSource.matchAll(/^export\s+(?:function|const|class)\s+([A-Za-z0-9_$]+)/gm)].map(match => match[1]);
  const body = moduleSource.replace(/^import .*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
  return `(() => {\n${body}\nreturn { ${exportedNames.join(', ')} };\n})()`;
}
const records = ['src/visual-aperture-core.mjs', 'src/visual-aperture-timeline.mjs'].map(file => {
  const moduleSource = readFileSync(file, 'utf8');
  const names = [...moduleSource.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm)].map(match => match[1]);
  const body = /^import\s/m.test(moduleSource) ? `const { ${names.join(', ')} } = ${isolateModule(moduleSource)};` : moduleSource.replace(/^export\s+/gm, '');
  return { names, body };
});
const bundle = records.map(record => `(function apertureModule() {\n${record.body}\nObject.assign(globalThis, { ${record.names.join(', ')} });\n})();`).join('\n');
assert.doesNotMatch(bundle, /^import\s/m, 'no import statement survives into the classic script');
assert.doesNotThrow(() => new Function(bundle));
const context = vm.createContext({});
vm.runInContext(`${bundle}\nglobalThis.__result = (() => { const m = buildTimelineModel(SURFACE_GRAPH, HOP_GRAPH); const l = layoutTimeline(m, { plotWidth: 690 }); return { rows: m.counts.rows, drawn: l.counts.drawn, columns: l.counts.columns }; })();`.replace('SURFACE_GRAPH', JSON.stringify(surfaceGraph)).replace('HOP_GRAPH', JSON.stringify(hopGraph)), context);
assert.deepEqual(JSON.parse(JSON.stringify(context.__result)), { rows: 286, drawn: 80, columns: 16 }, 'the flattened module works from globalThis like the live page');

// --- registration
const allowlist = JSON.parse(readFileSync('data/project/publication-allowlist.json', 'utf8'));
assert.ok(allowlist.paths.includes('src/visual-aperture-timeline.mjs'), 'the module is a public file');
assert.match(JSON.parse(readFileSync('package.json', 'utf8')).scripts.test, /node test\/visual-aperture-timeline\.test\.js/);

console.log(`visual-aperture-timeline.test.js: OK (${model.counts.rows} rows: day ${model.counts.kinds.day} / span ${model.counts.kinds.span} / year ${model.counts.kinds.year} / open ${model.counts.kinds.open} / undated ${model.counts.kinds.undated}; ${model.counts.hop_bases} bases → ${model.counts.hop_day_surfaces} (day, surface) objects on ${model.counts.hop_days} days; ${actorLanes.lanes.length} lanes + ${actorLanes.strip.row_count} strip + ${actorLanes.blocks.length} block; desktop 80 marks + 16 columns, phone 49 + 10; dense ${dialog.listed_count} names, ${dialog.elsewhere.length} elsewhere; ${model.range.distinct_start_days} distinct start days)`);
