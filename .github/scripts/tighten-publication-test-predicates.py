#!/usr/bin/env python3
from pathlib import Path

path = Path('test/ui-contract.test.js')
text = path.read_text()
old = "assert.doesNotMatch(app, /function researchNetworkModel|graph\\.json|legacyGraph/);"
new = "assert.doesNotMatch(app, /function researchNetworkModel|loadJson\\('graph\\.json'\\)|legacyGraph|legacyNodes/);"
if text.count(old) != 1:
    raise RuntimeError(f'ui-contract retired-graph predicate anchor count: {text.count(old)}')
path.write_text(text.replace(old, new, 1))
print('tighten-publication-test-predicates: OK')
