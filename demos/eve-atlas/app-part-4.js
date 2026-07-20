function routeActorIds() {
  const ids = new Set();
  for (const edge of state.data.hopGraph.edges ?? []) {
    ids.add(edge.actor_a);
    ids.add(edge.actor_b);
  }
  return [...ids].sort((a, b) => actorLabel(a).localeCompare(actorLabel(b)));
}

function populateRouteControls() {
  const ids = routeActorIds();
  const options = ids.map(id => `<option value="${esc(id)}">${esc(actorLabel(id))}</option>`).join('');
  $('#route-from').innerHTML = options;
  $('#route-to').innerHTML = options;
  const anchor = state.data.hopGraph.anchor_actor_id;
  const preferredFrom = ids.includes('ben-warner') ? 'ben-warner' : ids.find(id => id !== anchor) ?? ids[0];
  state.route.from = ids.includes(state.route.from) ? state.route.from : preferredFrom;
  state.route.to = ids.includes(state.route.to) ? state.route.to : (ids.includes(anchor) ? anchor : ids.at(-1));
  $('#route-from').value = state.route.from ?? '';
  $('#route-to').value = state.route.to ?? '';
}

function roleFor(basis, edge, actorId) {
  return actorId === edge.actor_a ? basis.actor_a_role : basis.actor_b_role;
}

function routeSvg(path, from, to) {
  if (!path) {
    $('#route-svg').setAttribute('viewBox', '0 0 1200 560');
    $('#route-svg').style.minWidth = '980px';
    return `<g>
      <line class="blocked-line" x1="250" y1="250" x2="950" y2="250"/>
      <circle class="route-actor" cx="220" cy="250" r="28"/>
      <circle class="route-actor" cx="980" cy="250" r="28"/>
      <text class="label" x="220" y="205" text-anchor="middle">${esc(shortLabel(actorLabel(from), 28))}</text>
      <text class="label" x="980" y="205" text-anchor="middle">${esc(shortLabel(actorLabel(to), 28))}</text>
      <text class="label" x="600" y="235" text-anchor="middle">No traversable route under these controls</text>
      <text class="sublabel" x="600" y="280" text-anchor="middle">The blocked state is evidence about the selected corpus and filter, not proof that no relationship exists.</text>
    </g>`;
  }

  const items = [];
  path.hops.forEach((hop, index) => {
    if (index === 0) items.push({ kind: 'actor', id: hop.from, label: actorLabel(hop.from) });
    items.push({ kind: 'surface', hop, basis: hop.basis, label: hop.basis.surface_label });
    items.push({ kind: 'actor', id: hop.to, label: actorLabel(hop.to) });
  });
  if (!items.length) items.push({ kind: 'actor', id: from, label: actorLabel(from) });
  const width = Math.max(1200, 170 + items.length * 220);
  $('#route-svg').setAttribute('viewBox', `0 0 ${width} 560`);
  $('#route-svg').style.minWidth = `${Math.max(980, width * .72)}px`;
  const startX = 100;
  const endX = width - 100;
  const points = items.map((item, index) => ({
    ...item,
    x: items.length === 1 ? width / 2 : startX + (index / (items.length - 1)) * (endX - startX),
    y: 210
  }));
  const pathData = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const nodes = points.map(point => {
    if (point.kind === 'actor') {
      return `<g>
        <circle class="route-actor" cx="${point.x}" cy="${point.y}" r="26"/>
        <text class="label" x="${point.x}" y="${point.y - 44}" text-anchor="middle">${esc(shortLabel(point.label, 25))}</text>
        <text class="tiny-label" x="${point.x}" y="${point.y + 54}" text-anchor="middle">actor</text>
      </g>`;
    }
    const basis = point.basis;
    const warning = evidenceRank(basis.evidence_class) >= evidenceRank('reported');
    const cardWidth = 190;
    const cardX = point.x - cardWidth / 2;
    return `<g>
      <rect class="route-surface${warning ? ' is-warning' : ''}" x="${point.x - 20}" y="${point.y - 20}" width="40" height="40" rx="3" transform="rotate(45 ${point.x} ${point.y})"/>
      <text class="tiny-label" x="${point.x}" y="${point.y - 43}" text-anchor="middle">bounded surface</text>
      <rect class="route-card" x="${cardX}" y="300" width="${cardWidth}" height="150" rx="12"/>
      <text class="route-card-title" x="${point.x}" y="326" text-anchor="middle">${esc(shortLabel(basis.surface_label, 27))}</text>
      <text class="route-card-copy" x="${point.x}" y="350" text-anchor="middle">${esc(humanLabel(basis.evidence_class))}</text>
      <text class="route-card-copy" x="${point.x}" y="371" text-anchor="middle">${esc(shortLabel(windowLabel(basis.valid_from, basis.valid_until, basis.temporal_status), 28))}</text>
      <text class="route-card-copy" x="${point.x}" y="392" text-anchor="middle">${basis.receipt_ids?.length ?? 0} receipt${basis.receipt_ids?.length === 1 ? '' : 's'}</text>
      <text class="route-card-copy" x="${point.x}" y="421" text-anchor="middle">Open the table for roles</text>
    </g>`;
  }).join('');
  return `<path class="route-line" d="${pathData}"/>${nodes}`;
}

