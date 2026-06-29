import { findNode, searchNodes, shortestPath, weakestEvidence } from './src/graph.js';
import { computePathScore, confidenceLabel } from './src/scoring.js';
import { parseScheduleIReviewCsv, scheduleIRowToAddEdgeCommand, validateScheduleIRows } from './src/import-review.js';

const state = {
  manifest: null,
  currentCase: null,
  graph: null,
  selectedNode: null
};

const els = {
  title: document.querySelector('#case-title'),
  subtitle: document.querySelector('#case-subtitle'),
  tagline: document.querySelector('#case-tagline'),
  status: document.querySelector('#case-status'),
  casePicker: document.querySelector('#case-picker'),
  caseSelect: document.querySelector('#case-select'),
  search: document.querySelector('#search'),
  go: document.querySelector('#go'),
  suggestions: document.querySelector('#suggestions'),
  result: document.querySelector('#result'),
  nodeList: document.querySelector('#node-list'),
  graphStats: document.querySelector('#graph-stats'),
  heroMetrics: document.querySelector('#hero-metrics'),
  evidenceBreakdown: document.querySelector('#evidence-breakdown'),
  typeBreakdown: document.querySelector('#type-breakdown'),
  auditBreakdown: document.querySelector('#audit-breakdown'),
  sourceLedger: document.querySelector('#source-ledger'),
  scheduleICsv: document.querySelector('#schedule-i-csv'),
  reviewScheduleI: document.querySelector('#review-schedule-i'),
  importReviewStatus: document.querySelector('#import-review-status'),
  scheduleIReviewOutput: document.querySelector('#schedule-i-review-output')
};

init().catch((error) => {
  console.error(error);
  els.result.className = 'result';
  els.result.innerHTML = `<h2>Graph failed to load.</h2><p>${escapeHtml(error.message)}</p>`;
});

async function init() {
  state.manifest = await loadManifest();
  renderCasePicker();
  const initialCase = state.manifest.cases.find((item) => item.id === state.manifest.default_case_id) ?? state.manifest.cases[0];
  await loadCase(initialCase);
  wireEvents();
}

async function loadManifest() {
  try {
    const response = await fetch('./cases.json');
    if (!response.ok) throw new Error(`Could not load cases.json: ${response.status}`);
    return response.json();
  } catch (error) {
    console.warn(error);
    return {
      default_case_id: 'graph',
      cases: [{ id: 'graph', label: 'The Clifford Number', path: './graph.json' }]
    };
  }
}

async function loadCase(caseMeta) {
  const response = await fetch(caseMeta.path);
  if (!response.ok) throw new Error(`Could not load ${caseMeta.path}: ${response.status}`);
  state.currentCase = caseMeta;
  state.graph = await response.json();
  state.selectedNode = null;
  els.search.value = '';
  renderCaseHeader();
  renderSuggestions('');
  renderGraphStats();
  renderForensicDashboard();
  renderSourceLedger();
  renderNodeList(state.graph.nodes ?? []);
  els.result.className = 'result empty';
  els.result.innerHTML = `
    <div class="empty-state">
      <h2>Pick a node.</h2>
      <p>The app returns the shortest evidenced path to the target node for this case. Type a name; if it is in the public graph, you will see whether it is adjacent and exactly which receipts support the path.</p>
    </div>
  `;
}

function renderCasePicker() {
  if (!els.casePicker || !els.caseSelect || (state.manifest.cases ?? []).length < 2) return;
  els.casePicker.hidden = false;
  els.caseSelect.innerHTML = state.manifest.cases.map((item) => `<option value="${escapeAttr(item.id)}">${escapeHtml(item.label)}</option>`).join('');
}

function renderCaseHeader() {
  els.title.textContent = state.graph.title ?? state.currentCase?.label ?? 'The Clifford Number';
  els.subtitle.textContent = state.graph.subtitle ?? state.currentCase?.description ?? 'Public-role topology with receipts.';
  els.tagline.textContent = state.graph.tagline ?? 'Not conspiracy. Topology.';
  els.status.textContent = state.graph.status ? `${state.graph.status} case file` : 'Public graph case file';
}

