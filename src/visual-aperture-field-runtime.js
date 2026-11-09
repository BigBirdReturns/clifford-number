// Field: the arrival view of the explorer (docs/explorer.md, "Field"). The
// whole ledger of build/surface-graph.json as a force-directed field: every
// actor, organization and bounded surface is a node, every participation row
// is one link. Node size, halo and colour are the printed heat of rule 6
// (src/social-field.js, HEAT_FORMULA), summed to the end of record; the
// formula stays on screen, the callout prints every term, and every number in
// the header strip and the instrument tiles is a plain count from the compiled
// artifacts with its denominator named. The GPU renderer is
// createGalaxyFieldRenderer in src/atlas-webgl.js; this runtime owns the
// chrome, the selection, the callout, the tiles and the lifecycle.
//
// The pure social-field API is reached through globalThis.cliffordSocialField
// (set by src/visual-aperture.js on the hosted page and inlined by the
// standalone builder), so the counts, the heat terms and the tiles work even
// where the WebGL field cannot start.
const FIELD_HEAT_FORMULA = 'heat = Σ touches weight(class) × 0.8^years; policy 1 · appointment 1 · procurement 2 · capital 2';
const FIELD_CLASS_KEYS = [
  ['policy', 'Policy', '#3987e5'],
  ['appointment', 'Appointment', '#c98500'],
  ['procurement', 'Procurement', '#d95926'],
  ['capital', 'Capital', '#199e70']
];
const FIELD_YEAR_FIRST = 2016;
const FIELD_YEAR_LAST = 2026;
const FIELD_TRAJECTORY_LIMIT = 10;
const FIELD_CALLOUT_LIMIT = 6;
const FIELD_CALLOUT_WIDTH = 340;
const FIELD_STAGE_LABEL = 'The ledger field: every actor, organization and bounded surface is a node and every participation row is a link. Node size, halo and colour are the printed heat (policy 1, appointment 1, procurement 2, capital 2, decayed by 0.8 per year to the end of record); nothing else sizes or colours a node, and no line joins two people.';

function fieldApi() {
  return globalThis.cliffordSocialField ?? state.galaxy?.api ?? null;
}
function fieldWebGlAvailable() {
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
}
// The field is the arrival view wherever its renderer can run: the hosted page
// loads src/atlas-webgl.js through loadCliffordSocialField. The standalone
// bundles no WebGL module, so it arrives on Network and keeps Field as a tab.
function fieldArrivalAvailable() {
  return typeof globalThis.loadCliffordSocialField === 'function' && fieldWebGlAvailable();
}
// On arrival the anchor actor of build/hop-graph.json (the actor every
// Clifford Number counts hops to) is selected, so the first screen already
// shows a highlighted node with its callout. Clear returns to the whole field.
function fieldAnchorId() {
  const id = state.data?.hopGraph?.anchor_actor_id;
  return id && state.actors.has(id) ? id : null;
}
function initializeFieldDefaults() {
  state.field = { selectedId: fieldAnchorId(), query: '' };
  state.galaxy = {
    api: null, renderer: null, model: null, ledger: null, field: null, facts: null, searchOptions: null,
    loading: false, failed: false, rendered: false, active: false, intersecting: true, lifecycleBound: false, observer: null
  };
  if (fieldArrivalAvailable()) state.mode = 'field';
}

// --- model ---------------------------------------------------------------------------------

function ensureFieldModel() {
  const galaxy = state.galaxy;
  if (galaxy.field) return galaxy.field;
  const api = fieldApi();
  if (!api?.buildLedgerFieldModel || !state.data?.surfaceGraph) return null;
  galaxy.model = api.buildLedgerFieldModel(state.data.surfaceGraph);
  galaxy.ledger = api.buildFieldLedgerIndex(state.data.surfaceGraph, galaxy.model);
  galaxy.field = api.buildSocialFieldModel(galaxy.model, { ledger: galaxy.ledger, atDay: galaxy.ledger.range?.last_day ?? null, reinforcement: false });
  return galaxy.field;
}
function fieldNode(id) {
  if (!id) return null;
  return ensureFieldModel()?.nodeById.get(id) ?? null;
}
function fieldLabelFor(id) {
  return fieldNode(id)?.label || state.actors.get(id)?.label || state.surfaces.get(String(id).replace(/^surface-/, ''))?.surface_label || id;
}
function fieldNodeKind(node) {
  if (node.ontology === 'surface') return 'Bounded surface';
  return node.ontology === 'person' ? 'Public actor' : 'Public organization';
}
function fieldNodeRows(id) {
  const ledger = state.galaxy.ledger;
  if (!ledger) return [];
  return String(id).startsWith('surface-') ? (ledger.rowsBySurfaceNode.get(id) ?? []) : (ledger.rowsByNode.get(id) ?? []);
}

// --- facts: plain counts from the compiled artifacts, each with its denominator ------------------

