# Clifford Number: Build Instructions, 2026 to 2037 and Beyond

Status: governing document. This file outranks convenience. An agent or maintainer
executing work in this repository reads this first and treats Section 1 as
non-negotiable. Everything else is scheduled, testable, and revisable by the
process in Section 8.

The horizon is deliberate. This instrument must outlive its author's attention,
any single model vendor, any single hosting platform, and the news cycle that
makes any one case feel urgent. Build accordingly.

---

## 1. The Constitution (never changes)

These invariants are enforced by `validate:release`. Any phase below that cannot
be built without violating one of these is not built.

1.1 **No asserted, verified, or hop edge without a receipt.** Every hop basis,
participation, published claim, and publication-ready plain-language sentence
traces to receipt IDs. This rule governs graph assertion; it must never suppress
a non-graph-effect discovery observation, candidate, rejection, or unavailable-
source record. Those intake objects remain preserved with the provenance and
limitations actually available, `graph_effect: none`, and an explicit evidence
state until review. A receipt names a source or preserved artifact that a
stranger can inspect; an unavailable source stays recorded as a limitation
rather than being silently deleted.

1.2 **A hop is a shared bounded surface, nothing more.** Broad institutions are
never hops. Co-presence is never coordination. The forbidden-inference note
ships on every artifact that leaves the repo.

1.3 **Temporal honesty.** Undated participations never support time-sliced
claims. Disjoint windows on a shared surface create no hop and are recorded in
`rejected_hop_pairs`. Precision is widened, never invented.

1.4 **Canonical controls identity.** Ambiguity is resolved in
`data/canonical/`, never in generated artifacts. Generated artifacts are
disposable and reproducible from ledgers alone.

1.5 **Narration adds no facts.** Reader-facing output renders from ledger rows
and human-written `plain` blocks whose sentences are themselves
receipt-supported. Unfinished profiles display as unfinished.

1.6 **No identity-adjacent aggregation.** No rollups, scores, or surfaces built
on ethnicity, religion, ancestry, national origin, or unit affiliation. Country
and institutional facts are recorded neutrally where sources state them, and
never treated as suspicious in themselves.

1.7 **Density discipline.** The information value of a shared surface falls
with its population. Surface types declare hop eligibility; large-N rosters and
rankings are scorable or context-only, never silent hop machines.

1.8 **Verification over trust.** The standard for every release is: a hostile
stranger runs one command and reproduces every number. If a claim cannot
survive that, it is marked, downgraded, or removed.

1.9 **The tool maps capture; it must not become capture.** No paid placement in
registries, no undisclosed sponsor influence on canonical decisions, no private
forks with divergent facts presented as this instrument.

1.10 **Selection-layer neutrality is constitutional.** The same discipline
that constrains an edge constrains which cases, corpora, actors, institutions,
and jurisdictions the project chooses to investigate. No lane activates
because a named actor is famous, disliked, politically convenient, or already
suspected. Before ingestion or lane-specific code ships, a checked-in selection
declaration states the public-interest question, neutral selection unit and
universe, inclusion and exclusion rules, source-complete or symmetric
comparison strategy, coverage baseline and gaps, privacy exposure, public
reproducibility, review date, and sunset condition. The rule must admit an
analogous actor or institution under the same facts regardless of party,
ideology, nationality, or affiliation. Private local material may generate
review leads, but it cannot count toward public coverage, serve as the sole
basis of a public assertion, or narrate public progress. `validate:selection`
fails on undeclared lanes, unmeasured corpus voids, asymmetric selection rules,
or private-support material represented as public evidence.

1.11 **The interpretation contract travels with the data.** Every exported
selection lane and coverage row carries a machine-checked, copy-ready statement
of what it is, what it is not, and which inferences its evidence and denominator
do not support. A coverage denominator describes the declared search universe
or source potential; it is not evidence that responsive, incriminating, or even
relevant material exists. Removing the caveat, review status, or contract
identifier is a lossy transformation and cannot be represented as a conforming
export. Every neutral-universe definition also has a checked-in adversarial
review record. A universe may remain pending or provisional, but it cannot be
called cleared until a second party, distinct from its author, records boundary
attacks, plausible alternative universes, comparator tests, and a disposition.
`validate:consumption` fails on detached caveats, denominator laundering,
missing review records, self-review represented as independent review, or a
pending lane represented as cleared.

---

## 2. Phase 0: Foundation Lock (now through end of 2026)

