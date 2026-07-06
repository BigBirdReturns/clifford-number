# Cold-Start Procedure

Implements BUILD-INSTRUCTIONS.md Section 6.4 ("Mirror and escrow") and its
acceptance test: a new maintainer, from a mirror alone, reproduces the
current release check on clean hardware. Read Section 6.4 and Section 6.5
(the daughters test) first — this document is the drill; those sections are
the requirement it satisfies.

## 1. What a complete mirror is

A complete mirror is the git repository, all branches and all tags. Nothing
else is required for the build to run.

`build/` artifacts (`receipt-graph.json`, `surface-graph.json`,
`hop-graph.json`, `axm-identity.json`, `scores.json`, `migration-review.md`,
`scout-report.md`) are committed here, but a mirror does not need to preserve
them to be complete. The repository's own rule (BUILD-INSTRUCTIONS.md 1.4):
"Generated artifacts are disposable and reproducible from ledgers alone."
`README.md` says the same: "Generated artifacts are disposable. Do not edit
them by hand." A mirror holding the ledgers (`data/ledger/*.jsonl`),
canonical registries (`data/canonical/*.json`), compiler (`tools/`, `src/`),
docs, and `receipts/` can regenerate every `build/` file byte-for-byte; a
mirror holding only `build/` has lost the actual asset. The committed
`build/` snapshot is a convenience — it lets the static site run without a
toolchain, per `docs/durability-plan.md` E3 — not a completeness requirement.

**Open item — archived receipts.** Receipt rows carry an `archive` block
(`{"method":"internet_archive","ref":"https://web.archive.org/..."}` or
`{"method":"in_repo_content_hash","ref":"sha256:..."}`). A git mirror gives
you the receipt *rows* — the claim that a source exists — but not always the
archived material: an Internet Archive snapshot resolves through a live URL,
not through git. The mirror is complete under Section 6.4 only if those
`archive.ref` values stay externally resolvable, or the mirror separately
includes fetched copies of the archived content. Neither is guaranteed
today: no fetched-content escrow ships with the repo, and nothing checks
that archive references still resolve. An open gap, not a solved one — see
Section 5.

## 2. Cold-start steps

```bash
git clone <mirror-url> clifford-number
cd clifford-number
node --version   # must satisfy >=20, per "engines" in package.json
npm install
npm run check
```

`npm install` is expected to do nothing: `package.json` has no
`dependencies` field. This is deliberate, not an oversight —
`docs/durability-plan.md` 4.6 names "never acquire dependencies" as standing
policy and calls the zero-dependency property "the project's biggest
existing durability asset." State it plainly: a correct checkout installs
nothing; if `npm install` ever fetches packages, policy has drifted.

`npm run check` is `compile && validate:release && npm test`
(`release:check` is an alias for the same sequence). It compiles the ledgers
into the hop graph, scores actors and organizations, runs the scout,
validates every Section 1 invariant, and runs the compiler test suite.

### What success looks like

1. A `validate-release: OK` block with summary counts:

   ```
   validate-release: OK
     surfaces: <n>
     hop edges: <n>
     master rows classified: <n>
   ```

2. Six test files, each ending in its own `OK` line, in this order (the
   `test` script in `package.json`): `temporal.test`, `axm-id.test`,
   `axm-id-conformance.test`, `axm-identity.test`, `compiler.test`,
   `receipt-archival.test`.

If any of these seven lines is missing, or the process exits non-zero, the
cold start has failed; treat the failure as the next release's work, not
something to patch around by hand-editing `build/`.

### Expected warnings

The archival gate (`tools/lib/receipt-archival.mjs`, wired into
`tools/validate-release.mjs` per BUILD-INSTRUCTIONS 2.5) and
`receipt-archival.test` will warn, not error, on four receipts in
`data/ledger/receipts.jsonl` whose `archive.method` is
`unrecoverable_local_paste` (`archive.ref: null`):
`warner-linkedin-gartner-2026-06-29`, `sandhu-comment-newsuk-2026-06-29`,
`warner-surface-audit-2026-06-29`, `surface-architecture-spec-2026-06-29`.
These cite session-scratch paste files already confirmed lost (see
`docs/durability-plan.md` Section 3, item 1). Expect these four warnings;
they do not fail the build before the acceptance cutoff (`validate:release`
fails on any receipt without an archival reference after 2027-01-01, per
BUILD-INSTRUCTIONS 2.5). A fifth unexplained warning, or these four
persisting past 2027-01-01 without failing the build, is a real defect.

## 3. Verifying provenance of the identity layer

`tools/lib/axm-id.mjs` is reconciled byte-for-byte against `axm-genesis`, not
merely inspired by it. Verify independently:

```bash
sha256sum test/vectors/identity.json
# expect: 0104c9492c41a16f19e893f2d7be3b24f79456b49325a55c1885c6324fcc171e
```

Those vectors are sourced from `axm-genesis` commit `a73335d` (a sibling
repository, not a dependency — nothing here fetches it at build time). If
you also hold a copy of `axm-genesis`, confirm the vectors at that commit
match what is pinned here.

`test/axm-id-conformance.test.js` asserts every canonicalization, entity-id,
and claim-id vector in `test/vectors/identity.json` against this
repository's port of the derivation, printing pass counts as it goes. It
runs inside `npm test`, so a passing `axm-id-conformance.test: OK` line in
Section 2's output *is* the provenance check — there is no separate command.
If this test ever fails, the identity layer has drifted and, per
BUILD-INSTRUCTIONS 2.1, no cross-case join should be trusted until it is fixed.

## 4. Empirical note

Cold start is not hypothetical. During the working session of 2026-07-06,
the local working trees of both this repository and `axm-genesis` were
destroyed mid-session by an environment reset. All work in progress was
recovered from the pushed remote branches with zero loss. Recovery required
nothing beyond re-cloning and re-running the commands in Section 2. This is
the first real, not drilled, exercise of the Section 6.4 property.

## 5. Open items for full 6.4 compliance

- [ ] **Second archival home beyond GitHub.** No mirror exists outside
      GitHub (Codeberg, Software Heritage, Zenodo — see
      `docs/durability-plan.md` 4.3). Section 6.4 requires at least two
      independent archival homes; there is currently one.
- [ ] **Fetched receipt-content escrow.** No bundle of fetched archived
      material (snapshots, hashed page content) travels with the mirror;
      resolving an `archive.ref` still depends on the external archive
      service staying up.
- [ ] **A documented cold-start test on clean hardware by a person who is
      not the author.** This procedure has been exercised by the author,
      under an environment reset (Section 4), but not yet as a deliberate
      drill run by an independent second person on genuinely clean
      hardware — the literal acceptance criterion in BUILD-INSTRUCTIONS 6.4.
