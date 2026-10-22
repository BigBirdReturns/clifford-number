# Source: `observer/ssc-rd04-or-wi-payload-export-v1`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `snap-state-matrix` |
| Branch | `observer/ssc-rd04-or-wi-payload-export-v1` |
| Same research content on 1 other branch(es) | `agent/ssc-rd04-or-wi-minimum-frontier-materializer-v1` (tip `46c6701810`) |
| Tip commit | `740a91b010e3023f8605cf7dd439931da87835ed` (2026-08-11T04:10:08-07:00), "Export exact failed Oregon-Wisconsin carrier payload" |
| Merge-base with main (`d8392cfb`) | `9510310129c3aab44f8b5b187430a3ede005b7b4` (2026-08-10); the branch is 2 commit(s) ahead |
| Pull requests | #1932 closed draft, opened 2026-08-11, closed 2026-08-11: TEMP export exact failed Oregon-Wisconsin payload |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `unmerged_pr_branches_with_research` (entry `observer/ssc-rd04-or-wi-payload-export-v1`) |
| Trail row(s) | `tiered-trails.json` [28] "SNAP work requirements: federal rules and a 50-state matrix" (tier B; named in trail row) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/observer/ssc-rd04-or-wi-payload-export-v1` returned `740a91b010e3023f8605cf7dd439931da87835ed` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (3 such files on this branch).

- Research files on the branch that differ from main: **6** (6 new, 0 diverged)
- Stored in this folder: **6** files (59,734 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.

### Transport carriers

The branch carries base64 transport shards (files that smuggled a tarball past the workflow-permission seam). The shards are archived byte-exact; where they decode to a tar archive the research members were also unpacked:

- `data/transport/ssc-rd04-or-wi-minimum-frontier-materializer` (6 shards): carrier is truncated, non-contiguous or corrupt (whole-stream decompression failed); partial output is unreliable and was not unpacked
