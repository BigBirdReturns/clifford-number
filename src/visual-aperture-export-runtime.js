let apertureExportStatusTimer = null;

function initializePublicationExport() {
  state.export = { open: false, packet: null, status: '' };
}

function exportShellMarkup() {
  return `<section id="aperture-export" class="aperture-export" aria-labelledby="aperture-export-title" hidden>
    <div class="aperture-export-heading">
      <div><p class="section-kicker">Publication packet</p><h3 id="aperture-export-title">Export the view with its limits attached.</h3><p>The caption, evidence JSON, exact-view URL, and print table are regenerated from the current compiled artifacts. Exporting does not create a finding or detach the inference boundary.</p></div>
      <button type="button" class="aperture-secondary-button" data-ap-action="export-close">Close</button>
    </div>
    <p id="aperture-export-status" class="aperture-export-status" role="status" aria-live="polite"></p>
    <div class="aperture-export-actions">
      <button type="button" data-ap-action="export-copy-caption">Copy caption</button>
      <button type="button" data-ap-action="export-copy-json">Copy evidence JSON</button>
      <button type="button" data-ap-action="export-download-json">Download evidence JSON</button>
      <button type="button" data-ap-action="export-print">Print packet</button>
    </div>
    <div class="aperture-export-grid">
      <label class="aperture-export-caption"><span>Copy-ready caption</span><textarea id="aperture-export-caption" readonly rows="10"></textarea></label>
      <div class="aperture-export-meta"><h4>Packet contract</h4><dl id="aperture-export-meta"></dl><p id="aperture-export-boundary" class="aperture-muted"></p></div>
    </div>
    <details class="aperture-export-json"><summary>Inspect evidence JSON</summary><pre id="aperture-export-json"></pre></details>
    <div class="aperture-export-table-wrap"><table><thead id="aperture-export-table-head"></thead><tbody id="aperture-export-table-body"></tbody></table></div>
  </section>
  <section id="aperture-print-export" class="aperture-print-export" aria-hidden="true"></section>`;
}

function exportActionMarkup() {
  return '<button type="button" class="aperture-secondary-button" data-ap-action="export-toggle" aria-controls="aperture-export" aria-expanded="false">Export</button>';
}

function exportSetStatus(message) {
  if (!state.export) return;
  state.export.status = message;
  const node = $('#aperture-export-status', state.root);
  if (node) node.textContent = message;
  clearTimeout(apertureExportStatusTimer);
  apertureExportStatusTimer = setTimeout(() => {
    if (!state.export) return;
    state.export.status = '';
    const current = $('#aperture-export-status', state.root);
    if (current) current.textContent = '';
  }, 2600);
}

function exportParticipantRow(item, { pinned = false } = {}) {
  return {
    actor_id: item.actor_id,
    actor_label: actorLabel(item.actor_id),
    role: item.role || humanLabel(item.participation_type),
    participation_type: item.participation_type,
    time_start: item.time_start,
    time_end: item.time_end,
    evidence_class: item.evidence_class,
    receipt_ids: item.receipt_ids ?? [],
    pinned
  };
}

function exportSurfaceRow(surface) {
  return {
    surface_id: surface.surface_id,
    surface_label: surface.surface_label,
    surface_type: surface.surface_type,
    hop_eligible: surface.hop_eligible,
    time_start: surface.time_start,
    time_end: surface.time_end,
    receipt_ids: surface.receipt_ids ?? []
  };
}

function currentMapExportView() {
  ensureMapSelection();
  const clusters = summarizeClusters(state.data.surfaceGraph);
  const cluster = clusters.find(item => item.id === state.map.selectedClusterId) ?? clusters[0];
  const groups = surfaceTypeGroups(state.data.surfaceGraph, cluster?.id);
  const group = groups.find(item => item.id === state.map.selectedTypeId) ?? null;
  const surface = state.surfaces.get(state.map.selectedSurfaceId) ?? null;
  const participants = surface ? sortedParticipants(surface).map(item => exportParticipantRow(item)) : [];
  return {
    level: state.map.level,
    scale: state.map.scale,
    surface_count: state.surfaces.size,
    selected_family: cluster ? { id: cluster.id, label: cluster.label } : null,
    selected_type: group ? { id: group.id, label: group.label } : null,
    surface: surface ? exportSurfaceRow(surface) : null,
    families: clusters.map(item => ({
      id: item.id,
      label: item.label,
      surface_count: item.surfaceCount,
      actor_count: item.actorCount,
      hop_eligible: item.hopEligible,
      context_only: item.contextOnly
    })),
    surface_types: groups.map(item => ({
      id: item.id,
      label: item.label,
      surface_count: item.surfaceCount,
      actor_count: item.actorCount,
      hop_eligible: item.hopEligible,
      context_only: item.surfaceCount - item.hopEligible
    })),
    corridors: computeCorridors(state.data.surfaceGraph).slice(0, 18).map(item => ({
      from_family_id: item.from,
      to_family_id: item.to,
      shared_actor_count: item.actorCount
    })),
    participants
  };
}

