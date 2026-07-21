let apertureWorkspaceStatusTimer = null;

function workspaceNow() {
  return new Date().toISOString();
}

function workspaceStorageRead() {
  try {
    return { available: true, data: parseApertureWorkspace(localStorage.getItem(APERTURE_WORKSPACE_STORAGE_KEY)) };
  } catch {
    return { available: false, data: emptyApertureWorkspace() };
  }
}

function initializeOperatorWorkspace() {
  const loaded = workspaceStorageRead();
  state.workspace = {
    open: false,
    available: loaded.available,
    data: loaded.data,
    status: loaded.available ? '' : 'Local storage is unavailable; workspace changes will last for this tab only.'
  };
}

function persistOperatorWorkspace() {
  if (!state.workspace) return false;
  if (!state.workspace.available) return false;
  try {
    localStorage.setItem(APERTURE_WORKSPACE_STORAGE_KEY, serializeApertureWorkspace(state.workspace.data));
    return true;
  } catch {
    state.workspace.available = false;
    state.workspace.status = 'Local storage became unavailable; workspace changes now last for this tab only.';
    return false;
  }
}

function workspaceSetStatus(message) {
  if (!state.workspace) return;
  state.workspace.status = message;
  const status = $('#aperture-workspace-status', state.root);
  if (status) status.textContent = message;
  clearTimeout(apertureWorkspaceStatusTimer);
  apertureWorkspaceStatusTimer = setTimeout(() => {
    if (!state.workspace) return;
    state.workspace.status = state.workspace.available ? '' : 'Local storage is unavailable; workspace changes will last for this tab only.';
    const current = $('#aperture-workspace-status', state.root);
    if (current) current.textContent = state.workspace.status;
  }, 2800);
}

function workspaceShellMarkup() {
  return `<section id="aperture-workspace" class="aperture-workspace" aria-labelledby="aperture-workspace-title" hidden>
    <div class="aperture-workspace-heading">
      <div><p class="section-kicker">Local operator workspace</p><h3 id="aperture-workspace-title">Save the view, not a new finding.</h3><p>Names, identifiers, filters, pins, recent route controls, and compare slots stay in this browser. Evidence prose and derived claims are never copied into workspace storage.</p></div>
      <button type="button" class="aperture-secondary-button" data-ap-action="workspace-close">Close</button>
    </div>
    <p id="aperture-workspace-status" class="aperture-workspace-status" role="status" aria-live="polite"></p>
    <div class="aperture-workspace-grid">
      <article class="aperture-workspace-card">
        <h4>Named views</h4>
        <label class="aperture-control aperture-workspace-name"><span>View name</span><input id="ap-workspace-name" type="text" maxlength="60" placeholder="e.g. Dialog roster · primary public"></label>
        <button type="button" class="aperture-secondary-button" data-ap-action="workspace-save-view">Save current exact view</button>
        <div id="aperture-workspace-views" class="aperture-workspace-list"></div>
      </article>
      <article class="aperture-workspace-card">
        <h4>Recent routes</h4>
        <p class="aperture-muted">Only endpoints, date, and evidence floor are retained. Route results are always recomputed from the current compiled graph.</p>
        <div id="aperture-workspace-routes" class="aperture-workspace-list"></div>
      </article>
      <article class="aperture-workspace-card aperture-workspace-card--compare">
        <h4>Compare tray</h4>
        <p class="aperture-muted">Two actors or surfaces can be aligned side by side. The tray does not create an edge, score, or finding.</p>
        <div id="aperture-workspace-compare" class="aperture-compare-grid"></div>
      </article>
    </div>
    <div class="aperture-workspace-footer"><span>${state.workspace?.available ? 'Persisted only in this browser.' : 'Session-only: local storage unavailable.'}</span><button type="button" class="aperture-secondary-button" data-ap-action="workspace-reset">Reset local workspace</button></div>
  </section>`;
}

function workspaceActionMarkup() {
  return '<button type="button" class="aperture-secondary-button" data-ap-action="workspace-toggle" aria-controls="aperture-workspace" aria-expanded="false">Workspace</button>';
}

function workspaceCompareAction(kind, id, label = 'Add to compare') {
  if (!kind || !id) return '';
  const selected = state.workspace?.data?.compare?.some(item => item.kind === kind && item.id === id);
  return `<button type="button" data-ap-action="workspace-compare" data-kind="${esc(kind)}" data-id="${esc(id)}" aria-pressed="${String(Boolean(selected))}">${selected ? 'Remove from compare' : esc(label)}</button>`;
}

function workspaceRouteIds() {
  return new Set(routeActorIds());
}