function fieldFacts() {
  const galaxy = state.galaxy;
  if (galaxy.facts) return galaxy.facts;
  const api = fieldApi();
  if (!api || !ensureFieldModel()) return null;
  const surfaceGraph = state.data.surfaceGraph;
  const hopGraph = state.data.hopGraph ?? {};
  const receipts = state.data.receiptGraph?.receipts ?? [];
  const ledger = galaxy.ledger;
  const counts = galaxy.model.counts;
  const rows = ledger.rows;

  const evidence = new Map();
  for (const row of rows) {
    const kind = normalizeEvidence(row.evidence_class);
    evidence.set(kind, (evidence.get(kind) ?? 0) + 1);
  }
  const rowsByEvidence = [...evidence.entries()]
    .sort((a, b) => evidenceRank(a[0]) - evidenceRank(b[0]))
    .map(([id, count]) => ({ id, label: evidenceLabel(id), count }));

  const byClass = new Map(FIELD_CLASS_KEYS.map(([id]) => [id, 0]));
  for (const surface of surfaceGraph.surfaces ?? []) {
    const heatClass = api.heatClassForSurfaceType(surface.surface_type);
    byClass.set(heatClass, (byClass.get(heatClass) ?? 0) + 1);
  }
  const surfacesByClass = FIELD_CLASS_KEYS.map(([id, label, color]) => ({ id, label, color, count: byClass.get(id) ?? 0 }));

  const archive = new Map();
  let archived = 0;
  for (const receipt of receipts) {
    const hasArchive = Boolean(receipt.archive?.ref || receipt.archive?.url || receipt.archive_url || receipt.archive_ref);
    if (hasArchive) archived += 1;
    const method = receipt.archive?.method || (receipt.archive ? 'archive, method unstated' : 'no archive record');
    archive.set(method, (archive.get(method) ?? 0) + 1);
  }
  const receiptsByArchive = [...archive.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([id, count]) => ({ id, label: humanLabel(id), count }));

  const years = new Map();
  let before = 0, after = 0, dated = 0;
  for (const row of rows) {
    if (!row.dated) continue;
    dated += 1;
    const year = Number(String(row.time_start).slice(0, 4));
    if (!Number.isFinite(year)) continue;
    if (year < FIELD_YEAR_FIRST) { before += 1; continue; }
    if (year > FIELD_YEAR_LAST) { after += 1; continue; }
    years.set(year, (years.get(year) ?? 0) + 1);
  }
  const rowsByYear = [];
  for (let year = FIELD_YEAR_FIRST; year <= FIELD_YEAR_LAST; year += 1) rowsByYear.push({ year, count: years.get(year) ?? 0 });

  galaxy.facts = {
    nodes: galaxy.model.nodes.length,
    actors: counts.actors,
    organizations: counts.organizations,
    surfaces: counts.surfaces,
    unlisted_participants: counts.unlisted_participants,
    rows: rows.length,
    links: galaxy.model.edges.length,
    actor_rows: counts.actor_rows,
    organization_rows: counts.organization_rows,
    dated_rows: dated,
    undated_rows: rows.length - dated,
    receipts: receipts.length,
    receipts_archived: archived,
    hops: (hopGraph.edges ?? []).length,
    hop_actors: routeActorIds().length,
    hop_eligible_surfaces: (surfaceGraph.surfaces ?? []).filter(surface => surface.hop_eligible).length,
    refused_surfaces: (hopGraph.rejected_hop_surfaces ?? []).length,
    rejected_pairs: (hopGraph.rejected_hop_pairs ?? []).length,
    first_date: ledger.range?.first_date ?? null,
    last_date: ledger.range?.last_date ?? null,
    rows_by_evidence: rowsByEvidence,
    surfaces_by_class: surfacesByClass,
    receipts_by_archive: receiptsByArchive,
    rows_by_year: { years: rowsByYear, before, after, undated: rows.length - dated, in_range: rowsByYear.reduce((sum, item) => sum + item.count, 0), first: FIELD_YEAR_FIRST, last: FIELD_YEAR_LAST }
  };
  return galaxy.facts;
}

// --- chrome: header strip, legend, tiles ------------------------------------------------------------

