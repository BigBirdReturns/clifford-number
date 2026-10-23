function renderDenseScene(surface, selection) {
  const visible = selection.visible;
  // A roster is a list within one source, so keep the people in reading order.
  // The grid leaves room for every name and role without implying pairwise ties.
  const columns = Math.max(4, Math.ceil(visible.length / 5));
  const cellWidth = 1040 / columns;
  const labelMax = Math.min(30, Math.max(10, Math.floor(cellWidth / 8) - 2));
  const brackets = visible.map((participant, index) => {
    const x = 80 + cellWidth * ((index % columns) + .5);
    const y = 196 + Math.floor(index / columns) * 96;
    return actorBracket(participant, x, y, { selected: participant.actor_id === state.surface.selectedActorId, pinned: state.surface.pinned.has(participant.actor_id), dataAttribute: 'data-ap-surface-actor', labelMax });
  }).join('');
  return `<g class="aperture-scene aperture-scene--dense"><rect class="aperture-surface-container" x="64" y="48" width="1072" height="640" rx="12"/><text class="aperture-node-label" x="600" y="92" text-anchor="middle">${esc(shortLabel(surface.surface_label, 80))}</text><text class="aperture-node-meta" x="600" y="120" text-anchor="middle">${selection.totalActors} documented actors · ${surface.hop_eligible ? 'hop-eligible' : 'context-only'} · no pairwise lines</text>${brackets}<text class="aperture-node-meta" x="600" y="660" text-anchor="middle">${selection.visible.length} people shown${selection.hiddenByBudget ? ` · ${selection.hiddenByBudget} more available using the display limit or search` : ''}</text></g>`;
}

function surfaceInspector(surface, selection, validDate) {
  if (!validDate) return `<p class="aperture-kicker">Invalid temporal control</p><h3>Use a year, month, or ISO day.</h3><p>The roster remains bounded, but no actor bracket is admitted until the date filter is valid.</p>`;
  const participant = actorParticipants(surface).find(item => item.actor_id === state.surface.selectedActorId);
  const groups = groupDenseSurface(surface);
  const evidenceCounts = new Map();
  for (const item of actorParticipants(surface)) {
    const evidence = normalizeEvidence(item.evidence_class);
    evidenceCounts.set(evidence, (evidenceCounts.get(evidence) ?? 0) + 1);
  }
  return `<p class="aperture-kicker">Bounded roster container</p><h3>${esc(surface.surface_label)}</h3><p>${esc(surface.notes || 'Actors remain attached to one bounded surface. Role groups and a bracket budget replace all-to-all adjacency.')}</p><div class="aperture-metric-grid"><div><strong>${selection.totalActors}</strong><span>documented actors</span></div><div><strong>${selection.visible.length}</strong><span>visible brackets</span></div><div><strong>${selection.hiddenByBudget}</strong><span>budget-aggregated</span></div><div><strong>${selection.temporalOrEvidenceFiltered + selection.filteredOut}</strong><span>filtered out</span></div></div><div class="aperture-badge-row"><span class="aperture-badge ${surface.hop_eligible ? 'aperture-badge--official' : 'aperture-badge--reported'}">${surface.hop_eligible ? 'Hop-eligible' : 'No hop effect'}</span>${[...evidenceCounts.entries()].sort((a, b) => evidenceRank(a[0]) - evidenceRank(b[0])).map(([kind, count]) => `<span class="aperture-badge aperture-badge--${esc(kind)}">${count} ${esc(evidenceLabel(kind))}</span>`).join('')}</div><h4>Role groups</h4><ul>${groups.slice(0, 7).map(group => `<li>${group.count} ${esc(group.label)}</li>`).join('')}</ul>${participant ? `<h4>Selected bracket</h4><p><strong>${esc(actorLabel(participant.actor_id))}</strong><br>${esc(participant.role || humanLabel(participant.participation_type))}</p><div class="aperture-badge-row">${evidenceBadge(participant.evidence_class)}<span class="aperture-badge">${esc(windowLabel(participant.time_start, participant.time_end))}</span>${state.surface.pinned.has(participant.actor_id) ? '<span class="aperture-badge aperture-badge--official">Pinned</span>' : ''}</div>${receiptHealthBadges(participant.receipt_ids)}${receiptButtons(participant.receipt_ids)}<div class="aperture-actions"><button type="button" data-ap-action="toggle-pin" data-actor-id="${esc(participant.actor_id)}">${state.surface.pinned.has(participant.actor_id) ? 'Unpin actor' : 'Pin actor'}</button><button type="button" data-ap-action="open-record" data-actor-id="${esc(participant.actor_id)}">Open actor record</button><button type="button" data-ap-action="route-from-selection">Route from actor</button>${workspaceCompareAction('actor', participant.actor_id, 'Compare actor')}${workspaceCompareAction('surface', surface.surface_id, 'Compare surface')}</div>` : `<p>Select a bracket or overview row. Pinning preserves the actor when filters or the budget change.</p><div class="aperture-actions">${workspaceCompareAction('surface', surface.surface_id, 'Compare surface')}</div>`}`;
}

