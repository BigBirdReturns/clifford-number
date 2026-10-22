import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  APERTURE_EXPORT_BOUNDARY,
  APERTURE_EXPORT_SCHEMA_VERSION,
  apertureExportFilename,
  buildApertureExportPacket
} from '../src/visual-aperture-export.mjs';

const generatedAt = '2026-07-21T12:00:00Z';
const exactViewUrl = 'https://example.test/clifford-number/?ap_v=1&ap_mode=route&ap_overview_page=2&ap_route_window=24#receipts/all';

const routePacket = buildApertureExportPacket({
  mode: 'route',
  generatedAt,
  exactViewUrl,
  view: {
    from: { actor_id: 'actor-a', actor_label: 'Actor A' },
    to: { actor_id: 'anchor', actor_label: 'Anchor Actor' },
    as_of: '2024',
    evidence_floor: 'primary_public',
    display: { total_rows: 2, visible_from: 1, visible_until: 2, page: 1, page_size: 50, total_pages: 1, rendering: 'paginated_complete_rows_reachable' },
    route_window: { visible_step_from: 1, visible_step_until: 2, total_steps: 2, max_visible_steps: 24, complete_path_retained: true },
    path: {
      number: 99,
      hops: [
        {
          from: { actor_id: 'actor-a', actor_label: 'Actor A' },
          to: { actor_id: 'actor-b', actor_label: 'Actor B' },
          surface: {
            surface_id: 'policy-board', surface_label: 'Policy Board', surface_type: 'government_advisory_surface',
            from_role: 'Member', to_role: 'Chair', evidence_class: 'official',
            valid_from: '2024-01-01', valid_until: '2024-12-31', temporal_status: 'dated',
            receipt_ids: ['receipt-2', 'receipt-1']
          }
        },
        {
          from: { actor_id: 'actor-b', actor_label: 'Actor B' },
          to: { actor_id: 'anchor', actor_label: 'Anchor Actor' },
          surface: {
            surface_id: 'venture-round', surface_label: 'Venture Round', surface_type: 'capital_surface',
            from_role: 'Investor', to_role: 'Founder', evidence_class: 'primary_public',
            valid_from: '2024-04-01', valid_until: null, temporal_status: 'dated',
            receipt_ids: ['receipt-3']
          }
        }
      ]
    },
    diagnostics: {
      total_edges: 4, traversable_edges: 2, evidence_blocked_bases: 1, time_blocked_bases: 2, undated_blocked_bases: 1
    },
    finding: 'must not survive', probability: 0.98
  }
});

