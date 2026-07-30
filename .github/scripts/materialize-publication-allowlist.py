#!/usr/bin/env python3
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path.cwd()


def read_text(path: str) -> str:
    return (ROOT / path).read_text()


def write_text(path: str, value: str) -> None:
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_text(value)


def read_json(path: str):
    return json.loads(read_text(path))


def write_json(path: str, value) -> None:
    write_text(path, json.dumps(value, indent=2, ensure_ascii=False) + "\n")


def replace_once(path: str, old: str, new: str) -> None:
    text = read_text(path)
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{path}: expected one literal anchor, found {count}: {old[:180]!r}")
    write_text(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str) -> None:
    text = read_text(path)
    result, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
    if count != 1:
        raise RuntimeError(f"{path}: expected one regex anchor, found {count}: {pattern[:180]!r}")
    write_text(path, result)


# Retire graph.json from the primary public runtime.
replace_once(
    "app.js",
    "    networkMode: 'research', networkView: { x: 0, y: 0, width: 1400, height: 900 }, networkModel: null\n",
    "    networkMode: 'hops', networkView: { x: 0, y: 0, width: 1400, height: 900 }, networkModel: null\n",
)
replace_once(
    "app.js",
    "function setDocumentTitle(label) { document.title = label ? `${label} — The Clifford Number` : 'The Clifford Number — map the machine, open every receipt'; }\n",
    "function setDocumentTitle(label) { document.title = label ? `${label} — The Clifford Number` : 'The Clifford Number — map documented routes, open every receipt'; }\n",
)
replace_once(
    "app.js",
    """  const [surfaceGraph, hopGraph, scores, legacyGraph, scout, receiptGraph, publicCatalog] = await Promise.all([
    loadJson('build/surface-graph.json'),
    loadJson('build/hop-graph.json'),
    loadJson('build/scores.json'),
    loadJson('graph.json'),
    loadJson('build/scout-report.json').catch(() => ({ findings: [] })),
    loadJson('build/receipt-graph.json').catch(() => ({ receipts: [] })),
    loadJson('build/public-catalog.json').catch(() => ({ counts: {}, tracks: [], cases: [], claims: [], receipts: [] }))
  ]);
""",
    """  const [surfaceGraph, hopGraph, scores, scout, receiptGraph, publicCatalog] = await Promise.all([
    loadJson('build/surface-graph.json'),
    loadJson('build/hop-graph.json'),
    loadJson('build/scores.json'),
    loadJson('build/scout-report.json').catch(() => ({ findings: [] })),
    loadJson('build/receipt-graph.json').catch(() => ({ receipts: [] })),
    loadJson('build/public-catalog.json').catch(() => ({ counts: {}, tracks: [], cases: [], claims: [], receipts: [] }))
  ]);
""",
)
replace_once("app.js", "  state.legacyGraph = legacyGraph;\n", "")
replace_once("app.js", "  state.legacyNodes = new Map((legacyGraph.nodes ?? []).map(n => [n.id, n]));\n", "")
replace_once(
    "app.js",
    '    <button data-network-focus="dialog">Dialog · 124 edges</button>\n',
    '    <button data-network-focus="ben-warner">Ben Warner · verified hop route</button>\n',
)
regex_once(
    "app.js",
    r"\nfunction clusterForNode\(node\) \{[\s\S]*?\n\}\n\nfunction researchNetworkModel\(\) \{[\s\S]*?\n\}\n\nfunction hopNetworkModel",
    "\nfunction hopNetworkModel",
)