function fieldCount(value) {
  return Number.isFinite(Number(value)) ? Number(value).toLocaleString('en-GB') : String(value ?? '');
}
function fieldCountersMarkup(facts, selectedId) {
  const node = selectedId ? fieldNode(selectedId) : null;
  const items = [
    ['nodes', fieldCount(facts.nodes), `${fieldCount(facts.actors)} actors · ${fieldCount(facts.organizations)} organizations · ${fieldCount(facts.surfaces)} surfaces${facts.unlisted_participants ? ` · ${facts.unlisted_participants} unlisted participants` : ''}`],
    ['links', fieldCount(facts.links), `participation rows · ${fieldCount(facts.actor_rows)} actor · ${fieldCount(facts.organization_rows)} organization`],
    ['receipts', fieldCount(facts.receipts), `${fieldCount(facts.receipts_archived)} of ${fieldCount(facts.receipts)} with an archive record`],
    ['admitted hops', fieldCount(facts.hops), `actor pairs on ${fieldCount(facts.hop_eligible_surfaces)} of ${fieldCount(facts.surfaces)} hop-eligible surfaces`],
    ['documented', `${facts.first_date ?? '…'} → ${facts.last_date ?? '…'}`, `${fieldCount(facts.dated_rows)} dated rows · ${fieldCount(facts.undated_rows)} undated, never placed`],
    ['t', facts.last_date ?? 'end of record', 'end of record · heat is summed to this day']
  ];
  return `<div class="aperture-field-brand"><span class="aperture-field-brand__mark">CN</span><span>CLIFFORD NUMBER · FIELD</span><span class="aperture-field-brand__rule">${node ? `selected · ${esc(node.label)}` : 'every mark is one ledger row'}</span></div>
    <dl class="aperture-field-counters">${items.map(([term, value, note]) => `<div><dt>${esc(term)}</dt><dd>${esc(value)}</dd><small>${esc(note)}</small></div>`).join('')}</dl>`;
}
function fieldLegendMarkup() {
  const facts = fieldFacts();
  return `${FIELD_CLASS_KEYS.map(([id, label, color]) => `<span data-ap-heat-class="${id}"><i class="aperture-key aperture-key--heat" style="background:${color}"></i> ${label}</span>`).join('')}
    <span><i class="aperture-key aperture-key--actor"></i> actor · <i class="aperture-key aperture-key--organization"></i> organization · <i class="aperture-key aperture-key--surface"></i> surface · one link = one participation row (colour = evidence class)</span>
    <span class="aperture-heat-formula" data-ap-heat-formula>${FIELD_HEAT_FORMULA}; t = end of record${facts?.last_date ? ` (${esc(facts.last_date)})` : ''}; undated rows add nothing. Surface colour is its class; a person is the mix of classes touched; an organization stays grey.</span>`;
}
function fieldBarsMarkup(items) {
  const max = Math.max(1, ...items.map(item => item.count));
  return `<ul class="aperture-field-bars">${items.map(item => `<li><span class="aperture-field-bar-label">${esc(item.label)}</span><span class="aperture-field-bar-track"><i style="width:${((item.count / max) * 100).toFixed(1)}%${item.color ? `;background:${item.color}` : ''}"></i></span><span class="aperture-field-bar-count">${fieldCount(item.count)}</span></li>`).join('')}</ul>`;
}
function fieldYearsMarkup(years) {
  const max = Math.max(1, ...years.years.map(item => item.count));
  return `<ol class="aperture-field-years" aria-label="Participation rows per documented year">${years.years.map(item => `<li style="--h:${((item.count / max) * 100).toFixed(1)}%"><span class="aperture-field-year-count">${fieldCount(item.count)}</span><i></i><small>${String(item.year).slice(2)}</small></li>`).join('')}</ol>`;
}
function fieldStepClass(row) {
  const api = fieldApi();
  return api?.heatClassForSurfaceType ? api.heatClassForSurfaceType(row.surface_type) : 'policy';
}
// The dated rows of one node, oldest first, then its undated rows. For a
// surface the rows are its participants; for a person or organization, its
// surfaces. Every row is listed; past the limit they fold into a details element.
function fieldTrajectoryMarkup(id, { limit = FIELD_TRAJECTORY_LIMIT } = {}) {
  const node = fieldNode(id);
  const rows = fieldNodeRows(id);
  if (!node) return '<p class="aperture-muted">Select a node to list its rows in order.</p>';
  if (!rows.length) return `<p class="aperture-muted">No participation row names ${esc(node.label)}.</p>`;
  const isSurface = node.ontology === 'surface';
  const dated = rows.filter(row => row.dated);
  const undated = rows.filter(row => !row.dated);
  const item = row => `<li class="aperture-field-step aperture-field-step--${esc(fieldStepClass(row))}"><time>${esc(row.time_label)}${row.precision === 'year' ? ' (year)' : row.precision === 'month' ? ' (month)' : ''}</time><button type="button" class="aperture-table-link" data-ap-field-node="${esc(isSurface ? row.node_id : row.surface_node_id)}">${esc(isSurface ? fieldLabelFor(row.node_id) : row.surface_label)}</button><small>${esc(row.role)} · ${esc(evidenceLabel(row.evidence_class))} · ${row.receipt_ids.length} receipt${row.receipt_ids.length === 1 ? '' : 's'}</small></li>`;
  const lead = dated.slice(0, limit), rest = dated.slice(limit);
  return `<p class="aperture-field-denominator">${dated.length} dated row${dated.length === 1 ? '' : 's'} in order${undated.length ? ` · ${undated.length} undated listed after, never placed` : ''}</p>
    <ol class="aperture-field-steps">${lead.map(item).join('')}</ol>
    ${rest.length ? `<details class="aperture-field-rows-more"><summary>Show the ${rest.length} later row${rest.length === 1 ? '' : 's'}</summary><ol class="aperture-field-steps">${rest.map(item).join('')}</ol></details>` : ''}
    ${undated.length ? `<details class="aperture-field-rows-more"><summary>${undated.length} undated row${undated.length === 1 ? '' : 's'} (contribute nothing to heat)</summary><ol class="aperture-field-steps aperture-field-steps--undated">${undated.map(item).join('')}</ol></details>` : ''}`;
}
function fieldTileMarkup({ id, title, figure, denominator, body = '' }) {
  return `<article class="aperture-field-tile" data-ap-field-tile="${esc(id)}"><h4>${esc(title)}</h4><p class="aperture-field-figure">${figure}</p><p class="aperture-field-denominator">${denominator}</p>${body}</article>`;
}
function fieldTilesMarkup(facts, selectedId) {
  const node = selectedId ? fieldNode(selectedId) : null;
  const years = facts.rows_by_year;
  return [
    fieldTileMarkup({
      id: 'evidence', title: 'Rows by evidence class',
      figure: `${fieldCount(facts.rows)} <small>rows</small>`,
      denominator: `of ${fieldCount(facts.rows)} participation rows`,
      body: fieldBarsMarkup(facts.rows_by_evidence)
    }),
    fieldTileMarkup({
      id: 'class', title: 'Surfaces by heat class',
      figure: `${fieldCount(facts.surfaces)} <small>surfaces</small>`,
      denominator: `of ${fieldCount(facts.surfaces)} bounded surfaces · class read from surface_type`,
      body: fieldBarsMarkup(facts.surfaces_by_class)
    }),
    fieldTileMarkup({
      id: 'hops', title: 'Hop edges',
      figure: `${fieldCount(facts.hops)} <small>actor pairs</small>`,
      denominator: `${fieldCount(facts.hop_actors)} of ${fieldCount(facts.actors)} actors carry an admitted hop`,
      body: fieldBarsMarkup([
        { label: 'hop-eligible surfaces', count: facts.hop_eligible_surfaces },
        { label: 'surfaces refused as hop bases', count: facts.refused_surfaces },
        { label: 'pairs refused (no overlap)', count: facts.rejected_pairs }
      ]) + `<p class="aperture-field-denominator">of ${fieldCount(facts.surfaces)} surfaces · a hop is a shared surface, never a line between two people</p>`
    }),
    fieldTileMarkup({
      id: 'receipts', title: 'Receipts by archive kind',
      figure: `${fieldCount(facts.receipts)} <small>receipts</small>`,
      denominator: `of ${fieldCount(facts.receipts)} receipts · ${fieldCount(facts.receipts_archived)} with an archive record`,
      body: fieldBarsMarkup(facts.receipts_by_archive)
    }),
    fieldTileMarkup({
      id: 'years', title: `Rows per year ${years.first}–${years.last}`,
      figure: `${fieldCount(years.in_range)} <small>rows</small>`,
      denominator: `of ${fieldCount(facts.rows)} rows · ${fieldCount(years.before)} before ${years.first} · ${fieldCount(years.after)} after ${years.last} · ${fieldCount(years.undated)} undated, not placed`,
      body: fieldYearsMarkup(years)
    }),
    fieldTileMarkup({
      id: 'trajectory', title: node ? `Trajectory · ${esc(shortLabel(node.label, 40))}` : 'Trajectory',
      figure: node ? `${fieldCount(fieldNodeRows(node.id).length)} <small>rows</small>` : '<small>no node selected</small>',
      denominator: node ? `${esc(fieldNodeKind(node).toLowerCase())} · rows oldest first` : 'select a node to list its dated rows in order',
      body: node ? fieldTrajectoryMarkup(node.id) : ''
    })
  ].join('');
}

