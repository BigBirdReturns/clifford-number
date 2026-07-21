function renderRouteScene(path, from, to) {
  if (!path) {
    return { minWidth: 980, markup: `<g class="aperture-scene aperture-scene--route"><line class="aperture-route-blocked" x1="260" y1="280" x2="940" y2="280"/><g class="aperture-route-actor" data-ap-route-actor="${esc(from)}" tabindex="0" role="button"><circle cx="220" cy="280" r="28"/><text class="aperture-node-label" x="220" y="230" text-anchor="middle">${esc(shortLabel(actorLabel(from), 28))}</text></g><g class="aperture-route-actor" data-ap-route-actor="${esc(to)}" tabindex="0" role="button"><circle cx="980" cy="280" r="28"/><text class="aperture-node-label" x="980" y="230" text-anchor="middle">${esc(shortLabel(actorLabel(to), 28))}</text></g><text class="aperture-blocked-title" x="600" y="262" text-anchor="middle">No traversable route under these controls</text><text class="aperture-blocked-copy" x="600" y="315" text-anchor="middle">This is a scoped corpus result, not proof that no relationship exists.</text></g>` };
  }
  const items = [];
  path.hops.forEach((hop, index) => {
    if (index === 0) items.push({ kind: 'actor', id: hop.from, label: actorLabel(hop.from) });
    items.push({ kind: 'surface', hop, basis: hop.basis, label: hop.basis.surface_label, step: index });
    items.push({ kind: 'actor', id: hop.to, label: actorLabel(hop.to) });
  });
  if (!items.length) items.push({ kind: 'actor', id: from, label: actorLabel(from) });
  const width = Math.max(1200, 180 + items.length * 220);
  const points = items.map((item, index) => ({ ...item, x: items.length === 1 ? width / 2 : 100 + (index / (items.length - 1)) * (width - 200), y: 225 }));
  const pathData = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x} ${point.y}`).join(' ');
  const nodes = points.map(point => {
    if (point.kind === 'actor') return `<g class="aperture-route-actor aperture-interactive${point.id === state.route.selectedActorId ? ' is-selected' : ''}" data-ap-route-actor="${esc(point.id)}" transform="translate(${point.x} ${point.y})" tabindex="0" role="button" aria-label="${esc(actorLabel(point.id))}"><circle r="27"/><text class="aperture-node-label" y="-45" text-anchor="middle">${esc(shortLabel(point.label, 25))}</text><text class="aperture-node-meta" y="55" text-anchor="middle">actor</text></g>`;
    const basis = point.basis;
    const selected = point.step === state.route.selectedStep;
    const warning = evidenceRank(basis.evidence_class) >= evidenceRank('reported');
    return `<g class="aperture-route-step aperture-interactive${selected ? ' is-selected' : ''}" data-ap-route-step="${point.step}" transform="translate(${point.x} ${point.y})" tabindex="0" role="button" aria-label="${esc(`Step ${point.step + 1}, ${basis.surface_label}`)}"><rect class="aperture-route-diamond${warning ? ' is-warning' : ''}" x="-21" y="-21" width="42" height="42" rx="3" transform="rotate(45)"/><text class="aperture-node-meta" y="-45" text-anchor="middle">bounded surface</text><rect class="aperture-route-card" x="-98" y="80" width="196" height="154" rx="12"/><text class="aperture-route-card-title" y="108" text-anchor="middle">${esc(shortLabel(basis.surface_label, 28))}</text><text class="aperture-route-card-copy" y="135" text-anchor="middle">${esc(evidenceLabel(basis.evidence_class))}</text><text class="aperture-route-card-copy" y="158" text-anchor="middle">${esc(shortLabel(windowLabel(basis.valid_from, basis.valid_until, basis.temporal_status), 29))}</text><text class="aperture-route-card-copy" y="181" text-anchor="middle">${basis.receipt_ids?.length ?? 0} receipt${basis.receipt_ids?.length === 1 ? '' : 's'}</text><text class="aperture-route-card-copy" y="211" text-anchor="middle">select for exact roles</text></g>`;
  }).join('');
  return { minWidth: Math.max(980, width * .72), markup: `<g class="aperture-scene aperture-scene--route"><path class="aperture-route-line" d="${pathData}"/>${nodes}</g>` };
}

function routeInspector(path, diagnostics, validDate) {
  if (!validDate) return `<p class="aperture-kicker">Invalid temporal control</p><h3>Use a year, month, or ISO day.</h3><p>Examples: <code>2024</code>, <code>2024-06</code>, or <code>2024-06-30</code>. Precision is widened; it is never invented.</p>`;
  if (!path) {
    const rejected = directRejection(state.route.fromId, state.route.toId);
    return `<p class="aperture-kicker">Blocked route</p><h3>No documented route survives this filter.</h3><p>${rejected ? `${esc(rejected.surface_label || rejected.surface_id)} contains both actors in the corpus, but the compiler recorded no hop because the documented windows do not overlap.` : 'The current compiled hop graph contains no traversable sequence under the selected evidence floor and time slice.'}</p><div class="aperture-metric-grid"><div><strong>${diagnostics.traversableEdges}</strong><span>traversable edges</span></div><div><strong>${diagnostics.evidenceBlockedBases}</strong><span>evidence-blocked bases</span></div><div><strong>${diagnostics.timeBlockedBases}</strong><span>time-blocked bases</span></div><div><strong>${diagnostics.undatedBlockedBases}</strong><span>undated bases held</span></div></div><p class="aperture-muted">This result is scoped to the published corpus. It does not prove that no relationship exists.</p>`;
  }
  if (state.route.selectedActorId) {
    return `<p class="aperture-kicker">Route actor</p><h3>${esc(actorLabel(state.route.selectedActorId))}</h3><p>This actor is visible on the selected route. Open the full record or make it the next route origin without losing the current route controls.</p><div class="aperture-actions"><button type="button" data-ap-action="open-record" data-actor-id="${esc(state.route.selectedActorId)}">Open actor record</button><button type="button" data-ap-action="route-from-selection">Route from actor</button>${workspaceCompareAction('actor', state.route.selectedActorId, 'Compare actor')}</div>`;
  }
  const hop = Number.isInteger(state.route.selectedStep) ? path.hops[state.route.selectedStep] : null;
  if (hop) {
    const basis = hop.basis;
    return `<p class="aperture-kicker">Route step ${state.route.selectedStep + 1}</p><h3>${esc(basis.surface_label)}</h3><div class="aperture-badge-row">${evidenceBadge(basis.evidence_class)}<span class="aperture-badge">${esc(windowLabel(basis.valid_from, basis.valid_until, basis.temporal_status))}</span></div><dl class="aperture-definition-list"><div><dt>${esc(actorLabel(hop.from))}</dt><dd>${esc(roleFor(basis, hop.edge, hop.from) || 'Recorded participant')}</dd></div><div><dt>${esc(actorLabel(hop.to))}</dt><dd>${esc(roleFor(basis, hop.edge, hop.to) || 'Recorded participant')}</dd></div></dl>${receiptHealthBadges(basis.receipt_ids)}${receiptButtons(basis.receipt_ids)}<div class="aperture-actions"><button type="button" data-ap-action="open-surface-record" data-surface-id="${esc(basis.surface_id)}">Open surface record</button><button type="button" data-ap-action="surface-from-route" data-surface-id="${esc(basis.surface_id)}">Open roster view</button>${workspaceCompareAction('surface', basis.surface_id, 'Compare surface')}</div>`;
  }
  return `<p class="aperture-kicker">Filtered shortest path</p><h3>${esc(actorLabel(state.route.fromId))} → ${esc(actorLabel(state.route.toId))}</h3><div class="aperture-metric-grid"><div><strong>${path.number}</strong><span>documented steps</span></div><div><strong>${evidenceLabel(state.route.evidenceFloor)}</strong><span>evidence floor</span></div><div><strong>${state.route.asOf || 'all time'}</strong><span>temporal scope</span></div><div><strong>${diagnostics.traversableEdges}</strong><span>traversable edges</span></div></div><p>Every actor-to-actor step remains visibly mediated by the named bounded surface that permits it.</p>`;
}

function renderRouteOverview(path, validDate) {
  if (!validDate || !path?.hops?.length) {
    setOverview({ title: 'Route evidence overview.', status: validDate ? 'No route rows survive the current controls.' : 'Correct the date before recomputing.', headers: ['Step', 'Bounded surface', 'Roles', 'Validity window', 'Evidence', 'Receipts'] });
    return;
  }
  setOverview({
    title: `${path.number} documented route step${path.number === 1 ? '' : 's'}.`,
    status: 'Selecting a row preserves the route and opens its exact roles, window, evidence floor, and receipt IDs.',
    headers: ['Step', 'Bounded surface', 'Roles', 'Validity window', 'Evidence', 'Receipts'],
    rows: path.hops.map((hop, index) => {
      const basis = hop.basis;
      return `<tr class="${index === state.route.selectedStep ? 'is-selected' : ''}"><td><button type="button" class="aperture-table-link" data-ap-route-step="${index}">${index + 1}</button><small>${esc(actorLabel(hop.from))} → ${esc(actorLabel(hop.to))}</small></td><td><strong>${esc(basis.surface_label)}</strong><small>${esc(humanLabel(basis.surface_type))}</small></td><td>${esc(actorLabel(hop.from))}: ${esc(roleFor(basis, hop.edge, hop.from) || 'Recorded participant')}<br>${esc(actorLabel(hop.to))}: ${esc(roleFor(basis, hop.edge, hop.to) || 'Recorded participant')}</td><td>${esc(windowLabel(basis.valid_from, basis.valid_until, basis.temporal_status))}</td><td>${evidenceBadge(basis.evidence_class)}</td><td>${basis.receipt_ids?.length ?? 0}</td></tr>`;
    }).join('')
  });
}

function renderRouteMode() {
  const validDate = !state.route.asOf || Boolean(periodBounds(state.route.asOf));
  const filters = { evidenceFloor: state.route.evidenceFloor, asOf: validDate ? state.route.asOf : '' };
  const path = validDate ? shortestFilteredPath(state.data.hopGraph, state.route.fromId, state.route.toId, filters) : null;
  const diagnostics = diagnosePathFilters(state.data.hopGraph, filters);
  state.route.path = path;
  if (path?.hops?.length) {
    if (!Number.isInteger(state.route.selectedStep) || state.route.selectedStep < 0 || state.route.selectedStep >= path.hops.length) state.route.selectedStep = 0;
    if (state.route.selectedActorId && !path.actorPath.includes(state.route.selectedActorId)) state.route.selectedActorId = null;
  } else {
    state.route.selectedStep = null;
    state.route.selectedActorId = null;
  }
  const scene = renderRouteScene(path, state.route.fromId, state.route.toId);
  setStage(scene.markup, { title: `Route · ${actorLabel(state.route.fromId)} to ${actorLabel(state.route.toId)}`, description: path ? 'A filtered route where every actor-to-actor step is mediated by a bounded surface. Every actor line terminates at the bounded surface that mediates the step; no participant-to-participant lines are drawn.' : 'A blocked route under the selected evidence and temporal controls.', minWidth: scene.minWidth });
  setTelemetry(['Route', actorLabel(state.route.fromId), actorLabel(state.route.toId)], [
    { value: validDate ? path?.number ?? '×' : '!', label: path ? `step${path.number === 1 ? '' : 's'}` : validDate ? 'blocked' : 'invalid date' },
    { value: evidenceLabel(state.route.evidenceFloor), label: 'evidence floor' },
    { value: state.route.asOf || 'all time', label: 'temporal scope' }
  ]);
  setInspector(path ? `Route · ${path.number} step${path.number === 1 ? '' : 's'}` : 'Blocked route', routeInspector(path, diagnostics, validDate));
  renderRouteOverview(path, validDate);
}
