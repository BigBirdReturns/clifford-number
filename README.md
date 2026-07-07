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
build/joins.json
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

`tools/lib/axm-identity.mjs` wires that derivation into one artifact per case, `build/cases/<id>/axm-identity.json` (the default case also mirrors to `build/axm-identity.json`), kept separate from the hop/surface/receipt graphs:

- **Entities.** Every canonical actor, organization, and surface gets an AXM entity ID derived **kind-based** from `(kind, label)`, where `kind` is exactly `actor | organization | surface` — **not** the case id. Identical labels of the same kind therefore converge to the same ID across cases (e.g. "Andreessen Horowitz" as an organization resolves to the same ID in the UK and US cases), which is the join precondition from BUILD-INSTRUCTIONS 3.2: a case-scoped namespace made that join impossible by construction. The `scheme` block records this as `namespace_convention` and carries the case id as an informational `case` field. Aliases — from a `data/canonical/aliases.json`-style registry and/or each registry row's own `aliases` array — yield additional alias-derived IDs on the same entity, so a corpus that says "Sir Simon Case" and one that says "Simon Case" still join.
- **Time-qualified claims.** Each participation row becomes a `participates_in` claim. The claim ID is content-addressed over `(subject, predicate, object, object_type)` only — **identity is time-stable** — while temporal validity attaches as windows in the `temporal@1` vocabulary. Multiple stints of the same participant on the same surface are one claim with several windows, never several claims. An undated participation is preserved as `dated: false` with open bounds, not invented.
- **Honesty markers.** The artifact's `scheme` block records the reconciled status and cites the shared vectors and conformance test; `validate:release` recomputes the whole layer from the ledger and fails on any drift, staleness, or a stripped or weakened reconciliation statement.

`query:hops --from` / `--to` also accept a canonical AXM entity ID (canonical or alias-derived) and resolve it to the local actor before traversal:

```bash
npm run query:hops -- --from e1_2bikqdoe6zfiy7kjoezph6p7ucdoiqwalxlg2xqgrf34hem5ypgq   # "Ben Warner" (kind-based alias-derived)
```

## Cross-case joins

Because identity is kind-based, the same entity mentioned in two independently
built cases derives the same AXM id. `tools/build-joins.mjs` reads every pipeline
case's `build/cases/<id>/axm-identity.json` and groups entities across cases into
`build/joins.json` (also `npm run build:joins`).

- **Join rule.** Two entities in different cases are the same entity when any of
  their kind-based AXM ids (canonical label or alias-derived) coincide. Only an
  entity present in **≥ 2 cases** becomes a join. Each join records the matching
  `axm_entity_id`, its `kind`, `via` (`canonical_label` or `alias`), and the
  case-qualified `members`. Joins are **mechanical** — a deterministic function of
  the identity layer; nothing is decided here.
- **Exclusions (denials are canonical).** Denials never live in generated
  artifacts (constitution 1.4). The OPTIONAL `data/canonical/join-exclusions.json`
  (`{"exclusions":[{"axm_entity_id","reason","decided_by","date"}]}`) suppresses a
  match — but the match is **moved to the `excluded` array with its members and
  reason, never silently dropped**, so every denial stays visible and checkable.
  The file's absence is normal; do not create it to disable a join you merely
  dislike. `validate:release` recomputes the whole layer from the per-case
  identity artifacts and fails on any drift, and fails on a **dangling
  exclusion** — one whose id has no multi-case match, i.e. a denial that no longer
  denies anything.
- **What the layer contains today.** Two organic joins, both organizations, both
  on the canonical label: **Andreessen Horowitz**
  (`uk-ai-policy:andreessen-horowitz + us-defense-natsec100:andreessen-horowitz`)
  and **OpenAI** (`uk-ai-policy:openai + us-defense-natsec100:openai`). Both are
  genuine same-entity matches — the same firm named in both the UK AI-policy and
  US defense-tech corridors — not false collisions, so neither is excluded. No
  person joins yet: the NatSec100 case carries only ranked organizations (zero
  person actors, zero hop edges) until its chunk-2 actor rows land.

### `query:hops --case all`

```bash
# Merged graph: nodes are <case_id>:<local_id> except joined entities, which
# collapse into one node; every hop line is labelled with the case its receipts
# live in ([case: <id>]); traversal crosses cases only through joined nodes.
npm run query:hops -- --case all --from ben-warner
npm run query:hops -- --case all --from andreessen-horowitz --to matt-clifford
npm run query:hops -- --case <id> --from <local|e1_…>   # one specific case
```

`--from`/`--to` accept a local id (resolved across cases; if it is ambiguous
between cases and not joined, the default case is preferred and a note is
printed) or a canonical/alias-derived `e1_…` id. `--as-of` composes unchanged. A
joined node renders as `Andreessen Horowitz (joined: uk-ai-policy:andreessen-horowitz + us-defense-natsec100:andreessen-horowitz)`.
Today a `--from andreessen-horowitz` query resolves to that joined node but finds
no cross-case path: it is an organization (hops are actor-to-actor) and the
NatSec100 case has no hop edges yet — the honest state of a join layer whose
second case is still organizations-only.

## Deltas

A **delta** is the diff of two compiles of the same case, rendered as a narrated
changelog with receipts. Deltas are the **publishable unit** (BUILD-INSTRUCTIONS
3.3): the compiler builds graphs, the delta reports what moved between two of
them, and downstream writing consumes the delta, not the raw graph. Because the
build artifacts are committed, **git refs ARE the compile history** — a delta
across time needs no snapshot infrastructure, only two refs.

`tools/delta.mjs` (`npm run delta`) computes the diff at hop-basis granularity —
edges keyed by the sorted actor pair, bases by `surface_id` within the pair — and
reports new/removed surfaces, new/removed hop pairs, new/removed bases, window
changes (closed / opened / widened / narrowed / temporal-status), evidence-class
changes (with direction up or down the ladder per `evidenceWeight`), receipt
gains and losses, and surfaces entering or leaving `rejected_hop_surfaces` (a
surface that leaves because of the density rule is a story, not noise). Every
rendered sentence carries the receipt ids in effect and the temporal/evidence
honesty flags, in the style of `narrate-hops`; an empty delta prints
`no changes between these compiles`, never an error.

```bash
# Across time: two git refs (each resolves via git show; refs predating the
# multi-case layout fall back to the legacy top-level build/hop-graph.json).
npm run delta -- --case uk-ai-policy --from 91596cc --to HEAD --md

# --to defaults to the working-tree build/cases/<id>/.
npm run delta -- --case uk-ai-policy --from HEAD~1

# Across directories: two compile output dirs (reads <dir>/hop-graph.json).
npm run delta -- --case uk-ai-policy --from build/cases/uk-ai-policy --to /tmp/old-compile

npm run delta -- --case uk-ai-policy --from <ref> --to <ref> --json   # for tooling
```

`--from`/`--to` each resolve a compile state: a **directory** is read from disk,
anything else is a **git ref** read via `git show <ref>:build/cases/<id>/…`.
Deltas across cases are, today, just two `--case` runs — a cross-case delta of
the join layer itself can come later.

