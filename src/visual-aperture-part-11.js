function clusterForLegacyNode(node) {
  const text = [node?.id, node?.type, node?.description, ...(node?.tags ?? [])].join(' ').toLowerCase();
  if (/dialog|forum|directory|roster|cohort/.test(text)) return 'forums';
  if (/defen|military|army|palantir|security|procure/.test(text)) return 'defense';
  if (/capital|fund|venture|invest|finance/.test(text)) return 'capital';
  if (/government|policy|cabinet|minister|public-sector|uk-ai/.test(text)) return 'policy';
  if (/campaign|election/.test(text)) return 'campaigns';
  if (/company|technology|frontier-ai|data/.test(text)) return 'enterprise';
  return 'other';
}

function findSurfaceForFocus(focusId) {
  const normalized = String(focusId || '').toLowerCase();
  const surfaces = [...state.surfaces.values()];
  const exact = surfaces.find(surface => surface.surface_id === focusId);
  if (exact) return exact;
  const matches = surfaces.filter(surface => [surface.surface_id, surface.surface_label, surface.notes].join(' ').toLowerCase().includes(normalized));
  if (matches.length) return largestSurface(matches);
  if (normalized === 'dialog') return largestSurface(surfaces.filter(surface => /dialog/.test(`${surface.surface_id} ${surface.surface_label}`.toLowerCase())));
  return null;
}

function apertureSnapshot() {
  return {
    mode: state.mode,
    map: {
      scale: state.map.scale,
      level: state.map.level,
      clusterId: state.map.selectedClusterId,
      typeId: state.map.selectedTypeId,
      surfaceId: state.map.selectedSurfaceId,
      actorId: state.map.selectedActorId
    },
    route: {
      fromId: state.route.fromId,
      toId: state.route.toId,
      asOf: state.route.asOf,
      evidenceFloor: state.route.evidenceFloor,
      selectedStep: state.route.selectedStep,
      actorId: state.route.selectedActorId
    },
    surface: {
      surfaceId: state.surface.surfaceId,
      query: state.surface.query,
      asOf: state.surface.asOf,
      evidenceFloor: state.surface.evidenceFloor,
      budget: state.surface.budget,
      pins: [...state.surface.pinned].sort(),
      actorId: state.surface.selectedActorId
    }
  };
}

