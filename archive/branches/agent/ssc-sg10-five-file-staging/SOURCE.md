# Source: `agent/ssc-sg10-five-file-staging`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `branches` |
| Branch | `agent/ssc-sg10-five-file-staging` |
| Tip commit | `14c2de0e3dcdf181a368ad533811dd74e0687974` (2026-07-31T23:34:25-07:00), "Install SG-10 current workflow" |
| Merge-base with main (`d8392cfb`) | `a0429f0f0055d2d2de9ea6c15c4358aff278476a` (2026-08-01); the branch is 3 commit(s) ahead |
| Pull requests | none (no pull request has this head branch) |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `branch_only_at_risk` (entry `agent/ssc-sg10-five-file-staging`); `retrospective/2026-10-12/github/branch-only-analysis.json` (entry `b` = this branch: 5 files, 0 absent from main) |
| Trail row(s) | `tiered-trails.json` [68] "Outside-review and adoption machinery" (tier D; inferred from branch topic) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/ssc-sg10-five-file-staging` returned `14c2de0e3dcdf181a368ad533811dd74e0687974` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (2 such files on this branch).

- Research files on the branch that differ from main: **3** (0 new, 3 diverged)
- Stored in this folder: **3** files (29,648 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.
