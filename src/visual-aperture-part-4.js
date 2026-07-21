function renderCorpusScene(clusters) {
  const positions = clusterPositions(clusters);
  const corridors = computeCorridors(state.data.surfaceGraph).slice(0, 18).map(corridor => {
    const from = positions.get(corridor.from);
    const to = positions.get(corridor.to);
    if (!from || !to) return '';
    const width = Math.min(14, 1.2 + Math.sqrt(corridor.actorCount) * 1.65);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    return `<g class="aperture-corridor-group"><line class="aperture-corridor" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke-width="${width}"/><text class="aperture-corridor-label" x="${midX}" y="${midY - 7}" text-anchor="middle">${corridor.actorCount}</text></g>`;
  }).join('');
  const nodes = clusters.map(cluster => {
    const point = positions.get(cluster.id);
    const radius = Math.max(50, Math.min(92, 42 + Math.sqrt(cluster.surfaceCount) * 8));
    const selected = cluster.id === state.map.selectedClusterId;
    return `<g class="aperture-cluster aperture-cluster--${esc(cluster.id)} aperture-interactive${selected ? ' is-selected' : ''}" data-ap-cluster="${esc(cluster.id)}" transform="translate(${point.x} ${point.y})" tabindex="0" role="button" aria-label="${esc(`${cluster.label}, ${cluster.surfaceCount} surfaces, ${cluster.actorCount} actors`)}">
      <circle class="aperture-focus-ring" r="${radius + 13}"/><circle class="aperture-cluster-halo" r="${radius + 9}"/><circle class="aperture-cluster-core" r="${radius}"/>
      <text class="aperture-node-label" y="-6" text-anchor="middle">${esc(shortLabel(cluster.label, 27))}</text><text class="aperture-node-meta" y="18" text-anchor="middle">${cluster.surfaceCount} surfaces · ${cluster.actorCount} actors</text>
    </g>`;
  }).join('');
  return `<g class="aperture-scene aperture-scene--corpus">${corridors}${nodes}</g>`;
}

function renderMachineScene(cluster) {
  const groups = surfaceTypeGroups(state.data.surfaceGraph, cluster.id).slice(0, 16);
  if (!state.map.selectedTypeId || !groups.some(group => group.id === state.map.selectedTypeId)) state.map.selectedTypeId = groups[0]?.id ?? null;
  const nodes = groups.map((group, index) => {
    const point = stableRingPosition(index, groups.length, 600, 360, 380, 238, -Math.PI / 2);
    const radius = Math.max(34, Math.min(68, 28 + Math.sqrt(group.surfaceCount) * 9));
    const selected = group.id === state.map.selectedTypeId;
    return `<g><line class="aperture-machine-spoke" x1="600" y1="360" x2="${point.x}" y2="${point.y}" stroke-width="${Math.max(1.2, Math.sqrt(group.actorCount) * .8)}"/>
      <g class="aperture-machine-node aperture-interactive${group.hopEligible ? ' is-hop' : ''}${selected ? ' is-selected' : ''}" data-ap-type="${esc(group.id)}" transform="translate(${point.x} ${point.y})" tabindex="0" role="button" aria-label="${esc(`${group.label}, ${group.surfaceCount} bounded surfaces`)}">
        <circle class="aperture-focus-ring" r="${radius + 10}"/><circle r="${radius}"/><text class="aperture-node-label" y="-5" text-anchor="middle">${esc(shortLabel(group.label, 24))}</text><text class="aperture-node-meta" y="17" text-anchor="middle">${group.surfaceCount} surfaces · ${group.actorCount} actors</text>
      </g></g>`;
  }).join('');
  return `<g class="aperture-scene aperture-scene--machine"><ellipse class="aperture-machine-orbit" cx="600" cy="360" rx="380" ry="238"/>${nodes}<g class="aperture-machine-core" transform="translate(600 360)"><circle r="94"/><text class="aperture-node-label" y="-10" text-anchor="middle">${esc(shortLabel(cluster.label, 30))}</text><text class="aperture-node-meta" y="17" text-anchor="middle">${cluster.surfaceCount} bounded surfaces</text><text class="aperture-node-meta" y="37" text-anchor="middle">${cluster.hopEligible} hop-eligible · ${cluster.contextOnly} context-only</text></g></g>`;
}

