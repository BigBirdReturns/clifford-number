#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

path = Path('app.js')
text = path.read_text()
pattern = re.compile(
    r"  const graphBridge = item\.presentation === 'research_graph_projection' \? `<section class=\"panel case-network-bridge\">[\s\S]*?</section>` : '';\n"
)
replacement = """  const graphBridge = item.presentation === 'research_graph_projection' ? `<section class=\"panel case-network-bridge\"><span class=\"panel-label\">The bounded routes this case can expose</span><h3>${state.hopGraph.edges.length} valid hops · ${new Set((state.hopGraph.edges ?? []).flatMap(edge => (edge.surfaces ?? []).map(surface => surface.surface_id))).size} bounded surfaces</h3><p>The case ladder is the decision record. The hop atlas remains bounded: every visible line is actor → shared named surface → actor, and broader context does not become an interpersonal route.</p><div class=\"case-network-actions\"><button type=\"button\" data-network-focus=\"ben-warner\">Open Ben Warner’s admitted route</button><button type=\"button\" data-network-focus=\"fiona-hill\">Open Fiona Hill’s admitted route</button><button type=\"button\" data-network-focus=\"keir-starmer\">Open Keir Starmer’s admitted route</button></div></section>` : '';
"""
updated, count = pattern.subn(lambda _: replacement, text, count=1)
if count != 1:
    raise RuntimeError(f'app.js: expected one research graph bridge, found {count}')
for marker in ['legacyGraph', 'graph.json', 'researchNetworkModel', 'data-network-focus="dialog"', 'data-network-focus="ai-opportunities-action-plan"', 'data-network-focus="palantir"']:
    if marker in updated:
        index = updated.index(marker)
        raise RuntimeError(f'app.js: retired public graph marker remains: {marker}: {updated[max(0, index - 120):index + 180]!r}')
path.write_text(updated)
print('retire-public-graph-bridge: OK')
