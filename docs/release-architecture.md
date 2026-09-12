# Surface-Hop Release Architecture

The old edge graph stored claims as node-to-node relationships. That was useful for preserving facts, but it could not compute the project thesis. The new system separates claims, surfaces, participation, receipts, generated hops, and generated scores.

## The bug

The software tracked edges. The research problem requires surfaces.

An edge can say `Ben Warner co-founded Electric Twin`. A surface says `Electric Twin founder/officer surface, 2023-present` and lists the participants, roles, receipts, dates, and surface types that make it meaningful.

## The compiler law

The app never computes Clifford Number from `claims.jsonl`. It computes Clifford Number only from `build/hop-graph.json`, which is generated from explicit participation in valid bounded surfaces.

Every hop must have:

```text
actor_a
actor_b
shared_surface_id
surface_type
participation row for actor_a
participation row for actor_b
receipt_ids
```

## Surface-type recurrence

Surface-type recurrence is the discovery mechanism. The compiler tracks when the same surface logic recurs across different venues, such as government advisory work, commercial customer infrastructure, category formation, procurement, board/advisory positions, and policy documents.

Example: official records place Ben Warner in a No. 10 digital-and-data role, while later records separately place him on Electric Twin, News UK synthetic-audience, and Gartner category surfaces. The recurrence is a chronology for testing. It does not establish that the commercial method originated in government, that public consultation was replaced inside No. 10, or that other No. 10 personnel shared the later surfaces.

## Non-hop surfaces still matter

A non-hop surface can still be scorable. The Electric Twin / News UK synthetic audience surface is not hop-eligible because News UK is an organization and the surface does not create an actor-to-actor co-participation hop. It is still scorable because it contributes to democratic-input replacement, model governance, and plausible-deniability analysis.

## Migration rule

The current master document is parsed into `build/migrated-claims.jsonl` and `build/migration-review.md`. That does not automatically create hop graph data. Rows must be promoted into source ledgers only when they define bounded surfaces and explicit participation.

## Reproducible projection clock

Projection `generated` fields use `clifford-build-clock@1`, loaded from the checked-in admitted input `data/project/build-clock.json`. A supplied `SOURCE_DATE_EPOCH` must match that input exactly. The clock performs no fetch and does not depend on wall time or mutable repository metadata. It is a reproducible projection timestamp, not an acquisition date, event date, verification date, or source-freshness claim; those dates remain in their owning receipts and interval records.

## Positive publication boundary

The Pages artifact is assembled only from the exact paths in `data/project/publication-allowlist.json`. New repository files remain outside the artifact until that policy changes and the full native gate reruns. `tools/finalize-release-artifact.mjs` binds the artifact to the checked-out commit and tree, emits `deployment-sha.txt`, records every payload byte in `release-artifact-manifest.json`, enforces size budgets, and rejects held custody paths, symlinks, machine-local paths, or credential signatures. The deployment workflow verifies that immutable manifest before upload and again after deployment.
