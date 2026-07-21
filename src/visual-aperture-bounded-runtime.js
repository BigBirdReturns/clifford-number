const boundedOriginalShellMarkup = shellMarkup;
const boundedOriginalSetStage = setStage;
const boundedOriginalRouteInspector = routeInspector;
const boundedOriginalHandleAction = handleAction;
const boundedOriginalHandleClick = handleClick;
const boundedOriginalHandleInput = handleInput;
const boundedOriginalHandleChange = handleChange;
const boundedOriginalCurrentMapExportView = currentMapExportView;
const boundedOriginalCurrentRouteExportView = currentRouteExportView;
const boundedOriginalCurrentSurfaceExportView = currentSurfaceExportView;

state.overview = state.overview ?? {
  page: 1,
  pageSize: APERTURE_DEFAULT_OVERVIEW_PAGE_SIZE,
  key: null,
  followSelected: false,
  preserveNextKey: false,
  pagination: null
};
state.route.windowStart = Number.isInteger(state.route.windowStart) ? state.route.windowStart : 0;
state.route.windowFollowSelected = state.route.windowFollowSelected !== false;
state.route.window = null;

shellMarkup = function boundedShellMarkup() {
  return boundedOriginalShellMarkup().replace(
    '<p id="aperture-overview-status"></p>',
    '<p id="aperture-overview-status"></p><div id="aperture-overview-pagination" class="aperture-overview-pagination" aria-label="Evidence overview pagination"></div>'
  );
};

setStage = function boundedSetStage(markup, options = {}) {
  boundedOriginalSetStage(markup, options);
  const stage = $('#aperture-stage', state.root);
  const width = Number(options.viewWidth) || 1200;
  stage?.setAttribute('viewBox', `0 0 ${Math.max(1200, width)} 720`);
};

function boundedRowList(rows) {
  if (Array.isArray(rows)) return rows.filter(Boolean);
  if (typeof rows !== 'string' || !rows.trim()) return [];
  return rows.match(/<tr\b[\s\S]*?<\/tr>/gi) ?? [];
}

function boundedOverviewPaginationMarkup(pagination) {
  const sizes = APERTURE_OVERVIEW_PAGE_SIZES.map(size => `<option value="${size}"${size === pagination.pageSize ? ' selected' : ''}>${size}</option>`).join('');
  return `<span class="aperture-overview-range">Rows ${pagination.rangeStart}–${pagination.rangeEnd} of ${pagination.totalRows}</span>
    <div class="aperture-overview-page-buttons">
      <button type="button" data-ap-action="overview-first"${pagination.hasPrevious ? '' : ' disabled'} aria-label="First overview page">«</button>
      <button type="button" data-ap-action="overview-previous"${pagination.hasPrevious ? '' : ' disabled'} aria-label="Previous overview page">‹</button>
      <span>Page ${pagination.page} of ${pagination.totalPages}</span>
      <button type="button" data-ap-action="overview-next"${pagination.hasNext ? '' : ' disabled'} aria-label="Next overview page">›</button>
      <button type="button" data-ap-action="overview-last"${pagination.hasNext ? '' : ' disabled'} aria-label="Last overview page">»</button>
    </div>
    <label><span>Rows</span><select id="ap-overview-size">${sizes}</select></label>`;
}

setOverview = function boundedSetOverview({
  title = 'Stable rows for the visible field.',
  status = '',
  headers = [],
  rows = [],
  pageKey = null,
  selectedIndex = null,
  followSelected = false
}) {
  const values = boundedRowList(rows);
  const key = pageKey || `${state.mode}:${title}`;
  if (state.overview.key !== key) {
    if (state.overview.key !== null && !state.overview.preserveNextKey) state.overview.page = 1;
    state.overview.key = key;
  }
  const pagination = paginateApertureRows(values, {
    page: state.overview.page,
    pageSize: state.overview.pageSize,
    selectedIndex,
    followSelected: followSelected || state.overview.followSelected
  });
  state.overview.page = pagination.page;
  state.overview.pageSize = pagination.pageSize;
  state.overview.pagination = pagination;
  state.overview.followSelected = false;
  state.overview.preserveNextKey = false;
  $('#aperture-overview-title', state.root).textContent = title;
  $('#aperture-overview-status', state.root).textContent = `${status}${status ? ' ' : ''}Showing ${pagination.rangeStart}–${pagination.rangeEnd} of ${pagination.totalRows}.`;
  $('#aperture-table-head', state.root).innerHTML = `<tr>${headers.map(header => `<th scope="col">${esc(header)}</th>`).join('')}</tr>`;
  $('#aperture-table-body', state.root).innerHTML = pagination.rows.join('') || `<tr><td colspan="${Math.max(1, headers.length)}">No rows are visible in the current scope.</td></tr>`;
  const controls = $('#aperture-overview-pagination', state.root);
  if (controls) controls.innerHTML = boundedOverviewPaginationMarkup(pagination);
};

