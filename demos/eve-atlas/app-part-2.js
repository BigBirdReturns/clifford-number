function corpusPositions(clusters) {
  const positions = new Map();
  clusters.forEach((cluster, index) => {
    const point = stableRingPosition(index, clusters.length, 600, 360, 420, 250, -Math.PI / 2);
    positions.set(cluster.id, point);
  });
  return positions;
}

function renderCorpusScene(clusters) {
  const positions = corpusPositions(clusters);
  const corridorMarkup = computeCorridors(state.data.surfaceGraph).slice(0, 18).map(corridor => {
    const from = positions.get(corridor.from);
    const to = positions.get(corridor.to);
    if (!from || !to) return '';
    const width = Math.min(14, 1.5 + Math.sqrt(corridor.actorCount) * 1.7);
    const midX = (from.x + to.x) / 2;
    const midY = (from.y + to.y) / 2;
    return `<g>
      <line class="corridor" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}" stroke-width="${width}"/>
      <text class="corridor-label" x="${midX}" y="${midY - 5}" text-anchor="middle">${corridor.actorCount} shared actor${corridor.actorCount === 1 ? '' : 's'}</text>
    </g>`;
  }).join('');

  const nodeMarkup = clusters.map(cluster => {
    const point = positions.get(cluster.id);
    const radius = Math.max(48, Math.min(92, 42 + Math.sqrt(cluster.surfaceCount) * 7));
    const selected = cluster.id === state.semantic.selectedCluster;
    return `<g class="cluster-node interactive${selected ? ' is-selected' : ''}" data-cluster-id="${esc(cluster.id)}" transform="translate(${point.x} ${point.y})" tabindex="0" role="button" aria-label="${esc(`${cluster.label}, ${cluster.surfaceCount} surfaces, ${cluster.actorCount} actors`)}">
      <circle class="focus-ring" r="${radius + 12}"/>
      <circle class="cluster-halo" r="${radius + 10}"/>
      <circle class="cluster-core" r="${radius}"/>
      <text class="label" y="-5" text-anchor="middle">${esc(shortLabel(cluster.label, 28))}</text>
      <text class="sublabel" y="18" text-anchor="middle">${cluster.surfaceCount} surfaces · ${cluster.actorCount} actors</text>
    </g>`;
  }).join('');
  return `<g class="corpus-scene">${corridorMarkup}${nodeMarkup}</g>`;
}

function renderMachineScene(cluster) {
  const groups = surfaceTypeGroups(state.data.surfaceGraph, cluster.id).slice(0, 14);
  if (!state.semantic.selectedType || !groups.some(group => group.id === state.semantic.selectedType)) state.semantic.selectedType = groups[0]?.id ?? null;
  const groupMarkup = groups.map((group, index) => {
    const point = stableRingPosition(index, groups.length, 600, 360, 365, 235, -Math.PI / 2);
    const radius = Math.max(32, Math.min(68, 27 + Math.sqrt(group.surfaceCount) * 9));
    const selected = group.id === state.semantic.selectedType;
    return `<g>
      <line class="corridor" x1="600" y1="360" x2="${point.x}" y2="${point.y}" stroke-width="${Math.max(1.5, Math.sqrt(group.actorCount))}"/>
      <g class="machine-node interactive${group.hopEligible ? ' is-hop' : ''}${selected ? ' is-selected' : ''}" data-surface-type="${esc(group.id)}" transform="translate(${point.x} ${point.y})" tabindex="0" role="button" aria-label="${esc(`${group.label}, ${group.surfaceCount} bounded surfaces`)}">
        <circle class="focus-ring" r="${radius + 9}"/>
        <circle r="${radius}"/>
        <text class="label" y="-4" text-anchor="middle">${esc(shortLabel(group.label, 25))}</text>
        <text class="sublabel" y="17" text-anchor="middle">${group.surfaceCount} surfaces · ${group.actorCount} actors</text>
      </g>
    </g>`;
  }).join('');

  return `<g class="machine-scene">
    <ellipse class="machine-orbit" cx="600" cy="360" rx="365" ry="235"/>
    ${groupMarkup}
    <g transform="translate(600 360)">
      <circle class="machine-core" r="92"/>
      <text class="label" y="-8" text-anchor="middle">${esc(shortLabel(cluster.label, 30))}</text>
      <text class="sublabel" y="18" text-anchor="middle">${cluster.surfaceCount} bounded surfaces</text>
      <text class="sublabel" y="35" text-anchor="middle">${cluster.hopEligible} hop-eligible · ${cluster.contextOnly} context-only</text>
    </g>
  </g>`;
}

function sortedSurfaceParticipants(surface) {
  const participants = actorParticipants(surface);
  return [...participants].sort((a, b) => {
    const selectedDelta = Number(b.actor_id === state.semantic.selectedActorId) - Number(a.actor_id === state.semantic.selectedActorId);
    if (selectedDelta) return selectedDelta;
    const evidenceDelta = evidenceRank(a.evidence_class) - evidenceRank(b.evidence_class);
    if (evidenceDelta) return evidenceDelta;
    return actorLabel(a.actor_id).localeCompare(actorLabel(b.actor_id));
  });
}

