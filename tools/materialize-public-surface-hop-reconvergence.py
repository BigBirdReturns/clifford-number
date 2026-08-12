#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def write(path: str, text: str) -> None:
    (ROOT / path).write_text(text, encoding="utf-8")


def replace_once(path: str, old: str, new: str) -> None:
    text = read(path)
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{path}: expected one exact occurrence, found {count}: {old[:120]!r}")
    write(path, text.replace(old, new, 1))


def regex_once(path: str, pattern: str, replacement: str, *, flags: int = re.S) -> None:
    text = read(path)
    next_text, count = re.subn(pattern, replacement, text, count=1, flags=flags)
    if count != 1:
        raise SystemExit(f"{path}: expected one regex occurrence, found {count}: {pattern[:120]!r}")
    write(path, next_text)


# Public shell: make the surface-hop compiler, its route question, and its
# refusals the primary product. The generic edge graph remains historical
# repository material under legacy/, but it is no longer loaded or published
# as the live browser data plane.
replace_once(
    "index.html",
    '<meta name="description" content="Explore documented public decisions, research tracks, cases, claims, and the receipts behind every material statement.">',
    '<meta name="description" content="Check the shortest defensible actor-to-actor route through shared bounded surfaces, with receipts and refused connections.">',
)
replace_once(
    "index.html",
    '<meta property="og:title" content="The Clifford Number — map the machine, open every receipt">',
    '<meta property="og:title" content="The Clifford Number — shortest defensible actor routes, with receipts">',
)
replace_once(
    "index.html",
    '<meta property="og:description" content="A public research instrument for following documented decisions, claims, connections, and source receipts.">',
    '<meta property="og:description" content="Ask how two public actors are connected as of a date, inspect every surface and receipt, and see the connections the compiler refused.">',
)
replace_once(
    "index.html",
    '<meta property="og:image:alt" content="The Clifford Number — connections you can check. Inferences we won’t make.">',
    '<meta property="og:image:alt" content="The Clifford Number — actor routes you can check. Inferences we won’t make.">',
)
replace_once(
    "index.html",
    '<title>The Clifford Number — map the machine, open every receipt</title>',
    '<title>The Clifford Number — shortest defensible actor routes</title>',
)
replace_once(
    "index.html",
    '<p class="eyebrow"><span id="hero-node-count">Public research network</span><span class="eyebrow-rule" aria-hidden="true"></span><span id="hero-edge-count">Sourced topology</span></p>',
    '<p class="eyebrow"><span id="hero-node-count">Admitted public actors</span><span class="eyebrow-rule" aria-hidden="true"></span><span id="hero-edge-count">Receipted surface hops</span></p>',
)
replace_once(
    "index.html",
    '<h1>The machine is already in the records.<br><em>Zoom out.</em></h1>',
    '<h1>Ask how two public actors are connected.<br><em>Open every receipt.</em></h1>',
)
replace_once(
    "index.html",
    '<p class="hero-dek">See the policy spine, the Dialog directory, capital, government, defence, and technology clusters at once. Then touch any edge and read the exact claim and receipts underneath it.</p>',
    '<p class="hero-dek">Enter two actors and an optional date. The compiler returns the shortest defensible actor → bounded surface → actor route, its evidence floor, and the connections it refused to make.</p>',
)
replace_once(
    "index.html",
    '<a class="primary-action" href="#network-atlas">Open the whole network <span aria-hidden="true">→</span></a>',
    '<a class="primary-action" href="#network-atlas">Open verified surface hops <span aria-hidden="true">→</span></a>',
)
replace_once(
    "index.html",
    '          <a class="text-action" href="estates/">Open Estate Aperture <span aria-hidden="true">→</span></a>\n          <a class="text-action" href="gametrails/">Open Game-Trail Aperture <span aria-hidden="true">→</span></a>\n',
    '',
)
replace_once(
    "index.html",
    '<p class="section-kicker">Highest-density public clusters</p>\n        <h2 id="hotspots-title">Start where the record burns hottest.</h2>',
    '<p class="section-kicker">Admitted surface-hop anchors</p>\n        <h2 id="hotspots-title">Start with a route the compiler can defend.</h2>',
)
replace_once(
    "index.html",
    '<button class="hotspot-jump hotspot-jump--dialog" type="button" data-network-focus="dialog"><strong>Dialog</strong><span id="hotspot-dialog-count">Highest-density public cluster</span></button>\n        <button class="hotspot-jump" type="button" data-network-focus="ai-opportunities-action-plan"><strong>AI Opportunities Action Plan</strong><span id="hotspot-action-plan-count">Public policy surface</span></button>\n        <button class="hotspot-jump" type="button" data-network-focus="palantir"><strong>Palantir</strong><span id="hotspot-palantir-count">Public organization cluster</span></button>',
    '<button class="hotspot-jump hotspot-jump--dialog" type="button" data-network-focus="matt-clifford"><strong>Matt Clifford</strong><span id="hotspot-clifford-count">Anchor actor</span></button>\n        <button class="hotspot-jump" type="button" data-network-focus="keir-starmer"><strong>Keir Starmer</strong><span id="hotspot-starmer-count">Official policy route</span></button>\n        <button class="hotspot-jump" type="button" data-network-focus="ben-warner"><strong>Ben Warner</strong><span id="hotspot-warner-count">Two-hop corporate route</span></button>',
)
replace_once(
    "index.html",
    '<p class="hotspot-boundary"><strong>Edge ≠ allegation.</strong> Color shows evidence class. The claim and receipt stay attached all the way down.</p>',
    '<p class="hotspot-boundary"><strong>Hop ≠ allegation.</strong> Every line is a shared bounded surface. Roles, dates, receipts, and inference limits stay attached.</p>',
)
replace_once(
    "index.html",
    '<p class="section-kicker">The public topology</p>\n          <h2 id="network-title">One machine. Two honest views.</h2>\n          <p>Research network shows every published sourced edge. Verified surface hops shows only actor-to-actor routes admitted by the bounded-surface compiler.</p>',
    '<p class="section-kicker">The public surface-hop topology</p>\n          <h2 id="network-title">Shortest defensible routes, with every receipt attached.</h2>\n          <p>This view contains only actor-to-actor routes admitted through named, bounded, temporally compatible surfaces. Broad institutions and contextual edges remain outside the hop graph.</p>',
)
replace_once(
    "index.html",
    '        <div class="atlas-mode" role="group" aria-label="Choose network view">\n          <button type="button" class="atlas-mode-button is-active" data-network-mode="research" aria-pressed="true">Research network</button>\n          <button type="button" class="atlas-mode-button" data-network-mode="hops" aria-pressed="false">Verified surface hops</button>\n        </div>',
    '        <div class="atlas-mode" role="group" aria-label="Network view">\n          <button type="button" class="atlas-mode-button is-active" data-network-mode="hops" aria-pressed="true">Verified surface hops</button>\n        </div>',
)
replace_once(
    "index.html",
    '<title id="network-svg-title">Interactive Clifford research network</title>\n            <desc id="network-svg-desc">A zoomable map of documented public nodes and sourced edges. Larger glowing nodes are high-degree public clusters.</desc>',
    '<title id="network-svg-title">Interactive Clifford surface-hop topology</title>\n            <desc id="network-svg-desc">A zoomable map of admitted public actors and the receipted bounded surfaces that create valid actor-to-actor hops.</desc>',
)
replace_once(
    "index.html",
    '<p class="section-kicker">Touch the map</p>\n          <h3>Select a hot spot or node.</h3>\n          <p>Its strongest public edges, evidence classes, claims, and receipts will appear here without leaving the site.</p>',
    '<p class="section-kicker">Inspect the route</p>\n          <h3>Select an admitted actor.</h3>\n          <p>Every adjacent actor, shared surface, role, validity window, and receipt will appear here without leaving the site.</p>',
)

