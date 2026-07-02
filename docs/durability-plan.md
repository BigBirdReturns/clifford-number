# 30-Year Durability Plan

This document reasons through the endstates this project can land in between now
and roughly 2056, ranks what must survive each of them, and defines the concrete
work — some immediate, some standing policy — that keeps the project's evidentiary
value intact across all of them.

The governing question for every decision below: **a stranger in 2056 holds a cold
copy of this repository and nothing else — no GitHub, no maintainer, no working
Node.js 20, no live web sources. Can they reconstruct what was claimed, who
participated in what surface, and verify it against evidence?** Call this the
**cold-copy test**. Everything in this plan either helps pass it or handles an
endstate in which it is the only thing left.

> **Scope note.** This document analyzes the durability of the *curated artifact*
> and assumes a hand-authored, bus-factor-1 project. The intended operating model
> is a **self-assembling map where humans prune rather than author** — see
> `docs/self-assembling-architecture.md`. That inversion changes the labor and
> bus-factor analysis (§2, E1) but *strengthens* every evidence, removal, and
> succession requirement here; the two documents are meant to be read together.
> The self-assembling architecture adds one durable artifact to the list below:
> the human **prune-decision log**, which automation can never regenerate.

## 1. What actually has to survive

Not everything in the repository has equal replacement cost. Ranked:

1. **The ledgers** (`data/ledger/*.jsonl`) — claims, surfaces, participation,
   receipts, chains. Irreplaceable. This is years of sourced research; if it is
   lost or becomes uninterpretable, the project is gone regardless of what else
   survives.
2. **The receipts' underlying evidence** — not the receipt *rows*, the material
   they point at. A receipt row that points at a dead URL or a vanished file is
   a claim without support. This is already the weakest layer (see §3).
3. **The canonical registries** (`data/canonical/*.json`) — identity and
   vocabulary. Without them, the ledgers are strings, not a topology.
4. **The interpretive documents** (`docs/methodology.md`, `docs/definitions.md`,
   `docs/redaction-policy.md`, `docs/clifford-number-master.md`, the core rule in
   `README.md`) — what a Surface is, what a hop is, what a listing does and does
   not prove. Without these, a future reader can parse the data but not
   understand it, and worse, can misrepresent what it asserts.
5. **The compiler** (`tools/`, `src/`) — valuable but reconstructible. It is
   ~zero-dependency Node stdlib code operating on plain text; any competent
   future engineer can rewrite it from the format spec and the committed build
   outputs as a reference.
6. **The web app and hosting** (`index.html`, `app.js`, GitHub Pages) — the most
   disposable layer. It is a *view*. The committed `build/` artifacts mean the
   static site works without any toolchain at all, which is worth preserving as
   a property, but the app itself is a generation, not the asset.

The plan's core inversion: today the project treats the ledgers as durable
because they are plain text in git. That is necessary but not sufficient. Plain
text solves *format* rot. It does not solve *evidence* rot, *platform* rot,
*maintainer* loss, or *forced removal* — which are four of the five endstates
below.

## 2. Endstates

Over a 30-year horizon these are not exclusive alternatives; the project will
likely pass through several. Each is assessed for what breaks and what the plan
must guarantee.

### E1 — Quiet abandonment (near-certain at some point)

The maintainer stops pushing. No drama, no deletion; the repo just freezes.
Effective bus factor today is **1** (one human committer, `bigbirdreturns@proton.me`).

What breaks silently:

- GitHub disables the scheduled `update-sweep` workflow after 60 days of repo
  inactivity, so the scout stops running — acceptable, it's advisory.
- The evidence layer keeps rotting: every unarchived URL receipt decays on its
  own clock whether or not anyone is watching. Roughly half of ordinary web
  URLs die within a decade; over 30 years, assume near-total loss of anything
  not archived.
- Nobody holds credentials to act on the repo (approve fixes, respond to a
  takedown, migrate hosting) — see E4.

**Requirement:** the repository must be *complete at rest*. At every commit to
`main`, the cold-copy test should pass. Durability work cannot be deferred
maintenance; it has to be enforced at ingest time (validator rules, §4.2) so
abandonment freezes a self-sufficient object rather than a decaying one.

