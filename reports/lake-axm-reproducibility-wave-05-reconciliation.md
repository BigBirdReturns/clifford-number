# AXM Genesis v1 reproducibility Wave 05 reconciliation

Source fingerprint: `4e653ab5fe04e144ab3e91dc117fc8b41624e92e69f9c9a0a6057f1222f2fab7`

## Result

```text
external repository:                       BigBirdReturns/axm-genesis
external commit:                           411ef40e6cfc3ecb97ac3e256c8151be678347c8
fixture bytes equal:                       true
Python / Node runtime outputs equal:       true
entity successors mapped:                  176
claim successors mapped:                   164
entity migration one-to-one:               true
claim migration one-to-one:                true
source controls indexed:                    true
active projection scheme:                  provisional
active projection migrated:                false
external AXM gate complete:                false
cross-case join authorized:                false
decisions requiring human permission:      0
```

## Judgment

The target algorithm is no longer ambiguous: the pinned Node implementation, copied fixture bytes, and pinned Python runtime agree. The current projection still carries the retired provisional identifiers. The migration map makes the next execution exact, but does not impersonate that execution.

## Boundary

A compatibility map is not a real-world identity finding and is not join authority. Cross-case joins remain disabled until the active projection, aliases, claim references, historical validation surfaces, and downstream products are migrated and revalidated together.
