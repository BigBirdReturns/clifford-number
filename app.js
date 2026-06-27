import { findNode, searchNodes, shortestPath, weakestEvidence } from './src/graph.js';
import { computePathScore, confidenceLabel } from './src/scoring.js';

const state = {
  graph: null,
  selectedNode: null
};

const els = {
  search: document.querySelector('#search'),
  go: document.querySelector('#go'),
  suggestions: document.querySelector('#suggestions'),
  result: document.querySelector('#result'),
  nodeList: document.querySelector('#node-list')
};

init().catch((error) => {
  console.error(error);
  els.result.className = 'result';
  els.result.innerHTML = `<h2>Graph failed to load.</h2><p>${escapeHtml(error.message)}</p>`;
});

async function init() {
  const response = await fetch('./graph.json');
  if (!response.ok) throw new Error(`Could not load graph.json: ${response.status}`);
  state.graph = await response.json();
  renderSuggestions('');
  renderNodeList(state.graph.nodes);
  wireEvents();
}

function wireEvents() {
  els.search.addEventListener('input', () => renderSuggestions(els.search.value));
  els.search.addEventListener('keydown', (event) => {
    if (event.key === 'Enter') computeFromSearch();
  });
  els.go.addEventListener('click', computeFromSearch);
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
      <p>No current graph node matches “${escapeHtml(query)}”. Add it to graph.json with at least one sourced edge, then run <code>npm run check</code>.</p>
    </div>
  `;
}

function renderPath(node, path) {
  els.result.className = 'result';
  if (!path) {
    els.result.innerHTML = `
      <div class="empty-state">
        <h2>No path found for ${escapeHtml(node.label)}.</h2>
        <p>The node exists, but there is no evidenced path to ${escapeHtml(targetNode().label)} under the current graph.</p>
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