render_network = r'''function renderNetworkAtlas(selectedId = null) {
  const layer = $('#network-layer');
  if (!layer) return;
  state.networkMode = 'hops';
  state.networkModel = hopNetworkModel();
  const model = state.networkModel;
  const edgeMarkup = model.edges.map(edge => {
    const from = model.nodeById.get(edge.from);
    const to = model.nodeById.get(edge.to);
    if (!from || !to) return '';
    const band = evidenceBand(edge.evidence_class);
    return `<line class="network-edge network-edge--${band}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/><line class="network-edge-hit" data-network-edge="${esc(edge.id)}" x1="${from.x}" y1="${from.y}" x2="${to.x}" y2="${to.y}"/>`;
  }).join('');
  const nodeMarkup = model.nodes.map(node => {
    const radius = networkNodeRadius(node);
    const hot = node.degree >= 5 || node.id === model.defaultNode;
    return `<g class="atlas-node atlas-node--${esc(node.cluster)}${hot ? ' atlas-node--hot' : ''}" data-network-node="${esc(node.id)}" transform="translate(${node.x} ${node.y})" tabindex="0" role="button" aria-label="${esc(`${node.label}, ${node.degree} verified hops`)}">
      ${hot ? `<circle class="atlas-node-halo" r="${radius + 12}"/>` : ''}
      <circle class="atlas-node-core" r="${radius}"/>
      <text class="atlas-node-label" y="${-(radius + 10)}" text-anchor="middle">${esc(shortLabel(node.label, 28))}</text><text class="atlas-node-degree" y="4" text-anchor="middle">${node.degree}</text>
      <title>${esc(node.label)} · ${node.degree} verified hop${node.degree === 1 ? '' : 's'}</title>
    </g>`;
  }).join('');
  layer.innerHTML = `<g class="network-edges">${edgeMarkup}</g><g class="network-nodes">${nodeMarkup}</g>`;
  const uniqueSurfaces = new Set((state.hopGraph.edges ?? []).flatMap(edge => (edge.surfaces ?? []).map(surfaceItem => surfaceItem.surface_id)));
  $('#atlas-stats').innerHTML = `<strong>${model.nodes.length}</strong> admitted actors <span>·</span> <strong>${model.edges.length}</strong> valid hops <span>·</span> <strong>${uniqueSurfaces.size}</strong> bounded surfaces`;
  for (const nodeEl of layer.querySelectorAll('[data-network-node]')) {
    const select = () => selectNetworkNode(nodeEl.dataset.networkNode);
    nodeEl.addEventListener('click', select);
    nodeEl.addEventListener('keydown', event => {
      if (!['Enter', ' '].includes(event.key)) return;
      event.preventDefault(); select();
    });
  }
  for (const edgeEl of layer.querySelectorAll('[data-network-edge]')) edgeEl.addEventListener('click', () => openNetworkEdge(edgeEl.dataset.networkEdge));
  resetNetworkView();
  selectNetworkNode(selectedId && model.nodeById.has(selectedId) ? selectedId : model.defaultNode);
}'''
regex_once("app.js", r"function renderNetworkAtlas\([\s\S]*?\n\}\n\nfunction selectNetworkNode", render_network + "\n\nfunction selectNetworkNode")

select_network = r'''function selectNetworkNode(id) {
  const model = state.networkModel;
  const node = model?.nodeById.get(id);
  const inspector = $('#network-inspector');
  if (!node || !inspector) return;
  for (const element of $('#network-layer').querySelectorAll('[data-network-node]')) element.classList.toggle('is-selected', element.dataset.networkNode === id);
  const related = model.edges.filter(edge => edge.from === id || edge.to === id)
    .sort((a, b) => (EVIDENCE_RANK[a.evidence_class] ?? 9) - (EVIDENCE_RANK[b.evidence_class] ?? 9))
    .slice(0, 12);
  const cards = related.map(edge => {
    const otherId = edge.from === id ? edge.to : edge.from;
    const other = model.nodeById.get(otherId);
    const surfaces = edge.surfaces ?? [];
    return `<article class="network-edge-card"><div><span class="badge">${esc(humanLabel(edge.evidence_class))}</span><strong>${esc(other?.label ?? otherId)}</strong></div>${surfaces.map(surfaceItem => `<p><b>${esc(surfaceItem.surface_label)}</b><br><span>${esc(surfaceItem.actor_a_role || '')} ↔ ${esc(surfaceItem.actor_b_role || '')}</span></p><div class="network-receipt-buttons">${(surfaceItem.receipt_ids ?? []).slice(0, 3).map(receiptId => `<button type="button" data-open-receipt="${esc(receiptId)}">Receipt · ${esc(shortLabel(receiptId, 28))}</button>`).join('')}</div>`).join('')}</article>`;
  }).join('');
  inspector.innerHTML = `<p class="section-kicker">Verified surface-hop node</p><h3>${esc(node.label)}</h3><div class="network-node-metric"><strong>${node.degree}</strong><span>verified hop${node.degree === 1 ? '' : 's'}</span></div><button class="result network-profile-link" data-kind="actor" data-id="${esc(node.id)}"><span class="kind-glyph">A</span><span class="result-label">Open the full record<small>routes, roles, windows, and receipts</small></span></button><h4>Admitted adjacent actors</h4><div class="network-edge-list">${cards || '<p>No admitted hop is visible in this view.</p>'}</div>`;
  bindEvidenceActions(inspector);
  for (const button of inspector.querySelectorAll('.result')) button.addEventListener('click', () => activateResult(button.dataset.kind, button.dataset.id));
}'''
regex_once("app.js", r"function selectNetworkNode\([\s\S]*?\n\}\n\nfunction openNetworkEdge", select_network + "\n\nfunction openNetworkEdge")

