const APERTURE_FIELD_LEGEND = `
  <span><i class="aperture-key aperture-key--actor"></i> People</span>
  <span><i class="aperture-key"></i> Organizations</span>
  <span><i class="aperture-key aperture-key--surface"></i> Named surfaces</span>
  <span>Size = documented surfaces (participants for a surface)</span>
  <span>Lines: official · primary public · reported · context</span>
  <span>Time filter: dated rows outside the window fade; undated context stays visible.</span>`;
const APERTURE_FIELD_PLAY_SPAN_DAYS = 365;
const APERTURE_FIELD_ROW_LIMIT = 10;
const APERTURE_FIELD_HOST_LABEL = 'Spherical social field. Node size and halo show the documented surface count for each object; arcs are sourced graph edges coloured by evidence class.';

function fieldReducedMotion() {
  if (state.webgl && typeof state.webgl.reducedMotion === 'boolean') return state.webgl.reducedMotion;
  const reduced = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (state.webgl) state.webgl.reducedMotion = reduced;
  return reduced;
}

function setApertureFieldActive(active) {
  const host = $('#aperture-webgl', state.root);
  const svg = $('#aperture-stage', state.root);
  const legend = $('#aperture-stage-legend', state.root);
  const badge = $('#aperture-renderer-badge', state.root);
  if (!host || !svg) return;
  if (legend && !legend.dataset.defaultMarkup) legend.dataset.defaultMarkup = legend.innerHTML;
  if (host.getAttribute('aria-label') !== APERTURE_FIELD_HOST_LABEL) host.setAttribute('aria-label', APERTURE_FIELD_HOST_LABEL);
  host.hidden = !active;
  host.classList.toggle('is-active', active);
  host.style.display = active ? 'block' : 'none';
  svg.hidden = active;
  svg.style.display = active ? 'none' : 'block';
  if (legend) legend.innerHTML = active ? APERTURE_FIELD_LEGEND : legend.dataset.defaultMarkup;
  if (badge) {
    badge.textContent = active ? 'Live evidence field' : 'SVG evidence map';
    badge.dataset.engine = active ? 'webgl' : 'svg';
  }
  if (state.webgl) state.webgl.active = active;
  syncFieldAnimation();
}

function deactivateApertureSocialField() {
  setApertureFieldActive(false);
}

