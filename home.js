const DEFAULT_ENDPOINTS = {
  legacy: 'graph.json',
  hops: 'build/hop-graph.json',
  surfaces: 'build/surface-graph.json',
  receipts: 'build/receipt-graph.json'
};

const runtimeConfig = globalThis.CLIFFORD_GRAPH_CONFIG ?? {};
const PATHS = { ...DEFAULT_ENDPOINTS, ...(runtimeConfig.endpoints ?? {}) };

const LANE_IDS = ['model-production', 'workflow-admission', 'activation-spend', 'measurement-feedback'];

const LANE_DESCRIPTIONS = Object.freeze({
  'model-production': 'Who produced the policy or model machinery: commissions, plans, and governance foundations.',
  'workflow-admission': 'Who or what was admitted into the government workflow: appointments, roles, and directory listings.',
  'activation-spend': 'Where public spend or infrastructure was activated: procurement records, compute, and data assets.',
  'measurement-feedback': 'What was measured afterward. The corpus documents no direct records here yet.'
});

const LANE_POSITION = Object.freeze({
  'model-production': { x: 150, y: 300 },
  'workflow-admission': { x: 420, y: 300 },
  'activation-spend': { x: 690, y: 300 },
  'measurement-feedback': { x: 930, y: 300 }
});


const SURFACE_TYPE_LANE = Object.freeze({
  policy_document_surface: 'model-production',
  government_advisory_surface: 'model-production',
  model_governance_surface: 'model-production',
  category_formation_surface: 'model-production',
  directory_roster_surface: 'workflow-admission',
  founder_officer_surface: 'workflow-admission',
  board_advisory_surface: 'workflow-admission',
  employment_investment_surface: 'workflow-admission',
  campaign_surface: 'workflow-admission',
  laundering_chain_connector: 'workflow-admission',
  procurement_contract_surface: 'activation-spend',
  customer_vendor_surface: 'activation-spend',
  defence_industrial_surface: 'activation-spend',
  public_private_fund_surface: 'activation-spend',
  outcome_measurement_surface: 'measurement-feedback',
  audit_evaluation_surface: 'measurement-feedback'
});

const SURFACE_THEME_LABEL = Object.freeze({
  policy_document_surface: 'Policy documents',
  government_advisory_surface: 'Government advisory surfaces',
  model_governance_surface: 'Model governance',
  category_formation_surface: 'Category formation',
  directory_roster_surface: 'Directories and rosters',
  founder_officer_surface: 'Founder and officer records',
  board_advisory_surface: 'Boards and advisory roles',
  employment_investment_surface: 'Employment and investment transitions',
  campaign_surface: 'Campaign surfaces',
  laundering_chain_connector: 'Structural connectors',
  procurement_contract_surface: 'Procurement and contracts',
  customer_vendor_surface: 'Customer and vendor records',
  defence_industrial_surface: 'Defence-industrial records',
  public_private_fund_surface: 'Public-private funds',
  outcome_measurement_surface: 'Measured outcomes',
  audit_evaluation_surface: 'Audit and evaluation'
});

// Every research-edge type is classified into exactly one causal lane. This is the
// single source of truth for "which stage of the pipeline does this record belong to."
const EDGE_TYPE_LANE = Object.freeze({
  'policy-core': 'model-production',
  'commissioned-lead': 'model-production',
  commissioned: 'model-production',
  'co-announced': 'model-production',
  'adopted-plan': 'model-production',
  'political-adoption': 'model-production',
  'political-control': 'model-production',
  'state-transformation': 'model-production',
  'governance-foundation': 'model-production',
  'institutional-predecessor': 'model-production',

  principal: 'workflow-admission',
  'implementation-layer': 'workflow-admission',
  'commissioned-into': 'workflow-admission',
  'co-founder': 'workflow-admission',
  chair: 'workflow-admission',
  'public-directory-listing': 'workflow-admission',
  'co-founder-chair': 'workflow-admission',
  'executive-director': 'workflow-admission',
  founder: 'workflow-admission',
  'founder-led': 'workflow-admission',
  'co-founder-link': 'workflow-admission',
  'reported-attendance-history': 'workflow-admission',
  'named-ecosystem-node': 'workflow-admission',
  'listed-in-directory': 'workflow-admission',
  'cto-of': 'workflow-admission',
  'cpo-of': 'workflow-admission',
  'former-cro-of': 'workflow-admission',
  'co-founded': 'workflow-admission',
  'ceo-of': 'workflow-admission',
  'former-chair-of': 'workflow-admission',
  'became-chair-of': 'workflow-admission',
  'external-adviser-to': 'workflow-admission',
  'investor-in': 'workflow-admission',
  'founder-ceo-of': 'workflow-admission',
  'former-co-ceo-of': 'workflow-admission',
  'president-of': 'workflow-admission',
  'board-member-of': 'workflow-admission',
  'director-of': 'workflow-admission',
  'chair-of': 'workflow-admission',
  'executive-director-of': 'workflow-admission',
  'board-chair-of': 'workflow-admission',
  'co-chairman-of': 'workflow-admission',
  'wholly-owned-by': 'workflow-admission',
  'fund-partner': 'workflow-admission',
  'managing-partner-of': 'workflow-admission',
  'vp-and-hr-of': 'workflow-admission',
  'umbrella-membership': 'workflow-admission',

  'procurement-record': 'activation-spend',
  'compute-infrastructure': 'activation-spend',
  'data-asset': 'activation-spend',
  'state-market-unit': 'activation-spend'
});