// --- callout: the inspector, docked beside the selected node --------------------------------------------

// The printed denominator of a node's heat or residue at t: every counted touch
// with its class, weight, decay and date; undated rows named apart.
function fieldHeatMarkup(id) {
  const api = fieldApi();
  const ledger = state.galaxy.ledger;
  const rows = fieldNodeRows(id);
  if (!api?.heat || !ledger || !rows.length) return '';
  const isSurface = String(id).startsWith('surface-');
  const result = api.heat(rows, ledger.range?.last_day ?? null);
  const noun = isSurface ? 'heat' : 'residue';
  const shares = FIELD_CLASS_KEYS
    .filter(([key]) => result.by_class[key] > 0)
    .map(([key, label, color]) => `<span class="aperture-badge" data-ap-heat-class="${key}"><i class="aperture-key aperture-key--heat" style="background:${color}"></i> ${label} ${result.by_class[key].toFixed(2)}</span>`).join('');
  const undated = result.undated.length
    ? `<p class="aperture-muted">Undated, contributes nothing: ${result.undated.map(row => esc(row.surface_label || row.surface_id)).join(' · ')}</p>`
    : '';
  return `<div class="aperture-heat-breakdown" data-ap-field-heat="${esc(id)}" data-ap-heat-day="${result.at_day ?? ''}">
    <h4>${isSurface ? 'Heat' : 'Residue'} at ${esc(result.at_date || 'end of record')}</h4>
    <p class="aperture-heat-breakdown__sum" data-ap-heat-sum>${esc(api.heatBreakdownText(result, { noun, limit: Number.MAX_SAFE_INTEGER }))}</p>
    ${shares ? `<div class="aperture-badge-row">${shares}</div>` : ''}${undated}
    <p class="aperture-muted aperture-heat-breakdown__formula">${FIELD_HEAT_FORMULA}. t is the end of record; years = days / 365.25 from the row's documented start. Every term is one listed row.</p>
  </div>`;
}
function fieldReceiptLinks(ids) {
  const values = unique(ids);
  if (!values.length) return '<p class="aperture-muted">No receipt ids are attached to these rows.</p>';
  return `<ul class="aperture-field-receipts">${values.map(id => `<li><button type="button" class="aperture-field-receipt" data-open-receipt="${esc(id)}" title="${esc(receiptTitle(id))}">${esc(id)}</button></li>`).join('')}</ul>`;
}
function fieldCalloutRecordAction(node) {
  if (node.ontology === 'surface') return state.surfaces.has(node.surface_id) ? `<button type="button" data-ap-action="field-open-record" data-node-id="${esc(node.id)}">Open surface record</button>` : '';
  if (node.ontology === 'person') return state.actors.has(node.id) ? `<button type="button" data-ap-action="field-open-record" data-node-id="${esc(node.id)}">Open public record</button>` : '';
  return node.listed === false ? '' : `<button type="button" data-ap-action="field-open-record" data-node-id="${esc(node.id)}">Open public record</button>`;
}
function fieldInspectorMarkup(id) {
  const api = fieldApi();
  const node = fieldNode(id);
  if (!api || !node) return '';
  const summary = api.nodeLedgerSummary(state.galaxy.ledger, node.id);
  const isSurface = node.ontology === 'surface';
  const count = isSurface ? summary.rows.length : summary.surface_count;
  const countNoun = isSurface ? 'documented participant' : 'documented surface';
  const first = api.dayIso(summary.first_day), last = api.dayIso(summary.last_day);
  const kicker = `${fieldNodeKind(node)}${isSurface && node.surface_type ? ` · ${humanLabel(node.surface_type)}` : ''}${isSurface ? (node.hop_eligible ? ' · hop-eligible' : ' · context-only') : ''}${node.listed === false ? ' · named by rows, not in the list' : ''}`;
  const route = node.ontology === 'person' && routeActorIds().includes(node.id)
    ? `<button type="button" data-ap-action="field-route" data-node-id="${esc(node.id)}">Find route from here</button>` : '';
  return `<p class="aperture-kicker">${esc(kicker)}</p><h3>${esc(node.label)}</h3>
    <div class="aperture-metric-grid"><div><strong>${fieldCount(count)}</strong><span>${countNoun}${count === 1 ? '' : 's'}</span></div><div><strong>${fieldCount(summary.rows_total)}</strong><span>participation row${summary.rows_total === 1 ? '' : 's'}</span></div></div>
    ${summary.rows_total
      ? `<p class="network-date-span">${esc(first ?? '…')} → ${esc(last ?? '…')}${summary.open_ended ? ' · no end recorded' : ''}${summary.rows_undated ? ` · ${summary.rows_undated} undated row${summary.rows_undated === 1 ? '' : 's'}` : ''}<br>${summary.receipt_ids.length} receipt${summary.receipt_ids.length === 1 ? '' : 's'} across these rows</p>`
      : '<p class="aperture-muted">No participation row names this object in this release. It is listed in the ledger and drawn without heat; the field never fades it.</p>'}
    ${fieldHeatMarkup(node.id)}
    ${summary.rows_total ? `<h4>Rows in order</h4>${fieldTrajectoryMarkup(node.id, { limit: FIELD_CALLOUT_LIMIT })}` : ''}
    <h4>Receipts</h4>${fieldReceiptLinks(summary.receipt_ids)}
    <div class="aperture-actions">${fieldCalloutRecordAction(node)}${route}<button type="button" data-ap-action="field-open-network" data-node-id="${esc(node.id)}">Open in Network</button><button type="button" class="aperture-secondary-button" data-ap-action="field-clear">Clear selection</button></div>`;
}
function fieldWelcomeMarkup(facts) {
  const anchor = fieldAnchorId();
  const starts = [anchor, 'ben-warner', 'electric-twin'].filter((id, index, list) => id && fieldNode(id) && list.indexOf(id) === index);
  return `<div class="network-welcome"><p class="aperture-kicker">The field</p><h3>Every mark is one ledger row.</h3>
    <p>${fieldCount(facts.nodes)} nodes (${fieldCount(facts.actors)} actors, ${fieldCount(facts.organizations)} organizations, ${fieldCount(facts.surfaces)} bounded surfaces) joined by ${fieldCount(facts.links)} participation rows, one link each. Node size, halo and colour are the printed heat at ${esc(facts.last_date ?? 'the end of record')}; nothing else sizes or colours a node.</p>
    <p class="aperture-muted">${FIELD_HEAT_FORMULA}.</p>
    ${starts.length ? `<div class="network-starts">${starts.map(id => `<button type="button" data-ap-action="field-select" data-node-id="${esc(id)}">${esc(fieldLabelFor(id))}<span aria-hidden="true">↗</span></button>`).join('')}</div>` : ''}
    <dl class="network-guide"><div><dt>Click a node or a name</dt><dd>Highlight its rows and read every heat term</dd></div><div><dt>Drag the field</dt><dd>Pan</dd></div><div><dt>Wheel or pinch</dt><dd>Zoom</dd></div></dl>
    <p class="network-note aperture-muted">Co-presence is never coordination. The field shows documented shared context and nothing more.</p></div>`;
}
function fieldOverviewRow(row, selectedId) {
  const isSurfaceSelected = String(selectedId || '').startsWith('surface-');
  const selected = selectedId && (row.node_id === selectedId || row.surface_node_id === selectedId);
  return `<tr class="${selected && !isSurfaceSelected && row.node_id === selectedId ? 'is-selected' : ''}"><td>${esc(row.time_label)}${row.precision === 'year' ? '<small>year precision</small>' : row.precision === 'month' ? '<small>month precision</small>' : ''}</td><td><button type="button" class="aperture-table-link" data-ap-field-node="${esc(row.surface_node_id)}">${esc(row.surface_label)}</button><small>${esc(humanLabel(row.surface_type || 'surface'))}</small></td><td><button type="button" class="aperture-table-link" data-ap-field-node="${esc(row.node_id)}">${esc(fieldLabelFor(row.node_id))}</button><small>${esc(row.participant_type)}</small></td><td>${esc(row.role)}</td><td>${evidenceBadge(row.evidence_class)}</td><td>${row.receipt_ids.length}</td></tr>`;
}
function renderFieldOverview(facts, selectedId) {
  const api = fieldApi();
  const ledger = state.galaxy.ledger;
  if (!api || !ledger) return;
  const node = selectedId ? fieldNode(selectedId) : null;
  const rows = node ? api.nodeLedgerSummary(ledger, node.id).rows : ledger.rows;
  setOverview({
    title: node ? `Participation rows of ${node.label}.` : 'Every participation row on the field.',
    status: `${fieldCount(rows.length)} row${rows.length === 1 ? '' : 's'}, oldest first, undated rows last. ${node ? 'Each row is one link at this node.' : 'Each row is one link on the field.'}`,
    headers: ['Documented', 'Bounded surface', 'Participant', 'Recorded role', 'Evidence', 'Receipts'],
    pageKey: `field:${node?.id ?? 'all'}`,
    rows: rows.map(row => fieldOverviewRow(row, node?.id ?? null))
  });
}