open_edge = r'''function openNetworkEdge(id) {
  const edge = state.networkModel?.edges.find(item => item.id === id);
  if (edge) selectNetworkNode(edge.from);
}'''
regex_once("app.js", r"function openNetworkEdge\([\s\S]*?\n\}\n\nfunction focusNetworkNode", open_edge + "\n\nfunction focusNetworkNode")

focus_network = r'''function focusNetworkNode(id) {
  if (!state.networkModel?.nodeById.has(id)) renderNetworkAtlas(id);
  else selectNetworkNode(id);
  const node = state.networkModel?.nodeById.get(id);
  if (node) {
    state.networkView = { x: Math.max(0, Math.min(960, node.x - 220)), y: Math.max(0, Math.min(617, node.y - 142)), width: 440, height: 283 };
    applyNetworkView();
  }
  $('#network-atlas')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}'''
regex_once("app.js", r"function focusNetworkNode\([\s\S]*?\n\}\n\nfunction renderHopSpine", focus_network + "\n\nfunction renderHopSpine")

init_network = r'''function initNetworkAtlas() {
  renderNetworkAtlas();
  renderHopSpine();
  const model = state.networkModel;
  if (model) {
    const degree = id => model.nodeById.get(id)?.degree || 0;
    const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };
    setText('#hero-node-count', `${model.nodes.length} admitted actors`);
    setText('#hero-edge-count', `${model.edges.length} valid hops`);
    setText('#hotspot-ben-warner-count', `${degree('ben-warner')} verified hops`);
    setText('#hotspot-fiona-hill-count', `${degree('fiona-hill')} verified hops`);
    setText('#hotspot-keir-starmer-count', `${degree('keir-starmer')} verified hops`);
    const example = document.querySelector('#try-examples [data-network-focus="ben-warner"]');
    if (example) example.textContent = `Ben Warner · ${degree('ben-warner')} verified hops`;
  }
  for (const button of document.querySelectorAll('[data-network-focus]')) button.addEventListener('click', () => focusNetworkNode(button.dataset.networkFocus));
  for (const button of document.querySelectorAll('[data-network-zoom]')) button.addEventListener('click', () => {
    if (button.dataset.networkZoom === 'reset') resetNetworkView();
    else zoomNetwork(button.dataset.networkZoom === 'in' ? .72 : 1.28);
  });
  const svg = $('#network-svg');
  if (!svg) return;
  svg.addEventListener('wheel', event => {
    event.preventDefault();
    zoomNetwork(event.deltaY > 0 ? 1.12 : .88);
  }, { passive: false });
  let drag = null;
  svg.addEventListener('pointerdown', event => {
    if (event.target.closest?.('[data-network-node], [data-network-edge]')) return;
    drag = { x: event.clientX, y: event.clientY, view: { ...state.networkView } };
    svg.setPointerCapture?.(event.pointerId);
    svg.classList.add('is-panning');
  });
  svg.addEventListener('pointermove', event => {
    if (!drag) return;
    const dx = (event.clientX - drag.x) * drag.view.width / Math.max(1, svg.clientWidth);
    const dy = (event.clientY - drag.y) * drag.view.height / Math.max(1, svg.clientHeight);
    state.networkView = {
      ...drag.view,
      x: Math.max(0, Math.min(1400 - drag.view.width, drag.view.x - dx)),
      y: Math.max(0, Math.min(900 - drag.view.height, drag.view.y - dy))
    };
    applyNetworkView();
  });
  const endDrag = () => { drag = null; svg.classList.remove('is-panning'); };
  svg.addEventListener('pointerup', endDrag);
  svg.addEventListener('pointercancel', endDrag);
}'''
regex_once("app.js", r"function initNetworkAtlas\(\) \{[\s\S]*?\n\}\n\nfunction rankMatch", init_network + "\n\nfunction rankMatch")
replace_once(
    "app.js",
    "    metricPanel('Public graph edges', state.legacyGraph.edges.length),\n",
    "    metricPanel('Compiler refusals', state.hopGraph.rejected_hop_pairs?.length ?? 0),\n",
)
app_text = read_text("app.js")
app_text = re.sub(r"\nfunction legacyIsTopology\(edge\) \{[\s\S]*?\n\}\n", "\n", app_text, count=1)
write_text("app.js", app_text)
if any(marker in read_text("app.js") for marker in ["graph.json", "researchNetworkModel", "legacyGraph"]):
    raise RuntimeError("app.js still contains retired generic-graph runtime")

