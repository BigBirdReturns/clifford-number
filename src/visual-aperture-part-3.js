const MAP_LEVEL_LABELS = Object.freeze({ corpus: 'Whole network', machine: 'Neighborhood', surface: 'Bounded surface', evidence: 'Evidence' });
function mapLevelLabel(level) { return MAP_LEVEL_LABELS[level] || humanLabel(level); }
function mapSearchOptions() {
  return [...state.legacyNodes.values()]
    .filter(node => node?.id && node?.label && !String(node.id).startsWith('surface-'))
    .sort((a, b) => String(a.label).localeCompare(String(b.label)))
    .map(node => `<option value="${esc(node.label)}" data-node-id="${esc(node.id)}">${esc(humanLabel(node.type || 'public object'))}</option>`)
    .join('');
}
function findMapSearchNode(value) {
  const needle = String(value || '').trim().toLowerCase();
  if (!needle) return null;
  const nodes = [...state.legacyNodes.values()].filter(node => node?.id && node?.label && !String(node.id).startsWith('surface-'));
  const exact = nodes.find(node => String(node.id).toLowerCase() === needle || String(node.label).toLowerCase() === needle);
  if (exact) return exact;
  const normalizedNeedle = needle.replace(/^(dr|sir|dame|lord|prof|professor)\.\s+/, '');
  const matches = nodes.filter(node => {
    const label = String(node.label).toLowerCase();
    const normalizedLabel = label.replace(/^(dr|sir|dame|lord|prof|professor)\.\s+/, '');
    return normalizedLabel.includes(normalizedNeedle) || label.includes(needle);
  });
  return matches.length === 1 ? matches[0] : null;
}

function renderModeControls() {
  const controls = $('#aperture-mode-controls', state.root);
  if (state.mode === 'timeline') {
    controls.innerHTML = timelineControlsMarkup();
    return;
  }
  if (state.mode === 'map') {
    const clusters = summarizeClusters(state.data.surfaceGraph);
    ensureMapSelection();
    const cluster = clusters.find(item => item.id === state.map.selectedClusterId);
    const surfaces = [...(cluster?.surfaces ?? [])].sort((a, b) => actorParticipants(b).length - actorParticipants(a).length || a.surface_label.localeCompare(b.surface_label));
    const selectedSearchNode = state.map.selectedFieldNodeId ? state.legacyNodes.get(state.map.selectedFieldNodeId) : null;
    controls.innerHTML = `
      <label class="aperture-control aperture-control--wide aperture-control--start"><span>Start with a person or organization</span><input id="ap-map-search" type="search" list="ap-map-search-options" placeholder="Type a name" value="${esc(selectedSearchNode?.label || '')}"><datalist id="ap-map-search-options">${mapSearchOptions()}</datalist></label>
      <label class="aperture-control aperture-control--scale"><span>Depth &middot; <strong id="ap-map-level">${esc(mapLevelLabel(state.map.level))}</strong></span><input id="ap-map-scale" type="range" min="1" max="5.4" step="0.05" value="${state.map.scale}"></label>
      <div class="aperture-control-buttons" aria-label="Map depth controls"><button type="button" data-ap-action="zoom-out" aria-label="Zoom out">-</button><button type="button" data-ap-action="zoom-in" aria-label="Zoom in">+</button><button type="button" data-ap-action="reset-map">Reset</button></div>      <label class="aperture-control aperture-control--timeline"><span>Evidence time &middot; <strong id="ap-ecology-date">${esc(ecologyClockLabel())}</strong></span><input id="ap-ecology-time" type="range" min="0" max="1000" step="1" value="${Math.round(state.ecology.position * 1000)}"></label>
      <button type="button" class="aperture-secondary-button aperture-ecology-toggle" data-ap-action="ecology-toggle" aria-pressed="${String(state.ecology.playing)}">${state.ecology.playing ? 'Pause time' : 'Play time'}</button>
      <details class="aperture-jump"><summary>Jump to a bounded surface</summary><div class="aperture-jump-controls"><label class="aperture-control"><span>Family</span><select id="ap-map-cluster">${clusters.map(item => `<option value="${esc(item.id)}"${item.id === state.map.selectedClusterId ? ' selected' : ''}>${esc(item.label)} &middot; ${item.surfaceCount}</option>`).join('')}</select></label><label class="aperture-control aperture-control--wide"><span>Surface</span><select id="ap-map-surface">${surfaces.map(surface => `<option value="${esc(surface.surface_id)}"${surface.surface_id === state.map.selectedSurfaceId ? ' selected' : ''}>${esc(shortLabel(surface.surface_label, 68))} &middot; ${actorParticipants(surface).length}</option>`).join('')}</select></label></div></details>
      ${addressActionMarkup()}`;
    return;
  }

  if (state.mode === 'route') {
    controls.innerHTML = `
      <label class="aperture-control"><span>From actor</span><select id="ap-route-from">${actorOptions(state.route.fromId)}</select></label>
      <button type="button" class="aperture-swap" data-ap-action="route-swap" aria-label="Swap route endpoints">⇄</button>
      <label class="aperture-control"><span>To actor</span><select id="ap-route-to">${actorOptions(state.route.toId)}</select></label>
      <label class="aperture-control"><span>Active during</span><input id="ap-route-asof" type="text" inputmode="numeric" placeholder="Optional date" value="${esc(state.route.asOf)}"></label>
      <label class="aperture-control"><span>Evidence floor</span><select id="ap-route-evidence">${evidenceOptions(state.route.evidenceFloor)}</select></label>
      <button type="button" class="aperture-secondary-button" data-ap-action="route-reset">Reset</button>
      ${addressActionMarkup()}`;
    return;
  }

  const dense = denseSurfaces(state.data.surfaceGraph, { minimumActors: 2 });
  controls.innerHTML = `
    <label class="aperture-control aperture-control--wide"><span>Bounded surface</span><select id="ap-surface-select">${dense.map(item => `<option value="${esc(item.surface.surface_id)}"${item.surface.surface_id === state.surface.surfaceId ? ' selected' : ''}>${esc(shortLabel(item.surface.surface_label, 70))} · ${item.actorCount}</option>`).join('')}</select></label>
    <label class="aperture-control aperture-control--wide"><span>Find actor or role</span><input id="ap-surface-query" type="search" placeholder="Search this surface" value="${esc(state.surface.query)}"></label>
    <label class="aperture-control"><span>Active during</span><input id="ap-surface-asof" type="text" inputmode="numeric" placeholder="Optional date" value="${esc(state.surface.asOf)}"></label>
    <label class="aperture-control"><span>Evidence floor</span><select id="ap-surface-evidence">${evidenceOptions(state.surface.evidenceFloor)}</select></label>
    <label class="aperture-control aperture-control--scale"><span>People shown · <strong id="ap-surface-budget-output">${state.surface.budget}</strong></span><input id="ap-surface-budget" type="range" min="6" max="36" step="1" value="${state.surface.budget}"></label>
    <button type="button" class="aperture-secondary-button" data-ap-action="surface-clear-pins">Clear pins</button>
    ${addressActionMarkup()}`;
}