function applyApertureSnapshot(snapshot) {
  if (!snapshot || !['map', 'route', 'surface'].includes(snapshot.mode)) return false;
  const clusterIds = new Set(summarizeClusters(state.data.surfaceGraph).map(cluster => cluster.id));
  const routeIds = new Set(routeActorIds());
  const denseIds = new Set(denseSurfaces(state.data.surfaceGraph, { minimumActors: 2 }).map(item => item.surface.surface_id));
  const evidenceFloors = new Set(['open', 'reported', 'primary_public', 'official']);

  state.mode = snapshot.mode;

  if (Number.isFinite(snapshot.map?.scale)) state.map.scale = Math.max(1, Math.min(5.4, snapshot.map.scale));
  if (['corpus', 'machine', 'surface', 'evidence'].includes(snapshot.map?.level)) state.map.level = snapshot.map.level;
  if (snapshot.map?.clusterId && clusterIds.has(snapshot.map.clusterId)) state.map.selectedClusterId = snapshot.map.clusterId;
  if (snapshot.map?.surfaceId && state.surfaces.has(snapshot.map.surfaceId)) {
    const surface = state.surfaces.get(snapshot.map.surfaceId);
    state.map.selectedClusterId = clusterForSurface(surface);
    state.map.selectedTypeId = surface.surface_type;
    state.map.selectedSurfaceId = surface.surface_id;
  } else if (snapshot.map?.typeId) {
    const group = surfaceTypeGroups(state.data.surfaceGraph, state.map.selectedClusterId).find(item => item.id === snapshot.map.typeId);
    if (group) {
      state.map.selectedTypeId = group.id;
      state.map.selectedSurfaceId = largestSurface(group.surfaces)?.surface_id ?? state.map.selectedSurfaceId;
    }
  }
  ensureMapSelection();
  const mapParticipants = actorParticipants(state.surfaces.get(state.map.selectedSurfaceId));
  state.map.selectedActorId = snapshot.map?.actorId && mapParticipants.some(item => item.actor_id === snapshot.map.actorId) ? snapshot.map.actorId : null;

  if (snapshot.route?.fromId && routeIds.has(snapshot.route.fromId)) state.route.fromId = snapshot.route.fromId;
  if (snapshot.route?.toId && routeIds.has(snapshot.route.toId)) state.route.toId = snapshot.route.toId;
  state.route.asOf = String(snapshot.route?.asOf ?? '').slice(0, 10);
  if (evidenceFloors.has(snapshot.route?.evidenceFloor)) state.route.evidenceFloor = snapshot.route.evidenceFloor;
  state.route.selectedStep = Number.isInteger(snapshot.route?.selectedStep) ? snapshot.route.selectedStep : null;
  state.route.selectedActorId = snapshot.route?.actorId && routeIds.has(snapshot.route.actorId) ? snapshot.route.actorId : null;

  if (snapshot.surface?.surfaceId && denseIds.has(snapshot.surface.surfaceId)) state.surface.surfaceId = snapshot.surface.surfaceId;
  state.surface.query = String(snapshot.surface?.query ?? '').slice(0, 120);
  state.surface.asOf = String(snapshot.surface?.asOf ?? '').slice(0, 10);
  if (evidenceFloors.has(snapshot.surface?.evidenceFloor)) state.surface.evidenceFloor = snapshot.surface.evidenceFloor;
  if (Number.isInteger(snapshot.surface?.budget)) state.surface.budget = Math.max(6, Math.min(36, snapshot.surface.budget));
  const surfaceParticipants = actorParticipants(state.surfaces.get(state.surface.surfaceId));
  const participantIds = new Set(surfaceParticipants.map(item => item.actor_id));
  state.surface.pinned = new Set((snapshot.surface?.pins ?? []).filter(id => participantIds.has(id)).slice(0, 36));
  state.surface.selectedActorId = snapshot.surface?.actorId && participantIds.has(snapshot.surface.actorId) ? snapshot.surface.actorId : null;

  state.selectedActorId = state.mode === 'map'
    ? state.map.selectedActorId
    : state.mode === 'route'
      ? state.route.selectedActorId
      : state.surface.selectedActorId;
  state.selectedSurfaceId = state.mode === 'surface' ? state.surface.surfaceId : state.map.selectedSurfaceId;
  return true;
}

function reflectApertureMode() {
  state.root.dataset.apertureMode = state.mode;
  for (const button of $$('[data-ap-mode]', state.root)) {
    const active = button.dataset.apMode === state.mode;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  }
}

function commitApertureAddress(historyMode = 'replace') {
  if (!state.address.ready || state.address.applying || historyMode === 'none') return;
  state.address.active = true;
  const target = buildApertureUrl(apertureSnapshot(), location.href);
  if (target === location.href) return;
  try {
    const method = historyMode === 'push' ? 'pushState' : 'replaceState';
    history[method]({ cliffordAperture: APERTURE_STATE_VERSION }, '', target);
  } catch (error) {
    console.warn('Could not write the aperture state to browser history.', error);
  }
}

function restoreApertureFromLocation() {
  if (!state.root || !state.address.ready) return;
  const decoded = readApertureState(location.search);
  state.address.applying = true;
  try {
    if (decoded) {
      applyApertureSnapshot(decoded);
      state.address.active = true;
    } else if (state.address.defaults) {
      applyApertureSnapshot(cloneValue(state.address.defaults));
      state.address.active = false;
    }
    reflectApertureMode();
    renderModeControls();
    renderCurrent();
  } finally {
    state.address.applying = false;
  }
}

function writeApertureClipboard(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const field = document.createElement('textarea');
  field.value = text;
  field.setAttribute('readonly', '');
  field.style.position = 'fixed';
  field.style.opacity = '0';
  document.body.append(field);
  field.select();
  const copied = document.execCommand('copy');
  field.remove();
  if (!copied) throw new Error('Browser copy command was rejected');
  return Promise.resolve();
}

async function copyApertureViewLink(button) {
  commitApertureAddress('replace');
  const original = button.textContent;
  try {
    await writeApertureClipboard(location.href);
    button.textContent = 'Copied exact view';
  } catch (error) {
    console.warn('Could not copy the exact aperture view.', error);
    button.textContent = 'Copy failed';
  }
  setTimeout(() => { button.textContent = original; }, 1800);
}

