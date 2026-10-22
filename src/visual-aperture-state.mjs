export const APERTURE_STATE_VERSION = '1';

// The timeline keys (SPEC fix e/j): written only when they differ from their
// defaults, so a default timeline view adds nothing to a shared URL. Every other
// key keeps the original always-serialized contract.
export const APERTURE_TIMELINE_QUERY_KEYS = Object.freeze([
  'ap_time_by', 'ap_time_from', 'ap_time_to', 'ap_time_cursor', 'ap_time_lanes', 'ap_time_sel', 'ap_time_evidence', 'ap_time_hop'
]);

export const APERTURE_QUERY_KEYS = Object.freeze([
  'ap_v', 'ap_mode', 'ap_overview_page', 'ap_overview_size',
  'ap_map_scale', 'ap_map_level', 'ap_map_cluster', 'ap_map_type', 'ap_map_surface', 'ap_map_actor',
  'ap_route_from', 'ap_route_to', 'ap_route_asof', 'ap_route_evidence', 'ap_route_step', 'ap_route_window', 'ap_route_actor',
  'ap_surface_id', 'ap_surface_query', 'ap_surface_asof', 'ap_surface_evidence', 'ap_surface_budget', 'ap_surface_pins', 'ap_surface_actor',
  ...APERTURE_TIMELINE_QUERY_KEYS
]);

const MODES = new Set(['timeline', 'map', 'route', 'surface']);
const MAP_LEVELS = new Set(['corpus', 'machine', 'surface', 'evidence']);
const EVIDENCE_FLOORS = new Set(['open', 'reported', 'primary_public', 'official']);
const OVERVIEW_PAGE_SIZES = new Set([25, 50, 100]);
const TIME_BY = new Set(['actor', 'organization', 'type']);
const HOP_FILTERS = new Set(['all', 'hop', 'context']);
const MAX_PINS = 36;
const MAX_LANES = 12;
const MAX_LANE_TOKEN = 200;
const MAX_ROW_KEY = 400;

function parameters(input = '') {
  if (input instanceof URLSearchParams) return new URLSearchParams(input);
  return new URLSearchParams(String(input || '').replace(/^\?/, ''));
}

function text(value, maximum = 160) {
  if (value === null || value === undefined) return null;
  return String(value).trim().slice(0, maximum);
}

function token(value, maximum = 200) {
  const cleaned = text(value, maximum);
  return cleaned ? cleaned : null;
}

function optionalNumber(value, minimum, maximum) {
  if (value === null || value === undefined || value === '') return null;
  const number = Number(value);
  if (!Number.isFinite(number)) return null;
  return Math.max(minimum, Math.min(maximum, number));
}

function optionalInteger(value, minimum, maximum) {
  const number = optionalNumber(value, minimum, maximum);
  return number === null ? null : Math.trunc(number);
}

function enumValue(value, allowed, fallback = null) {
  const cleaned = text(value, 64);
  return cleaned && allowed.has(cleaned) ? cleaned : fallback;
}

function overviewPageSize(value, fallback = null) {
  const parsed = optionalInteger(value, 25, 100);
  return parsed !== null && OVERVIEW_PAGE_SIZES.has(parsed) ? parsed : fallback;
}

function pins(value) {
  const values = String(value || '')
    .split(',')
    .map(item => token(item))
    .filter(Boolean);
  return [...new Set(values)].sort().slice(0, MAX_PINS);
}

// A calendar day that exists: 'YYYY-MM-DD' validated against the UTC calendar.
export function isoDay(value) {
  const cleaned = text(value, 10) ?? '';
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(cleaned);
  if (!match) return '';
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day ? cleaned : '';
}

// The window [from, to] is one token 'YYYY-MM-DD..YYYY-MM-DD'; a bare day is a
// one-day window; a reversed pair is reordered; anything invalid is no window.
export function dayWindow(value) {
  const cleaned = text(value, 21) ?? '';
  if (!cleaned) return '';
  const [first, second = first] = cleaned.split('..');
  const from = isoDay(first);
  const to = isoDay(second);
  if (!from || !to) return '';
  return from <= to ? `${from}..${to}` : `${to}..${from}`;
}

// Ordered, deduplicated lane ids; insertion order kept, capped at MAX_LANES.
export function laneList(value) {
  const values = (Array.isArray(value) ? value : String(value || '').split(','))
    .map(item => token(item, MAX_LANE_TOKEN))
    .filter(Boolean);
  return [...new Set(values)].slice(0, MAX_LANES);
}

function set(parametersValue, key, value) {
  parametersValue.set(key, value === null || value === undefined ? '' : String(value));
}

function setWhenNotDefault(parametersValue, key, value, fallback) {
  if (value === null || value === undefined || value === '' || value === fallback) return;
  parametersValue.set(key, String(value));
}

