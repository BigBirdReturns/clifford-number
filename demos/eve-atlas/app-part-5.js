function populateDenseSurfaceSelect() {
  const dense = denseSurfaces(state.data.surfaceGraph, { minimumActors: 2 }).slice(0, 30);
  const select = $('#dense-surface-select');
  select.innerHTML = dense.map(item => `<option value="${esc(item.surface.surface_id)}">${esc(shortLabel(item.surface.surface_label, 70))} · ${item.actorCount} actors</option>`).join('');
  if (!dense.some(item => item.surface.surface_id === state.dense.surfaceId)) state.dense.surfaceId = dense[0]?.surface.surface_id ?? null;
  select.value = state.dense.surfaceId ?? '';
}

function denseScene(surface, selection) {
  const groups = groupDenseSurface(surface).slice(0, 10);
  const groupMarkup = groups.map((group, index) => {
    const point = stableRingPosition(index, groups.length, 600, 360, 475, 285, -Math.PI / 2);
    const radius = Math.max(30, Math.min(58, 24 + Math.sqrt(group.count) * 6));
    return `<g transform="translate(${point.x} ${point.y})">
      <circle class="group-bubble${group.count >= 8 ? ' is-large' : ''}" r="${radius}"/>
      <text class="group-count" y="-2" text-anchor="middle">${group.count}</text>
      <text class="tiny-label" y="18" text-anchor="middle">${esc(shortLabel(group.label, 20))}</text>
    </g>`;
  }).join('');

  const visible = selection.visible;
  const brackets = visible.map((participant, index) => {
    const ring = index % 2;
    const slot = Math.floor(index / 2);
    const count = Math.ceil(visible.length / 2);
    const point = stableRingPosition(slot, count, 600, 375, ring ? 285 : 175, ring ? 170 : 105, ring ? -Math.PI / 2 + .18 : -Math.PI / 2);
    const pinned = state.dense.pinned.has(participant.actor_id);
    const selected = state.dense.selectedActorId === participant.actor_id;
    return `<g class="actor-bracket interactive${pinned ? ' is-pinned' : ''}${selected ? ' is-selected' : ''}${evidenceRank(participant.evidence_class) >= evidenceRank('judgment') ? ' is-warning' : ''}" data-dense-actor-id="${esc(participant.actor_id)}" transform="translate(${point.x} ${point.y})" tabindex="0" role="button" aria-label="${esc(`${actorLabel(participant.actor_id)}, ${participant.role}, ${pinned ? 'pinned' : 'not pinned'}`)}">
      <circle class="focus-ring" r="22"/>
      <circle class="actor-core" r="12"/>
      <path class="actor-tick" d="M-17 -6 V-15 H-8 M17 -6 V-15 H8 M-17 6 V15 H-8 M17 6 V15 H8" fill="none"/>
      <text class="tiny-label" y="-23" text-anchor="middle">${esc(shortLabel(actorLabel(participant.actor_id), 23))}</text>
    </g>`;
  }).join('');

  const hidden = selection.hiddenByBudget;
  return `<g class="dense-scene">
    <rect class="surface-container" x="150" y="75" width="900" height="570" rx="48"/>
    <text class="label" x="600" y="112" text-anchor="middle">${esc(shortLabel(surface.surface_label, 62))}</text>
    <text class="sublabel" x="600" y="136" text-anchor="middle">${actorParticipants(surface).length} documented actors · ${surface.hop_eligible ? 'hop-eligible' : 'context-only'} · no pairwise lines</text>
    ${groupMarkup}
    ${brackets}
    <g transform="translate(600 375)">
      <rect class="surface-diamond" x="-34" y="-34" width="68" height="68" rx="5" transform="rotate(45)"/>
      <text class="group-count" y="5" text-anchor="middle">${selection.visible.length}</text>
      <text class="tiny-label" y="64" text-anchor="middle">visible brackets</text>
    </g>
    ${hidden ? `<g transform="translate(600 565)"><circle class="aggregate-node" r="31"/><text class="label" y="4" text-anchor="middle">+${hidden}</text><text class="tiny-label" y="48" text-anchor="middle">eligible actors aggregated by the bracket budget</text></g>` : ''}
  </g>`;
}