function rejectedPairFor(from, to) {
  return (state.data.hopGraph.rejected_hop_pairs ?? []).find(pair =>
    (pair.actor_a === from && pair.actor_b === to) || (pair.actor_a === to && pair.actor_b === from));
}

function renderRoute() {
  if (!state.data) return;
  state.route.from = $('#route-from')?.value || state.route.from;
  state.route.to = $('#route-to')?.value || state.route.to;
  state.route.asOf = $('#route-asof')?.value.trim() ?? state.route.asOf;
  state.route.evidenceFloor = $('#route-evidence')?.value || state.route.evidenceFloor;
  const from = state.route.from;
  const to = state.route.to;
  const asOfValid = !state.route.asOf || Boolean(periodBounds(state.route.asOf));
  const filters = { asOf: asOfValid ? state.route.asOf : '', evidenceFloor: state.route.evidenceFloor };
  const path = asOfValid ? shortestFilteredPath(state.data.hopGraph, from, to, filters) : null;
  const diagnostics = diagnosePathFilters(state.data.hopGraph, filters);

  $('#route-layer').innerHTML = routeSvg(path, from, to);
  const stateLabel = !asOfValid ? 'Invalid date' : path ? `${path.number} documented step${path.number === 1 ? '' : 's'}` : 'Blocked';
  $('#route-state').textContent = stateLabel;

  if (!asOfValid) {
    $('#route-summary').innerHTML = `<div class="route-verdict is-blocked"><div class="route-number"><strong>!</strong><span>date</span></div><div><h3>The time filter is not valid</h3><p>Use a year, month, or ISO day such as 2024, 2024-06, or 2024-06-30.</p></div></div>`;
  } else if (path) {
    $('#route-summary').innerHTML = `<div class="route-verdict"><div class="route-number"><strong>${path.number}</strong><span>step${path.number === 1 ? '' : 's'}</span></div><div><h3>${esc(actorLabel(from))} → ${esc(actorLabel(to))}</h3><p>This is the shortest route that survives the selected evidence and temporal controls. Each step below remains visibly mediated by a named bounded surface.</p><div class="badge-row"><span class="badge">${state.route.asOf ? `Active during ${esc(state.route.asOf)}` : 'All-time topology'}</span><span class="badge">${esc(humanLabel(state.route.evidenceFloor))} floor</span></div></div></div>`;
  } else {
    const rejected = rejectedPairFor(from, to);
    $('#route-summary').innerHTML = `<div class="route-verdict is-blocked"><div class="route-number"><strong>×</strong><span>route</span></div><div><h3>No documented route survives this filter</h3><p>${rejected ? `${esc(rejected.surface_label || rejected.surface_id)} contains both actors in the corpus, but the compiler recorded no hop because the documented participation windows do not overlap.` : 'The current compiled graph contains no traversable sequence under the selected evidence floor and time slice.'}</p><p>This result is scoped to the published corpus. It does not prove that no relationship exists.</p></div></div>`;
  }

  const tableBody = $('#route-table-body');
  if (!path?.hops?.length) {
    tableBody.innerHTML = `<tr><td colspan="6">${asOfValid ? 'No route steps are available under the current controls.' : 'Correct the date filter to recompute the route.'}</td></tr>`;
  } else {
    tableBody.innerHTML = path.hops.map((hop, index) => {
      const basis = hop.basis;
      const health = receiptHealth(basis.receipt_ids);
      return `<tr>
        <td><strong>${index + 1}</strong><small>${esc(actorLabel(hop.from))} → ${esc(actorLabel(hop.to))}</small></td>
        <td><strong>${esc(basis.surface_label)}</strong><small>${esc(humanLabel(basis.surface_type))}</small></td>
        <td>${esc(actorLabel(hop.from))}: ${esc(roleFor(basis, hop.edge, hop.from) || 'Recorded participant')}<br>${esc(actorLabel(hop.to))}: ${esc(roleFor(basis, hop.edge, hop.to) || 'Recorded participant')}</td>
        <td>${esc(windowLabel(basis.valid_from, basis.valid_until, basis.temporal_status))}</td>
        <td>${evidenceBadge(basis.evidence_class)}</td>
        <td>${basis.receipt_ids?.length ?? 0}<small>${health.warning + health.missing ? `${health.warning + health.missing} archival warning${health.warning + health.missing === 1 ? '' : 's'}` : 'archival references present'}</small></td>
      </tr>`;
    }).join('');
  }
  $('#route-diagnostics').textContent = `${diagnostics.traversableEdges} of ${diagnostics.totalEdges} hop edges remain traversable. ${diagnostics.evidenceBlockedBases} bases fail the evidence floor; ${diagnostics.timeBlockedBases + diagnostics.undatedBlockedBases} fail the temporal control.`;
}

function initRoute() {
  populateRouteControls();
  $('#route-asof').value = state.route.asOf;
  $('#route-evidence').value = state.route.evidenceFloor;
  $('#route-controls').addEventListener('submit', event => {
    event.preventDefault();
    renderRoute();
  });
  for (const selector of ['#route-from', '#route-to', '#route-evidence']) $(selector).addEventListener('change', renderRoute);
  $('#route-asof').addEventListener('change', renderRoute);
  $('#route-reset').addEventListener('click', () => {
    state.route.asOf = '';
    state.route.evidenceFloor = 'open';
    $('#route-asof').value = '';
    $('#route-evidence').value = 'open';
    renderRoute();
  });
}