# Browser runtime: retire the live generic edge data plane and its fallback
# shortest-path logic. The application loads only the surface graph, hop graph,
# scores, receipts, public cases, and declared research tracks.
replace_once(
    "app.js",
    "  networkMode: 'research', networkView: { x: 0, y: 0, width: 1400, height: 900 }, networkModel: null",
    "  networkMode: 'hops', networkView: { x: 0, y: 0, width: 1400, height: 900 }, networkModel: null",
)
replace_once(
    "app.js",
    "function setDocumentTitle(label) { document.title = label ? `${label} — The Clifford Number` : 'The Clifford Number — map the machine, open every receipt'; }",
    "function setDocumentTitle(label) { document.title = label ? `${label} — The Clifford Number` : 'The Clifford Number — shortest defensible actor routes'; }",
)
replace_once(
    "app.js",
    "  const [surfaceGraph, hopGraph, scores, legacyGraph, scout, receiptGraph, publicCatalog] = await Promise.all([\n    loadJson('build/surface-graph.json'),\n    loadJson('build/hop-graph.json'),\n    loadJson('build/scores.json'),\n    loadJson('graph.json'),\n    loadJson('build/scout-report.json').catch(() => ({ findings: [] })),\n    loadJson('build/receipt-graph.json').catch(() => ({ receipts: [] })),\n    loadJson('build/public-catalog.json').catch(() => ({ counts: {}, tracks: [], cases: [], claims: [], receipts: [] }))\n  ]);",
    "  const [surfaceGraph, hopGraph, scores, scout, receiptGraph, publicCatalog] = await Promise.all([\n    loadJson('build/surface-graph.json'),\n    loadJson('build/hop-graph.json'),\n    loadJson('build/scores.json'),\n    loadJson('build/scout-report.json').catch(() => ({ findings: [] })),\n    loadJson('build/receipt-graph.json').catch(() => ({ receipts: [] })),\n    loadJson('build/public-catalog.json').catch(() => ({ counts: {}, tracks: [], cases: [], claims: [], receipts: [] }))\n  ]);",
)
replace_once("app.js", "  state.legacyGraph = legacyGraph;\n", "")
replace_once("app.js", "  state.legacyNodes = new Map((legacyGraph.nodes ?? []).map(n => [n.id, n]));\n", "")
replace_once(
    "app.js",
    "  const flagshipCase = [...state.caseIndex.values()].sort((a, b) => (b.featured_priority ?? 0) - (a.featured_priority ?? 0))[0];\n  $('#try-examples').innerHTML = `\n    <button data-network-focus=\"dialog\">Dialog · 124 edges</button>\n    ${flagshipCase ? `<button data-kind=\"case\" data-id=\"${esc(flagshipCase.case_id)}\">Clifford → Starmer · official</button>` : ''}\n    ${state.actors.has('ben-warner') ? '<button data-kind=\"actor\" data-id=\"ben-warner\">Ben Warner → Clifford · hops</button>' : ''}`;",
    "  $('#try-examples').innerHTML = `\n    ${state.actors.has('keir-starmer') ? '<button data-kind=\"actor\" data-id=\"keir-starmer\">Keir Starmer → Clifford · official</button>' : ''}\n    ${state.actors.has('ben-warner') ? '<button data-kind=\"actor\" data-id=\"ben-warner\">Ben Warner → Clifford · two hops</button>' : ''}\n    ${state.actors.has('saul-klein') ? '<button data-kind=\"actor\" data-id=\"saul-klein\">Saul Klein → Clifford · official</button>' : ''}`;",
)
regex_once(
    "app.js",
    r"\nfunction clusterForNode\(node\) \{.*?\n\}\n\nfunction researchNetworkModel\(\) \{.*?\n\}\n\n(?=function hopNetworkModel\(\))",
    "\n",
)
replace_once(
    "app.js",
    "  state.networkMode = mode;\n  state.networkModel = mode === 'hops' ? hopNetworkModel() : researchNetworkModel();",
    "  state.networkMode = 'hops';\n  state.networkModel = hopNetworkModel();",
)
replace_once(
    "app.js",
    "    const topology = model.mode === 'research' && legacyIsTopology(edge) ? ' network-edge--topology' : '';\n    return `<line class=\"network-edge network-edge--${band}${topology}\" x1=\"${from.x}\" y1=\"${from.y}\" x2=\"${to.x}\" y2=\"${to.y}\"/><line class=\"network-edge-hit\" data-network-edge=\"${esc(edge.id)}\" x1=\"${from.x}\" y1=\"${from.y}\" x2=\"${to.x}\" y2=\"${to.y}\"/>`;",
    "    return `<line class=\"network-edge network-edge--${band}\" x1=\"${from.x}\" y1=\"${from.y}\" x2=\"${to.x}\" y2=\"${to.y}\"/><line class=\"network-edge-hit\" data-network-edge=\"${esc(edge.id)}\" x1=\"${from.x}\" y1=\"${from.y}\" x2=\"${to.x}\" y2=\"${to.y}\"/>`;",
)
replace_once(
    "app.js",
    "  $('#atlas-stats').innerHTML = model.mode === 'research'\n    ? `<strong>${model.nodes.length}</strong> public nodes <span>·</span> <strong>${model.edges.length}</strong> sourced edges <span>·</span> <strong>${model.nodeById.get('dialog')?.degree ?? 0}</strong> edges at Dialog`\n    : `<strong>${model.nodes.length}</strong> admitted actors <span>·</span> <strong>${model.edges.length}</strong> valid hops <span>·</span> <strong>${uniqueSurfaces.size}</strong> bounded surfaces`;",
    "  $('#atlas-stats').innerHTML = `<strong>${model.nodes.length}</strong> admitted actors <span>·</span> <strong>${model.edges.length}</strong> valid hops <span>·</span> <strong>${uniqueSurfaces.size}</strong> bounded surfaces`;",
)
regex_once(
    "app.js",
    r"  const cards = related\.map\(edge => \{.*?\n  \}\)\.join\(''\);\n  inspector\.innerHTML = .*?;\n  bindEvidenceActions\(inspector\);",
    r'''  const cards = related.map(edge => {
    const otherId = edge.from === id ? edge.to : edge.from;
    const other = model.nodeById.get(otherId);
    const surfaces = edge.surfaces ?? [];
    return `<article class="network-edge-card"><div><span class="badge">${esc(humanLabel(edge.evidence_class))}</span><strong>${esc(other?.label ?? otherId)}</strong></div>${surfaces.map(surfaceItem => `<p><b>${esc(surfaceItem.surface_label)}</b><br><span>${esc(surfaceItem.actor_a_role || '')} ↔ ${esc(surfaceItem.actor_b_role || '')}</span></p><div class="network-receipt-buttons">${(surfaceItem.receipt_ids ?? []).slice(0, 3).map(receiptId => `<button type="button" data-open-receipt="${esc(receiptId)}">Receipt · ${esc(shortLabel(receiptId, 28))}</button>`).join('')}</div>`).join('')}</article>`;
  }).join('');
  inspector.innerHTML = `<p class="section-kicker">Verified surface-hop actor</p><h3>${esc(node.label)}</h3><div class="network-node-metric"><strong>${node.degree}</strong><span>valid hop${node.degree === 1 ? '' : 's'}</span></div><button class="result network-profile-link" data-kind="actor" data-id="${esc(node.id)}"><span class="kind-glyph">A</span><span class="result-label">Open the full record<small>routes, roles, windows, refusals, and receipts</small></span></button><h4>Admitted adjacent actors</h4><div class="network-edge-list">${cards || '<p>No admitted hop is visible from this actor.</p>'}</div>`;
  bindEvidenceActions(inspector);''',
)
regex_once(
    "app.js",
    r"function openNetworkEdge\(id\) \{.*?\n\}\n\n(?=function focusNetworkNode\(id\))",
    "function openNetworkEdge(id) {\n  const edge = state.networkModel?.edges.find(item => item.id === id);\n  if (edge) selectNetworkNode(edge.from);\n}\n\n",
)
replace_once(
    "app.js",
    "function focusNetworkNode(id) {\n  if (state.networkMode !== 'research' || !state.networkModel?.nodeById.has(id)) renderNetworkAtlas('research', id);\n  else selectNetworkNode(id);",
    "function focusNetworkNode(id) {\n  if (!state.networkModel?.nodeById.has(id)) renderNetworkAtlas('hops', id);\n  else selectNetworkNode(id);",
)
replace_once(
    "app.js",
    "function initNetworkAtlas() {\n  renderNetworkAtlas('research');\n  renderHopSpine();\n  const model = state.networkModel;\n  if (model) {\n    const degree = id => model.nodeById.get(id)?.degree || 0;\n    const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };\n    setText('#hero-node-count', `${model.nodes.length} public nodes`);\n    setText('#hero-edge-count', `${model.edges.length} sourced edges`);\n    setText('#hotspot-dialog-count', `${degree('dialog')} public graph edges`);\n    setText('#hotspot-action-plan-count', `${degree('ai-opportunities-action-plan')} public graph edges`);\n    setText('#hotspot-palantir-count', `${degree('palantir')} public graph edges`);\n    const dialogExample = document.querySelector('#try-examples [data-network-focus=\"dialog\"]');\n    if (dialogExample) dialogExample.textContent = `Dialog · ${degree('dialog')} edges`;\n  }",
    "function initNetworkAtlas() {\n  renderNetworkAtlas('hops');\n  renderHopSpine();\n  const model = state.networkModel;\n  if (model) {\n    const degree = id => model.nodeById.get(id)?.degree || 0;\n    const setText = (selector, value) => { const node = $(selector); if (node) node.textContent = value; };\n    setText('#hero-node-count', `${model.nodes.length} admitted actors`);\n    setText('#hero-edge-count', `${model.edges.length} valid hops`);\n    setText('#hotspot-clifford-count', `${degree('matt-clifford')} valid actor hops`);\n    setText('#hotspot-starmer-count', `${degree('keir-starmer')} valid actor hops`);\n    setText('#hotspot-warner-count', `${degree('ben-warner')} valid actor hops`);\n  }",
)
regex_once(
    "app.js",
    r"\nfunction legacyIsTopology\(edge\) \{.*?\n\}\n\nfunction legacyShortestPath\(.*?\n\}\n\nfunction renderLegacyPath\(path\) \{.*?\n\}\n\n(?=function renderActor\(id\))",
    "\n",
)
regex_once(
    "app.js",
    r"function renderActor\(id\) \{\n  const actor = state\.actors\.get\(id\);\n  const score = state\.actorScores\.get\(id\);\n  const path = state\.hopGraph\.shortest_paths\[id\];\n  const legacyNode = state\.legacyNodes\.get\(id\);.*?\n  \}\n  \$\('#summary'\)\.innerHTML = \[",
    "function renderActor(id) {\n  const actor = state.actors.get(id);\n  const score = state.actorScores.get(id);\n  const path = state.hopGraph.shortest_paths[id];\n  if (!actor) return renderNotFound('actor', id);\n  setDocumentTitle(actor.label);\n  $('#summary').innerHTML = [",
)
replace_once(
    "app.js",
    "    metricPanel('Public graph edges', state.legacyGraph.edges.length),",
    "    metricPanel('Refused surfaces', state.hopGraph.rejected_hop_surfaces?.length ?? 0),",
)
replace_once(
    "app.js",
    '<div><dt>Research edge</dt><dd>A sourced relationship in the wider public graph. It may be context rather than a valid hop.</dd></div>',
    '<div><dt>Refusal</dt><dd>A proposed connection the compiler rejected because its evidence, surface bounds, density, identity, or dates did not qualify.</dd></div>',
)