### E2 — Platform loss (likely at least once in 30 years)

GitHub ceases to exist, changes terms incompatibly, or suspends the account.
Thirty years ago the equivalent hosts were SourceForge and personal FTP; assume
at least one forced migration. Sub-case: GitHub Pages specifically — the
deployed site is a single-host artifact with no mirror.

What breaks: hosting, the Actions pipeline, issue/PR history (which is *not* in
git — merge rationale like the option-A Dialog roster decision at commit
`7f81cee` lives partly in PR threads), and discoverability.

**Requirement:** git-native redundancy. The repo must exist as full clones in at
least two unaffiliated locations plus one institutional archive that survives
company failure (Software Heritage archives public GitHub repos and accepts
save requests; Zenodo issues DOIs for tagged releases and is CERN-backed).
Decision rationale must be promoted from PR threads into committed docs — the
practice of in-repo decision records (`docs/master-v3-import-gate.md` is a good
existing example) should be policy, not habit.

### E3 — Toolchain rot (certain, slow)

Node.js 20 will be unrunnable on stock systems well before 2056; GitHub Actions
`v4` action tags will break long before that. The MCP server (`src/mcp-server.js`)
targets a protocol that may not exist in 10 years.

What breaks: `npm run compile`, the deploy pipeline, the scout, the MCP surface.
What does *not* break: the ledgers, the registries, the docs, and — because
`build/` outputs are committed — the last-compiled hop graph and the static app.

**Requirement:** treat compiler and app as **generations**. The contract between
generations is the data format, so the format must be specified *in prose, in
the repo, independent of the code* (§4.1). Today the schema exists only
implicitly in `tools/` and `src/validate.js`; if the code becomes unrunnable and
unreadable-in-context, the ledgers lose their semantics. The committed `build/`
snapshot is the bridge that keeps the *product* usable across a toolchain gap,
so committing build artifacts — normally an antipattern — is here a deliberate
durability feature and should be documented as such.

### E4 — Forced removal (the endstate this project specifically must plan for)

This is not a generic open-source project. It maps living, named people — UK
government figures, founders, a leaked private-society roster — under UK
defamation law and UK/EU GDPR. Plausible triggers over 30 years: a
right-to-erasure demand, a defamation letter, a DMCA claim against quoted
material, or platform ToS action against the leaked-roster content. Any of
these can force content off GitHub faster than a maintainer can respond,
and GDPR erasure can compel *history rewrite*, not just tip-of-tree deletion.

What breaks: potentially the entire public copy, and — if handled badly — the
integrity of the ledger itself (silent deletions are indistinguishable from
vandalism or coercion to a future reader).

**Requirements:**

- **Severability.** Every claim about a person must be removable without
  corrupting the rest of the topology. The ledger design already supports this
  (rows are independent; hops are compiled, not stored), which is a real asset.
  Policy must add: removals happen as **tombstones** — a row is replaced by a
  dated tombstone recording that a removal occurred, its legal basis category,
  and what classes of artifact were affected, *without* republishing the removed
  content. The compiled outputs simply lose the hops; the record shows an
  honest gap rather than a silent one.
- **History-rewrite protocol.** If erasure legally requires purging git history,
  the procedure is: tombstone first, then rewrite, then re-tag, with the
  tombstone and a new release note surviving the rewrite. Mirrors and archives
  must be part of the protocol (Software Heritage and Zenodo have their own
  takedown processes; the plan is to comply there too, not to use archives as
  erasure evasion — that would convert a legal risk into a fatal one).
- **The redaction policy is the shield — keep it enforced.** The public-role-only
  rule and the listing caveat (`docs/redaction-policy.md`) are what make the
  project defensible for 30 years. The validator already rejects known
  private-field names; that check must extend to the new ledger files, not just
  legacy edges.

### E5 — Success and forking (the good problem)

The project gets adopted; forks diverge; someone publishes a modified ledger
under the same name with claims the original never made. For a project whose
entire value is evidentiary discipline, a polluted fork ecosystem is a
reputational endstate as damaging as deletion.

**Requirements:** signed, tagged releases with DOIs so there is always a
citable canonical version; an explicit data license (§3, item 6) so reuse terms
are unambiguous; and the methodology docs stating plainly that the canonical
lineage is identified by tags/DOIs, not by the name.

