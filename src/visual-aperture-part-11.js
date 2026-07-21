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

function focusExternal(id) {
  setMode('map');
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
  $('#aperture-stage', state.root).addEventListener('wheel', event => {
    if (state.mode !== 'map') return;
    event.preventDefault();
    setMapScale(state.map.scale + (event.deltaY > 0 ? -.2 : .2));
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
  root.dataset.apertureMounted = 'true';
  root.classList.add('aperture-deck');
  root.innerHTML = shellMarkup();
  bindEvents();
  renderModeControls();
  renderCurrent();
  setDataStatus();
  updatePublicHero();
}

mount().catch(error => {
  console.error('The integrated visual aperture could not initialize; preserving the existing public topology.', error);
});
