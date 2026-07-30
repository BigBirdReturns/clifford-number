#!/usr/bin/env python3
from __future__ import annotations

import re
from pathlib import Path

path = Path('app.js')
text = path.read_text()

bridge_pattern = re.compile(
    r"  const graphBridge = item\.presentation === 'research_graph_projection' \? `<section class=\"panel case-network-bridge\">[\s\S]*?</section>` : '';\n"
)
bridge_replacement = """  const graphBridge = item.presentation === 'research_graph_projection' ? `<section class=\"panel case-network-bridge\"><span class=\"panel-label\">The bounded routes this case can expose</span><h3>${state.hopGraph.edges.length} valid hops · ${new Set((state.hopGraph.edges ?? []).flatMap(edge => (edge.surfaces ?? []).map(surface => surface.surface_id))).size} bounded surfaces</h3><p>The case ladder is the decision record. The hop atlas remains bounded: every visible line is actor → shared named surface → actor, and broader context does not become an interpersonal route.</p><div class=\"case-network-actions\"><button type=\"button\" data-network-focus=\"ben-warner\">Open Ben Warner’s admitted route</button><button type=\"button\" data-network-focus=\"fiona-hill\">Open Fiona Hill’s admitted route</button><button type=\"button\" data-network-focus=\"keir-starmer\">Open Keir Starmer’s admitted route</button></div></section>` : '';
"""
updated, bridge_count = bridge_pattern.subn(lambda _: bridge_replacement, text, count=1)
if bridge_count != 1:
    raise RuntimeError(f'app.js: expected one research graph bridge, found {bridge_count}')

legacy_helpers = re.compile(r"\nfunction legacyShortestPath\([\s\S]*?(?=\nfunction renderActor\(id\) \{)")
updated, helper_count = legacy_helpers.subn('\n', updated, count=1)
if helper_count != 1:
    raise RuntimeError(f'app.js: expected one legacy actor helper block, found {helper_count}')

actor_prefix = re.compile(
    r"function renderActor\(id\) \{[\s\S]*?  \$\('#summary'\)\.innerHTML = \[\n    metricPanel\('Clifford Number'"
)
actor_replacement = """function renderActor(id) {
  const actor = state.actors.get(id);
  const score = state.actorScores.get(id);
  const path = state.hopGraph.shortest_paths[id];
  if (!actor) return renderNotFound('actor', id);
  setDocumentTitle(actor.label);
  $('#summary').innerHTML = [
    metricPanel('Clifford Number'"""
updated, actor_count = actor_prefix.subn(lambda _: actor_replacement, updated, count=1)
if actor_count != 1:
    raise RuntimeError(f'app.js: expected one actor legacy branch, found {actor_count}')

for marker in [
    'legacyGraph',
    'legacyNodes',
    'legacyShortestPath',
    'renderLegacyPath',
    'graph.json',
    'researchNetworkModel',
    'data-network-focus="dialog"',
    'data-network-focus="ai-opportunities-action-plan"',
    'data-network-focus="palantir"',
]:
    if marker in updated:
        index = updated.index(marker)
        raise RuntimeError(f'app.js: retired public graph marker remains: {marker}: {updated[max(0, index - 120):index + 180]!r}')
path.write_text(updated)
print('retire-public-graph-bridge: OK')
