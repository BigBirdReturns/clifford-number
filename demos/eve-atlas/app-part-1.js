const {
  actorParticipants,
  clusterForSurface,
  computeCorridors,
  denseSurfaces,
  diagnosePathFilters,
  evidenceRank,
  groupDenseSurface,
  humanLabel,
  normalizeEvidence,
  periodBounds,
  selectBudgetedParticipants,
  semanticLevel,
  shortestFilteredPath,
  stableRingPosition,
  summarizeClusters,
  surfaceTypeGroups,
  sampleData
} = globalThis.CliffordDemoCore;

const $ = selector => document.querySelector(selector);
const $$ = selector => [...document.querySelectorAll(selector)];

const state = {
  data: null,
  actors: new Map(),
  surfaces: new Map(),
  receipts: new Map(),
  activeTab: 'semantic',
  semantic: {
    scale: 1,
    selectedCluster: null,
    selectedType: null,
    selectedSurfaceId: null,
    selectedActorId: null
  },
  route: {
    from: null,
    to: null,
    asOf: '',
    evidenceFloor: 'open'
  },
  dense: {
    surfaceId: null,
    query: '',
    asOf: '',
    evidenceFloor: 'open',
    budget: 18,
    pinned: new Set(),
    selectedActorId: null
  }
};

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function shortLabel(value, max = 30) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function actorLabel(id) {
  return state.actors.get(id)?.label || id || 'Unknown actor';
}

function evidenceBadge(value) {
  const normalized = normalizeEvidence(value);
  return `<span class="badge badge--${esc(normalized)}">${esc(humanLabel(normalized))}</span>`;
}

function windowLabel(start, end, temporalStatus = '') {
  if (temporalStatus && temporalStatus !== 'dated') return temporalStatus === 'undated' ? 'Dates not documented' : humanLabel(temporalStatus);
  if (!start && !end) return 'Dates not documented';
  return `${start || '…'} → ${end || 'ongoing'}`;
}

function receiptHealth(ids = []) {
  const unique = [...new Set(ids)];
  let healthy = 0;
  let warning = 0;
  let missing = 0;
  for (const id of unique) {
    const receipt = state.receipts.get(id);
    if (!receipt) {
      missing += 1;
      continue;
    }
    const archiveRef = receipt.archive?.ref || receipt.archive?.url || receipt.archive_url || receipt.archive_ref;
    if (archiveRef) healthy += 1;
    else warning += 1;
  }
  return { total: unique.length, healthy, warning, missing };
}

function receiptHealthMarkup(ids = []) {
  const health = receiptHealth(ids);
  return `<div class="badge-row">
    <span class="badge">${health.total} receipt${health.total === 1 ? '' : 's'}</span>
    <span class="badge badge--official">${health.healthy} archived</span>
    ${health.warning ? `<span class="badge badge--reported">${health.warning} archive warning${health.warning === 1 ? '' : 's'}</span>` : ''}
    ${health.missing ? `<span class="badge badge--open">${health.missing} missing record${health.missing === 1 ? '' : 's'}</span>` : ''}
  </div>`;
}

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

async function loadRepositoryData() {
  try {
    const [surfaceGraph, hopGraph, receiptGraph] = await Promise.all([
      loadJson('../../build/surface-graph.json'),
      loadJson('../../build/hop-graph.json'),
      loadJson('../../build/receipt-graph.json').catch(() => ({ receipts: [] }))
    ]);
    return { source: 'compiled repository artifacts', surfaceGraph, hopGraph, receiptGraph };
  } catch (error) {
    console.warn('Using the embedded demonstration fixture because compiled artifacts were unavailable.', error);
    return sampleData();
  }
}

function initializeIndexes() {
  state.actors = new Map((state.data.surfaceGraph.actors ?? []).map(actor => [actor.id, actor]));
  state.surfaces = new Map((state.data.surfaceGraph.surfaces ?? []).map(surface => [surface.surface_id, surface]));
  state.receipts = new Map((state.data.receiptGraph?.receipts ?? []).map(receipt => [receipt.receipt_id, receipt]));
}

