function semanticInspector(level, cluster, surface) {
  const inspector = $('#semantic-inspector');
  if (!cluster) {
    inspector.innerHTML = '<p>No compiled surfaces are available.</p>';
    return;
  }

  if (level === 'corpus') {
    const evidence = Object.entries(cluster.evidenceCounts).sort((a, b) => evidenceRank(a[0]) - evidenceRank(b[0]));
    inspector.innerHTML = `<p class="eyebrow">Selected surface family</p>
      <h3>${esc(cluster.label)}</h3>
      <p>This aggregate is a projection over bounded surfaces. Corridors count actors documented across more than one surface family. They are not Clifford hops.</p>
      <div class="metric-grid">
        <div class="metric-card"><strong>${cluster.surfaceCount}</strong><span>bounded surfaces</span></div>
        <div class="metric-card"><strong>${cluster.actorCount}</strong><span>distinct actors</span></div>
        <div class="metric-card"><strong>${cluster.hopEligible}</strong><span>hop-eligible</span></div>
        <div class="metric-card"><strong>${cluster.contextOnly}</strong><span>context-only</span></div>
      </div>
      <h4>Participation evidence</h4>
      <div class="badge-row">${evidence.map(([kind, count]) => `<span class="badge badge--${esc(kind)}">${count} ${esc(humanLabel(kind))}</span>`).join('')}</div>
      <p>Move closer to decompose this family into specific surface types.</p>`;
    return;
  }

  if (level === 'machine') {
    const groups = surfaceTypeGroups(state.data.surfaceGraph, cluster.id);
    const selected = groups.find(group => group.id === state.semantic.selectedType) ?? groups[0];
    inspector.innerHTML = `<p class="eyebrow">Surface factory projection</p>
      <h3>${esc(selected?.label || cluster.label)}</h3>
      <p>${selected ? `${selected.surfaceCount} bounded surface${selected.surfaceCount === 1 ? '' : 's'} share this compiler type. The type groups objects for navigation; each bounded surface remains separately inspectable.` : 'No surface types are available.'}</p>
      ${selected ? `<div class="metric-grid">
        <div class="metric-card"><strong>${selected.surfaceCount}</strong><span>surfaces</span></div>
        <div class="metric-card"><strong>${selected.actorCount}</strong><span>actors</span></div>
        <div class="metric-card"><strong>${selected.hopEligible}</strong><span>hop-eligible</span></div>
        <div class="metric-card"><strong>${selected.surfaceCount - selected.hopEligible}</strong><span>context-only</span></div>
      </div>
      <h4>Included bounded objects</h4><ul>${selected.surfaces.slice(0, 7).map(item => `<li>${esc(item.surface_label)}</li>`).join('')}</ul>` : ''}
      <p>Select a type or move closer to reveal one bounded surface and its documented participants.</p>`;
    return;
  }

  if (!surface) {
    inspector.innerHTML = '<p>No bounded surface is selected.</p>';
    return;
  }
  const selectedParticipant = actorParticipants(surface).find(item => item.actor_id === state.semantic.selectedActorId);
  const receipts = [...new Set([
    ...(surface.receipt_ids ?? []),
    ...(selectedParticipant?.receipt_ids ?? [])
  ])];
  inspector.innerHTML = `<p class="eyebrow">${level === 'evidence' ? 'Evidence inspection' : 'Bounded surface'}</p>
    <h3>${esc(surface.surface_label)}</h3>
    <div class="badge-row">
      <span class="badge">${esc(humanLabel(surface.surface_type))}</span>
      <span class="badge ${surface.hop_eligible ? 'badge--official' : 'badge--reported'}">${surface.hop_eligible ? 'Hop-eligible' : 'Context-only'}</span>
    </div>
    <dl>
      <dt>Surface window</dt><dd>${esc(windowLabel(surface.time_start, surface.time_end))}</dd>
      <dt>Actors</dt><dd>${actorParticipants(surface).length}</dd>
      <dt>Graph effect</dt><dd>${surface.hop_eligible ? 'Potential hop basis when all compiler rules pass' : 'No actor-to-actor hop'}</dd>
    </dl>
    ${surface.notes ? `<p>${esc(surface.notes)}</p>` : ''}
    ${selectedParticipant ? `<h4>Selected participation</h4>
      <p><strong>${esc(actorLabel(selectedParticipant.actor_id))}</strong><br>${esc(selectedParticipant.role || humanLabel(selectedParticipant.participation_type))}</p>
      <div class="badge-row">${evidenceBadge(selectedParticipant.evidence_class)}<span class="badge">${esc(windowLabel(selectedParticipant.time_start, selectedParticipant.time_end))}</span></div>` : '<p>Select an actor bracket to inspect the exact participation row.</p>'}
    ${receiptHealthMarkup(receipts)}
    <p>The intervening surface remains visible because the display must not imply more than shared documented context.</p>`;
}

