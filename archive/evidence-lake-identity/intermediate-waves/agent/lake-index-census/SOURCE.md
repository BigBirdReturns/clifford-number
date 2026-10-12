# Source: `agent/lake-index-census`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `evidence-lake-identity` |
| Branch | `agent/lake-index-census` |
| Tip commit | `2246c8f11097c009bf03f43ccda8d58a44746c66` (2026-07-29T02:46:26+00:00), "Materialize evidence lake basin index" |
| Merge-base with main (`d8392cfb`) | `5bd4c0ce50f4ae03f9be7d466f8341d470e95d05` (2026-07-28); the branch is 45 commit(s) ahead |
| Pull requests | #384 closed draft, opened 2026-07-29, closed 2026-08-11: Index the full evidence lake before claiming corpus knowledge |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `unmerged_pr_branches_with_research`, `lake_branch_heads` (entry `agent/lake-index-census`) |
| Trail row(s) | `tiered-trails.json` [38] "Evidence lake, waves 1 to 20: identity and index layer" (tier B; named in trail row) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/lake-index-census` returned `2246c8f11097c009bf03f43ccda8d58a44746c66` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (37 such files on this branch).

- Research files on the branch that differ from main: **7** (7 new, 0 diverged)
- Stored in this folder: **6** files (87,506 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **1**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.