function setDataStatus() {
  const status = $('#data-status');
  const live = state.data.source === 'compiled repository artifacts';
  status.textContent = live ? 'Rendering compiled repository artifacts' : 'Rendering embedded fixture data';
  status.classList.toggle('is-live', live);
  status.classList.toggle('is-fixture', !live);
}

function activateTab(tab, { updateHash = true } = {}) {
  state.activeTab = tab;
  for (const button of $$('[data-demo-tab]')) {
    const active = button.dataset.demoTab === tab;
    button.classList.toggle('is-active', active);
    button.setAttribute('aria-selected', String(active));
    button.tabIndex = active ? 0 : -1;
  }
  for (const panel of $$('[data-demo-panel]')) panel.hidden = panel.dataset.demoPanel !== tab;
  if (updateHash) history.replaceState(null, '', `#${tab}`);
  if (tab === 'semantic') renderSemantic();
  if (tab === 'route') renderRoute();
  if (tab === 'dense') renderDense();
}

function initTabs() {
  const tabs = $$('[data-demo-tab]');
  for (const button of tabs) {
    button.addEventListener('click', () => activateTab(button.dataset.demoTab));
    button.addEventListener('keydown', event => {
      if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
      event.preventDefault();
      const current = tabs.indexOf(button);
      const index = event.key === 'Home'
        ? 0
        : event.key === 'End'
          ? tabs.length - 1
          : (current + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
      tabs[index].focus();
      activateTab(tabs[index].dataset.demoTab);
    });
  }
  const requested = location.hash.replace('#', '');
  activateTab(['semantic', 'route', 'dense'].includes(requested) ? requested : 'semantic', { updateHash: false });
}

function setSemanticScale(value) {
  state.semantic.scale = Math.max(1, Math.min(5.4, Number(value) || 1));
  $('#semantic-scale').value = String(state.semantic.scale);
  renderSemantic();
}

function selectedClusterRecord() {
  const clusters = summarizeClusters(state.data.surfaceGraph);
  return clusters.find(cluster => cluster.id === state.semantic.selectedCluster) ?? clusters[0] ?? null;
}

function ensureSemanticSelection() {
  const clusters = summarizeClusters(state.data.surfaceGraph);
  if (!clusters.length) return;
  if (!clusters.some(cluster => cluster.id === state.semantic.selectedCluster)) state.semantic.selectedCluster = clusters[0].id;
  const cluster = clusters.find(item => item.id === state.semantic.selectedCluster);
  const selectedSurface = state.surfaces.get(state.semantic.selectedSurfaceId);
  if (!selectedSurface || clusterForSurface(selectedSurface) !== cluster.id) {
    state.semantic.selectedSurfaceId = cluster.surfaces[0]?.surface_id ?? null;
    state.semantic.selectedActorId = null;
  }
}

function populateSemanticControls() {
  ensureSemanticSelection();
  const clusters = summarizeClusters(state.data.surfaceGraph);
  $('#semantic-cluster-select').innerHTML = clusters
    .map(cluster => `<option value="${esc(cluster.id)}">${esc(cluster.label)} · ${cluster.surfaceCount}</option>`)
    .join('');
  $('#semantic-cluster-select').value = state.semantic.selectedCluster;
  populateSemanticSurfaceSelect();
}

function populateSemanticSurfaceSelect() {
  const cluster = selectedClusterRecord();
  const select = $('#semantic-surface-select');
  if (!cluster) {
    select.innerHTML = '';
    return;
  }
  const surfaces = [...cluster.surfaces].sort((a, b) => actorParticipants(b).length - actorParticipants(a).length || a.surface_label.localeCompare(b.surface_label));
  select.innerHTML = surfaces.map(surface => `<option value="${esc(surface.surface_id)}">${esc(shortLabel(surface.surface_label, 66))} · ${actorParticipants(surface).length}</option>`).join('');
  if (!surfaces.some(surface => surface.surface_id === state.semantic.selectedSurfaceId)) state.semantic.selectedSurfaceId = surfaces[0]?.surface_id ?? null;
  select.value = state.semantic.selectedSurfaceId ?? '';
}