function wireEvents() {
  els.search.addEventListener('input', () => renderSuggestions(els.search.value));
  els.search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') computeFromSearch();
  });
  els.go.addEventListener('click', computeFromSearch);
  els.reviewScheduleI?.addEventListener('click', renderScheduleIReview);
  els.caseSelect?.addEventListener('change', async () => {
    const nextCase = state.manifest.cases.find((item) => item.id === els.caseSelect.value);
    if (nextCase) await loadCase(nextCase);
  });
}

function computeFromSearch() {
  const node = findNode(state.graph, els.search.value);
  if (!node) {
    renderNoMatch(els.search.value);
    return;
  }
  selectNode(node);
}

function selectNode(node) {
  state.selectedNode = node;
  els.search.value = node.label;
  renderSuggestions(node.label);
  const path = shortestPath(state.graph, node.id);
  renderPath(node, path);
  document.querySelector('#result')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSuggestions(query) {
  const nodes = searchNodes(state.graph, query, 8);
  els.suggestions.innerHTML = nodes.map((node) => (
    `<button class="suggestion" type="button" data-node-id="${escapeAttr(node.id)}">${escapeHtml(node.label)}</button>`
  )).join('');
  for (const button of els.suggestions.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      const node = state.graph.nodes.find((item) => item.id === button.dataset.nodeId);
      if (node) selectNode(node);
    });
  }
}

function renderGraphStats() {
  const nodes = state.graph.nodes?.length ?? 0;
  const edges = state.graph.edges?.length ?? 0;
  const listed = (state.graph.edges ?? []).filter((edge) => edge.status === 'listed').length;
  const sources = state.graph.sources?.length ?? 0;
  els.graphStats.textContent = `${nodes} public nodes, ${edges} sourced edges, ${sources} receipt sources, and ${listed} listing-only edges are searchable. Type a name to see whether it has a sourced path.`;
  if (els.heroMetrics) {
    els.heroMetrics.innerHTML = [
      metricCard(nodes, 'public nodes'),
      metricCard(edges, 'sourced edges'),
      metricCard(sources, 'receipt sources'),
      metricCard(listed, 'listing-only edges')
    ].join('');
  }
}

function renderForensicDashboard() {
  const edges = state.graph.edges ?? [];
  const nodes = state.graph.nodes ?? [];
  const evidenceCounts = countBy(edges, 'evidence_class');
  const typeCounts = countBy(nodes, 'type');
  const statusCounts = countBy(edges, 'status');
  const openEdges = edges.filter((edge) => edge.evidence_class === 'open').length;
  const interpretiveEdges = edges.filter((edge) => ['derived', 'judgment'].includes(edge.evidence_class)).length;
  const sourcedEveryHop = edges.filter((edge) => Array.isArray(edge.source_ids) && edge.source_ids.length > 0).length;

  els.evidenceBreakdown.innerHTML = renderBars(evidenceCounts, edges.length, ['confirmed', 'primary_public', 'reported', 'derived', 'judgment', 'open']);
  els.typeBreakdown.innerHTML = renderBars(typeCounts, nodes.length, Object.keys(typeCounts).sort((a, b) => typeCounts[b] - typeCounts[a]).slice(0, 8));
  els.auditBreakdown.innerHTML = `
    ${auditItem('Sourced edges', `${sourcedEveryHop}/${edges.length}`, 'Every shipped edge must point to at least one receipt.')}
    ${auditItem('Interpretive edges', interpretiveEdges, 'Derived and judgment edges are flagged as analysis, not standalone fact.')}
    ${auditItem('Open edges', openEdges, 'Open means incomplete or not publication-ready.')}
    ${auditItem('Statuses in play', Object.keys(statusCounts).length, 'Listed, registered, attended, appointed, published, contracted, and public-role states stay separate.')}
  `;
}