function workspaceSnapshotHealth(snapshot) {
  const errors = [];
  const warnings = [];
  if (!snapshot) return { errors: ['The saved URL state cannot be decoded.'], warnings };
  const clusters = new Set(summarizeClusters(state.data.surfaceGraph).map(item => item.id));
  const routeIds = workspaceRouteIds();
  const denseIds = new Set(denseSurfaces(state.data.surfaceGraph, { minimumActors: 2 }).map(item => item.surface.surface_id));

  if (snapshot.map?.clusterId && !clusters.has(snapshot.map.clusterId)) warnings.push(`surface family ${snapshot.map.clusterId}`);
  if (snapshot.map?.surfaceId && !state.surfaces.has(snapshot.map.surfaceId)) {
    const message = `bounded surface ${snapshot.map.surfaceId}`;
    if (snapshot.mode === 'map') errors.push(message); else warnings.push(message);
  }
  if (snapshot.map?.actorId && !state.actors.has(snapshot.map.actorId)) warnings.push(`actor ${snapshot.map.actorId}`);

  for (const [field, id] of [['route origin', snapshot.route?.fromId], ['route target', snapshot.route?.toId]]) {
    if (id && !routeIds.has(id)) {
      if (snapshot.mode === 'route') errors.push(`${field} ${id}`); else warnings.push(`${field} ${id}`);
    }
  }

  if (snapshot.surface?.surfaceId && !denseIds.has(snapshot.surface.surfaceId)) {
    const message = `dense surface ${snapshot.surface.surfaceId}`;
    if (snapshot.mode === 'surface') errors.push(message); else warnings.push(message);
  }
  if (snapshot.surface?.actorId && !state.actors.has(snapshot.surface.actorId)) warnings.push(`actor ${snapshot.surface.actorId}`);
  for (const id of snapshot.surface?.pins ?? []) if (!state.actors.has(id)) warnings.push(`pinned actor ${id}`);
  return { errors, warnings };
}

function workspaceSavedViewRow(view) {
  const snapshot = readApertureState(view.query);
  const health = workspaceSnapshotHealth(snapshot);
  const unavailable = health.errors.length > 0;
  const note = unavailable
    ? `Unavailable in this release: ${health.errors.join(', ')}.`
    : health.warnings.length
      ? `Opens with current defaults for ${health.warnings.length} stale reference${health.warnings.length === 1 ? '' : 's'}.`
      : `${humanLabel(snapshot.mode)} view · ${new Date(view.savedAt).toLocaleString()}`;
  return `<div class="aperture-workspace-row${unavailable ? ' is-unavailable' : ''}">
    <div><strong>${esc(view.name)}</strong><small>${esc(note)}</small></div>
    <div class="aperture-workspace-row-actions"><button type="button" data-ap-action="workspace-open-view" data-view-id="${esc(view.id)}"${unavailable ? ' disabled' : ''}>Open</button><button type="button" data-ap-action="workspace-remove-view" data-view-id="${esc(view.id)}">Delete</button></div>
  </div>`;
}

function workspaceRecentRouteRow(route, index) {
  const routeIds = workspaceRouteIds();
  const unavailable = !routeIds.has(route.fromId) || !routeIds.has(route.toId);
  return `<div class="aperture-workspace-row${unavailable ? ' is-unavailable' : ''}">
    <div><strong>${esc(actorLabel(route.fromId))} → ${esc(actorLabel(route.toId))}</strong><small>${unavailable ? 'Unavailable in this release.' : `${route.asOf || 'all time'} · ${evidenceLabel(route.evidenceFloor)} floor`}</small></div>
    <div class="aperture-workspace-row-actions"><button type="button" data-ap-action="workspace-open-route" data-route-index="${index}"${unavailable ? ' disabled' : ''}>Open</button></div>
  </div>`;
}

function workspaceActorCompareCard(item) {
  const actor = state.actors.get(item.id);
  if (!actor) return `<article class="aperture-compare-card is-unavailable"><strong>${esc(item.id)}</strong><p>Actor unavailable in this release.</p><button type="button" data-ap-action="workspace-remove-compare" data-kind="actor" data-id="${esc(item.id)}">Remove</button></article>`;
  const surfaces = [...state.surfaces.values()].filter(surface => actorParticipants(surface).some(participant => participant.actor_id === item.id));
  const degree = (state.data.hopGraph.edges ?? []).filter(edge => edge.actor_a === item.id || edge.actor_b === item.id).length;
  const receipts = unique(surfaces.flatMap(surface => actorParticipants(surface).filter(participant => participant.actor_id === item.id).flatMap(participant => participant.receipt_ids ?? [])));
  return `<article class="aperture-compare-card"><p class="aperture-kicker">Actor</p><h5>${esc(actorLabel(item.id))}</h5><dl><div><dt>Bounded surfaces</dt><dd>${surfaces.length}</dd></div><div><dt>Admitted hop degree</dt><dd>${degree}</dd></div><div><dt>Participation receipts</dt><dd>${receipts.length}</dd></div></dl><div class="aperture-actions"><button type="button" data-ap-action="open-record" data-actor-id="${esc(item.id)}">Open record</button><button type="button" data-ap-action="workspace-remove-compare" data-kind="actor" data-id="${esc(item.id)}">Remove</button></div></article>`;
}