function denseInspector(surface, selection) {
  const groups = groupDenseSurface(surface);
  const selectedParticipant = actorParticipants(surface).find(item => item.actor_id === state.dense.selectedActorId);
  const evidenceCounts = new Map();
  for (const participant of actorParticipants(surface)) {
    const evidence = normalizeEvidence(participant.evidence_class);
    evidenceCounts.set(evidence, (evidenceCounts.get(evidence) ?? 0) + 1);
  }
  $('#dense-inspector').innerHTML = `<p class="eyebrow">Bounded roster container</p>
    <h3>${esc(surface.surface_label)}</h3>
    <p>${esc(surface.notes || 'Participants remain attached to one bounded surface. The visualization groups roles and limits individual brackets without creating participant-to-participant adjacency.')}</p>
    <div class="metric-grid">
      <div class="metric-card"><strong>${selection.totalActors}</strong><span>documented actors</span></div>
      <div class="metric-card"><strong>${selection.visible.length}</strong><span>visible brackets</span></div>
      <div class="metric-card"><strong>${selection.hiddenByBudget}</strong><span>budget-aggregated</span></div>
      <div class="metric-card"><strong>${selection.filteredOut}</strong><span>query-filtered</span></div>
    </div>
    <div class="badge-row"><span class="badge ${surface.hop_eligible ? 'badge--official' : 'badge--reported'}">${surface.hop_eligible ? 'Hop-eligible' : 'No hop effect'}</span>${[...evidenceCounts.entries()].sort((a, b) => evidenceRank(a[0]) - evidenceRank(b[0])).map(([kind, count]) => `<span class="badge badge--${esc(kind)}">${count} ${esc(humanLabel(kind))}</span>`).join('')}</div>
    <h4>Role groups</h4>
    <ul>${groups.slice(0, 7).map(group => `<li>${group.count} ${esc(group.label)}</li>`).join('')}</ul>
    ${selectedParticipant ? `<h4>Selected bracket</h4><p><strong>${esc(actorLabel(selectedParticipant.actor_id))}</strong><br>${esc(selectedParticipant.role || humanLabel(selectedParticipant.participation_type))}</p><div class="badge-row">${evidenceBadge(selectedParticipant.evidence_class)}<span class="badge">${esc(windowLabel(selectedParticipant.time_start, selectedParticipant.time_end))}</span>${state.dense.pinned.has(selectedParticipant.actor_id) ? '<span class="badge badge--official">Pinned</span>' : ''}</div>${receiptHealthMarkup(selectedParticipant.receipt_ids)}` : '<p>Select or pin an actor bracket to preserve it through subsequent filtering.</p>'}`;
}

function toggleDensePin(actorId) {
  if (state.dense.pinned.has(actorId)) state.dense.pinned.delete(actorId);
  else state.dense.pinned.add(actorId);
  state.dense.selectedActorId = actorId;
  renderDense();
}

function bindDenseInteractions() {
  const activate = element => toggleDensePin(element.dataset.denseActorId);
  for (const element of $$('[data-dense-actor-id]')) {
    element.addEventListener('click', event => { event.stopPropagation(); activate(element); });
    element.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      activate(element);
    });
  }
}

function renderDense() {
  if (!state.data) return;
  const surface = state.surfaces.get(state.dense.surfaceId);
  if (!surface) {
    $('#dense-layer').innerHTML = '';
    $('#dense-inspector').innerHTML = '<p>No dense surface is available.</p>';
    return;
  }
  state.dense.query = $('#dense-search')?.value ?? state.dense.query;
  state.dense.asOf = $('#dense-asof')?.value.trim() ?? state.dense.asOf;
  state.dense.evidenceFloor = $('#dense-evidence')?.value ?? state.dense.evidenceFloor;
  state.dense.budget = Number($('#dense-budget')?.value ?? state.dense.budget);
  const labels = new Map([...state.actors].map(([id, actor]) => [id, actor.label]));
  const selection = selectBudgetedParticipants(surface, {
    query: state.dense.query,
    asOf: state.dense.asOf,
    evidenceFloor: state.dense.evidenceFloor,
    budget: state.dense.budget,
    pinnedIds: state.dense.pinned,
    labels
  });
  $('#dense-budget-output').value = String(state.dense.budget);
  $('#dense-budget-output').textContent = String(state.dense.budget);
  $('#dense-visible-count').textContent = String(selection.visible.length);
  $('#dense-layer').innerHTML = denseScene(surface, selection);
  denseInspector(surface, selection);
  $('#dense-overview-status').textContent = `${selection.visible.length} rows remain stable. ${selection.hiddenByBudget} eligible actors are aggregated by the bracket budget; ${selection.filteredOut} are outside the current query.`;
  $('#dense-table-body').innerHTML = selection.visible.length ? selection.visible.map(participant => {
    const pinned = state.dense.pinned.has(participant.actor_id);
    return `<tr class="${pinned ? 'is-pinned' : ''}" data-dense-actor-id="${esc(participant.actor_id)}">
      <td><button class="pin-button" type="button" data-dense-actor-id="${esc(participant.actor_id)}" aria-pressed="${String(pinned)}">${pinned ? 'Unpin' : 'Pin'}</button></td>
      <td><strong>${esc(actorLabel(participant.actor_id))}</strong><small>${esc(participant.actor_id)}</small></td>
      <td>${esc(participant.role || humanLabel(participant.participation_type))}<small>${esc(humanLabel(participant.participation_type))}</small></td>
      <td>${esc(windowLabel(participant.time_start, participant.time_end))}</td>
      <td>${evidenceBadge(participant.evidence_class)}</td>
      <td>${participant.receipt_ids?.length ?? 0}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="6">No participant survives the current search, date, and evidence controls.</td></tr>';
  bindDenseInteractions();
}

function initDense() {
  populateDenseSurfaceSelect();
  $('#dense-search').addEventListener('input', renderDense);
  $('#dense-evidence').addEventListener('change', renderDense);
  $('#dense-asof').addEventListener('change', renderDense);
  $('#dense-budget').addEventListener('input', renderDense);
  $('#dense-surface-select').addEventListener('change', event => {
    state.dense.surfaceId = event.target.value;
    state.dense.pinned.clear();
    state.dense.selectedActorId = null;
    renderDense();
  });
  $('#dense-clear-pins').addEventListener('click', () => {
    state.dense.pinned.clear();
    state.dense.selectedActorId = null;
    renderDense();
  });
}

async function init() {
  state.data = await loadRepositoryData();
  initializeIndexes();
  setDataStatus();
  initSemantic();
  initRoute();
  initDense();
  initTabs();
}

init().catch(error => {
  console.error(error);
  $('#data-status').textContent = 'The demonstration could not initialize';
  $('#data-status').classList.add('is-fixture');
});
