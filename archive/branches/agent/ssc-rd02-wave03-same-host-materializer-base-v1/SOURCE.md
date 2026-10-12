# Source: `agent/ssc-rd02-wave03-same-host-materializer-base-v1`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `branches` |
| Branch | `agent/ssc-rd02-wave03-same-host-materializer-base-v1` |
| Same research content on 1 other branch(es) | `agent/ssc-rd02-wave03-same-host-materializer-trigger-v1` (tip `d006d1c403`) |
| Tip commit | `2f81be2285ef9c3b2287652471773a6c1e2d2512` (2026-08-04T13:27:12-07:00), "Add never-merge RD-02 same-host materializer" |
| Merge-base with main (`d8392cfb`) | `17a05f2b263424306ce1233056c091925908d3ea` (2026-08-04); the branch is 9 commit(s) ahead |
| Pull requests | none (no pull request has this head branch) |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `pr_less_but_anchored` (entry `agent/ssc-rd02-wave03-same-host-materializer-base-v1`); `retrospective/2026-10-12/github/branch-only-analysis.json` (entry `b` = this branch: 9 files, 8 absent from main) |
| Trail row(s) | `tiered-trails.json` [43] "Pentagon SBIC Critical Technologies funds" (tier C; inferred from branch topic) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/ssc-rd02-wave03-same-host-materializer-base-v1` returned `2f81be2285ef9c3b2287652471773a6c1e2d2512` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (1 such files on this branch).

- Research files on the branch that differ from main: **8** (8 new, 0 diverged)
- Stored in this folder: **8** files (20,478 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.

### Transport carriers

The branch carries base64 transport shards (files that smuggled a tarball past the workflow-permission seam). The shards are archived byte-exact; where they decode to a tar archive the research members were also unpacked:

- `data/project/transport/ssc-rd02-wave03-same-host-v1/executor` (2 shards): decodes (xz, 6053 bytes) to a script/non-tar payload; not research content
- `data/project/transport/ssc-rd02-wave03-same-host-v1/package` (6 base64 shards, carrier sha256 `40de5f186eef7193...`): xz tar; 9 members; 0 research files written under `decoded/ssc-rd02-wave03-same-host-v1--package/`; 4 tools/test/workflow members skipped; 5 identical to main; 0 already archived
