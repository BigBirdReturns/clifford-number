function renderCurrent() {
  if (!state.root) return;
  if (state.mode === 'map') renderMapMode();
  else if (state.mode === 'route') renderRouteMode();
  else renderSurfaceMode();
}

function selectCluster(id, { advance = true } = {}) {
  state.map.selectedClusterId = id;
  state.map.selectedTypeId = null;
  const cluster = summarizeClusters(state.data.surfaceGraph).find(item => item.id === id);
  state.map.selectedSurfaceId = largestSurface(cluster?.surfaces)?.surface_id ?? null;
  state.map.selectedActorId = null;
  state.selectedSurfaceId = state.map.selectedSurfaceId;
  if (advance) {
    state.map.scale = Math.max(state.map.scale, 1.9);
    state.map.level = 'machine';
  }
  renderModeControls();
  renderMapMode();
  commitApertureAddress('push');
  if (isMobile()) { state.sheetOpen = true; syncInspectorSheet(); }
}

function selectType(id) {
  state.map.selectedTypeId = id;
  const group = surfaceTypeGroups(state.data.surfaceGraph, state.map.selectedClusterId).find(item => item.id === id);
  state.map.selectedSurfaceId = largestSurface(group?.surfaces)?.surface_id ?? state.map.selectedSurfaceId;
  state.map.selectedActorId = null;
  state.selectedSurfaceId = state.map.selectedSurfaceId;
  state.map.scale = Math.max(state.map.scale, 3.05);
  state.map.level = 'surface';
  renderModeControls();
  renderMapMode();
  commitApertureAddress('push');
  if (isMobile()) { state.sheetOpen = true; syncInspectorSheet(); }
}

function selectMapSurface(id, { advance = true } = {}) {
  const surface = state.surfaces.get(id);
  if (!surface) return;
  state.map.selectedClusterId = clusterForSurface(surface);
  state.map.selectedTypeId = surface.surface_type;
  state.map.selectedSurfaceId = id;
  state.map.selectedActorId = null;
  state.selectedSurfaceId = id;
  if (advance) {
    state.map.scale = Math.max(state.map.scale, 3.05);
    state.map.level = 'surface';
  }
  renderModeControls();
  renderMapMode();
  commitApertureAddress('push');
  if (isMobile()) { state.sheetOpen = true; syncInspectorSheet(); }
}

function selectActor(id, context = 'map') {
  state.selectedActorId = id;
  if (context === 'map') {
    state.map.selectedActorId = id;
    state.map.scale = Math.max(state.map.scale, 4.3);
    state.map.level = 'evidence';
    renderMapMode();
  } else if (context === 'route') {
    state.route.selectedActorId = id;
    state.route.selectedStep = null;
    renderRouteMode();
  } else {
    state.surface.selectedActorId = id;
    renderSurfaceMode();
  }
  commitApertureAddress('push');
  if (isMobile()) { state.sheetOpen = true; syncInspectorSheet(); }
}

function togglePin(id) {
  if (!id) return;
  if (state.surface.pinned.has(id)) state.surface.pinned.delete(id);
  else state.surface.pinned.add(id);
  state.surface.selectedActorId = id;
  state.selectedActorId = id;
  renderSurfaceMode();
  commitApertureAddress('push');
  if (isMobile()) { state.sheetOpen = true; syncInspectorSheet(); }
}

function openRecord(kind, id) {
  if (!id) return;
  location.hash = `#${kind}/${encodeURIComponent(id)}`;
  setTimeout(() => $('#explorer')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
}
