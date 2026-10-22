// Ledger timeline: the Visual Aperture's arrival mode ('timeline'). A classic
// script in the loader order after part-10 (the shared handlers) and before the
// social-field runtime; parts 3, 9, 10 and 11 call the functions below by name.
// Everything drawn here comes from layoutTimeline (visual-aperture-timeline.mjs):
// one mark per ledger row, a hop basis only as a (day, surface) column whose
// segments touch the lanes of that surface's participants, a dense roster as
// one contained block. No line is ever drawn between two people; the reserved
// pair selector must never match anything in this stage.

const TIMELINE_MODE_LABELS = Object.freeze({ timeline: 'Timeline', map: 'Explore', route: 'Route', surface: 'Roster' });
const TIMELINE_BY_LABELS = Object.freeze({ actor: 'People', organization: 'Organizations', type: 'Surface types' });
const TIMELINE_KIND_LABELS = Object.freeze({ actor: 'Person', organization: 'Organization', type: 'Surface type' });
const TIMELINE_HOP_LABELS = Object.freeze({ all: 'Hop and context surfaces', hop: 'Hop surfaces only', context: 'Context surfaces only' });
const TIMELINE_EVIDENCE_FLOORS = new Set(['open', 'reported', 'primary_public', 'official']);
const TIMELINE_AXIS_HEIGHT = 36;
const TIMELINE_AXIS_HEIGHT_PHONE = 30;
const TIMELINE_OVERVIEW_HEIGHT = 40;
const TIMELINE_OVERVIEW_HEIGHT_PHONE = 34;
const TIMELINE_PHONE_CONTAINER = 480;
const TIMELINE_WHEEL_STEP = .12;
const TIMELINE_MIN_DOMAIN_DAYS = 14;
const TIMELINE_YEAR_CHIP_PADDING_DAYS = 15;
let timelineResizeObserver = null;
let timelineResizeFrame = 0;
let timelineStageFrame = 0;
let timelineWheelTimer = null;
let timelineDrag = null;

const timelineRound = value => Math.round(Number(value) * 100) / 100;

function timelineModel() {
  return state.timeline?.model ?? null;
}

function timelineRow(key) {
  if (!key) return null;
  return state.timeline?.rowIndex?.get(key) ?? timelineModel()?.rowsByKey.get(key) ?? null;
}

function timelineModeLabel(mode = state.mode) {
  return TIMELINE_MODE_LABELS[mode] || humanLabel(mode);
}

// --- defaults, search index and the suggested first click ----------------------------------

function initializeTimelineDefaults() {
  const current = state.timeline ?? {};
  const model = current.model ?? null;
  state.timeline = {
    ...current,
    model,
    by: 'actor',
    from: '',
    to: '',
    windowFrom: '',
    windowTo: '',
    lanes: [],
    selectedKey: null,
    focusKey: null,
    followSelected: false,
    evidenceFloor: 'open',
    hop: 'all',
    layout: null,
    plotWidth: 0,
    rowIndex: new Map(),
    search: [],
    suggestion: null
  };
  if (!model) return;
  for (const row of model.rows) state.timeline.rowIndex.set(row.key, row);
  for (const mark of model.surfaceMarks) state.timeline.rowIndex.set(mark.key, mark);
  state.timeline.search = timelineSearchIndex(model);
  state.timeline.suggestion = timelineSuggestion(model);
}

function timelineSearchIndex(model) {
  const entries = [];
  for (const kind of TIMELINE_BY) {
    for (const lane of model.lanes[kind].values()) {
      entries.push({ kind, id: lane.id, label: lane.label, meta: `${TIMELINE_KIND_LABELS[kind]} · ${lane.row_count} row${lane.row_count === 1 ? '' : 's'} · ${lane.surface_count} surface${lane.surface_count === 1 ? '' : 's'}` });
    }
  }
  return entries.sort((a, b) => a.label.localeCompare(b.label) || a.kind.localeCompare(b.kind));
}

function timelineSearchOptions() {
  return (state.timeline?.search ?? []).map(entry => `<option value="${esc(entry.label)}" data-kind="${esc(entry.kind)}" data-id="${esc(entry.id)}">${esc(entry.meta)}</option>`).join('');
}

function findTimelineSearchEntry(value) {
  const needle = String(value || '').trim().toLowerCase();
  if (!needle) return null;
  const entries = state.timeline?.search ?? [];
  const exact = entries.filter(entry => entry.label.toLowerCase() === needle || entry.id.toLowerCase() === needle);
  if (exact.length === 1) return exact[0];
  if (exact.length > 1) return exact.find(entry => entry.kind === state.timeline.by) ?? exact[0];
  const partial = entries.filter(entry => entry.label.toLowerCase().includes(needle));
  return partial.length === 1 ? partial[0] : null;
}

// The column whose per-lane segments touch the most named lanes in the default
// People view is the honest first click: it is the day most people with a lane
// of their own share one surface.
function timelineSuggestion(model) {
  if (!model.range.first_day) return null;
  const layout = layoutTimeline(model, { plotWidth: 690, domainFrom: model.range.first_day, domainTo: isoFromDayIndex(model.range.last_day_index + TIMELINE_DOMAIN_PADDING_DAYS) });
  const named = new Set(layout.lanes.filter(lane => lane.kind === 'entity').map(lane => lane.id));
  const ranked = layout.columns
    .map(column => ({ column, named: column.segments.filter(segment => named.has(segment.laneId)).length }))
    .sort((a, b) => b.named - a.named || a.column.day - b.column.day);
  const best = ranked[0];
  if (!best || best.named < 2) return null;
  return { key: best.column.key, iso_day: best.column.iso_day, year: best.column.iso_day.slice(0, 4), surface_label: best.column.surface_label, actor_count: best.column.actor_ids.length, basis_count: best.column.basis_count, named: best.named };
}

// --- measurement and layout -----------------------------------------------------------------

function timelineContainerWidth() {
  const host = $('#aperture-timeline', state.root);
  const measured = host?.clientWidth || host?.parentElement?.clientWidth || 0;
  if (measured > 0) return measured;
  return isMobile() ? 296 : 878;
}

function timelineMetricsFor(containerWidth) {
  return containerWidth <= TIMELINE_PHONE_CONTAINER ? TIMELINE_PHONE_METRICS : TIMELINE_DESKTOP_METRICS;
}

function currentTimelineLayout() {
  const model = timelineModel();
  if (!model) return null;
  const containerWidth = timelineContainerWidth();
  const metrics = timelineMetricsFor(containerWidth);
  const plotWidth = Math.max(120, containerWidth - metrics.labelWidth - metrics.padding * 2);
  const t = state.timeline;
  const layout = layoutTimeline(model, {
    ...metrics,
    by: t.by,
    laneIds: t.lanes,
    domainFrom: t.from,
    domainTo: t.to,
    windowFrom: t.windowFrom,
    windowTo: t.windowTo,
    evidenceFloor: t.evidenceFloor,
    hop: t.hop,
    plotWidth
  });
  layout.containerWidth = containerWidth;
  layout.phone = metrics === TIMELINE_PHONE_METRICS;
  return layout;
}

function timelineX(layout, day) {
  const days = Math.max(1, layout.domain.to_day - layout.domain.from_day);
  return layout.plotLeft + ((day - layout.domain.from_day) / days) * layout.plotWidth;
}

function timelineDayAt(layout, x) {
  const days = Math.max(1, layout.domain.to_day - layout.domain.from_day);
  return layout.domain.from_day + ((x - layout.plotLeft) / layout.plotWidth) * days;
}

function timelineOverviewX(layout, day) {
  const days = Math.max(1, layout.overview.to_day - layout.overview.from_day);
  return layout.plotLeft + ((day - layout.overview.from_day) / days) * layout.plotWidth;
}

function timelineOverviewDayAt(layout, x) {
  const days = Math.max(1, layout.overview.to_day - layout.overview.from_day);
  return layout.overview.from_day + ((x - layout.plotLeft) / layout.plotWidth) * days;
}

// --- window token (SPEC fix e: the cursor is a window [from, to]) ---------------------------

function timelineWindowToken() {
  const { windowFrom, windowTo } = state.timeline;
  if (!windowFrom && !windowTo) return '';
  const from = windowFrom || windowTo;
  const to = windowTo || windowFrom;
  return `${from}..${to}`;
}

function applyTimelineWindowToken(token) {
  const text = String(token ?? '').trim();
  const t = state.timeline;
  if (!text) { t.windowFrom = ''; t.windowTo = ''; return; }
  const [first, second = first] = text.split('..');
  const from = isoFromDayIndex(dayIndex(first));
  const to = isoFromDayIndex(dayIndex(second, true));
  if (!from || !to) { t.windowFrom = ''; t.windowTo = ''; return; }
  t.windowFrom = from <= to ? from : to;
  t.windowTo = from <= to ? to : from;
}

function timelineWindowActive() {
  return Boolean(state.timeline.windowFrom || state.timeline.windowTo);
}

// --- snapshot (part-11 apertureSnapshot / applyApertureSnapshot) ---------------------------

function timelineSnapshot() {
  const t = state.timeline;
  const key = t.selectedKey && !String(t.selectedKey).startsWith('aggregate::') ? t.selectedKey : null;
  return {
    by: t.by,
    from: t.from,
    to: t.to,
    cursor: timelineWindowToken(),
    lanes: [...t.lanes],
    selectedKey: key,
    evidenceFloor: t.evidenceFloor,
    hop: t.hop
  };
}

function timelineIsoDay(value) {
  const text = String(value ?? '').trim();
  return /^\d{4}-\d{2}-\d{2}$/.test(text) && dayIndex(text) != null ? text : '';
}

function resolveTimelineSelectionKey(key) {
  const model = timelineModel();
  if (!model || !key) return null;
  const text = String(key);
  if (text.startsWith('lane::')) {
    const id = text.slice(6);
    const known = model.lanes[state.timeline.by]?.has(id) || id === `strip:${state.timeline.by}` || model.dense.some(block => `block:${block.surface_id}` === id);
    return known ? text : null;
  }
  if (text.startsWith('column::')) return [...model.hopDays.values()].some(hopDay => `column::${hopDay.iso_day}::${hopDay.surface_id}` === text) ? text : null;
  if (text.startsWith('dense::')) return model.dense.some(block => block.key === text) ? text : null;
  if (text.startsWith('aggregate::')) return null;
  return timelineRow(text) ? text : null;
}

function applyTimelineSnapshot(snapshot) {
  const model = timelineModel();
  const t = state.timeline;
  const s = snapshot ?? {};
  t.by = TIMELINE_BY.includes(s.by) ? s.by : 'actor';
  t.from = timelineIsoDay(s.from);
  t.to = timelineIsoDay(s.to);
  applyTimelineWindowToken(s.cursor);
  const laneMap = model?.lanes?.[t.by];
  const requested = Array.isArray(s.lanes) ? s.lanes : String(s.lanes ?? '').split(',').map(value => value.trim());
  t.lanes = laneMap ? unique(requested).filter(id => laneMap.has(id)).slice(0, TIMELINE_MAX_LANES) : [];
  t.evidenceFloor = TIMELINE_EVIDENCE_FLOORS.has(s.evidenceFloor) ? s.evidenceFloor : 'open';
  t.hop = TIMELINE_HOP_FILTERS.includes(s.hop) ? s.hop : 'all';
  t.selectedKey = resolveTimelineSelectionKey(s.selectedKey);
  t.focusKey = t.selectedKey;
  t.followSelected = Boolean(t.selectedKey);
  const row = t.selectedKey ? timelineRow(t.selectedKey) : null;
  if (row) {
    if (row.participant_type === 'actor') state.selectedActorId = row.entity_id;
    state.selectedSurfaceId = row.surface_id;
  }
}

// --- stage activation ----------------------------------------------------------------------

function setTimelineStageActive(active) {
  const host = $('#aperture-timeline', state.root);
  if (!host) return;
  const svg = $('#aperture-stage', state.root);
  const guide = $('.aperture-stage-guide', state.root);
  const legend = $('#aperture-stage-legend', state.root);
  const badge = $('#aperture-renderer-badge', state.root);
  host.hidden = !active;
  if (svg) {
    svg.hidden = active;
    svg.style.display = active ? 'none' : '';
  }
  if (guide) {
    if (!guide.dataset.defaultMarkup) guide.dataset.defaultMarkup = guide.innerHTML;
    // The pointer hint is its own span so the phone sheet (visual-aperture-
    // timeline.css, max-width 760px) can drop it: there is no Ctrl + wheel on
    // a touch screen, and the shorter caption fits beside the badge there.
    guide.innerHTML = active
      ? '<strong>Timeline</strong><span>one mark per ledger row &middot; click a mark</span><span class="aperture-stage-guide-pointer">&middot; Ctrl + wheel = zoom time</span>'
      : guide.dataset.defaultMarkup;
  }
  if (legend) {
    if (!legend.dataset.defaultMarkup) legend.dataset.defaultMarkup = legend.innerHTML;
    legend.innerHTML = active ? timelineLegendMarkup() : legend.dataset.defaultMarkup;
  }
  if (badge) {
    badge.textContent = active ? 'Ledger timeline' : 'SVG semantic map';
    badge.dataset.engine = active ? 'timeline' : 'svg';
  }
  state.root.dataset.apertureTimeline = String(active);
}

function deactivateTimelineStage() {
  const host = $('#aperture-timeline', state.root);
  if (host && host.hidden === false) setTimelineStageActive(false);
}

function timelineLegendMarkup() {
  return `<span><i class="aperture-time-key aperture-time-key--day"></i> one documented day = one ledger row</span>
    <span><i class="aperture-time-key aperture-time-key--span"></i> observed span</span>
    <span><i class="aperture-time-key aperture-time-key--hop"></i> hop-eligible surface (amber outline)</span>
    <span><i class="aperture-time-key aperture-time-key--column"></i> shared surface on one day, never a line between people</span>
    <span><i class="aperture-time-key aperture-time-key--official"></i> official</span>
    <span><i class="aperture-time-key aperture-time-key--primary_public"></i> primary public</span>
    <span><i class="aperture-time-key aperture-time-key--reported"></i> reported</span>
    <span><i class="aperture-time-key aperture-time-key--block"></i> dense roster, one contained object</span>`;
}

