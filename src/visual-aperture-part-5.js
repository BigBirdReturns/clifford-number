function renderEvidenceScene(surface) {
  const participants = sortedParticipants(surface);
  const visible = participants.slice(0, MAX_EVIDENCE_ACTORS);
  const hidden = Math.max(0, participants.length - visible.length);
  const rows = visible.map((participant, index) => {
    const left = index % 2 === 0;
    const columnIndex = Math.floor(index / 2);
    const x = left ? 385 : 815;
    const y = 205 + columnIndex * 68;
    const selected = participant.actor_id === state.map.selectedActorId;
    return `<g><path class="aperture-participation-line${selected ? ' is-selected' : ''}" d="M600 165 C600 ${y}, ${x} ${y - 16}, ${x} ${y}"/>
      <g class="aperture-actor-bracket aperture-interactive${selected ? ' is-selected' : ''}${evidenceRank(participant.evidence_class) >= evidenceRank('judgment') ? ' is-warning' : ''}" data-ap-actor="${esc(participant.actor_id)}" transform="translate(${x} ${y})" tabindex="0" role="button" aria-label="${esc(`${actorLabel(participant.actor_id)}, ${participant.role}`)}"><circle class="aperture-focus-ring" r="23"/><circle class="aperture-actor-core" r="12"/><path class="aperture-actor-tick" d="M-18 -7 V-16 H-9 M18 -7 V-16 H9 M-18 7 V16 H-9 M18 7 V16 H9"/></g>
      <text class="aperture-row-label" x="${left ? x - 28 : x + 28}" y="${y - 7}" text-anchor="${left ? 'end' : 'start'}">${esc(shortLabel(actorLabel(participant.actor_id), 28))}</text><text class="aperture-row-meta" x="${left ? x - 28 : x + 28}" y="${y + 13}" text-anchor="${left ? 'end' : 'start'}">${esc(shortLabel(participant.role || humanLabel(participant.participation_type), 36))}</text><text class="aperture-row-meta" x="${left ? x - 28 : x + 28}" y="${y + 30}" text-anchor="${left ? 'end' : 'start'}">${esc(evidenceLabel(participant.evidence_class))} · ${esc(shortLabel(windowLabel(participant.time_start, participant.time_end), 26))}</text>
    </g>`;
  }).join('');
  return `<g class="aperture-scene aperture-scene--evidence"><rect class="aperture-surface-container" x="145" y="62" width="910" height="600" rx="36"/><g class="aperture-surface-node is-selected${surface.hop_eligible ? '' : ' is-context'}" transform="translate(600 145)"><rect class="aperture-surface-diamond" x="-31" y="-31" width="62" height="62" rx="4" transform="rotate(45)"/><text class="aperture-node-label" y="-54" text-anchor="middle">${esc(shortLabel(surface.surface_label, 56))}</text><text class="aperture-node-meta" y="58" text-anchor="middle">${esc(windowLabel(surface.time_start, surface.time_end))}</text></g>${rows}${hidden ? `<g class="aperture-aggregate" transform="translate(600 610)"><circle r="29"/><text class="aperture-node-label" y="5" text-anchor="middle">+${hidden}</text><text class="aperture-node-meta" y="47" text-anchor="middle">full roster remains in Surface mode</text></g>` : ''}</g>`;
}