// --- stage, galaxy renderer and lifecycle ------------------------------------------------------------

function setFieldStageActive(active) {
  const host = $('#aperture-field', state.root);
  if (!host) return;
  const svg = $('#aperture-stage', state.root);
  const tiles = $('#aperture-field-tiles', state.root);
  const legend = $('#aperture-stage-legend', state.root);
  const badge = $('#aperture-renderer-badge', state.root);
  const stage = $('#aperture-field-stage', state.root);
  if (stage && stage.getAttribute('aria-label') !== FIELD_STAGE_LABEL) stage.setAttribute('aria-label', FIELD_STAGE_LABEL);
  host.hidden = !active;
  if (tiles) tiles.hidden = !active;
  if (svg) {
    svg.hidden = active;
    svg.style.display = active ? 'none' : '';
  }
  if (legend) {
    if (!legend.dataset.defaultMarkup) legend.dataset.defaultMarkup = legend.innerHTML;
    legend.innerHTML = active ? fieldLegendMarkup() : legend.dataset.defaultMarkup;
  }
  if (badge) {
    badge.textContent = active ? 'Ledger field' : 'SVG semantic map';
    badge.dataset.engine = active ? 'field' : 'svg';
  }
  state.root.dataset.apertureField = String(active);
  if (state.galaxy) {
    state.galaxy.active = active;
    // A mode switch shows the stage the visitor just asked for; the observer
    // does not always report a display toggle, so assume on-screen here and let
    // it correct that if the stage is in fact scrolled away.
    if (active) state.galaxy.intersecting = true;
  }
  syncGalaxyAnimation();
  if (!active) undockFieldCallout();
}
function deactivateFieldStage() {
  const host = $('#aperture-field', state.root);
  if (host && host.hidden === false) setFieldStageActive(false);
}
function showFieldFallback(message) {
  const note = $('#aperture-field-fallback', state.root);
  if (!note) return;
  note.textContent = message || 'The live field needs WebGL and the hosted explorer. The counts, the heat terms, the tiles and the rows here are complete; Network draws the SVG map.';
  note.hidden = false;
  if (state.root) state.root.dataset.apertureFieldLayout = 'unavailable';
}
function hideFieldFallback() {
  const note = $('#aperture-field-fallback', state.root);
  if (note) note.hidden = true;
}
// Every continuous loop the field owns (the renderer's layout and render loop,
// the selection pulse) runs only while the stage is on screen, the document is
// visible and Field is the active mode. root.dataset.apertureFieldAnimation
// reports the state for tests.
function galaxyAnimationAllowed() {
  const galaxy = state.galaxy;
  if (state.mode !== 'field' || !galaxy?.renderer || galaxy.active === false) return false;
  if (galaxy.intersecting === false) return false;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
  return true;
}
function syncGalaxyAnimation() {
  const renderer = state.galaxy?.renderer;
  const running = Boolean(renderer) && galaxyAnimationAllowed();
  if (renderer) {
    if (running) renderer.resume(); else renderer.pause();
  }
  if (state.root) state.root.dataset.apertureFieldAnimation = running ? 'running' : 'paused';
}
function bindGalaxyLifecycle(host) {
  const galaxy = state.galaxy;
  if (!galaxy || galaxy.lifecycleBound) return;
  galaxy.lifecycleBound = true;
  galaxy.intersecting = true;
  if ('IntersectionObserver' in window) {
    galaxy.observer = new IntersectionObserver(entries => {
      galaxy.intersecting = entries.some(entry => entry.isIntersecting);
      syncGalaxyAnimation();
    }, { threshold: 0 });
    galaxy.observer.observe(host);
  }
  document.addEventListener('visibilitychange', syncGalaxyAnimation);
}
function handleGalaxyViewChange(event) {
  if (event?.type === 'settled' && state.root) state.root.dataset.apertureFieldLayout = 'settled';
  dockFieldCallout();
}
async function renderGalaxy({ focus = false } = {}) {
  const galaxy = state.galaxy;
  if (!state.root || state.mode !== 'field' || !galaxy || galaxy.failed || galaxy.loading) return;
  const host = $('#aperture-field-stage', state.root);
  if (!host) return;
  if (typeof globalThis.loadCliffordSocialField !== 'function' || !fieldWebGlAvailable()) {
    showFieldFallback();
    return;
  }
  galaxy.loading = true;
  try {
    if (!galaxy.renderer) {
      const api = await globalThis.loadCliffordSocialField();
      galaxy.api = api;
      if (!api.supportsWebGlAtlas?.() || typeof api.createGalaxyFieldRenderer !== 'function') { showFieldFallback(); return; }
      if (!ensureFieldModel()) { showFieldFallback('The field module did not load, so the field cannot be drawn.'); return; }
      galaxy.renderer = await api.createGalaxyFieldRenderer({
        host,
        reducedMotion: fieldReducedMotion(),
        onNodeSelect: id => selectFieldNode(id, { focus: Boolean(id) }),
        onViewChange: handleGalaxyViewChange
      });
      bindGalaxyLifecycle(host);
    }
    if (state.mode !== 'field') return;
    if (!galaxy.rendered) {
      galaxy.renderer.render(ensureFieldModel());
      galaxy.rendered = true;
    }
    hideFieldFallback();
    galaxy.renderer.select(state.field.selectedId);
    if (focus && state.field.selectedId) galaxy.renderer.focus(state.field.selectedId);
    syncGalaxyAnimation();
    dockFieldCallout();
  } catch (error) {
    galaxy.failed = true;
    showFieldFallback('The WebGL field could not start on this device. The counts, the heat terms, the tiles and the rows here are complete.');
    console.warn('Ledger field renderer unavailable.', error);
  } finally {
    galaxy.loading = false;
  }
}
// The callout is the inspector itself, docked beside the selected node on
// desktop widths; on a phone the inspector stays the bottom sheet.
function undockFieldCallout() {
  const inspector = $('#aperture-inspector', state.root);
  const leader = $('#aperture-field-leader', state.root);
  if (inspector) {
    inspector.classList.remove('is-docked');
    inspector.style.left = inspector.style.top = inspector.style.width = '';
    delete inspector.dataset.dockSide;
  }
  if (leader) leader.hidden = true;
}
function dockFieldCallout() {
  const inspector = $('#aperture-inspector', state.root);
  const layout = inspector?.parentElement;
  const host = $('#aperture-field-stage', state.root);
  const leader = $('#aperture-field-leader', state.root);
  const renderer = state.galaxy?.renderer;
  const id = state.field?.selectedId;
  if (!inspector || !layout || !host || !renderer || !id || state.mode !== 'field' || isMobile()) { undockFieldCallout(); return; }
  const point = renderer.screenPosition(id);
  if (!point) { undockFieldCallout(); return; }
  const hostRect = host.getBoundingClientRect();
  const layoutRect = layout.getBoundingClientRect();
  const offsetX = hostRect.left - layoutRect.left, offsetY = hostRect.top - layoutRect.top;
  const width = Math.max(240, Math.min(FIELD_CALLOUT_WIDTH, hostRect.width - 24));
  const cardHeight = inspector.offsetHeight || 320;
  const gap = Math.max(20, point.radius + 16);
  let left = point.x + gap, side = 'right';
  if (left + width > hostRect.width - 12) { left = point.x - gap - width; side = 'left'; }
  left = Math.max(12, Math.min(hostRect.width - width - 12, left));
  const top = Math.max(12, Math.min(Math.max(12, hostRect.height - cardHeight - 12), point.y - 48));
  inspector.classList.add('is-docked');
  inspector.dataset.dockSide = side;
  inspector.style.left = `${Math.round(offsetX + left)}px`;
  inspector.style.top = `${Math.round(offsetY + top)}px`;
  inspector.style.width = `${Math.round(width)}px`;
  if (leader) {
    const edgeX = side === 'right' ? left : left + width;
    const edgeY = Math.max(top + 24, Math.min(top + cardHeight - 24, point.y));
    const dx = edgeX - point.x, dy = edgeY - point.y;
    const length = Math.hypot(dx, dy);
    leader.hidden = !point.visible || length < gap;
    leader.style.left = `${Math.round(point.x)}px`;
    leader.style.top = `${Math.round(point.y)}px`;
    leader.style.width = `${Math.round(length)}px`;
    leader.style.transform = `rotate(${Math.atan2(dy, dx)}rad)`;
  }
}

