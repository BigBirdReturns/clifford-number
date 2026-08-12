#!/usr/bin/env python3
from __future__ import annotations

import re
import runpy
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APP = ROOT / "app.js"
MATERIALIZER = ROOT / "tools/materialize-public-surface-hop-reconvergence.py"

text = APP.read_text(encoding="utf-8")
pattern = r"  const graphBridge = item\.presentation === 'research_graph_projection' \? `.*?` : '';\n"
replacement = """  const graphBridge = item.presentation === 'research_graph_projection' ? `<section class=\"panel case-network-bridge\"><span class=\"panel-label\">The admitted surface-hop topology</span><h3>${state.hopGraph.edges.length} valid actor hops · ${state.hopGraph.rejected_hop_surfaces?.length ?? 0} refused surfaces</h3><p>The case ladder is a ledger view. The public network contains only actor-to-actor hops admitted through named, bounded, temporally compatible surfaces; broader context remains visible in claims and refusals without becoming a route.</p><div class=\"case-policy-spine\" aria-label=\"Official policy route\"><span>Matt Clifford</span><b>shared official surface</b><span>Keir Starmer</span><b>receipted through</b><span>AI Opportunities Action Plan</span></div><div class=\"case-network-actions\"><button type=\"button\" data-network-focus=\"matt-clifford\">Open Matt Clifford · ${state.networkModel?.nodeById.get('matt-clifford')?.degree ?? 0} hops</button><button type=\"button\" data-network-focus=\"keir-starmer\">Open Keir Starmer · ${state.networkModel?.nodeById.get('keir-starmer')?.degree ?? 0} hops</button><button type=\"button\" data-network-focus=\"ben-warner\">Open Ben Warner · ${state.networkModel?.nodeById.get('ben-warner')?.degree ?? 0} hops</button></div></section>` : '';
"""
next_text, count = re.subn(pattern, replacement, text, count=1, flags=re.S)
if count != 1:
    raise SystemExit(f"app.js: expected one generic case-network bridge, found {count}")
APP.write_text(next_text, encoding="utf-8")

runpy.run_path(str(MATERIALIZER), run_name="__main__")

app = APP.read_text(encoding="utf-8")
for marker in [
    "state.legacyGraph",
    "data-network-focus=\"dialog\"",
    "data-network-focus=\"ai-opportunities-action-plan\"",
    "data-network-focus=\"palantir\"",
    "The graph this case was hiding",
]:
    if marker in app:
        raise SystemExit(f"app.js retained generic case projection marker: {marker}")
for marker in [
    "The admitted surface-hop topology",
    "data-network-focus=\"matt-clifford\"",
    "data-network-focus=\"keir-starmer\"",
    "data-network-focus=\"ben-warner\"",
]:
    if marker not in app:
        raise SystemExit(f"app.js missing admitted case projection marker: {marker}")

print("run-public-surface-hop-reconvergence-v2: generic case projection retired")