Goal: everything that later phases join against is made exact.

2.1 **AXM identity reconciliation.** Reconcile the provisional identity
serialization in `tools/lib/axm-id.mjs` byte-for-byte against `axm-genesis`
(`axm_verify.identity`). Until this gate closes, `build/axm-identity.json`
stays quarantined and no cross-case join ships. Acceptance: a shared fixture
file of (namespace, label) pairs produces identical IDs in both repositories,
committed to both.

2.2 **Surface-type audit for density.** Classify every existing surface against
1.7. The Dialog roster and any future 100-name list get `hop_eligible: false`
or an explicit population-weighted eligibility rule. Acceptance: a fixture
proving a 100-member roster does not reduce median pairwise Clifford Numbers
below the value computed without it.

2.3 **Narration layer hardening.** `narrate-hops` exists; extend `plain` blocks
until every anchor-adjacent actor (Clifford Number 1 to 2 from the anchor) has
an editorial `who`/`why_here`, each receipt-supported. Acceptance: narration of
the top 20 most-queried pairs contains zero `[machine-derived]` fallbacks.

2.4 **Evidence upgrade pass.** Every hop on a path between anchor actors that
carries `evidence: reported` gets one upgrade attempt to `primary_public`,
`official`, or `government_record`, or an explicit note that upgrade was
attempted and failed. The narrator made weak evidence visible; do not ship a
journalist-facing release before this pass.

2.5 **Receipt archival.** Every receipt URL gets an archived snapshot reference
(archive service ID or stored hash of retrieved content) recorded on the
receipt row. Link rot is the number one decade-scale threat to this repo.
Acceptance: `validate:release` fails on any receipt without an archival
reference after 2027-01-01.

---

## 3. Phase 1: Second Case and First Join (2026 to 2027)

Goal: prove the compiler is jurisdiction-agnostic.

3.1 **Case ingestion: US defense-tech (NatSec100 corridor).** Convert the
existing NatSec100 pathways database (receipts, companies, company_years,
actors, surfaces, overlaps, events) into the ledger quartet under
`cases/us-defense-natsec100/`. Ranking editions become dated surfaces typed per
2.2. Portfolio, advisory, hub-tenancy, and contract-vehicle surfaces become
hop-eligible where small-N and dated. Acceptance: `release:check` passes with
both cases loaded; the case reproduces the chunk-level delta counts from its
source database.

3.2 **Cross-case join.** With 2.1 closed, emit joined entity IDs. First target
set: capital actors present in both cases (the a16z/Founders Fund/In-Q-Tel
class) and any person appearing on surfaces in both jurisdictions. Acceptance:
a `query:hops --case all` mode that traverses joined graphs and labels which
case each hop's receipts live in.

3.3 **Dark-network delta.** Implement `delta` as a first-class command: diff of
two compiles (across time or across cases) reporting new surfaces, new hops,
closed windows, and evidence-class changes. Deltas are the publishable unit;
the FA series consumes them. Acceptance: a delta between two dated compiles of
the same case renders as a narrated changelog with receipts.

3.4 **Contribution pipeline.** Harden `contributions/inbox`: submissions arrive
as ledger-shaped rows plus receipts, pass a machine gate (schema, receipt
resolvability, forbidden-inference scan), then a human gate. No contribution
edits canonical directly. Acceptance: one external contribution lands through
the full pipeline.

---

## 4. Phase 2: Verifiable Distribution (2027 to 2029)

Goal: the graph becomes checkable by people who distrust the author.

4.1 **Signed releases.** Each release compiles to a content-addressed shard
signed per the AXM stack (BLAKE3 content addressing, ML-DSA-44 signatures).
The signature covers ledgers and canonical registries, not build artifacts.
Acceptance: a verifier script, runnable offline, that confirms a downloaded
release matches its signature and recompiles to identical numbers.

4.2 **MCP as the query interface.** Promote `src/mcp-server.js` from legacy to
supported: agents and newsrooms query hops, narration, and deltas over MCP
with receipts inline. Read-only. Write paths go only through the contribution
pipeline. Acceptance: a third-party agent answers "how are X and Y connected,
as of DATE" with narrated, receipted output and no repo checkout.

4.3 **Newsroom mode.** A narration profile that emits quotable paragraphs with
footnoted receipts and the mandatory disclaimer, sized for editorial use.
Flora-class review is the acceptance test: an editor with no prior context can
parse any hop between any two actors without asking who someone is.