function actorBracketMarkup(participant, x, y, { selected = false, warning = false, labelMax = 22, dataPrefix = '' } = {}) {
  const actorId = participant.actor_id;
  const classes = `actor-bracket interactive${selected ? ' is-selected' : ''}${warning ? ' is-warning' : ''}`;
  return `<g class="${classes}" data-${dataPrefix}actor-id="${esc(actorId)}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(`${actorLabel(actorId)}, ${participant.role || 'recorded participant'}, ${humanLabel(participant.evidence_class)}`)}">
    <circle class="focus-ring" r="24"/>
    <circle class="actor-core" r="14"/>
    <path class="actor-tick" d="M-19 -8 V-18 H-9 M19 -8 V-18 H9 M-19 8 V18 H-9 M19 8 V18 H9" fill="none"/>
    <text class="label" y="-28" text-anchor="middle">${esc(shortLabel(actorLabel(actorId), labelMax))}</text>
    <text class="tiny-label" y="34" text-anchor="middle">${esc(shortLabel(participant.role || humanLabel(participant.participation_type), labelMax + 6))}</text>
  </g>`;
}

function renderSurfaceScene(surface) {
  const participants = sortedSurfaceParticipants(surface);
  const visible = participants.slice(0, 20);
  const hidden = Math.max(0, participants.length - visible.length);
  const lines = visible.map((participant, index) => {
    const point = stableRingPosition(index, visible.length + (hidden ? 1 : 0), 600, 360, 390, 250, -Math.PI / 2);
    return `<line class="participation-line${participant.actor_id === state.semantic.selectedActorId ? ' is-selected' : ''}" x1="600" y1="360" x2="${point.x}" y2="${point.y}"/>`;
  }).join('');
  const actorMarkup = visible.map((participant, index) => {
    const point = stableRingPosition(index, visible.length + (hidden ? 1 : 0), 600, 360, 390, 250, -Math.PI / 2);
    return actorBracketMarkup(participant, point.x, point.y, {
      selected: participant.actor_id === state.semantic.selectedActorId,
      warning: evidenceRank(participant.evidence_class) >= evidenceRank('judgment')
    });
  }).join('');
  const aggregate = hidden ? (() => {
    const point = stableRingPosition(visible.length, visible.length + 1, 600, 360, 390, 250, -Math.PI / 2);
    return `<g transform="translate(${point.x} ${point.y})"><circle class="aggregate-node" r="31"/><text class="label" y="4" text-anchor="middle">+${hidden}</text><text class="tiny-label" y="48" text-anchor="middle">aggregated actors</text></g>`;
  })() : '';
  return `<g class="surface-scene">
    ${lines}
    ${actorMarkup}
    ${aggregate}
    <g class="surface-node interactive is-selected${surface.hop_eligible ? '' : ' is-context'}" data-surface-id="${esc(surface.surface_id)}" transform="translate(600 360)" tabindex="0" role="button" aria-label="${esc(`${surface.surface_label}, ${participants.length} actors`)}">
      <circle class="focus-ring" r="64"/>
      <rect class="surface-diamond" x="-36" y="-36" width="72" height="72" rx="5" transform="rotate(45)"/>
      <text class="label" y="-62" text-anchor="middle">${esc(shortLabel(surface.surface_label, 48))}</text>
      <text class="sublabel" y="5" text-anchor="middle">${participants.length}</text>
      <text class="tiny-label" y="70" text-anchor="middle">${surface.hop_eligible ? 'hop-eligible surface' : 'context-only surface'}</text>
    </g>
  </g>`;
}

function renderEvidenceScene(surface) {
  const participants = sortedSurfaceParticipants(surface);
  const visible = participants.slice(0, 12);
  const hidden = Math.max(0, participants.length - visible.length);
  const participantMarkup = visible.map((participant, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = column ? 790 : 410;
    const y = 190 + row * 70;
    const selected = participant.actor_id === state.semantic.selectedActorId;
    const role = shortLabel(participant.role || humanLabel(participant.participation_type), 40);
    return `<g>
      <path class="participation-line${selected ? ' is-selected' : ''}" d="M600 165 C600 ${y}, ${x} ${y - 15}, ${x} ${y}" fill="none"/>
      <g class="actor-bracket interactive${selected ? ' is-selected' : ''}${evidenceRank(participant.evidence_class) >= evidenceRank('judgment') ? ' is-warning' : ''}" data-actor-id="${esc(participant.actor_id)}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(`${actorLabel(participant.actor_id)}, ${participant.role}`)}">
        <circle class="focus-ring" r="24"/><circle class="actor-core" r="13"/>
        <path class="actor-tick" d="M-18 -7 V-16 H-9 M18 -7 V-16 H9 M-18 7 V16 H-9 M18 7 V16 H9" fill="none"/>
      </g>
      <text class="label" x="${column ? x + 28 : x - 28}" y="${y - 6}" text-anchor="${column ? 'start' : 'end'}">${esc(shortLabel(actorLabel(participant.actor_id), 27))}</text>
      <text class="tiny-label" x="${column ? x + 28 : x - 28}" y="${y + 14}" text-anchor="${column ? 'start' : 'end'}">${esc(role)} · ${esc(humanLabel(participant.evidence_class))}</text>
    </g>`;
  }).join('');
  return `<g class="evidence-scene">
    <rect class="surface-container" x="170" y="80" width="860" height="560" rx="36"/>
    <g class="surface-node is-selected${surface.hop_eligible ? '' : ' is-context'}" transform="translate(600 155)">
      <rect class="surface-diamond" x="-29" y="-29" width="58" height="58" rx="4" transform="rotate(45)"/>
      <text class="label" y="-50" text-anchor="middle">${esc(shortLabel(surface.surface_label, 54))}</text>
      <text class="tiny-label" y="55" text-anchor="middle">${esc(windowLabel(surface.time_start, surface.time_end))}</text>
    </g>
    ${participantMarkup}
    ${hidden ? `<g transform="translate(600 595)"><circle class="aggregate-node" r="29"/><text class="label" y="4" text-anchor="middle">+${hidden}</text><text class="tiny-label" y="48" text-anchor="middle">open the dense overview for the full roster</text></g>` : ''}
  </g>`;
}