// --- rendering -----------------------------------------------------------------------------

function renderTimelineMode() {
  const model = timelineModel();
  const host = $('#aperture-timeline', state.root);
  if (!model || !host) return;
  setTimelineStageActive(true);
  const layout = currentTimelineLayout();
  state.timeline.layout = layout;
  state.timeline.plotWidth = layout.plotWidth;
  host.innerHTML = buildTimelineStage(layout);
  bindTimelineStage(host);
  setTimelineTelemetry(layout);
  const selection = timelineSelection(layout);
  setInspector(timelineInspectorLabel(selection, layout), timelineInspector(selection, layout));
  renderTimelineOverview(layout);
  if (state.export?.open) queueMicrotask(refreshPublicationExport);
  syncTimelineFocus(host);
}

function refreshTimelineStageOnly() {
  const host = $('#aperture-timeline', state.root);
  if (!host || state.mode !== 'timeline') return;
  const layout = currentTimelineLayout();
  state.timeline.layout = layout;
  host.innerHTML = buildTimelineStage(layout);
}

function scheduleTimelineStageRefresh() {
  if (timelineStageFrame) return;
  timelineStageFrame = requestAnimationFrame(() => {
    timelineStageFrame = 0;
    refreshTimelineStageOnly();
  });
}

function syncTimelineFocus(host) {
  const key = state.timeline.focusKey;
  if (!key || !host) return;
  const target = [...host.querySelectorAll('[data-ap-time-mark], [data-ap-time-column], [data-ap-time-block], [data-ap-time-aggregate], [data-ap-time-lane]')]
    .find(element => timelineElementKey(element) === key);
  if (target && host.contains(document.activeElement) && document.activeElement !== target) target.focus({ preventScroll: true });
}

function timelineElementKey(element) {
  if (!element) return null;
  const { apTimeMark, apTimeColumn, apTimeBlock, apTimeAggregate, apTimeLane } = element.dataset;
  return apTimeMark ?? apTimeColumn ?? apTimeBlock ?? apTimeAggregate ?? (apTimeLane ? `lane::${apTimeLane}` : null);
}

function setTimelineTelemetry(layout) {
  const c = layout.counts;
  setTelemetry(['Timeline', TIMELINE_BY_LABELS[layout.by], `${layout.domain.from} → ${layout.domain.to}`], [
    { value: c.named_lanes, label: `named lane${c.named_lanes === 1 ? '' : 's'}` },
    { value: c.drawn, label: 'marks drawn' },
    { value: c.columns, label: 'surface-day columns' },
    layout.window.active
      ? { value: `${c.in_window} / ${c.rows_in_view}`, label: 'rows in window' }
      : { value: `${c.rows_in_view} / ${c.total_rows}`, label: layout.by === 'type' ? 'surfaces in view' : 'rows in view' }
  ]);
}

function buildTimelineStage(layout) {
  const axisHeight = layout.phone ? TIMELINE_AXIS_HEIGHT_PHONE : TIMELINE_AXIS_HEIGHT;
  const overviewHeight = layout.phone ? TIMELINE_OVERVIEW_HEIGHT_PHONE : TIMELINE_OVERVIEW_HEIGHT;
  return `<div class="aperture-time-axis">${timelineAxisSvg(layout, axisHeight)}</div>
    <div class="aperture-time-lanes">${timelinePlotSvg(layout)}</div>
    <div class="aperture-time-overview">${timelineOverviewSvg(layout, overviewHeight)}</div>
    <div class="aperture-time-tip" role="tooltip" hidden></div>`;
}

function timelineAxisSvg(layout, height) {
  const width = layout.width;
  const ticks = layout.axisTicks.map(tick => tick.kind === 'year'
    ? `<line class="aperture-time-axis-year" x1="${timelineRound(tick.x)}" y1="${height - 14}" x2="${timelineRound(tick.x)}" y2="${height}"/><text class="aperture-time-axis-label" x="${timelineRound(tick.x + 4)}" y="${height - 5}">${esc(tick.label)}</text>`
    : `<line class="aperture-time-axis-month" x1="${timelineRound(tick.x)}" y1="${height - 6}" x2="${timelineRound(tick.x)}" y2="${height}"/>${tick.label ? `<text class="aperture-time-axis-month-label" x="${timelineRound(tick.x + 2)}" y="${height - 8}">${esc(tick.label)}</text>` : ''}`).join('');
  const domainLabel = `<text class="aperture-time-axis-domain" x="6" y="${height - 5}">${esc(layout.phone ? `${layout.domain.from.slice(0, 4)}→${layout.domain.to.slice(0, 4)}` : `${layout.domain.from} → ${layout.domain.to}`)}</text>`;
  return `<svg class="aperture-time-axis-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true">${domainLabel}<line class="aperture-time-axis-base" x1="${layout.plotLeft}" y1="${height - .5}" x2="${width}" y2="${height - .5}"/>${ticks}${layout.window.active ? timelineWindowHandles(layout, height) : ''}</svg>`;
}

function timelineWindowHandles(layout, height) {
  const fromDay = layout.window.from_day ?? layout.window.to_day;
  const toDay = layout.window.to_day ?? layout.window.from_day;
  const right = layout.plotLeft + layout.plotWidth;
  const x1 = Math.max(layout.plotLeft, Math.min(right, timelineX(layout, fromDay)));
  const x2 = Math.max(layout.plotLeft, Math.min(right, timelineX(layout, toDay + 1)));
  return `<rect class="aperture-time-window-bar" x="${timelineRound(x1)}" y="2" width="${timelineRound(Math.max(1, x2 - x1))}" height="6"/>
    <text class="aperture-time-window-label" x="${timelineRound(Math.min(x1 + 4, right - 150))}" y="17">window ${esc(layout.window.from)} → ${esc(layout.window.to)}</text>
    <rect class="aperture-time-window-handle aperture-interactive" data-ap-time-handle="from" x="${timelineRound(x1 - 5)}" y="0" width="10" height="${height}" rx="2" tabindex="0" role="slider" aria-label="Window start" aria-valuetext="${esc(layout.window.from)}"/>
    <rect class="aperture-time-window-handle aperture-interactive" data-ap-time-handle="to" x="${timelineRound(x2 - 5)}" y="0" width="10" height="${height}" rx="2" tabindex="0" role="slider" aria-label="Window end" aria-valuetext="${esc(layout.window.to)}"/>`;
}

function timelinePlotSvg(layout) {
  const width = layout.width;
  const height = Math.max(1, layout.height);
  const m = layout.metrics;
  layout.rovingKey = timelineRovingKey(layout);
  layout.rovingLaneId = timelineRovingLaneId(layout);
  const parts = [];
  parts.push(`<defs><pattern id="aperture-time-hatch" patternUnits="userSpaceOnUse" width="4" height="4" patternTransform="rotate(45)"><rect width="4" height="4" fill="#2a3140"/><line x1="0" y1="0" x2="0" y2="4" stroke="#9aa3b2" stroke-width="1.4"/></pattern><clipPath id="aperture-time-labels-clip"><rect x="0" y="0" width="${m.labelWidth + m.padding}" height="${height}"/></clipPath>${layout.marks.filter(mark => mark.kind === 'open').map(mark => `<linearGradient id="${esc(timelineOpenGradientId(mark))}" gradientUnits="userSpaceOnUse" x1="${timelineRound(Math.max(mark.x, mark.x + mark.w - 24))}" y1="0" x2="${timelineRound(mark.x + mark.w)}" y2="0"><stop offset="0" stop-color="${timelineEvidenceColor(mark.evidence_class)}" stop-opacity=".55"/><stop offset="1" stop-color="${timelineEvidenceColor(mark.evidence_class)}" stop-opacity="0"/></linearGradient>`).join('')}</defs>`);
  layout.lanes.forEach((lane, index) => {
    parts.push(`<rect class="aperture-time-lane-bg${index % 2 ? ' is-alt' : ''}${lane.kind !== 'entity' ? ` aperture-time-lane-bg--${lane.kind}` : ''}" x="0" y="${timelineRound(lane.y)}" width="${width}" height="${timelineRound(lane.height)}"/>`);
    parts.push(`<line class="aperture-time-lane-rule" x1="0" y1="${timelineRound(lane.y + lane.height)}" x2="${width}" y2="${timelineRound(lane.y + lane.height)}"/>`);
  });
  for (const tick of layout.axisTicks) {
    if (tick.kind === 'year') parts.push(`<line class="aperture-time-grid" x1="${timelineRound(tick.x)}" y1="0" x2="${timelineRound(tick.x)}" y2="${height}"/>`);
  }
  if (layout.window.active) {
    const fromDay = layout.window.from_day ?? layout.window.to_day;
    const toDay = layout.window.to_day ?? layout.window.from_day;
    const x1 = Math.max(layout.plotLeft, timelineX(layout, fromDay));
    const x2 = Math.min(layout.plotLeft + layout.plotWidth, timelineX(layout, toDay + 1));
    if (x2 > x1) parts.push(`<rect class="aperture-time-window-shade" x="${timelineRound(x1)}" y="0" width="${timelineRound(x2 - x1)}" height="${height}"/>`);
  }
  for (const column of layout.columns) parts.push(timelineColumnMarkup(column, layout));
  for (const mark of layout.marks) parts.push(timelineMarkMarkup(mark, layout));
  for (const aggregate of layout.aggregates) parts.push(timelineAggregateMarkup(aggregate, layout));
  for (const block of layout.blocks) parts.push(timelineBlockMarkup(block, layout));
  parts.push(`<g clip-path="url(#aperture-time-labels-clip)"><rect class="aperture-time-labels-bg" x="0" y="0" width="${m.labelWidth + m.padding}" height="${height}"/>${layout.lanes.map(lane => timelineLaneLabelMarkup(lane, layout)).join('')}</g>`);
  return `<svg class="aperture-time-plot" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="group" aria-label="${esc(`Documented participation by date: ${layout.counts.drawn} marks on ${layout.lanes.length} lanes between ${layout.domain.from} and ${layout.domain.to}`)}">${parts.join('')}</svg>`;
}

function timelineEvidenceColor(value) {
  const normalized = normalizeEvidence(value);
  if (normalized === 'official' || normalized === 'confirmed' || normalized === 'government_record') return '#77d69d';
  if (normalized === 'primary_public') return '#67b8ff';
  if (normalized === 'reported') return '#cfabff';
  return '#ff9c9c';
}

function timelineOpenGradientId(mark) {
  return `aperture-time-open-${String(mark.key).replace(/[^a-z0-9]+/gi, '-')}`;
}

// One Tab stop for the whole plot: the focused or selected object when it is
// drawn, otherwise the first mark in lane order; the arrow keys walk the rest
// and move the stop with the focus (focusTimelineNeighbour). Lane labels are a
// second single stop. Without this every mark, column and label was a stop.
function timelineRovingKey(layout) {
  const t = state.timeline;
  const drawn = new Set([...layout.marks, ...layout.columns, ...layout.blocks, ...layout.aggregates].map(item => item.key));
  if (t.focusKey && drawn.has(t.focusKey)) return t.focusKey;
  if (t.selectedKey && drawn.has(t.selectedKey)) return t.selectedKey;
  return layout.marks[0]?.key ?? layout.blocks[0]?.key ?? layout.columns[0]?.key ?? layout.aggregates[0]?.key ?? null;
}

function timelineRovingLaneId(layout) {
  const t = state.timeline;
  const ids = new Set(layout.lanes.map(lane => lane.id));
  for (const key of [t.focusKey, t.selectedKey]) {
    if (key && String(key).startsWith('lane::') && ids.has(String(key).slice(6))) return String(key).slice(6);
  }
  return layout.lanes[0]?.id ?? null;
}

function timelineTabIndex(layout, key) {
  return layout.rovingKey === key ? 0 : -1;
}

function timelineColumnMarkup(column, layout) {
  const selected = state.timeline.selectedKey === column.key;
  const laneKinds = new Map(layout.lanes.map(lane => [lane.id, lane.kind]));
  // In a named lane the segment gets a small halo round that person's marks.
  // In the strip, where another person's mark can sit one slot away or a few
  // days on, it covers exactly the touching marks (half a pixel of rim, no
  // vertical reach) so it never reads as touching a stranger's row.
  const segments = column.segments.map(segment => {
    const pad = laneKinds.get(segment.laneId) === 'entity' ? { x: 1.5, y: 2 } : { x: .5, y: 0 };
    return `<rect class="aperture-time-column-segment" x="${timelineRound(column.x - pad.x)}" y="${timelineRound(segment.y1 - pad.y)}" width="${timelineRound(column.w + pad.x * 2)}" height="${timelineRound(segment.y2 - segment.y1 + pad.y * 2)}" rx="1"/>`;
  }).join('');
  const top = Math.min(...column.segments.map(segment => segment.y1));
  const label = `<text class="aperture-time-column-label" x="${timelineRound(column.x + column.w / 2)}" y="${timelineRound(Math.max(9, top - 4))}" text-anchor="middle">${esc(shortLabel(column.surface_label, 30))} · ${column.basis_count} base${column.basis_count === 1 ? '' : 's'}</text>`;
  const aria = `${column.surface_label}, ${column.iso_day}: ${column.basis_count} admitted hop base${column.basis_count === 1 ? '' : 's'} among ${column.actor_ids.length} people, drawn as one surface column`;
  return `<g class="aperture-time-column aperture-interactive${selected ? ' is-selected' : ''}${column.in_window ? '' : ' is-out-of-window'}" data-ap-time-column="${esc(column.key)}" data-lane="${esc(column.segments[0]?.laneId ?? '')}" tabindex="${timelineTabIndex(layout, column.key)}" role="button" aria-label="${esc(aria)}">${segments}${label}</g>`;
}

