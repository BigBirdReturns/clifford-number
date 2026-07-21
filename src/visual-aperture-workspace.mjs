export const APERTURE_WORKSPACE_VERSION = '1';
export const APERTURE_WORKSPACE_STORAGE_KEY = 'clifford-aperture-workspace';

const MAX_SAVED_VIEWS = 12;
const MAX_RECENT_ROUTES = 8;
const MAX_PIN_SURFACES = 20;
const MAX_PINS_PER_SURFACE = 36;
const MAX_COMPARE_ITEMS = 2;
const EVIDENCE_FLOORS = new Set(['open', 'reported', 'primary_public', 'official']);
const COMPARE_KINDS = new Set(['actor', 'surface']);

function text(value, maximum) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function identifier(value, maximum = 200) {
  const cleaned = text(value, maximum);
  return cleaned || null;
}

function timestamp(value) {
  const cleaned = text(value, 40);
  return Number.isFinite(Date.parse(cleaned)) ? new Date(cleaned).toISOString() : null;
}

function evidenceFloor(value) {
  const cleaned = text(value, 32);
  return EVIDENCE_FLOORS.has(cleaned) ? cleaned : 'open';
}

function normalizedViewQuery(value) {
  const raw = String(value ?? '').replace(/^\?/, '').slice(0, 12_000);
  const params = new URLSearchParams(raw);
  if (params.get('ap_v') !== '1' || !['map', 'route', 'surface'].includes(params.get('ap_mode'))) return null;
  return params.toString();
}

function normalizedActorIds(values) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => identifier(value)).filter(Boolean))]
    .sort()
    .slice(0, MAX_PINS_PER_SURFACE);
}

function normalizedSavedView(value) {
  const id = identifier(value?.id, 80);
  const name = text(value?.name, 60);
  const query = normalizedViewQuery(value?.query);
  const savedAt = timestamp(value?.savedAt);
  if (!id || !name || !query || !savedAt) return null;
  return { id, name, query, savedAt };
}

function normalizedRecentRoute(value) {
  const fromId = identifier(value?.fromId);
  const toId = identifier(value?.toId);
  const visitedAt = timestamp(value?.visitedAt);
  if (!fromId || !toId || !visitedAt) return null;
  return {
    fromId,
    toId,
    asOf: text(value?.asOf, 10),
    evidenceFloor: evidenceFloor(value?.evidenceFloor),
    visitedAt
  };
}

function normalizedPinSet(value) {
  const surfaceId = identifier(value?.surfaceId);
  const updatedAt = timestamp(value?.updatedAt);
  if (!surfaceId || !updatedAt) return null;
  return { surfaceId, actorIds: normalizedActorIds(value?.actorIds), updatedAt };
}

function normalizedCompareItem(value) {
  const kind = text(value?.kind, 20);
  const id = identifier(value?.id);
  if (!COMPARE_KINDS.has(kind) || !id) return null;
  return { kind, id };
}

export function emptyApertureWorkspace() {
  return {
    version: APERTURE_WORKSPACE_VERSION,
    savedViews: [],
    recentRoutes: [],
    pinSets: [],
    compare: []
  };
}

export function normalizeApertureWorkspace(value) {
  if (!value || value.version !== APERTURE_WORKSPACE_VERSION) return emptyApertureWorkspace();
  const savedViews = (Array.isArray(value.savedViews) ? value.savedViews : [])
    .map(normalizedSavedView)
    .filter(Boolean)
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, MAX_SAVED_VIEWS);
  const recentRoutes = (Array.isArray(value.recentRoutes) ? value.recentRoutes : [])
    .map(normalizedRecentRoute)
    .filter(Boolean)
    .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
    .slice(0, MAX_RECENT_ROUTES);
  const pinSets = (Array.isArray(value.pinSets) ? value.pinSets : [])
    .map(normalizedPinSet)
    .filter(Boolean)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_PIN_SURFACES);
  const compare = (Array.isArray(value.compare) ? value.compare : [])
    .map(normalizedCompareItem)
    .filter(Boolean)
    .filter((item, index, items) => items.findIndex(other => other.kind === item.kind && other.id === item.id) === index)
    .slice(0, MAX_COMPARE_ITEMS);
  return { version: APERTURE_WORKSPACE_VERSION, savedViews, recentRoutes, pinSets, compare };
}

export function parseApertureWorkspace(raw) {
  if (!raw) return emptyApertureWorkspace();
  try {
    return normalizeApertureWorkspace(typeof raw === 'string' ? JSON.parse(raw) : raw);
  } catch {
    return emptyApertureWorkspace();
  }
}

export function serializeApertureWorkspace(workspace) {
  return JSON.stringify(normalizeApertureWorkspace(workspace));
}

export function saveApertureWorkspaceView(workspace, view) {
  const current = normalizeApertureWorkspace(workspace);
  const normalized = normalizedSavedView(view);
  if (!normalized) return current;
  const savedViews = [normalized, ...current.savedViews.filter(item => item.id !== normalized.id)]
    .sort((a, b) => b.savedAt.localeCompare(a.savedAt))
    .slice(0, MAX_SAVED_VIEWS);
  return { ...current, savedViews };
}

export function removeApertureWorkspaceView(workspace, id) {
  const current = normalizeApertureWorkspace(workspace);
  return { ...current, savedViews: current.savedViews.filter(item => item.id !== id) };
}

export function recordApertureWorkspaceRoute(workspace, route) {
  const current = normalizeApertureWorkspace(workspace);
  const normalized = normalizedRecentRoute(route);
  if (!normalized) return current;
  const key = item => `${item.fromId}|${item.toId}|${item.asOf}|${item.evidenceFloor}`;
  const routeKey = key(normalized);
  const recentRoutes = [normalized, ...current.recentRoutes.filter(item => key(item) !== routeKey)]
    .sort((a, b) => b.visitedAt.localeCompare(a.visitedAt))
    .slice(0, MAX_RECENT_ROUTES);
  return { ...current, recentRoutes };
}

export function setApertureWorkspacePins(workspace, pinSet) {
  const current = normalizeApertureWorkspace(workspace);
  const normalized = normalizedPinSet(pinSet);
  if (!normalized) return current;
  const pinSets = [normalized, ...current.pinSets.filter(item => item.surfaceId !== normalized.surfaceId)]
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MAX_PIN_SURFACES);
  return { ...current, pinSets };
}

export function getApertureWorkspacePins(workspace, surfaceId) {
  const current = normalizeApertureWorkspace(workspace);
  return current.pinSets.find(item => item.surfaceId === surfaceId)?.actorIds ?? [];
}

export function toggleApertureWorkspaceCompare(workspace, item) {
  const current = normalizeApertureWorkspace(workspace);
  const normalized = normalizedCompareItem(item);
  if (!normalized) return current;
  const existing = current.compare.findIndex(value => value.kind === normalized.kind && value.id === normalized.id);
  if (existing >= 0) return { ...current, compare: current.compare.filter((_, index) => index !== existing) };
  return { ...current, compare: [...current.compare, normalized].slice(-MAX_COMPARE_ITEMS) };
}

export function removeApertureWorkspaceCompare(workspace, kind, id) {
  const current = normalizeApertureWorkspace(workspace);
  return { ...current, compare: current.compare.filter(item => item.kind !== kind || item.id !== id) };
}
