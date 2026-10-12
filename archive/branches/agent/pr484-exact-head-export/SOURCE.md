# Source: `agent/pr484-exact-head-export`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `branches` |
| Branch | `agent/pr484-exact-head-export` |
| Same research content on 1 other branch(es) | `agent/publication-sg06-second-repair-staging` (tip `25913f906b`) |
| Tip commit | `ab96b2c36f8f8bdf1f1e9c9233eb9139b959999a` (2026-07-30T16:41:24-07:00), "Export exact PR 484 head" |
| Merge-base with main (`d8392cfb`) | `0d701692fa83a405bd0ba86e7b45c525022589f7` (2026-07-30); the branch is 3 commit(s) ahead |
| Pull requests | #494 closed draft, opened 2026-07-30, closed 2026-08-02: Temporary PR 484 exact-head export |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `unmerged_pr_branches_with_research` (entry `agent/pr484-exact-head-export`) |
| Trail row(s) | none (no trail row names this branch) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/pr484-exact-head-export` returned `ab96b2c36f8f8bdf1f1e9c9233eb9139b959999a` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (25 such files on this branch).

- Research files on the branch that differ from main: **18** (3 new, 15 diverged)
- Stored in this folder: **18** files (304,466 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.
