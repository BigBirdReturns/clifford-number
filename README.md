# The Clifford Number

The Clifford Number is a surface-hop topology compiler. It maps how bounded legitimate surfaces carry actors, companies, policy machinery, advisory roles, capital, and outcomes through plausible-deniability corridors.

Governance: [BUILD-INSTRUCTIONS.md](BUILD-INSTRUCTIONS.md) is the governing document — the constitutional invariants (Section 1) and the phased build plan through 2037. Agents and maintainers read it before executing work in this repository.

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
6. Hop bases carry validity windows; disjoint dated participations on a shared surface create no hop (e.g. Rosenfield and Cummings, who were in No. 10 in non-overlapping windows).

## Temporal identity layer (AXM Genesis v1)

`tools/lib/axm-id.mjs` delegates active identity to the commit-pinned AXM Genesis v1 rules: NFC normalization, ASCII-only lowering, frozen whitespace handling, NUL-separated preimages, full 32-byte SHA-256 digests, and versioned `e1_` / `c1_` prefixes. The cross-runtime fixture and attestation are committed under `data/project/`; the exact 176-entity and 164-claim predecessor map is in `build/axm-identity-genesis-v1-migration.json`.

`tools/lib/axm-identity.mjs` materializes the reconciled active projection in `build/axm-identity.json`:

- **Entities.** Every canonical actor, organization, and surface carries a current Genesis v1 `axm_entity_id`, plus its retired `legacy_provisional_entity_id`. Current and legacy alias-derived IDs remain attached to the same local registry object.
- **Time-qualified claims.** Each participation pair carries a current `c1_` claim and a retired `legacy_provisional_claim_id`. Temporal windows, roles, evidence classes, receipts, local IDs, and hop semantics are unchanged.
- **Append-preserving migration.** `data/project/lake-axm-active-identity-registry-wave-06.jsonl` records every one-to-one predecessor/successor transition. Old IDs resolve; they do not remain current and do not merge entities.

### Explicit cross-case identity resolution

`tools/lib/axm-cross-case-join.mjs` implements one graph-inert resolution lane proved by the Wave 07 synthetic fixture. A bridge is accepted only when both local records carry source custody, a separate same-entity assertion carries its own custody, both records use the same identity namespace, and their canonical or declared-alias token overlap is unambiguous. The complete accepted/rejected decision ledger is `data/project/lake-axm-cross-case-join-registry-wave-07.jsonl`.

This lane does not create a graph edge or hop, does not merge source entities, and does not treat matching labels as proof. Automatic same-label joins, different-namespace joins, ambiguous aliases, missing-custody assertions, cross-case graph joins, and cross-case hop creation remain prohibited. The broad active projection flag remains `cross_case_join_authorized: false`; the accepted scope is `explicit_source_custodied_graph_inert_identity_resolution_only`.

`query:hops --from` / `--to` accept local IDs, current Genesis IDs, and retired predecessor IDs:

```bash
npm run query:hops -- --from e1_36m7cjmqzlwdou4gr37cqy7jnckjsr6behzpbfmp7zphwzfynx7a  # Dr. Ben Warner
npm run query:hops -- --from e_gkmzucjlt7bu6i3s2nmqddmm                              # retired predecessor
```

## Estate frontier and game trails

M-02 surveys ten additional macro estates and reruns all preserved, source-route, and custody trails through the [Game-Trail Aperture](gametrails/). See [the milestone record](docs/milestones/estate-frontier-game-trails-v1.md).

## Canonical acquisition adjudication

Wave 11 converts the typed acquisition queue into explicit canonical decisions.
Each candidate is classified as a new record, alias, duplicate, collision, bounded
hold, or nonidentity reroute. Only the source-custodied, publicly inspectable,
unambiguous subset is appended to the actor, organization, and alias registries.
Every refusal remains queryable with its blocker and correction route.

The expansion is identity-only and graph-inert: it creates no participation,
relationship, edge, hop, or automatic cross-case join. The original AXM Genesis
migration remains the historical baseline; later entities and aliases are carried
by a separate append-preserving extension registry.

## Bounded-hold resolution

Wave 12 attacks the prior bounded holds directly. Acronyms, contextual local IDs,
municipal duplicates, and private-only company references receive explicit public
or repository-preserved source custody, local-to-canonical assertions, and named
correction routes. The two Arcadia municipal IDs resolve to one City of Arcadia
record; public company and CDAO sources replace private-only identity custody.

These are identity-resolution decisions only. They do not merge source records,
validate every case claim, establish program performance, create participation or
relationships, or enter the hop graph.

## Exact canonical subject projection

Wave 14 recognizes case claim subjects that already use an exact canonical actor or
organization ID, while preserving explicit case-scoped resolutions as the higher
precedence decision. The remaining subjects are not guessed: they are retained in a
typed routing registry for identity, place/infrastructure, program/contract,
case/analytic, named-object, or still-unclassified work.