// The time window. state.ecology.fromDay / toDay are UTC day integers or null
// (unbounded on that side). Both null is the all-time state: every dated row is
// inside, nothing fades, no pulse is drawn.
function ecologyRange() {
  return state.webgl?.ledger?.range ?? state.webgl?.events?.range ?? null;
}
function ecologyWindow() {
  const api = state.webgl?.eventApi;
  const range = ecologyRange();
  if (!api?.normalizeEcologyWindow || !range) {
    return { fromDay: null, toDay: null, unbounded: true, startDay: -Infinity, endDay: Infinity };
  }
  return api.normalizeEcologyWindow(range, { fromDay: state.ecology.fromDay, toDay: state.ecology.toDay });
}
function ecologyWindowFactors(window = ecologyWindow()) {
  const api = state.webgl?.eventApi;
  if (!api?.fieldWindowFactors || !state.webgl?.ledger) return null;
  return api.fieldWindowFactors(state.webgl.ledger, window);
}
function ecologyClockLabel() {
  const api = state.webgl?.eventApi;
  const range = ecologyRange();
  if (!api?.ecologyWindowLabel || !range) return 'Evidence timeline';
  const window = ecologyWindow();
  const label = api.ecologyWindowLabel(range, window);
  const factors = ecologyWindowFactors(window);
  if (!factors) return label;
  return `${label} · ${fieldWindowCountPhrase(factors, window)}`;
}
// part-3 renders one range input (#ap-ecology-time). The field upgrades it into
// a window: the existing input becomes the start handle, a second input is the
// end handle, both in day offsets from the first documented day, and an "All
// time" button clears the window.
function ensureEcologyWindowControls() {
  const from = $('#ap-ecology-time', state.root);
  if (!from) return null;
  const range = ecologyRange();
  let to = $('#ap-ecology-time-to', state.root);
  if (!to) {
    to = document.createElement('input');
    to.type = 'range';
    to.id = 'ap-ecology-time-to';
    from.after(to);
  }
  if (from.getAttribute('aria-label') !== 'Window start') from.setAttribute('aria-label', 'Window start');
  if (to.getAttribute('aria-label') !== 'Window end') to.setAttribute('aria-label', 'Window end');
  const days = String(range ? Math.max(1, range.last_day - range.first_day) : 1000);
  // Attribute writes happen only on change: this runs on every clock frame while Play is on.
  for (const input of [from, to]) {
    if (input.min !== '0') input.min = '0';
    if (input.max !== days) input.max = days;
    if (input.step !== '1') input.step = '1';
  }
  const toggle = $('[data-ap-action="ecology-toggle"]', state.root);
  if (toggle && !$('[data-ap-action="ecology-all-time"]', state.root)) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'aperture-secondary-button aperture-ecology-toggle';
    button.dataset.apAction = 'ecology-all-time';
    button.textContent = 'All time';
    toggle.after(button);
  }
  return { from, to };
}
function syncEcologyClockControls() {
  const controls = ensureEcologyWindowControls();
  const range = ecologyRange();
  const window = ecologyWindow();
  const output = $('#ap-ecology-date', state.root);
  if (controls && range) {
    controls.from.value = String(Math.max(0, window.startDay - range.first_day));
    controls.to.value = String(Math.max(0, window.endDay - range.first_day));
    controls.from.closest('label')?.classList.toggle('is-windowed', !window.unbounded);
  }
  if (output) output.textContent = ecologyClockLabel();
  const button = $('[data-ap-action="ecology-toggle"]', state.root);
  if (button) {
    const reduced = fieldReducedMotion();
    button.textContent = state.ecology.playing ? 'Pause time' : 'Play time';
    button.setAttribute('aria-pressed', String(state.ecology.playing));
    button.disabled = reduced;
    button.title = reduced ? 'Playback stays off under the reduced-motion preference; drag the window handles instead.' : 'Advance the time window over 52 seconds';
  }
  const allTime = $('[data-ap-action="ecology-all-time"]', state.root);
  if (allTime) allTime.disabled = window.unbounded;
}
// "N of M rows in window": M is always the ledger's row count for the object,
// N the ledger's in-window count, undated rows named apart. Neither is ever
// read off the DOM. social-field owns the wording (windowCountPhrase).
function fieldWindowCountPhrase(counts, window) {
  const api = state.webgl?.eventApi;
  if (api?.windowCountPhrase) return api.windowCountPhrase(counts, window);
  const total = counts.rows_total ?? 0;
  return window.unbounded ? `${total} row${total === 1 ? '' : 's'}` : `${counts.rows_in_window ?? 0} of ${total} rows in window`;
}
function fieldWindowCountLabel(counts, window) {
  const phrase = fieldWindowCountPhrase(counts, window);
  return window.unbounded ? `${phrase} · all time` : phrase;
}
function syncInspectorWindowMarks() {
  if (!state.root) return;
  const api = state.webgl?.eventApi;
  const ledger = state.webgl?.ledger;
  const window = ecologyWindow();
  let inWindow = 0, undated = 0, total = 0;
  for (const item of $$('[data-ap-row]', state.root)) {
    const start = item.dataset.apStart === '' || item.dataset.apStart == null ? null : Number(item.dataset.apStart);
    const end = item.dataset.apEnd === '' || item.dataset.apEnd == null ? null : Number(item.dataset.apEnd);
    // An undated row is never time-sliced, so it never dims.
    const dated = start != null;
    const inside = !dated || !api?.rowInWindow || api.rowInWindow({ start_day: start, end_day: end }, window);
    item.classList.toggle('is-outside', !inside);
    item.style.opacity = inside ? '' : '.45';
    total += 1;
    if (!dated) undated += 1; else if (inside) inWindow += 1;
  }
  const header = $('[data-ap-window-count]', state.root);
  if (!header) return;
  // The header names the object it counts (data-ap-node); its numbers come from
  // the ledger summary of that object. The visible items are a fallback only
  // when no ledger is available, never a denominator of their own.
  const nodeId = header.dataset?.apNode;
  const summary = nodeId && api?.nodeLedgerSummary && ledger ? api.nodeLedgerSummary(ledger, nodeId, window) : null;
  header.textContent = fieldWindowCountLabel(summary ?? { rows_total: total, rows_in_window: inWindow, rows_undated: undated }, window);
}
function applyEcologyWindow({ sync = true } = {}) {
  const renderer = state.webgl?.renderer;
  const factors = ecologyWindowFactors();
  if (renderer?.setTimeWindow && factors) renderer.setTimeWindow(factors);
  if (sync) syncEcologyClockControls();
  syncInspectorWindowMarks();
}
function setEcologyWindow(fromDay, toDay, { pause = false } = {}) {
  const api = state.webgl?.eventApi;
  const range = ecologyRange();
  const normalized = api?.normalizeEcologyWindow && range
    ? api.normalizeEcologyWindow(range, { fromDay, toDay })
    : { fromDay: Number.isFinite(fromDay) ? fromDay : null, toDay: Number.isFinite(toDay) ? toDay : null, startDay: fromDay };
  state.ecology.fromDay = normalized.fromDay ?? null;
  state.ecology.toDay = normalized.toDay ?? null;
  if (range && Number.isFinite(normalized.startDay)) {
    state.ecology.position = Math.max(0, Math.min(1, (normalized.startDay - range.first_day) / Math.max(1, range.last_day - range.first_day)));
  }
  if (pause) {
    state.ecology.playing = false;
    state.ecology.clockEnd = null;
    stopEcologyClock();
  }
  applyEcologyWindow();
}
function setEcologyWindowFromControl(input) {
  const controls = ensureEcologyWindowControls();
  const range = ecologyRange();
  if (!controls || !range) return;
  let from = range.first_day + Number(controls.from.value);
  let to = range.first_day + Number(controls.to.value);
  // Dragging one handle past the other pushes the other along instead of swapping.
  if (from > to) {
    if (input === controls.from) to = from; else from = to;
  }
  setEcologyWindow(from, to, { pause: true });
}
// Play advances the window end over cycleMs, keeping the window width. Starting
// from all time, the window becomes the first APERTURE_FIELD_PLAY_SPAN_DAYS days.
function stopEcologyClock() {
  if (state.ecology.frame) cancelAnimationFrame(state.ecology.frame);
  state.ecology.frame = 0;
  state.ecology.lastTimestamp = 0;
}
function ecologyClockFrame(timestamp) {
  state.ecology.frame = 0;
  if (!state.ecology.playing || !fieldAnimationAllowed()) return;
  const range = ecologyRange();
  if (range && state.ecology.lastTimestamp) {
    const delta = Math.min(250, timestamp - state.ecology.lastTimestamp);
    const span = Math.max(1, range.last_day - range.first_day);
    const window = ecologyWindow();
    const width = window.unbounded ? Math.min(APERTURE_FIELD_PLAY_SPAN_DAYS, span) : Math.max(1, window.endDay - window.startDay);
    let end = Number.isFinite(state.ecology.clockEnd) ? state.ecology.clockEnd : (window.unbounded ? range.first_day + width : window.endDay);
    end += delta / state.ecology.cycleMs * span;
    if (end > range.last_day) end = range.first_day + width;
    state.ecology.clockEnd = end;
    state.ecology.fromDay = Math.round(end - width);
    state.ecology.toDay = Math.round(end);
    if (state.ecology.toDay >= range.last_day) state.ecology.toDay = null;
    if (state.ecology.fromDay <= range.first_day) state.ecology.fromDay = null;
    state.ecology.position = Math.max(0, Math.min(1, (end - width - range.first_day) / span));
    applyEcologyWindow();
  }
  state.ecology.lastTimestamp = timestamp;
  state.ecology.frame = requestAnimationFrame(ecologyClockFrame);
}
function startEcologyClock() {
  if (!state.ecology.playing || state.ecology.frame || !fieldAnimationAllowed()) return;
  state.ecology.lastTimestamp = 0;
  state.ecology.frame = requestAnimationFrame(ecologyClockFrame);
}
function setEcologyPlaying(playing) {
  const next = Boolean(playing) && !fieldReducedMotion();
  state.ecology.playing = next;
  state.ecology.clockEnd = null;
  if (next) {
    const range = ecologyRange();
    const window = ecologyWindow();
    if (range && window.unbounded) {
      const width = Math.min(APERTURE_FIELD_PLAY_SPAN_DAYS, Math.max(1, range.last_day - range.first_day));
      setEcologyWindow(range.first_day, range.first_day + width);
    }
  }
  syncFieldAnimation();
  syncEcologyClockControls();
}
// Every continuous loop the field owns (the renderer's render loop and the
// play clock) runs only while the stage is on screen, the document is visible
// and the field is the active map stage. root.dataset.apertureAnimation
// reports the state for tests.
function fieldAnimationAllowed() {
  if (state.mode !== 'map' || !state.webgl?.renderer || state.webgl.active === false) return false;
  if (state.webgl.intersecting === false) return false;
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
  return true;
}
function syncFieldAnimation() {
  const renderer = state.webgl?.renderer;
  const running = Boolean(renderer) && fieldAnimationAllowed();
  if (renderer) {
    if (running) renderer.resume?.(); else renderer.pause?.();
  }
  if (running) startEcologyClock(); else stopEcologyClock();
  if (state.root) state.root.dataset.apertureAnimation = running ? 'running' : 'paused';
}
function bindFieldLifecycle(host) {
  if (!state.webgl || state.webgl.lifecycleBound) return;
  state.webgl.lifecycleBound = true;
  state.webgl.intersecting = true;
  if ('IntersectionObserver' in window) {
    state.webgl.fieldObserver = new IntersectionObserver(entries => {
      state.webgl.intersecting = entries.some(entry => entry.isIntersecting);
      syncFieldAnimation();
    }, { threshold: 0 });
    state.webgl.fieldObserver.observe(host);
  }
  document.addEventListener('visibilitychange', syncFieldAnimation);
}
function apertureFieldSurfaceNodeId(surfaceId) {
  return surfaceId ? `surface-${surfaceId}` : null;
}
function apertureFieldNeighbors(model, id) {
  const ids = new Set(id ? [id] : []);
  if (!id) return ids;
  for (const edge of model?.edges ?? []) {
    const from = typeof edge.from === 'object' ? edge.from?.id : edge.from ?? edge.source;
    const to = typeof edge.to === 'object' ? edge.to?.id : edge.to ?? edge.target;
    if (from === id && to) ids.add(typeof to === 'object' ? to.id : to);
    if (to === id && from) ids.add(typeof from === 'object' ? from.id : from);
  }
  return ids;
}
function apertureFieldSurfaceIds(surfaceId) {
  const surfaceNodeId = apertureFieldSurfaceNodeId(surfaceId);
  return apertureFieldNeighbors(state.webgl?.model, surfaceNodeId);
}
function apertureFieldClusterIds(clusterId) {
  const ids = new Set();
  if (!clusterId) return ids;
  for (const surface of state.surfaces.values()) {
    if (clusterForSurface(surface) !== clusterId) continue;
    for (const id of apertureFieldSurfaceIds(surface.surface_id)) ids.add(id);
  }
  return ids;
}
function apertureFieldView() {
  const level = state.map.level;
  const surfaceNodeId = apertureFieldSurfaceNodeId(state.map.selectedSurfaceId);
  const fieldNodeId = state.map.selectedFieldNodeId || state.map.selectedActorId || null;
  let focusIds = new Set();
  let focusNodeId = null;
  if (level === 'machine') {
    if (fieldNodeId) {
      focusIds = apertureFieldNeighbors(state.webgl?.model, fieldNodeId);
      focusNodeId = fieldNodeId;
    } else if (state.map.hasExplicitFocus) {
      focusIds = apertureFieldClusterIds(state.map.selectedClusterId);
    }
  } else if (level === 'surface' || level === 'evidence') {
    focusIds = apertureFieldSurfaceIds(state.map.selectedSurfaceId);
    focusNodeId = level === 'evidence' && fieldNodeId ? fieldNodeId : surfaceNodeId;
  }
  const primaryIds = [surfaceNodeId, fieldNodeId].filter(Boolean);
  return {
    level,
    focusIds: [...focusIds],
    primaryIds,
    focusNodeId,
    fade: level === 'corpus' ? .2 : level === 'machine' ? .065 : .022
  };
}
function bestSurfaceForFieldNode(id) {
  const candidates = [...state.surfaces.values()].filter(surface => actorParticipants(surface).some(participant => participant.actor_id === id));
  return candidates.sort((a, b) => Number(b.hop_eligible) - Number(a.hop_eligible) || actorParticipants(a).length - actorParticipants(b).length || a.surface_label.localeCompare(b.surface_label))[0] ?? null;
}
function selectApertureFieldActor(id) {
  const actor = state.actors.get(id);
  if (!actor) return;
  const surface = bestSurfaceForFieldNode(id);
  state.selectedActorId = id;
  state.map.selectedActorId = id;
  state.map.selectedFieldNodeId = id;
  state.map.hasExplicitFocus = true;
  if (surface) {
    state.map.selectedClusterId = clusterForSurface(surface);
    state.map.selectedTypeId = surface.surface_type;
    state.map.selectedSurfaceId = surface.surface_id;
    state.selectedSurfaceId = surface.surface_id;
  }
  state.map.scale = Math.max(state.map.scale, 1.9);
  state.map.level = semanticLevelForScale(state.map.scale, state.map.level);
  renderModeControls();
  renderMapMode();
  commitApertureAddress('push');
}
function fieldNodeLabel(id) {
  return state.actors.get(id)?.label || state.legacyNodes.get(id)?.label || state.surfaces.get(String(id).replace(/^surface-/, ''))?.surface_label || id;
}
// A row the field cannot draw is labelled, never omitted. privacy_guard: the
// public graph carries no node for that surface at all. dense_roster_contained:
// the surface is drawn as one contained object, so the row has no arc of its own.
function fieldRowFieldNote(row) {
  if (row.on_field) return '';
  const text = row.off_field_reason === 'privacy_guard'
    ? 'not drawn on the field (privacy guard)'
    : row.off_field_reason === 'dense_roster_contained'
      ? 'drawn as one contained roster object, not as an arc'
      : 'not drawn on the field';
  return `<small class="aperture-field-row-note" data-ap-off-field="${esc(row.off_field_reason || 'unresolved')}">${text}</small>`;
}
function fieldRowItem(row, window) {
  const api = state.webgl?.eventApi;
  const inside = api?.rowInWindow ? api.rowInWindow(row, window) : true;
  const classes = ['aperture-field-row', inside ? '' : 'is-outside', row.on_field ? '' : 'is-off-field'].filter(Boolean).join(' ');
  const receipts = row.receipt_ids.length;
  return `<li class="${classes}"${inside ? '' : ' style="opacity:.45"'} data-ap-row="${esc(row.row_id)}" data-ap-start="${row.start_day ?? ''}" data-ap-end="${row.end_day ?? ''}">
    <strong>${esc(row.time_label)}${row.precision === 'year' ? ' (year precision)' : row.precision === 'month' ? ' (month precision)' : ''}</strong>
    <span>${esc(row.surface_label)}</span>
    <small>${esc(row.role)} · ${esc(evidenceLabel(row.evidence_class))} · ${receipts} receipt${receipts === 1 ? '' : 's'}</small>
    ${fieldRowFieldNote(row)}
    ${receiptButtons(row.receipt_ids, row.receipt_ids.length)}
    <div class="aperture-actions"><button type="button" class="aperture-secondary-button" data-ap-surface="${esc(row.surface_id)}">Open bounded surface</button></div>
  </li>`;
}
// The documented rows of one field object, oldest first: every ledger row,
// including the ones the field cannot draw, with the window state on each. The
// first APERTURE_FIELD_ROW_LIMIT rows are open; the rest are listed inside a
// details element. No row is left out: a bounded rendering is not a deletion.
function fieldRowsMarkup(id) {
  const api = state.webgl?.eventApi;
  const ledger = state.webgl?.ledger;
  if (!api?.nodeLedgerSummary || !ledger) return '';
  const window = ecologyWindow();
  const summary = api.nodeLedgerSummary(ledger, id, window);
  const rows = summary.rows;
  if (!rows.length) return '<h4>Documented rows</h4><p class="aperture-muted">No participation row in this release names this object. It appears on the field as research context only, and the time window never fades it.</p>';
  const header = `<span data-ap-window-count data-ap-node="${esc(id)}">${fieldWindowCountLabel(summary, window)}</span>`;
  const lead = rows.slice(0, APERTURE_FIELD_ROW_LIMIT);
  const rest = rows.slice(APERTURE_FIELD_ROW_LIMIT);
  const guarded = rows.filter(row => row.off_field_reason === 'privacy_guard').length;
  const guardNote = guarded
    ? ` ${guarded} of these rows ${guarded === 1 ? 'is' : 'are'} not drawn on the field (privacy guard): the public graph carries no node for that surface, so the row is listed here instead of omitted.`
    : '';
  const restMarkup = rest.length
    ? `<details class="aperture-field-rows-more"><summary>Show the ${rest.length} later row${rest.length === 1 ? '' : 's'} (the list continues oldest first)</summary><ul class="aperture-activity-list">${rest.map(row => fieldRowItem(row, window)).join('')}</ul></details>`
    : '';
  return `<h4>Documented rows</h4><p class="aperture-muted">${header} · ${esc(api.ecologyWindowLabel(ledger.range, window))}. Rows outside the window dim and stay listed; they are never removed.${guardNote}</p><ul class="aperture-activity-list">${lead.map(row => fieldRowItem(row, window)).join('')}</ul>${restMarkup}`;
}
function fieldFactGrid(node, summary) {
  const api = state.webgl?.eventApi;
  if (!summary?.rows.length) {
    return `<div class="aperture-metric-grid"><div><strong>${node.documented_degree ?? 0}</strong><span>research-context neighbors</span></div><div><strong>0</strong><span>participation rows</span></div></div>
    <p class="aperture-muted">Research context only: no ledger row names this object, so it has no dated span, no receipts and no size count. It is never faded by the time window.</p>`;
  }
  const first = api?.dayIso?.(summary.first_day) ?? '';
  const last = api?.dayIso?.(summary.last_day) ?? '';
  const isSurface = String(node.id).startsWith('surface-');
  // The same count, the same noun, as the node's tooltip (nodeCountLabel).
  const count = isSurface ? summary.rows.length : summary.surface_count;
  const countNoun = isSurface ? 'documented participant' : 'documented surface';
  return `<div class="aperture-metric-grid">
    <div><strong>${count}</strong><span>${countNoun}${count === 1 ? '' : 's'}</span></div>
    <div><strong>${summary.rows.length}</strong><span>participation row${summary.rows.length === 1 ? '' : 's'}</span></div>
  </div>
  <p class="network-date-span">${esc(first)} → ${esc(last)}${summary.open_ended ? ' · no end recorded' : ''}<br>${summary.receipt_ids.length} sources across these records</p>
  <details class="aperture-reading-help"><summary>How this is counted</summary><p>Node size and halo show the documented ${isSurface ? 'participant' : 'surface'} count: a count, not a score. It creates no actor-to-actor edge, hop, or causal claim.</p></details>`;
}
// An arc is one of two documented objects, read in place without changing the
// map scope or the address. A canonical overlay (topology) arc carries its
// participation row(s): selecting it shows that row with surface, role, window,
// evidence class and receipts. A research arc is an undated claim: selecting it
// shows the claim with its sources and opens the claim dialog with its receipts.
function fieldLinkEndpointId(value) {
  return typeof value === 'object' && value ? value.id : value;
}
function selectFieldLink(link) {
  if (!link || !state.root) return false;
  if (link.topology_only && link.rows?.length) return inspectFieldParticipationRow(link);
  return inspectFieldResearchEdge(link);
}
function fieldRecordAction(row) {
  if (row.participant_type === 'actor') {
    return state.actors.has(row.node_id) ? `<button type="button" data-ap-action="open-record" data-actor-id="${esc(row.node_id)}">Open public record</button>` : '';
  }
  const known = (state.data?.surfaceGraph?.organizations ?? []).some(item => item.id === row.node_id);
  return known ? `<a class="aperture-secondary-button" href="#organization/${encodeURIComponent(row.node_id)}">Open public record</a>` : '';
}
function inspectFieldParticipationRow(link) {
  const api = state.webgl?.eventApi;
  const rows = link.rows;
  const row = rows[0];
  const window = ecologyWindow();
  const label = fieldNodeLabel(row.node_id);
  const inside = api?.rowInWindow ? api.rowInWindow(row, window) : true;
  const windowNote = window.unbounded
    ? 'the window is all time'
    : row.dated === false
      ? 'the row is undated, so the time window never slices it'
      : `${inside ? 'inside' : 'outside'} the window ${esc(api?.ecologyWindowLabel?.(ecologyRange(), window) ?? '')}`;
  const precision = row.precision === 'year' ? ' (year precision)' : row.precision === 'month' ? ' (month precision)' : '';
  const record = fieldRecordAction(row);
  setInspector(label, `<p class="aperture-kicker">Participation row · ${row.participant_type === 'actor' ? 'actor' : 'organization'} on a bounded surface</p><h3>${esc(label)}</h3>
    <div class="aperture-badge-row">${evidenceBadge(row.evidence_class)}<span class="aperture-badge">${esc(row.time_label)}${precision}</span>${row.hop_eligible ? '' : '<span class="aperture-badge aperture-badge--reported">Context-only surface</span>'}</div>
    <dl class="aperture-definition-list">
      <div><dt>Bounded surface</dt><dd>${esc(row.surface_label)}</dd></div>
      <div><dt>Recorded role</dt><dd>${esc(row.role)}</dd></div>
      <div><dt>Documented window</dt><dd>${esc(row.time_label)}${precision}</dd></div>
      <div><dt>Participation type</dt><dd>${esc(humanLabel(row.participation_type))}</dd></div>
    </dl>
    <p class="aperture-muted">This arc is this one participation row on a named surface; ${windowNote}. It is not a hop and says nothing about any other participant on the surface.${rows.length > 1 ? ` ${rows.length} rows share this arc; each is listed below.` : ''}</p>
    <ul class="aperture-activity-list">${rows.map(item => fieldRowItem(item, window)).join('')}</ul>
    ${record ? `<div class="aperture-actions">${record}</div>` : ''}`, { openOnMobile: true });
  return true;
}
function fieldLegacySource(id) {
  if (!state.webgl.sourceById) state.webgl.sourceById = new Map((state.data?.legacyGraph?.sources ?? []).map(source => [source.id, source]));
  return state.webgl.sourceById.get(id) ?? null;
}
function fieldSourceItem(id) {
  if (state.receipts.has(id)) return `<li>${receiptButtons([id], 1)}</li>`;
  const source = fieldLegacySource(id);
  if (!source) return `<li><span>${esc(id)}</span><small>source id not in this release's receipt graph</small></li>`;
  return `<li><strong>${esc(humanLabel(source.source_type || 'source'))}</strong><span>${esc(source.label || id)}</span>${source.publisher ? `<small>${esc(source.publisher)}</small>` : ''}</li>`;
}
// Claim keys live in build/public-catalog.json (key = case::claim_id); the
// catalog is read once, on the first research-arc selection.
function fieldClaimKeys() {
  if (!state.webgl.claimKeys) {
    state.webgl.claimKeys = readData('build/public-catalog.json')
      .then(catalog => new Map((catalog?.claims ?? []).map(item => [item.claim_id, item.key])))
      .catch(() => new Map());
  }
  return state.webgl.claimKeys;
}
async function openFieldClaim(claimId) {
  const keys = await fieldClaimKeys();
  const holder = $$('[data-ap-field-claim]', state.root).find(element => element.dataset.apFieldClaim === claimId);
  if (!holder) return false;
  const key = keys.get(claimId);
  if (!key) {
    holder.innerHTML = '<p class="aperture-muted">No catalogued claim carries this edge in the public release; the sources listed above are its record.</p>';
    return false;
  }
  holder.innerHTML = `<button type="button" data-open-claim="${esc(key)}">Open the claim and its receipts</button>`;
  // The public app owns the evidence dialog: its document-level listener turns
  // this click into openClaimDialog(key).
  holder.firstElementChild.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
  return true;
}
function inspectFieldResearchEdge(link) {
  const from = fieldLinkEndpointId(link.source), to = fieldLinkEndpointId(link.target);
  const title = `${fieldNodeLabel(from)} · ${fieldNodeLabel(to)}`;
  const claimId = link.id ? `clm-${link.id}` : '';
  const sources = (link.source_ids ?? []).map(fieldSourceItem).join('');
  const kicker = link.topology_only ? 'Documented topology edge · undated · not a hop' : 'Research-context edge · undated · not a hop';
  setInspector(title, `<p class="aperture-kicker">${kicker}</p><h3>${esc(title)}</h3>
    <p>${esc(link.claim || 'No claim text is recorded on this edge.')}</p>
    <div class="aperture-badge-row">${evidenceBadge(link.evidence_class || 'context')}${link.status ? `<span class="aperture-badge">${esc(humanLabel(link.status))}</span>` : ''}${link.type ? `<span class="aperture-badge">${esc(humanLabel(link.type))}</span>` : ''}</div>
    <p class="aperture-muted">This arc carries no dated participation row, so the time window never fades it. It establishes only the exact claim above at its displayed evidence class; it is not a hop and creates no actor-to-actor edge.</p>
    ${sources ? `<h4>Sources on this edge</h4><ul class="aperture-activity-list">${sources}</ul>` : ''}
    <div class="aperture-actions" data-ap-field-claim="${esc(claimId)}"><span class="aperture-muted">${claimId ? 'Looking up the catalogued claim…' : 'This edge has no claim id, so no catalogued claim can be opened.'}</span></div>`, { openOnMobile: true });
  if (claimId) openFieldClaim(claimId);
  return true;
}
function inspectApertureFieldNode(id, { select = true } = {}) {
  const renderer = state.webgl?.renderer;
  const node = renderer?.field?.()?.nodeById?.get(id);
  if (!node) return false;
  const actor = state.actors.get(id);
  const canonicalSurfaceId = String(id).startsWith('surface-') ? String(id).slice(8) : null;
  if (canonicalSurfaceId && state.surfaces.has(canonicalSurfaceId)) {
    if (select) {
      state.map.hasExplicitFocus = true;
      selectMapSurface(canonicalSurfaceId);
    }
    return false;
  }
  if (select) {
    state.map.selectedFieldNodeId = id;
    state.map.hasExplicitFocus = true;
    if (actor) selectApertureFieldActor(id);
  }
  const api = state.webgl?.eventApi;
  const summary = api?.nodeLedgerSummary && state.webgl?.ledger ? api.nodeLedgerSummary(state.webgl.ledger, id, ecologyWindow()) : null;
  const description = node.description || actor?.description || 'Public object in the research network.';
  const kicker = node.ontology === 'person' ? 'Public actor' : node.ontology === 'organization' ? 'Public organization' : 'Selected public object';
  const actions = actor ? `<div class="aperture-actions">
    <button type="button" data-ap-action="open-record" data-actor-id="${esc(id)}">Open public record</button>
    ${routeActorIds().includes(id) ? `<button type="button" data-ap-action="route-from-selection" data-actor-id="${esc(id)}">Find route from here</button>` : ''}
  </div>` : '';
  setTelemetry(['Network', node.label], [{ value: summary?.surface_count ?? 0, label: 'documented surfaces' }, { value: summary?.receipt_ids?.length ?? 0, label: 'sources' }]);
  setInspector(node.label, `<p class="aperture-kicker">${kicker}</p><h3>${esc(node.label)}</h3>
    <p>${esc(description)}</p>
    ${fieldFactGrid(node, summary)}${fieldRowsMarkup(id)}${actions}`, { openOnMobile: true });
  return true;
}
async function renderApertureSocialField() {
  if (!state.root || state.mode !== 'map' || state.webgl?.failed) return;
  // Resize and initial routing can request the field while its vendor is still
  // loading. A second renderer replaces the canvas but inherits rendered=true,
  // leaving only an empty shell. Finish one initialization before another draw.
  if (state.webgl.loading) return;
  if (typeof globalThis.loadCliffordSocialField !== 'function') return;
  const host = $('#aperture-webgl', state.root);
  if (!host) return;
  state.webgl.loading = true;
  try {
    if (!state.webgl) state.webgl = { renderer: null, model: null, failed: false, rendered: false };
    if (!state.webgl.renderer) {
      const api = await globalThis.loadCliffordSocialField();
      if (!api.supportsWebGlAtlas()) return;
      state.webgl.model = api.buildResearchNetworkModel(state.data.legacyGraph);
      state.webgl.ledger = api.buildFieldLedgerIndex(state.data.surfaceGraph, state.webgl.model);
      state.webgl.events = api.buildEcologyEventModel(state.data.surfaceGraph, state.webgl.model);
      state.webgl.eventApi = api;
      state.webgl.renderer = await api.createWebGlAtlasRenderer({
        host,
        reducedMotion: fieldReducedMotion(),
        onNodeSelect: inspectApertureFieldNode,
        onLinkSelect: selectFieldLink,
        onInteraction: event => {
          if (event?.type !== 'scale' || state.mode !== 'map') return;
          state.webgl.cameraOwnsScale = true;
          setMapScale(event.scale, { history: 'replace' });
        }
      });
      bindFieldLifecycle(host);
    }
    // Timeline-mode deactivation guard: the mode may have changed while the
    // renderer loaded; never activate the field over a non-map stage.
    if (state.mode !== 'map') return;
    if (!state.webgl.rendered) {
      state.webgl.renderer.render(state.webgl.model, { ledger: state.webgl.ledger });
      state.webgl.rendered = true;
    }
    if (!state.webgl.ecologyBound && state.webgl.events) {
      state.webgl.renderer.setEcology(state.webgl.events);
      state.webgl.ecologyBound = true;
      applyEcologyWindow({ sync: false });
    }
    setApertureFieldActive(true);
    syncEcologyClockControls();
    const view = apertureFieldView();
    state.webgl.renderer.setView(view);
    state.webgl.renderer.select(state.map.selectedFieldNodeId || state.map.selectedActorId || null);
    const focusKey = `${view.level}:${view.focusNodeId || ''}`;
    const focusChanged = focusKey !== state.webgl.lastFocusKey;
    if (state.webgl.cameraOwnsScale) {
      state.webgl.cameraOwnsScale = false;
    } else if (focusChanged && view.level === 'corpus') {
      state.webgl.renderer.home(state.map.scale);
    } else if (focusChanged && view.focusNodeId) {
      state.webgl.renderer.focus(view.focusNodeId, undefined, state.map.scale);
    } else {
      state.webgl.renderer.setScale(state.map.scale, { duration: 0 });
    }
    state.webgl.lastFocusKey = focusKey;
    if (state.map.level === 'corpus' && !state.map.hasExplicitFocus) {
      setTelemetry(['Network', 'Whole network'], [{ value: state.webgl.model.nodes.length, label: 'objects' }, { value: state.webgl.model.edges.length, label: 'connections' }]);
    } else if (state.map.level === 'machine' && state.map.selectedFieldNodeId) {
      inspectApertureFieldNode(state.map.selectedFieldNodeId, { select: false });
    }
  } catch (error) {
    state.webgl.failed = true;
    setApertureFieldActive(false);
    console.warn('GPU social field unavailable; retaining semantic SVG map.', error);
  } finally {
    state.webgl.loading = false;
  }
}