function mapInspector(cluster, group, surface) {
  if (state.map.level === 'corpus') {
    const evidence = Object.entries(cluster.evidenceCounts).sort((a, b) => evidenceRank(a[0]) - evidenceRank(b[0]));
    return `<p class="aperture-kicker">Selected surface family</p><h3>${esc(cluster.label)}</h3><p>Corridors count actors documented across more than one family. They are navigation aggregates, not Clifford hops.</p><div class="aperture-metric-grid"><div><strong>${cluster.surfaceCount}</strong><span>bounded surfaces</span></div><div><strong>${cluster.actorCount}</strong><span>distinct actors</span></div><div><strong>${cluster.hopEligible}</strong><span>hop-eligible</span></div><div><strong>${cluster.contextOnly}</strong><span>context-only</span></div></div><div class="aperture-badge-row">${evidence.map(([kind, count]) => `<span class="aperture-badge aperture-badge--${esc(kind)}">${count} ${esc(evidenceLabel(kind))}</span>`).join('')}</div><div class="aperture-actions"><button type="button" data-ap-action="zoom-in">Decompose family</button></div>`;
  }
  if (state.map.level === 'machine') {
    return `<p class="aperture-kicker">Surface-type projection</p><h3>${esc(group?.label || cluster.label)}</h3><p>${group ? `${group.surfaceCount} separately bounded object${group.surfaceCount === 1 ? '' : 's'} share this compiler type. Grouping is for navigation only.` : 'Select a surface type to inspect the bounded objects inside it.'}</p>${group ? `<div class="aperture-metric-grid"><div><strong>${group.surfaceCount}</strong><span>surfaces</span></div><div><strong>${group.actorCount}</strong><span>actors</span></div><div><strong>${group.hopEligible}</strong><span>hop-eligible</span></div><div><strong>${group.surfaceCount - group.hopEligible}</strong><span>context-only</span></div></div><h4>Included objects</h4><ul>${group.surfaces.slice(0, 6).map(item => `<li>${esc(item.surface_label)}</li>`).join('')}</ul>` : ''}<div class="aperture-actions"><button type="button" data-ap-action="zoom-out">Back to families</button><button type="button" data-ap-action="zoom-in">Open bounded surface</button></div>`;
  }
  const participant = actorParticipants(surface).find(item => item.actor_id === state.map.selectedActorId);
  const ids = unique([...(surface.receipt_ids ?? []), ...(participant?.receipt_ids ?? [])]);
  return `<p class="aperture-kicker">${state.map.level === 'evidence' ? 'Exact participation row' : 'Bounded surface'}</p><h3>${esc(surface.surface_label)}</h3><div class="aperture-badge-row"><span class="aperture-badge">${esc(humanLabel(surface.surface_type))}</span><span class="aperture-badge ${surface.hop_eligible ? 'aperture-badge--official' : 'aperture-badge--reported'}">${surface.hop_eligible ? 'Hop-eligible' : 'Context-only'}</span></div><dl class="aperture-definition-list"><div><dt>Surface window</dt><dd>${esc(windowLabel(surface.time_start, surface.time_end))}</dd></div><div><dt>Actors</dt><dd>${actorParticipants(surface).length}</dd></div><div><dt>Graph effect</dt><dd>${surface.hop_eligible ? 'Potential hop basis when every compiler rule passes' : 'No actor-to-actor hop'}</dd></div></dl>${surface.notes ? `<p>${esc(surface.notes)}</p>` : ''}${participant ? `<h4>Selected actor</h4><p><strong>${esc(actorLabel(participant.actor_id))}</strong><br>${esc(participant.role || humanLabel(participant.participation_type))}</p><div class="aperture-badge-row">${evidenceBadge(participant.evidence_class)}<span class="aperture-badge">${esc(windowLabel(participant.time_start, participant.time_end))}</span></div>` : '<p>Select an actor bracket to inspect its exact role, evidence class, dates, and receipts.</p>'}${receiptHealthBadges(ids)}${receiptButtons(ids)}<div class="aperture-actions">${participant ? `<button type="button" data-ap-action="open-record" data-actor-id="${esc(participant.actor_id)}">Open actor record</button><button type="button" data-ap-action="route-from-selection">Route from actor</button>${workspaceCompareAction('actor', participant.actor_id, 'Compare actor')}` : ''}<button type="button" data-ap-action="surface-from-selection">Open roster view</button>${workspaceCompareAction('surface', surface.surface_id, 'Compare surface')}<button type="button" data-ap-action="${state.map.level === 'evidence' ? 'zoom-out' : 'zoom-in'}">${state.map.level === 'evidence' ? 'Back to topology' : 'Inspect evidence rows'}</button></div>`;
}

function renderMapOverview(cluster, group, surface) {
  if (state.map.level === 'corpus') {
    const clusters = summarizeClusters(state.data.surfaceGraph);
    setOverview({
      title: 'Surface families in the whole corpus.',
      status: `${clusters.length} families. Corridor counts are cross-family actor recurrence, not actor adjacency.`,
      headers: ['Surface family', 'Bounded surfaces', 'Actors', 'Hop-eligible', 'Context-only'],
      rows: clusters.map(item => `<tr class="${item.id === state.map.selectedClusterId ? 'is-selected' : ''}"><td><button type="button" class="aperture-table-link" data-ap-cluster="${esc(item.id)}">${esc(item.label)}</button></td><td>${item.surfaceCount}</td><td>${item.actorCount}</td><td>${item.hopEligible}</td><td>${item.contextOnly}</td></tr>`).join('')
    });
    return;
  }
  if (state.map.level === 'machine') {
    const groups = surfaceTypeGroups(state.data.surfaceGraph, cluster.id);
    setOverview({
      title: `Surface types inside ${cluster.label}.`,
      status: `${groups.length} compiler types retain ${cluster.surfaceCount} separately bounded surfaces.`,
      headers: ['Surface type', 'Surfaces', 'Actors', 'Hop-eligible', 'Context-only'],
      rows: groups.map(item => `<tr class="${item.id === state.map.selectedTypeId ? 'is-selected' : ''}"><td><button type="button" class="aperture-table-link" data-ap-type="${esc(item.id)}">${esc(item.label)}</button></td><td>${item.surfaceCount}</td><td>${item.actorCount}</td><td>${item.hopEligible}</td><td>${item.surfaceCount - item.hopEligible}</td></tr>`).join('')
    });
    return;
  }
  const participants = sortedParticipants(surface);
  setOverview({
    title: `Participation rows on ${surface.surface_label}.`,
    status: `${participants.length} actor rows. The table carries labels the map deliberately suppresses.`,
    headers: ['Actor', 'Recorded role', 'Dates', 'Evidence', 'Receipts'],
    rows: participants.map(participant => `<tr class="${participant.actor_id === state.map.selectedActorId ? 'is-selected' : ''}"><td><button type="button" class="aperture-table-link" data-ap-actor="${esc(participant.actor_id)}">${esc(actorLabel(participant.actor_id))}</button><small>${esc(participant.actor_id)}</small></td><td>${esc(participant.role || humanLabel(participant.participation_type))}<small>${esc(humanLabel(participant.participation_type))}</small></td><td>${esc(windowLabel(participant.time_start, participant.time_end))}</td><td>${evidenceBadge(participant.evidence_class)}</td><td>${(participant.receipt_ids ?? []).length}</td></tr>`).join('')
  });
}
