# The Clifford Number

The Clifford Number is a surface-hop topology compiler. It maps how bounded legitimate surfaces carry actors, companies, policy machinery, advisory roles, capital, and outcomes through plausible-deniability corridors.

Governance: [BUILD-INSTRUCTIONS.md](BUILD-INSTRUCTIONS.md) is the governing document — the constitutional invariants (Section 1) and the phased build plan through 2037. Agents and maintainers read it before executing work in this repository.

This release abandons the generic shortest-path edge graph. The old graph is preserved under `legacy/`, but it is no longer the product.

## Core rule

A Clifford Number path may only move from Actor to Actor through a shared bounded Surface.

A broad institution is not a hop. No. 10, Cabinet Office, DSIT, ARIA, News UK, Faculty, and Electric Twin can appear as venues or organizations, but they do not create Clifford Number hops by themselves. A named bounded surface inside them can.

## Temporal rule

A hop is not timeless. Two actors only shared a bounded surface during the window where their participations *and* the surface overlap. So every hop basis carries a validity window — the intersection of the surface window and both participation windows — and if two dated participations on the same surface do not overlap, that surface creates **no** hop between them (recorded in `rejected_hop_pairs`).

Ledger dates may be year (`2016`), month (`2019-12`), or day (`2019-12-15`) precision; each is widened to the full period it names. Field vocabulary follows the AXM `temporal@1` extension: `valid_from` / `valid_until`, ISO 8601, with `null` for an open end (ongoing / until superseded).

A participation with no dates cannot be placed in time. Such a hop basis still counts for all-time topology but never supports a time-sliced query.

Query the graph on demand, optionally as of a point in time:

```bash
npm run query:hops -- --from ben-warner
npm run query:hops -- --from dominic-cummings --as-of 2020
npm run query:hops -- --from simon-case --to ben-warner --as-of 2026-06 --json
```

`--to` defaults to the anchor actor. `--as-of` accepts a year, month, or day and means "at any point during that period"; time-sliced paths traverse only fully dated hop bases whose window intersects it.

## Source ledgers

```text
data/ledger/claims.jsonl
data/ledger/surfaces.jsonl
data/ledger/participation.jsonl
data/ledger/receipts.jsonl
```

Claims preserve sourced facts. Surfaces define bounded adjacency objects. Participation rows link actors and organizations to surfaces. Receipts preserve source support.

## Canonical registries

```text
data/canonical/actors.json
data/canonical/organizations.json
data/canonical/aliases.json
data/canonical/predicates.json
data/canonical/surface-types.json
```

Canonical files control identities and vocabularies. Do not solve ambiguity in generated artifacts.

## Generated artifacts

```text
build/receipt-graph.json
build/surface-graph.json
build/hop-graph.json
build/axm-identity.json
build/scores.json
build/migration-review.md
build/scout-report.md
```

Generated artifacts are disposable. Do not edit them by hand.

## Commands

```bash
npm run compile
npm run validate:release
npm run scout
npm run release:check
npm run serve
```

`npm run release:check` compiles the master doc, builds the hop graph, scores actors and organizations, runs the scout, validates release invariants, and runs the compiler tests.

## Regression fixtures

This release must pass five fixtures before the full database can be trusted:

1. Ben Warner produces government, employment/investment, campaign, founder/officer, customer/vendor, and category-formation surfaces.
2. Electric Twin behaves as a surface factory, not as a generic organization node.
3. Simon Case is represented through governance continuity surfaces.
4. Surface types distinguish hop-eligible, non-hop scorable, context-only, and scout-only surfaces.
5. Broad institutions never create Clifford Number hops.
6. Hop bases carry validity windows; disjoint dated participations on a shared surface create no hop (e.g. Rosenfield and Cummings, who were in No. 10 in non-overlapping windows).

## Temporal identity layer (reconciled)

`tools/lib/axm-id.mjs` implements the AXM Genesis v1 identifier derivation (genesis spec section 10): a text `canonicalize` (NFC → ASCII-only lowering → strip Unicode category-Cc controls → collapse the frozen whitespace set to one ASCII space and trim), then `id = prefix + base32lower(SHA-256(preimage))` over the **full** 32-byte digest (RFC 4648, no padding) — a versioned prefix (`e1_` / `c1_`) plus exactly 52 base32 characters. Two independently built cases mentioning the same entity produce the same ID — the precondition for cross-case joins and dark-network deltas.

This derivation is **reconciled** byte-for-byte against `axm-genesis` (`axm_verify.identity`). The shared conformance vectors are pinned in `test/vectors/identity.json` (source: axm-genesis commit `a73335d`) and `test/axm-id-conformance.test.js` asserts every canonicalization, entity-id, and claim-id vector against this port, so any drift from the canonical derivation fails `npm test`.

`tools/lib/axm-identity.mjs` wires that derivation into exactly one artifact, `build/axm-identity.json`, kept separate from the hop/surface/receipt graphs:

- **Entities.** Every canonical actor, organization, and surface gets an AXM entity ID derived from `(case namespace, label)`. Registry aliases yield additional alias-derived IDs on the same entity — a corpus that says "Sir Simon Case" and one that says "Simon Case" still join.
- **Time-qualified claims.** Each participation row becomes a `participates_in` claim. The claim ID is content-addressed over `(subject, predicate, object, object_type)` only — **identity is time-stable** — while temporal validity attaches as windows in the `temporal@1` vocabulary. Multiple stints of the same participant on the same surface are one claim with several windows, never several claims. An undated participation is preserved as `dated: false` with open bounds, not invented.
- **Honesty markers.** The artifact's `scheme` block records the reconciled status and cites the shared vectors and conformance test; `validate:release` recomputes the whole layer from the ledger and fails on any drift, staleness, or a stripped or weakened reconciliation statement.

`query:hops --from` / `--to` also accept a canonical AXM entity ID (canonical or alias-derived) and resolve it to the local actor before traversal:

```bash
npm run query:hops -- --from e1_g4hfdlwct4rudhgh2kp5fnyv5ryh54lbf7d66celq6mtxa3xlcpq   # "Ben Warner" (alias-derived)
```

