function shellMarkup() {
  return `
    <div class="aperture-header">
      <div>
        <p class="section-kicker">Operational public topology</p>
        <h2 id="network-title">Map the system. Keep the receipt attached.</h2>
        <p>Semantic zoom changes the object under inspection. Route mode preserves every actor → bounded surface → actor step. Surface mode keeps dense rosters inside their container instead of manufacturing pairwise adjacency.</p>
      </div>
      <div class="aperture-live" aria-live="polite">
        <span class="aperture-live-dot" aria-hidden="true"></span>
        <strong id="aperture-data-status">Compiled release</strong>
        <span id="aperture-data-meta">Loading the operating view…</span>
      </div>
    </div>

    <div class="aperture-commandbar">
      <div class="aperture-mode-switch" role="tablist" aria-label="Choose operating mode">
        <button type="button" role="tab" class="aperture-mode-button is-active" data-ap-mode="map" aria-selected="true"><span>01</span> Map</button>
        <button type="button" role="tab" class="aperture-mode-button" data-ap-mode="route" aria-selected="false" tabindex="-1"><span>02</span> Route</button>
        <button type="button" role="tab" class="aperture-mode-button" data-ap-mode="surface" aria-selected="false" tabindex="-1"><span>03</span> Surface</button>
      </div>
      <div id="aperture-mode-controls" class="aperture-mode-controls"></div>
    </div>

    <div class="aperture-telemetry">
      <nav id="aperture-breadcrumbs" class="aperture-breadcrumbs" aria-label="Current visualization scope"></nav>
      <div id="aperture-stats" class="aperture-stats" aria-live="polite"></div>
    </div>

    <div class="aperture-layout">
      <div class="aperture-stage-wrap">
        <svg id="aperture-stage" class="aperture-stage" viewBox="0 0 1200 720" role="img" aria-labelledby="aperture-stage-title aperture-stage-desc">
          <title id="aperture-stage-title">Clifford Number operating map</title>
          <desc id="aperture-stage-desc">An interactive semantic map of bounded public surfaces, actors, routes, and evidence states.</desc>
          <g id="aperture-layer"></g>
        </svg>
        <div class="aperture-stage-legend" aria-label="Visual legend">
          <span><i class="aperture-key aperture-key--surface"></i> bounded surface</span>
          <span><i class="aperture-key aperture-key--actor"></i> actor</span>
          <span><i class="aperture-key aperture-key--corridor"></i> aggregate corridor</span>
          <span><i class="aperture-key aperture-key--selection"></i> selected</span>
        </div>
      </div>

      <aside id="aperture-inspector" class="aperture-inspector" aria-live="polite">
        <button type="button" class="aperture-sheet-toggle" data-ap-action="sheet-toggle" aria-expanded="false">
          <span>Selected object</span><strong id="aperture-sheet-label">Public topology</strong><i aria-hidden="true">⌃</i>
        </button>
        <div id="aperture-inspector-body" class="aperture-inspector-body"></div>
      </aside>
    </div>

    <section class="aperture-overview" aria-labelledby="aperture-overview-title">
      <div class="aperture-overview-heading">
        <div><p class="section-kicker">Evidence overview</p><h3 id="aperture-overview-title">Stable rows for the visible field.</h3></div>
        <p id="aperture-overview-status"></p>
      </div>
      <div class="aperture-table-scroll">
        <table>
          <thead id="aperture-table-head"></thead>
          <tbody id="aperture-table-body"></tbody>
        </table>
      </div>
    </section>

    <p class="aperture-boundary"><strong>Visual prominence is not an allegation.</strong> A corridor is not a hop. A hop is not coordination. The interface preserves evidence class, temporal limits, compiler refusals, and receipt IDs at the point of use.</p>`;
}

function initializeIndexes() {
  state.actors = new Map((state.data.surfaceGraph.actors ?? []).map(actor => [actor.id, actor]));
  state.surfaces = new Map((state.data.surfaceGraph.surfaces ?? []).map(surface => [surface.surface_id, surface]));
  state.receipts = new Map((state.data.receiptGraph.receipts ?? []).map(receipt => [receipt.receipt_id, receipt]));
  state.legacyNodes = new Map((state.data.legacyGraph.nodes ?? []).map(node => [node.id, node]));
  for (const [id, node] of state.legacyNodes) {
    if (!state.actors.has(id) && node.type === 'person') state.actors.set(id, { id, label: node.label, description: node.description });
  }
}

function largestSurface(surfaces = []) {
  return [...surfaces].sort((a, b) => actorParticipants(b).length - actorParticipants(a).length || String(a.surface_label).localeCompare(String(b.surface_label)))[0] ?? null;
}

function initializeSelections() {
  const clusters = summarizeClusters(state.data.surfaceGraph);
  const preferredCluster = clusters.find(cluster => cluster.id === 'forums') ?? clusters[0] ?? null;
  state.map.selectedClusterId = preferredCluster?.id ?? null;
  state.map.selectedSurfaceId = largestSurface(preferredCluster?.surfaces)?.surface_id ?? null;
  state.selectedSurfaceId = state.map.selectedSurfaceId;

  const actorIds = routeActorIds();
  const anchor = state.data.hopGraph.anchor_actor_id;
  state.route.fromId = actorIds.includes('ben-warner') ? 'ben-warner' : actorIds.find(id => id !== anchor) ?? actorIds[0] ?? null;
  state.route.toId = actorIds.includes(anchor) ? anchor : actorIds.at(-1) ?? null;

  const dense = denseSurfaces(state.data.surfaceGraph, { minimumActors: 2 });
  state.surface.surfaceId = dense[0]?.surface.surface_id ?? state.map.selectedSurfaceId;
}

function updatePublicHero() {
  const actorCount = state.data.surfaceGraph.actors?.length ?? 0;
  const surfaceCount = state.data.surfaceGraph.surfaces?.length ?? 0;
  const hopCount = state.data.hopGraph.edges?.length ?? 0;
  const heroNodes = $('#hero-node-count');
  const heroEdges = $('#hero-edge-count');
  if (heroNodes) heroNodes.textContent = `${actorCount} actors · ${surfaceCount} surfaces`;
  if (heroEdges) heroEdges.textContent = `${hopCount} admitted hops`;

  for (const [focus, selector] of [['dialog', '#hotspot-dialog-count'], ['ai-opportunities-action-plan', '#hotspot-action-plan-count'], ['palantir', '#hotspot-palantir-count']]) {
    const element = $(selector);
    if (!element) continue;
    const surface = findSurfaceForFocus(focus);
    if (surface) element.textContent = `${actorParticipants(surface).length} documented actors · ${surface.hop_eligible ? 'hop-eligible' : 'bounded context'}`;
  }
}

function setDataStatus() {
  $('#aperture-data-meta', state.root).textContent = `${state.actors.size} actors · ${state.surfaces.size} bounded surfaces · ${state.data.hopGraph.edges?.length ?? 0} valid hops`;
}

function evidenceOptions(selected = 'open') {
  const options = [
    ['open', 'All admitted evidence'],
    ['reported', 'Reported or stronger'],
    ['primary_public', 'Primary public or stronger'],
    ['official', 'Official / confirmed only']
  ];
  return options.map(([value, label]) => `<option value="${value}"${value === selected ? ' selected' : ''}>${label}</option>`).join('');
}

function actorOptions(selected) {
  return routeActorIds().map(id => `<option value="${esc(id)}"${id === selected ? ' selected' : ''}>${esc(actorLabel(id))}</option>`).join('');
}