renderMapOverview = function boundedRenderMapOverview(cluster, group, surface) {
  if (state.map.level === 'corpus') {
    const clusters = summarizeClusters(state.data.surfaceGraph);
    setOverview({
      title: 'Surface families in the whole corpus.',
      status: `${clusters.length} families. Corridor counts are cross-family actor recurrence, not actor adjacency.`,
      headers: ['Surface family', 'Bounded surfaces', 'Actors', 'Hop-eligible', 'Context-only'],
      pageKey: 'map:corpus',
      selectedIndex: clusters.findIndex(item => item.id === state.map.selectedClusterId),
      rows: clusters.map(item => `<tr class="${item.id === state.map.selectedClusterId ? 'is-selected' : ''}"><td><button type="button" class="aperture-table-link" data-ap-cluster="${esc(item.id)}">${esc(item.label)}</button></td><td>${item.surfaceCount}</td><td>${item.actorCount}</td><td>${item.hopEligible}</td><td>${item.contextOnly}</td></tr>`)
    });
    return;
  }
  if (state.map.level === 'machine') {
    const groups = surfaceTypeGroups(state.data.surfaceGraph, cluster.id);
    setOverview({
      title: `Surface types inside ${cluster.label}.`,
      status: `${groups.length} compiler types retain ${cluster.surfaceCount} separately bounded surfaces.`,
      headers: ['Surface type', 'Surfaces', 'Actors', 'Hop-eligible', 'Context-only'],
      pageKey: `map:machine:${cluster.id}`,
      selectedIndex: groups.findIndex(item => item.id === state.map.selectedTypeId),
      rows: groups.map(item => `<tr class="${item.id === state.map.selectedTypeId ? 'is-selected' : ''}"><td><button type="button" class="aperture-table-link" data-ap-type="${esc(item.id)}">${esc(item.label)}</button></td><td>${item.surfaceCount}</td><td>${item.actorCount}</td><td>${item.hopEligible}</td><td>${item.surfaceCount - item.hopEligible}</td></tr>`)
    });
    return;
  }
  const participants = sortedParticipants(surface);
  setOverview({
    title: `Participation rows on ${surface.surface_label}.`,
    status: `${participants.length} actor rows. Pagination bounds the DOM without deleting any row.`,
    headers: ['Actor', 'Recorded role', 'Dates', 'Evidence', 'Receipts'],
    pageKey: `map:${state.map.level}:${surface.surface_id}`,
    selectedIndex: participants.findIndex(item => item.actor_id === state.map.selectedActorId),
    rows: participants.map(participant => `<tr class="${participant.actor_id === state.map.selectedActorId ? 'is-selected' : ''}"><td><button type="button" class="aperture-table-link" data-ap-actor="${esc(participant.actor_id)}">${esc(actorLabel(participant.actor_id))}</button><small>${esc(participant.actor_id)}</small></td><td>${esc(participant.role || humanLabel(participant.participation_type))}<small>${esc(humanLabel(participant.participation_type))}</small></td><td>${esc(windowLabel(participant.time_start, participant.time_end))}</td><td>${evidenceBadge(participant.evidence_class)}</td><td>${(participant.receipt_ids ?? []).length}</td></tr>`)
  });
};