function workspaceSurfaceCompareCard(item) {
  const surface = state.surfaces.get(item.id);
  if (!surface) return `<article class="aperture-compare-card is-unavailable"><strong>${esc(item.id)}</strong><p>Surface unavailable in this release.</p><button type="button" data-ap-action="workspace-remove-compare" data-kind="surface" data-id="${esc(item.id)}">Remove</button></article>`;
  return `<article class="aperture-compare-card"><p class="aperture-kicker">Bounded surface</p><h5>${esc(surface.surface_label)}</h5><dl><div><dt>Compiler type</dt><dd>${esc(humanLabel(surface.surface_type))}</dd></div><div><dt>Documented actors</dt><dd>${actorParticipants(surface).length}</dd></div><div><dt>Hop effect</dt><dd>${surface.hop_eligible ? 'Eligible when all rules pass' : 'None'}</dd></div><div><dt>Window</dt><dd>${esc(windowLabel(surface.time_start, surface.time_end))}</dd></div><div><dt>Surface receipts</dt><dd>${unique(surface.receipt_ids).length}</dd></div></dl><div class="aperture-actions"><button type="button" data-ap-action="open-surface-record" data-surface-id="${esc(item.id)}">Open record</button><button type="button" data-ap-action="workspace-remove-compare" data-kind="surface" data-id="${esc(item.id)}">Remove</button></div></article>`;
}

function renderWorkspacePanel() {
  const panel = $('#aperture-workspace', state.root);
  if (!panel || !state.workspace) return;
  panel.hidden = !state.workspace.open;
  for (const button of $$('[data-ap-action="workspace-toggle"]', state.root)) button.setAttribute('aria-expanded', String(state.workspace.open));
  $('#aperture-workspace-status', state.root).textContent = state.workspace.status;
  $('#aperture-workspace-views', state.root).innerHTML = state.workspace.data.savedViews.length
    ? state.workspace.data.savedViews.map(workspaceSavedViewRow).join('')
    : '<p class="aperture-muted">No named views saved in this browser.</p>';
  $('#aperture-workspace-routes', state.root).innerHTML = state.workspace.data.recentRoutes.length
    ? state.workspace.data.recentRoutes.map(workspaceRecentRouteRow).join('')
    : '<p class="aperture-muted">No route controls recorded yet.</p>';
  $('#aperture-workspace-compare', state.root).innerHTML = state.workspace.data.compare.length
    ? state.workspace.data.compare.map(item => item.kind === 'actor' ? workspaceActorCompareCard(item) : workspaceSurfaceCompareCard(item)).join('')
    : '<p class="aperture-muted">Select an actor or surface in an inspector, then add it to compare.</p>';
}

function workspaceViewId() {
  const random = globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
  return `view-${random}`;
}

function saveCurrentWorkspaceView() {
  const input = $('#ap-workspace-name', state.root);
  const name = String(input?.value ?? '').replace(/\s+/g, ' ').trim();
  if (!name) {
    workspaceSetStatus('Name the current view before saving it.');
    input?.focus();
    return;
  }
  state.workspace.data = saveApertureWorkspaceView(state.workspace.data, {
    id: workspaceViewId(),
    name,
    query: writeApertureState(apertureSnapshot()).toString(),
    savedAt: workspaceNow()
  });
  persistOperatorWorkspace();
  if (input) input.value = '';
  workspaceSetStatus(`Saved “${name}” in this browser.`);
  renderWorkspacePanel();
}

function openWorkspaceView(id) {
  const view = state.workspace.data.savedViews.find(item => item.id === id);
  const snapshot = view ? readApertureState(view.query) : null;
  const health = workspaceSnapshotHealth(snapshot);
  if (!view || !snapshot || health.errors.length) {
    workspaceSetStatus(`Saved view declined: ${health.errors.join(', ') || 'invalid state'}.`);
    return;
  }
  state.address.applying = true;
  try {
    applyApertureSnapshot(snapshot);
    reflectApertureMode();
    renderModeControls();
    renderCurrent();
  } finally {
    state.address.applying = false;
  }
  syncWorkspacePins();
  commitApertureAddress('push');
  workspaceSetStatus(health.warnings.length ? `Opened with ${health.warnings.length} stale reference${health.warnings.length === 1 ? '' : 's'} replaced by current defaults.` : `Opened “${view.name}”.`);
  renderWorkspacePanel();
}