// Within a lane, records are grouped into a small number of honest themes for display.
const EDGE_TYPE_THEME = Object.freeze({
  'policy-core': 'policy-machine-commissioning',
  'commissioned-lead': 'policy-machine-commissioning',
  commissioned: 'policy-machine-commissioning',
  'co-announced': 'policy-machine-commissioning',
  'adopted-plan': 'policy-machine-commissioning',
  'political-adoption': 'policy-adoption-and-control',
  'political-control': 'policy-adoption-and-control',
  'state-transformation': 'policy-adoption-and-control',
  'governance-foundation': 'policy-adoption-and-control',
  'institutional-predecessor': 'policy-adoption-and-control',

  principal: 'principal-appointment',
  'implementation-layer': 'implementation-admission',
  'commissioned-into': 'implementation-admission',

  'co-founder': 'officer-and-founder-roles',
  chair: 'officer-and-founder-roles',
  'co-founder-chair': 'officer-and-founder-roles',
  'executive-director': 'officer-and-founder-roles',
  founder: 'officer-and-founder-roles',
  'founder-led': 'officer-and-founder-roles',
  'co-founder-link': 'officer-and-founder-roles',
  'cto-of': 'officer-and-founder-roles',
  'cpo-of': 'officer-and-founder-roles',
  'former-cro-of': 'officer-and-founder-roles',
  'co-founded': 'officer-and-founder-roles',
  'ceo-of': 'officer-and-founder-roles',
  'former-chair-of': 'officer-and-founder-roles',
  'became-chair-of': 'officer-and-founder-roles',
  'external-adviser-to': 'officer-and-founder-roles',
  'investor-in': 'officer-and-founder-roles',
  'founder-ceo-of': 'officer-and-founder-roles',
  'former-co-ceo-of': 'officer-and-founder-roles',
  'president-of': 'officer-and-founder-roles',
  'board-member-of': 'officer-and-founder-roles',
  'director-of': 'officer-and-founder-roles',
  'chair-of': 'officer-and-founder-roles',
  'executive-director-of': 'officer-and-founder-roles',
  'board-chair-of': 'officer-and-founder-roles',
  'co-chairman-of': 'officer-and-founder-roles',
  'wholly-owned-by': 'officer-and-founder-roles',
  'fund-partner': 'officer-and-founder-roles',
  'managing-partner-of': 'officer-and-founder-roles',
  'vp-and-hr-of': 'officer-and-founder-roles',

  'public-directory-listing': 'directory-and-network-listing',
  'reported-attendance-history': 'directory-and-network-listing',
  'named-ecosystem-node': 'directory-and-network-listing',
  'listed-in-directory': 'directory-and-network-listing',
  'umbrella-membership': 'directory-and-network-listing',

  'procurement-record': 'procurement',
  'compute-infrastructure': 'infrastructure-and-data',
  'data-asset': 'infrastructure-and-data',
  'state-market-unit': 'infrastructure-and-data'
});

const THEME_LABEL = Object.freeze({
  'policy-machine-commissioning': 'Policy machine commissioning',
  'policy-adoption-and-control': 'Policy adoption & control',
  'principal-appointment': 'Principal appointment',
  'implementation-admission': 'Implementation-layer admission',
  'officer-and-founder-roles': 'Officer & founder roles',
  'directory-and-network-listing': 'Directory & network listing',
  procurement: 'Procurement',
  'infrastructure-and-data': 'Infrastructure & data assets'
});