function renderSourceLedger() {
  const sourceUsage = new Map();
  for (const edge of state.graph.edges ?? []) {
    for (const sourceId of edge.source_ids ?? []) sourceUsage.set(sourceId, (sourceUsage.get(sourceId) ?? 0) + 1);
  }
  els.sourceLedger.innerHTML = [...(state.graph.sources ?? [])]
    .map((source) => `
      <article class="source-card">
        <div>
          <h3><a href="${escapeAttr(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a></h3>
          <p>${escapeHtml(source.notes || source.publisher || 'Public receipt source.')}</p>
        </div>
        <div class="source-meta">
          <span>${escapeHtml(source.source_type || 'source')}</span>
          <strong>${sourceUsage.get(source.id) ?? 0}</strong>
          <small>edges</small>
        </div>
      </article>
    `).join('');
}

function renderNodeList(nodes) {
  const sorted = [...nodes].sort((a, b) => a.label.localeCompare(b.label));
  els.nodeList.innerHTML = sorted.map((node) => `
    <button class="node-card" type="button" data-node-id="${escapeAttr(node.id)}">
      <strong>${escapeHtml(node.label)}</strong>
      <small>${escapeHtml(node.description || node.type)}</small>
      <span>${escapeHtml(node.type)}</span>
    </button>
  `).join('');
  for (const button of els.nodeList.querySelectorAll('button')) {
    button.addEventListener('click', () => {
      const node = state.graph.nodes.find((item) => item.id === button.dataset.nodeId);
      if (node) selectNode(node);
    });
  }
}

function metricCard(value, label) {
  return `<div class="metric-card"><strong>${escapeHtml(value)}</strong><span>${escapeHtml(label)}</span></div>`;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] ?? 'unknown';
    acc[value] = (acc[value] ?? 0) + 1;
    return acc;
  }, {});
}

function renderBars(counts, total, keys) {
  return keys.map((key) => {
    const value = counts[key] ?? 0;
    const pct = total ? Math.round((value / total) * 100) : 0;
    return `
      <div class="bar-row">
        <div class="bar-label"><strong>${escapeHtml(key)}</strong><span>${value}</span></div>
        <div class="bar-track"><span style="width: ${pct}%"></span></div>
      </div>
    `;
  }).join('');
}

function auditItem(label, value, note) {
  return `
    <div class="audit-item">
      <strong>${escapeHtml(value)}</strong>
      <div><span>${escapeHtml(label)}</span><small>${escapeHtml(note)}</small></div>
    </div>
  `;
}

function renderScheduleIReview() {
  try {
    const rows = validateScheduleIRows(parseScheduleIReviewCsv(els.scheduleICsv?.value ?? ''), state.graph);
    if (!rows.length) {
      els.importReviewStatus.textContent = 'No importable rows found.';
      els.scheduleIReviewOutput.innerHTML = '';
      return;
    }
    const validRows = rows.filter((row) => row.valid);
    els.importReviewStatus.textContent = `${validRows.length}/${rows.length} row${rows.length === 1 ? '' : 's'} ready for review.`;
    els.scheduleIReviewOutput.innerHTML = rows.map((row, index) => {
      const command = row.valid ? scheduleIRowToAddEdgeCommand(row) : '';
      return `
        <article class="review-row">
          <div>
            <h3>${escapeHtml(row.node_label)} → ${escapeHtml(row.recipient_name)}</h3>
            <p><strong>${escapeHtml(row.amount || 'amount n/a')}</strong> ${escapeHtml(row.purpose || 'No purpose text')}</p>
            <small>${escapeHtml(row.source_zip || 'source zip n/a')} ${escapeHtml(row.source_xml || '')}</small>
            ${row.valid ? '<span class="pill primary_public">valid</span>' : `<span class="pill open">hold: ${escapeHtml(row.errors.join('; '))}</span>`}
          </div>
          ${row.valid ? `<label for="review-command-${index}">Proposed command</label>
          <textarea id="review-command-${index}" rows="4" readonly>${escapeHtml(command)}</textarea>` : ''}
        </article>
      `;
    }).join('');
  } catch (error) {
    els.importReviewStatus.textContent = error.message;
    els.scheduleIReviewOutput.innerHTML = '';
  }
}