function timelineMarkMarkup(mark, layout) {
  const classes = ['aperture-time-mark', `aperture-time-mark--${mark.kind}`, mark.hop_eligible ? 'aperture-time-mark--hop' : 'aperture-time-mark--context', `aperture-time-mark--ev-${mark.evidence_recorded ? normalizeEvidence(mark.evidence_class) : 'unrecorded'}`, 'aperture-interactive'];
  if (!mark.in_window) classes.push('is-out-of-window');
  if (state.timeline.selectedKey === mark.key) classes.push('is-selected');
  let style = '';
  if (!mark.evidence_recorded) style = ' style="fill:url(#aperture-time-hatch)"';
  else if (mark.kind === 'open') style = ` style="fill:url(#${esc(timelineOpenGradientId(mark))})"`;
  const who = mark.participant_type === 'surface' ? mark.surface_label : `${mark.entity_label} · ${mark.surface_label}`;
  const aria = `${who}, ${timelineWindowText(mark, { long: true })}, ${mark.evidence_recorded ? evidenceLabel(mark.evidence_class) : 'evidence class not recorded'}, ${mark.hop_eligible ? 'hop-eligible surface' : 'context-only surface'}`;
  return `<rect class="${classes.join(' ')}" x="${timelineRound(mark.x)}" y="${timelineRound(mark.y)}" width="${timelineRound(mark.w)}" height="${mark.h}" rx="${mark.kind === 'day' ? 1 : 0}"${style} data-ap-time-mark="${esc(mark.key)}" data-lane="${esc(mark.laneId)}" tabindex="${timelineTabIndex(layout, mark.key)}" role="button" aria-label="${esc(aria)}"/>`;
}

function timelineAggregateMarkup(aggregate, layout) {
  const selected = state.timeline.selectedKey === aggregate.key;
  const width = Math.max(20, aggregate.w + 16);
  const x = Math.min(aggregate.x - 1, layout.width - width - 2);
  return `<g class="aperture-time-aggregate aperture-interactive${selected ? ' is-selected' : ''}" data-ap-time-aggregate="${esc(aggregate.key)}" data-lane="${esc(aggregate.laneId)}" tabindex="${timelineTabIndex(layout, aggregate.key)}" role="button" aria-label="${esc(`${aggregate.count} more rows in this lane fold into one mark`)}"><rect x="${timelineRound(x)}" y="${timelineRound(aggregate.y)}" width="${width}" height="${aggregate.h}" rx="${aggregate.h / 2}"/><text x="${timelineRound(x + width / 2)}" y="${timelineRound(aggregate.y + aggregate.h - 2)}" text-anchor="middle">+${aggregate.count}</text></g>`;
}

function timelineBlockMarkup(block, layout) {
  const selected = state.timeline.selectedKey === block.key;
  const boxWidth = layout.phone ? 92 : 124;
  const fitsRight = block.x + block.w + 4 + boxWidth <= layout.width - 2;
  const boxX = fitsRight ? block.x + block.w + 3 : block.x - 3 - boxWidth;
  const names = block.visible_listed_count === block.listed_count ? `${block.listed_count}` : `${block.visible_listed_count} of ${block.listed_count}`;
  const aria = `${block.surface_label}: ${block.listed_count} listed names and ${block.organization_count} organization${block.organization_count === 1 ? '' : 's'} on ${block.iso_day}, one contained roster without per-person marks`;
  return `<g class="aperture-time-block aperture-interactive${selected ? ' is-selected' : ''}${block.in_window ? '' : ' is-out-of-window'}" data-ap-time-block="${esc(block.key)}" data-lane="${esc(block.laneId)}" tabindex="${timelineTabIndex(layout, block.key)}" role="button" aria-label="${esc(aria)}">
    <rect class="aperture-time-block-day" x="${timelineRound(block.x)}" y="${timelineRound(block.y)}" width="${block.w}" height="${block.h}"/>
    <rect class="aperture-time-block-box" x="${timelineRound(boxX)}" y="${timelineRound(block.y)}" width="${boxWidth}" height="${block.h}" rx="3"/>
    <text class="aperture-time-block-text" x="${timelineRound(boxX + 7)}" y="${timelineRound(block.y + block.h / 2 + 4)}"><tspan class="aperture-time-block-count">${esc(names)}</tspan> names listed</text>
  </g>`;
}

function timelineLaneMeta(lane, layout) {
  if (lane.kind === 'entity') return `${lane.row_count} record${lane.row_count === 1 ? '' : 's'} · ${lane.hop_eligible_surface_count} hop-eligible`;
  if (lane.kind === 'strip') {
    const noun = layout.by === 'actor' ? 'people' : layout.by === 'organization' ? 'organizations' : 'surfaces';
    return `${lane.entity_count} ${noun} · ${lane.row_count} row${lane.row_count === 1 ? '' : 's'}`;
  }
  return `${lane.entity_count} names · ${lane.row_count} rows · one contained roster`;
}

function timelineLaneLabelMarkup(lane, layout) {
  const m = layout.metrics;
  const selected = state.timeline.selectedKey === `lane::${lane.id}`;
  const name = lane.kind === 'block' ? shortLabel(lane.label, layout.phone ? 9 : 30) : shortLabel(lane.label, layout.phone ? 9 : (lane.kind === 'entity' ? 24 : 32));
  const meta = timelineLaneMeta(lane, layout);
  const midY = lane.y + lane.height / 2;
  const text = layout.phone
    ? `<text class="aperture-time-lane-label" x="6" y="${timelineRound(midY + 4)}">${esc(name)}</text>`
    : `<text class="aperture-time-lane-label" x="8" y="${timelineRound(midY - 1)}">${esc(name)}</text><text class="aperture-time-lane-meta" x="8" y="${timelineRound(midY + 10)}">${esc(meta)}</text>`;
  return `<g class="aperture-time-lane aperture-time-lane--${lane.kind} aperture-interactive${selected ? ' is-selected' : ''}" data-ap-time-lane="${esc(lane.id)}" data-lane="${esc(lane.id)}" tabindex="${layout.rovingLaneId === lane.id ? 0 : -1}" role="button" aria-label="${esc(`${lane.label}: ${meta}`)}"><rect class="aperture-time-lane-hit" x="0" y="${timelineRound(lane.y)}" width="${m.labelWidth + m.padding}" height="${timelineRound(lane.height)}"/>${text}</g>`;
}

function timelineOverviewSvg(layout, height) {
  const width = layout.width;
  const overview = layout.overview;
  if (overview.from_day == null || overview.to_day == null) return `<svg class="aperture-time-overview-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" aria-hidden="true"></svg>`;
  const ticks = overview.ticks.map(tick => {
    const x = timelineRound(timelineOverviewX(layout, tick.day));
    if (tick.kind === 'hop') return `<line class="aperture-time-ov-hop" x1="${x}" y1="${height - 22}" x2="${x}" y2="${height - 9}"/>`;
    if (tick.kind === 'dense') return `<line class="aperture-time-ov-dense" x1="${x}" y1="${height - 26}" x2="${x}" y2="${height - 9}"/>`;
    return `<line class="aperture-time-ov-row" x1="${x}" y1="${height - 17}" x2="${x}" y2="${height - 9}"/>`;
  }).join('');
  const years = [];
  const firstYear = Number(overview.from.slice(0, 4));
  const lastYear = Number(overview.to.slice(0, 4));
  const yearPitch = (layout.plotWidth / Math.max(1, lastYear - firstYear + 1));
  const step = yearPitch >= 28 ? 1 : yearPitch >= 14 ? 2 : 5;
  for (let year = firstYear; year <= lastYear; year += step) {
    const day = dayIndex(String(year));
    if (day == null || day < overview.from_day || day > overview.to_day) continue;
    years.push(`<text class="aperture-time-ov-year" x="${timelineRound(timelineOverviewX(layout, day) + 2)}" y="${height - 1}">${layout.phone ? String(year).slice(2) : year}</text>`);
  }
  const x1 = Math.max(layout.plotLeft, overview.window ? overview.window.x1 : layout.plotLeft);
  const x2 = Math.min(layout.plotLeft + layout.plotWidth, overview.window ? overview.window.x2 : layout.plotLeft + layout.plotWidth);
  const window = overview.window
    ? `<rect class="aperture-time-ov-window" data-ap-time-ov="body" x="${timelineRound(x1)}" y="1" width="${timelineRound(Math.max(2, x2 - x1))}" height="${height - 2}" rx="2"/>
       <rect class="aperture-time-ov-handle aperture-interactive" data-ap-time-ov="from" x="${timelineRound(x1 - 6)}" y="0" width="12" height="${height}" rx="2" tabindex="0" role="slider" aria-label="Axis start" aria-valuetext="${esc(layout.domain.from)}"/>
       <rect class="aperture-time-ov-handle aperture-interactive" data-ap-time-ov="to" x="${timelineRound(x2 - 6)}" y="0" width="12" height="${height}" rx="2" tabindex="0" role="slider" aria-label="Axis end" aria-valuetext="${esc(layout.domain.to)}"/>`
    : '';
  return `<svg class="aperture-time-overview-svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" role="group" aria-label="${esc(`Whole record ${overview.from} → ${overview.to}: ${overview.ticks.filter(tick => tick.kind === 'row').length} row starts, ${overview.ticks.filter(tick => tick.kind === 'hop').length} hop days; drag the window to move the axis`)}"><text class="aperture-time-ov-label" x="6" y="${height / 2 + 3}">${layout.phone ? 'All' : 'Whole record'}</text>${ticks}${years.join('')}${window}</svg>`;
}

// --- selection and inspector -------------------------------------------------------------------

function timelineSelection(layout) {
  const key = state.timeline.selectedKey;
  if (!key) return null;
  const text = String(key);
  if (text.startsWith('lane::')) {
    const lane = layout.lanes.find(item => item.id === text.slice(6));
    return lane ? { kind: 'lane', key: text, lane } : null;
  }
  if (text.startsWith('column::')) {
    const column = layout.columns.find(item => item.key === text);
    if (column) return { kind: 'column', key: text, column };
    const hopDay = [...timelineModel().hopDays.values()].find(item => `column::${item.iso_day}::${item.surface_id}` === text);
    return hopDay ? { kind: 'column-hidden', key: text, hopDay } : null;
  }
  if (text.startsWith('dense::')) {
    const block = layout.blocks.find(item => item.key === text) ?? null;
    const dense = timelineModel().dense.find(item => item.key === text) ?? null;
    return dense ? { kind: 'block', key: text, block, dense } : null;
  }
  if (text.startsWith('aggregate::')) {
    const aggregate = layout.aggregates.find(item => item.key === text);
    return aggregate ? { kind: 'aggregate', key: text, aggregate } : null;
  }
  const row = timelineRow(text);
  if (!row) return null;
  const mark = layout.marks.find(item => item.key === text) ?? null;
  return { kind: 'row', key: text, row, mark, drawn: Boolean(mark) || layout.aggregates.some(item => item.hidden_keys.includes(text)) || layout.blocks.some(item => item.visible_member_keys.includes(text)) };
}

function timelineInspectorLabel(selection, layout) {
  if (!selection) return 'How to read this';
  if (selection.kind === 'row') return selection.row.participant_type === 'surface' ? selection.row.surface_label : selection.row.entity_label;
  if (selection.kind === 'lane') return selection.lane.label;
  if (selection.kind === 'column' || selection.kind === 'column-hidden') return (selection.column ?? selection.hopDay).surface_label;
  if (selection.kind === 'block') return selection.dense.surface_label;
  return `+${selection.aggregate.count} rows`;
}

function timelineInspector(selection, layout) {
  if (!selection) return timelineDefaultCard(layout);
  if (selection.kind === 'row') return timelineRowCard(selection.row, selection.mark, selection.drawn, layout);
  if (selection.kind === 'lane') return timelineLaneCard(selection.lane, layout);
  if (selection.kind === 'column') return timelineColumnCard(selection.column, layout);
  if (selection.kind === 'column-hidden') return timelineHiddenColumnCard(selection.hopDay, layout);
  if (selection.kind === 'block') return timelineRosterCard(selection.dense, selection.block, layout);
  return timelineAggregateCard(selection.aggregate, layout);
}

function timelineWindowText(row, { long = false } = {}) {
  if (row.precision === 'undated' || row.start_day == null) return long ? 'no documented date' : 'not dated';
  if (row.kind === 'open') return `${row.time_start} → no documented end`;
  if (row.precision === 'year') return long ? `year precision: ${row.time_start}` : `${row.time_start} (year)`;
  if (row.precision === 'month') return long ? `month precision: ${row.time_start}${row.time_end && row.time_end !== row.time_start ? ` → ${row.time_end}` : ''}` : `${row.time_start} (month)`;
  if (row.kind === 'span') return `${long ? 'observed span ' : ''}${row.time_start} → ${row.time_end}`;
  return long ? `one documented day: ${row.time_start}` : row.time_start;
}

function timelineEvidenceBadges(counts) {
  return Object.entries(counts ?? {})
    .sort((a, b) => evidenceRank(a[0] === 'not_recorded' ? 'open' : a[0]) - evidenceRank(b[0] === 'not_recorded' ? 'open' : b[0]))
    .map(([kind, count]) => kind === 'not_recorded'
      ? `<span class="aperture-badge">${count} class not recorded</span>`
      : `<span class="aperture-badge aperture-badge--${esc(normalizeEvidence(kind))}">${count} ${esc(evidenceLabel(kind))}</span>`)
    .join('');
}

function timelineHopBadge(row) {
  return row.surface_hop_eligible
    ? '<span class="aperture-badge aperture-badge--official">Hop-eligible</span>'
    : `<span class="aperture-badge aperture-badge--reported">Context-only · ${esc(row.hop_refusal_reason ? humanLabel(row.hop_refusal_reason) : 'reason not recorded')}</span>`;
}

function timelineSelectButton(key, label) {
  return `<button type="button" class="aperture-inline-button" data-ap-action="timeline-select" data-key="${esc(key)}">${esc(label)}</button>`;
}