function focusExternal(id) {
  state.address.applying = true;
  try {
    setMode('map', { history: 'none' });
    const surface = findSurfaceForFocus(id);
    if (surface) {
      state.map.selectedClusterId = clusterForSurface(surface);
      state.map.selectedTypeId = surface.surface_type;
      state.map.selectedSurfaceId = surface.surface_id;
      state.map.selectedActorId = null;
      state.selectedSurfaceId = surface.surface_id;
      state.map.scale = actorParticipants(surface).length > MAX_MAP_ACTORS ? 4.25 : 3.2;
      state.map.level = actorParticipants(surface).length > MAX_MAP_ACTORS ? 'evidence' : 'surface';
      renderModeControls();
      renderMapMode();
    } else if (state.actors.has(id)) {
      const containing = [...state.surfaces.values()].find(item => actorParticipants(item).some(participant => participant.actor_id === id));
      if (containing) {
        selectMapSurface(containing.surface_id);
        selectActor(id, 'map');
      }
    } else {
      const legacy = state.legacyNodes.get(id);
      const clusterId = clusterForLegacyNode(legacy);
      if (summarizeClusters(state.data.surfaceGraph).some(cluster => cluster.id === clusterId)) selectCluster(clusterId);
    }
  } finally {
    state.address.applying = false;
  }
  commitApertureAddress('push');
  state.root.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function bindExternalFocus() {
  document.addEventListener('click', event => {
    const focusTarget = event.target instanceof Element ? event.target.closest('[data-network-focus]') : event.target?.parentElement?.closest('[data-network-focus]');
    if (!focusTarget) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    focusExternal(focusTarget.dataset.networkFocus);
  }, true);
}

function bindEvents() {
  state.root.addEventListener('click', handleClick);
  state.root.addEventListener('input', handleInput);
  state.root.addEventListener('change', handleChange);
  state.root.addEventListener('keydown', handleKeydown);
  window.addEventListener('popstate', restoreApertureFromLocation);
  $('#aperture-stage', state.root).addEventListener('wheel', event => {
    if (state.mode !== 'map') return;
    event.preventDefault();
    setMapScale(state.map.scale + (event.deltaY > 0 ? -.2 : .2), { history: 'replace' });
  }, { passive: false });
  matchMedia('(max-width: 760px)').addEventListener?.('change', () => {
    if (!isMobile()) state.sheetOpen = false;
    syncInspectorSheet();
  });
  state.root.classList.add('aperture-is-visible');
  if ('IntersectionObserver' in window) {
    state.visibilityObserver = new IntersectionObserver(entries => {
      const visible = entries.some(entry => entry.isIntersecting);
      state.root.classList.toggle('aperture-is-visible', visible);
      if (!visible && isMobile()) {
        state.sheetOpen = false;
        syncInspectorSheet();
      }
    }, { rootMargin: '120px 0px 120px', threshold: 0 });
    state.visibilityObserver.observe(state.root);
  }
  bindExternalFocus();
}

async function mount() {
  const root = document.getElementById(ROOT_ID);
  if (!root || root.dataset.apertureMounted === 'true') return;
  const [_, surfaceGraph, hopGraph, receiptGraph, legacyGraph] = await Promise.all([
    waitForPublicApp(),
    readData('build/surface-graph.json'),
    readData('build/hop-graph.json'),
    readData('build/receipt-graph.json').catch(() => ({ receipts: [] })),
    readData('graph.json').catch(() => ({ nodes: [], edges: [] }))
  ]);
  state.data = { surfaceGraph, hopGraph, receiptGraph, legacyGraph };
  state.root = root;
  initializeIndexes();
  initializeSelections();
  state.address.defaults = apertureSnapshot();
  const decoded = readApertureState(location.search);
  if (decoded) {
    applyApertureSnapshot(decoded);
    state.address.active = true;
  }
  root.dataset.apertureMounted = 'true';
  root.classList.add('aperture-deck');
  root.innerHTML = shellMarkup();
  reflectApertureMode();
  bindEvents();
  renderModeControls();
  renderCurrent();
  setDataStatus();
  updatePublicHero();
  state.address.ready = true;
  if (decoded) commitApertureAddress('replace');
}

mount().catch(error => {
  console.error('The integrated visual aperture could not initialize; preserving the existing public topology.', error);
});