### E6 — The subject matter becomes history

By 2040 the UK AI policy machinery this maps will have resolved into whatever
it resolves into. The project's value shifts from live research instrument to
**historical record** — arguably its highest long-term value. Every requirement
above serves this endstate; the additional one is *temporal self-description*:
receipts must carry access dates and archived snapshots so a historian can
distinguish "what the source said when cited" from "what the URL serves now."

## 3. Current fragility audit (specific, verified)

1. **Receipts pointing at session-scratch files.** 4 of 17 receipt rows in
   `data/ledger/receipts.jsonl` cite paths like `/mnt/data/Pasted text(152).txt`
   and `/mnt/data/Pasted markdown(11).md` — files on an AI-session disk that no
   longer exists. These receipts are *already* unverifiable, today, at year
   zero. This is the single most urgent defect in the repository.
2. **Zero archived URLs.** 6 receipt rows cite live URLs. None carry an archive
   snapshot, access date, content hash, or quoted excerpt. Every one is on a
   decay clock.
3. **Bare-homepage citations.** Three of those URL receipts point at site roots
   (`https://www.reuters.com/`, `https://www.army.mil/`, `https://dialog.org/`)
   rather than the specific article or page. These are not verifiable citations
   even while the sites are alive.
4. **The validator does not validate receipts.** `tools/validate-release.mjs`
   requires hops to *carry* receipt IDs but never checks that a receipt row's
   evidence is resolvable, archived, or even well-formed. Evidence rot is
   invisible to `npm run release:check`.
5. **No releases, no tags, no external archive.** There is no tagged version,
   no Zenodo/DOI deposit, no known mirror. The project exists in exactly one
   place under exactly one account.
6. **Data license ambiguity.** `LICENSE` is MIT, which is a software license.
   The ledgers are a factual database with curated selection; their reuse terms
   should be stated explicitly (CC BY 4.0 is the natural fit and preserves
   attribution through forks — see E5).
7. **Schema lives only in code.** No prose specification of the JSONL row
   schemas, the surface-type taxonomy semantics, or the hop-eligibility rules
   exists apart from executable code and scattered docs.
8. **Bus factor 1**, with no succession statement and no second keyholder.

## 4. The plan

Ordered by when the work happens. Items marked **[standing]** are permanent
policy; the rest are one-time.

### 4.1 Immediately (repairs the year-zero defects)

1. **Receipt remediation.** For each `/mnt/data/*` receipt: recover or
   reconstruct the quoted material into a file under `receipts/` (the
   `receipts/dialog-human-layer.md` pattern is correct), or — if the material
   is unrecoverable — downgrade the receipt's `evidence_class` and mark it
   `unverifiable`, and let the scoring reflect that. Never leave a receipt
   pointing outside the repository at a non-URL path again.
2. **Archive every URL receipt.** For each of the 6 URL receipts: request a
   Wayback Machine snapshot, record `archive_url` and `accessed` date on the
   row, add a short quoted excerpt (fair-dealing scale) and a SHA-256 of the
   retrieved content. Replace the three bare-homepage citations with specific
   page URLs or downgrade them.
3. **Write `docs/format-spec.md`.** A prose specification of every ledger row
   type, every canonical registry, the surface-type semantics
   (hop-eligible / non-hop scorable / context-only / scout-only), and the hop
   compilation rule from `docs/release-architecture.md` — written so the
   compiler could be reimplemented from it. This is the document that makes E3
   survivable.
4. **State the data license.** Add a `LICENSE-DATA` (CC BY 4.0) covering
   `data/`, `docs/`, and `receipts/`, and note the split in `README.md`.
5. **Tag `v0.2.0` and cut a release.** First citable version.

### 4.2 Enforcement — make durability an invariant, not a chore **[standing]**

Extend `tools/validate-release.mjs` so `npm run release:check` fails when:

- a receipt `path` is a filesystem path that does not exist inside the repo;
- a receipt `path` is a URL without an `archive_url` and `accessed` date;
- a URL receipt's `path` is a site root rather than a specific resource;
- any ledger row (not just legacy edges) contains a known private/sensitive
  field name.