function boundedRouteWindowControls(window) {
  if (!window || window.totalSteps <= window.maxSteps) return '';
  return `<div class="aperture-route-window-controls"><button type="button" data-ap-action="route-window-previous"${window.hasPrevious ? '' : ' disabled'}>Previous route window</button><span>Steps ${window.rangeStart}–${window.rangeEnd} of ${window.totalSteps}</span><button type="button" data-ap-action="route-window-next"${window.hasNext ? '' : ' disabled'}>Next route window</button></div>`;
}

routeInspector = function boundedRouteInspector(path, diagnostics, validDate) {
  return `${boundedOriginalRouteInspector(path, diagnostics, validDate)}${path ? boundedRouteWindowControls(state.route.window) : ''}`;
};

renderRouteScene = function boundedRenderRouteScene(path, from, to) {
  if (!path) {
    return { minWidth: 980, viewWidth: 1200, window: null, markup: `<g class="aperture-scene aperture-scene--route"><line class="aperture-route-blocked" x1="260" y1="280" x2="940" y2="280"/><g class="aperture-route-actor" data-ap-route-actor="${esc(from)}" tabindex="0" role="button"><circle cx="220" cy="280" r="28"/><text class="aperture-node-label" x="220" y="230" text-anchor="middle">${esc(shortLabel(actorLabel(from), 28))}</text></g><g class="aperture-route-actor" data-ap-route-actor="${esc(to)}" tabindex="0" role="button"><circle cx="980" cy="280" r="28"/><text class="aperture-node-label" x="980" y="230" text-anchor="middle">${esc(shortLabel(actorLabel(to), 28))}</text></g><text class="aperture-blocked-title" x="600" y="262" text-anchor="middle">No traversable route under these controls</text><text class="aperture-blocked-copy" x="600" y="315" text-anchor="middle">This is a scoped corpus result, not proof that no relationship exists.</text></g>` };
  }
  const window = windowApertureRoute(path, {
    start: state.route.windowStart,
    selectedStep: state.route.selectedStep,
    followSelected: state.route.windowFollowSelected
  });
  state.route.windowStart = window.start;
  state.route.window = window;
  const items = [];
  window.hops.forEach((hop, index) => {
    if (index === 0) items.push({ kind: 'actor', id: hop.from, label: actorLabel(hop.from) });
    items.push({ kind: 'surface', hop, basis: hop.basis, label: hop.basis.surface_label, step: hop.originalIndex });
    items.push({ kind: 'actor', id: hop.to, label: actorLabel(hop.to) });
  });
  if (!items.length) items.push({ kind: 'actor', id: from, label: actorLabel(from) });
  const spacing = 150;
  const width = Math.max(1200, 180 + Math.max(0, items.length - 1) * spacing);
  const points = items.map((item, index) => ({ ...item, x: items.length === 1 ? width / 2 : 90 + index * spacing, y: 225 }));
  const pathData = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const nodes = points.map(point => {
    if (point.kind === 'actor') return `<g class="aperture-route-actor aperture-interactive${point.id === state.route.selectedActorId ? ' is-selected' : ''}" data-ap-route-actor="${esc(point.id)}" transform="translate(${point.x} ${point.y})" tabindex="0" role="button" aria-label="${esc(actorLabel(point.id))}"><circle r="24"/><text class="aperture-node-label" y="-39" text-anchor="middle">${esc(shortLabel(point.label, 18))}</text><text class="aperture-node-meta" y="49" text-anchor="middle">actor</text></g>`;
    const basis = point.basis;
    const selected = point.step === state.route.selectedStep;
    const warning = evidenceRank(basis.evidence_class) >= evidenceRank('reported');
    return `<g class="aperture-route-step aperture-interactive${selected ? ' is-selected' : ''}" data-ap-route-step="${point.step}" transform="translate(${point.x} ${point.y})" tabindex="0" role="button" aria-label="${esc(`Step ${point.step + 1}, ${basis.surface_label}`)}"><rect class="aperture-route-diamond${warning ? ' is-warning' : ''}" x="-18" y="-18" width="36" height="36" rx="3" transform="rotate(45)"/><text class="aperture-node-meta" y="-39" text-anchor="middle">step ${point.step + 1}</text><rect class="aperture-route-card" x="-66" y="68" width="132" height="142" rx="10"/><text class="aperture-route-card-title" y="94" text-anchor="middle">${esc(shortLabel(basis.surface_label, 18))}</text><text class="aperture-route-card-copy" y="119" text-anchor="middle">${esc(evidenceLabel(basis.evidence_class))}</text><text class="aperture-route-card-copy" y="142" text-anchor="middle">${esc(shortLabel(windowLabel(basis.valid_from, basis.valid_until, basis.temporal_status), 19))}</text><text class="aperture-route-card-copy" y="165" text-anchor="middle">${basis.receipt_ids?.length ?? 0} receipt${basis.receipt_ids?.length === 1 ? '' : 's'}</text><text class="aperture-route-card-copy" y="190" text-anchor="middle">select for roles</text></g>`;
  }).join('');
  return { minWidth: Math.max(980, width * .72), viewWidth: width, window, markup: `<g class="aperture-scene aperture-scene--route"><path class="aperture-route-line" d="${pathData}"/>${nodes}</g>` };
};