function timelineRowBases(row) {
  if (row.participant_type !== 'actor') return [];
  return timelineModel().hopBases.filter(basis => basis.surface_id === row.surface_id
    && (basis.actor_a === row.entity_id || basis.actor_b === row.entity_id)
    && (basis.day == null || row.start_day == null || (basis.day >= row.start_day && basis.day <= (row.end_day ?? Infinity))));
}

function timelineRouteButton(fromId, toId, label) {
  const ids = routeActorIds();
  if (!ids.includes(fromId) || !ids.includes(toId)) return '';
  return `<button type="button" data-ap-action="timeline-route" data-from="${esc(fromId)}" data-to="${esc(toId)}">${esc(label)}</button>`;
}

function timelineRowCard(row, mark, drawn, layout) {
  const model = timelineModel();
  const isSurface = row.participant_type === 'surface';
  const surfaceRows = model.surfaceRows.get(row.surface_id) ?? [];
  const coActors = surfaceRows.filter(item => item.participant_type === 'actor' && !(row.participant_type === 'actor' && item.entity_id === row.entity_id));
  const coOrganizations = surfaceRows.filter(item => item.participant_type === 'organization' && !(row.participant_type === 'organization' && item.entity_id === row.entity_id));
  const dense = model.dense.find(item => item.surface_id === row.surface_id) ?? null;
  const bases = timelineRowBases(row);
  const partners = new Map();
  for (const basis of bases) {
    const partner = basis.actor_a === row.entity_id ? basis.actor_b : basis.actor_a;
    const role = basis.actor_a === row.entity_id ? basis.actor_b_role : basis.actor_a_role;
    if (!partners.has(partner)) partners.set(partner, { role, count: 0, evidence: basis.evidence_class });
    partners.get(partner).count += 1;
  }
  // The column is drawn under its marks, so a pointer on it usually lands on
  // this row; its card is one click from here for every drawn column day.
  const columnJumps = row.participant_type === 'actor'
    ? unique(bases.map(basis => isoFromDayIndex(basis.day))).map(iso => ({ iso, key: `column::${iso}::${row.surface_id}` })).filter(item => layout.columns.some(column => column.key === item.key))
    : [];
  const columnJumpMarkup = columnJumps.length ? `<p class="aperture-time-column-jump">${columnJumps.map(item => timelineSelectButton(item.key, `Select the ${item.iso} column`)).join(' ')}</p>` : '';
  const notDrawn =!drawn ? `<p class="aperture-muted">This row is outside the current axis or filters, so it is not drawn. ${row.start_day != null ? `<button type="button" class="aperture-inline-button" data-ap-action="timeline-show-row" data-key="${esc(row.key)}">Show its year</button>` : 'It has no documented date and is never placed on the axis.'}</p>` : '';
  const windowNote = mark && layout.window.active && !mark.in_window ? '<p class="aperture-muted">Outside the marked window: dimmed, not removed.</p>' : '';
  const alsoOn = dense
    ? `<p>${dense.listed_count} listed names on this roster, one contained object. ${timelineSelectButton(dense.key, 'Open the roster card')}.</p>`
    : `<ul>${coActors.slice(0, 12).map(item => `<li>${timelineSelectButton(item.key, item.entity_label)}: ${esc(item.role || humanLabel(item.participation_type))}</li>`).join('')}${coActors.length > 12 ? `<li>+${coActors.length - 12} more people on this surface</li>` : ''}${coOrganizations.map(item => `<li>${esc(item.entity_label)}: ${esc(item.role || humanLabel(item.participation_type))} <span class="aperture-muted">venue/context · organizations create no hops</span></li>`).join('')}${!coActors.length && !coOrganizations.length ? '<li>No other participant is documented on this surface.</li>' : ''}</ul>`;
  const hopSection = isSurface
    ? `<p>${row.hop_basis_count} admitted hop base${row.hop_basis_count === 1 ? '' : 's'} on this surface across the whole record.</p>`
    : row.participant_type === 'organization'
      ? '<p class="aperture-muted">Organization rows are venue or context. They never create a hop and never produce a column.</p>'
      : bases.length
        ? `<p>${bases.length} admitted base${bases.length === 1 ? '' : 's'} on this surface ${row.kind === 'day' ? 'on this day' : 'inside this row’s window'}, each drawn as a column on the surface day.</p><ul class="aperture-time-pairs">${[...partners.entries()].map(([partner, info]) => `<li><span>with <strong>${esc(actorLabel(partner))}</strong> (${esc(info.role || 'role not recorded')})</span><small>${info.count} basis${info.count === 1 ? '' : 'es'} · ${esc(evidenceLabel(info.evidence))}</small>${timelineRouteButton(row.entity_id, partner, `Route ${shortLabel(actorLabel(row.entity_id), 16)} → ${shortLabel(actorLabel(partner), 16)}`)}</li>`).join('')}</ul>${columnJumpMarkup}`
        : row.surface_hop_eligible
          ? '<p class="aperture-muted">The surface is hop-eligible, but no admitted basis has this person as an endpoint inside this row’s window.</p>'
          : '<p class="aperture-muted">Context-only surface: no hop basis can arise here.</p>';
  const actions = [];
  if (row.participant_type === 'actor') {
    actions.push(`<button type="button" data-ap-action="open-record" data-actor-id="${esc(row.entity_id)}">Open actor record</button>`);
    if (routeActorIds().includes(row.entity_id)) actions.push(`<button type="button" data-ap-action="route-from-selection" data-actor-id="${esc(row.entity_id)}">Route from actor</button>`);
    if (layout.by === 'actor' && !state.timeline.lanes.includes(row.entity_id) && !layout.lanes.some(lane => lane.kind === 'entity' && lane.entity_id === row.entity_id)) actions.push(`<button type="button" data-ap-action="timeline-add-lane" data-kind="actor" data-id="${esc(row.entity_id)}">Add a lane for ${esc(shortLabel(row.entity_label, 20))}</button>`);
    const laneIds = coActors.map(item => item.entity_id).filter(id => !layout.lanes.some(lane => lane.kind === 'entity' && lane.entity_id === id));
    if (layout.by === 'actor' && laneIds.length && !dense) actions.push(`<button type="button" data-ap-action="timeline-add-lanes" data-kind="actor" data-ids="${esc(laneIds.slice(0, TIMELINE_MAX_LANES).join(','))}">Add lanes for ${laneIds.length} co-participant${laneIds.length === 1 ? '' : 's'}</button>`);
    actions.push(workspaceCompareAction('actor', row.entity_id, 'Compare actor'));
  } else if (row.participant_type === 'organization') {
    actions.push(`<button type="button" data-ap-action="timeline-open-record" data-kind="organization" data-id="${esc(row.entity_id)}">Open organization record</button>`);
    const laneIds = coOrganizations.map(item => item.entity_id).filter(id => !layout.lanes.some(lane => lane.kind === 'entity' && lane.entity_id === id));
    if (layout.by === 'organization' && laneIds.length) actions.push(`<button type="button" data-ap-action="timeline-add-lanes" data-kind="organization" data-ids="${esc(laneIds.slice(0, TIMELINE_MAX_LANES).join(','))}">Add lanes for ${laneIds.length} co-present organization${laneIds.length === 1 ? '' : 's'}</button>`);
  }
  actions.push(`<button type="button" data-ap-action="open-surface-record" data-surface-id="${esc(row.surface_id)}">Open surface record</button>`);
  if (dense || coActors.length + (row.participant_type === 'actor' ? 1 : 0) >= 2) actions.push(`<button type="button" data-ap-action="surface-from-route" data-surface-id="${esc(row.surface_id)}">Open roster view</button>`);
  actions.push(workspaceCompareAction('surface', row.surface_id, 'Compare surface'));
  const who = isSurface
    ? `<p>${row.actor_count} documented ${row.actor_count === 1 ? 'person' : 'people'} · ${row.organization_count} organization${row.organization_count === 1 ? '' : 's'} · ${row.row_count} participation row${row.row_count === 1 ? '' : 's'}</p>`
    : `<p class="aperture-time-surface-line">on <button type="button" class="aperture-inline-button" data-ap-action="open-surface-record" data-surface-id="${esc(row.surface_id)}">${esc(row.surface_label)}</button></p>`;
  return `<p class="aperture-kicker">${isSurface ? 'Surface row' : 'Participation row'}</p><h3>${esc(isSurface ? row.surface_label : row.entity_label)}</h3>${who}${notDrawn}${windowNote}
    <div class="aperture-badge-row"><span class="aperture-badge">${esc(humanLabel(row.surface_type || 'unknown type'))}</span>${timelineHopBadge(row)}${row.evidence_recorded ? evidenceBadge(row.evidence_class) : '<span class="aperture-badge">Class not recorded</span>'}<span class="aperture-badge">${esc(timelineWindowText(row, { long: true }))}</span></div>
    <dl class="aperture-definition-list">${isSurface ? '' : `<div><dt>Role</dt><dd>${esc(row.role || 'not recorded')}</dd></div><div><dt>Participation type</dt><dd>${esc(humanLabel(row.participation_type || 'not recorded'))}</dd></div>`}<div><dt>Documented window</dt><dd>${esc(timelineWindowText(row))}</dd></div><div><dt>Receipts</dt><dd>${row.receipt_ids.length}</dd></div>${row.notes ? `<div><dt>Notes</dt><dd>${esc(row.notes)}</dd></div>` : ''}</dl>
    <h4>${isSurface ? 'Documented on this surface' : 'Also on this surface'}</h4>${isSurface ? `<ul>${surfaceRows.slice(0, 12).map(item => `<li>${timelineSelectButton(item.key, item.entity_label)}: ${esc(item.role || humanLabel(item.participation_type))}</li>`).join('')}${surfaceRows.length > 12 ? `<li>+${surfaceRows.length - 12} more rows</li>` : ''}${!surfaceRows.length ? '<li>No participation row is documented on this surface.</li>' : ''}</ul>` : alsoOn}
    <h4>Hop bases on these days</h4>${hopSection}
    ${receiptHealthBadges(row.receipt_ids)}${receiptButtons(row.receipt_ids)}
    <div class="aperture-actions">${actions.join('')}</div>`;
}

function timelineLaneCard(lane, layout) {
  const model = timelineModel();
  if (lane.kind === 'block') {
    const dense = model.dense.find(item => `block:${item.surface_id}` === lane.id);
    return dense ? timelineRosterCard(dense, layout.blocks.find(block => block.key === dense.key) ?? null, layout) : timelineDefaultCard(layout);
  }
  if (lane.kind === 'strip') return timelineStripCard(lane, layout);
  const entity = model.lanes[layout.by].get(lane.entity_id);
  if (!entity) return timelineDefaultCard(layout);
  const kindLabel = TIMELINE_KIND_LABELS[layout.by];
  const pinned = state.timeline.lanes.includes(entity.id);
  const types = Object.entries(entity.type_counts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 6);
  const coCounts = layout.by === 'actor' ? entity.co_organization_counts : layout.by === 'organization' ? entity.co_actor_counts : {};
  const coLabel = layout.by === 'actor' ? 'Co-present organizations' : 'Co-present people';
  const coEntries = Object.entries(coCounts).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 8);
  const coLabelFor = id => (layout.by === 'actor' ? (model.lanes.organization.get(id)?.label ?? id) : actorLabel(id));
  const span = entity.first_day ? `${entity.first_day} → ${entity.has_open_end ? 'no documented end' : entity.last_day}` : 'no documented date';
  const actions = [];
  if (layout.by === 'actor') {
    actions.push(`<button type="button" data-ap-action="open-record" data-actor-id="${esc(entity.id)}">Open record</button>`);
    if (routeActorIds().includes(entity.id)) actions.push(`<button type="button" data-ap-action="route-from-selection" data-actor-id="${esc(entity.id)}">Route from here</button>`);
    actions.push(workspaceCompareAction('actor', entity.id, 'Compare actor'));
  } else if (layout.by === 'organization') {
    actions.push(`<button type="button" data-ap-action="timeline-open-record" data-kind="organization" data-id="${esc(entity.id)}">Open record</button>`);
  }
  if (pinned) actions.push(`<button type="button" data-ap-action="timeline-remove-lane" data-id="${esc(entity.id)}">Remove lane</button>`);
  return `<p class="aperture-kicker">${esc(kindLabel)}${pinned ? ' · pinned lane' : ''}</p><h3>${esc(entity.label)}</h3>
    <div class="aperture-metric-grid"><div><strong>${entity.row_count}</strong><span>records</span></div><div><strong>${entity.surface_count}</strong><span>${layout.by === 'type' ? 'surfaces of this type' : 'surfaces'}</span></div><div><strong>${entity.hop_eligible_surface_count}</strong><span>hop-eligible surfaces</span></div><div><strong>${esc(span)}</strong><span>first → last documented day</span></div></div>
    <div class="aperture-badge-row">${timelineEvidenceBadges(entity.evidence_counts)}</div>
    ${layout.by !== 'type' ? `<h4>Surface types in these rows</h4><ul>${types.map(([type, count]) => `<li>${count} × ${esc(humanLabel(type))}</li>`).join('')}</ul>` : ''}
    ${coEntries.length ? `<h4>${coLabel}</h4><ul>${coEntries.map(([id, count]) => `<li>${esc(coLabelFor(id))} · ${count} shared row${count === 1 ? '' : 's'}</li>`).join('')}</ul><p class="aperture-muted">Counted co-presence on documented surfaces. ${layout.by === 'actor' ? 'Organizations are venue or context and create no hops.' : 'Shared context is not contact or coordination.'}</p>` : ''}
    ${layout.by === 'actor' ? `<p>Admitted hop bases with this person as an endpoint: <strong>${entity.hop_basis_count}</strong>${entity.hop_partner_ids.length ? ` (with ${entity.hop_partner_ids.slice(0, 6).map(id => esc(actorLabel(id))).join(', ')}${entity.hop_partner_ids.length > 6 ? ` and ${entity.hop_partner_ids.length - 6} more` : ''})` : ''}.</p>` : ''}
    ${entity.dense_memberships.length ? `<p class="aperture-muted">Also listed on ${entity.dense_memberships.length} dense roster${entity.dense_memberships.length === 1 ? '' : 's'}: ${entity.dense_memberships.map(id => esc(surfaceLabel(id))).join('; ')}.</p>` : ''}
    <div class="aperture-actions">${actions.join('')}</div>`;
}