function renderNoMatch(query) {
  els.result.className = 'result';
  els.result.innerHTML = `
    <div class="empty-state">
      <h2>No node found.</h2>
      <p>No current public graph node matches “${escapeHtml(query)}”, so the app cannot claim adjacency. Add a public-role node and at least one sourced edge to <code>graph.json</code>, then run <code>npm run check</code>.</p>
    </div>
  `;
}

function renderPath(node, path) {
  els.result.className = 'result';
  if (!path) {
    els.result.innerHTML = `
      <div class="empty-state">
        <h2>No path found for ${escapeHtml(node.label)}.</h2>
        <p>The node exists, but there is no evidenced path to ${escapeHtml(targetNode().label)} under the current graph. The map shows silence as silence, not implication.</p>
      </div>
    `;
    return;
  }

  const score = computePathScore(path);
  const confidence = confidenceLabel(score);
  const weak = weakestEvidence(path);

  els.result.innerHTML = `
    <div class="path-header">
      <div>
        <p class="eyebrow">Computed result</p>
        <h2>${escapeHtml(node.label)} has Clifford Number ${path.number}</h2>
        <p>The shortest evidenced path reaches ${escapeHtml(targetNode().label)} in ${path.number} hop${path.number === 1 ? '' : 's'}. Confidence is ${escapeHtml(confidence)} because the weakest evidence class in the path is ${escapeHtml(weak)}. This is the public trail, not an allegation of intent.</p>
        ${renderPathLine(path)}
      </div>
      <div class="number-badge"><span>Number</span><strong>${path.number}</strong></div>
    </div>
    <div class="pill-row">
      <span class="pill ${escapeAttr(weak)}">weakest: ${escapeHtml(weak)}</span>
      <span class="pill">score: ${score}</span>
      <span class="pill">target: ${escapeHtml(targetNode().label)}</span>
    </div>
    <div class="hops">
      ${path.hops.map((hop, index) => renderHop(hop, index)).join('')}
    </div>
  `;
}

function renderPathLine(path) {
  const parts = [];
  path.nodes.forEach((node, index) => {
    if (index) parts.push('<span class="path-arrow">→</span>');
    parts.push(`<span class="path-node">${escapeHtml(node.label)}</span>`);
  });
  return `<div class="path-line">${parts.join('')}</div>`;
}

function renderHop(hop, index) {
  const edge = hop.edge;
  const from = state.graph.nodes.find((node) => node.id === hop.from);
  const to = state.graph.nodes.find((node) => node.id === hop.to);
  const sources = (edge.source_ids ?? [])
    .map((id) => state.graph.sources.find((source) => source.id === id))
    .filter(Boolean);

  return `
    <article class="hop">
      <div class="hop-top">
        <div class="hop-title">Hop ${index + 1}: ${escapeHtml(from?.label ?? hop.from)} → ${escapeHtml(to?.label ?? hop.to)}</div>
        <div class="pill-row">
          <span class="pill">${escapeHtml(edge.type)}</span>
          <span class="pill ${escapeAttr(edge.evidence_class)}">${escapeHtml(edge.evidence_class)}</span>
          <span class="pill">${escapeHtml(edge.status)}</span>
        </div>
      </div>
      <dl class="claim-ledger">
        <div><dt>Claim</dt><dd>${escapeHtml(edge.claim)}</dd></div>
        <div><dt>Evidence</dt><dd>${escapeHtml(edge.evidence_class)} / ${escapeHtml(edge.status)}</dd></div>
        ${edge.notes ? `<div><dt>Note</dt><dd>${escapeHtml(edge.notes)}</dd></div>` : ''}
      </dl>
      <div class="receipts">
        <h3>Receipts</h3>
        <ul>
          ${sources.map((source) => `<li><a href="${escapeAttr(source.url)}" target="_blank" rel="noreferrer">${escapeHtml(source.label)}</a> <small>${escapeHtml(source.source_type)}</small></li>`).join('')}
        </ul>
      </div>
    </article>
  `;
}

function targetNode() {
  return state.graph.nodes.find((node) => node.id === state.graph.target_node_id) ?? { label: state.graph.target_node_id };
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function escapeAttr(value) {
  return escapeHtml(value);
}