# Publication builders: the generic root graph remains in repository history,
# but the Pages tree and portable standalone no longer copy or embed it.
replace_once(
    "tools/build-pages.mjs",
    "const files = ['index.html', 'app.js', 'styles.css', 'package.json', 'graph.json'];",
    "const files = ['index.html', 'app.js', 'styles.css', 'package.json'];",
)
replace_once("tools/build-standalone.mjs", "  'graph.json',\n", "")
replace_once(
    "tools/validate-pages.mjs",
    "const legacyGraph = JSON.parse(fs.readFileSync(path.join(destination, 'graph.json'), 'utf8'));\n",
    "",
)
replace_once(
    "tools/validate-pages.mjs",
    "for (const forbidden of [\n  'data/crawl',",
    "for (const forbidden of [\n  'graph.json',\n  'data/crawl',",
)
replace_once(
    "tools/validate-pages.mjs",
    "if (legacyGraph.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.'\n  || legacyEdgeModels.some(item => item.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.')\n  || standalone.includes('Seven degrees of UK AI state capture, with receipts.')) {",
    "if (legacyEdgeModels.some(item => item.subtitle !== 'Seven degrees of UK AI policy topology, with receipts.')\n  || standalone.includes('Seven degrees of UK AI state capture, with receipts.')) {",
)
replace_once(
    "tools/validate-pages.mjs",
    "console.log(`validate-pages: OK (${required.length} required artifacts)`);",
    "if (fs.existsSync(path.join(destination, 'graph.json'))\n  || html.includes('data-network-mode=\"research\"')\n  || html.includes('data-network-focus=\"dialog\"')\n  || app.includes(\"loadJson('graph.json')\")\n  || app.includes('function researchNetworkModel')\n  || app.includes('Legacy Edge Number')\n  || standalone.includes('\"graph.json\":')\n  || !html.includes('data-network-mode=\"hops\"')\n  || !app.includes(\"networkMode: 'hops'\")) {\n  console.error('validate-pages failed: retired generic edge graph escaped into the live surface-hop product');\n  process.exit(1);\n}\nconsole.log(`validate-pages: OK (${required.length} required artifacts)`);",
)