assert.equal(routePacket.schema_version, APERTURE_EXPORT_SCHEMA_VERSION);
assert.equal(routePacket.generated_at, '2026-07-21T12:00:00.000Z');
assert.equal(routePacket.exact_view_url, exactViewUrl);
assert.equal(routePacket.interpretation_contract.graph_effect, 'none');
assert.equal(routePacket.interpretation_contract.bounded_rendering_is_not_data_deletion, true);
assert.equal(routePacket.interpretation_contract.caveat, APERTURE_EXPORT_BOUNDARY);
assert.equal(routePacket.view.path.number, 2, 'path length must derive from emitted hops, not a supplied claim');
assert.deepEqual(routePacket.receipt_ids, ['receipt-1', 'receipt-2', 'receipt-3']);
assert.deepEqual(routePacket.view.path.hops.map(hop => hop.surface.surface_label), ['Policy Board', 'Venture Round']);
assert.equal(routePacket.view.path.hops[0].surface.from_role, 'Member');
assert.equal(routePacket.view.path.hops[0].surface.to_role, 'Chair');
assert.equal(routePacket.view.path.hops[0].surface.valid_from, '2024-01-01');
assert.deepEqual(routePacket.view.display, {
  total_rows: 2, visible_from: 1, visible_until: 2, page: 1, page_size: 50, total_pages: 1,
  rendering: 'paginated_complete_rows_reachable'
});
assert.deepEqual(routePacket.view.route_window, {
  visible_step_from: 1, visible_step_until: 2, total_steps: 2, max_visible_steps: 24, complete_path_retained: true
});
assert.match(routePacket.caption, /Actor A → Policy Board → Actor B/);
assert.match(routePacket.caption, /primary public evidence floor/);
assert.match(routePacket.caption, /All 2 route steps are visible/);
assert.match(routePacket.caption, new RegExp(APERTURE_EXPORT_BOUNDARY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.match(routePacket.caption, /Exact view:/);
assert.doesNotMatch(JSON.stringify(routePacket), /must not survive|probability/);
assert.deepEqual(routePacket.view.table.columns, ['Step', 'From', 'Bounded surface', 'To', 'Roles', 'Validity window', 'Evidence', 'Receipt IDs']);
assert.equal(routePacket.view.table.rows.length, 2);
assert.equal(apertureExportFilename(routePacket), 'clifford-route-actor-a-to-anchor-actor.json');

const blocked = buildApertureExportPacket({
  mode: 'route', generatedAt, exactViewUrl,
  view: {
    from: { actor_id: 'actor-a', actor_label: 'Actor A' },
    to: { actor_id: 'actor-z', actor_label: 'Actor Z' },
    as_of: '2020', evidence_floor: 'official', path: null,
    diagnostics: { total_edges: 4, traversable_edges: 0, evidence_blocked_bases: 0, time_blocked_bases: 4, undated_blocked_bases: 1 }
  }
});
assert.equal(blocked.view.path, null);
assert.match(blocked.caption, /No actor-to-actor route/);
assert.match(blocked.caption, /not proof that no relationship exists/);
assert.equal(blocked.view.table.rows.length, 0);

const refused = buildApertureExportPacket({
  mode: 'route', generatedAt, exactViewUrl,
  view: {
    from: { actor_id: 'actor-a', actor_label: 'Actor A' },
    to: { actor_id: 'actor-z', actor_label: 'Actor Z' },
    as_of: 'not-a-date', temporal_input_valid: false, evidence_floor: 'open', path: null,
    diagnostics: { total_edges: 4, traversable_edges: 4, evidence_blocked_bases: 0, time_blocked_bases: 0, undated_blocked_bases: 0 }
  }
});
assert.equal(refused.view.temporal_input_valid, false);
assert.equal(refused.view.path, null);
assert.equal(refused.view.diagnostics, null);
assert.equal(refused.view.table.rows.length, 0);
assert.match(refused.caption, /refused rather than reported/);
assert.doesNotMatch(refused.caption, /No actor-to-actor route|survives the current compiled corpus/);

const longHops = Array.from({ length: 30 }, (_, index) => ({
  from: { actor_id: `actor-${index}`, actor_label: `Actor ${index}` },
  to: { actor_id: `actor-${index + 1}`, actor_label: `Actor ${index + 1}` },
  surface: {
    surface_id: `surface-${index + 1}`, surface_label: `Surface ${index + 1}`, surface_type: 'event_surface',
    from_role: 'Member', to_role: 'Member', evidence_class: 'official',
    valid_from: '2024', valid_until: '2024', temporal_status: 'dated', receipt_ids: [`receipt-${index + 1}`]
  }
}));
const longRoute = buildApertureExportPacket({
  mode: 'route', generatedAt, exactViewUrl,
  view: {
    from: longHops[0].from,
    to: longHops.at(-1).to,
    evidence_floor: 'official',
    path: { hops: longHops },
    display: { total_rows: 30, visible_from: 26, visible_until: 30, page: 2, page_size: 25, total_pages: 2 },
    route_window: { visible_step_from: 7, visible_step_until: 30, total_steps: 30, max_visible_steps: 24, complete_path_retained: true }
  }
});
assert.equal(longRoute.view.path.hops.length, 30, 'route windowing must not truncate the packet path');
assert.equal(longRoute.view.table.rows.length, 30, 'route pagination must not truncate the packet table');
assert.match(longRoute.caption, /middle sequence of 18 steps is omitted from this caption but retained in the packet/);
assert.match(longRoute.caption, /browser shows route steps 7–30 of 30/);
assert.match(longRoute.caption, /browser shows rows 26–30 of 30/);

const mapPacket = buildApertureExportPacket({
  mode: 'map', generatedAt, exactViewUrl: 'https://example.test/?ap_v=1&ap_mode=map',
  view: {
    level: 'corpus', scale: 1, surface_count: 4,
    selected_family: { id: 'policy', label: 'Policy and government' },
    families: [
      { id: 'policy', label: 'Policy and government', surface_count: 2, actor_count: 3, hop_eligible: 1, context_only: 1 },
      { id: 'capital', label: 'Capital and finance', surface_count: 2, actor_count: 2, hop_eligible: 2, context_only: 0 }
    ],
    corridors: [{ from_family_id: 'capital', to_family_id: 'policy', shared_actor_count: 1 }],
    display: { total_rows: 2, visible_from: 1, visible_until: 2, page: 1, page_size: 50, total_pages: 1 }
  }
});
assert.equal(mapPacket.view.corridors[0].graph_effect, 'none');
assert.match(mapPacket.caption, /Aggregate corridors count actors/);
assert.deepEqual(mapPacket.receipt_ids, []);
assert.equal(mapPacket.view.table.rows.length, 2);

const surfacePacket = buildApertureExportPacket({
  mode: 'surface', generatedAt, exactViewUrl: 'file:///tmp/Clifford-Number-standalone.html?ap_v=1&ap_mode=surface',
  view: {
    surface: {
      surface_id: 'dense-roster', surface_label: 'Dense Roster', surface_type: 'directory_surface',
      hop_eligible: false, time_start: '2026', time_end: '2026', receipt_ids: ['surface-receipt']
    },
    query: 'official', as_of: '2026', evidence_floor: 'reported', bracket_budget: 18,
    total_actors: 115, hidden_by_budget: 96, filtered_out: 1, pinned_actor_ids: ['actor-b', 'actor-a'],
    display: { total_rows: 2, visible_from: 1, visible_until: 2, page: 1, page_size: 50, total_pages: 1 },
    visible_participants: [
      { actor_id: 'actor-a', actor_label: 'Actor A', role: 'Public official', participation_type: 'listed', time_start: '2026', time_end: '2026', evidence_class: 'primary_public', receipt_ids: ['receipt-a'], pinned: true },
      { actor_id: 'actor-b', actor_label: 'Actor B', role: 'Company leader', participation_type: 'listed', time_start: null, time_end: null, evidence_class: 'reported', receipt_ids: ['receipt-b'], pinned: false }
    ]
  }
});
assert.equal(surfacePacket.view.surface.hop_eligible, false);
assert.deepEqual(surfacePacket.view.pinned_actor_ids, ['actor-a', 'actor-b']);
assert.deepEqual(surfacePacket.receipt_ids, ['receipt-a', 'receipt-b', 'surface-receipt']);
assert.match(surfacePacket.caption, /creates no participant-to-participant adjacency/);
assert.equal(surfacePacket.view.table.rows[0][0], 'yes');
assert.equal(apertureExportFilename(surfacePacket), 'clifford-surface-dense-roster.json');

const timelineRows = [
  {
    key: 'policy-board::actor::actor-a', surface_id: 'policy-board', surface_label: 'Policy Board', surface_type: 'government_advisory_surface',
    participant_type: 'actor', entity_id: 'actor-a', entity_label: 'Actor A', role: 'Member', participation_type: 'member',
    time_start: '2024-01-01', time_end: '2024-01-01', precision: 'day', kind: 'day', window_label: '2024-01-01',
    evidence_class: 'official', evidence_recorded: true, hop_eligible: true, hop_refusal_reason: 'must not survive', hop_basis_count: 1, in_window: true,
    receipt_ids: ['receipt-2', 'receipt-1'], lane_id: 'actor-a', rendering: 'mark', finding: 'must not survive'
  },
  {
    key: 'tenure::actor::actor-b', surface_id: 'tenure', surface_label: 'Tenure observation', surface_type: 'board_advisory_surface',
    participant_type: 'actor', entity_id: 'actor-b', entity_label: 'Actor B', role: 'Director', participation_type: 'director_tenure',
    time_start: '2024-03-01', time_end: '', precision: 'open', kind: 'open', window_label: '2024-03-01 → no documented end',
    evidence_class: 'official', hop_eligible: false, hop_refusal_reason: 'single_actor_context_only', hop_basis_count: 0, in_window: false,
    receipt_ids: ['receipt-3'], lane_id: 'strip:actor', rendering: 'mark'
  }
];
const timelinePacket = buildApertureExportPacket({
  mode: 'timeline', generatedAt, exactViewUrl: 'https://example.test/?ap_v=1&ap_mode=timeline&ap_time_from=2024-01-01&ap_time_to=2024-12-31',
  view: {
    by: 'actor',
    domain: { from: '2024-01-01', to: '2024-12-31', auto: false },
    window: { from: '2024-01-01', to: '2024-02-28', active: true },
    lanes: [
      { id: 'actor-a', kind: 'entity', label: 'Actor A', row_count: 2, drawn_count: 1 },
      { id: 'strip:actor', kind: 'strip', label: 'People documented on one surface', row_count: 3, drawn_count: 1 }
    ],
    rows: timelineRows,
    hop_days: [{ day: '2024-01-01', surface_id: 'policy-board', surface_label: 'Policy Board', basis_count: 1, total_basis_count: 1, actor_ids: ['actor-b', 'actor-a'], lane_ids: ['actor-a'], receipt_ids: ['receipt-1'] }],
    dense: [{ surface_id: 'dense-roster', surface_label: 'Dense Roster', day: '2024-06-01', listed_count: 112, row_count: 113, visible_row_count: 113, refusal_reason: 'dense_directory_listing_not_shared_participation', elsewhere: [{ actor_id: 'actor-a', other_surface_count: 8 }], nowhere_else_count: 110, receipt_ids: ['receipt-dense'] }],
    filters: { evidence_floor: 'open', hop: 'all' },
    counts: { total_rows: 286, candidate_rows: 201, rows_in_view: 2, in_window: 1, filtered: 0, pre_domain: 10, post_domain: 5, undated: 0, marks: 2, columns: 1, blocks: 1, aggregated_rows: 0 },
    display: { total_rows: 2, visible_from: 1, visible_until: 2, page: 1, page_size: 50, total_pages: 1, rendering: 'paginated_complete_rows_reachable' },
    heat: 'must not survive'
  }
});
assert.equal(timelinePacket.schema_version, APERTURE_EXPORT_SCHEMA_VERSION);
assert.equal(timelinePacket.mode, 'timeline');
assert.equal(timelinePacket.title, 'Clifford Number timeline · People · 2024-01-01 → 2024-12-31');
assert.equal(timelinePacket.interpretation_contract.graph_effect, 'none');
assert.deepEqual(timelinePacket.view.table.columns, ['Date(s)', 'Who', 'Surface', 'Role', 'Type', 'Evidence', 'Hop', 'Receipt IDs']);
assert.equal(timelinePacket.view.table.rows.length, timelinePacket.view.rows.length, 'every exported row is a table row');
assert.equal(timelinePacket.view.table.rows.length, 2);
assert.deepEqual(timelinePacket.view.table.rows[1].slice(0, 2), ['2024-03-01 → no documented end', 'Actor B']);
assert.equal(timelinePacket.view.table.rows[1][6], 'context-only (single_actor_context_only)');
assert.equal(timelinePacket.view.rows[0].hop_refusal_reason, null, 'a hop-eligible row carries no refusal reason');
assert.deepEqual(timelinePacket.receipt_ids, ['receipt-1', 'receipt-2', 'receipt-3', 'receipt-dense'], 'receipts are the union of visible rows and dense rosters');
assert.equal(timelinePacket.view.hop_days[0].rendering, 'surface_day_column_segments_on_participant_lanes');
assert.equal(timelinePacket.view.hop_days[0].graph_effect, 'none');
assert.deepEqual(timelinePacket.view.hop_days[0].actor_ids, ['actor-a', 'actor-b']);
assert.equal(timelinePacket.view.dense[0].rendering, 'one_contained_object_no_per_person_marks');
assert.equal(timelinePacket.view.dense[0].listed_count, 112);
assert.equal(timelinePacket.view.counts.total_rows, 286);
assert.match(timelinePacket.caption, /shows 2 of 286 documented participation rows on 2 lanes \(People\) between 2024-01-01 and 2024-12-31/);
assert.match(timelinePacket.caption, /1 surface-day carries admitted hop bases and is drawn as a column on the surface, never as a line between people/);
assert.match(timelinePacket.caption, /1 dense roster \(Dense Roster, 112 names\) stays one contained object each/);
assert.match(timelinePacket.caption, /1 of 2 rows fall inside the marked window 2024-01-01 → 2024-02-28; the rest are dimmed, never removed/);
assert.match(timelinePacket.caption, /All 2 evidence rows are visible/);
assert.match(timelinePacket.caption, new RegExp(APERTURE_EXPORT_BOUNDARY.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
assert.doesNotMatch(JSON.stringify(timelinePacket), /must not survive|"heat"|"finding"/, 'unknown view fields never enter the packet');
assert.equal(apertureExportFilename(timelinePacket), 'clifford-timeline-actor-2024-01-01-2024-12-31.json');
const typeTimeline = buildApertureExportPacket({ mode: 'timeline', generatedAt, exactViewUrl, view: { by: 'type', domain: { from: '2016-01-01', to: '2026-09-11' }, rows: [], counts: { total_rows: 54, rows_in_view: 54 } } });
assert.match(typeTimeline.caption, /54 of 54 documented surface rows on 0 lanes \(Surface types\)/);
assert.match(typeTimeline.caption, /0 surface-days carry admitted hop bases/);
assert.equal(typeTimeline.view.filters.hop, 'all');
assert.equal(typeTimeline.view.window.active, false);

assert.throws(() => buildApertureExportPacket({ mode: 'unknown', generatedAt, exactViewUrl, view: {} }), /mode must be/);
assert.throws(() => buildApertureExportPacket({ mode: 'map', generatedAt: 'not-a-date', exactViewUrl, view: {} }), /generatedAt/);
assert.throws(() => buildApertureExportPacket({ mode: 'map', generatedAt, exactViewUrl: 'javascript:alert(1)', view: {} }), /exactViewUrl/);

function isolateModule(moduleSource) {
  const exportedNames = [...moduleSource.matchAll(/^export\s+(?:function|const|class)\s+([A-Za-z0-9_$]+)/gm)].map(match => match[1]);
  const body = moduleSource.replace(/^import .*?;\r?\n/gm, '').replace(/^export\s+/gm, '');
  return `(() => {\n${body}\nreturn { ${exportedNames.join(', ')} };\n})()`;
}
const moduleFiles = [
  'src/visual-aperture-core.mjs',
  'src/visual-aperture-state.mjs',
  'src/visual-aperture-workspace.mjs',
  'src/visual-aperture-export.mjs',
  'src/visual-aperture-windowing.mjs',
  'src/visual-aperture-timeline.mjs'
];
const moduleRecords = moduleFiles.map(file => {
  const source = readFileSync(file, 'utf8');
  const names = [...source.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm)].map(match => match[1]);
  const body = /^import\s/m.test(source) ? `const { ${names.join(', ')} } = ${isolateModule(source)};` : source.replace(/^export\s+/gm, '');
  return { names, body };
});
const names = [...new Set(moduleRecords.flatMap(record => record.names))];
const modules = moduleRecords.map(record => `(function apertureModule() {\n${record.body}\nObject.assign(globalThis, { ${record.names.join(', ')} });\n})();`).join('\n');
const runtime = [
  readFileSync('src/visual-aperture-workspace-runtime.js', 'utf8'),
  readFileSync('src/visual-aperture-export-runtime.js', 'utf8'),
  ...Array.from({ length: 10 }, (_, index) => readFileSync(`src/visual-aperture-part-${index + 1}.js`, 'utf8')),
  readFileSync('src/visual-aperture-timeline-runtime.js', 'utf8'),
  readFileSync('src/visual-aperture-social-field-runtime.js', 'utf8'),
  readFileSync('src/visual-aperture-bounded-runtime.js', 'utf8'),
  readFileSync('src/visual-aperture-export-preview-runtime.js', 'utf8'),
  readFileSync('src/visual-aperture-part-11.js', 'utf8'),
  readFileSync('src/visual-aperture-bounded-address-runtime.js', 'utf8')
].join('\n\n');
assert.match(readFileSync('src/visual-aperture-export-runtime.js', 'utf8'), /state\.mode === 'timeline'\s*\?\s*currentTimelineExportView\(\)/, 'the export runtime branches to the timeline view');
const standaloneShape = `(function visualApertureBundle() {\n${modules}\n(function visualApertureRuntime() {\nconst { ${names.join(', ')} } = globalThis;\n${runtime}\n})();\n})();`;
assert.doesNotThrow(() => new Function(standaloneShape), 'the publication runtime must parse in the exact standalone concatenation order');

console.log('visual-aperture-export.test.js: OK');
