# The Clifford Number

The Clifford Number is a surface-hop topology compiler. It maps how bounded legitimate surfaces carry actors, companies, policy machinery, advisory roles, capital, and outcomes through plausible-deniability corridors.

Governance: [BUILD-INSTRUCTIONS.md](BUILD-INSTRUCTIONS.md) is the governing document — the constitutional invariants (Section 1) and the phased build plan through 2037. Agents and maintainers read it before executing work in this repository.

## Public inspection path

A reviewer can inspect the current public release in about a minute:

1. Open the [live application](https://bigbirdreturns.github.io/clifford-number/).
2. Read the in-app [method overview](https://bigbirdreturns.github.io/clifford-number/#method/overview) and the fuller [methodology](docs/methodology.md).
3. Inspect the canonical source-of-truth ledgers: [`claims`](data/ledger/claims.jsonl), [`surfaces`](data/ledger/surfaces.jsonl), [`participation`](data/ledger/participation.jsonl), [`receipts`](data/ledger/receipts.jsonl), and [`chains`](data/ledger/chains.jsonl). Generated files under `build/` and the Pages artifact are disposable views, not authority.
4. Open the existing [Starmer → Clifford result, as of 2025](https://bigbirdreturns.github.io/clifford-number/#desk/keir-starmer/matt-clifford/2025). The one-day 13 January 2025 surface exposes both participation roles, the overlap window, the evidence class, and its receipt links. It supports documented shared context on that bounded policy surface only.
5. Reproduce the release gate from a clean checkout with `npm ci` followed by `npm run release:check`.

The standing forbidden-inference boundary is unchanged: co-presence is never coordination, and no undocumented relationship, intent, influence, benefit, wrongdoing, common purpose, or causation may be inferred from a shared surface or from absence in this corpus.

This release abandons the generic shortest-path edge graph. The old graph is preserved under `legacy/`, but it is no longer the product.

## Public app

The static app has two complementary views:

- **Topology explorer:** search public actors, organizations, and bounded surfaces; inspect an actor → surface → actor route; open every receipt and archival reference behind it.
- **Connection checker:** enter two public actors and an optional year, month, or day; get the shortest defensible route, its evidence floor, copy-ready caveat language, and the connections the compiler refused to make.

The public interface treats receipt health, temporal precision, dense-surface exclusions, and inference boundaries as first-class output. Structural context is displayed separately from Clifford hops and is never presented as probability, guilt, or motive.

Compiled case files extend that discipline from topology into programs, typed capital flows, public-role transitions, capability observations, and outcomes. The first golden case, FA-03, is intentionally review-gated: the prototype's assertions are preserved without being mislabeled as independently verified. See [the case-ledger contract](docs/case-ledger.md).

Official-record growth follows an observation-first crawler contract modeled on Undercast: scheduled adapters harvest bounded public records into a non-publishing candidate queue; only a separate reviewed change can promote them into canonical truth. See [the official-record crawler](docs/official-record-crawler.md).

Start with the audience-based [documentation index](docs/README.md), then read the current [methodology](docs/methodology.md) and [definitions](docs/definitions.md).


## Operational waterlines

- **Report waterline:** [`reports/index.html`](reports/index.html) shows cases moving from intake through structured report and independent review.
- **Estate waterline:** [`estates/index.html`](estates/index.html) preserves the closed M-01 fourteen-estate, 143-task pass through the four-level Estate Aperture.
- **Game-trail waterline:** [`gametrails/index.html`](gametrails/index.html) exposes 24 durable estates, 10 prepared frontier surveys, and 308 current trails through typed overlap, custody, shared-source, bounded non-overlap, and unresolved terminal classes.
- **Milestone M-01:** [`docs/milestones/estate-aperture-v1.md`](docs/milestones/estate-aperture-v1.md) records completion of the declared estate pass without claiming that any estate is evidentially complete.
- **Milestone M-02:** [`docs/milestones/estate-frontier-game-trails-v1.md`](docs/milestones/estate-frontier-game-trails-v1.md) records the frontier survey and complete current game-trail rerun without claiming acquisition or relationship findings.

Both surfaces are projections over typed custody. Neither creates a claim, graph edge, score, allegation, causal conclusion, or publication approval.

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
data/ledger/chains.jsonl
```

Claims preserve sourced facts. Surfaces define bounded adjacency objects. Participation rows link actors and organizations to surfaces. Receipts preserve source support. Chains preserve separately typed multi-stage analytical sequences without creating actor hops.

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
build/estate-closures/manifest.json
estates/data.json
estates/index.html
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
6. Hop bases carry validity windows; disjoint dated participations on a shared surface create no hop, and broad-office role observations remain explicit context rather than pairwise adjacency.

## Temporal identity layer (provisional)

`tools/lib/axm-id.mjs` vendors the AXM content-addressed identity envelope (axm-core `IDENTITY.md`: SHA-256 → first 15 bytes → base32 lowercase, no padding, type prefix) so that two independently built cases mentioning the same entity can produce the same ID — the precondition for cross-case joins and dark-network deltas. The envelope is authoritative; the namespace/label input serialization is **provisional** and must be reconciled byte-for-byte against `axm-genesis` (`axm_verify.identity`) before these IDs are used as cross-system join keys.

`tools/lib/axm-identity.mjs` wires that envelope into exactly one artifact, `build/axm-identity.json`, so the provisional IDs stay quarantined from the hop/surface/receipt graphs:

- **Entities.** Every canonical actor, organization, and surface gets a provisional AXM entity ID derived from `(case namespace, label)`. Registry aliases yield additional alias-derived IDs on the same entity — a corpus that says "Sir Simon Case" and one that says "Simon Case" still join.
- **Time-qualified claims.** Each participation row becomes a `participates_in` claim. The claim ID is content-addressed over `(subject, predicate, object)` only — **identity is time-stable** — while temporal validity attaches as windows in the `temporal@1` vocabulary. Multiple stints of the same participant on the same surface are one claim with several windows, never several claims. An undated participation is preserved as `dated: false` with open bounds, not invented.
- **Honesty markers.** The artifact's `scheme` block carries the provisional status and the reconciliation obligation; `validate:release` recomputes the whole layer from the ledger and fails on any drift, staleness, or a stripped caveat.

`query:hops --from` / `--to` also accept a provisional AXM entity ID (canonical or alias-derived) and resolve it to the local actor before traversal:

```bash
npm run query:hops -- --from e_cxoy37udrurtowdj47suemrw   # "Ben Warner" (alias-derived)
```
## Estate frontier and game trails

M-02 surveys ten additional macro estates and reruns all preserved, source-route, and custody trails through the [Game-Trail Aperture](gametrails/). See [the milestone record](docs/milestones/estate-frontier-game-trails-v1.md).
