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

2.1 **AXM identity and bounded cross-case resolution — completed 2026-07-29.**
The repository pins `BigBirdReturns/axm-genesis` commit
`411ef40e6cfc3ecb97ac3e256c8151be678347c8`, preserves the exact Genesis v1
identity fixture at `data/project/axm-genesis-v1-identity-vectors.json`, and
records identical Python/Node runtime output in
`data/project/axm-genesis-v1-runtime-attestation.json`. The active
`build/axm-identity.json` projection uses full-digest, versioned `e1_`/`c1_`
IDs, and every retired `e_`/`c_` token remains a resolvable predecessor in
`data/project/lake-axm-active-identity-registry-wave-06.jsonl`.

The synthetic multi-case fixture in
`data/project/lake-axm-cross-case-acceptance-wave-07-fixture.json` authorizes
one narrower lane: **explicit, source-custodied, graph-inert cross-case identity resolution**.
A conforming bridge requires source custody on both local records, a separately
custodied same-entity assertion, the same identity namespace, and an unambiguous
overlap between canonical or declared-alias AXM tokens. Accepted and rejected
decisions travel together in
`data/project/lake-axm-cross-case-join-registry-wave-07.jsonl`.

Automatic same-label joins remain prohibited. Different namespaces do not join.
Ambiguous aliases and missing custody are rejected. An accepted bridge does not
merge source entities, create a relationship, enter the hop graph, or authorize
a cross-case graph edge. The broad active-projection
`cross_case_join_authorized` flag therefore remains `false`; the authorized
scope is exactly
`explicit_source_custodied_graph_inert_identity_resolution_only`.

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
- Not dependent m�߿m�G����ƭy�]\�X�\�HH�[YH[�HQˉ�JNB���]\����Έ\��ܜ˛[��OOH\��ܜ�NB��^ܝ�[��[ۈ�ܛX]�ۜ�[\[ۑ\��ܜ�\��ܜ�H�]\��\��ܜ˛X\
\��܈O�H��\��܋���_WH	�\��܋��[_N�	�\��܋�Y\��Y�_X
K���[�	���NB���ۜ�[����YH���\�˘\�ݖ�WH�]��\���J���\�˘\�ݖ�WJH�	��Y�
[����YOOH�[UT��]
[\ܝ�Y]K�\�
JH�ۜ����H���\�˘\�ݖ̗H�]��\���J���\�˘\�ݖ̗JH����\�˘��

N�ۜ��\�[H�[Y]P�ۜ�[\[ې�۝�X�
����JNY�
\�\�[���H�ۜ��K�\��܊�ۜ�[\[ۈ�۝�X��Z[Y�]	ܙ\�[�\��ܜ˛[��H\��܊�N��ٛܛX]�ۜ�[\[ۑ\��ܜ��\�[�\��ܜ�_X
N���\�˙^]��HHNH[�H�ۜ��K���	��ۜ�[\[ۈ�۝�X�����NB�B

3.11 **Canonical acquisition adjudication — Wave 11.**
Every canonical-acquisition candidate must receive a named decision against existing
IDs, labels, aliases, candidate collisions, custody, semantic type, and source
context. The evidence-sufficient, publicly inspectable, unambiguous subset may be
materialized immediately as reversible canonical records or aliases. Acronym-only,
contextual, conflicting, private-only, and nonidentity rows remain explicit holds
or typed reroutes; they do not wait for unspecified human permission.

Canonical expansion does not create participation, a relationship, a graph edge,
a hop, or a cross-case identity bridge. New active AXM identities are recorded in
`data/project/lake-canonical-identity-extension-registry-wave-11.jsonl` while the
Wave 06 migration registry remains an immutable 176-entity / 164-claim baseline.

3.12 **Bounded-hold resolution — Wave 12.**
A bounded hold is an acquisition target, not a permission gate. The complete hold
denominator must be attacked with repository-preserved or publicly inspectable
source custody. An explicit local-to-canonical assertion may be executed when the
local record, canonical reference, shared identity namespace, and unique target are
all present. Every accepted resolution remains reversible and source records are
not merged.

Local-to-canonical resolution is graph-inert. It does not create participation, a
relationship, a graph edge, a hop, or a cross-case identity bridge. Selection or
invitation to a program does not prove performance, acceptance, deployment, or a
particular award. New identities and aliases travel in a separate append-preserving
AXM extension registry.

3.14 **Exact canonical subject projection — Wave 14.**
An accepted case-scoped resolution has first priority. Without one, a claim subject
may receive generated canonical identity metadata only when its source subject_id is
byte-for-byte equal to an existing canonical actor or organization ID. Normalized
names, aliases, fuzzy similarity, object identity, and context are not substitute
identity evidence.

The source subject_id, claim text, receipts, status, and causal qualification remain
unchanged. Every nonexact remainder is retained in a typed unresolved-subject
registry with a named next action and append-preserving correction route. Exact
projection and unresolved routing create no relationship, participation, graph edge,
hop, automatic cross-case join, truth determination, or publication clearance.

3.15 **Unresolved subject adjudication — Wave 15.**
Every subject left by the exact-ID lane must receive exactly one evidence-grounded
adjudication: an existing provenance-backed identity, a named controlled identity,
a source-custodied canonical-creation plan, or a typed nonidentity object. Missing a
reviewer is not a decision blocker.

Wave 15 does not mutate canonical records or case claims. Identity decisions remain
integration-ready and graph-inert; planned records remain unapplied; contracts,
programs, records, places, infrastructure, products, sites, roles, and analytic
constructs remain typed nonidentity objects. No adjudication creates a relationship,
participation row, graph edge, hop, cross-case bridge, truth determination, or
publication clearance.

3.16 **Integrated subject layer — Wave 16.**
Accepted Wave 15 identity decisions enter the live generated case layer only through
case-scoped local-to-canonical resolutions. Accepted nonidentity decisions enter a
parallel typed subject-object registry. One case-local subject cannot simultaneously
be a canonical identity and a nonidentity object.

Canonical identity and subject-object metadata are additive projections. Original
subject IDs and claim text remain unchanged. Contracts, records, programs, places,
infrastructure, products, sites, roles, and analytic constructs are not forced into
actor or organization joins. Integration creates no relationship, participation row,
graph edge, hop, cross-case bridge, truth determination, or publication clearance.
Sealed Wave 14 and Wave 15 products remain historical and are not regenerated.

3.17 **Residual lake frontier — Wave 17.**
Every baseline evidence path lacking a detected owner receives a bounded semantic or
repository-custody owner in the Wave 17 residual-path registry. The registry is an
index route and custody decision; it does not prove claim truth or semantic completeness.

Every baseline projection-only compound identifier receives a repository-provenance
record. A cross-key source occurrence means the same value exists under another
repository key; it does not authorize unrestricted cross-key joins. A deterministic
projection recipe is source custody for the generated identifier, not external evidence.
Typed refusals remain valid executable outcomes, and missing a reviewer is never a
standalone blocker for reversible indexing or custody work.

3.18 **Identifier topology — Wave 18.**
Every identifier in the frozen unindexed, source-only, or divergent topology union receives
an append-preserving decision. Indexing creates addressability, not identity, truth,
publication status, or graph semantics. Source-only identifiers remain source-only unless a
named consumer contract justifies a typed projection. Cross-family projection views may be
valid; same-family variants retain explicit generator-contract actions rather than being
forced into byte equality.

The topology registry is an index and custody surface. It does not authorize automatic
cross-key joins, create relationships or participation, or establish semantic completeness.
Missing a reviewer never blocks reversible classification, indexing, or projection refusal.

3.19 **Generator contracts — Wave 19.**
Every open Wave 18 generator-contract action is assigned to a named exact-path or
projection-family sidecar contract. Exact-path contracts bind projection path, pointer
template, and object hash. Projection-family contracts bind structural path and pointer
variants; a payload-hash change inside the declared family boundary is not itself drift.
A new exact-path hash or family structural variant requires append-preserving supersession.

Cross-family typed views remain distinct and are never forced into byte equality.
A generator contract governs serialization custody; it does not prove identity,
evidence truth, publication status, a relationship, participation, or graph semantics.
Missing a reviewer is not a standalone blocker for bounded contract execution.

3.20 **Receipt and source custody — Wave 20.**
Every raw unused receipt-definition row receives a source-preserving custody decision.
Compound scalar receipt tokens are classified as encoding defects only after every
constituent receipt is independently defined. Hash-pinned, locator-only, coverage,
explicitly unavailable, and repository-only custody remain distinct.

The raw unused-definition denominator remains visible. Adjudication does not attach a
receipt to a claim, invent source bytes, prove evidence truth, clear publication, create
a relationship or participation row, or alter the active graph.


3.21 **Allocator-war lake integration — Wave 21.**
Reviewed Wave 01 allocator-war packets and unreviewed Wave 02 intake packets enter separate source registries. Exact commit-and-path custody preserves their authority difference. Reviewed packets may feed bounded findings and controls; unreviewed packets may feed acquisition only.

Estate and program routing is one-way. It does not create a finding, identity, relationship, participation, graph edge, prevalence estimate, racial-order conclusion, coordination conclusion, common purpose, publication clearance, or adoption effect.


3.22 **Allocator-war estate acquisition execution — Wave 22.**
The eleven Wave 21 estate routes compile into deterministic acquisition queues. Reviewed-only, split-authority, and unreviewed-only lanes remain distinct. Priority orders execution and does not score truth, merit, guilt, risk, or importance.

Queue admission does not create estate adoption, evidence review, a finding, identity, relationship, participation, graph edge, prevalence, coordination, common purpose, or publication clearance.


3.23 **Allocator-war lead acquisition launch — Wave 23.**
One lead task per Wave 22 estate queue is selected by declared priority and source sequence, then equipped with an official-first retrieval contract and estate-specific source families. Lead selection is work ordering, not acquisition, review, truth, merit, prevalence, relationship, or estate adoption.

Every packet retains authority state, controls, refusals, negative search, exact receipt fields, a separate future result-ledger path, zero evidence rows, zero graph effect, and blocked publication.


3.24 **Allocator-war lead acquisition execution — Wave 24.**
Wave 24 writes one packet-specific acquisition ledger for every Wave 23 lead packet. Each ledger preserves exact source custody, retrieval state, negative search, excluded and unavailable rows, refusals, correction routes, and gate-unspecified states.

Acquisition rows remain below evidence review. Partial recovery is not a complete denominator, gate-unspecified public records are not institutional gates, shared sources create no relationship, and the wave creates no finding, graph effect, or publication authority.


3.25 **Allocator-war denominator closure fan-out — Wave 25.**
Wave 25 converts each explicit Wave 24 unavailable obligation into one deterministic estate-owned closure task. Gate-unspecified packets receive one G0 gate-identification task, and all downstream tasks remain blocked until that task terminates.

Closure queues are work-ordering surfaces, not evidence. Priority is not truth or merit; unavailable rows are not nulls; repeated tasks do not establish prevalence or relationship; graph effect and publication authority remain zero.


3.26 **Allocator-war targeted closure execution — Wave 26.**
Wave 26 executes only Wave 25 tasks already marked ready, records bounded source outcomes, preserves all blocked tasks, and moves newly eligible downstream work into a later-wave state rather than executing it immediately.

Execution results remain acquisition records. Partial does not mean complete; unavailable-after-search is not null; a completed gate-identification task does not close its downstream denominator; a no-gate result does not foreclose future source-addressed gates. Evidence, findings, graph effects, and publication authority remain zero.


3.26.1 **Allocator-war Wave 26 source-custody repair.**
The public-interest institutional-gate result must cite the exact executive, Foreign Service, judicial, and procurement-control records that establish the gate. Status, hierarchy, demographic, electorate, and representation research may not substitute for institutional decision instruments.

The repair changes source custody and generated hashes only. It does not change a result state, execute downstream work, close a denominator, adjudicate evidence, create a finding, alter the graph, or clear publication.


3.27 **Allocator-war public-interest downstream execution — Wave 27.**
Execute only the two public-interest rows marked `unblocked_for_next_wave` by the repaired Wave 26 gate. The deservingness-category row may recover formal programme, employment, contractor, grant, funding-recipient, and enforcement scope without treating that scope as a complete affected roster. The consequence row may recover formal authority and bounded correction controls without treating them as observed use or system-wide remedy adequacy.

The two legislative and political-finance rows marked `blocked_no_qualifying_gate` receive no plan, source references, or synthetic result. Wave 27 creates no evidence row, finding, graph effect, or publication clearance.


3.28 **Allocator-war public-interest implementation denominator — Wave 28.**
The two partial Wave 27 public-interest results are decomposed into twelve exact acquisition obligations owned by five estates. Each obligation preserves the repaired nine-source institutional custody, defines a receipt-complete closure target, and requires controls, nulls, refusals, failed paths, no-action rows, comparators, and no-observed-effect rows where applicable.

Queue admission is acquisition routing only. It does not close a source partial, establish estate adoption, adjudicate evidence, create a complete denominator or finding, modify the graph, or clear publication.


3.29 **Allocator-war public-interest implementation execution — Wave 29.**
All twelve Wave 28 implementation obligations are executed against thirty-four exact official source receipts. Eleven results remain partial and one person-level personnel-decision ledger remains unavailable after bounded search. Missing rows, failed searches, no-action states, comparators, controls, refusals, and correction routes remain explicit.

Execution is acquisition only. It does not adjudicate evidence, close a denominator, establish estate adoption, create a finding, modify the graph, treat unavailability as null, or clear publication.


3.30 **Allocator-war missing-row observability and closure fan-out — Wave 30.**
Every explicit unavailable row retained by Wave 29 becomes one route-owned closure task. The thirty-eight-task frontier is emitted in one deterministic build across seven reusable acquisition lanes. Four personnel tasks retain a lawful-access boundary; thirty-four tasks are publicly executable through agency records, public systems, action registers, dockets, comparator joins, or recovery records.

Route assignment is acquisition routing only. It does not close a source gap, adjudicate evidence, establish estate adoption, promote a finding, modify the graph, or clear publication.


3.31 **Allocator-war public-route execution — Wave 31.**
Run `node tools/build-lake-allocator-war-public-route-execution-wave-31.mjs` only after the Wave 30 route ledgers and the Wave 31 source plan are present. The builder must preserve the exact thirty-eight-task denominator, execute only the thirty-four public tasks, retain the four protected tasks as access-bounded, and create no evidence, estate adoption, finding, graph, or publication effect.

3.32 **Allocator-war bounded source snapshots — Wave 32.**
Run `node tools/acquire-lake-allocator-war-bounded-source-snapshots-wave-32.mjs` only in the bounded acquisition lane. The acquisition must emit nineteen exact source objects: fifteen public HTTP requests and four credential boundaries. The seven required JSON controls must parse successfully. Release validation reads the frozen bytes and must never refetch the network.

Run `node tools/build-lake-allocator-war-bounded-source-snapshots-wave-32.mjs` after the snapshot ledger is complete. The builder preserves the exact thirty-eight-task Wave 31 denominator and creates no complete denominator, evidence adjudication, estate adoption, finding, graph effect, or publication clearance.


3.33 **Allocator-war frozen source structural parses — Wave 33.**
Run `node tools/build-lake-allocator-war-structural-parses-wave-33.mjs` only after the permanent Wave 32 snapshot ledger and response bytes are present. The builder must verify all response hashes, emit exactly nineteen parse rows, perform no network requests, preserve HTTP errors and credential boundaries, and reuse the unchanged seven-route, thirty-eight-task, 153-use denominator.

A structural parse is addressability only. JSON array lengths, field names, HTML tags, links, text counts, HTTP error bodies, and credential boundaries do not establish institutional completeness, authorize joins, adjudicate evidence, create findings, alter the graph, or clear publication.


3.34 **Allocator-war source schemas and lawful joins — Wave 34.**
Run `node tools/build-lake-allocator-war-schema-joins-wave-34.mjs` only after the permanent Wave 33 parse ledger is present. The builder must adapt all nineteen parse objects exactly once, preserve source-specific structural limits and sensitive exclusions, and emit seven blocked lawful-join contracts covering all route classes.

A schema adapter or candidate key is not institutional semantics or join authority. Every join remains blocked until its exact action, no-action, affected-party, comparator, correction, recovery, or lawful-access requirements are satisfied. Protected personnel rows may not be replaced with public aggregate workforce data.


3.35 **Allocator-war lawful join requirement fan-out — Wave 35.**
Run `node tools/build-lake-allocator-war-join-requirements-wave-35.mjs` only after the permanent Wave 34 lawful-join ledger is present. The builder must emit one estate-owned queue per join and one deterministic acquisition task per unsatisfied institutional requirement, preserving source receipts, schema adapters, candidate-key classes, access classes, completion tests, and refused substitutions.

A requirement task is acquisition custody, not an acquisition result or join authorization. Public and lawful-case tasks remain separate from the three protected-personnel tasks that require authorized lawful access. Task admission creates no complete denominator, evidence adjudication, finding, graph effect, or publication clearance.