const LANE_THEME_ORDER = Object.freeze({
  'model-production': ['policy-machine-commissioning', 'policy-adoption-and-control'],
  'workflow-admission': ['principal-appointment', 'implementation-admission', 'officer-and-founder-roles', 'directory-and-network-listing'],
  'activation-spend': ['procurement', 'infrastructure-and-data'],
  'measurement-feedback': []
});

const state = {
  legacyGraph: null,
  hopGraph: null,
  surfaceGraph: null,
  receiptGraph: null,
  receiptById: new Map(),
  sourceById: new Map(),
  inspecting: false
};

const $ = selector => document.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

async function loadJson(path) {
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`Could not load ${path}`);
  return response.json();
}

function humanLabel(value) {
  return String(value ?? '').replace(/[_-]+/g, ' ').replace(/\b\w/g, char => char.toUpperCase());
}

function shortLabel(value, max = 24) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}


function safeExternalUrl(value) {
  if (!value) return null;
  try {
    const url = new URL(String(value), location.href);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}

function safeLocalReceiptPath(value) {
  const path = String(value ?? '').replace(/\\/g, '/').replace(/^\.\//, '');
  if (!path.startsWith('receipts/') || path.includes('..') || !/\.(?:md|json|jsonl|txt|html|pdf)$/i.test(path)) return null;
  return path;
}

function receiptRecord(id) {
  return state.receiptById.get(id) ?? state.sourceById.get(id) ?? { receipt_id: id, label: id };
}

function receiptCard(id) {
  const receipt = receiptRecord(id);
  const sourceUrl = safeExternalUrl(receipt.source_url || receipt.url);
  const archiveUrl = safeExternalUrl(receipt.archive_url || receipt.archive?.url || receipt.archive?.ref);
  const localPath = safeLocalReceiptPath(receipt.path);
  const actions = [
    sourceUrl ? `<a href="${esc(sourceUrl)}" target="_blank" rel="noreferrer">Original source ↗</a>` : '',
    localPath ? `<a href="${esc(localPath)}">Preserved extract →</a>` : '',
    archiveUrl ? `<a href="${esc(archiveUrl)}" target="_blank" rel="noreferrer">Archived copy ↗</a>` : ''
  ].filter(Boolean).join('');
  const dates = [
    receipt.source_published_at ? `published ${receipt.source_published_at}` : '',
    receipt.source_updated_at ? `updated ${receipt.source_updated_at}` : '',
    receipt.event_date ? `event ${receipt.event_date}` : '',
    receipt.retrieved_at ? `retrieved ${receipt.retrieved_at}` : ''
  ].filter(Boolean).join(' · ');
  return `<li class="receipt-item"><strong>${esc(receipt.label || id)}</strong><span>${esc(humanLabel(receipt.evidence_class || receipt.source_type || 'source'))}${dates ? ` · ${esc(dates)}` : ''}</span>${actions ? `<div class="receipt-item-actions">${actions}</div>` : '<em>Locator unavailable in this release.</em>'}</li>`;
}

function compactNumber(value) {
  return new Intl.NumberFormat('en', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value ?? 0));
}

function laneForEdgeType(type) {
  return EDGE_TYPE_LANE[type] ?? 'workflow-admission';
}

function themeForEdgeType(type) {
  return EDGE_TYPE_THEME[type] ?? type;
}

function surfaceReceiptIds(surface) {
  return [...new Set([
    ...(surface.receipt_ids ?? []),
    ...(surface.participants ?? []).flatMap(participant => participant.receipt_ids ?? [])
  ])];
}

function laneForSurface(surface) {
  return SURFACE_TYPE_LANE[surface?.surface_type] ?? 'workflow-admission';
}

function buildLaneModel(surfaceGraph) {
  const surfacesByLane = new Map(LANE_IDS.map(id => [id, []]));
  for (const surface of surfaceGraph?.surfaces ?? []) {
    const lane = laneForSurface(surface);
    surfacesByLane.get(lane)?.push(surface);
  }
  return LANE_IDS.map(laneId => {
    const surfaces = surfacesByLane.get(laneId) ?? [];
    const byType = new Map();
    for (const surface of surfaces) {
      if (!byType.has(surface.surface_type)) byType.set(surface.surface_type, []);
      byType.get(surface.surface_type).push(surface);
    }
    const typeIds = [...byType.keys()].sort();
    const pos = LANE_POSITION[laneId];
    const rowHeight = 72;
    const startY = pos.y - ((typeIds.length - 1) * rowHeight) / 2;
    const marks = typeIds.map((surfaceType, index) => {
      const typed = byType.get(surfaceType);
      const receiptIds = [...new Set(typed.flatMap(surfaceReceiptIds))];
      const participantCount = typed.reduce((sum, surface) => sum + (surface.participants ?? []).length, 0);
      return {
        id: `${laneId}__${surfaceType}`,
        surfaceType,
        label: SURFACE_THEME_LABEL[surfaceType] ?? humanLabel(surfaceType),
        documentedCount: typed.length,
        participantCount,
        surfaceIds: typed.map(surface => surface.surface_id).sort(),
        receiptIds,
        x: pos.x,
        y: typeIds.length ? startY + index * rowHeight : pos.y
      };
    });
    return { id: laneId, projection: 'face-on', x: pos.x, y: pos.y, marks };
  });
}

function homepageModel() {
  const surfaceGraph = state.surfaceGraph ?? { surfaces: [] };
  const hopGraph = state.hopGraph ?? { edges: [] };
  const receiptGraph = state.receiptGraph ?? { receipts: [] };
  const surfaces = surfaceGraph.surfaces ?? [];
  const lanes = buildLaneModel(surfaceGraph);
  const allMarks = lanes.flatMap(lane => lane.marks);
  const edges = surfaces.map(surface => {
    const lane = laneForSurface(surface);
    return {
      id: `surface__${surface.surface_id}`,
      pathStepId: surface.surface_id,
      receiptIds: surfaceReceiptIds(surface),
      fromLane: lane,
      toLane: lane
    };
  });
  const allSurfaceReceiptIds = [...new Set(surfaces.flatMap(surfaceReceiptIds))];
  const allHopReceiptIds = [...new Set((hopGraph.edges ?? []).flatMap(edge => (edge.surfaces ?? []).flatMap(surface => surface.receipt_ids ?? [])))];
  const allReceiptIds = (receiptGraph.receipts ?? []).map(receipt => receipt.receipt_id);
  const displayedNumbers = [];
  if (surfaces.length && allSurfaceReceiptIds.length) displayedNumbers.push({ id: 'bounded-surfaces', value: surfaces.length, receiptIds: allSurfaceReceiptIds });
  if ((hopGraph.edges ?? []).length && allHopReceiptIds.length) displayedNumbers.push({ id: 'compiler-admitted-hops', value: hopGraph.edges.length, receiptIds: allHopReceiptIds });
  if (allReceiptIds.length) displayedNumbers.push({ id: 'public-receipts', value: allReceiptIds.length, receiptIds: allReceiptIds });
  for (const lane of lanes) {
    const laneCount = lane.marks.reduce((sum, mark) => sum + mark.documentedCount, 0);
    const receiptIds = [...new Set(lane.marks.flatMap(mark => mark.receiptIds))];
    if (laneCount > 0 && receiptIds.length) displayedNumbers.push({ id: `${lane.id}-surfaces`, value: laneCount, receiptIds });
  }
  const joinedReceiptIds = surfaces
    .filter(surface => surface.surface_type === 'activation_measurement_join_surface')
    .flatMap(surfaceReceiptIds);
  const aperture = {
    state: joinedReceiptIds.length ? 'joined' : 'open',
    afterLane: 'activation-spend',
    beforeLane: 'measurement-feedback',
    joinedReceiptIds: [...new Set(joinedReceiptIds)],
    x: (LANE_POSITION['activation-spend'].x + LANE_POSITION['measurement-feedback'].x) / 2,
    y: LANE_POSITION['activation-spend'].y
  };
  return {
    interactionMode: 'homepage-summary',
    dataBoundary: surfaceGraph.generated ?? null,
    lanes,
    edges,
    displayedNumbers,
    visibleCounts: { marks: allMarks.length, documentedRecords: surfaces.length, boundedSurfaces: surfaces.length },
    aperture
  };
}

function evidenceInspectionModel() {
  const home = homepageModel();
  const marks = home.lanes.flatMap(lane => lane.marks);
  const columns = 4;
  const gridMarks = marks.map((mark, index) => ({
    id: mark.id,
    x: 120 + (index % columns) * 200,
    y: 90 + Math.floor(index / columns) * 96
  }));

  const plates = ['A', 'B', 'C'].map(plateId => ({
    id: plateId,
    marks: gridMarks.map(mark => ({ id: mark.id, x: mark.x, y: mark.y })),
    labels: [plateId]
  }));

  const labels = LANE_IDS.map(laneId => ({
    id: `label-${laneId}`,
    persistent: true,
    location: 'outside-projection',
    text: LANE_DESCRIPTIONS[laneId]
  }));

  return {
    interactionMode: 'evidence-inspection',
    visibleCounts: home.visibleCounts,
    plates,
    labels
  };
}

function markRadius(count) {
  return Math.max(10, Math.min(34, 10 + Math.sqrt(count) * 3.4));
}

function sourceTitle(id) {
  return state.receiptById.get(id)?.label || state.sourceById.get(id)?.label || state.sourceById.get(id)?.title || id;
}

function renderCausalMap(model) {
  const edgesGroup = $('#causal-map-edges');
  if (edgesGroup) {
    const spineLanes = model.lanes.filter(lane => lane.id !== 'measurement-feedback');
    const spinePoints = spineLanes.map(lane => `${lane.x},${lane.y}`).join(' ');
    const measurementLane = model.lanes.find(lane => lane.id === 'measurement-feedback');
    const afterGapPoints = measurementLane ? `${model.aperture.x + 34},${model.aperture.y} ${measurementLane.x},${measurementLane.y}` : '';
    edgesGroup.innerHTML = `
      <polyline class="causal-route-spine" points="${esc(spinePoints)}"></polyline>
      <polyline class="causal-route-spine causal-route-spine--after-gap" points="${esc(afterGapPoints)}"></polyline>
      <line class="causal-route-gap" x1="${model.aperture.x - 34}" y1="${model.aperture.y}" x2="${model.aperture.x + 34}" y2="${model.aperture.y}"></line>
      <text class="causal-route-gap-label" x="${model.aperture.x}" y="${model.aperture.y - 44}" text-anchor="middle">Joined receipt: not observed</text>
    `;
  }

  for (const lane of model.lanes) {
    const laneGroup = document.getElementById(`lane-${lane.id}`);
    if (!laneGroup) continue;
    const markMarkup = lane.marks.map(mark => {
      const radius = markRadius(mark.documentedCount);
      const label = `${mark.label}: ${mark.documentedCount} documented record${mark.documentedCount === 1 ? '' : 's'}`;
      return `<g class="causal-mark" data-mark="${esc(mark.id)}" tabindex="0" role="button" aria-label="${esc(label)}" transform="translate(${mark.x} ${mark.y})">
        <circle class="causal-mark-core" r="${radius}"></circle>
        <text class="causal-mark-count" y="4" text-anchor="middle">${esc(mark.documentedCount)}</text>
        <text class="causal-mark-label" y="${radius + 15}" text-anchor="middle">${esc(shortLabel(mark.label))}</text>
      </g>`;
    }).join('');
    laneGroup.innerHTML = `
      <rect class="causal-lane-band" x="${lane.x - 110}" y="40" width="220" height="520" rx="6"></rect>
      <text class="causal-lane-title" x="${lane.x}" y="26" text-anchor="middle">${esc(humanLabel(lane.id))}</text>
      ${markMarkup || `<text class="causal-lane-empty" x="${lane.x}" y="${lane.y}" text-anchor="middle">No direct records</text>`}
    `;
  }

  for (const element of document.querySelectorAll('.causal-mark')) {
    const activate = () => openMarkReceipts(element.dataset.mark, model);
    element.addEventListener('click', activate);
    element.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      activate();
    });
  }
}