# Bounded, hop-only landing-page language.
for old, new in {
    "The Clifford Number — map the machine, open every receipt": "The Clifford Number — map documented routes, open every receipt",
    "The machine is already in the records.<br><em>Zoom out.</em>": "The documented routes are already in the records.<br><em>Open every receipt.</em>",
    "See the policy spine, the Dialog directory, capital, government, defence, and technology clusters at once. Then touch any edge and read the exact claim and receipts underneath it.": "See only the actor-to-actor routes admitted by bounded surfaces and compatible dates. Touch any hop to inspect the shared surface, roles, overlap window, and receipts underneath it.",
    "Open the whole network": "Open the verified hop map",
    "The public topology": "The admitted topology",
    "One machine. Two honest views.": "One bounded view. Every step receipted.",
    "Research network shows every published sourced edge. Verified surface hops shows only actor-to-actor routes admitted by the bounded-surface compiler.": "The map shows only actor-to-actor routes admitted by the bounded-surface compiler. Wider contextual edges remain available to research tooling but are not published as interpersonal routes.",
    "Interactive Clifford research network": "Interactive Clifford surface-hop network",
    "A zoomable map of documented public nodes and sourced edges. Larger glowing nodes are high-degree public clusters.": "A zoomable map of admitted actors and verified surface hops. Every visible edge terminates in one or more bounded surfaces.",
}.items():
    replace_once("index.html", old, new)
regex_once(
    "index.html",
    r'''      <aside class="hero-hotspots" aria-labelledby="hotspots-title">[\s\S]*?      </aside>''',
    '''      <aside class="hero-hotspots" aria-labelledby="hotspots-title">
        <p class="section-kicker">Verified routes worth opening</p>
        <h2 id="hotspots-title">Start with an admitted actor route.</h2>
        <button class="hotspot-jump" type="button" data-network-focus="ben-warner"><strong>Ben Warner</strong><span id="hotspot-ben-warner-count">Verified surface hops</span></button>
        <button class="hotspot-jump" type="button" data-network-focus="fiona-hill"><strong>Fiona Hill</strong><span id="hotspot-fiona-hill-count">Verified surface hops</span></button>
        <button class="hotspot-jump" type="button" data-network-focus="keir-starmer"><strong>Keir Starmer</strong><span id="hotspot-keir-starmer-count">Verified surface hops</span></button>
        <p class="hotspot-boundary"><strong>Hop ≠ allegation.</strong> Every visible line is actor → bounded surface → actor. Shared context that fails the compiler remains off this map.</p>
        <div class="release-strip" id="release-strip">Loading the current public release…</div>
      </aside>''',
)
regex_once(
    "index.html",
    r'''        <div class="atlas-mode" role="group" aria-label="Choose network view">[\s\S]*?        </div>''',
    '''        <div class="atlas-mode" role="group" aria-label="Network view">
          <button type="button" class="atlas-mode-button is-active" data-network-mode="hops" aria-pressed="true">Verified surface hops</button>
        </div>''',
)
if any(marker in read_text("index.html") for marker in ['data-network-mode="research"', "One machine.", "The machine is already"]):
    raise RuntimeError("index.html still contains dual-graph or conclusion-forward language")

# Standalone release and exact publication manifest.
replace_once("tools/build-standalone.mjs", "  'graph.json',\n", "")
replace_once(
    "tools/build-standalone.mjs",
    "import { root } from './lib/ledger.mjs';\n",
    "import { root } from './lib/ledger.mjs';\nimport { refreshPublicationManifest } from './lib/publication-manifest.mjs';\n",
)
replace_once(
    "tools/build-standalone.mjs",
    "fs.copyFileSync(gameTrailSource, gameTrailOutput);\nconsole.log(`build-standalone:",
    "fs.copyFileSync(gameTrailSource, gameTrailOutput);\nconst publicationManifest = refreshPublicationManifest({ root, destination: path.join(root, 'dist') });\nconsole.log(`build-standalone:",
)
replace_once(
    "tools/build-standalone.mjs",
    "${path.relative(root, gameTrailOutput)} (${fs.statSync(gameTrailOutput).size} bytes)`);\n",
    "${path.relative(root, gameTrailOutput)} (${fs.statSync(gameTrailOutput).size} bytes); publication ${publicationManifest.combined_sha256}`);\n",
)

