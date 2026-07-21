function renderModeControls() {
  const controls = $('#aperture-mode-controls', state.root);
  if (state.mode === 'map') {
    const clusters = summarizeClusters(state.data.surfaceGraph);
    ensureMapSelection();
    const cluster = clusters.find(item => item.id === state.map.selectedClusterId);
    const surfaces = [...(cluster?.surfaces ?? [])].sort((a, b) => actorParticipants(b).length - actorParticipants(a).length || a.surface_label.localeCompare(b.surface_label));
    controls.innerHTML = `
      <label class="aperture-control aperture-control--scale"><span>Semantic scale · <strong id="ap-map-level">${esc(humanLabel(state.map.level))}</strong></span><input id="ap-map-scale" type="range" min="1" max="5.4" step="0.05" value="${state.map.scale}"></label>
      <div class="aperture-control-buttons" aria-label="Semantic zoom controls"><button type="button" data-ap-action="zoom-out" aria-label="Zoom out">−</button><button type="button" data-ap-action="zoom-in" aria-label="Zoom in">+</button><button type="button" data-ap-action="reset-map">Whole field</button></div>
      <label class="aperture-control"><span>Surface family</span><select id="ap-map-cluster">${clusters.map(item => `<option value="${esc(item.id)}"${item.id === state.map.selectedClusterId ? ' selected' : ''}>${esc(item.label)} · ${item.surfaceCount}</option>`).join('')}</select></label>
      <label class="aperture-control aperture-control--wide"><span>Bounded surface</span><select id="ap-map-surface">${surfaces.map(surface => `<option value="${esc(surface.surface_id)}"${surface.surface_id === state.map.selectedSurfaceId ? ' selected' : ''}>${esc(shortLabel(surface.surface_label, 68))} · ${actorParticipants(surface).length}</option>`).join('')}</select></label>`;
    return;
  }

  if (state.mode === 'route') {
    controls.innerHTML = `
      <label class="aperture-control"><span>From actor</span><select id="ap-route-from">${actorOptions(state.route.fromId)}</select></label>
      <button type="button" class="aperture-swap" data-ap-action="route-swap" aria-label="Swap route endpoints">⇄</button>
      <label class="aperture-control"><span>To actor</span><select id="ap-route-to">${actorOptions(state.route.toId)}</select></label>
      <label class="aperture-control"><span>Active during</span><input id="ap-route-asof" type="text" inputmode="numeric" placeholder="Optional date" value="${esc(state.route.asOf)}"></label>
      <label class="aperture-control"><span>Evidence floor</span><select id="ap-route-evidence">${evidenceOptions(state.route.evidenceFloor)}</select></label>
      <button type="button" class="aperture-secondary-button" data-ap-action="route-reset">Reset</button>`;
    return;
  }

  const dense = denseSurfaces(state.data.surfaceGraph, { minimumActors: 2 });
  controls.innerHTML = `
    <label class="aperture-control aperture-control--wide"><span>Bounded surface</span><select id="ap-surface-select">${dense.map(item => `<option value="${esc(item.surface.surface_id)}"${item.surface.surface_id === state.surface.surfaceId ? ' selected' : ''}>${esc(shortLabel(item.surface.surface_label, 70))} · ${item.actorCount}</option>`).join('')}</select></label>
    <label class="aperture-control aperture-control--wide"><span>Find actor or role</span><input id="ap-surface-query" type="search" placeholder="Search this surface" value="${esc(state.surface.query)}"></label>
    <label class="aperture-control"><span>Active during</span><input id="ap-surface-asof" type="text" inputmode="numeric" placeholder="Optional date" value="${esc(state.surface.asOf)}"></label>
    <label class="aperture-control"><span>Evidence floor</span><select id="ap-surface-evidence">${evidenceOptions(state.surface.evidenceFloor)}</select></label>
    <label class="aperture-control aperture-control--scale"><span>Bracket budget · <strong id="ap-surface-budget-output">${state.surface.budget}</strong></span><input id="ap-surface-budget" type="range" min="6" max="36" step="1" value="${state.surface.budget}"></label>
    <button type="button" class="aperture-secondary-button" data-ap-action="surface-clear-pins">Clear pins</button>`;
}

function setMode(mode, { renderControls = true } = {}) {
  if (!['map', 'route', 'surface'].includes(mode)) return;
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
  if (mode === 'surface' && state.selectedSurfaceId && state.surfaces.has(state.selectedSurfaceId)) state.surface.surfaceId = state.selectedSurfaceId;
  if (renderControls) renderModeControls();
  renderCurrent();
}

function setStage(markup, { title, description, minWidth = 0 } = {}) {
  const stage = $('#aperture-stage', state.root);
  $('#aperture-layer', state.root).innerHTML = markup;
  $('#aperture-stage-title', state.root).textContent = title || 'Clifford Number operating map';
  $('#aperture-stage-desc', state.root).textContent = description || 'Interactive bounded-surface topology.';
  stage.style.minWidth = minWidth ? `${minWidth}px` : '';
}

function setTelemetry(breadcrumbs, stats) {
  $('#aperture-breadcrumbs', state.root).innerHTML = breadcrumbs.map((item, index) => `<span${index === breadcrumbs.length - 1 ? ' aria-current="page"' : ''}>${esc(item)}</span>`).join('<i aria-hidden="true">›</i>');
  $('#aperture-stats', state.root).innerHTML = stats.map(item => `<span><strong>${esc(item.value)}</strong>${esc(item.label)}</span>`).join('');
}

function isMobile() {
  return matchMedia('(max-width: 760px)').matches;
}

function setInspector(label, html, { openOnMobile = false } = {}) {
  $('#aperture-sheet-label', state.root).textContent = shortLabel(label, 34);
  $('#aperture-inspector-body', state.root).innerHTML = html;
  if (openOnMobile && isMobile()) state.sheetOpen = true;
  syncInspectorSheet();
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

function setMapScale(value) {
  state.map.scale = Math.max(1, Math.min(5.4, Number(value) || 1));
  state.map.level = semanticLevelForScale(state.map.scale, state.map.level);
  const input = $('#ap-map-scale', state.root);
  if (input) input.value = String(state.map.scale);
  const label = $('#ap-map-level', state.root);
  if (label) label.textContent = humanLabel(state.map.level);
  renderMapMode();
}

function clusterPositions(clusters) {
  const positions = new Map();
  clusters.forEach((cluster, index) => positions.set(cluster.id, stableRingPosition(index, clusters.length, 600, 360, 425, 255, -Math.PI / 2)));
  return positions;
}
