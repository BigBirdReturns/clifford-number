# Source: `archive/canonical-pre-1.1-20260913`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `branches` |
| Branch | `archive/canonical-pre-1.1-20260913` |
| Tip commit | `f420e0b4bb074ecdd40c7b97e5c9f2adb479a3b5` (2026-09-13T08:49:15-07:00), "archive: preserve canonical pre-1.1 checkout" |
| Merge-base with main (`d8392cfb`) | `f39d9e3a64d3636b555a9aa9ffc8567d1e9321dc` (2026-07-18); the branch is 6 commit(s) ahead |
| Pull requests | none (no pull request has this head branch) |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `branch_only_at_risk` (entry `archive/canonical-pre-1.1-20260913`); `retrospective/2026-10-12/github/branch-only-analysis.json` (entry `b` = this branch: 55 files, 1 absent from main) |
| Trail row(s) | `tiered-trails.json` [38] "Evidence lake, waves 1 to 20: identity and index layer" (tier B; named in trail row) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/archive/canonical-pre-1.1-20260913` returned `f420e0b4bb074ecdd40c7b97e5c9f2adb479a3b5` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (52 such files on this branch).

- Research files on the branch that differ from main: **1** (1 new, 0 diverged)
- Stored in this folder: **1** files (925 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.