export function readApertureState(input = '') {
  const params = parameters(input);
  if (params.get('ap_v') !== APERTURE_STATE_VERSION) return null;
  const mode = enumValue(params.get('ap_mode'), MODES);
  if (!mode) return null;

  return {
    version: APERTURE_STATE_VERSION,
    mode,
    overview: {
      page: optionalInteger(params.get('ap_overview_page'), 1, 999999),
      pageSize: overviewPageSize(params.get('ap_overview_size'))
    },
    map: {
      scale: optionalNumber(params.get('ap_map_scale'), 1, 5.4),
      level: enumValue(params.get('ap_map_level'), MAP_LEVELS),
      clusterId: token(params.get('ap_map_cluster')),
      typeId: token(params.get('ap_map_type')),
      surfaceId: token(params.get('ap_map_surface')),
      actorId: token(params.get('ap_map_actor'))
    },
    route: {
      fromId: token(params.get('ap_route_from')),
      toId: token(params.get('ap_route_to')),
      asOf: text(params.get('ap_route_asof'), 10) ?? '',
      evidenceFloor: enumValue(params.get('ap_route_evidence'), EVIDENCE_FLOORS),
      selectedStep: optionalInteger(params.get('ap_route_step'), 0, 999999),
      windowStart: optionalInteger(params.get('ap_route_window'), 0, 999999),
      actorId: token(params.get('ap_route_actor'))
    },
    surface: {
      surfaceId: token(params.get('ap_surface_id')),
      query: text(params.get('ap_surface_query'), 120) ?? '',
      asOf: text(params.get('ap_surface_asof'), 10) ?? '',
      evidenceFloor: enumValue(params.get('ap_surface_evidence'), EVIDENCE_FLOORS),
      budget: optionalInteger(params.get('ap_surface_budget'), 6, 36),
      pins: pins(params.get('ap_surface_pins')),
      actorId: token(params.get('ap_surface_actor'))
    },
    timeline: {
      by: enumValue(params.get('ap_time_by'), TIME_BY, 'actor'),
      from: isoDay(params.get('ap_time_from')),
      to: isoDay(params.get('ap_time_to')),
      cursor: dayWindow(params.get('ap_time_cursor')),
      lanes: laneList(params.get('ap_time_lanes')),
      selectedKey: token(params.get('ap_time_sel'), MAX_ROW_KEY),
      evidenceFloor: enumValue(params.get('ap_time_evidence'), EVIDENCE_FLOORS, 'open'),
      hop: enumValue(params.get('ap_time_hop'), HOP_FILTERS, 'all')
    }
  };
}

export function writeApertureState(snapshot, input = '') {
  const params = parameters(input);
  for (const key of APERTURE_QUERY_KEYS) params.delete(key);

  const mode = enumValue(snapshot?.mode, MODES, 'timeline');
  const overview = snapshot?.overview ?? {};
  const map = snapshot?.map ?? {};
  const route = snapshot?.route ?? {};
  const surface = snapshot?.surface ?? {};
  const timeline = snapshot?.timeline ?? {};

  set(params, 'ap_v', APERTURE_STATE_VERSION);
  set(params, 'ap_mode', mode);
  set(params, 'ap_overview_page', Number.isInteger(overview.page) && overview.page >= 1 ? overview.page : 1);
  set(params, 'ap_overview_size', overviewPageSize(overview.pageSize, 50));
  set(params, 'ap_map_scale', Number.isFinite(Number(map.scale)) ? Math.max(1, Math.min(5.4, Number(map.scale))).toFixed(2).replace(/\.?0+$/, '') : '1');
  set(params, 'ap_map_level', enumValue(map.level, MAP_LEVELS, 'corpus'));
  set(params, 'ap_map_cluster', token(map.clusterId) ?? '');
  set(params, 'ap_map_type', token(map.typeId) ?? '');
  set(params, 'ap_map_surface', token(map.surfaceId) ?? '');
  set(params, 'ap_map_actor', token(map.actorId) ?? '');

  set(params, 'ap_route_from', token(route.fromId) ?? '');
  set(params, 'ap_route_to', token(route.toId) ?? '');
  set(params, 'ap_route_asof', text(route.asOf, 10) ?? '');
  set(params, 'ap_route_evidence', enumValue(route.evidenceFloor, EVIDENCE_FLOORS, 'open'));
  set(params, 'ap_route_step', Number.isInteger(route.selectedStep) && route.selectedStep >= 0 ? route.selectedStep : '');
  set(params, 'ap_route_window', Number.isInteger(route.windowStart) && route.windowStart >= 0 ? route.windowStart : 0);
  set(params, 'ap_route_actor', token(route.actorId) ?? '');

  set(params, 'ap_surface_id', token(surface.surfaceId) ?? '');
  set(params, 'ap_surface_query', text(surface.query, 120) ?? '');
  set(params, 'ap_surface_asof', text(surface.asOf, 10) ?? '');
  set(params, 'ap_surface_evidence', enumValue(surface.evidenceFloor, EVIDENCE_FLOORS, 'open'));
  set(params, 'ap_surface_budget', Number.isFinite(Number(surface.budget)) ? Math.max(6, Math.min(36, Math.trunc(Number(surface.budget)))) : 18);
  set(params, 'ap_surface_pins', pins(Array.isArray(surface.pins) ? surface.pins.join(',') : surface.pins).join(','));
  set(params, 'ap_surface_actor', token(surface.actorId) ?? '');

  setWhenNotDefault(params, 'ap_time_by', enumValue(timeline.by, TIME_BY, 'actor'), 'actor');
  setWhenNotDefault(params, 'ap_time_from', isoDay(timeline.from), '');
  setWhenNotDefault(params, 'ap_time_to', isoDay(timeline.to), '');
  setWhenNotDefault(params, 'ap_time_cursor', dayWindow(timeline.cursor), '');
  setWhenNotDefault(params, 'ap_time_lanes', laneList(timeline.lanes).join(','), '');
  setWhenNotDefault(params, 'ap_time_sel', token(timeline.selectedKey, MAX_ROW_KEY) ?? '', '');
  setWhenNotDefault(params, 'ap_time_evidence', enumValue(timeline.evidenceFloor, EVIDENCE_FLOORS, 'open'), 'open');
  setWhenNotDefault(params, 'ap_time_hop', enumValue(timeline.hop, HOP_FILTERS, 'all'), 'all');

  return params;
}

export function buildApertureUrl(snapshot, href) {
  const url = new URL(String(href));
  url.search = writeApertureState(snapshot, url.search).toString();
  return url.href;
}
