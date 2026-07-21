export const APERTURE_EXPORT_SCHEMA_VERSION = 'clifford-aperture-export@1';

export const APERTURE_EXPORT_BOUNDARY = 'Visual prominence is not an allegation. A corridor is not a hop. A hop is not coordination. Shared documented context does not establish contact, influence, intent, wrongdoing, or causation.';

export const APERTURE_EXPORT_SOURCE_ARTIFACTS = Object.freeze([
  'build/surface-graph.json',
  'build/hop-graph.json',
  'build/receipt-graph.json'
]);

const MODES = new Set(['map', 'route', 'surface']);
const LEVELS = new Set(['corpus', 'machine', 'surface', 'evidence']);

function clean(value, maximum = 500) {
  return String(value ?? '').replace(/\s+/g, ' ').trim().slice(0, maximum);
}

function nullable(value, maximum = 500) {
  const result = clean(value, maximum);
  return result || null;
}

function bool(value) {
  return value === true;
}

function integer(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? Math.max(0, Math.trunc(number)) : fallback;
}

function number(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function strings(values, maximum = 500) {
  return [...new Set((Array.isArray(values) ? values : []).map(value => clean(value, maximum)).filter(Boolean))].sort();
}

function generatedAt(value) {
  const parsed = Date.parse(String(value ?? ''));
  if (!Number.isFinite(parsed)) throw new Error('generatedAt must be an ISO-compatible timestamp');
  return new Date(parsed).toISOString();
}

function exactUrl(value) {
  const url = new URL(String(value));
  if (!['http:', 'https:', 'file:'].includes(url.protocol)) throw new Error('exactViewUrl must use http, https, or file');
  return url.href;
}

function actor(value) {
  return {
    actor_id: clean(value?.actor_id, 200),
    actor_label: clean(value?.actor_label || value?.actor_id, 300)
  };
}

function surfaceMetadata(value) {
  if (!value) return null;
  return {
    surface_id: clean(value.surface_id, 200),
    surface_label: clean(value.surface_label || value.surface_id, 500),
    surface_type: clean(value.surface_type || 'other_surface', 200),
    hop_eligible: bool(value.hop_eligible),
    time_start: nullable(value.time_start, 20),
    time_end: nullable(value.time_end, 20),
    receipt_ids: strings(value.receipt_ids, 200)
  };
}

function participant(value) {
  return {
    actor_id: clean(value?.actor_id, 200),
    actor_label: clean(value?.actor_label || value?.actor_id, 300),
    role: clean(value?.role || value?.participation_type || 'Recorded participant', 500),
    participation_type: clean(value?.participation_type || 'recorded_participant', 200),
    time_start: nullable(value?.time_start, 20),
    time_end: nullable(value?.time_end, 20),
    evidence_class: clean(value?.evidence_class || 'open', 80),
    receipt_ids: strings(value?.receipt_ids, 200),
    pinned: bool(value?.pinned)
  };
}

function routeHop(value, index) {
  return {
    step: index + 1,
    from: actor(value?.from),
    to: actor(value?.to),
    surface: {
      surface_id: clean(value?.surface?.surface_id, 200),
      surface_label: clean(value?.surface?.surface_label || value?.surface?.surface_id, 500),
      surface_type: clean(value?.surface?.surface_type || 'other_surface', 200),
      from_role: clean(value?.surface?.from_role || 'Recorded participant', 500),
      to_role: clean(value?.surface?.to_role || 'Recorded participant', 500),
      evidence_class: clean(value?.surface?.evidence_class || 'open', 80),
      valid_from: nullable(value?.surface?.valid_from, 20),
      valid_until: nullable(value?.surface?.valid_until, 20),
      temporal_status: clean(value?.surface?.temporal_status || 'undated', 80),
      receipt_ids: strings(value?.surface?.receipt_ids, 200)
    }
  };
}

function displayMetadata(value, fallbackTotal = 0) {
  if (!value) return null;
  const totalRows = integer(value.total_rows, fallbackTotal);
  const visibleFrom = totalRows ? Math.max(1, integer(value.visible_from, 1)) : 0;
  const visibleUntil = totalRows ? Math.max(visibleFrom, Math.min(totalRows, integer(value.visible_until, totalRows))) : 0;
  const pageSize = Math.max(1, integer(value.page_size, totalRows || 1));
  const totalPages = Math.max(1, integer(value.total_pages, Math.ceil(totalRows / pageSize) || 1));
  const page = Math.max(1, Math.min(totalPages, integer(value.page, 1)));
  return {
    total_rows: totalRows,
    visible_from: visibleFrom,
    visible_until: visibleUntil,
    page,
    page_size: pageSize,
    total_pages: totalPages,
    rendering: clean(value.rendering || 'bounded_view_complete_rows_retained', 100)
  };
}

function routeWindowMetadata(value, totalSteps) {
  if (!value) return null;
  const total = integer(value.total_steps, totalSteps);
  const from = total ? Math.max(1, integer(value.visible_step_from, 1)) : 0;
  const until = total ? Math.max(from, Math.min(total, integer(value.visible_step_until, total))) : 0;
  return {
    visible_step_from: from,
    visible_step_until: until,
    total_steps: total,
    max_visible_steps: Math.max(1, integer(value.max_visible_steps, 24)),
    complete_path_retained: value.complete_path_retained !== false
  };
}

function interpretationContract() {
  return {
    graph_effect: 'none',
    export_is_view_description_not_finding: true,
    exact_view_url_required: true,
    bounded_rendering_is_not_data_deletion: true,
    caveat: APERTURE_EXPORT_BOUNDARY
  };
}

function routeScopeText(route) {
  const parts = [];
  if (route.as_of) parts.push(`active during ${route.as_of}`);
  parts.push(`${route.evidence_floor.replaceAll('_', ' ')} evidence floor`);
  return parts.join(', ');
}

function displaySentence(display) {
  if (!display || !display.total_rows) return '';
  if (display.visible_from === 1 && display.visible_until === display.total_rows) return ` All ${display.total_rows} evidence rows are visible.`;
  return ` The browser shows rows ${display.visible_from}–${display.visible_until} of ${display.total_rows}; the export retains every row.`;
}

function routeWindowSentence(window) {
  if (!window || !window.total_steps) return '';
  if (window.visible_step_from === 1 && window.visible_step_until === window.total_steps) return ` All ${window.total_steps} route steps are visible.`;
  return ` The browser shows route steps ${window.visible_step_from}–${window.visible_step_until} of ${window.total_steps}; the complete path is retained in this packet.`;
}

function mapCaption(view) {
  if (view.level === 'corpus') {
    return `This exact Clifford Number view shows ${view.families.length} surface families containing ${view.surface_count} bounded surfaces. Aggregate corridors count actors documented across more than one family; they are not Clifford hops.${displaySentence(view.display)}`;
  }
  if (view.level === 'machine') {
    return `This exact Clifford Number view decomposes ${view.selected_family?.label || 'the selected family'} into ${view.surface_types.length} compiler surface types while keeping every bounded surface separately inspectable.${displaySentence(view.display)}`;
  }
  return `This exact Clifford Number view contains ${view.participants.length} documented actor participation rows on ${view.surface?.surface_label || 'the selected bounded surface'}. The surface is ${view.surface?.hop_eligible ? 'hop-eligible only when every compiler rule passes' : 'context-only and creates no actor-to-actor hop'}.${displaySentence(view.display)}`;
}

function routeCaption(view) {
  const scope = routeScopeText(view);
  if (view.temporal_input_valid === false) {
    return `No route was computed from ${view.from.actor_label} to ${view.to.actor_label}: the temporal control "${view.as_of}" is not a year, month, or ISO day, so this view is refused rather than reported. It states nothing about whether a documented route exists.`;
  }
  if (!view.path) {
    return `No actor-to-actor route from ${view.from.actor_label} to ${view.to.actor_label} survives the current compiled corpus under ${scope}. This scoped result is not proof that no relationship exists.${displaySentence(view.display)}`;
  }
  const hops = view.path.hops;
  const shown = hops.length <= 12 ? hops : [...hops.slice(0, 6), ...hops.slice(-6)];
  const steps = shown.map(hop => `${hop.from.actor_label} → ${hop.surface.surface_label} → ${hop.to.actor_label}`).join('; ');
  const omission = hops.length > shown.length ? ` A middle sequence of ${hops.length - shown.length} steps is omitted from this caption but retained in the packet.` : '';
  return `In the current compiled Clifford Number corpus, ${view.from.actor_label} connects to ${view.to.actor_label} in ${view.path.number} documented step${view.path.number === 1 ? '' : 's'} under ${scope}: ${steps}.${omission} Every step remains mediated by its named bounded surface.${routeWindowSentence(view.route_window)}${displaySentence(view.display)}`;
}

function surfaceCaption(view) {
  return `This exact Clifford Number surface view shows ${view.visible_participants.length} of ${view.total_actors} documented actors on ${view.surface.surface_label}; ${view.hidden_by_budget} eligible actors are held by the bracket budget and ${view.filtered_out} are outside the current filters. The bounded container creates no participant-to-participant adjacency.${displaySentence(view.display)}`;
}

function appendBoundary(caption, url) {
  return `${caption} ${APERTURE_EXPORT_BOUNDARY} Exact view: ${url}`;
}

function mapView(input) {
  const level = LEVELS.has(input?.level) ? input.level : 'corpus';
  const families = (Array.isArray(input?.families) ? input.families : []).map(item => ({
    id: clean(item?.id, 200),
    label: clean(item?.label || item?.id, 300),
    surface_count: integer(item?.surface_count),
    actor_count: integer(item?.actor_count),
    hop_eligible: integer(item?.hop_eligible),
    context_only: integer(item?.context_only)
  }));
  const surfaceTypes = (Array.isArray(input?.surface_types) ? input.surface_types : []).map(item => ({
    id: clean(item?.id, 200),
    label: clean(item?.label || item?.id, 300),
    surface_count: integer(item?.surface_count),
    actor_count: integer(item?.actor_count),
    hop_eligible: integer(item?.hop_eligible),
    context_only: integer(item?.context_only)
  }));
  const corridors = (Array.isArray(input?.corridors) ? input.corridors : []).map(item => ({
    from_family_id: clean(item?.from_family_id, 200),
    to_family_id: clean(item?.to_family_id, 200),
    shared_actor_count: integer(item?.shared_actor_count),
    graph_effect: 'none'
  }));
  const participants = (Array.isArray(input?.participants) ? input.participants : []).map(participant);
  const selectedFamily = input?.selected_family ? {
    id: clean(input.selected_family.id, 200),
    label: clean(input.selected_family.label || input.selected_family.id, 300)
  } : null;
  const selectedType = input?.selected_type ? {
    id: clean(input.selected_type.id, 200),
    label: clean(input.selected_type.label || input.selected_type.id, 300)
  } : null;
  const surface = surfaceMetadata(input?.surface);
  const table = level === 'corpus'
    ? {
      columns: ['Surface family', 'Bounded surfaces', 'Actors', 'Hop-eligible', 'Context-only'],
      rows: families.map(item => [item.label, item.surface_count, item.actor_count, item.hop_eligible, item.context_only])
    }
    : level === 'machine'
      ? {
        columns: ['Surface type', 'Bounded surfaces', 'Actors', 'Hop-eligible', 'Context-only'],
        rows: surfaceTypes.map(item => [item.label, item.surface_count, item.actor_count, item.hop_eligible, item.context_only])
      }
      : {
        columns: ['Actor', 'Recorded role', 'Dates', 'Evidence', 'Receipt IDs'],
        rows: participants.map(item => [
          item.actor_label,
          item.role,
          `${item.time_start || '…'} → ${item.time_end || 'ongoing'}`,
          item.evidence_class,
          item.receipt_ids.join(', ')
        ])
      };
  return {
    level,
    scale: number(input?.scale, 1),
    surface_count: integer(input?.surface_count),
    selected_family: selectedFamily,
    selected_type: selectedType,
    surface,
    families,
    surface_types: surfaceTypes,
    corridors,
    participants,
    display: displayMetadata(input?.display, table.rows.length),
    table
  };
}

function routeView(input) {
  const from = actor(input?.from);
  const to = actor(input?.to);
  const temporalInputValid = input?.temporal_input_valid !== false;
  const hops = (Array.isArray(input?.path?.hops) ? input.path.hops : []).map(routeHop);
  const path = input?.path && temporalInputValid ? { number: hops.length, hops } : null;
  const diagnostics = !temporalInputValid ? null : {
    total_edges: integer(input?.diagnostics?.total_edges),
    traversable_edges: integer(input?.diagnostics?.traversable_edges),
    evidence_blocked_bases: integer(input?.diagnostics?.evidence_blocked_bases),
    time_blocked_bases: integer(input?.diagnostics?.time_blocked_bases),
    undated_blocked_bases: integer(input?.diagnostics?.undated_blocked_bases)
  };
  const table = {
    columns: ['Step', 'From', 'Bounded surface', 'To', 'Roles', 'Validity window', 'Evidence', 'Receipt IDs'],
    rows: path?.hops.map(hop => [
      hop.step,
      hop.from.actor_label,
      hop.surface.surface_label,
      hop.to.actor_label,
      `${hop.from.actor_label}: ${hop.surface.from_role}; ${hop.to.actor_label}: ${hop.surface.to_role}`,
      `${hop.surface.valid_from || '…'} → ${hop.surface.valid_until || 'ongoing'} (${hop.surface.temporal_status})`,
      hop.surface.evidence_class,
      hop.surface.receipt_ids.join(', ')
    ]) ?? []
  };
  return {
    from,
    to,
    as_of: nullable(input?.as_of, 20),
    temporal_input_valid: temporalInputValid,
    evidence_floor: clean(input?.evidence_floor || 'open', 80),
    path,
    diagnostics,
    display: displayMetadata(input?.display, table.rows.length),
    route_window: routeWindowMetadata(input?.route_window, path?.number ?? 0),
    table
  };
}

function surfaceView(input) {
  const surface = surfaceMetadata(input?.surface);
  if (!surface) throw new Error('surface export requires a bounded surface');
  const participants = (Array.isArray(input?.visible_participants) ? input.visible_participants : []).map(participant);
  const table = {
    columns: ['Pinned', 'Actor', 'Recorded role', 'Dates', 'Evidence', 'Receipt IDs'],
    rows: participants.map(item => [
      item.pinned ? 'yes' : 'no',
      item.actor_label,
      item.role,
      `${item.time_start || '…'} → ${item.time_end || 'ongoing'}`,
      item.evidence_class,
      item.receipt_ids.join(', ')
    ])
  };
  return {
    surface,
    filters: {
      query: clean(input?.query, 120),
      as_of: nullable(input?.as_of, 20),
      evidence_floor: clean(input?.evidence_floor || 'open', 80),
      bracket_budget: integer(input?.bracket_budget, 18)
    },
    total_actors: integer(input?.total_actors),
    visible_participants: participants,
    hidden_by_budget: integer(input?.hidden_by_budget),
    filtered_out: integer(input?.filtered_out),
    pinned_actor_ids: strings(input?.pinned_actor_ids, 200),
    display: displayMetadata(input?.display, table.rows.length),
    table
  };
}

export function buildApertureExportPacket(input) {
  const mode = clean(input?.mode, 20);
  if (!MODES.has(mode)) throw new Error('mode must be map, route, or surface');
  const url = exactUrl(input?.exactViewUrl);
  const view = mode === 'map'
    ? mapView(input?.view)
    : mode === 'route'
      ? routeView(input?.view)
      : surfaceView(input?.view);
  const baseCaption = mode === 'map' ? mapCaption(view) : mode === 'route' ? routeCaption(view) : surfaceCaption(view);
  const receiptIds = mode === 'map'
    ? strings([...(view.surface?.receipt_ids ?? []), ...view.participants.flatMap(item => item.receipt_ids)], 200)
    : mode === 'route'
      ? strings(view.path?.hops.flatMap(hop => hop.surface.receipt_ids) ?? [], 200)
      : strings([...(view.surface.receipt_ids ?? []), ...view.visible_participants.flatMap(item => item.receipt_ids)], 200);
  const title = mode === 'map'
    ? `Clifford Number map · ${view.level}`
    : mode === 'route'
      ? `Clifford Number route · ${view.from.actor_label} → ${view.to.actor_label}`
      : `Clifford Number surface · ${view.surface.surface_label}`;
  return {
    schema_version: APERTURE_EXPORT_SCHEMA_VERSION,
    generated_at: generatedAt(input?.generatedAt),
    mode,
    title,
    caption: appendBoundary(baseCaption, url),
    exact_view_url: url,
    source_artifacts: [...APERTURE_EXPORT_SOURCE_ARTIFACTS],
    receipt_ids: receiptIds,
    interpretation_contract: interpretationContract(),
    view
  };
}

export function apertureExportFilename(packet) {
  const mode = clean(packet?.mode, 20) || 'view';
  const subject = mode === 'route'
    ? `${packet?.view?.from?.actor_label || 'from'}-to-${packet?.view?.to?.actor_label || 'to'}`
    : mode === 'surface'
      ? packet?.view?.surface?.surface_label || 'surface'
      : packet?.view?.level || 'map';
  const slug = clean(subject, 120).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'view';
  return `clifford-${mode}-${slug}.json`;
}