4.4 **Fixture growth as constitution.** Every bug, every bad inference caught,
every ambiguity resolved becomes a permanent regression fixture. The fixture
suite is the living record of what this tool refuses to do. Target: fixture
count grows monotonically; no release deletes one without a written
justification in the fixture file itself.

---

## 5. Phase 3: Federation and Self-Assembly (2029 to 2032)

Goal: many cases, many contributors, one discipline.

5.1 **Case federation.** UK AI policy, US defense-tech, and subsequent cases
(EU procurement, health-infrastructure capture, or whatever the receipts
support) live as sibling case directories sharing canonical vocabularies but
owning their own ledgers. Joins run only through reconciled AXM identities.
No case may edit another case's ledger.

5.2 **Agent-assisted intake with human gates.** Per
`docs/self-assembling-architecture.md`: agents may propose surfaces,
participations, and receipts into `data/import-queues/`; promotion to ledger
requires human sign-off recorded in the promotion log. The scout suggests; it
never commits. Acceptance: the promotion log shows author, date, and receipt
check for every promoted row, with rejects preserved.

5.3 **Evidence decay and refresh.** Receipts get a review-by date scaled to
volatility (a statute rarely moves; a portfolio page moves quarterly). The
update sweep flags stale receipts; hops resting entirely on stale receipts are
marked in narration. Nothing silently expires; things visibly age.

5.4 **Redaction discipline.** Follow `docs/redaction-policy.md` and extend it:
private individuals who are not public actors on public surfaces do not enter
canonical. Public-role facts stay; private-life facts never enter. Every
redaction request and its resolution is logged (without reproducing the
redacted content).

---

## 6. Phase 4: Succession (2032 to 2037)

Goal: the instrument runs correctly with the founder absent.

6.1 **Frozen kernel.** By 2033, the hop derivation rules, temporal rules,
identity envelope, and Section 1 of this document are frozen as a versioned
kernel. Changes require a new major version with a written migration document,
and old releases must remain verifiable forever under their original kernel.

6.2 **Maintainer plurality.** At least three maintainers with commit rights and
documented canonical-decision authority, no two at the same institution.
Canonical disputes are resolved in the open, in the repo, with receipts.

6.3 **Format migration policy.** JSONL, JSON, and markdown are the formats
precisely because they will still open in 2037. Any storage migration must
ship a lossless round-trip proof. No proprietary databases as the source of
truth, ever. The ledgers are the database.

6.4 **Mirror and escrow.** The full repository, all archived receipts, and all
signed releases are mirrored to at least two independent archival homes.
Acceptance: a documented cold-start test where a new maintainer, from a mirror
alone, reproduces the current release check on clean hardware.

6.5 **The daughters test.** Named plainly because it is the actual design
requirement: a motivated eighteen-year-old in 2037 who has never met the
author must be able to clone this, run one command, understand what it claims,
verify any single claim to its receipt, and extend it without breaking it.
Every phase above is in service of this test.

---

## 7. Standing Maintenance Calendar (all phases)

- Quarterly: link-rot audit; archival references for any new receipts;
  update sweep over watchlisted surfaces.
- Semi-annual: dense-surface audit (any surface whose population crossed a
  threshold gets its hop eligibility re-reviewed); alias registry hygiene.
- Annual: full evidence-class census published as a delta; fixture suite
  review; this document reviewed under Section 8.
- Continuous: every new roster-class surface (rankings, leaked directories,
  membership lists) enters as non-hop until explicitly reviewed.

---

## 8. Amending This Document

Section 1 does not amend. Sections 2 through 7 amend by commit with a written
rationale in the commit body and, where an acceptance criterion changes, a
fixture demonstrating why the old criterion was wrong rather than merely
inconvenient. Silence is not consent; unreviewed drift is reverted.

---

## 9. Anti-Goals (what this must never become)

- Not a people-search or doxxing engine. Public actors on public surfaces only.
- Not a motive machine. It maps topology; readers and reporters draw
  conclusions against receipts, in their own names.
- Not an identity-clustering instrument, per 1.6, under any framing.
- Not a subscription oracle whose facts are checkable only by customers.
- Not dependent on any single AI vendor: agents accelerate intake and
  narration, but every pipeline must be executable by a human with a text
  editor and the documented commands.

The instrument's authority comes from one property and one property only:
anyone can check it. Protect that property and the rest survives to 2037.
Lose it and nothing else here matters.
