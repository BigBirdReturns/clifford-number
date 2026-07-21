import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  APERTURE_EXPORT_BOUNDARY,
  APERTURE_EXPORT_SCHEMA_VERSION,
  apertureExportFilename,
  buildApertureExportPacket
} from '../src/visual-aperture-export.mjs';

const generatedAt = '2026-07-21T12:00:00Z';
const exactViewUrl = 'https://example.test/clifford-number/?ap_v=1&ap_mode=route#receipts/all';

const routePacket = buildApertureExportPacket({
  mode: 'route',
  generatedAt,
  exactViewUrl,
  view: {
    from: { actor_id: 'actor-a', actor_label: 'Actor A' },
    to: { actor_id: 'anchor', actor_label: 'Anchor Actor' },
    as_of: '2024',
    evidence_floor: 'primary_public',
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
assert.equal(routePacket.interpretation_contract.caveat, APERTURE_EXPORT_BOUNDARY);
assert.equal(routePacket.view.path.number, 2, 'path length must derive from emitted hops, not a supplied claim');
assert.deepEqual(routePacket.receipt_ids, ['receipt-1', 'receipt-2', 'receipt-3']);
assert.deepEqual(routePacket.view.path.hops.map(hop => hop.surface.surface_label), ['Policy Board', 'Venture Round']);
assert.equal(routePacket.view.path.hops[0].surface.from_role, 'Member');
assert.equal(routePacket.view.path.hops[0].surface.to_role, 'Chair');
assert.equal(routePacket.view.path.hops[0].surface.valid_from, '2024-01-01');
assert.match(routePacket.caption, /Actor A → Policy Board → Actor B/);
assert.match(routePacket.caption, /primary public evidence floor/);
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

// An unparseable temporal control is refused, never published as an absent route.
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

const mapPacket = buildApertureExportPacket({
  mode: 'map', generatedAt, exactViewUrl: 'https://example.test/?ap_v=1&ap_mode=map',
  view: {
    level: 'corpus', scale: 1, surface_count: 4,
    selected_family: { id: 'policy', label: 'Policy and government' },
    families: [
      { id: 'policy', label: 'Policy and government', surface_count: 2, actor_count: 3, hop_eligible: 1, context_only: 1 },
      { id: 'capital', label: 'Capital and finance', surface_count: 2, actor_count: 2, hop_eligible: 2, context_only: 0 }
    ],
    corridors: [{ from_family_id: 'capital', to_family_id: 'policy', shared_actor_count: 1 }]
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

assert.throws(() => buildApertureExportPacket({ mode: 'unknown', generatedAt, exactViewUrl, view: {} }), /mode must be/);
assert.throws(() => buildApertureExportPacket({ mode: 'map', generatedAt: 'not-a-date', exactViewUrl, view: {} }), /generatedAt/);
assert.throws(() => buildApertureExportPacket({ mode: 'map', generatedAt, exactViewUrl: 'javascript:alert(1)', view: {} }), /exactViewUrl/);

const moduleFiles = [
  'src/visual-aperture-core.mjs',
  'src/visual-aperture-state.mjs',
  'src/visual-aperture-workspace.mjs',
  'src/visual-aperture-export.mjs'
];
const moduleRecords = moduleFiles.map(file => {
  const source = readFileSync(file, 'utf8');
  const names = [...source.matchAll(/^export\s+(?:const|function|class)\s+(\w+)/gm)].map(match => match[1]);
  return { names, body: source.replace(/^export\s+/gm, '') };
});
const names = [...new Set(moduleRecords.flatMap(record => record.names))];
const modules = moduleRecords.map(record => `(function apertureModule() {\n${record.body}\nObject.assign(globalThis, { ${record.names.join(', ')} });\n})();`).join('\n');
const runtime = [
  readFileSync('src/visual-aperture-workspace-runtime.js', 'utf8'),
  readFileSync('src/visual-aperture-export-runtime.js', 'utf8'),
  ...Array.from({ length: 11 }, (_, index) => readFileSync(`src/visual-aperture-part-${index + 1}.js`, 'utf8'))
].join('\n\n');
const standaloneShape = `(function visualApertureBundle() {\n${modules}\n(function visualApertureRuntime() {\nconst { ${names.join(', ')} } = globalThis;\n${runtime}\n})();\n})();`;
assert.doesNotThrow(() => new Function(standaloneShape), 'the publication runtime must parse in the exact standalone concatenation order');

console.log('visual-aperture-export.test.js: OK');
