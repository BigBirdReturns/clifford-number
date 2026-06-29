import { findNode, searchNodes, shortestPath, weakestEvidence } from './src/graph.js';
import { computePathScore, confidenceLabel } from './src/scoring.js';

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
  graphStats: document.querySelector('#graph-stats')
};

init().catch((error) => {
  console.error(error);
  els.result.className = 'result';
  els.result.innerHTML = `<h2>Graph failed to load.</h2><p>${escapeHtml(error.message)}</p>`;
});

async function init() {
  state.manifest = await loadManifest();
  const requested = new URLSearchParams(window.location.search).get('case');
  await loadCase(requested || state.manifest.default_case_id, { updateUrl: false });
  renderCasePicker();
  wireEvents();
}

async function loadManifest() {
  const response = await fetch('./cases.json');
  if (!response.ok) {
    return {
      default_case_id: 'default',
      cases: [{ id: 'default', title: 'The Clifford Number', data_path: 'graph.json', root_graph_path: 'graph.json' }]
    };
  }
  return response.json();
}

async function loadCase(caseId, options = {}) {
  const fallbackId = state.manifest.default_case_id ?? state.manifest.cases?.[0]?.id;
  const selectedCase = state.manifest.cases.find((item) => item.id === caseId)
    ?? state.manifest.cases.find((item) => item.id === fallbackId);
  if (!selectedCase) throw new Error('No registered case is available.');

  const response = await fetch(selectedCase.data_path);
  if (!response.ok) throw new Error(`Could not load ${selectedCase.data_path}: ${response.status}`);

  state.currentCase = selectedCase;
  state.graph = await response.json();
  state.selectedNode = null;
  els.search.value = '';

  renderHero();
  renderSuggestions('');
  renderGraphStats();
  renderNodeList(state.graph.nodes);
  renderEmptyState();

  if (options.updateUrl !== false) {
    const url = new URL(window.location.href);
    if (selectedCase.id === state.manifest.default_case_id) url.searchParams.delete('case');
    else url.searchParams.set('case', selectedCase.id);
    window.history.replaceState({}, '', url);
  }
}

function wireEvents() {
  els.search.addEventListener('input', () => renderSuggestions(els.search.value));
  els.search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') computeFromSearch();
  });
  els.go.addEventListener('click', computeFromSearch);
  els.caseSelect?.addEventListener('change', () => loadCase(els.caseSelect.value));
}

function renderCasePicker() {
  const visibleCases = (state.manifest.cases ?? []).filter((item) => !item.hidden);
  if (!els.casePicker || !els.caseSelect || visibleCases.length <= 1) return;
  els.casePicker.hidden = false;
  els.caseSelect.innerHTML = visibleCases.map((item) => (
    `<option value="${escapeAttr(item.id)}">${escapeHtml(item.title ?? item.id)}</option>`
  )).join('');
  els.caseSelect.value = state.currentCase.id;
}

function renderHero() {
  const graph = state.graph;
  document.title = graph.title ?? state.currentCase.title ?? 'Clifford Number';
  if (els.title) els.title.textContent = graph.title ?? state.currentCase.title ?? 'Clifford Number';
  if (els.subtitle) els.subtitle.textContent = graph.subtitle ?? state.currentCase.description ?? '';
  if (els.tagline) els.tagline.textContent = graph.tagline ?? 'Receipts first.';
  if (els.status) els.status.textContent = graph.status ?? state.currentCase.description ?? '';
  if (els.caseSelect) els.caseSelect.value = state.currentCase.id;
}

function renderEmptyState() {
  els.result.className = 'result empty';
  els.result.innerHTML = `
    <div class="empty-state">
      <h2>Pick a node.</h2>
      <p>The app returns the shortest evidenced path to ${escapeHtml(targetNode().label)}. Type a name; if it is in this case, you will see whether it is adjacent and exactly which receipts support the path.</p>
    </div>
  `;
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
  els.graphStats.textContent = `${nodes} public nodes, ${edges} sourced edges, and ${listed} listing-only edges are searchable in ${state.currentCase.title}. Type a name to see whether it has a sourced path to ${targetNode().label}.`;
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

function renderNoMatch(query) {
  els.result.className = 'result';
  els.result.innerHTML = `
    <div class="empty-state">
      <h2>No node found.</h2>
      <p>No current public graph node matches “${escapeHtml(query)}” in ${escapeHtml(state.currentCase.title)}, so the app cannot claim adjacency. Add a public-role node and at least one sourced edge to ${escapeHtml(state.currentCase.data_path)}, then run <code>npm run check</code>.</p>
    </div>
  `;
}

function renderPath(node, path) {
  els.result.className = 'result';
  if (!path) {
    els.result.innerHTML = `
      <div class="empty-state">
        <h2>No path found for ${escapeHtml(node.label)}.</h2>
        <p>The node exists, but there is no evidenced path to ${escapeHtml(targetNode().label)} under the current case.</p>
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
        <p>The shortest evidenced path reaches ${escapeHtml(targetNode().label)} in ${path.number} hop${path.number === 1 ? '' : 's'}. Confidence is ${escapeHtml(confidence)} because the weakest evidence class in the path is ${escapeHtml(weak)}.</p>
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
      <p>${escapeHtml(edge.claim)}</p>
      ${edge.notes ? `<p><strong>Note:</strong> ${escapeHtml(edge.notes)}</p>` : ''}
      <div class="receipts">
        <h3>Receipts</h3>
        <ul>
          ${sources.map((source) => `<li><a href="${escapeAttr(receiptUrl(source))}">${escapeHtml(source.label)}</a> <small>${escapeHtml(source.source_type)}</small></li>`).join('')}
        </ul>
      </div>
    </article>
  `;
}

function receiptUrl(source) {
  if (source.receipt_url) return source.receipt_url;
  if (source.id === 'dialog-html-source') {
    return 'docs/clifford-number-master.md#part-3-dialog-public-directory-import-safe-subset';
  }
  return source.url;
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