function renderNumbers(model) {
  const container = $('#causal-numbers');
  if (!container) return;
  container.innerHTML = model.displayedNumbers.map(number => `
    <button type="button" class="causal-number" data-number="${esc(number.id)}">
      <strong>${esc(compactNumber(number.value))}</strong>
      <span>${esc(humanLabel(number.id))}</span>
    </button>
  `).join('');
  for (const button of container.querySelectorAll('[data-number]')) {
    button.addEventListener('click', () => openNumberReceipts(button.dataset.number, model));
  }
}

function renderEvidenceInspector(inspection) {
  for (const plate of inspection.plates) {
    const svg = document.querySelector(`[data-provenance-plate="${plate.id}"] svg`);
    if (!svg) continue;
    svg.innerHTML = plate.marks.map(mark => `<circle class="provenance-mark" data-provenance-mark="${esc(mark.id)}" cx="${mark.x}" cy="${mark.y}" r="7"></circle>`).join('');
  }
  const list = $('#provenance-labels');
  if (list) {
    list.innerHTML = inspection.labels.map(label => `<li>${esc(label.text)}</li>`).join('');
  }
}

function updateRouteSummary(model) {
  const span = $('#causal-live-stats');
  if (!span) return;
  span.textContent = ` ${model.visibleCounts.boundedSurfaces.toLocaleString()} bounded surfaces across ${model.visibleCounts.marks} typed aggregate marks · built ${model.dataBoundary || 'date unknown'}.`;
}