function timelineStripCard(lane, layout) {
  const model = timelineModel();
  const rows = (layout.by === 'type' ? model.surfaceMarks : model.rows).filter(row => lane.mark_keys.includes(row.key) || layout.aggregates.some(aggregate => aggregate.laneId === lane.id && aggregate.hidden_keys.includes(row.key)));
  const evidence = {};
  for (const row of rows) evidence[row.evidence_recorded ? row.evidence_class : 'not_recorded'] = (evidence[row.evidence_recorded ? row.evidence_class : 'not_recorded'] ?? 0) + 1;
  const hop = rows.filter(row => row.surface_hop_eligible).length;
  const noun = layout.by === 'actor' ? 'people' : layout.by === 'organization' ? 'organizations' : 'surfaces';
  return `<p class="aperture-kicker">Strip lane</p><h3>${esc(lane.label)}</h3>
    <p>${lane.entity_count} ${noun} with ${layout.pinned ? 'no lane of their own' : 'exactly one documented surface'} share this lane. ${rows.length} of their ${lane.row_count} rows fall inside the current axis; stacked marks are different ${noun} on nearby days, never a relation between them.</p>
    <div class="aperture-metric-grid"><div><strong>${lane.entity_count}</strong><span>${noun}</span></div><div><strong>${lane.row_count}</strong><span>rows in the whole record</span></div><div><strong>${rows.length}</strong><span>rows on the axis</span></div><div><strong>${hop}</strong><span>on hop-eligible surfaces</span></div></div>
    <div class="aperture-badge-row">${timelineEvidenceBadges(evidence)}</div>
    <h4>Rows on the axis</h4><ul>${rows.slice(0, 14).map(row => `<li>${timelineSelectButton(row.key, row.participant_type === 'surface' ? row.surface_label : row.entity_label)} · ${esc(timelineWindowText(row))}</li>`).join('')}${rows.length > 14 ? `<li>+${rows.length - 14} more rows (use the overview table)</li>` : ''}</ul>`;
}

function timelineColumnCard(column, layout) {
  const model = timelineModel();
  const surface = state.surfaces.get(column.surface_id);
  const organizations = (model.surfaceRows.get(column.surface_id) ?? []).filter(row => row.participant_type === 'organization');
  const hidden = column.all_actor_ids.filter(id => !column.actor_ids.includes(id));
  const laneIds = column.actor_ids.filter(id => !layout.lanes.some(lane => lane.kind === 'entity' && lane.entity_id === id));
  return `<p class="aperture-kicker">Hop surface · one day</p><h3>${esc(column.surface_label)}</h3><p><strong>${esc(column.iso_day)}</strong> · ${column.basis_count} admitted hop base${column.basis_count === 1 ? '' : 's'} among ${column.actor_ids.length} named people, drawn as one column on the surface. The column touches only the lanes of these people; it is not a line between any two of them.</p>
    <div class="aperture-badge-row"><span class="aperture-badge">${esc(humanLabel(column.surface_type || 'unknown type'))}</span><span class="aperture-badge aperture-badge--official">Hop-eligible</span>${timelineEvidenceBadges(column.evidence_counts)}</div>
    ${column.total_basis_count > column.basis_count ? `<p class="aperture-muted">${column.total_basis_count - column.basis_count} further base${column.total_basis_count - column.basis_count === 1 ? '' : 's'} on this day sit below the evidence floor${hidden.length ? ` (${hidden.map(id => esc(actorLabel(id))).join(', ')})` : ''}.</p>` : ''}
    <h4>Pairs with an admitted basis</h4><ul class="aperture-time-pairs">${column.pairs.map(pair => `<li><span><strong>${esc(actorLabel(pair.actor_a))}</strong> ↔ <strong>${esc(actorLabel(pair.actor_b))}</strong></span><small>${esc(pair.actor_a_role || 'role not recorded')} · ${esc(pair.actor_b_role || 'role not recorded')} · ${esc(evidenceLabel(pair.evidence_class))}</small>${timelineRouteButton(pair.actor_a, pair.actor_b, `Route ${shortLabel(actorLabel(pair.actor_a), 14)} → ${shortLabel(actorLabel(pair.actor_b), 14)}`)}</li>`).join('')}</ul>
    ${organizations.length ? `<h4>Organizations on the surface</h4><ul>${organizations.map(row => `<li>${esc(row.entity_label)}: ${esc(row.role || humanLabel(row.participation_type))} <span class="aperture-muted">context · no hop</span></li>`).join('')}</ul>` : ''}
    ${surface?.notes ? `<p>${esc(surface.notes)}</p>` : ''}
    ${receiptHealthBadges(column.receipt_ids)}${receiptButtons(column.receipt_ids)}
    <div class="aperture-actions"><button type="button" data-ap-action="open-surface-record" data-surface-id="${esc(column.surface_id)}">Open surface record</button>${layout.by === 'actor' && laneIds.length ? `<button type="button" data-ap-action="timeline-add-lanes" data-kind="actor" data-ids="${esc(laneIds.join(','))}">Add all ${column.actor_ids.length} as lanes</button>` : ''}${workspaceCompareAction('surface', column.surface_id, 'Compare surface')}</div>`;
}

function timelineHiddenColumnCard(hopDay, layout) {
  return `<p class="aperture-kicker">Hop surface · one day</p><h3>${esc(hopDay.surface_label)}</h3><p><strong>${esc(hopDay.iso_day)}</strong> · ${hopDay.basis_count} admitted hop base${hopDay.basis_count === 1 ? '' : 's'} among ${hopDay.actor_ids.size} named people. This day is outside the current axis${layout.by !== 'actor' ? ' or the People view' : ''}, so its column is not drawn.</p>
    <div class="aperture-actions"><button type="button" data-ap-action="timeline-try" data-key="${esc(`column::${hopDay.iso_day}::${hopDay.surface_id}`)}" data-year="${esc(hopDay.iso_day.slice(0, 4))}">Show ${esc(hopDay.iso_day.slice(0, 4))} and select it</button><button type="button" data-ap-action="open-surface-record" data-surface-id="${esc(hopDay.surface_id)}">Open surface record</button></div>`;
}

function timelineRosterCard(dense, block, layout) {
  const surface = state.surfaces.get(dense.surface_id);
  const visible = block ? `${block.visible_listed_count} of ${dense.listed_count} listed names pass the current filters` : `${dense.listed_count} listed names`;
  const elsewhere = dense.elsewhere.length
    ? `Also documented elsewhere: ${dense.elsewhere.map(entry => `${esc(entry.actor_label)} (${entry.other_surface_count} other surface${entry.other_surface_count === 1 ? '' : 's'})`).join(', ')}; ${dense.nowhere_else_count} names appear on no other surface.`
    : `${dense.nowhere_else_count} names appear on no other surface.`;
  return `<p class="aperture-kicker">Dense roster · one contained object</p><h3>${esc(dense.surface_label)}</h3><p><strong>${dense.listed_count} listed names</strong> · ${dense.organization_count} organization${dense.organization_count === 1 ? '' : 's'} · ${esc(dense.iso_day ?? 'undated')}. ${block ? '' : 'Outside the current axis or filters: not drawn. '}The roster is drawn as one block with its count; no name gets a personal mark here and no line joins any two of them.</p>
    <div class="aperture-badge-row"><span class="aperture-badge">${esc(humanLabel(dense.surface_type || 'unknown type'))}</span><span class="aperture-badge aperture-badge--reported">${dense.hop_eligible ? 'Hop-eligible' : `Context-only · ${esc(dense.refusal_reason ? humanLabel(dense.refusal_reason) : 'reason not recorded')}`}</span>${timelineEvidenceBadges(dense.evidence_counts)}</div>
    <dl class="aperture-definition-list"><div><dt>Refusal reason</dt><dd>${esc(dense.refusal_reason || 'not recorded')}</dd></div><div><dt>Rows</dt><dd>${dense.row_count} (${visible})</dd></div><div><dt>Receipts</dt><dd>${dense.receipt_ids.length}</dd></div></dl>
    <p>${elsewhere}</p>
    ${dense.elsewhere.length ? `<ul>${dense.elsewhere.map(entry => `<li>${timelineSelectButton(`${dense.surface_id}::actor::${entry.actor_id}`, entry.actor_label)} · ${entry.other_surface_count} other surface${entry.other_surface_count === 1 ? '' : 's'}${layout.by === 'actor' && layout.lanes.some(lane => lane.entity_id === entry.actor_id) ? ' · has a lane above' : ''}</li>`).join('')}</ul>` : ''}
    ${surface?.notes ? `<p>${esc(surface.notes)}</p>` : ''}
    ${receiptHealthBadges(dense.receipt_ids)}${receiptButtons(dense.receipt_ids)}
    <div class="aperture-actions"><button type="button" data-ap-action="surface-from-route" data-surface-id="${esc(dense.surface_id)}">Open roster view</button><button type="button" data-ap-action="open-surface-record" data-surface-id="${esc(dense.surface_id)}">Open surface record</button>${workspaceCompareAction('surface', dense.surface_id, 'Compare surface')}</div>`;
}

function timelineAggregateCard(aggregate, layout) {
  const rows = aggregate.hidden_keys.map(key => timelineRow(key)).filter(Boolean);
  const lane = layout.lanes.find(item => item.id === aggregate.laneId);
  return `<p class="aperture-kicker">Folded rows</p><h3>+${aggregate.count} rows</h3><p>${lane ? `${esc(lane.label)}: ` : ''}these rows sit within a few pixels at this axis width, so they fold into one mark. Each is still one ledger row; narrow the axis (drag the overview window, or Ctrl + wheel) to separate them.</p>
    <div class="aperture-badge-row">${timelineEvidenceBadges(aggregate.evidence_counts)}<span class="aperture-badge">${aggregate.hop_eligible_count} on hop-eligible surfaces</span></div>
    <ul>${rows.map(row => `<li>${timelineSelectButton(row.key, row.participant_type === 'surface' ? row.surface_label : row.entity_label)} · ${esc(shortLabel(row.surface_label, 40))} · ${esc(timelineWindowText(row))}</li>`).join('')}</ul>`;
}

function timelineDefaultCard(layout) {
  const suggestion = state.timeline.suggestion;
  let tryMarkup = '';
  if (suggestion) {
    const drawn = layout.by === 'actor' && layout.columns.some(column => column.key === suggestion.key);
    const text = drawn
      ? `Try the amber column on ${suggestion.iso_day}: ${suggestion.actor_count} people on <em>${esc(suggestion.surface_label)}</em>, ${suggestion.basis_count} admitted bases, one surface.`
      : `The axis currently starts after ${suggestion.iso_day}. Tap the ${suggestion.year} chip, then the amber column on ${suggestion.iso_day}: ${suggestion.actor_count} people on <em>${esc(suggestion.surface_label)}</em>.`;
    tryMarkup = `<h4>Try first</h4><p>${text}</p><div class="aperture-actions"><button type="button" data-ap-action="timeline-try" data-key="${esc(suggestion.key)}" data-year="${esc(suggestion.year)}">${drawn ? `Select the ${esc(suggestion.iso_day)} column` : `Show ${esc(suggestion.year)} and select it`}</button></div>`;
  }
  return `<p class="aperture-kicker">How to read this</p><h3>Every mark is one ledger row.</h3>
    <p>Lanes are ${esc(TIMELINE_BY_LABELS[layout.by].toLowerCase())}; the axis is the documented day. A tick is one documented day and a bar is an observed span, filled with the row’s evidence class and outlined amber when its surface is hop-eligible.</p>
    <p>An amber column is a surface that two or more people share on one day. The surface is the column, so a route reads actor → surface → actor; no line is ever drawn between two people, and a dense roster stays one block with its count.</p>
    <p>Click a mark to read its role, window, evidence class and receipts. Lane labels, columns and the roster block have their own cards; a column sits under its marks, so each mark card on it also offers “Select the column”. Year chips, the strip under the axis and Ctrl + wheel move the axis; the marked window dims rows outside it and never removes them. Tab reaches one mark, then the arrow keys walk the days and lanes.</p>
    <ul class="aperture-time-legend-list"><li><i class="aperture-time-key aperture-time-key--day"></i> one documented day</li><li><i class="aperture-time-key aperture-time-key--span"></i> observed span (dotted: year precision)</li><li><i class="aperture-time-key aperture-time-key--hop"></i> amber outline: hop-eligible surface · grey: context-only</li><li><i class="aperture-time-key aperture-time-key--column"></i> shared surface on one day</li><li><i class="aperture-time-key aperture-time-key--official"></i> official <i class="aperture-time-key aperture-time-key--primary_public"></i> primary public <i class="aperture-time-key aperture-time-key--reported"></i> reported <i class="aperture-time-key aperture-time-key--open"></i> derived or judgment</li><li><i class="aperture-time-key aperture-time-key--block"></i> dense roster, one contained object</li></ul>
    ${tryMarkup}`;
}

// --- overview table -------------------------------------------------------------------------

