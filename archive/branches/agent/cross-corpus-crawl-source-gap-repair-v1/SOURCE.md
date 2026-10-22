# Source: `agent/cross-corpus-crawl-source-gap-repair-v1`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `branches` |
| Branch | `agent/cross-corpus-crawl-source-gap-repair-v1` |
| Tip commit | `95847165f2395cb663d3e2441e014891cd4aa272` (2026-08-09T16:45:00+00:00), "Reconcile cross-corpus crawl source gaps" |
| Merge-base with main (`d8392cfb`) | `4edc3f4f65851cf2643e889d93df3b6372a2f468` (2026-08-09); the branch is 1 commit(s) ahead |
| Pull requests | #1706 closed, opened 2026-08-09, closed 2026-08-09: Reconcile current crawl source-gap denominator |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `unmerged_pr_branches_with_research` (entry `agent/cross-corpus-crawl-source-gap-repair-v1`) |
| Trail row(s) | `tiered-trails.json` [0] "Clifford ledger: UK AI policy connection map" (tier A; inferred from branch topic) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/cross-corpus-crawl-source-gap-repair-v1` returned `95847165f2395cb663d3e2441e014891cd4aa272` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (0 such files on this branch).

- Research files on the branch that differ from main: **1** (0 new, 1 diverged)
- Stored in this folder: **1** files (17,386 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.