This is generated identity metadata only. Source claim IDs and text are unchanged,
and the projection creates no relationship, participation, graph edge, hop, or
automatic cross-case join.

## Unresolved subject adjudication

Wave 15 converts the complete Wave 14 unresolved denominator into bounded decisions:
provenance-backed identities, named controlled mappings, three canonical-creation
plans, and typed nonidentity subject objects. Nothing remains in a generic
wait-for-review state.

The adjudication is additive metadata. Source claims and canonical registries are not
mutated in this wave, and no decision creates a relationship, participation row,
graph edge, hop, or automatic cross-case join.

## Integrated subject layer

Wave 16 makes the completed Wave 15 decisions usable in generated cases and the public
catalog. Seventeen identity decisions travel through the existing graph-inert local
resolution lane; forty nonidentity decisions travel through a separate typed
subject-object lane. The result distinguishes unresolved identity from a resolved
contract, program, record, place, infrastructure item, product, site, role, or
analytic construct.

This projection preserves source claim bytes and creates no relationship,
participation, graph edge, hop, or automatic cross-case join.

## Residual lake frontier

Wave 17 separates four residuals that must not be collapsed: program ownership,
exact orphan status, index reachability, and projection lineage. It assigns bounded
custody, creates explicit index routes, and records how generated identifiers arise.
These repairs improve addressability; they do not establish evidence truth, historical
completeness, remote source-byte custody, publication clearance, or a common-purpose
conclusion.

## Identifier topology

Wave 18 makes the residual machine-identifier topology addressable without collapsing
indexing, projection, identity, truth, or publication. Every frozen identifier receives a
bounded index, source-only, and divergence disposition. Source-only controls, intake IDs,
case-local IDs, and domain IDs do not acquire a public projection merely to lower a count.
Typed cross-family views remain distinct, and same-family variants carry generator-contract
repair actions. No topology decision creates a relationship, participation row, graph edge,
or automatic cross-key join.

## Generator contracts

Wave 19 converts the residual generator-action queue into named, enforceable sidecar
contracts. Exact generated paths receive uniqueness or version contracts; projection
families receive structural schema or version boundaries that do not freeze every
payload byte. The registry closes the bounded action queue while retaining raw typed
divergence where it is legitimate.
No contract authorizes a cross-key join or creates a relationship, participation row,
graph edge, truth determination, or publication clearance.

## Receipt and source custody

Wave 20 adjudicates the residual unused-receipt denominator without manufacturing
consumption. It separates compound reference-encoding defects from hash-pinned,
locator-only, coverage-source, explicitly unresolved, and repository-only custody.
Every decision is reversible and graph-inert; source claims and receipt definitions
remain byte-stable.


## Allocator-war lake waterline

Wave 21 imports the reviewed allocator-war Wave 01 waterline and the unreviewed SSC Wave 02 frontier through exact commit-and-path custody. It exposes separate observation, findings-waterline, estate-acquisition, and program-feed registries while retaining zero graph and publication effect. See `reports/lake-allocator-war-wave-21.md`.


## Allocator-war estate execution queues

Wave 22 converts the eleven allocator-war estate feeds into 52 deterministic acquisition tasks while retaining reviewed, split-authority, and unreviewed-intake states. See `reports/lake-allocator-war-estate-execution-wave-22.md`.


## Allocator-war lead acquisition launch

Wave 23 selects one lead acquisition packet from each of the eleven Wave 22 estate queues and attaches official-first source families, exact receipt requirements, negative-search duties, and packet-specific future result ledgers. No evidence rows, findings, graph effects, or publication clearances are created. See `reports/lake-allocator-war-lead-acquisition-wave-23.md`.


## Allocator-war lead acquisition execution

Wave 24 converts the eleven lead packets into eleven packet-specific acquisition ledgers containing sixty-two bounded acquisition rows. Nine packets retain partial institutional recoveries and two retain gate-unspecified public records. Complete denominators, evidence rows, findings, graph effects, and publication clearances remain zero. See `reports/lake-allocator-war-lead-execution-wave-24.md`.


## Allocator-war denominator closure fan-out

Wave 25 converts forty explicit missing-record obligations into eleven estate-owned closure queues. Thirty-six tasks are ready for targeted acquisition, while four downstream tasks remain blocked behind two gate-identification tasks. Evidence rows, findings, graph effects, and publication clearances remain zero. See `reports/lake-allocator-war-denominator-closure-wave-25.md`.


## Allocator-war targeted closure execution

Wave 26 executes thirty-six ready closure tasks, preserves four blocked tasks, identifies one bounded public-interest institutional gate, and records one no-qualifying-gate result for the legislative-political-finance lane. Two downstream tasks become eligible only for a later wave. Complete denominators, evidence rows, findings, graph effects, and publication clearances remain zero. See `reports/lake-allocator-war-targeted-closure-wave-26.md`.


## Wave 26 public-interest gate source custody