renderRouteOverview = function boundedRenderRouteOverview(path, validDate) {
  if (!validDate || !path?.hops?.length) {
    setOverview({ title: 'Route evidence overview.', status: validDate ? 'No route rows survive the current controls.' : 'Correct the date before recomputing.', headers: ['Step', 'Bounded surface', 'Roles', 'Validity window', 'Evidence', 'Receipts'], pageKey: `route:empty:${validDate}` });
    return;
  }
  setOverview({
    title: `${path.number} documented route step${path.number === 1 ? '' : 's'}.`,
    status: `Every step remains available. The map currently renders steps ${state.route.window?.rangeStart ?? 0}–${state.route.window?.rangeEnd ?? 0}.`,
    headers: ['Step', 'Bounded surface', 'Roles', 'Validity window', 'Evidence', 'Receipts'],
    pageKey: `route:${state.route.fromId}:${state.route.toId}:${state.route.asOf}:${state.route.evidenceFloor}`,
    selectedIndex: state.route.selectedStep,
    rows: path.hops.map((hop, index) => {
      const basis = hop.basis;
      return `<tr class="${index === state.route.selectedStep ? 'is-selected' : ''}"><td><button type="button" class="aperture-table-link" data-ap-route-step="${index}">${index + 1}</button><small>${esc(actorLabel(hop.from))} → ${esc(actorLabel(hop.to))}</small></td><td><strong>${esc(basis.surface_label)}</strong><small>${esc(humanLabel(basis.surface_type))}</small></td><td>${esc(actorLabel(hop.from))}: ${esc(roleFor(basis, hop.edge, hop.from) || 'Recorded participant')}<br>${esc(actorLabel(hop.to))}: ${esc(roleFor(basis, hop.edge, hop.to) || 'Recorded participant')}</td><td>${esc(windowLabel(basis.valid_from, basis.valid_until, basis.temporal_status))}</td><td>${evidenceBadge(basis.evidence_class)}</td><td>${basis.receipt_ids?.length ?? 0}</td></tr>`;
    })
  });
};