function currentRouteExportView() {
  const temporalInputValid = !state.route.asOf || Boolean(periodBounds(state.route.asOf));
  const filters = { evidenceFloor: state.route.evidenceFloor, asOf: temporalInputValid ? state.route.asOf : '' };
  const path = temporalInputValid ? shortestFilteredPath(state.data.hopGraph, state.route.fromId, state.route.toId, filters) : null;
  const diagnostics = diagnosePathFilters(state.data.hopGraph, filters);
  return {
    from: { actor_id: state.route.fromId, actor_label: actorLabel(state.route.fromId) },
    to: { actor_id: state.route.toId, actor_label: actorLabel(state.route.toId) },
    as_of: state.route.asOf,
    temporal_input_valid: temporalInputValid,
    evidence_floor: state.route.evidenceFloor,
    path: path ? {
      hops: path.hops.map(hop => ({
        from: { actor_id: hop.from, actor_label: actorLabel(hop.from) },
        to: { actor_id: hop.to, actor_label: actorLabel(hop.to) },
        surface: {
          surface_id: hop.basis.surface_id,
          surface_label: hop.basis.surface_label,
          surface_type: hop.basis.surface_type,
          from_role: roleFor(hop.basis, hop.edge, hop.from),
          to_role: roleFor(hop.basis, hop.edge, hop.to),
          evidence_class: hop.basis.evidence_class,
          valid_from: hop.basis.valid_from,
          valid_until: hop.basis.valid_until,
          temporal_status: hop.basis.temporal_status,
          receipt_ids: hop.basis.receipt_ids ?? []
        }
      }))
    } : null,
    diagnostics: {
      total_edges: diagnostics.totalEdges,
      traversable_edges: diagnostics.traversableEdges,
      evidence_blocked_bases: diagnostics.evidenceBlockedBases,
      time_blocked_bases: diagnostics.timeBlockedBases,
      undated_blocked_bases: diagnostics.undatedBlockedBases
    }
  };
}

function currentSurfaceExportView() {
  const surface = state.surfaces.get(state.surface.surfaceId);
  if (!surface) throw new Error('No bounded surface is selected');
  const temporalInputValid = !state.surface.asOf || Boolean(periodBounds(state.surface.asOf));
  const labels = new Map([...state.actors].map(([id, value]) => [id, value.label]));
  const selection = selectBudgetedParticipants(surface, {
    query: state.surface.query,
    asOf: temporalInputValid ? state.surface.asOf : state.surface.asOf,
    evidenceFloor: state.surface.evidenceFloor,
    budget: state.surface.budget,
    pinnedIds: state.surface.pinned,
    labels
  });
  return {
    surface: exportSurfaceRow(surface),
    query: state.surface.query,
    as_of: state.surface.asOf,
    temporal_input_valid: temporalInputValid,
    evidence_floor: state.surface.evidenceFloor,
    bracket_budget: state.surface.budget,
    total_actors: selection.totalActors,
    visible_participants: selection.visible.map(item => exportParticipantRow(item, { pinned: state.surface.pinned.has(item.actor_id) })),
    hidden_by_budget: selection.hiddenByBudget,
    filtered_out: selection.filteredOut + selection.temporalOrEvidenceFiltered,
    pinned_actor_ids: [...state.surface.pinned]
  };
}

function buildCurrentPublicationPacket() {
  const exactViewUrl = buildApertureUrl(apertureSnapshot(), location.href);
  const view = state.mode === 'map'
    ? currentMapExportView()
    : state.mode === 'route'
      ? currentRouteExportView()
      : currentSurfaceExportView();
  return buildApertureExportPacket({
    mode: state.mode,
    exactViewUrl,
    generatedAt: new Date().toISOString(),
    view
  });
}