The Wave 26 public-interest gate is bound to nine exact executive, Foreign Service, judicial, and procurement-control sources. Research sources remain confined to the separate legislative no-gate search. The source-custody repair preserves both result states, two downstream public-interest tasks, two blocked legislative-finance tasks, and zero evidence, finding, graph, or publication effect. See `reports/lake-allocator-war-wave26-source-custody-repair.md`.


## Allocator-war public-interest downstream Wave 27

Wave 27 executes the two public-interest tasks unlocked by the repaired federal institutional gate. It records partial formal-category and consequence-and-correction recoveries, preserves the legislative and political-finance no-gate blocks, and retains zero complete denominators, evidence rows, findings, graph effects, or publication clearances. See `reports/lake-allocator-war-public-interest-downstream-wave-27.md`.


## Allocator-war public-interest implementation Wave 28

Wave 28 converts the two partial public-interest results into twelve exact implementation acquisition tasks across five estate owners. The queues preserve zero evidence, estate adoption, findings, graph effects, and publication authority. See `reports/lake-allocator-war-public-interest-implementation-wave-28.md`.


## Allocator-war public-interest execution Wave 29

Wave 29 executes all twelve public-interest implementation obligations against thirty-four exact official source receipts. Eleven results remain partial and one terminates as unavailable after bounded search. The wave preserves zero complete denominators, evidence rows, estate adoptions, findings, graph effects, and publication clearances. See `reports/lake-allocator-war-public-interest-execution-wave-29.md`.


## Allocator-war gap fan-out Wave 30

Wave 30 converts all thirty-eight explicit missing rows retained by Wave 29 into seven reusable route ledgers. The projection preserves zero complete denominators, evidence rows, estate adoptions, findings, graph effects, and publication clearances. See `reports/lake-allocator-war-gap-fanout-wave-30.md`.


## Allocator-war public-route execution Wave 31

Wave 31 executes the thirty-four publicly addressable Wave 30 obligations through six reusable official-source lanes while retaining four protected-personnel obligations under privacy-safe or otherwise lawful access. Public base universes, action announcements, dockets, and audit records remain bounded acquisition surfaces rather than complete denominators or findings. See `reports/lake-allocator-war-public-route-execution-wave-31.md`.

## Allocator-war bounded source snapshots Wave 32

Wave 32 freezes each of the nineteen Wave 31 official locators as one exact public request-response object or one explicit credential boundary. Fifteen bounded requests and four access boundaries are reused across the unchanged thirty-eight-task route denominator. Frozen source responses remain acquisition-only and create no evidence, finding, graph, or publication effect. See `reports/lake-allocator-war-bounded-source-snapshots-wave-32.md`.


## Allocator-war frozen source structural parses Wave 33

Wave 33 verifies every permanent Wave 32 response hash and emits one deterministic structural parse row for each of the nineteen source objects. Seven JSON, eight HTML, and four credential-boundary rows are reused across the unchanged route and task denominator. Structural addressability creates no complete denominator, evidence adjudication, finding, graph effect, or publication authority. See `reports/lake-allocator-war-structural-parses-wave-33.md`.


## Allocator-war source schemas and lawful joins Wave 34

Wave 34 maps all nineteen permanent Wave 33 parse objects through source-specific schema adapters and defines seven explicit lawful-join contracts. The thirty-one missing institutional requirements remain open, including three protected-personnel requirements that require lawful or privacy-safe access. Schema addressability creates no authorized join, complete denominator, evidence adjudication, finding, graph effect, or publication authority. See `reports/lake-allocator-war-schema-joins-wave-34.md`.


## Allocator-war lawful join requirement fan-out Wave 35

Wave 35 converts all thirty-one unsatisfied Wave 34 institutional requirements into seven estate-owned acquisition queues. Twenty-eight tasks enter public, separately authorized, or lawful-case lanes; three protected-personnel tasks remain bounded to authorized lawful access. Task admission creates no acquisition result, join authorization, complete denominator, evidence adjudication, finding, graph effect, or publication authority. See `reports/lake-allocator-war-join-requirements-wave-35.md`.


## Allocator-war official-record public acquisition Wave 36

Wave 36 freezes fifty bounded official records and maps source-backed institutional components to all twenty-eight public or lawful-case Wave 35 tasks while preserving the three protected-personnel tasks. The permanent validator keeps requirement satisfaction, join authority, complete denominators, evidence, findings, graph effects, and publication clearance at zero. See `reports/lake-allocator-war-public-acquisition-wave-36.md`.


## Allocator-war residual institutional obligations Wave 37

Wave 37 compares all thirty-one permanent Wave 36 task results with their inherited completion tests and emits one exact residual institutional obligation per task. Twenty-eight obligations retain official component custody and three retain protected lawful-access-only custody. The complete priority denominator orders further acquisition without treating priority as evidence strength or waiting for undefined outside reviewers. Requirement satisfaction, joins, evidence, findings, graph effects, and publication clearance remain zero. See `reports/lake-allocator-war-residual-obligations-wave-37.md`.