renderRouteMode = function boundedRenderRouteMode() {
  const validDate = !state.route.asOf || Boolean(periodBounds(state.route.asOf));
  const filters = { evidenceFloor: state.route.evidenceFloor, asOf: validDate ? state.route.asOf : '' };
  const path = validDate ? shortestFilteredPath(state.data.hopGraph, state.route.fromId, state.route.toId, filters) : null;
  const diagnostics = diagnosePathFilters(state.data.hopGraph, filters);
  state.route.path = path;
  if (path?.hops?.length) {
    if (!Number.isInteger(state.route.selectedStep) || state.route.selectedStep < 0 || state.route.selectedStep >= path.hops.length) {
      state.route.selectedStep = Math.min(Math.max(0, state.route.windowStart), path.hops.length - 1);
      state.route.windowFollowSelected = false;
    }
    if (state.route.selectedActorId && !path.actorPath.includes(state.route.selectedActorId)) state.route.selectedActorId = null;
  } else {
    state.route.selectedStep = null;
    state.route.selectedActorId = null;
    state.route.windowStart = 0;
    state.route.window = null;
  }
  const scene = renderRouteScene(path, state.route.fromId, state.route.toId);
  setStage(scene.markup, { title: `Route · ${actorLabel(state.route.fromId)} to ${actorLabel(state.route.toId)}`, description: path ? 'A filtered route where every actor-to-actor step is mediated by a bounded surface. The complete path remains available while the map renders one bounded step window.' : 'A blocked route under the selected evidence and temporal controls.', minWidth: scene.minWidth, viewWidth: scene.viewWidth });
  setTelemetry(['Route', actorLabel(state.route.fromId), actorLabel(state.route.toId)], [
    { value: validDate ? path?.number ?? '×' : '!', label: path ? `step${path.number === 1 ? '' : 's'}` : validDate ? 'blocked' : 'invalid date' },
    { value: path ? `${scene.window?.rangeStart ?? 0}–${scene.window?.rangeEnd ?? 0}` : '—', label: 'visible window' },
    { value: evidenceLabel(state.route.evidenceFloor), label: 'evidence floor' },
    { value: state.route.asOf || 'all time', label: 'temporal scope' }
  ]);
  setInspector(path ? `Route · ${path.number} step${path.number === 1 ? '' : 's'}` : 'Blocked route', routeInspector(path, diagnostics, validDate));
  renderRouteOverview(path, validDate);
};

renderSurfaceOverview = function boundedRenderSurfaceOverview(surface, selection, validDate) {
  if (!validDate || !selection.visible.length) {
    setOverview({ title: `Visible brackets on ${surface.surface_label}.`, status: validDate ? 'No participant survives the current query, evidence floor, date, and bracket budget.' : 'Correct the date filter to restore the roster.', headers: ['Pin', 'Actor', 'Recorded role', 'Dates', 'Evidence', 'Receipts'], pageKey: `surface:empty:${surface.surface_id}` });
    return;
  }
  setOverview({
    title: `Visible brackets on ${surface.surface_label}.`,
    status: `${selection.visible.length} stable rows. ${selection.hiddenByBudget} eligible actors are held by the bracket budget; ${selection.filteredOut + selection.temporalOrEvidenceFiltered} are outside the current filter.`,
    headers: ['Pin', 'Actor', 'Recorded role', 'Dates', 'Evidence', 'Receipts'],
    pageKey: `surface:${surface.surface_id}:${state.surface.query}:${state.surface.asOf}:${state.surface.evidenceFloor}:${state.surface.budget}`,
    selectedIndex: selection.visible.findIndex(item => item.actor_id === state.surface.selectedActorId),
    rows: selection.visible.map(participant => {
      const pinned = state.surface.pinned.has(participant.actor_id);
      return `<tr class="${participant.actor_id === state.surface.selectedActorId ? 'is-selected' : ''}${pinned ? ' is-pinned' : ''}"><td><button type="button" class="aperture-pin-button" data-ap-action="toggle-pin" data-actor-id="${esc(participant.actor_id)}" aria-pressed="${String(pinned)}">${pinned ? 'Unpin' : 'Pin'}</button></td><td><button type="button" class="aperture-table-link" data-ap-surface-actor="${esc(participant.actor_id)}">${esc(actorLabel(participant.actor_id))}</button><small>${esc(participant.actor_id)}</small></td><td>${esc(participant.role || humanLabel(participant.participation_type))}<small>${esc(humanLabel(participant.participation_type))}</small></td><td>${esc(windowLabel(participant.time_start, participant.time_end))}</td><td>${evidenceBadge(participant.evidence_class)}</td><td>${participant.receipt_ids?.length ?? 0}</td></tr>`;
    })
  });
};

function boundedOverviewDisplay() {
  const pagination = state.overview.pagination;
  return pagination ? {
    total_rows: pagination.totalRows,
    visible_from: pagination.rangeStart,
    visible_until: pagination.rangeEnd,
    page: pagination.page,
    page_size: pagination.pageSize,
    total_pages: pagination.totalPages,
    rendering: 'paginated_complete_rows_reachable'
  } : null;
}

