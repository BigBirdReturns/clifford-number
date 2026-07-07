# Succession: the driver's handover

Written 2026-07-07 by the session driver (a Claude Fable 5 instance), for
whoever drives next: a different model, a stronger model, a weaker model
driving more carefully, or a human with a text editor. Nothing here depends
on which. This document carries the reasoning that is not in the commit
history; BUILD-INSTRUCTIONS.md carries the law. When they conflict, the law
wins, then fix this document.

## 1. What you are driving

A surface-hop topology compiler and its evidence discipline. It maps how
bounded legitimate surfaces (advisory boards, funding rounds, campaign
operations, rankings) carry actors, capital, and policy outcomes — with a
receipt for every edge and a refusal to infer motive from adjacency. The
authority of the instrument comes from exactly one property: **anyone can
check it.** Every decision below was made to protect that property. When you
face a choice this document does not cover, choose the option a hostile
stranger can verify.

Read order for a new driver: BUILD-INSTRUCTIONS.md (Section 1 is
non-negotiable) -> CLAUDE.md (how to operate) -> this file -> docs/cold-start.md
(how to resurrect) -> docs/plain-language.md and docs/methodology.md (voice
and evidence discipline) -> axm-genesis/watershed/README.md (the ecosystem's
shape and its one rule).

## 2. How to drive

The protocol in CLAUDE.md is compressed experience, not theory:

- **You adjudicate; hands execute.** The driver's context window and tokens
  are the project's scarcest resource. Every file edit, shell run, web fetch,
  and commit goes to a smaller model with a written spec. What you never
  delegate: deciding what is true, deciding what ships, and writing documents
  like this one.
- **Spec like the hand is competent but literal.** State the design, the
  acceptance criteria, what NOT to touch, and require a deviations report.
  The deviations reports are where hands surprise you — read them; several of
  this project's real findings (the OpenAI join, the Salama shareholding, the
  post-2016 Companies House disclosure change) arrived as deviations.
- **Verify the load-bearing claim yourself — through a hand if needed, but to
  your own satisfaction — before it touches canonical data.** Agents propose;
  the driver gates. This is constitution 5.2 applied to yourself.
- **Push after every leg.** This session's working trees were destroyed
  mid-flight twice; zero work was lost because nothing unpushed was ever more
  than one leg old. Treat local state as already gone.
- **Parallelize network-bound work gently.** archive.org rate-limits per IP;
  two parallel agents burned the whole quota where one slow sequential pass
  succeeded. Fan out reads, serialize writes to rate-limited services.

## 3. State of the build (2026-07-07)

Phase 0: **closed** except 2.3 (editorial plain blocks — human-written by
constitutional design; the acceptance is zero machine-derived fallbacks on
the top-20 queried pairs). Phase 1: 3.1, 3.2, 3.3 **closed**; 3.4
(contribution pipeline) waits for a real external contribution to exercise it.

What exists and works: two cases (uk-ai-policy with 38 hop edges;
us-defense-natsec100 with 342 receipted ranking inclusions and honestly zero
hop edges until portfolio surfaces arrive); kind-based AXM identity
reconciled byte-for-byte against axm-genesis and pinned by shared vectors;
two organic cross-case joins (Andreessen Horowitz, OpenAI) found
mechanically, not encoded; query:hops --case all; the delta command (git
refs are the compile history, because build artifacts are committed); the
receipt-archival gate (warns now, blocks releases from 2027-01-01); the
density gate (no surface with >= 20 actors ever creates hops — the Dialog
roster's 6,555 fake edges died for this); watershed in axm-genesis (the
ecosystem's dependency-flow constitution with its receipt check).

Honest defects, on the record: four receipts point to session-paste files
that are permanently lost (they will start failing releases 2027-01-01 —
resolve or downgrade the dependent claims); the 2025 NatSec100 roster is 58
companies short; the seed batch (Capital Factory / Silent Ventures) is
blocked in intake on 18 undelivered receipts; DCMS committee and Electoral
Commission sources sit behind Cloudflare and have never been retrieved.

## 4. Adjudications and why (do not silently reverse these)

1. **Identity namespaces are kind-based ("actor" | "organization" |
   "surface"), not case-scoped.** Case-scoped namespaces made cross-case
   joins impossible by construction, defeating gate 2.1's purpose. Cost:
   same-kind label collisions across genuinely different entities are
   possible; the remedy is data/canonical/join-exclusions.json — joins are
   mechanical, denials are canonical, and a denial is always visible with a
   written reason, never a silent drop.
2. **Density threshold is 20 and lives in one place**
   (data/canonical/surface-types.json density_rule), consumed by both the
   graph builder and the narrator. It was chosen to match the narrator's
   pre-existing broad-surface flag, not derived from first principles; if you
   change it, the density fixture (test/density.test.js) is the contract that
   must still hold: a 100-member roster must not move median pairwise
   Clifford Numbers.
3. **Rankings are never hops.** Inclusion on a list is a conversion/
   validation event about the lister and the listed, not a working
   relationship between the listed. This is why us-defense-natsec100
   compiles to zero hop edges and why that is correct, not a bug to fix.
4. **The seed batch was blocked, not stubbed.** Creating placeholder
   receipts to unblock promotion would have been invented evidence
   (constitution 1.1). Blocked-and-visible beats complete-and-false,
   always.
5. **"Frozen" means the normative surface** (spec, vocabulary, signature
   roots) — conformance fixtures, CI, and tooling remain amendable as the
   frozen thing's immune system. This resolution (recorded in watershed and
   COMPATIBILITY.md) is what makes cross-repo conformance fixtures legal.