function timelineStatusText(layout) {
  const c = layout.counts;
  const noun = layout.by === 'type' ? 'surfaces' : 'ledger rows';
  const parts = [];
  if (layout.window.active) parts.push(`${c.in_window} of ${c.rows_in_view} rows in the window ${layout.window.from} → ${layout.window.to}`);
  parts.push(`${c.rows_in_view} of ${c.total_rows} ${noun} in view`);
  if (c.rows_outside_grouping) parts.push(`${c.rows_outside_grouping} ${layout.by === 'actor' ? 'organization' : 'person'} rows belong to the other grouping`);
  if (c.filtered) parts.push(`${c.filtered} hidden by filters`);
  if (c.pre_domain) parts.push(`${c.pre_domain} before the axis start${c.pre_domain_overlapping ? ` (${c.pre_domain_overlapping} still running)` : ''}`);
  if (c.post_domain) parts.push(`${c.post_domain} after the axis end`);
  if (c.undated) parts.push(`${c.undated} cannot be placed in time`);
  if (c.aggregated_rows) parts.push(`${c.aggregated_rows} folded into +N marks`);
  if (layout.pinned && state.timeline.lanes.length >= TIMELINE_MAX_LANES) parts.push(`${TIMELINE_MAX_LANES} named lanes is the cap; other rows sit in the strip`);
  return `${parts.join(' · ')}.`;
}

function timelineOverviewEntries(layout) {
  const laneIndex = new Map(layout.lanes.map((lane, index) => [lane.id, index]));
  const entries = [];
  for (const mark of layout.marks) {
    const row = timelineRow(mark.key);
    if (row) entries.push({ key: mark.key, day: mark.start_day, laneIndex: laneIndex.get(mark.laneId) ?? 999, row, inWindow: mark.in_window, rendering: 'mark' });
  }
  for (const aggregate of layout.aggregates) {
    for (const key of aggregate.hidden_keys) {
      const row = timelineRow(key);
      if (row) entries.push({ key, day: row.start_day, laneIndex: laneIndex.get(aggregate.laneId) ?? 999, row, inWindow: rowInWindow(row, layout.window.from_day, layout.window.to_day), rendering: `folded into +${aggregate.count}`, aggregateKey: aggregate.key });
    }
  }
  for (const block of layout.blocks) {
    entries.push({ key: block.key, day: block.day, laneIndex: laneIndex.get(block.laneId) ?? 999, block, inWindow: block.in_window, rendering: 'one block' });
  }
  // Undated rows pass the filters but have no day: listed last, never placed
  // on the axis or sliced by the window (the status line counts them too).
  for (const key of layout.hidden?.undated ?? []) {
    const row = timelineRow(key);
    if (row) entries.push({ key, day: null, laneIndex: 999, row, inWindow: true, rendering: 'not placed in time' });
  }
  return entries.sort((a, b) => (a.day ?? Infinity) - (b.day ?? Infinity) || a.laneIndex - b.laneIndex || String(a.key).localeCompare(String(b.key)));
}

function timelineOverviewRowMarkup(entry) {
  const selected = entry.key === state.timeline.selectedKey || entry.aggregateKey === state.timeline.selectedKey;
  const dim = entry.inWindow === false ? ' is-out-of-window' : '';
  if (entry.block) {
    const block = entry.block;
    return `<tr class="${selected ? 'is-selected' : ''}${dim}"><td>${esc(block.iso_day ?? 'not dated')}</td><td><button type="button" class="aperture-table-link" data-ap-action="timeline-select" data-key="${esc(block.key)}">${block.visible_listed_count} listed names</button><small>${block.organization_count} organization${block.organization_count === 1 ? '' : 's'} · ${block.row_count} rows · ${esc(entry.rendering)}</small></td><td><strong>${esc(block.surface_label)}</strong><small>${esc(block.surface_id)}</small></td><td>roster listing</td><td>${esc(humanLabel(block.surface_type || 'unknown type'))}</td><td>${timelineEvidenceBadges(block.evidence_counts)}</td><td>${block.hop_eligible ? 'hop-eligible' : `context · ${esc(block.refusal_reason ? humanLabel(block.refusal_reason) : 'reason not recorded')}`}</td><td>${block.receipt_ids.length}</td></tr>`;
  }
  const row = entry.row;
  const who = row.participant_type === 'surface' ? `${row.actor_count} people · ${row.organization_count} organizations` : row.entity_label;
  return `<tr class="${selected ? 'is-selected' : ''}${dim}"><td>${esc(timelineWindowText(row))}</td><td><button type="button" class="aperture-table-link" data-ap-action="timeline-select" data-key="${esc(row.key)}">${esc(who)}</button><small>${esc(row.participant_type === 'surface' ? row.surface_id : row.entity_id)}${entry.rendering !== 'mark' ? ` · ${esc(entry.rendering)}` : ''}</small></td><td><strong>${esc(row.surface_label)}</strong><small>${esc(row.surface_id)}</small></td><td>${esc(row.role || (row.participant_type === 'surface' ? 'surface' : humanLabel(row.participation_type || 'not recorded')))}</td><td>${esc(humanLabel(row.surface_type || 'unknown type'))}</td><td>${row.evidence_recorded ? evidenceBadge(row.evidence_class) : '<span class="aperture-badge">not recorded</span>'}</td><td>${row.surface_hop_eligible ? 'hop-eligible' : `context · ${esc(row.hop_refusal_reason ? humanLabel(row.hop_refusal_reason) : 'reason not recorded')}`}</td><td>${row.receipt_ids.length}</td></tr>`;
}

function renderTimelineOverview(layout) {
  const entries = timelineOverviewEntries(layout);
  const t = state.timeline;
  const selectedIndex = entries.findIndex(entry => entry.key === t.selectedKey || entry.aggregateKey === t.selectedKey);
  setOverview({
    title: 'Documented rows in view.',
    status: timelineStatusText(layout),
    headers: ['Date(s)', 'Who', 'Surface', 'Role', 'Type', 'Evidence', 'Hop', 'Receipts'],
    pageKey: `timeline:${layout.by}:${layout.domain.from}:${layout.domain.to}:${t.lanes.join(',')}:${t.hop}:${t.evidenceFloor}`,
    selectedIndex: selectedIndex >= 0 ? selectedIndex : null,
    followSelected: Boolean(t.followSelected && selectedIndex >= 0),
    rows: entries.map(timelineOverviewRowMarkup)
  });
  t.followSelected = false;
}

// --- controls --------------------------------------------------------------------------------

function timelineYearChipDomain(year) {
  const start = dayIndex(String(year));
  const end = dayIndex(String(year), true);
  if (start == null || end == null) return null;
  return { from: isoFromDayIndex(start - TIMELINE_YEAR_CHIP_PADDING_DAYS), to: isoFromDayIndex(end + TIMELINE_YEAR_CHIP_PADDING_DAYS) };
}

function timelineActiveYear() {
  const t = state.timeline;
  if (!t.from && !t.to) return '';
  for (const year of timelineModel()?.range.years_with_rows ?? []) {
    const chip = timelineYearChipDomain(year);
    if (chip && chip.from === t.from && chip.to === t.to) return year;
  }
  return null;
}

function timelineControlsMarkup() {
  const t = state.timeline;
  const years = timelineModel()?.range.years_with_rows ?? [];
  const activeYear = timelineActiveYear();
  const windowActive = timelineWindowActive();
  return `<div class="aperture-time-by" role="group" aria-label="Lane grouping"><span class="aperture-time-control-label">Lanes</span>${TIMELINE_BY.map(by => `<button type="button" data-ap-action="timeline-by" data-by="${by}" aria-pressed="${String(t.by === by)}">${esc(TIMELINE_BY_LABELS[by])}</button>`).join('')}</div>
    <div class="aperture-time-year-chips" role="group" aria-label="Years with documented rows">${years.map(year => `<button type="button" data-ap-action="timeline-year" data-year="${esc(year)}" aria-pressed="${String(activeYear === year)}">${esc(year)}</button>`).join('')}<button type="button" data-ap-action="timeline-year" data-year="" aria-pressed="${String(activeYear === '')}">All</button></div>
    <label class="aperture-control aperture-control--wide aperture-time-add"><span>Add a lane</span><input id="ap-time-lane" type="search" list="ap-time-lane-options" placeholder="Person, organization or surface type" autocomplete="off"><datalist id="ap-time-lane-options">${timelineSearchOptions()}</datalist></label>
    <label class="aperture-control"><span>Surfaces</span><select id="ap-time-hop">${TIMELINE_HOP_FILTERS.map(value => `<option value="${value}"${value === t.hop ? ' selected' : ''}>${esc(TIMELINE_HOP_LABELS[value])}</option>`).join('')}</select></label>
    <label class="aperture-control"><span>Evidence floor</span><select id="ap-time-evidence">${evidenceOptions(t.evidenceFloor)}</select></label>
    <button type="button" class="aperture-secondary-button aperture-time-window-toggle" data-ap-action="timeline-window-toggle" aria-pressed="${String(windowActive)}">${windowActive ? 'Window on' : 'Mark a window'}</button>
    <button type="button" class="aperture-secondary-button" data-ap-action="timeline-reset">Reset</button>
    ${addressActionMarkup()}`;
}

// --- state mutations -------------------------------------------------------------------------

function commitTimelineView({ history = 'push', controls = true } = {}) {
  if (controls) renderModeControls();
  renderTimelineMode();
  commitApertureAddress(history);
}

function selectTimelineObject(key, { openSheet = false, history = 'push' } = {}) {
  const t = state.timeline;
  t.selectedKey = key || null;
  t.focusKey = key || null;
  t.followSelected = Boolean(key);
  const row = key ? timelineRow(key) : null;
  if (row) {
    if (row.participant_type === 'actor') state.selectedActorId = row.entity_id;
    state.selectedSurfaceId = row.surface_id;
  } else if (key && (String(key).startsWith('column::') || String(key).startsWith('dense::'))) {
    state.selectedSurfaceId = String(key).split('::').pop();
  } else if (key && String(key).startsWith('lane::') && t.by === 'actor' && state.actors.has(String(key).slice(6))) {
    state.selectedActorId = String(key).slice(6);
  }
  renderTimelineMode();
  commitApertureAddress(history);
  if (openSheet && isMobile()) { state.sheetOpen = true; syncInspectorSheet(); }
}

function clearTimelineSelection() {
  if (!state.timeline.selectedKey) return;
  state.timeline.selectedKey = null;
  state.timeline.focusKey = null;
  renderTimelineMode();
  commitApertureAddress('push');
}

function setTimelineDomain(from, to, { history = 'push' } = {}) {
  state.timeline.from = timelineIsoDay(from);
  state.timeline.to = timelineIsoDay(to);
  commitTimelineView({ history });
}

function setTimelineYear(year) {
  if (!year) { setTimelineDomain('', ''); return; }
  const chip = timelineYearChipDomain(year);
  if (chip) setTimelineDomain(chip.from, chip.to);
}

function setTimelineBy(by) {
  if (!TIMELINE_BY.includes(by) || by === state.timeline.by) return;
  state.timeline.by = by;
  state.timeline.lanes = [];
  state.timeline.selectedKey = null;
  state.timeline.focusKey = null;
  commitTimelineView();
}

function addTimelineLanes(ids, { kind = state.timeline.by } = {}) {
  const model = timelineModel();
  const by = TIMELINE_BY.includes(kind) ? kind : state.timeline.by;
  const valid = unique(ids).filter(id => model?.lanes?.[by]?.has(id));
  if (!valid.length) return false;
  const base = by === state.timeline.by && state.timeline.lanes.length
    ? state.timeline.lanes
    : defaultTimelineLanes(model, by).lanes.map(lane => lane.id);
  if (by !== state.timeline.by) { state.timeline.by = by; state.timeline.selectedKey = null; state.timeline.focusKey = null; }
  state.timeline.lanes = unique([...valid, ...base]).slice(0, TIMELINE_MAX_LANES);
  if (valid.length === 1 && !state.timeline.selectedKey) { state.timeline.selectedKey = `lane::${valid[0]}`; state.timeline.focusKey = state.timeline.selectedKey; }
  commitTimelineView();
  return true;
}

function removeTimelineLane(id) {
  if (!state.timeline.lanes.includes(id)) return;
  state.timeline.lanes = state.timeline.lanes.filter(item => item !== id);
  if (state.timeline.selectedKey === `lane::${id}`) { state.timeline.selectedKey = null; state.timeline.focusKey = null; }
  commitTimelineView();
}

function defaultTimelineWindow(layout) {
  const model = timelineModel();
  const fromDay = layout.domain.from_day;
  const toDay = layout.domain.to_day;
  const span = model.range.last_day_index - model.range.first_day_index;
  const playhead = state.ecology && state.ecology.position > 0 && !state.ecology.playing && span > 0
    ? Math.round(model.range.first_day_index + state.ecology.position * span)
    : null;
  if (playhead != null && playhead >= fromDay && playhead <= toDay) {
    return [isoFromDayIndex(Math.max(fromDay, playhead - 45)), isoFromDayIndex(Math.min(toDay, playhead + 45))];
  }
  const start = fromDay + Math.round((toDay - fromDay) * 2 / 3);
  return [isoFromDayIndex(start), isoFromDayIndex(toDay)];
}

function syncEcologyFromTimelineWindow() {
  const model = timelineModel();
  const t = state.timeline;
  if (!model || !state.ecology || !t.windowFrom) return;
  const span = model.range.last_day_index - model.range.first_day_index;
  if (!(span > 0)) return;
  const middle = (dayIndex(t.windowFrom) + dayIndex(t.windowTo || t.windowFrom, true)) / 2;
  state.ecology.position = Math.max(0, Math.min(1, (middle - model.range.first_day_index) / span));
  state.webgl?.renderer?.setEcologyPosition?.(state.ecology.position);
}

function toggleTimelineWindow() {
  const t = state.timeline;
  if (timelineWindowActive()) {
    t.windowFrom = '';
    t.windowTo = '';
  } else {
    const layout = t.layout ?? currentTimelineLayout();
    [t.windowFrom, t.windowTo] = defaultTimelineWindow(layout);
    syncEcologyFromTimelineWindow();
  }
  commitTimelineView();
}

function resetTimeline() {
  const t = state.timeline;
  t.by = 'actor'; t.lanes = []; t.from = ''; t.to = ''; t.windowFrom = ''; t.windowTo = ''; t.selectedKey = null; t.focusKey = null; t.evidenceFloor = 'open'; t.hop = 'all';
  commitTimelineView();
}