function bindSemanticSceneInteractions() {
  const layer = $('#semantic-layer');
  const activate = element => {
    if (element.dataset.clusterId) {
      state.semantic.selectedCluster = element.dataset.clusterId;
      state.semantic.selectedType = null;
      const cluster = selectedClusterRecord();
      state.semantic.selectedSurfaceId = cluster?.surfaces[0]?.surface_id ?? null;
      state.semantic.selectedActorId = null;
      populateSemanticControls();
      setSemanticScale(Math.max(state.semantic.scale, 1.8));
      return;
    }
    if (element.dataset.surfaceType) {
      state.semantic.selectedType = element.dataset.surfaceType;
      const group = surfaceTypeGroups(state.data.surfaceGraph, state.semantic.selectedCluster).find(item => item.id === state.semantic.selectedType);
      state.semantic.selectedSurfaceId = group?.surfaces[0]?.surface_id ?? state.semantic.selectedSurfaceId;
      state.semantic.selectedActorId = null;
      populateSemanticSurfaceSelect();
      setSemanticScale(Math.max(state.semantic.scale, 3));
      return;
    }
    if (element.dataset.surfaceId) {
      state.semantic.selectedSurfaceId = element.dataset.surfaceId;
      populateSemanticSurfaceSelect();
      setSemanticScale(Math.max(state.semantic.scale, 3));
      return;
    }
    if (element.dataset.actorId) {
      state.semantic.selectedActorId = element.dataset.actorId;
      setSemanticScale(Math.max(state.semantic.scale, 4.15));
    }
  };
  for (const element of layer.querySelectorAll('[data-cluster-id], [data-surface-type], [data-surface-id], [data-actor-id]')) {
    element.addEventListener('click', event => { event.stopPropagation(); activate(element); });
    element.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault();
      activate(element);
    });
  }
}

function renderSemantic() {
  if (!state.data) return;
  ensureSemanticSelection();
  const clusters = summarizeClusters(state.data.surfaceGraph);
  const cluster = selectedClusterRecord();
  const surface = state.surfaces.get(state.semantic.selectedSurfaceId);
  const level = semanticLevel(state.semantic.scale);
  $('#semantic-level').textContent = humanLabel(level);
  $('#semantic-scale').value = String(state.semantic.scale);
  let markup = '';
  if (level === 'corpus') markup = renderCorpusScene(clusters);
  else if (level === 'machine') markup = renderMachineScene(cluster);
  else if (level === 'surface') markup = renderSurfaceScene(surface);
  else markup = renderEvidenceScene(surface);
  $('#semantic-layer').innerHTML = markup;
  semanticInspector(level, cluster, surface);
  bindSemanticSceneInteractions();
}

function initSemantic() {
  populateSemanticControls();
  $('#semantic-scale').addEventListener('input', event => setSemanticScale(event.target.value));
  $('#semantic-zoom-out').addEventListener('click', () => setSemanticScale(state.semantic.scale - .8));
  $('#semantic-zoom-in').addEventListener('click', () => setSemanticScale(state.semantic.scale + .8));
  $('#semantic-reset').addEventListener('click', () => {
    state.semantic.selectedActorId = null;
    state.semantic.selectedType = null;
    setSemanticScale(1);
  });
  $('#semantic-cluster-select').addEventListener('change', event => {
    state.semantic.selectedCluster = event.target.value;
    state.semantic.selectedType = null;
    state.semantic.selectedSurfaceId = null;
    state.semantic.selectedActorId = null;
    populateSemanticSurfaceSelect();
    renderSemantic();
  });
  $('#semantic-surface-select').addEventListener('change', event => {
    state.semantic.selectedSurfaceId = event.target.value;
    state.semantic.selectedActorId = null;
    setSemanticScale(Math.max(3, state.semantic.scale));
  });
  $('#semantic-svg').addEventListener('wheel', event => {
    event.preventDefault();
    setSemanticScale(state.semantic.scale + (event.deltaY > 0 ? -.18 : .18));
  }, { passive: false });
}
