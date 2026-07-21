function renderMapMode() {
  ensureMapSelection();
  const clusters = summarizeClusters(state.data.surfaceGraph);
  const cluster = clusters.find(item => item.id === state.map.selectedClusterId) ?? clusters[0];
  const groups = surfaceTypeGroups(state.data.surfaceGraph, cluster?.id);
  const group = groups.find(item => item.id === state.map.selectedTypeId) ?? groups[0];
  const surface = state.surfaces.get(state.map.selectedSurfaceId) ?? largestSurface(cluster?.surfaces);
  if (!cluster || !surface) return;

  let markup;
  let description;
  if (state.map.level === 'corpus') {
    markup = renderCorpusScene(clusters);
    description = 'Surface families and aggregate corridors across the compiled public corpus.';
  } else if (state.map.level === 'machine') {
    markup = renderMachineScene(cluster);
    description = 'Surface types inside the selected family, with bounded objects preserved beneath them.';
  } else if (state.map.level === 'surface') {
    markup = renderSurfaceScene(surface);
    description = 'One bounded surface with actor participation brackets connected only to the surface.';
  } else {
    markup = renderEvidenceScene(surface);
    description = 'Exact participation rows with roles, dates, evidence classes, and receipt access.';
  }
  setStage(markup, { title: `${humanLabel(state.map.level)} view · ${state.map.level === 'corpus' ? 'whole corpus' : state.map.level === 'machine' ? cluster.label : surface.surface_label}`, description });
  const crumbs = ['Map', humanLabel(state.map.level)];
  if (state.map.level !== 'corpus') crumbs.push(cluster.label);
  if (state.map.level === 'machine' && group) crumbs.push(group.label);
  if (['surface', 'evidence'].includes(state.map.level)) crumbs.push(surface.surface_label);
  setTelemetry(crumbs, state.map.level === 'corpus'
    ? [{ value: clusters.length, label: 'families' }, { value: state.surfaces.size, label: 'surfaces' }, { value: state.actors.size, label: 'actors' }]
    : state.map.level === 'machine'
      ? [{ value: groups.length, label: 'types' }, { value: cluster.surfaceCount, label: 'surfaces' }, { value: cluster.actorCount, label: 'actors' }]
      : [{ value: actorParticipants(surface).length, label: 'actors' }, { value: surface.hop_eligible ? 'yes' : 'no', label: 'hop effect' }, { value: unique(surface.receipt_ids).length, label: 'surface receipts' }]);
  setInspector(state.map.level === 'corpus' ? cluster.label : state.map.level === 'machine' ? group?.label || cluster.label : state.map.selectedActorId ? actorLabel(state.map.selectedActorId) : surface.surface_label, mapInspector(cluster, group, surface));
  renderMapOverview(cluster, group, surface);
}

function routeActorIds() {
  const ids = new Set();
  for (const edge of state.data?.hopGraph?.edges ?? []) {
    ids.add(edge.actor_a);
    ids.add(edge.actor_b);
  }
  return [...ids].sort((a, b) => actorLabel(a).localeCompare(actorLabel(b)));
}

function roleFor(basis, edge, actorId) {
  return actorId === edge.actor_a ? basis.actor_a_role : basis.actor_b_role;
}

function directRejection(from, to) {
  return (state.data.hopGraph.rejected_hop_pairs ?? []).find(item => (item.actor_a === from && item.actor_b === to) || (item.actor_a === to && item.actor_b === from));
}
