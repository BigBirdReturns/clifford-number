# The Clifford Number

Current release line: **2.1.0** (the explorer release). See [the 2.1.0 release notes](docs/releases/2.1.0.md). Earlier releases: [2.0.0](docs/releases/2.0.0.md), [1.3.0](docs/releases/1.3.0.md), [1.2.0](docs/releases/1.2.0.md), [1.1.0](docs/releases/1.1.0.md), [1.0.0](docs/releases/1.0.0.md).

## What this is

The Clifford Number is a compiler for public records. It reads a set of hand-checked source files and works out which public actors share a documented, bounded context. A bounded context is called a **surface**: a named advisory board, a company filing, a funding round, a taskforce roster, a policy report with named authors. Two actors are one hop apart when both held a documented role on the same surface during overlapping dates. A broad institution is never a hop. "Both worked in No. 10" creates nothing. A named roster inside No. 10 can.

Every statement in the output traces to a **receipt**: a public source with a link, a stored copy that can be checked by hash, and a written statement of what the source does not show. The output is documented shared context and nothing more. Co-presence is never coordination, and no intent, influence, benefit, wrongdoing, common purpose or cause may be inferred from a shared surface or from absence in this corpus. The project maps structure. Readers and reporters draw their own conclusions, in their own names.

Governance: [BUILD-INSTRUCTIONS.md](BUILD-INSTRUCTIONS.md) is the governing document. Its Section 1 (the constitution) never changes. Agents and maintainers read it before doing any work here. [CONTRIBUTING.md](CONTRIBUTING.md) turns it into working rules.

## What 2.1.0 is

2.1.0 is the explorer release. It adds no new research findings and has had no outside review. The explorer now opens on a ledger timeline (one mark per participation row; a shared surface is a column, never a line between two people); the Network field sizes nodes by documented counts instead of a composite heat and opens the row or claim behind every arc; the dead SVG atlas that the aperture had been mounting over was removed from `app.js` (4,059 to 1,820 lines); three retired programmes moved to `archive/programmes/` and 577 of their paths left the publication allowlist; 25 builders and validators gained a main-guard that is true on Windows; the release gate runs clean again. The explorer's first load fell from about 8.4 MB to about 3.0 MB by file-size sum. See the [release notes](docs/releases/2.1.0.md) for the full list, the figures and what is not claimed.

2.0.0 (12 October 2026) was the consolidation release: GitHub workflows went from 334 to 5, validator scripts from 386 to 170, npm scripts from 160 to 46, and no workflow runs on a timer. At 2.1.0 the counts are 5 workflows, 172 `tools/validate-*.mjs` files plus one Python file kept outside the gate, and 52 npm scripts (46 when the 2.0.0 note was written; the lake-identity and reservoir commits later on the 12 October cut added six: `validate:lake-identity`, `merge:lake-identity`, `build:reservoir`, `validate:reservoir`, `reservoir:open`, `reservoir:view-disposition`). Research that lived only in closed issues and unmerged branches stays in the held `archive/` folder. See [the 2.0.0 notes](docs/releases/2.0.0.md).

## Public inspection path

A reviewer can inspect the current public release in about a minute:

