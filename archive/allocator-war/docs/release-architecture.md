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

Example: Ben Warner recurs across No. 10 population-level data machinery, Electric Twin synthetic audience infrastructure, News UK audience substitution, and Gartner category formation. The point is not one secret relationship. The point is a repeated surface logic becoming infrastructure.

## Non-hop surfaces still matter

A non-hop surface can still be scorable. The Electric Twin / News UK synthetic audience surface is not hop-eligible because News UK is an organization and the surface does not create an actor-to-actor co-participation hop. It is still scorable because it contributes to democratic-input replacement, model governance, and plausible-deniability analysis.

## Migration rule

The current master document is parsed into `build/migrated-claims.jsonl` and `build/migration-review.md`. That does not automatically create hop graph data. Rows must be promoted into source ledgers only when they define bounded surfaces and explicit participation.