// --- selection, search, actions ---------------------------------------------------------------------

function selectFieldNode(id, { history = 'push', focus = false } = {}) {
  const node = fieldNode(id);
  const next = node ? node.id : null;
  const changed = next !== state.field.selectedId;
  state.field.selectedId = next;
  if (node) {
    if (node.ontology === 'person' && state.actors.has(node.id)) state.selectedActorId = node.id;
    if (node.ontology === 'surface' && state.surfaces.has(node.surface_id)) state.selectedSurfaceId = node.surface_id;
  }
  if (state.overview) state.overview.page = 1;
  renderFieldMode({ focus: focus && Boolean(node) });
  if (changed) commitApertureAddress(history);
  if (node && isMobile()) { state.sheetOpen = true; syncInspectorSheet(); }
}
function fieldSearchOptions() {
  const galaxy = state.galaxy;
  if (galaxy.searchOptions) return galaxy.searchOptions;
  const field = ensureFieldModel();
  if (!field) return '';
  galaxy.searchOptions = field.nodes
    .filter(node => node.listed !== false)
    .map(node => `<option value="${esc(node.label)}">${esc(node.ontology === 'surface' ? humanLabel(node.surface_type || 'surface') : node.ontology)} · ${esc(node.id)}</option>`)
    .join('');
  return galaxy.searchOptions;
}
function findFieldSearchNode(value) {
  const needle = String(value || '').trim().toLowerCase();
  const field = ensureFieldModel();
  if (!needle || !field) return null;
  const byId = field.nodeById.get(needle) ?? field.nodeById.get(`surface-${needle}`);
  if (byId) return byId;
  const rows = node => node.ledger_row_count ?? 0;
  const exact = field.nodes.filter(node => String(node.label).toLowerCase() === needle);
  if (exact.length) return exact.sort((a, b) => rows(b) - rows(a))[0];
  const partial = field.nodes.filter(node => String(node.label).toLowerCase().includes(needle));
  return partial.length === 1 ? partial[0] : null;
}
function openFieldSearch(value) {
  const node = findFieldSearchNode(value);
  if (!node) return false;
  selectFieldNode(node.id, { focus: true });
  return true;
}
function fieldControlsMarkup() {
  return `<label class="aperture-control aperture-control--start"><span>Find in field</span><input id="ap-field-search" type="search" list="ap-field-search-options" placeholder="Find a person, organization or surface…" autocomplete="off"><datalist id="ap-field-search-options">${fieldSearchOptions()}</datalist></label>
    <div class="aperture-control-buttons" aria-label="Field view controls"><button type="button" data-ap-action="field-zoom-out" aria-label="Zoom out">−</button><button type="button" data-ap-action="field-zoom-in" aria-label="Zoom in">+</button><button type="button" data-ap-action="field-fit">Fit</button><button type="button" data-ap-action="field-clear"${state.field?.selectedId ? '' : ' disabled'}>Clear</button></div>
    <details class="network-options"><summary>Options</summary><div class="network-option-fields">
      <p class="aperture-muted">${FIELD_HEAT_FORMULA}; t = end of record. Node size, halo and colour carry nothing else. A link is one participation row, coloured by its evidence class; no line joins two people. Layout position carries no meaning.</p>
      <div class="network-save-tools">${addressActionMarkup()}</div>
    </div></details>`;
}
function openFieldRecord(id) {
  const node = fieldNode(id);
  if (!node) return;
  if (node.ontology === 'surface') openRecord('surface', node.surface_id);
  else if (node.ontology === 'person') openRecord('actor', node.id);
  else openRecord('organization', node.id);
}
function openFieldNodeInNetwork(id) {
  const node = fieldNode(id);
  if (!node) { setMode('map'); return; }
  if (node.ontology === 'surface' && state.surfaces.has(node.surface_id)) {
    setMode('map', { history: 'none' });
    selectMapSurface(node.surface_id);
    return;
  }
  state.map.selectedFieldNodeId = node.id;
  state.map.hasExplicitFocus = true;
  setMode('map');
  if (state.actors.has(node.id) && typeof selectApertureFieldActor === 'function') selectApertureFieldActor(node.id);
}
function handleFieldAction(button) {
  const action = button?.dataset?.apAction;
  if (!action || !action.startsWith('field-')) return false;
  const renderer = state.galaxy?.renderer;
  if (action === 'field-zoom-in') { renderer?.zoom('in'); return true; }
  if (action === 'field-zoom-out') { renderer?.zoom('out'); return true; }
  if (action === 'field-fit') { renderer?.fit(); return true; }
  if (action === 'field-clear') { selectFieldNode(null); return true; }
  if (action === 'field-select') { selectFieldNode(button.dataset.nodeId, { focus: true }); return true; }
  if (action === 'field-open-record') { openFieldRecord(button.dataset.nodeId); return true; }
  if (action === 'field-open-network') { openFieldNodeInNetwork(button.dataset.nodeId); return true; }
  if (action === 'field-route') {
    const id = button.dataset.nodeId;
    if (id && routeActorIds().includes(id)) state.route.fromId = id;
    if (state.route.fromId === state.route.toId) state.route.toId = state.data.hopGraph.anchor_actor_id;
    state.route.selectedActorId = null;
    state.route.selectedStep = null;
    setMode('route');
    return true;
  }
  return false;
}
function fieldSnapshot() {
  return { selectedId: state.field?.selectedId ?? null };
}
function applyFieldSnapshot(snapshot) {
  if (!state.field || snapshot === undefined) return;
  const id = snapshot?.selectedId ?? null;
  state.field.selectedId = id && fieldNode(id) ? fieldNode(id).id : null;
}