function removeWorkspaceView(id) {
  state.workspace.data = removeApertureWorkspaceView(state.workspace.data, id);
  persistOperatorWorkspace();
  workspaceSetStatus('Saved view deleted.');
  renderWorkspacePanel();
}

function recordCurrentWorkspaceRoute() {
  if (!state.workspace || state.mode !== 'route' || !state.route.fromId || !state.route.toId) return;
  state.workspace.data = recordApertureWorkspaceRoute(state.workspace.data, {
    fromId: state.route.fromId,
    toId: state.route.toId,
    asOf: state.route.asOf,
    evidenceFloor: state.route.evidenceFloor,
    visitedAt: workspaceNow()
  });
  persistOperatorWorkspace();
  renderWorkspacePanel();
}

function openWorkspaceRoute(index) {
  const route = state.workspace.data.recentRoutes[Number(index)];
  if (!route || !workspaceRouteIds().has(route.fromId) || !workspaceRouteIds().has(route.toId)) {
    workspaceSetStatus('Recent route declined because an endpoint is unavailable in this release.');
    return;
  }
  state.selectedActorId = null;
  state.route.fromId = route.fromId;
  state.route.toId = route.toId;
  state.route.asOf = route.asOf;
  state.route.evidenceFloor = route.evidenceFloor;
  state.route.selectedActorId = null;
  state.route.selectedStep = null;
  setMode('route');
  workspaceSetStatus('Recent route controls restored and recomputed from the current graph.');
  renderWorkspacePanel();
}

function syncWorkspacePins() {
  if (!state.workspace || !state.surface.surfaceId) return;
  const participants = new Set(actorParticipants(state.surfaces.get(state.surface.surfaceId)).map(item => item.actor_id));
  const actorIds = [...state.surface.pinned].filter(id => participants.has(id));
  state.workspace.data = setApertureWorkspacePins(state.workspace.data, {
    surfaceId: state.surface.surfaceId,
    actorIds,
    updatedAt: workspaceNow()
  });
  persistOperatorWorkspace();
  renderWorkspacePanel();
}

function restoreWorkspacePins(surfaceId) {
  if (!state.workspace || !surfaceId) return;
  const participants = new Set(actorParticipants(state.surfaces.get(surfaceId)).map(item => item.actor_id));
  state.surface.pinned = new Set(getApertureWorkspacePins(state.workspace.data, surfaceId).filter(id => participants.has(id)));
}

function toggleWorkspaceCompare(kind, id) {
  state.workspace.data = toggleApertureWorkspaceCompare(state.workspace.data, { kind, id });
  persistOperatorWorkspace();
  renderCurrent();
  renderWorkspacePanel();
}

function removeWorkspaceCompare(kind, id) {
  state.workspace.data = removeApertureWorkspaceCompare(state.workspace.data, kind, id);
  persistOperatorWorkspace();
  renderCurrent();
  renderWorkspacePanel();
}

function resetOperatorWorkspace() {
  state.workspace.data = emptyApertureWorkspace();
  state.surface.pinned.clear();
  try { localStorage.removeItem(APERTURE_WORKSPACE_STORAGE_KEY); } catch { state.workspace.available = false; }
  workspaceSetStatus('Local workspace reset. Compiled public data was not changed.');
  if (state.mode === 'surface') renderSurfaceMode();
  renderWorkspacePanel();
}

function handleWorkspaceAction(button) {
  const action = button.dataset.apAction;
  if (action === 'workspace-toggle') {
    state.workspace.open = !state.workspace.open;
    renderWorkspacePanel();
    return true;
  }
  if (action === 'workspace-close') {
    state.workspace.open = false;
    renderWorkspacePanel();
    return true;
  }
  if (action === 'workspace-save-view') { saveCurrentWorkspaceView(); return true; }
  if (action === 'workspace-open-view') { openWorkspaceView(button.dataset.viewId); return true; }
  if (action === 'workspace-remove-view') { removeWorkspaceView(button.dataset.viewId); return true; }
  if (action === 'workspace-open-route') { openWorkspaceRoute(button.dataset.routeIndex); return true; }
  if (action === 'workspace-compare') { toggleWorkspaceCompare(button.dataset.kind, button.dataset.id); return true; }
  if (action === 'workspace-remove-compare') { removeWorkspaceCompare(button.dataset.kind, button.dataset.id); return true; }
  if (action === 'workspace-reset') { resetOperatorWorkspace(); return true; }
  return false;
}