function showTimelineRow(key) {
  const row = timelineRow(key);
  if (!row || row.start_day == null) return;
  const chip = timelineYearChipDomain(isoFromDayIndex(row.start_day).slice(0, 4));
  if (chip) { state.timeline.from = chip.from; state.timeline.to = chip.to; }
  state.timeline.selectedKey = key;
  state.timeline.focusKey = key;
  state.timeline.followSelected = true;
  commitTimelineView();
}

function tryTimelineSuggestion(key, year) {
  const layout = state.timeline.layout ?? currentTimelineLayout();
  if (state.timeline.by !== 'actor') { state.timeline.by = 'actor'; state.timeline.lanes = []; }
  if (!layout.columns.some(column => column.key === key) && year) {
    const chip = timelineYearChipDomain(year);
    if (chip) { state.timeline.from = chip.from; state.timeline.to = chip.to; }
  }
  state.timeline.selectedKey = key;
  state.timeline.focusKey = key;
  state.timeline.followSelected = true;
  state.selectedSurfaceId = String(key).split('::').pop();
  commitTimelineView();
  if (isMobile()) { state.sheetOpen = true; syncInspectorSheet(); }
}

// Entity pages call this through data-ap-open-timeline="actor:<id>" (or organization:, type:, surface:).
function openTimelineFor(token) {
  const model = timelineModel();
  const [kind, ...rest] = String(token || '').split(':');
  const id = rest.join(':');
  if (!model || !id) return false;
  const t = state.timeline;
  state.address.applying = true;
  try {
    if (kind === 'surface') {
      const rows = model.surfaceRows.get(id) ?? [];
      if (!rows.length && !model.lanes.surface.has(id)) return false;
      const actors = unique(rows.filter(row => row.participant_type === 'actor').map(row => row.entity_id));
      const organizations = unique(rows.filter(row => row.participant_type === 'organization').map(row => row.entity_id));
      const dense = model.denseSurfaceIds.has(id);
      // A dense roster opens as its one block in the People view with the
      // default lanes: its listed names never get lanes from this entry point,
      // and the Organizations view has no block to select.
      if (dense) { t.by = 'actor'; t.lanes = []; }
      else if (actors.length) { t.by = 'actor'; t.lanes = actors.slice(0, TIMELINE_MAX_LANES); }
      else if (organizations.length) { t.by = 'organization'; t.lanes = organizations.slice(0, TIMELINE_MAX_LANES); }
      else { t.by = 'type'; t.lanes = []; }
      const first = rows.find(row => row.participant_type === (t.by === 'type' ? 'surface' : t.by)) ?? rows[0] ?? null;
      t.selectedKey = dense ? `dense::${id}` : t.by === 'type' ? `surface::${id}` : first?.key ?? null;
      const startDay = first?.start_day ?? model.surfaceMarks.find(mark => mark.surface_id === id)?.start_day ?? null;
      if (startDay != null) { const chip = timelineYearChipDomain(isoFromDayIndex(startDay).slice(0, 4)); if (chip) { t.from = chip.from; t.to = chip.to; } }
    } else if (TIMELINE_BY.includes(kind) && model.lanes[kind].has(id)) {
      const lane = model.lanes[kind].get(id);
      t.by = kind;
      t.lanes = unique([id, ...defaultTimelineLanes(model, kind).lanes.map(item => item.id)]).slice(0, TIMELINE_MAX_LANES);
      t.selectedKey = `lane::${id}`;
      if (lane.first_day_index != null) {
        const last = lane.last_day_index ?? model.range.last_day_index;
        t.from = isoFromDayIndex(lane.first_day_index - TIMELINE_DOMAIN_PADDING_DAYS);
        t.to = isoFromDayIndex(Math.max(last, lane.first_day_index + 365) + TIMELINE_DOMAIN_PADDING_DAYS);
      }
    } else {
      return false;
    }
    t.focusKey = t.selectedKey;
    t.followSelected = true;
    setMode('timeline', { history: 'none' });
  } finally {
    state.address.applying = false;
  }
  commitApertureAddress('push');
  state.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
  return true;
}

// --- origin hook (SPEC h) -------------------------------------------------------------------

function apertureSelectionId() {
  if (state.mode === 'timeline') return state.timeline?.selectedKey ?? null;
  if (state.mode === 'map') return state.map.selectedActorId || state.map.selectedFieldNodeId || state.map.selectedSurfaceId || null;
  if (state.mode === 'route') return state.route.selectedActorId || (Number.isInteger(state.route.selectedStep) ? `step:${state.route.selectedStep}` : null);
  return state.surface.selectedActorId || state.surface.surfaceId || null;
}

function selectApertureObject(id) {
  if (!id || !state.root) return;
  if (state.mode === 'timeline') { selectTimelineObject(String(id)); return; }
  if (state.mode === 'map') {
    if (state.actors.has(id)) selectActor(id, 'map');
    else if (state.surfaces.has(id)) selectMapSurface(id, { advance: false });
    return;
  }
  if (state.mode === 'route') {
    if (String(id).startsWith('step:')) { state.route.selectedStep = Number(String(id).slice(5)); state.route.selectedActorId = null; renderRouteMode(); commitApertureAddress('push'); }
    else selectActor(id, 'route');
    return;
  }
  if (state.actors.has(id)) selectActor(id, 'surface');
}

function publishApertureOrigin(label) {
  globalThis.__cliffordApertureOrigin = {
    mode: timelineModeLabel(),
    objectLabel: String(label ?? ''),
    objectId: apertureSelectionId(),
    selectObject: selectApertureObject
  };
}

// --- export (publication packet) ---------------------------------------------------------------

function timelineExportRow(entry) {
  if (entry.block) {
    const block = entry.block;
    return {
      key: block.key, surface_id: block.surface_id, surface_label: block.surface_label, surface_type: block.surface_type,
      participant_type: 'roster', entity_id: block.surface_id, entity_label: `${block.visible_listed_count} listed names`, role: 'roster listing', participation_type: 'dense_roster',
      time_start: block.iso_day, time_end: block.iso_day, precision: 'day', kind: 'block', window_label: block.iso_day ?? 'not dated',
      evidence_class: block.evidence_class ?? 'open', evidence_recorded: Boolean(block.evidence_class), hop_eligible: block.hop_eligible, hop_refusal_reason: block.refusal_reason,
      hop_basis_count: 0, in_window: block.in_window, receipt_ids: block.receipt_ids, lane_id: block.laneId, dense: true, rendering: entry.rendering
    };
  }
  const row = entry.row;
  return {
    key: row.key, surface_id: row.surface_id, surface_label: row.surface_label, surface_type: row.surface_type,
    participant_type: row.participant_type, entity_id: row.entity_id, entity_label: row.participant_type === 'surface' ? `${row.actor_count} people · ${row.organization_count} organizations` : row.entity_label,
    role: row.role, participation_type: row.participation_type, time_start: row.time_start, time_end: row.time_end, precision: row.precision, kind: row.kind, window_label: timelineWindowText(row),
    evidence_class: row.evidence_class ?? 'open', evidence_recorded: row.evidence_recorded, hop_eligible: row.surface_hop_eligible, hop_refusal_reason: row.hop_refusal_reason,
    hop_basis_count: row.hop_basis_count, in_window: entry.inWindow, receipt_ids: row.receipt_ids, lane_id: null, dense: row.dense, rendering: entry.rendering
  };
}

function currentTimelineExportView() {
  const layout = state.timeline.layout ?? currentTimelineLayout();
  const entries = timelineOverviewEntries(layout);
  const laneOf = new Map();
  for (const mark of layout.marks) laneOf.set(mark.key, mark.laneId);
  for (const aggregate of layout.aggregates) for (const key of aggregate.hidden_keys) laneOf.set(key, aggregate.laneId);
  return {
    by: layout.by,
    domain: { from: layout.domain.from, to: layout.domain.to, auto: layout.domain.auto },
    window: { from: layout.window.from, to: layout.window.to, active: layout.window.active },
    lanes: layout.lanes.map(lane => ({ id: lane.id, kind: lane.kind, label: lane.label, row_count: lane.row_count, drawn_count: lane.drawn_count })),
    rows: entries.map(entry => ({ ...timelineExportRow(entry), lane_id: entry.block ? entry.block.laneId : laneOf.get(entry.key) ?? null })),
    hop_days: layout.columns.map(column => ({ day: column.iso_day, surface_id: column.surface_id, surface_label: column.surface_label, basis_count: column.basis_count, total_basis_count: column.total_basis_count, actor_ids: column.actor_ids, lane_ids: column.segments.map(segment => segment.laneId), receipt_ids: column.receipt_ids })),
    dense: layout.blocks.map(block => ({ surface_id: block.surface_id, surface_label: block.surface_label, day: block.iso_day, listed_count: block.listed_count, row_count: block.row_count, visible_row_count: block.visible_row_count, refusal_reason: block.refusal_reason, receipt_ids: block.receipt_ids, elsewhere: block.elsewhere, nowhere_else_count: block.nowhere_else_count })),
    filters: { evidence_floor: layout.filters.evidenceFloor, hop: layout.filters.hop },
    counts: layout.counts,
    display: typeof boundedOverviewDisplay === 'function' ? boundedOverviewDisplay() : null
  };
}

// --- handlers (part-10 calls these first) -------------------------------------------------------

function handleTimelineAction(button) {
  const action = button?.dataset?.apAction;
  if (!action || !action.startsWith('timeline-')) return false;
  if (action === 'timeline-by') { setTimelineBy(button.dataset.by); return true; }
  if (action === 'timeline-year') { setTimelineYear(button.dataset.year); return true; }
  if (action === 'timeline-window-toggle') { toggleTimelineWindow(); return true; }
  if (action === 'timeline-reset') { resetTimeline(); return true; }
  if (action === 'timeline-select') { selectTimelineObject(button.dataset.key, { openSheet: true }); return true; }
  if (action === 'timeline-try') { tryTimelineSuggestion(button.dataset.key, button.dataset.year); return true; }
  if (action === 'timeline-show-row') { showTimelineRow(button.dataset.key); return true; }
  if (action === 'timeline-add-lane') { addTimelineLanes([button.dataset.id], { kind: button.dataset.kind }); return true; }
  if (action === 'timeline-add-lanes') { addTimelineLanes(String(button.dataset.ids || '').split(','), { kind: button.dataset.kind }); return true; }
  if (action === 'timeline-remove-lane') { removeTimelineLane(button.dataset.id); return true; }
  if (action === 'timeline-open-record') { openRecord(button.dataset.kind, button.dataset.id); return true; }
  if (action === 'timeline-route') {
    const ids = routeActorIds();
    if (ids.includes(button.dataset.from)) state.route.fromId = button.dataset.from;
    if (ids.includes(button.dataset.to)) state.route.toId = button.dataset.to;
    state.route.selectedActorId = null;
    state.route.selectedStep = null;
    setMode('route');
    return true;
  }
  return false;
}

function handleTimelineClick(event) {
  if (state.mode !== 'timeline') return false;
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  if (!target?.closest('#aperture-timeline')) return false;
  const mark = target.closest('[data-ap-time-mark]');
  if (mark) { selectTimelineObject(mark.dataset.apTimeMark, { openSheet: true }); return true; }
  const column = target.closest('[data-ap-time-column]');
  if (column) { selectTimelineObject(column.dataset.apTimeColumn, { openSheet: true }); return true; }
  const block = target.closest('[data-ap-time-block]');
  if (block) { selectTimelineObject(block.dataset.apTimeBlock, { openSheet: true }); return true; }
  const aggregate = target.closest('[data-ap-time-aggregate]');
  if (aggregate) { selectTimelineObject(aggregate.dataset.apTimeAggregate, { openSheet: true }); return true; }
  const lane = target.closest('[data-ap-time-lane]');
  if (lane) { selectTimelineObject(`lane::${lane.dataset.apTimeLane}`, { openSheet: true }); return true; }
  if (target.closest('[data-ap-time-handle], [data-ap-time-ov]')) return true;
  if (isMobile()) { state.sheetOpen = false; syncInspectorSheet(); }
  return true;
}

function handleTimelineInput(event) {
  void event;
  return false;
}

function handleTimelineChange(event) {
  const target = event.target;
  if (!target || !state.timeline) return false;
  if (target.id === 'ap-time-lane') {
    const entry = findTimelineSearchEntry(target.value);
    if (entry) { target.value = ''; addTimelineLanes([entry.id], { kind: entry.kind }); }
    return true;
  }
  if (state.mode !== 'timeline') return false;
  if (target.id === 'ap-time-hop') { state.timeline.hop = TIMELINE_HOP_FILTERS.includes(target.value) ? target.value : 'all'; commitTimelineView({ controls: false }); return true; }
  if (target.id === 'ap-time-evidence') { state.timeline.evidenceFloor = TIMELINE_EVIDENCE_FLOORS.has(target.value) ? target.value : 'open'; commitTimelineView({ controls: false }); return true; }
  return false;
}