6. **Precision is widened, never invented** — applied even against
   convenience (the 2025 NatSec100 edition kept month precision though a
   filename suggested a day). When a source is ambiguous, the ledger is
   vaguer than the temptation.
7. **The archival ladder**: Wayback snapshot for stable URLs; vendored
   file + content hash (in_repo_content_hash) for dynamic/tokenized URLs
   (the validator re-hashes on every run — tamper-evidence for free);
   unrecoverable_local_paste as a visible, deadline-bearing confession.
   GOV.UK declarations and FOI responses are the durable named-source path
   for post-2016 UK investors, because confirmation statements stopped
   naming shareholders.

## 5. The queue

Needs the human (only they can do these): the 2.3 plain sentences; the 18
seed receipts; chunk 2 overlap data (it turns the two joins into actual
cross-case paths through people); PRs and merges; a second archival home
beyond GitHub (6.4); two more maintainers (6.2 — the longest lead time in
the whole plan); signing-key custody and succession (the one gap
BUILD-INSTRUCTIONS itself has — verification survives on public keys, but
signing release N+1 after the author needs escrow or a documented
key-succession rule; propose it via Section 8).

Next driver work, in dependency order: newsroom mode (4.3) once 2.3 gives
the narrator editorial voice; signed releases (4.1) on the AXM stack; scoring
and scout for the natsec case (currently default-case-only, marked in
compile output); cross-case deltas of the join layer itself; the 2025 roster
recovery and the five USAspending confidence upgrades (specs already in the
intake README); DCMS/Electoral Commission retrieval when a browser-grade
fetcher is available.

## 6. Thirty-year adaptability

- **The ledgers are the database.** JSONL, JSON, markdown. If Node is gone,
  the tools are rewritable in an afternoon in whatever exists, because every
  derivation rule is stated in prose in BUILD-INSTRUCTIONS and the identity
  derivation is pinned by language-neutral vectors
  (test/vectors/identity.json — the spec IS the fixture). The committed
  build/ artifacts mean even a toolless mirror can serve the current
  compile.
- **Models are interchangeable.** The protocol names roles (driver, hands by
  size), never vendors or model names. Whoever is most capable in the
  session drives; everything else is sized to risk. If agents disappear
  entirely, a human with a text editor executes the same specs — that
  property is a stated anti-goal guard, test it occasionally by doing one
  small leg by hand.
- **Amendment is the adaptability mechanism.** Section 1 of
  BUILD-INSTRUCTIONS does not amend; everything else amends by commit with
  written rationale, and an acceptance-criterion change requires a fixture
  proving the old criterion wrong rather than inconvenient. The fixture
  suite only grows; deletions need written justification in the fixture
  file. This document amends freely — it is a map, not law; keep it true.
- **When in doubt, re-run the daughters test** (BUILD-INSTRUCTIONS 6.5): a
  motivated eighteen-year-old who never met any of us clones a mirror, runs
  one command, understands what it claims, verifies one claim to its
  receipt, and extends it without breaking it. Every choice that survives
  that test is safe. Every choice that requires trusting you is not.

The instrument's authority comes from one property and one property only:
anyone can check it. It was true at the top of this file and it is the last
thing worth saying. Protect it and the rest survives you, too.
