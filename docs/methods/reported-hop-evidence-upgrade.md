# Reported-hop evidence upgrade gate

Status: Phase 0 §2.4 release control.

This control applies the evidence-upgrade requirement to accepted hop bases. The actors are the canonical actor registry, the compiled hop graph, the surface and participation ledgers, and the manually reviewed upgrade-disposition register. The mechanism derives every accepted basis from `build/hop-graph.json`, identifies any basis whose weakest evidence class is `reported`, and requires a current, basis-specific record of the unsuccessful stronger-source search while that basis remains reported.

The governed population is deliberately release-wide. Every accepted hop basis is checked, including every route to a declared anchor. This is a conservative superset of the governing phrase “on a path between anchor actors,” and it prevents the current one-anchor graph from producing a vacuous pairwise result. The validator separately reports the connected components containing actors marked `anchor: true` so that the public anchor surface remains visible inside the wider denominator.

## Current baseline

At `main@f66142f5ed6770538f6377466d7160c2045b9a3d`, the compiled graph contains 93 accepted actor edges and 95 accepted hop bases. Seventy-five bases are `official`, twenty are `primary_public`, and zero are `reported`. The connected component containing the declared anchor, Matt Clifford, contains 33 actors, 70 edges, and 72 bases: 62 `official`, ten `primary_public`, and zero `reported`.

The source ledgers still contain five reported participation rows across three surface IDs. Two of those surface rows are themselves classified `reported`. All three remain outside accepted hops: the public-directory observation is not shared participation, the leadership rows are reported role observations rather than a bounded shared event, and the invitation record expressly records non-attendance. Their exclusion is a topology boundary, not an evidence upgrade and not a finding that the underlying reporting is false.

No upgrade search was performed in this pass because there is no accepted `reported` basis to target. Turning the non-hop Dialog observations into an upgrade queue would change the governed object from weak hop evidence to excluded contextual evidence. The gate records the zero denominator and refuses to fabricate a source-acquisition result.

## Failed-upgrade dispositions

A future accepted basis that remains `reported` must have exactly one matching entry in `data/research/reported-hop-evidence-upgrades.json`. The record is bound to the ordered actor pair, surface, effective window, temporal status, and complete current receipt set. It must state when the search occurred, name every searched venue and locator, record the bounded outcome, and explain why the basis remains at the reported tier.

The active result vocabulary contains only `attempted_no_stronger_public_source_found`. Discovery of a stronger source is not represented by that status. It requires an ordinary canonical evidence change to `primary_public` or `official`, recompilation of the hop graph, and removal of any now-stale failed-upgrade disposition. Git history retains the earlier attempt without allowing a superseded failure record to remain active.

A receipt or source search cannot broaden the hop. Upgrading evidence does not add an actor, extend a window, convert institutional context into person-level participation, or turn a rejected surface into an accepted edge. Any such change requires its own source-backed topology review.

## Evidence ledger

The evidence tier is canonical source and participation ledgers, the compiled hop graph, exact Git objects, and executable mutation tests. The venue is a release validator plus the basis-specific disposition register. The target is every accepted basis whose weakest evidence class is `reported`. The upside is a durable refusal to publish weak hop evidence without an upgrade attempt. The downside is that a failed public-source search cannot prove that stronger evidence does not exist. The failure mode is a newly admitted reported basis passing release, a stale disposition surviving after an upgrade, an unrelated receipt being substituted, or contextual non-hop evidence being counted as an accepted hop.

## Commands

```bash
node tools/validate-reported-hop-evidence-upgrades.mjs
node tools/validate-reported-hop-evidence-upgrades.mjs --json
node test/reported-hop-evidence-upgrades.test.js
npm run validate:release
```

The controlling question is: does every accepted basis at the `reported` tier have a current, source-bounded stronger-evidence search disposition, while stronger bases and reported non-hop observations remain in their correct populations?