function openMarkReceipts(markId, model) {
  const mark = model.lanes.flatMap(lane => lane.marks).find(candidate => candidate.id === markId);
  if (!mark) return;
  showReceipts(mark.label, `${mark.documentedCount} documented record${mark.documentedCount === 1 ? '' : 's'}`, mark.receiptIds);
}

function openNumberReceipts(numberId, model) {
  const number = model.displayedNumbers.find(candidate => candidate.id === numberId);
  if (!number) return;
  showReceipts(humanLabel(numberId), String(number.value), number.receiptIds);
}

function showReceipts(title, meta, receiptIds) {
  const panel = $('#causal-detail');
  const content = $('#causal-detail-content');
  if (!panel || !content) return;
  const uniqueIds = [...new Set(receiptIds ?? [])];
  const items = uniqueIds.map(receiptCard).join('');
  content.innerHTML = `<p class="causal-detail-kicker">${esc(meta)}</p><h2>${esc(title)}</h2><p class="causal-detail-boundary">Each item below is a source record or preserved extract. Its presence supports the named public record, not motive, coordination, or wrongdoing.</p><ul class="receipt-list">${items || '<li>No public locator is available for this mark.</li>'}</ul>`;
  panel.hidden = false;
}

function closeReceipts() {
  const panel = $('#causal-detail');
  if (panel) panel.hidden = true;
}

