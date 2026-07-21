function handleAction(button) {
  const action = button.dataset.apAction;
  if (action === 'sheet-toggle') {
    state.sheetOpen = !state.sheetOpen;
    syncInspectorSheet();
    return;
  }
  if (action === 'copy-view-link') {
    copyApertureViewLink(button);
    return;
  }
  if (action === 'zoom-in') { setMapScale(state.map.scale + .85, { history: 'push' }); return; }
  if (action === 'zoom-out') { setMapScale(state.map.scale - .85, { history: 'push' }); return; }
  if (action === 'reset-map') {
    state.map.scale = 1;
    state.map.level = 'corpus';
    state.map.selectedActorId = null;
    state.map.selectedTypeId = null;
    renderModeControls();
    renderMapMode();
    commitApertureAddress('push');
    return;
  }
  if (action === 'route-swap') {
    [state.route.fromId, state.route.toId] = [state.route.toId, state.route.fromId];
    state.route.selectedActorId = null;
    state.route.selectedStep = null;
    renderModeControls();
    renderRouteMode();
    commitApertureAddress('push');
    return;
  }
  if (action === 'route-reset') {
    state.route.asOf = '';
    state.route.evidenceFloor = 'open';
    state.route.selectedActorId = null;
    state.route.selectedStep = null;
    renderModeControls();
    renderRouteMode();
    commitApertureAddress('push');
    return;
  }
  if (action === 'surface-clear-pins') {
    state.surface.pinned.clear();
    state.surface.selectedActorId = null;
    renderSurfaceMode();
    commitApertureAddress('push');
    return;
  }
  if (action === 'toggle-pin') { togglePin(button.dataset.actorId); return; }
  if (action === 'open-record') { openRecord('actor', button.dataset.actorId || state.selectedActorId); return; }
  if (action === 'open-surface-record') { openRecord('surface', button.dataset.surfaceId || state.selectedSurfaceId); return; }
  if (action === 'route-from-selection') {
    const actorId = button.dataset.actorId || state.selectedActorId || state.map.selectedActorId || state.surface.selectedActorId || state.route.selectedActorId;
    if (actorId && routeActorIds().includes(actorId)) state.route.fromId = actorId;
    state.route.selectedActorId = null;
    state.route.selectedStep = null;
    setMode('route');
    return;
  }
  if (action === 'surface-from-selection') {
    const id = state.map.selectedSurfaceId || state.selectedSurfaceId;
    if (id) state.surface.surfaceId = id;
    setMode('surface');
    return;
  }
  if (action === 'surface-from-route') {
    const id = button.dataset.surfaceId;
    if (id) state.surface.surfaceId = id;
    state.selectedSurfaceId = id;
    setMode('surface');
  }
}

function handleClick(event) {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  if (!target) return;
  const receipt = target.closest('[data-open-receipt]');
  if (receipt) return;
  const modeButton = target.closest('[data-ap-mode]');
  if (modeButton) { setMode(modeButton.dataset.apMode); return; }
  const action = target.closest('[data-ap-action]');
  if (action) { handleAction(action); return; }
  const cluster = target.closest('[data-ap-cluster]');
  if (cluster) { selectCluster(cluster.dataset.apCluster); return; }
  const type = target.closest('[data-ap-type]');
  if (type) { selectType(type.dataset.apType); return; }
  const surface = target.closest('[data-ap-surface]');
  if (surface) { selectMapSurface(surface.dataset.apSurface); return; }
  const actor = target.closest('[data-ap-actor]');
  if (actor) { selectActor(actor.dataset.apActor, 'map'); return; }
  const routeActor = target.closest('[data-ap-route-actor]');
  if (routeActor) { selectActor(routeActor.dataset.apRouteActor, 'route'); return; }
  const routeStep = target.closest('[data-ap-route-step]');
  if (routeStep) {
    state.route.selectedStep = Number(routeStep.dataset.apRouteStep);
    state.route.selectedActorId = null;
    renderRouteMode();
    commitApertureAddress('push');
    if (isMobile()) { state.sheetOpen = true; syncInspectorSheet(); }
    return;
  }
  const surfaceActor = target.closest('[data-ap-surface-actor]');
  if (surfaceActor) { selectActor(surfaceActor.dataset.apSurfaceActor, 'surface'); return; }
  if (target.id === 'aperture-stage' && isMobile()) {
    state.sheetOpen = false;
    syncInspectorSheet();
  }
}

function handleInput(event) {
  const target = event.target;
  if (target.id === 'ap-map-scale') { setMapScale(target.value, { history: 'replace' }); return; }
  if (target.id === 'ap-surface-query') {
    state.surface.query = target.value;
    renderSurfaceMode();
    commitApertureAddress('replace');
    return;
  }
  if (target.id === 'ap-surface-budget') {
    state.surface.budget = Number(target.value);
    const output = $('#ap-surface-budget-output', state.root);
    if (output) output.textContent = String(state.surface.budget);
    renderSurfaceMode();
    commitApertureAddress('replace');
  }
}

function handleChange(event) {
  const target = event.target;
  if (target.id === 'ap-map-cluster') { selectCluster(target.value, { advance: false }); return; }
  if (target.id === 'ap-map-surface') { selectMapSurface(target.value, { advance: state.map.level === 'corpus' || state.map.level === 'machine' }); return; }
  if (target.id === 'ap-route-from') { state.route.fromId = target.value; state.route.selectedActorId = null; state.route.selectedStep = null; renderRouteMode(); commitApertureAddress('push'); return; }
  if (target.id === 'ap-route-to') { state.route.toId = target.value; state.route.selectedActorId = null; state.route.selectedStep = null; renderRouteMode(); commitApertureAddress('push'); return; }
  if (target.id === 'ap-route-asof') { state.route.asOf = target.value.trim(); state.route.selectedActorId = null; state.route.selectedStep = null; renderRouteMode(); commitApertureAddress('push'); return; }
  if (target.id === 'ap-route-evidence') { state.route.evidenceFloor = target.value; state.route.selectedActorId = null; state.route.selectedStep = null; renderRouteMode(); commitApertureAddress('push'); return; }
  if (target.id === 'ap-surface-select') { state.surface.surfaceId = target.value; state.surface.pinned.clear(); state.surface.selectedActorId = null; state.selectedSurfaceId = target.value; renderSurfaceMode(); commitApertureAddress('push'); return; }
  if (target.id === 'ap-surface-asof') { state.surface.asOf = target.value.trim(); renderSurfaceMode(); commitApertureAddress('push'); return; }
  if (target.id === 'ap-surface-evidence') { state.surface.evidenceFloor = target.value; renderSurfaceMode(); commitApertureAddress('push'); }
}

function handleKeydown(event) {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  if (!target) return;
  const modeButton = target.closest('[data-ap-mode]');
  if (modeButton && ['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) {
    event.preventDefault();
    const buttons = $$('[data-ap-mode]', state.root);
    const current = buttons.indexOf(modeButton);
    const next = event.key === 'Home' ? 0 : event.key === 'End' ? buttons.length - 1 : (current + (event.key === 'ArrowRight' ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus();
    setMode(buttons[next].dataset.apMode);
    return;
  }
  const interactive = target.closest('.aperture-interactive');
  if (!interactive || !['Enter', ' '].includes(event.key)) return;
  event.preventDefault();
  interactive.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}