1. Open the [live application](https://bigbirdreturns.github.io/clifford-number/).
2. Read the in-app [method overview](https://bigbirdreturns.github.io/clifford-number/#method/overview) and the fuller [methodology](docs/methodology.md).
3. Inspect the source-of-truth ledgers: [`claims`](data/ledger/claims.jsonl), [`surfaces`](data/ledger/surfaces.jsonl), [`participation`](data/ledger/participation.jsonl), [`receipts`](data/ledger/receipts.jsonl), and [`chains`](data/ledger/chains.jsonl). Files under `build/` and the Pages artifact are disposable views, not authority.
4. Open the existing [Starmer → Clifford result, as of 2025](https://bigbirdreturns.github.io/clifford-number/explorer.html#desk/keir-starmer/matt-clifford/2025). The one-day 13 January 2025 surface shows both participation roles, the overlap window, the evidence class and the receipt links. It supports documented shared context on that bounded policy surface only.
5. Reproduce the release gate from a clean checkout (see [Running the gate](#running-the-gate)).

## Repository layout

| Area | Paths | What it is |
|---|---|---|
| Kernel | [`data/ledger/`](data/ledger/), [`data/canonical/`](data/canonical/), [`schemas/`](schemas/), [`tools/lib/`](tools/lib/) | The source of truth and the code that reads it. Ledgers hold claims, surfaces, participation rows, receipts and chains. Canonical files control identities and vocabularies. `tools/lib/` holds the compiler, the receipt and archival checks and the constitution gates. Everything else is derived from these. |
| Product | [`index.html`](index.html), [`explorer.html`](explorer.html), [`app.js`](app.js), [`src/`](src/), [`reports/core-thesis/poof-clifford-ecology/`](reports/core-thesis/poof-clifford-ecology/) | The public site: a homepage, the explorer (the Visual Aperture with its Timeline, Network, Route and Roster modes, the entity pages and the connection checker) and the browser code behind them. `app.js` owns the entity pages and the checker; `src/visual-aperture-*` owns the aperture; `src/atlas-webgl.js` and `src/social-field.js` own the Network field. [`docs/explorer.md`](docs/explorer.md) explains the page. The POOF ecology folder holds the generated review pages for the publication contract described in [`docs/poof-clifford-ecology.md`](docs/poof-clifford-ecology.md). |
| Cases and briefs | [`cases/`](cases/), [`briefs/`](briefs/), [`receipts/`](receipts/), [`reports/`](reports/) | Case ledgers (claims, events, relations and publication metadata per case), the structured briefs compiled from them, the archived source extracts, and generated report pages. |
| Agenda | [`data/estates/`](data/estates/), [`estates/`](estates/), [`gametrails/`](gametrails/) | What to look at next. An estate is a durable domain corpus. The estate and game-trail pages show where records are missing. They never create a claim or a hop. |
| Archive | [`archive/`](archive/README.md) | Read-only research recovered from closed issues, unmerged branches and the retrospective. Held from publication. |
| Retrospective | [`retrospective/2026-10-12/`](retrospective/2026-10-12/README.md) | The full agent-run record (pull requests, issues, branch analysis, trails). Held from publication. The large binaries are on branch `archive/retrospective-2026-10-12`. |
| Ops | [`.github/workflows/`](.github/workflows/), [`tools/`](tools/), [`test/`](test/), [`package.json`](package.json) | Five workflows, the validators and builders, the tests, and the npm scripts that tie them together. |

Other folders: [`docs/`](docs/README.md) (documentation index), [`contributions/`](contributions/) (candidate-surface inbox), [`legacy/`](legacy/) (the old generic edge graph, kept only as history), [`vendor/`](vendor/) (exact vendored browser libraries).

## Run the application locally

For a local research session, run `npm ci`, `npm run compile`, then `npm run serve`.
On Windows use `run-local.cmd` (optional port argument), or `npm.cmd` in PowerShell.
The launcher installs missing dependencies, compiles the existing data, and serves
on loopback only. It performs no crawl, merge, publication, or outreach.

Open `/explorer.html` for the ledger timeline, the Network field, the Route and Roster views and the connection checker. The retained
research inventory is `/retrospective/2026-10-12/site/trail-map.html`; its historical
tiers and recommendations are assessments, not instructions to repeat its work.
The operating assessment is [Operating cut](retrospective/2026-10-12/OPERATING-CUT.md).

`npm test` checks the application and retained evidence. The optional records-request
lifecycle runs separately with `node test/electric-twin-register-request.test.js`. That suite covers
preparing, dispatching, delivering and reviewing a request, not the app's ability
to render existing shareholder evidence. Its Windows symlink-creation failure is
recorded in the operating assessment; these checks have not been declared passed.
The publication build retains its separate gate below.

## Running the gate

One gate decides whether a change is releasable. Run it from a clean checkout:

```bash
npm ci
npm test
npm run release:check
```

`npm run release:check` first makes sure the git history is complete, then runs `npm run check`. `check` compiles the ledgers, runs the validators (including the constitution rules in BUILD-INSTRUCTIONS Section 1, the [receipt contract](#the-receipt-contract) and the [constitution gates](#the-constitution-gates)), runs the test suite, builds the Pages artifact into `dist/`, and validates that artifact against the publication allowlist. It needs a committed tree: the artifact step refuses to run while tracked files have uncommitted changes. Some steps rewrite generated manifests; if they change anything, commit the result and run the gate again. `dist/` is disposable and not tracked; delete it after a build if disk is tight.

The same gate runs in CI. [`ci.yml`](.github/workflows/ci.yml) runs it on every pull request and every push to `main`. [`deploy.yml`](.github/workflows/deploy.yml) runs it again on each push to `main` and publishes `dist/` to GitHub Pages only if it passes.

### The receipt contract

`tools/validate-receipt-contract.mjs` checks every row in `data/ledger/receipts.jsonl`. Each receipt must have:

- a public source URL;
- an archive reference that resolves: a stored extract under `receipts/` whose SHA-256 matches, or an Internet Archive snapshot of that URL; and
- a written statement of limits, on the row or in a `## Limits` section of the extract.

It runs offline and never fetches anything.

### The constitution gates

`tools/validate-constitution-gates.mjs` checks two Section 1 rules that were previously only prose. Rule 1.6: no aggregation by ethnicity, religion, ancestry, national origin or unit affiliation. Rule 1.9: no paid-placement fields, and no sponsor field without a disclosure. It fails on the ledgers, the canonical files, the case ledgers and every data file on the publication allowlist. Repository-only intake data under `data/intake/` produces warnings for the owner to decide, not failures.

## How crawls work now

Two crawls collect candidate records from public sources. Neither runs on a schedule. A person starts each one by hand from the Actions tab.

- [`crawl-official.yml`](.github/workflows/crawl-official.yml) harvests official records (adapters listed in [`docs/official-record-crawler.md`](docs/official-record-crawler.md)) into `data/crawl/` and `receipts/crawl/`.
- [`crawl-industrial-exhaust.yml`](.github/workflows/crawl-industrial-exhaust.yml) captures first-party company publications into `data/exhaust/` and `receipts/exhaust/`.

Each crawl pushes one run-scoped `automation-crawl-*` branch and opens one pull request. It cannot merge, approve, start another workflow, or push to `main`. Everything it writes is an observation or a candidate with no effect on the graph. A maintainer reviews the pull request. Promoting a candidate into the ledgers is a separate, reviewed change that passes the receipt contract and `release:check`. `data/crawl/` and `receipts/crawl/` are held from publication.

A third workflow, [`update-sweep.yml`](.github/workflows/update-sweep.yml), is also manual. It compiles the ledgers, runs the surface scout and prints its report.

## Core rule

A Clifford Number path may only move from Actor to Actor through a shared bounded Surface.

A broad institution is not a hop. No. 10, Cabinet Office, DSIT, ARIA, News UK, Faculty and Electric Twin can appear as venues or organizations, but they do not create Clifford Number hops by themselves. A named bounded surface inside them can.

## Temporal rule

A hop is not timeless. Two actors only shared a bounded surface during the window where their participations *and* the surface overlap. Every hop basis carries a validity window: the intersection of the surface window and both participation windows. If two dated participations on the same surface do not overlap, that surface creates **no** hop between them (recorded in `rejected_hop_pairs`).

Ledger dates may be year (`2016`), month (`2019-12`), or day (`2019-12-15`) precision. Each is widened to the full period it names. Field vocabulary follows the AXM `temporal@1` extension: `valid_from` / `valid_until`, ISO 8601, with `null` for an open end (ongoing or until superseded).

A participation with no dates cannot be placed in time. Such a hop basis still counts for all-time topology but never supports a time-sliced query.

Query the graph on demand, optionally as of a point in time:

```bash
npm run query:hops -- --from ben-warner
npm run query:hops -- --from dominic-cummings --as-of 2020
npm run query:hops -- --from simon-case --to ben-warner --as-of 2026-06 --json
```

`--to` defaults to the anchor actor. `--as-of` accepts a year, month, or day and means "at any point during that period". Time-sliced paths traverse only fully dated hop bases whose window intersects it.

## Public app

The public site is two static pages: `index.html`, a four-lane causal homepage projecting the research graph across model production, workflow admission, activation spend, and measurement feedback; and `explorer.html`, the explorer, linked from the homepage header. The explorer has three parts, all read from the same compiled artifacts:

- **The Visual Aperture**, with four modes: **Timeline** (the arrival view: one mark per participation row on lanes against a date axis; a surface two people share on one day is a column touching only their lanes; the Dialog roster is one contained block), **Network** (the research network as a field; node size is the documented surface count; selecting an arc opens its participation row or claim), **Route** (actor → bounded surface → actor steps with evidence floor and as-of controls) and **Roster** (one bounded surface as a budgeted roster container).
- **The entity pages:** search public actors, organizations, bounded surfaces, chains, surface types and years; every page is a row-by-row ledger fed from the same model as the Timeline, with fact chips that name their denominators, a status line that is never silent, the patterns in the rows, and the receipts behind each row (see [`docs/explorer.md`](docs/explorer.md#the-entity-pages)).
- **The connection checker:** enter two public actors and an optional year, month or day; get the shortest defensible route, its evidence floor, copy-ready caveat language, and the connections the compiler refused to make.

[`docs/explorer.md`](docs/explorer.md) explains each view and states the display rules once: every mark is one ledger row, a hop is a surface and never a line between two people, a dense roster is one object, undated rows are never time-sliced, evidence class and receipts stay attached, no composite score drives a visual channel, counts name their denominator. Structural context is shown separately from Clifford hops and is never presented as probability, guilt or motive.

Compiled case files carry the same discipline into programs, typed capital flows, public-role transitions, capability observations and outcomes. The first golden case, FA-03, is intentionally review-gated: the prototype's assertions are preserved without being mislabeled as independently verified. See [the case-ledger contract](docs/case-ledger.md).

Since 1.0 the old generic shortest-path edge graph is no longer the product. It is preserved under `legacy/`.

Start with the audience-based [documentation index](docs/README.md), then read the current [methodology](docs/methodology.md) and [definitions](docs/definitions.md).

## Report, estate and game-trail pages

- [`reports/index.html`](reports/index.html) shows cases moving from intake through structured report and independent review.
- [`estates/index.html`](estates/index.html) and [`gametrails/index.html`](gametrails/index.html) are the Estate Aperture and Game-Trail Aperture. They are projections over typed custody. Neither creates a claim, graph edge, score, allegation, causal conclusion or publication approval.
- [`data/intake/natsec100-pathways/README.md`](data/intake/natsec100-pathways/README.md) records the second-case intake state. It is repository-only intake, held from publication.

History:

- **Phase 0 foundation lock:** [`docs/milestones/phase0-foundation-lock.md`](docs/milestones/phase0-foundation-lock.md) records the closed identity, density, narration, evidence-upgrade and receipt-archival controls that later phases must preserve.
- **Milestone M-01:** [`docs/milestones/estate-aperture-v1.md`](docs/milestones/estate-aperture-v1.md) records completion of the declared estate pass without claiming that any estate is evidentially complete.
- **Milestone M-02:** [`docs/milestones/estate-frontier-game-trails-v1.md`](docs/milestones/estate-frontier-game-trails-v1.md) records the frontier survey and complete game-trail rerun without claiming acquisition or relationship findings.
- **Retired programmes:** the preference-custody lab, counter-selector, stable-ground, residual-denominator and M-04 wave chains had their validators and tools removed in 2.0.0. Their documents stay; see [Historical programmes](docs/README.md#historical-programmes-archived).

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

Canonical files control identities and vocabularies. Do not solve ambiguity in generated artifacts. The registries also carry selection, officeholder and consumption-contract files; for the current identity and registry counts, see [`docs/identity-reconciliation.md`](docs/identity-reconciliation.md).

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
npm run compile            # build the hop graph and scores from the ledgers
npm run validate:release   # BUILD-INSTRUCTIONS Section 1 invariants
npm run scout              # surface scout report
npm run serve              # serve the site locally on port 8080
npm run release:check      # the full gate
```

There are 52 npm scripts in total. Run `npm run` to list them. Many older notes name scripts that were folded into `check` or removed in 2.0.0; [the deletion record](docs/retrospectives/2026-10-12-consolidation-deletions.md) maps each removed script to the `node` command that replaces it.

## Regression fixtures

The release must pass these fixtures before the full database can be trusted:

1. Ben Warner produces government, employment/investment, campaign, founder/officer, customer/vendor and category-formation surfaces.
2. Electric Twin behaves as a surface factory, not as a generic organization node.
3. Simon Case is represented through governance continuity surfaces.
4. Surface types distinguish hop-eligible, non-hop scorable, context-only and scout-only surfaces.
5. Broad institutions never create Clifford Number hops.
6. Hop bases carry validity windows; disjoint dated participations on a shared surface create no hop, and broad-office role observations remain explicit context rather than pairwise adjacency.

## Reconciled AXM identity layer

The entity and claim derivations in `tools/lib/axm-id.mjs` are reconciled against AXM Genesis v1. The [reconciliation record](docs/identity-reconciliation.md) identifies the pinned reference commit, exact shared fixture bytes, historical query compatibility and reproducible checks. Reconciled identifiers use the full SHA-256 digest with versioned `e1_` and `c1_` prefixes.

`build/axm-identity.json` is a separate projection over canonical identities and participation records. Claim windows keep temporal bounds, roles, evidence classes and receipts independently of claim identity. The release validator recomputes this projection from its source records.

Entity identity includes the case namespace. Matching serialization does not resolve real-world name ambiguity, join different case namespaces, or create actor hops. Cross-case resolution and graph admission remain separate gates.

The query and narration commands accept reconciled identifiers and ordinary local actor IDs. Previously issued `e_` identifiers remain historical, case-local lookup tokens in `legacy_axm_ids`. They resolve only to a unique local entity and never become cross-case identity authority.