function setInspectionMode(open) {
  const panel = $('#evidence-inspector');
  const toggle = $('#evidence-inspection-toggle');
  if (!panel || !toggle) return;
  state.inspecting = Boolean(open);
  panel.hidden = !state.inspecting;
  toggle.setAttribute('aria-expanded', String(state.inspecting));
  toggle.textContent = state.inspecting ? 'Close evidence inspection' : 'Open evidence inspection';
  if (state.inspecting) {
    panel.focus({ preventScroll: true });
  } else {
    toggle.focus({ preventScroll: true });
  }
}

function toggleEvidenceInspection() {
  setInspectionMode(!state.inspecting);
}

function bindControls() {
  $('#evidence-inspection-toggle')?.addEventListener('click', toggleEvidenceInspection);
  $('#evidence-inspection-close')?.addEventListener('click', () => setInspectionMode(false));
  $('#causal-detail-close')?.addEventListener('click', closeReceipts);
  document.addEventListener('keydown', event => {
    if (event.key !== 'Escape') return;
    const detail = $('#causal-detail');
    if (detail && !detail.hidden) {
      closeReceipts();
      return;
    }
    if (state.inspecting) setInspectionMode(false);
  });
}

async function init() {
  bindControls();
  try {
    const [legacyGraph, hopGraph, surfaceGraph, receiptGraph] = await Promise.all([
      loadJson(PATHS.legacy).catch(() => ({ sources: [], nodes: [], edges: [] })),
      loadJson(PATHS.hops), loadJson(PATHS.surfaces), loadJson(PATHS.receipts)
    ]);
    state.legacyGraph = legacyGraph;
    state.hopGraph = hopGraph;
    state.surfaceGraph = surfaceGraph;
    state.receiptGraph = receiptGraph;
    state.receiptById = new Map((receiptGraph.receipts ?? []).map(receipt => [receipt.receipt_id, receipt]));
    state.sourceById = new Map((legacyGraph.sources ?? []).map(source => [source.id, source]));
    const model = homepageModel();
    const inspection = evidenceInspectionModel();
    renderCausalMap(model);
    renderNumbers(model);
    renderEvidenceInspector(inspection);
    updateRouteSummary(model);
    $('#load-status').classList.add('is-ready');
  } catch (error) {
    console.error(error);
    $('#load-status').innerHTML = `<span>Could not load the public record. ${esc(error.message)}</span>`;
  }
}
init();
