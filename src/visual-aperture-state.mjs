export const APERTURE_STATE_VERSION = '1';

export const APERTURE_QUERY_KEYS = Object.freeze([
  'ap_v', 'ap_mode',
  'ap_map_scale', 'ap_map_level', 'ap_map_cluster', 'ap_map_type', 'ap_map_surface', 'ap_map_actor',
  'ap_route_from', 'ap_route_to', 'ap_route_asof', 'ap_route_evidence', 'ap_route_step', 'ap_route_actor',
  'ap_surface_id', 'ap_surface_query', 'ap_surface_asof', 'ap_surface_evidence', 'ap_surface_budget', 'ap_surface_pins', 'ap_surface_actor'
]);

const MODES = new Set(['map', 'route', 'surface']);
const MAP_LEVELS = new Set(['corpus', 'machine', 'surface', 'evidence']);
const EVIDENCE_FLOORS = new Set(['open', 'reported', 'primary_public', 'official']);
const MAX_PINS = 36;

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

function pins(value) {
  const values = String(value || '')
    .split(',')
    .map(item => token(item))
    .filter(Boolean);
  return [...new Set(values)].slice(0, MAX_PINS).sort();
}

function set(parametersValue, key, value) {
  parametersValue.set(key, value === null || value === undefined ? '' : String(value));
}

export function readApertureState(input = '') {
  const params = parameters(input);
  if (params.get('ap_v') !== APERTURE_STATE_VERSION) return null;
  const mode = enumValue(params.get('ap_mode'), MODES);
  if (!mode) return null;

  return {
    version: APERTURE_STATE_VERSION,
    mode,
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
      selectedStep: optionalInteger(params.get('ap_route_step'), 0, 999),
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
    }
  };
}

export function writeApertureState(snapshot, input = '') {
  const params = parameters(input);
  for (const key of APERTURE_QUERY_KEYS) params.delete(key);

  const mode = enumValue(snapshot?.mode, MODES, 'map');
  const map = snapshot?.map ?? {};
  const route = snapshot?.route ?? {};
  const surface = snapshot?.surface ?? {};

  set(params, 'ap_v', APERTURE_STATE_VERSION);
  set(params, 'ap_mode', mode);
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
  set(params, 'ap_route_actor', token(route.actorId) ?? '');

  set(params, 'ap_surface_id', token(surface.surfaceId) ?? '');
  set(params, 'ap_surface_query', text(surface.query, 120) ?? '');
  set(params, 'ap_surface_asof', text(surface.asOf, 10) ?? '');
  set(params, 'ap_surface_evidence', enumValue(surface.evidenceFloor, EVIDENCE_FLOORS, 'open'));
  set(params, 'ap_surface_budget', Number.isFinite(Number(surface.budget)) ? Math.max(6, Math.min(36, Math.trunc(Number(surface.budget)))) : 18);
  set(params, 'ap_surface_pins', pins(Array.isArray(surface.pins) ? surface.pins.join(',') : surface.pins).join(','));
  set(params, 'ap_surface_actor', token(surface.actorId) ?? '');

  return params;
}

export function buildApertureUrl(snapshot, href) {
  const url = new URL(String(href));
  url.search = writeApertureState(snapshot, url.search).toString();
  return url.href;
}