function handleTimelineKeydown(event) {
  const target = event.target instanceof Element ? event.target : null;
  if (!target || !state.timeline) return false;
  if (target.id === 'ap-time-lane' && event.key === 'Enter') {
    event.preventDefault();
    const entry = findTimelineSearchEntry(target.value);
    if (entry) { target.value = ''; addTimelineLanes([entry.id], { kind: entry.kind }); }
    return true;
  }
  if (state.mode !== 'timeline' || !target.closest('#aperture-timeline')) return false;
  const handle = target.closest('[data-ap-time-handle], [data-ap-time-ov]');
  if (handle && ['ArrowLeft', 'ArrowRight'].includes(event.key)) {
    event.preventDefault();
    nudgeTimelineHandle(handle, (event.key === 'ArrowRight' ? 1 : -1) * (event.shiftKey ? 30 : 1));
    return true;
  }
  if (event.key === 'Escape') { event.preventDefault(); clearTimelineSelection(); return true; }
  const laneLabel = target.closest('[data-ap-time-lane]');
  if (laneLabel && ['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const labels = [...$('#aperture-timeline', state.root).querySelectorAll('[data-ap-time-lane]')];
    const index = labels.indexOf(laneLabel);
    const next = event.key === 'Home' ? labels[0] : event.key === 'End' ? labels[labels.length - 1] : labels[Math.max(0, Math.min(labels.length - 1, index + (event.key === 'ArrowDown' ? 1 : -1)))];
    if (next && next !== laneLabel) moveTimelineRovingFocus(laneLabel, next);
    return true;
  }
  const item = target.closest('[data-ap-time-mark], [data-ap-time-block], [data-ap-time-aggregate], [data-ap-time-column]');
  if (item && ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    focusTimelineNeighbour(item, event.key);
    return true;
  }
  return false;
}

function timelineItemX(element) {
  const rect = element.tagName === 'rect' ? element : element.querySelector('rect');
  return Number(rect?.getAttribute('x') ?? 0);
}

function focusTimelineNeighbour(current, key) {
  const host = $('#aperture-timeline', state.root);
  const layout = state.timeline.layout;
  if (!host || !layout) return;
  const items = [...host.querySelectorAll('[data-ap-time-mark], [data-ap-time-block], [data-ap-time-aggregate], [data-ap-time-column]')]
    .map(element => ({ element, lane: element.dataset.lane, x: timelineItemX(element) }));
  const laneOrder = layout.lanes.map(lane => lane.id);
  const currentLane = current.dataset.lane;
  const currentX = timelineItemX(current);
  let next = null;
  if (key === 'ArrowLeft' || key === 'ArrowRight' || key === 'Home' || key === 'End') {
    const sameLane = items.filter(item => item.lane === currentLane).sort((a, b) => a.x - b.x || (a.element === current ? -1 : 0));
    const index = sameLane.findIndex(item => item.element === current);
    if (key === 'Home') next = sameLane[0];
    else if (key === 'End') next = sameLane[sameLane.length - 1];
    else next = sameLane[Math.max(0, Math.min(sameLane.length - 1, index + (key === 'ArrowRight' ? 1 : -1)))];
  } else {
    const direction = key === 'ArrowDown' ? 1 : -1;
    let laneIndex = laneOrder.indexOf(currentLane);
    while (!next) {
      laneIndex += direction;
      if (laneIndex < 0 || laneIndex >= laneOrder.length) break;
      const candidates = items.filter(item => item.lane === laneOrder[laneIndex]);
      if (candidates.length) next = candidates.sort((a, b) => Math.abs(a.x - currentX) - Math.abs(b.x - currentX))[0];
    }
  }
  if (next?.element && next.element !== current) moveTimelineRovingFocus(current, next.element);
}

// The Tab stop travels with the focus: the element left behind leaves the tab
// order, the one reached joins it, and the next render keeps it there.
function moveTimelineRovingFocus(current, next) {
  current.setAttribute('tabindex', '-1');
  next.setAttribute('tabindex', '0');
  state.timeline.focusKey = timelineElementKey(next);
  next.focus({ preventScroll: false });
}

function nudgeTimelineHandle(handle, deltaDays) {
  const layout = state.timeline.layout;
  if (!layout) return;
  const t = state.timeline;
  if (handle.dataset.apTimeHandle) {
    const part = handle.dataset.apTimeHandle;
    let fromDay = dayIndex(t.windowFrom || t.windowTo);
    let toDay = dayIndex(t.windowTo || t.windowFrom, true);
    if (part === 'from') fromDay = Math.max(layout.domain.from_day, Math.min(toDay, fromDay + deltaDays));
    else toDay = Math.min(layout.domain.to_day, Math.max(fromDay, toDay + deltaDays));
    t.windowFrom = isoFromDayIndex(fromDay);
    t.windowTo = isoFromDayIndex(toDay);
    t.focusKey = null;
    syncEcologyFromTimelineWindow();
    commitTimelineView({ history: 'replace' });
    $(`[data-ap-time-handle="${part}"]`, state.root)?.focus({ preventScroll: true });
    return;
  }
  const part = handle.dataset.apTimeOv;
  let fromDay = layout.domain.from_day;
  let toDay = layout.domain.to_day;
  if (part === 'from') fromDay = Math.max(layout.overview.from_day, Math.min(toDay - TIMELINE_MIN_DOMAIN_DAYS, fromDay + deltaDays));
  else if (part === 'to') toDay = Math.min(layout.overview.to_day, Math.max(fromDay + TIMELINE_MIN_DOMAIN_DAYS, toDay + deltaDays));
  else { fromDay += deltaDays; toDay += deltaDays; }
  t.from = isoFromDayIndex(fromDay);
  t.to = isoFromDayIndex(toDay);
  commitTimelineView({ history: 'replace' });
  $(`[data-ap-time-ov="${part}"]`, state.root)?.focus({ preventScroll: true });
}

// --- stage events: wheel zoom, drags, tooltip, resize -----------------------------------------------

function bindTimelineStage(host) {
  if (host.dataset.timelineBound === 'true') return;
  host.dataset.timelineBound = 'true';
  host.addEventListener('wheel', handleTimelineWheel, { passive: false });
  host.addEventListener('pointerdown', handleTimelinePointerDown);
  host.addEventListener('pointermove', handleTimelinePointerMove);
  host.addEventListener('pointerleave', () => hideTimelineTip(host));
  if (!timelineResizeObserver && typeof ResizeObserver === 'function') {
    timelineResizeObserver = new ResizeObserver(() => {
      if (state.mode !== 'timeline' || host.hidden) return;
      const width = host.clientWidth;
      if (!width || Math.abs(width - (state.timeline.layout?.containerWidth ?? 0)) < 2) return;
      cancelAnimationFrame(timelineResizeFrame);
      timelineResizeFrame = requestAnimationFrame(() => {
        timelineResizeFrame = 0;
        if (state.mode === 'timeline') renderTimelineMode();
      });
    });
    timelineResizeObserver.observe(host);
  }
}

function handleTimelineWheel(event) {
  if (state.mode !== 'timeline') return;
  // A plain wheel keeps scrolling the page (or the lane list when it
  // overflows); only Ctrl/Cmd + wheel, which is also how a trackpad pinch
  // arrives, zooms the axis. The stage never takes the page scroll.
  if (!event.ctrlKey && !event.metaKey) return;
  const layout = state.timeline.layout;
  const host = event.currentTarget;
  const plot = host?.querySelector('.aperture-time-plot');
  if (!layout || !plot) return;
  const rect = plot.getBoundingClientRect();
  const x = event.clientX - rect.left;
  if (x < layout.plotLeft) return;
  event.preventDefault();
  const pointerDay = timelineDayAt(layout, x);
  const factor = event.deltaY > 0 ? 1 + TIMELINE_WHEEL_STEP : 1 - TIMELINE_WHEEL_STEP;
  let fromDay = Math.round(pointerDay - (pointerDay - layout.domain.from_day) * factor);
  let toDay = Math.round(pointerDay + (layout.domain.to_day - pointerDay) * factor);
  fromDay = Math.max(layout.overview.from_day ?? fromDay, fromDay);
  toDay = Math.min(layout.overview.to_day ?? toDay, toDay);
  if (toDay - fromDay < TIMELINE_MIN_DOMAIN_DAYS) return;
  state.timeline.from = isoFromDayIndex(fromDay);
  state.timeline.to = isoFromDayIndex(toDay);
  refreshTimelineStageOnly();
  clearTimeout(timelineWheelTimer);
  timelineWheelTimer = setTimeout(() => {
    if (state.mode !== 'timeline') return;
    commitTimelineView({ history: 'replace' });
  }, 250);
}

function handleTimelinePointerDown(event) {
  if (state.mode !== 'timeline' || (event.button !== 0 && event.pointerType === 'mouse')) return;
  const target = event.target instanceof Element ? event.target : null;
  const handle = target?.closest('[data-ap-time-handle]');
  const overview = target?.closest('[data-ap-time-ov]');
  const layout = state.timeline.layout;
  if ((!handle && !overview) || !layout) return;
  event.preventDefault();
  const svg = (handle ?? overview).closest('svg');
  timelineDrag = {
    kind: handle ? 'window' : 'overview',
    part: handle ? handle.dataset.apTimeHandle : overview.dataset.apTimeOv,
    rect: svg.getBoundingClientRect(),
    layout,
    startX: event.clientX,
    startFrom: layout.domain.from_day,
    startTo: layout.domain.to_day,
    moved: false
  };
  const move = moveEvent => { timelineDrag.moved = true; timelineDragUpdate(moveEvent.clientX); };
  const up = () => {
    document.removeEventListener('pointermove', move);
    document.removeEventListener('pointerup', up);
    document.removeEventListener('pointercancel', up);
    timelineDragEnd();
  };
  document.addEventListener('pointermove', move);
  document.addEventListener('pointerup', up);
  document.addEventListener('pointercancel', up);
}

function timelineDragUpdate(clientX) {
  const drag = timelineDrag;
  if (!drag) return;
  const t = state.timeline;
  const layout = drag.layout;
  const x = clientX - drag.rect.left;
  if (drag.kind === 'window') {
    const day = Math.round(Math.max(layout.domain.from_day, Math.min(layout.domain.to_day, timelineDayAt(layout, x))));
    const fromDay = dayIndex(t.windowFrom || t.windowTo);
    const toDay = dayIndex(t.windowTo || t.windowFrom, true);
    if (drag.part === 'from') { t.windowFrom = isoFromDayIndex(Math.min(day, toDay)); t.windowTo = isoFromDayIndex(toDay); }
    else { t.windowTo = isoFromDayIndex(Math.max(day, fromDay)); t.windowFrom = isoFromDayIndex(fromDay); }
  } else {
    const minDay = layout.overview.from_day;
    const maxDay = layout.overview.to_day;
    let fromDay = drag.startFrom;
    let toDay = drag.startTo;
    if (drag.part === 'from') fromDay = Math.round(Math.max(minDay, Math.min(toDay - TIMELINE_MIN_DOMAIN_DAYS, timelineOverviewDayAt(layout, x))));
    else if (drag.part === 'to') toDay = Math.round(Math.min(maxDay, Math.max(fromDay + TIMELINE_MIN_DOMAIN_DAYS, timelineOverviewDayAt(layout, x))));
    else {
      const pxPerDay = layout.plotWidth / Math.max(1, maxDay - minDay);
      let delta = Math.round((clientX - drag.startX) / pxPerDay);
      delta = Math.max(minDay - drag.startFrom, Math.min(maxDay - drag.startTo, delta));
      fromDay = drag.startFrom + delta;
      toDay = drag.startTo + delta;
    }
    t.from = isoFromDayIndex(fromDay);
    t.to = isoFromDayIndex(toDay);
  }
  scheduleTimelineStageRefresh();
}

function timelineDragEnd() {
  const drag = timelineDrag;
  timelineDrag = null;
  if (!drag || !drag.moved || state.mode !== 'timeline') return;
  cancelAnimationFrame(timelineStageFrame);
  timelineStageFrame = 0;
  if (drag.kind === 'window') syncEcologyFromTimelineWindow();
  commitTimelineView({ history: 'replace' });
}

function timelineTipText(element) {
  const layout = state.timeline.layout;
  if (!layout) return '';
  const { apTimeMark, apTimeColumn, apTimeBlock, apTimeAggregate, apTimeLane } = element.dataset;
  if (apTimeMark) {
    const mark = layout.marks.find(item => item.key === apTimeMark);
    if (!mark) return '';
    const who = mark.participant_type === 'surface' ? mark.surface_label : `${mark.entity_label} · ${shortLabel(mark.surface_label, 52)}`;
    return `${who} · ${timelineWindowText(mark)} · ${mark.evidence_recorded ? evidenceLabel(mark.evidence_class) : 'class not recorded'} · ${mark.hop_eligible ? 'hop-eligible' : `context-only (${mark.hop_refusal_reason ? humanLabel(mark.hop_refusal_reason) : 'reason not recorded'})`}`;
  }
  if (apTimeColumn) {
    const column = layout.columns.find(item => item.key === apTimeColumn);
    return column ? `${column.surface_label} · ${column.iso_day} · ${column.basis_count} admitted base${column.basis_count === 1 ? '' : 's'} among ${column.actor_ids.length} people · one surface column` : '';
  }
  if (apTimeBlock) {
    const block = layout.blocks.find(item => item.key === apTimeBlock);
    return block ? `${block.surface_label} · ${block.listed_count} listed names · one contained roster, no per-person marks` : '';
  }
  if (apTimeAggregate) {
    const aggregate = layout.aggregates.find(item => item.key === apTimeAggregate);
    return aggregate ? `+${aggregate.count} more rows fold into this mark · click to list them` : '';
  }
  if (apTimeLane) {
    const lane = layout.lanes.find(item => item.id === apTimeLane);
    return lane ? `${lane.label} · ${timelineLaneMeta(lane, layout)}` : '';
  }
  return '';
}

function hideTimelineTip(host) {
  const tip = host?.querySelector('.aperture-time-tip');
  if (tip) tip.hidden = true;
}

function handleTimelinePointerMove(event) {
  if (event.pointerType === 'touch' || timelineDrag) return;
  const host = event.currentTarget;
  const tip = host.querySelector('.aperture-time-tip');
  if (!tip) return;
  const target = event.target instanceof Element ? event.target.closest('[data-ap-time-mark], [data-ap-time-column], [data-ap-time-block], [data-ap-time-aggregate], [data-ap-time-lane]') : null;
  const text = target ? timelineTipText(target) : '';
  if (!text) { tip.hidden = true; return; }
  tip.textContent = text;
  tip.hidden = false;
  const hostRect = host.getBoundingClientRect();
  const rect = target.getBoundingClientRect();
  const left = Math.max(120, Math.min(hostRect.width - 120, rect.left - hostRect.left + rect.width / 2));
  const top = Math.max(26, rect.top - hostRect.top - 6);
  tip.style.left = `${left}px`;
  tip.style.top = `${top}px`;
}
