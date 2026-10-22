const APERTURE_FIELD_LEGEND = `
  <span><i class="aperture-key aperture-key--actor"></i> actor (sphere)</span>
  <span><i class="aperture-key"></i> organization (box)</span>
  <span><i class="aperture-key aperture-key--surface"></i> bounded surface (octahedron)</span>
  <span><i class="aperture-key aperture-key--selection"></i> size and halo = documented surfaces for that object (a count; participants for a surface)</span>
  <span><i class="aperture-key aperture-key--corridor"></i> arc colour = evidence class (official amber, primary public blue, reported violet, research context grey)</span>
  <span><i class="aperture-key aperture-key--activity"></i> pulse = participation row inside the time window</span>
  <span>faded = no documented row inside the window; undated research context is never faded</span>`;
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
  return window.unbounded
    ? `${label} · ${factors.rows_total} rows`
    : `${label} · ${factors.rows_in_window} of ${factors.rows_total} rows in window`;
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
function syncInspectorWindowMarks() {
  if (!state.root) return;
  const api = state.webgl?.eventApi;
  const window = ecologyWindow();
  let inWindow = 0, total = 0;
  for (const item of $$('[data-ap-row]', state.root)) {
    const start = Number(item.dataset.apStart);
    const end = item.dataset.apEnd === '' ? null : Number(item.dataset.apEnd);
    const inside = api?.rowInWindow ? api.rowInWindow({ start_day: start, end_day: end }, window) : true;
    item.classList.toggle('is-outside', !inside);
    item.style.opacity = inside ? '' : '.45';
    total += 1;
    if (inside) inWindow += 1;
  }
  const header = $('[data-ap-window-count]', state.root);
  if (header) header.textContent = window.unbounded ? `${total} row${total === 1 ? '' : 's'} · all time` : `${inWindow} of ${total} rows in window`;
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
function fieldRowItem(row, window) {
  const api = state.webgl?.eventApi;
  const inside = api?.rowInWindow ? api.rowInWindow(row, window) : true;
  const classes = ['aperture-field-row', inside ? '' : 'is-outside', row.on_field ? '' : 'is-off-field'].filter(Boolean).join(' ');
  const receipts = row.receipt_ids.length;
  return `<li class="${classes}"${inside ? '' : ' style="opacity:.45"'} data-ap-row="${esc(row.row_id)}" data-ap-start="${row.start_day ?? ''}" data-ap-end="${row.end_day ?? ''}">
    <strong>${esc(row.time_label)}${row.precision === 'year' ? ' (year precision)' : ''}</strong>
    <span>${esc(row.surface_label)}</span>
    <small>${esc(row.role)} · ${esc(evidenceLabel(row.evidence_class))} · ${receipts} receipt${receipts === 1 ? '' : 's'}</small>
    ${receiptButtons(row.receipt_ids, 3)}
    <div class="aperture-actions"><button type="button" class="aperture-secondary-button" data-ap-surface="${esc(row.surface_id)}">Open bounded surface</button></div>
  </li>`;
}
// The documented rows of one field object, oldest first: every ledger row,
// including the ones the field cannot draw, with the window state on each.
function fieldRowsMarkup(id) {
  const api = state.webgl?.eventApi;
  const ledger = state.webgl?.ledger;
  if (!api?.nodeLedgerSummary || !ledger) return '';
  const window = ecologyWindow();
  const summary = api.nodeLedgerSummary(ledger, id, window);
  const rows = summary.rows;
  if (!rows.length) return '<h4>Documented rows</h4><p class="aperture-muted">No participation row in this release names this object. It appears on the field as research context only, and the time window never fades it.</p>';
  const header = window.unbounded
    ? `<span data-ap-window-count>${rows.length} row${rows.length === 1 ? '' : 's'} · all time</span>`
    : `<span data-ap-window-count>${summary.rows_in_window} of ${rows.length} rows in window</span>`;
  const visible = rows.slice(0, APERTURE_FIELD_ROW_LIMIT);
  return `<h4>Documented rows</h4><p class="aperture-muted">${header} · ${esc(api.ecologyWindowLabel(ledger.range, window))}. Rows outside the window dim and stay listed; they are never removed.</p><ul class="aperture-activity-list">${visible.map(row => fieldRowItem(row, window)).join('')}</ul>${rows.length > visible.length ? `<p class="aperture-muted">+${rows.length - visible.length} earlier-listed rows not shown here; open the public record for the complete list.</p>` : ''}`;
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
  return `<div class="aperture-metric-grid">
    <div><strong>${isSurface ? summary.rows.length : summary.surface_count}</strong><span>${isSurface ? 'documented participants' : 'documented surfaces'}</span></div>
    <div><strong>${summary.rows.length}</strong><span>participation rows</span></div>
    <div><strong>${esc(first)}</strong><span>first documented day</span></div>
    <div><strong>${esc(last)}</strong><span>${summary.open_ended ? 'latest documented day · no end recorded' : 'last documented day'}</span></div>
  </div>
  <p class="aperture-muted">${summary.receipt_ids.length} distinct receipt${summary.receipt_ids.length === 1 ? '' : 's'} across these rows. Node size and halo show the documented ${isSurface ? 'participant' : 'surface'} count: a count, not a score. It creates no actor-to-actor edge, hop, or causal claim.</p>`;
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
  const description = actor?.description || node.description || 'Public topology object in the Research projection.';
  const kicker = node.ontology === 'person' ? 'Public actor' : node.ontology === 'organization' ? 'Public organization' : 'Selected public object';
  const actions = actor ? `<div class="aperture-actions">
    <button type="button" data-ap-action="open-record" data-actor-id="${esc(id)}">Open public record</button>
    ${routeActorIds().includes(id) ? `<button type="button" data-ap-action="route-from-selection" data-actor-id="${esc(id)}">Find route from here</button>` : ''}
  </div>` : '';
  setInspector(node.label, `<p class="aperture-kicker">${kicker}</p><h3>${esc(node.label)}</h3>
    <p>${esc(description)}</p>
    ${fieldFactGrid(node, summary)}${fieldRowsMarkup(id)}${actions}`, { openOnMobile: true });
  return true;
}
async function renderApertureSocialField() {
  if (!state.root || state.mode !== 'map' || state.webgl?.failed) return;
  if (typeof globalThis.loadCliffordSocialField !== 'function') return;
  const host = $('#aperture-webgl', state.root);
  if (!host) return;
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
        onLinkSelect: () => {},
        onInteraction: event => {
          if (event?.type !== 'scale' || state.mode !== 'map') return;
          state.webgl.cameraOwnsScale = true;
          setMapScale(event.scale, { history: 'replace' });
        }
      });
      bindFieldLifecycle(host);
    }
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
  } catch (error) {
    state.webgl.failed = true;
    setApertureFieldActive(false);
    console.warn('GPU social field unavailable; retaining semantic SVG map.', error);
  }
}