# Existing Pages validator now enforces the exact manifest and held boundaries.
replace_once(
    "tools/validate-pages.mjs",
    "  'index.html', 'Clifford-Number-standalone.html', 'Clifford-Estate-Aperture-standalone.html', 'Clifford-Game-Trail-Aperture-standalone.html', 'app.js', 'styles.css', '.nojekyll',\n",
    "  'index.html', 'Clifford-Number-standalone.html', 'Clifford-Estate-Aperture-standalone.html', 'Clifford-Game-Trail-Aperture-standalone.html', 'app.js', 'styles.css', '.nojekyll', 'publication-manifest.json',\n",
)
replace_once("tools/validate-pages.mjs", "  'legacy/graph.edge-model.json', 'legacy/uk-ai-policy.edge-model.json',\n", "")
replace_once(
    "tools/validate-pages.mjs",
    "for (const forbidden of ['data/crawl', 'data/intake', 'data/local', 'receipts/crawl']) {\n",
    "for (const forbidden of ['data/crawl', 'data/intake', 'data/local', 'receipts/crawl', 'legacy', 'reports/core-thesis/poof-clifford-ecology']) {\n",
)
replace_once(
    "tools/validate-pages.mjs",
    "const legacyGraph = JSON.parse(fs.readFileSync(path.join(destination, 'graph.json'), 'utf8'));\nconst legacyEdgeModels = [\n  JSON.parse(fs.readFileSync(path.join(destination, 'legacy', 'graph.edge-model.json'), 'utf8')),\n  JSON.parse(fs.readFileSync(path.join(destination, 'legacy', 'uk-ai-policy.edge-model.json'), 'utf8')),\n];\n",
    "const publicationManifest = JSON.parse(fs.readFileSync(path.join(destination, 'publication-manifest.json'), 'utf8'));\n",
)
replace_once(
    "tools/validate-pages.mjs",
    """if (legacyGraph.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.'
  || legacyEdgeModels.some(item => item.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.')
  || standalone.includes('Seven degrees of UK AI state capture, with receipts.')) {
  console.error('validate-pages failed: stale state-capture framing remains in the public payload');
  process.exit(1);
}
""",
    """if (fs.existsSync(path.join(destination, 'graph.json'))
  || fs.existsSync(path.join(destination, 'legacy'))
  || app.includes("loadJson('graph.json')")
  || app.includes('researchNetworkModel')
  || html.includes('data-network-mode="research"')
  || standalone.includes('Seven degrees of UK AI state capture, with receipts.')) {
  console.error('validate-pages failed: retired generic-edge publication or stale state-capture framing remains in the public payload');
  process.exit(1);
}
if (publicationManifest.schema_version !== 'clifford-publication-manifest@1'
  || publicationManifest.boundaries?.recursive_repository_copy_allowed !== false
  || publicationManifest.boundaries?.generic_edge_graph_is_public_route_product !== false
  || publicationManifest.held_surfaces?.some(item => item.path === 'reports/core-thesis/poof-clifford-ecology/' && item.status === 'staged_nonpublic') !== true) {
  console.error('validate-pages failed: status-aware positive publication manifest is absent or distorted');
  process.exit(1);
}
""",
)

# Source-level UI contract follows the bounded public runtime.
replace_once("test/ui-contract.test.js", "assert.match(html, /The machine is already in the records/);\n", "assert.match(html, /The documented routes are already in the records/);\n")
replace_once("test/ui-contract.test.js", 'assert.match(html, /data-network-mode="research"/);\n', 'assert.doesNotMatch(html, /data-network-mode="research"/);\n')
replace_once("test/ui-contract.test.js", 'assert.match(html, /data-network-focus="dialog"/);\n', 'assert.match(html, /data-network-focus="ben-warner"/);\n')
replace_once("test/ui-contract.test.js", "assert.match(app, /function researchNetworkModel/);\n", "assert.doesNotMatch(app, /function researchNetworkModel|graph\\.json|legacyGraph/);\n")
replace_once(
    "test/ui-contract.test.js",
    """// Every runtime dependency and local receipt link must ship in the Pages artifact.
for (const directory of ['assets', 'docs', 'data', 'build', 'src', 'receipts']) {
  assert.match(pagesBuilder, new RegExp(`['"]${directory}['"]`), `Pages artifact must include ${directory}/`);
}
""",
    """// Every public byte is selected through the positive publication manifest.
assert.match(pagesBuilder, /buildPublicationArtifact/);
assert.doesNotMatch(pagesBuilder, /cpSync|copyTree|const dirs =/);
const publicationPlan = readFileSync('data/project/publication-plan.json', 'utf8');
const publicationModule = readFileSync('tools/lib/publication-manifest.mjs', 'utf8');
assert.match(publicationPlan, /"default_decision": "exclude"/);
assert.match(publicationPlan, /reports\\/core-thesis\\/poof-clifford-ecology\\//);
assert.match(publicationPlan, /"status": "staged_nonpublic"/);
assert.match(publicationModule, /unclassified files/);
assert.match(publicationModule, /generic edge graph is public/);
""",
)