currentMapExportView = function boundedCurrentMapExportView() {
  return { ...boundedOriginalCurrentMapExportView(), display: boundedOverviewDisplay() };
};

currentRouteExportView = function boundedCurrentRouteExportView() {
  const view = boundedOriginalCurrentRouteExportView();
  const window = state.route.path ? windowApertureRoute(state.route.path, { start: state.route.windowStart, selectedStep: state.route.selectedStep, followSelected: state.route.windowFollowSelected }) : null;
  return {
    ...view,
    display: boundedOverviewDisplay(),
    route_window: window ? {
      visible_step_from: window.rangeStart,
      visible_step_until: window.rangeEnd,
      total_steps: window.totalSteps,
      max_visible_steps: window.maxSteps,
      complete_path_retained: true
    } : null
  };
};

currentSurfaceExportView = function boundedCurrentSurfaceExportView() {
  return { ...boundedOriginalCurrentSurfaceExportView(), display: boundedOverviewDisplay() };
};

function boundedResetOverview() {
  state.overview.page = 1;
  state.overview.followSelected = false;
}

handleAction = function boundedHandleAction(button) {
  const action = button.dataset.apAction;
  const pagination = state.overview.pagination;
  if (action?.startsWith('overview-') && pagination) {
    if (action === 'overview-first') state.overview.page = 1;
    if (action === 'overview-previous') state.overview.page = Math.max(1, pagination.page - 1);
    if (action === 'overview-next') state.overview.page = Math.min(pagination.totalPages, pagination.page + 1);
    if (action === 'overview-last') state.overview.page = pagination.totalPages;
    state.overview.followSelected = false;
    renderCurrent();
    commitApertureAddress('push');
    return;
  }
  if (action === 'route-window-previous' || action === 'route-window-next') {
    const path = state.route.path;
    if (!path?.hops?.length) return;
    const current = windowApertureRoute(path, { start: state.route.windowStart, selectedStep: state.route.selectedStep, followSelected: false });
    const direction = action === 'route-window-next' ? 1 : -1;
    const requested = current.start + direction * current.maxSteps;
    const next = windowApertureRoute(path, { start: requested, followSelected: false });
    state.route.windowStart = next.start;
    state.route.selectedStep = next.start;
    state.route.windowFollowSelected = false;
    state.overview.followSelected = true;
    renderRouteMode();
    commitApertureAddress('push');
    return;
  }
  if (['route-swap', 'route-reset'].includes(action)) {
    state.route.windowStart = 0;
    state.route.windowFollowSelected = true;
    boundedResetOverview();
  }
  if (['reset-map', 'surface-clear-pins'].includes(action)) boundedResetOverview();
  boundedOriginalHandleAction(button);
};

handleClick = function boundedHandleClick(event) {
  const target = event.target instanceof Element ? event.target : event.target?.parentElement;
  if (target?.closest('[data-ap-route-step]')) {
    state.route.windowFollowSelected = true;
    state.overview.followSelected = true;
  } else if (target?.closest('[data-ap-actor], [data-ap-surface-actor]')) {
    state.overview.followSelected = true;
  }
  boundedOriginalHandleClick(event);
};

handleInput = function boundedHandleInput(event) {
  if (event.target?.id === 'ap-surface-query') boundedResetOverview();
  boundedOriginalHandleInput(event);
};

handleChange = function boundedHandleChange(event) {
  const target = event.target;
  if (target?.id === 'ap-overview-size') {
    state.overview.pageSize = Number(target.value);
    state.overview.page = 1;
    state.overview.followSelected = false;
    renderCurrent();
    commitApertureAddress('push');
    return;
  }
  if (['ap-route-from', 'ap-route-to', 'ap-route-asof', 'ap-route-evidence'].includes(target?.id)) {
    state.route.windowStart = 0;
    state.route.windowFollowSelected = true;
    boundedResetOverview();
  }
  if (['ap-map-cluster', 'ap-map-surface', 'ap-surface-select', 'ap-surface-asof', 'ap-surface-evidence'].includes(target?.id)) boundedResetOverview();
  boundedOriginalHandleChange(event);
};