function exportTableMarkup(table) {
  const columns = table?.columns ?? [];
  const rows = table?.rows ?? [];
  return {
    head: `<tr>${columns.map(column => `<th scope="col">${esc(column)}</th>`).join('')}</tr>`,
    body: rows.length
      ? rows.map(row => `<tr>${row.map(value => `<td>${esc(value)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${Math.max(1, columns.length)}">No table rows survive the current controls.</td></tr>`
  };
}

function renderPrintPublicationPacket(packet) {
  const table = exportTableMarkup(packet.view.table);
  $('#aperture-print-export', state.root).innerHTML = `<header><p>The Clifford Number · publication packet</p><h1>${esc(packet.title)}</h1><p>${esc(packet.caption)}</p><dl><div><dt>Generated</dt><dd>${esc(packet.generated_at)}</dd></div><div><dt>Exact view</dt><dd>${esc(packet.exact_view_url)}</dd></div><div><dt>Receipt IDs</dt><dd>${esc(packet.receipt_ids.join(', ') || 'none attached to this aggregate view')}</dd></div></dl></header><table><thead>${table.head}</thead><tbody>${table.body}</tbody></table><footer>${esc(packet.interpretation_contract.caveat)}</footer>`;
}

function renderPublicationExportPanel() {
  const panel = $('#aperture-export', state.root);
  if (!panel || !state.export) return;
  panel.hidden = !state.export.open;
  for (const button of $$('[data-ap-action="export-toggle"]', state.root)) button.setAttribute('aria-expanded', String(state.export.open));
  if (!state.export.open) return;
  const packet = buildCurrentPublicationPacket();
  state.export.packet = packet;
  const json = JSON.stringify(packet, null, 2);
  $('#aperture-export-status', state.root).textContent = state.export.status;
  $('#aperture-export-caption', state.root).value = packet.caption;
  $('#aperture-export-json', state.root).textContent = json;
  $('#aperture-export-boundary', state.root).textContent = packet.interpretation_contract.caveat;
  $('#aperture-export-meta', state.root).innerHTML = `<div><dt>Mode</dt><dd>${esc(humanLabel(packet.mode))}</dd></div><div><dt>Schema</dt><dd>${esc(packet.schema_version)}</dd></div><div><dt>Receipt IDs</dt><dd>${packet.receipt_ids.length}</dd></div><div><dt>Graph effect</dt><dd>${esc(packet.interpretation_contract.graph_effect)}</dd></div><div><dt>Exact view</dt><dd><a href="${esc(packet.exact_view_url)}">Open link</a></dd></div>`;
  const table = exportTableMarkup(packet.view.table);
  $('#aperture-export-table-head', state.root).innerHTML = table.head;
  $('#aperture-export-table-body', state.root).innerHTML = table.body;
  renderPrintPublicationPacket(packet);
}

function refreshPublicationExport() {
  if (state.export?.open) renderPublicationExportPanel();
}

async function copyPublicationValue(value, successMessage) {
  try {
    await writeApertureClipboard(value);
    exportSetStatus(successMessage);
  } catch (error) {
    console.warn('Could not copy aperture export value.', error);
    exportSetStatus('Copy failed. Select the visible field manually.');
  }
}

function downloadPublicationJson(packet) {
  const blob = new Blob([JSON.stringify(packet, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = apertureExportFilename(packet);
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  exportSetStatus('Evidence JSON downloaded.');
}

function handleExportAction(button) {
  const action = button.dataset.apAction;
  if (action === 'export-toggle') {
    state.export.open = !state.export.open;
    renderPublicationExportPanel();
    return true;
  }
  if (action === 'export-close') {
    state.export.open = false;
    renderPublicationExportPanel();
    return true;
  }
  if (!action?.startsWith('export-')) return false;
  const packet = buildCurrentPublicationPacket();
  state.export.packet = packet;
  renderPublicationExportPanel();
  if (action === 'export-copy-caption') {
    copyPublicationValue(packet.caption, 'Caption copied with exact URL and inference boundary.');
    return true;
  }
  if (action === 'export-copy-json') {
    copyPublicationValue(JSON.stringify(packet, null, 2), 'Evidence JSON copied.');
    return true;
  }
  if (action === 'export-download-json') {
    downloadPublicationJson(packet);
    return true;
  }
  if (action === 'export-print') {
    renderPrintPublicationPacket(packet);
    window.print();
    return true;
  }
  return false;
}