function setMode(mode, { renderControls = true, history = 'push' } = {}) {
  if (!['timeline', 'map', 'route', 'surface'].includes(mode)) return;
  state.mode = mode;
  state.root.dataset.apertureMode = mode;
  for (const button of $$('[data-ap-mode]', state.root)) {
    const active = button.dataset.apMode === mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  }
  if (mode === 'route' && state.selectedActorId && routeActorIds().includes(state.selectedActorId)) {
    state.route.fromId = state.selectedActorId;
    if (state.route.fromId === state.route.toId) state.route.toId = state.data.hopGraph.anchor_actor_id;
  }
  if (mode === 'surface' && state.selectedSurfaceId && state.surfaces.has(state.selectedSurfaceId)) {
    const changed = state.surface.surfaceId !== state.selectedSurfaceId;
    state.surface.surfaceId = state.selectedSurfaceId;
    if (changed) restoreWorkspacePins(state.surface.surfaceId);
  }
  if (renderControls) renderModeControls();
  renderCurrent();
  commitApertureAddress(history);
}

function setStage(markup, { title, description, minWidth = 0 } = {}) {
  const stage = $('#aperture-stage', state.root);
  $('#aperture-layer', state.root).innerHTML = markup;
  $('#aperture-stage-title', state.root).textContent = title || 'Clifford Number operating map';
  $('#aperture-stage-desc', state.root).textContent = description || 'Interactive bounded-surface topology.';
  stage.style.minWidth = minWidth ? `${minWidth}px` : '';
  if (state.export?.open) queueMicrotask(refreshPublicationExport);
}

