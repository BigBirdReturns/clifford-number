const APERTURE_EXPORT_PREVIEW_ROW_LIMIT = 100;
const boundedOriginalHandleExportAction = handleExportAction;

function boundedExportTableMarkup(table, limit = APERTURE_EXPORT_PREVIEW_ROW_LIMIT) {
  const columns = table?.columns ?? [];
  const rows = table?.rows ?? [];
  const visible = Number.isFinite(limit) ? rows.slice(0, Math.max(0, limit)) : rows;
  return {
    head: `<tr>${columns.map(column => `<th scope="col">${esc(column)}</th>`).join('')}</tr>`,
    body: visible.length
      ? visible.map(row => `<tr>${row.map(value => `<td>${esc(value)}</td>`).join('')}</tr>`).join('')
      : `<tr><td colspan="${Math.max(1, columns.length)}">No table rows survive the current controls.</td></tr>`,
    totalRows: rows.length,
    visibleRows: visible.length,
    truncated: visible.length < rows.length
  };
}

exportTableMarkup = function boundedExportTablePreview(table) {
  return boundedExportTableMarkup(table, APERTURE_EXPORT_PREVIEW_ROW_LIMIT);
};

renderPrintPublicationPacket = function boundedRenderPrintPublicationPacket(packet, { complete = false } = {}) {
  const table = boundedExportTableMarkup(packet.view.table, complete ? Number.POSITIVE_INFINITY : APERTURE_EXPORT_PREVIEW_ROW_LIMIT);
  const note = table.truncated ? `<p>Print preview is bounded to ${table.visibleRows} of ${table.totalRows} rows until Print packet is explicitly selected.</p>` : '';
  $('#aperture-print-export', state.root).innerHTML = `<header><p>The Clifford Number · publication packet</p><h1>${esc(packet.title)}</h1><p>${esc(packet.caption)}</p><dl><div><dt>Generated</dt><dd>${esc(packet.generated_at)}</dd></div><div><dt>Exact view</dt><dd>${esc(packet.exact_view_url)}</dd></div><div><dt>Receipt IDs</dt><dd>${esc(packet.receipt_ids.join(', ') || 'none attached to this aggregate view')}</dd></div><div><dt>Complete rows</dt><dd>${table.totalRows}</dd></div></dl>${note}</header><table><thead>${table.head}</thead><tbody>${table.body}</tbody></table><footer>${esc(packet.interpretation_contract.caveat)}</footer>`;
};

renderPublicationExportPanel = function boundedRenderPublicationExportPanel() {
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
  const display = packet.view.display;
  const routeWindow = packet.view.route_window;
  $('#aperture-export-meta', state.root).innerHTML = `<div><dt>Mode</dt><dd>${esc(humanLabel(packet.mode))}</dd></div><div><dt>Schema</dt><dd>${esc(packet.schema_version)}</dd></div><div><dt>Receipt IDs</dt><dd>${packet.receipt_ids.length}</dd></div><div><dt>Graph effect</dt><dd>${esc(packet.interpretation_contract.graph_effect)}</dd></div><div><dt>Complete rows</dt><dd>${packet.view.table.rows.length}</dd></div>${display ? `<div><dt>Browser page</dt><dd>${display.page} / ${display.total_pages} · rows ${display.visible_from}–${display.visible_until}</dd></div>` : ''}${routeWindow ? `<div><dt>Route window</dt><dd>steps ${routeWindow.visible_step_from}–${routeWindow.visible_step_until} of ${routeWindow.total_steps}</dd></div>` : ''}<div><dt>Exact view</dt><dd><a href="${esc(packet.exact_view_url)}">Open link</a></dd></div>`;
  const table = boundedExportTableMarkup(packet.view.table, APERTURE_EXPORT_PREVIEW_ROW_LIMIT);
  $('#aperture-export-table-head', state.root).innerHTML = table.head;
  $('#aperture-export-table-body', state.root).innerHTML = table.body;
  const wrap = $('.aperture-export-table-wrap', state.root);
  let note = $('.aperture-export-preview-note', wrap);
  if (!note) {
    note = document.createElement('p');
    note.className = 'aperture-export-preview-note';
    wrap.prepend(note);
  }
  note.textContent = table.truncated
    ? `Previewing the first ${table.visibleRows} of ${table.totalRows} complete export rows. Copy and download retain every row; Print packet expands the full table only for printing.`
    : `${table.totalRows} complete export row${table.totalRows === 1 ? '' : 's'}.`;
  renderPrintPublicationPacket(packet);
};

handleExportAction = function boundedHandleExportAction(button) {
  if (button.dataset.apAction !== 'export-print') return boundedOriginalHandleExportAction(button);
  const packet = buildCurrentPublicationPacket();
  state.export.packet = packet;
  renderPrintPublicationPacket(packet, { complete: true });
  window.print();
  renderPrintPublicationPacket(packet);
  exportSetStatus('Print dialog opened with the complete packet.');
  return true;
};