# Package release chain.
package = read_json("package.json")
package["scripts"]["validate:publication"] = "node tools/validate-publication-plan.mjs"
package["scripts"]["test:publication"] = "node test/publication-manifest.test.js"
if "node test/publication-manifest.test.js" not in package["scripts"]["test"]:
    package["scripts"]["test"] = package["scripts"]["test"].replace(
        "node test/poof-constitutional-change.test.js",
        "node test/publication-manifest.test.js && node test/poof-constitutional-change.test.js",
    )
if "validate:publication" not in package["scripts"]["validate:pages"]:
    package["scripts"]["validate:pages"] += " && npm run validate:publication"
write_json("package.json", package)

# POOF is admitted to custody, not deployed.
contract_path = "data/project/poof-clifford-ecology-contract.json"
contract = read_json(contract_path)
state = contract["publication_state"]
state["publication_allowlist_dependency"] = "admitted_staged_nonpublic_by_clifford-publication-plan@1"
state["publication_plan_path"] = "data/project/publication-plan.json"
state["publication_plan_status"] = "staged_nonpublic_hold"
state["may_be_represented_as_deployed"] = False
write_json(contract_path, contract)

log_path = "data/project/poof-clifford-constitutional-change-log.json"
log = read_json(log_path)
if any(item.get("change_id") == "POOF-CONST-2026-07-29-006" for item in log["changes"]):
    raise RuntimeError("constitutional receipt 006 already exists")
log["changes"].append({
    "change_id": "POOF-CONST-2026-07-29-006",
    "effective_at": "2026-07-29T21:00:00-07:00",
    "protected_paths_touched": ["data/project/poof-clifford-ecology-contract.json"],
    "affected_invariants": [
        "publication admission and deployment remain separate constitutional acts",
        "a staged POOF surface can be classified by the publication plan without entering the GitHub Pages artifact",
        "the retired generic edge graph cannot re-enter publication through broad directory copying"
    ],
    "reason": "The merged ecology left its publication allowlist dependency unresolved, while the repository Pages builder still copied broad directory trees and publicly loaded the generic edge graph.",
    "previous_behavior": [
        "the POOF contract recorded no repository-native allowlist disposition",
        "the Pages build used recursive positive roots plus a short negative deletion list",
        "the public landing page loaded graph.json and exposed a generic research-edge atlas"
    ],
    "proposed_behavior": [
        "classify POOF as admitted to publication custody but held staged and nonpublic",
        "build Pages only from exact public entries and classified local dependencies under a default-exclude plan",
        "publish only bounded surface-hop routes in the primary public atlas"
    ],
    "migration": "Regenerate the POOF release under the updated staged-admission contract; build a manifest-authorized Pages artifact; preserve graph.json and legacy models only as internal compiler inputs.",
    "backward_compatibility": "Canonical evidence, graph edges, prior releases, and the POOF target origin are unchanged. Existing public URLs remain available when their exact dependencies are classified by the plan.",
    "adversarial_fixtures_added": [
        "unclassified dependency refusal",
        "blocked catalog-status refusal",
        "extra dist-file refusal",
        "generic graph public-route refusal",
        "held POOF GitHub Pages 404",
        "positive manifest exact-byte validation"
    ],
    "emergency_override": False,
    "expires_at": None,
    "authority": "repository_change_receipt_below_canonical_evidence",
    "graph_effect": "none"
})
write_json(log_path, log)

assert "graph.json" not in read_text("app.js")
assert "researchNetworkModel" not in read_text("app.js")
assert 'data-network-mode="research"' not in read_text("index.html")
assert "buildPublicationArtifact" in read_text("tools/build-pages.mjs")
assert "'graph.json'" not in read_text("tools/build-standalone.mjs")
print("materialize-publication-allowlist: source changes applied")