function setTelemetry(breadcrumbs, stats) {
  $('#aperture-breadcrumbs', state.root).innerHTML = breadcrumbs.map((item, index) => `<span${index === breadcrumbs.length - 1 ? ' aria-current="page"' : ''}>${esc(item)}</span>`).join('<i aria-hidden="true">›</i>');
  $('#aperture-stats', state.root).innerHTML = stats.map(item => `<span><strong>${esc(item.value)}</strong>${esc(item.label)}</span>`).join('');
}

function isMobile() {
  return matchMedia('(max-width: 760px)').matches;
}

function setInspector(label, html, { openOnMobile = false } = {}) {
  $('#aperture-inspector', state.root).dataset.empty = String(state.mode === 'timeline' && !state.timeline.selectedKey);
  $('#aperture-sheet-label', state.root).textContent = shortLabel(label, 34);
  $('#aperture-inspector-body', state.root).innerHTML = html;
  if (openOnMobile && isMobile()) state.sheetOpen = true;
  syncInspectorSheet();
  // Every selection change passes through here, so this is where the aperture
  // publishes its origin { mode, objectLabel, objectId, selectObject } for the
  // shared receipt dialog's breadcrumb (app.js reads globalThis.__cliffordApertureOrigin).
  if (typeof publishApertureOrigin === 'function') publishApertureOrigin(label);
}

function syncInspectorSheet() {
  const inspector = $('#aperture-inspector', state.root);
  inspector.classList.toggle('is-open', state.sheetOpen);
  const toggle = $('[data-ap-action="sheet-toggle"]', state.root);
  toggle?.setAttribute('aria-expanded', String(state.sheetOpen));
  const icon = toggle?.querySelector('i');
  if (icon) icon.textContent = state.sheetOpen ? '⌄' : '⌃';
}

function setOverview({ title = 'Stable rows for the visible field.', status = '', headers = [], rows = '' }) {
  $('#aperture-overview-title', state.root).textContent = title;
  $('#aperture-overview-status', state.root).textContent = status;
  $('#aperture-table-head', state.root).innerHTML = `<tr>${headers.map(header => `<th scope="col">${esc(header)}</th>`).join('')}</tr>`;
  $('#aperture-table-body', state.root).innerHTML = rows || `<tr><td colspan="${Math.max(1, headers.length)}">No rows are visible in the current scope.</td></tr>`;
}

function ensureMapSelection() {
  const clusters = summarizeClusters(state.data.surfaceGraph);
  if (!clusters.some(cluster => cluster.id === state.map.selectedClusterId)) state.map.selectedClusterId = clusters[0]?.id ?? null;
  const cluster = clusters.find(item => item.id === state.map.selectedClusterId);
  const groups = surfaceTypeGroups(state.data.surfaceGraph, cluster?.id);
  if (state.map.selectedTypeId && !groups.some(group => group.id === state.map.selectedTypeId)) state.map.selectedTypeId = null;
  let surface = state.surfaces.get(state.map.selectedSurfaceId);
  if (!surface || clusterForSurface(surface) !== cluster?.id) {
    surface = largestSurface(cluster?.surfaces);
    state.map.selectedSurfaceId = surface?.surface_id ?? null;
  }
  if (state.map.selectedTypeId && surface?.surface_type !== state.map.selectedTypeId) {
    const group = groups.find(item => item.id === state.map.selectedTypeId);
    surface = largestSurface(group?.surfaces);
    state.map.selectedSurfaceId = surface?.surface_id ?? state.map.selectedSurfaceId;
  }
  if (state.map.selectedActorId && !actorParticipants(state.surfaces.get(state.map.selectedSurfaceId)).some(item => item.actor_id === state.map.selectedActorId)) state.map.selectedActorId = null;
}

function setMapScale(value, { history = 'replace' } = {}) {
  const nextScale = Math.max(1, Math.min(5.4, Number(value) || 1));
  const nextLevel = semanticLevelForScale(nextScale, state.map.level);
  const unchanged = nextScale === state.map.scale && nextLevel === state.map.level;
  state.map.scale = nextScale;
  state.map.level = nextLevel;
  const input = $('#ap-map-scale', state.root);
  if (input) input.value = String(state.map.scale);
  const label = $('#ap-map-level', state.root);
  if (label) label.textContent = mapLevelLabel(state.map.level);
  if (unchanged) return;
  renderMapMode();
  commitApertureAddress(history);
}

function clusterPositions(clusters) {
  const positions = new Map();
  clusters.forEach((cluster, index) => positions.set(cluster.id, stableRingPosition(index, clusters.length, 600, 360, 425, 255, -Math.PI / 2)));
  return positions;
}