This is the mechanism that makes E1 (abandonment) safe: if the checks pass at
every merge, the frozen repo is self-sufficient by construction. The
archive-on-ingest rule also belongs in `CONTRIBUTING.md` and the candidate-
surface template, so contributors deliver archived evidence, not live links.

### 4.3 Redundancy — survive platform loss (within the year)

1. **Mirrors:** full pushes to at least two unaffiliated hosts (e.g. Codeberg
   — nonprofit, EU — and one more). A `git push --mirror` in the deploy
   workflow keeps them current for free while Actions still runs; they remain
   valid clones after it stops.
2. **Software Heritage:** submit a save request; verify the repo is captured.
   Re-trigger on major releases. **[standing]**
3. **Zenodo:** deposit each tagged release; record the DOI in the release notes
   and `README.md`. This gives every version a citation target that survives
   both GitHub and the maintainer. **[standing]**
4. **Decision records in-repo:** any merge decision currently living only in a
   PR thread that a future reader would need (the Dialog roster option-A
   decision, the master-v3 import gate rationale) gets a short dated note under
   `docs/`. **[standing]**

### 4.4 Succession — survive maintainer loss (within the year)

1. Add a `GOVERNANCE.md`: who holds keys today, the intent that the project be
   continued or archived-in-place, and the rule that canonical lineage is
   defined by signed tags/DOIs (E5).
2. Add at least one second person with admin on the repo and the mirrors, or —
   if the project stays solo — state explicitly in `GOVERNANCE.md` that the
   archives (Zenodo, Software Heritage) *are* the succession plan, so nobody
   is left guessing.

### 4.5 Removal protocol — survive forced takedown **[standing]**

Add `docs/removal-protocol.md` implementing E4's requirements: tombstone rows
(schema: `tombstone: true`, date, basis category, affected artifact classes, no
republished content), recompile so hops honestly disappear, and the
history-rewrite procedure (tombstone → rewrite → re-tag → notify mirrors and
archives). The redaction policy already governs what never enters the ledger;
this protocol governs how things honestly leave it.

### 4.6 The long clock — years 5 through 30 **[standing]**

1. **The cold-copy drill.** Once a year (or at every release, whichever is
   rarer): clone the repo to a machine with no toolchain, open `index.html`
   from the committed `build/` snapshot, and read `docs/format-spec.md` against
   a sample of ledger rows. If a step fails, that failure is the next release's
   work. This drill *is* the durability plan's test suite.
2. **Generations, not maintenance.** When Node 20 rots, port the compiler to
   whatever is current *from the format spec*, verify it reproduces the
   committed `build/` outputs, commit the new generation alongside the frozen
   old one under `legacy/` (the pattern already exists — the edge-model app
   lives there now). Same for the web app. The data never migrates to a binary
   or framework-coupled format; plain UTF-8 JSONL/JSON/Markdown in git is the
   30-year substrate, everything else is replaceable.
3. **Never acquire dependencies.** The zero-dependency property (Node stdlib
   only, vanilla JS app, no framework, no database, no build step required to
   *read* anything) is the project's biggest existing durability asset. Treat
   adding a dependency as a durability regression requiring justification.

## 5. Summary: what each endstate now looks like

| Endstate | Without this plan | With it |
| --- | --- | --- |
| E1 Abandonment | Evidence rots invisibly; frozen repo decays | Frozen repo is complete at rest; archives hold citable copies |
| E2 Platform loss | Project exists in one place; total loss possible | Mirrors + Software Heritage + Zenodo DOIs; any clone is whole |
| E3 Toolchain rot | Schema semantics die with the code | Format spec + committed builds bridge generations |
| E4 Forced removal | Silent deletions corrupt trust; history rewrite is chaos | Tombstones + rewrite protocol; honest gaps, intact topology |
| E5 Forks/success | Name hijack, claim pollution | Signed tags + DOIs define canonical lineage |
| E6 Historical record | "What did the source say?" unanswerable | Archived snapshots + access dates + hashes per receipt |

The one-sentence version: **make the repository pass the cold-copy test at
every commit, put copies of it in places that outlive both GitHub and the
maintainer, and give evidence, removals, and succession explicit written
protocols so the project degrades honestly instead of silently.**