// --- export view: the field as a publication packet ---------------------------------------------------

function currentFieldExportView() {
  const api = fieldApi();
  const facts = fieldFacts();
  if (!api || !facts) return { counts: {}, heat_formula: FIELD_HEAT_FORMULA, selected: null, rows: [] };
  const ledger = state.galaxy.ledger;
  const node = fieldNode(state.field.selectedId);
  const summary = node ? api.nodeLedgerSummary(ledger, node.id) : null;
  const rows = (summary ? summary.rows : ledger.rows).map(row => ({
    row_id: row.row_id,
    time_start: row.time_start,
    time_end: row.time_end,
    time_label: row.time_label,
    precision: row.precision,
    surface_id: row.surface_id,
    surface_label: row.surface_label,
    surface_type: row.surface_type,
    participant_type: row.participant_type,
    participant_id: row.node_id,
    participant_label: fieldLabelFor(row.node_id),
    role: row.role,
    evidence_class: row.evidence_class,
    receipt_ids: row.receipt_ids
  }));
  const heatRows = node ? fieldNodeRows(node.id) : [];
  const heatResult = heatRows.length ? api.heat(heatRows, ledger.range?.last_day ?? null) : null;
  const isSurface = node?.ontology === 'surface';
  return {
    counts: {
      nodes: facts.nodes, actors: facts.actors, organizations: facts.organizations, surfaces: facts.surfaces,
      rows: facts.rows, actor_rows: facts.actor_rows, organization_rows: facts.organization_rows, undated_rows: facts.undated_rows,
      receipts: facts.receipts, hops: facts.hops, first_date: facts.first_date, last_date: facts.last_date
    },
    heat_formula: FIELD_HEAT_FORMULA,
    heat_at: facts.last_date,
    selected: node ? {
      node_id: node.id,
      label: node.label,
      kind: node.ontology,
      documented_count: isSurface ? summary.rows.length : summary.surface_count,
      count_kind: isSurface ? 'participants' : 'surfaces',
      rows_total: summary.rows_total,
      rows_undated: summary.rows_undated,
      heat: heatResult ? {
        noun: isSurface ? 'heat' : 'residue',
        at_date: heatResult.at_date,
        total: heatResult.total,
        by_class: heatResult.by_class,
        touches: heatResult.touches.map(touch => ({ date: touch.date, heat_class: touch.heat_class, weight: touch.weight, years: touch.years, contribution: touch.contribution, surface_id: touch.row.surface_id })),
        undated_rows: heatResult.undated.length
      } : null
    } : null,
    rows,
    display: typeof boundedOverviewDisplay === 'function' ? boundedOverviewDisplay() : null
  };
}

