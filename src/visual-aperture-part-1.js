
const ROOT_ID = 'network-atlas';
const MAX_MAP_ACTORS = 18;
const MAX_EVIDENCE_ACTORS = 12;

const state = {
  root: null,
  data: null,
  actors: new Map(),
  surfaces: new Map(),
  receipts: new Map(),
  legacyNodes: new Map(),
  mode: 'map',
  sheetOpen: false,
  visibilityObserver: null,
  selectedActorId: null,
  selectedSurfaceId: null,
  map: {
    scale: 1,
    level: 'corpus',
    selectedClusterId: null,
    selectedTypeId: null,
    selectedSurfaceId: null,
    selectedActorId: null
  },
  route: {
    fromId: null,
    toId: null,
    asOf: '',
    evidenceFloor: 'open',
    path: null,
    selectedStep: null,
    selectedActorId: null
  },
  surface: {
    surfaceId: null,
    query: '',
    asOf: '',
    evidenceFloor: 'open',
    budget: 18,
    pinned: new Set(),
    selectedActorId: null,
    selection: null
  }
};

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function shortLabel(value, max = 32) {
  const text = String(value ?? '');
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

function cloneValue(value) {
  if (typeof structuredClone === 'function') return structuredClone(value);
  return JSON.parse(JSON.stringify(value));
}

async function readData(path) {
  if (typeof EMBEDDED_DATA !== 'undefined' && Object.hasOwn(EMBEDDED_DATA, path)) return cloneValue(EMBEDDED_DATA[path]);
  const response = await fetch(path, { cache: 'no-cache' });
  if (!response.ok) throw new Error(`${path}: ${response.status}`);
  return response.json();
}

function waitForPublicApp() {
  const status = $('#app-status');
  if (!status || status.classList.contains('is-ready')) return Promise.resolve();
  return new Promise(resolve => {
    const observer = new MutationObserver(() => {
      if (!status.classList.contains('is-ready')) return;
      observer.disconnect();
      resolve();
    });
    observer.observe(status, { attributes: true, attributeFilter: ['class'] });
    setTimeout(() => {
      observer.disconnect();
      resolve();
    }, 8000);
  });
}

function actorLabel(id) {
  return state.actors.get(id)?.label || state.legacyNodes.get(id)?.label || id || 'Unknown actor';
}

function surfaceLabel(id) {
  return state.surfaces.get(id)?.surface_label || id || 'Unknown surface';
}

function evidenceLabel(value) {
  const normalized = normalizeEvidence(value);
  if (normalized === 'primary_public') return 'Primary public';
  if (normalized === 'government_record') return 'Government record';
  return humanLabel(normalized);
}

function evidenceBadge(value) {
  const normalized = normalizeEvidence(value);
  return `<span class="aperture-badge aperture-badge--${esc(normalized)}">${esc(evidenceLabel(normalized))}</span>`;
}

function windowLabel(start, end, temporalStatus = '') {
  if (temporalStatus && temporalStatus !== 'dated') return temporalStatus === 'undated' ? 'Dates not documented' : humanLabel(temporalStatus);
  if (!start && !end) return 'Dates not documented';
  return `${start || '…'} → ${end || 'ongoing'}`;
}

function unique(values) {
  return [...new Set((values ?? []).filter(Boolean))];
}

function receiptTitle(id) {
  const receipt = state.receipts.get(id);
  return receipt?.label || receipt?.title || receipt?.source_title || id;
}

function receiptHealth(ids = []) {
  const health = { total: 0, archived: 0, warning: 0, missing: 0 };
  for (const id of unique(ids)) {
    health.total += 1;
    const receipt = state.receipts.get(id);
    if (!receipt) {
      health.missing += 1;
      continue;
    }
    const archive = receipt.archive?.ref || receipt.archive?.url || receipt.archive_url || receipt.archive_ref;
    if (archive) health.archived += 1;
    else health.warning += 1;
  }
  return health;
}

function receiptButtons(ids = [], maximum = 6) {
  const values = unique(ids);
  if (!values.length) return '<p class="aperture-muted">No receipt IDs are attached to this projection.</p>';
  return `<div class="aperture-receipt-buttons">${values.slice(0, maximum).map(id => `<button type="button" data-open-receipt="${esc(id)}">Receipt · ${esc(shortLabel(receiptTitle(id), 38))}</button>`).join('')}${values.length > maximum ? `<span>+${values.length - maximum} more</span>` : ''}</div>`;
}

function receiptHealthBadges(ids = []) {
  const health = receiptHealth(ids);
  return `<div class="aperture-badge-row">
    <span class="aperture-badge">${health.total} receipt${health.total === 1 ? '' : 's'}</span>
    <span class="aperture-badge aperture-badge--official">${health.archived} archived</span>
    ${health.warning ? `<span class="aperture-badge aperture-badge--reported">${health.warning} archive warning${health.warning === 1 ? '' : 's'}</span>` : ''}
    ${health.missing ? `<span class="aperture-badge aperture-badge--open">${health.missing} missing record${health.missing === 1 ? '' : 's'}</span>` : ''}
  </div>`;
}
