# Phase 0 — Foundation Lock

**Status:** completed at the current release boundary
**As of:** 2026-09-08
**Governing section:** `BUILD-INSTRUCTIONS.md` §2

Phase 0 makes the objects that later cases and joins depend on exact. It closes
five release controls: identity serialization, surface-density discipline,
receipt-supported narration, weak-hop evidence upgrade custody, and durable
receipt archival. This record closes those controls for the current compiler;
it does not admit a second case, a cross-case identity join, or a research
finding.

## 2.1 AXM identity reconciliation

The entity and claim derivations reproduce the pinned AXM Genesis v1 reference.
The shared fixture contains fourteen entity cases and two claim cases and is
committed byte-identically to both repositories. Reconciled identifiers use the
full SHA-256 digest under versioned `e1_` and `c1_` prefixes. All 307 historical
`e_` lookup tokens remain available only as unique case-local aliases.

Matching serialization does not resolve real-world ambiguity, join case
namespaces, or create actor hops. Cross-case resolution remains a separate Phase
1 admission gate.

## 2.2 Surface-density audit

The canonical density ceiling is nineteen distinct actor participants. Directory
and roster surfaces default to non-hop, and the 112-actor Dialog directory
remains visible as contextual evidence without generating pairwise adjacency.

The acceptance fixture now adds a complete 100-member roster to a connected
control graph and proves two properties: the actor-edge set remains identical,
and the median finite pairwise distance over the pre-existing actor population
remains unchanged. Roster-only actors remain outside the hop graph.

## 2.3 Narration hardening

The live anchor-distance denominator contains sixteen actors: one declared
anchor, ten actors at Clifford Number 1, and five actors at Clifford Number 2.
Every one has a receipt-supported editorial `who` and `why_here`, and every route
to the anchor renders without the mechanical fallback.

The governing acceptance criterion previously referred to the twenty
most-queried pairs, but the repository has no durable query-usage ledger from
which that population can be reproduced. Phase 0 replaces that unobservable
ranking with the stronger exhaustive local denominator: every actor at distance
one or two from every declared anchor. Future usage telemetry may add a
supplemental check but cannot narrow this coverage.

## 2.4 Evidence upgrade custody

The closure snapshot contains ninety-five accepted hop bases: seventy-five
`official`, twenty `primary_public`, and zero `reported`. The release-wide gate
requires any future accepted `reported` basis to carry one current,
basis-specific stronger-source search disposition. A later upgrade removes the
stale failed-upgrade record.

Five reported participation rows remain preserved across three non-hop Dialog
surfaces. Their exclusion from the accepted-hop denominator is a topology
boundary, not an evidence upgrade and not a finding that the reporting is false.

## 2.5 Receipt archival

All seventy-three current receipt rows carry archival custody. Sixty-eight bind
to matching in-repository content hashes and five bind to Internet Archive
snapshots. Current releases run the archival check in strict mode; missing,
unsupported, malformed, detached, root-escaping, directory, symbolic-link, or
hash-mismatched targets fail before the 2027 deadline.

## Acceptance and reopening law

Run the focused controls with:

```bash
node test/axm-id.test.js
node test/axm-identity.test.js
node test/density.test.js
node test/narrate-hops.test.js
node test/reported-hop-evidence-upgrades.test.js
node test/receipt-archival.test.js
npm run release:check
```

A later corpus addition can change the counts without reopening Phase 0 when the
same controls continue to pass. A change that weakens identity parity, admits a
dense roster as a hop machine, restores mechanical anchor-adjacent narration,
permits an unreviewed reported hop, or admits an unarchived receipt reopens the
specific failed control.

```text
phase_0_foundation_lock: complete
cross_case_identity_join: not_admitted
second_case_compiled: false
graph_effect: none
research_claim_effect: none
project_completion_claimed: false
next: Phase 1 NatSec100 canonical promotion and first cross-case join
```