function renderSurfaceOverview(surface, selection, validDate) {
  if (!validDate || !selection.visible.length) {
    setOverview({ title: `Visible brackets on ${surface.surface_label}.`, status: validDate ? 'No participant survives the current query, evidence floor, date, and bracket budget.' : 'Correct the date filter to restore the roster.', headers: ['Pin', 'Actor', 'Recorded role', 'Dates', 'Evidence', 'Receipts'] });
    return;
  }
  setOverview({
    title: `Visible brackets on ${surface.surface_label}.`,
    status: `${selection.visible.length} stable rows. ${selection.hiddenByBudget} eligible actors are held by the bracket budget; ${selection.filteredOut + selection.temporalOrEvidenceFiltered} are outside the current filter.`,
    headers: ['Pin', 'Actor', 'Recorded role', 'Dates', 'Evidence', 'Receipts'],
    rows: selection.visible.map(participant => {
      const pinned = state.surface.pinned.has(participant.actor_id);
      return `<tr class="${participant.actor_id === state.surface.selectedActorId ? 'is-selected' : ''}${pinned ? ' is-pinned' : ''}"><td><button type="button" class="aperture-pin-button" data-ap-action="toggle-pin" data-actor-id="${esc(participant.actor_id)}" aria-pressed="${String(pinned)}">${pinned ? 'Unpin' : 'Pin'}</button></td><td><button type="button" class="aperture-table-link" data-ap-surface-actor="${esc(participant.actor_id)}">${esc(actorLabel(participant.actor_id))}</button><small>${esc(participant.actor_id)}</small></td><td>${esc(participant.role || humanLabel(participant.participation_type))}<small>${esc(humanLabel(participant.participation_type))}</small></td><td>${esc(windowLabel(participant.time_start, participant.time_end))}</td><td>${evidenceBadge(participant.evidence_class)}</td><td>${participant.receipt_ids?.length ?? 0}</td></tr>`;
    }).join('')
  });
}

function renderSurfaceMode() {
  const surface = state.surfaces.get(state.surface.surfaceId);
  if (!surface) return;
  const validDate = !state.surface.asOf || Boolean(periodBounds(state.surface.asOf));
  const labels = new Map([...state.actors].map(([id, actor]) => [id, actor.label]));
  const selection = selectBudgetedParticipants(surface, {
    query: state.surface.query,
    asOf: validDate ? state.surface.asOf : state.surface.asOf,
    evidenceFloor: state.surface.evidenceFloor,
    budget: state.surface.budget,
    pinnedIds: state.surface.pinned,
    labels
  });
  state.surface.selection = selection;
  setStage(renderDenseScene(surface, selection), { title: `Surface · ${surface.surface_label}`, description: 'An aligned roster within one source, with a visible display limit and no participant-to-participant lines.', minWidth: 720 });
  setTelemetry(['Surface', surface.surface_label], [
    { value: selection.visible.length, label: 'visible brackets' },
    { value: selection.hiddenByBudget, label: 'budget-held' },
    { value: state.surface.pinned.size, label: 'pinned' },
    { value: surface.hop_eligible ? 'yes' : 'no', label: 'hop effect' }
  ]);
  setInspector(state.surface.selectedActorId ? actorLabel(state.surface.selectedActorId) : surface.surface_label, surfaceInspector(surface, selection, validDate));
  renderSurfaceOverview(surface, selection, validDate);
}