function sortedParticipants(surface) {
  return [...actorParticipants(surface)].sort((a, b) => {
    const selectedDelta = Number(b.actor_id === state.map.selectedActorId) - Number(a.actor_id === state.map.selectedActorId);
    if (selectedDelta) return selectedDelta;
    const evidenceDelta = evidenceRank(a.evidence_class) - evidenceRank(b.evidence_class);
    if (evidenceDelta) return evidenceDelta;
    return actorLabel(a.actor_id).localeCompare(actorLabel(b.actor_id));
  });
}

function actorBracket(participant, x, y, { selected = false, pinned = false, dataAttribute = 'data-ap-actor', labelMax = 23 } = {}) {
  const warning = evidenceRank(participant.evidence_class) >= evidenceRank('judgment');
  return `<g class="aperture-actor-bracket aperture-interactive${selected ? ' is-selected' : ''}${pinned ? ' is-pinned' : ''}${warning ? ' is-warning' : ''}" ${dataAttribute}="${esc(participant.actor_id)}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(`${actorLabel(participant.actor_id)}, ${participant.role || 'recorded participant'}, ${evidenceLabel(participant.evidence_class)}`)}">
    <circle class="aperture-focus-ring" r="24"/><circle class="aperture-actor-core" r="13"/><path class="aperture-actor-tick" d="M-19 -8 V-18 H-9 M19 -8 V-18 H9 M-19 8 V18 H-9 M19 8 V18 H9"/>
    <text class="aperture-node-label" y="-29" text-anchor="middle">${esc(shortLabel(actorLabel(participant.actor_id), labelMax))}</text><text class="aperture-node-meta" y="35" text-anchor="middle">${esc(shortLabel(participant.role || humanLabel(participant.participation_type), labelMax + 5))}</text>
  </g>`;
}

function renderSurfaceScene(surface) {
  const participants = sortedParticipants(surface);
  const visible = participants.slice(0, MAX_MAP_ACTORS);
  const hidden = Math.max(0, participants.length - visible.length);
  const slots = visible.length + (hidden ? 1 : 0);
  const lines = visible.map((participant, index) => {
    const point = stableRingPosition(index, slots, 600, 360, 395, 252, -Math.PI / 2);
    return `<line class="aperture-participation-line${participant.actor_id === state.map.selectedActorId ? ' is-selected' : ''}" x1="600" y1="360" x2="${point.x}" y2="${point.y}"/>`;
  }).join('');
  const actors = visible.map((participant, index) => {
    const point = stableRingPosition(index, slots, 600, 360, 395, 252, -Math.PI / 2);
    return actorBracket(participant, point.x, point.y, { selected: participant.actor_id === state.map.selectedActorId });
  }).join('');
  const aggregate = hidden ? (() => {
    const point = stableRingPosition(visible.length, slots, 600, 360, 395, 252, -Math.PI / 2);
    return `<g class="aperture-aggregate" transform="translate(${point.x} ${point.y})"><circle r="32"/><text class="aperture-node-label" y="5" text-anchor="middle">+${hidden}</text><text class="aperture-node-meta" y="49" text-anchor="middle">aggregated actors</text></g>`;
  })() : '';
  return `<g class="aperture-scene aperture-scene--surface">${lines}${actors}${aggregate}<g class="aperture-surface-node aperture-interactive is-selected${surface.hop_eligible ? '' : ' is-context'}" data-ap-surface="${esc(surface.surface_id)}" transform="translate(600 360)" tabindex="0" role="button" aria-label="${esc(`${surface.surface_label}, ${participants.length} actors`)}"><circle class="aperture-focus-ring" r="68"/><rect class="aperture-surface-diamond" x="-38" y="-38" width="76" height="76" rx="5" transform="rotate(45)"/><text class="aperture-node-label" y="-66" text-anchor="middle">${esc(shortLabel(surface.surface_label, 48))}</text><text class="aperture-surface-count" y="6" text-anchor="middle">${participants.length}</text><text class="aperture-node-meta" y="75" text-anchor="middle">${surface.hop_eligible ? 'hop-eligible surface' : 'context-only surface'}</text></g></g>`;
}