// --- render ---------------------------------------------------------------------------------------------

function renderFieldMode(options = {}) {
  if (!state.root) return;
  const host = $('#aperture-field', state.root);
  if (!host) return;
  setFieldStageActive(true);
  const facts = fieldFacts();
  const chrome = $('#aperture-field-chrome', state.root);
  const tiles = $('#aperture-field-tiles', state.root);
  if (!facts) {
    if (chrome) chrome.innerHTML = '<div class="aperture-field-brand"><span class="aperture-field-brand__mark">CN</span><span>CLIFFORD NUMBER · FIELD</span></div>';
    if (tiles) tiles.innerHTML = '';
    showFieldFallback('The field module did not load, so the ledger field cannot be counted or drawn here. Network, Timeline, Route and Roster still read the same artifacts.');
    setTelemetry(['Field'], []);
    setInspector('The field', '<p class="aperture-kicker">The field</p><h3>Field module unavailable.</h3><p>Open Network for the SVG map of the same ledger.</p>');
    return;
  }
  const id = state.field.selectedId && fieldNode(state.field.selectedId) ? state.field.selectedId : null;
  state.field.selectedId = id;
  const node = id ? fieldNode(id) : null;
  if (chrome) chrome.innerHTML = fieldCountersMarkup(facts, id);
  if (tiles) tiles.innerHTML = fieldTilesMarkup(facts, id);
  const legend = $('#aperture-stage-legend', state.root);
  if (legend) legend.innerHTML = fieldLegendMarkup();
  setTelemetry(['Field', node ? node.label : 'Whole ledger'], [
    { value: fieldCount(facts.nodes), label: 'nodes' },
    { value: fieldCount(facts.links), label: 'rows drawn' },
    { value: fieldCount(facts.receipts), label: 'receipts' }
  ]);
  setInspector(node ? node.label : 'The field', node ? fieldInspectorMarkup(node.id) : fieldWelcomeMarkup(facts));
  renderFieldOverview(facts, id);
  const clear = $('[data-ap-action="field-clear"]', state.root);
  if (clear) clear.disabled = !id;
  queueMicrotask(() => renderGalaxy(options));
  dockFieldCallout();
}
