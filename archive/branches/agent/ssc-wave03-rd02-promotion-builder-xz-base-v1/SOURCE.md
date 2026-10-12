# Source: `agent/ssc-wave03-rd02-promotion-builder-xz-base-v1`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `branches` |
| Branch | `agent/ssc-wave03-rd02-promotion-builder-xz-base-v1` |
| Tip commit | `695458ced14ad04e64c631cb72a298741138e63f` (2026-08-04T20:19:25-07:00), "Add compressed cumulative builder shard 002" |
| Merge-base with main (`d8392cfb`) | `61a33f5459e64f1978d9c55c1b7ea7f925358cd8` (2026-08-04); the branch is 3 commit(s) ahead |
| Pull requests | none (no pull request has this head branch) |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `branch_only_at_risk` (entry `agent/ssc-wave03-rd02-promotion-builder-xz-base-v1`); `retrospective/2026-10-12/github/branch-only-analysis.json` (entry `b` = this branch: 3 files, 3 absent from main) |
| Trail row(s) | `tiered-trails.json` [43] "Pentagon SBIC Critical Technologies funds" (tier C; inferred from branch topic) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/ssc-wave03-rd02-promotion-builder-xz-base-v1` returned `695458ced14ad04e64c631cb72a298741138e63f` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (0 such files on this branch).

- Research files on the branch that differ from main: **3** (3 new, 0 diverged)
- Stored in this folder: **3** files (7,628 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.

### Transport carriers

The branch carries base64 transport shards (files that smuggled a tarball past the workflow-permission seam). The shards are archived byte-exact; where they decode to a tar archive the research members were also unpacked:

- `data/project/transport/ssc-wave03-rd02-promotion-builder-xz-v1` (3 shards): decodes (xz, 28812 bytes) to a script/non-tar payload; not research content