# Permanent regression contract: the browser and deploy builders may expose
# cases, tracks, refusals, and receipts, but may not reactivate the generic
# shortest-path edge graph as the public product.
replace_once(
    "test/ui-contract.test.js",
    "assert.match(html, /data-network-mode=\"research\"/);\nassert.match(html, /data-network-mode=\"hops\"/);\nassert.match(html, /data-network-focus=\"dialog\"/);",
    "assert.doesNotMatch(html, /data-network-mode=\"research\"/);\nassert.match(html, /data-network-mode=\"hops\"/);\nassert.doesNotMatch(html, /data-network-focus=\"dialog\"/);\nassert.match(html, /data-network-focus=\"matt-clifford\"/);",
)
replace_once(
    "test/ui-contract.test.js",
    "assert.match(app, /function researchNetworkModel/);\nassert.match(app, /function hopNetworkModel/);",
    "assert.doesNotMatch(app, /function researchNetworkModel/);\nassert.match(app, /function hopNetworkModel/);\nassert.match(app, /networkMode:\\s*'hops'/);\nassert.doesNotMatch(app, /loadJson\\('graph\\.json'\\)/);\nassert.doesNotMatch(app, /legacyShortestPath|renderLegacyPath|Legacy Edge Number/);",
)
replace_once(
    "test/ui-contract.test.js",
    "assert.match(standaloneBuilder, /__CLIFFORD_APERTURE_BUNDLED__/);",
    "assert.match(standaloneBuilder, /__CLIFFORD_APERTURE_BUNDLED__/);\nassert.doesNotMatch(pagesBuilder, /'graph\\.json'/);\nassert.doesNotMatch(standaloneBuilder, /^\\s*'graph\\.json',/m);",
)

# Fail closed if any live public runtime dependency on the retired generic graph
# survived the bounded transaction.
app = read("app.js")
forbidden_app = [
    "loadJson('graph.json')",
    "state.legacyGraph",
    "state.legacyNodes",
    "function researchNetworkModel",
    "function clusterForNode",
    "function legacyShortestPath",
    "function renderLegacyPath",
    "Legacy Edge Number",
    "renderNetworkAtlas('research'",
    "networkMode: 'research'",
]
remaining = [marker for marker in forbidden_app if marker in app]
if remaining:
    raise SystemExit("app.js retained retired generic-edge markers: " + ", ".join(remaining))

html = read("index.html")
for marker in ['data-network-mode="research"', 'data-network-focus="dialog"', '>Research network<', '>Dialog<', '>Palantir<']:
    if marker in html:
        raise SystemExit(f"index.html retained generic-network marker: {marker}")
for marker in ['data-network-mode="hops"', 'data-network-focus="matt-clifford"', 'shortest defensible actor-to-actor route']:
    if marker not in html:
        raise SystemExit(f"index.html missing surface-hop marker: {marker}")

print("materialize-public-surface-hop-reconvergence: public product now loads only the admitted surface-hop topology")
