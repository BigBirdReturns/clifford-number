# Source: `agent/ssc-rd02-wave03-terminal-materializer-base-v1`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `branches` |
| Branch | `agent/ssc-rd02-wave03-terminal-materializer-base-v1` |
| Same research content on 1 other branch(es) | `agent/ssc-rd02-wave03-terminal-materializer-trigger-v1` (tip `3fd48fee22`) |
| Tip commit | `226ca62986ec014265bdae0e50a219cd5b574ffc` (2026-08-04T19:32:18-07:00), "Split RD-02 terminal publication around workflow permission seam" |
| Merge-base with main (`d8392cfb`) | `c52f03d4055f85abaec0012d79c9dd61014e72b2` (2026-08-04); the branch is 11 commit(s) ahead |
| Pull requests | none (no pull request has this head branch) |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `branch_only_at_risk` (entry `agent/ssc-rd02-wave03-terminal-materializer-base-v1`); `retrospective/2026-10-12/github/branch-only-analysis.json` (entry `b` = this branch: 10 files, 9 absent from main) |
| Trail row(s) | `tiered-trails.json` [43] "Pentagon SBIC Critical Technologies funds" (tier C; inferred from branch topic) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/ssc-rd02-wave03-terminal-materializer-base-v1` returned `226ca62986ec014265bdae0e50a219cd5b574ffc` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (1 such files on this branch).

- Research files on the branch that differ from main: **9** (9 new, 0 diverged)
- Stored in this folder: **16** files (394,955 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.

### Transport carriers

The branch carries base64 transport shards (files that smuggled a tarball past the workflow-permission seam). The shards are archived byte-exact; where they decode to a tar archive the research members were also unpacked:

- `data/project/transport/ssc-rd02-wave03-terminal-v1/product` (9 base64 shards, carrier sha256 `268d4fb57611c4f2...`): xz tar; 11 members; 7 research files written under `decoded/ssc-rd02-wave03-terminal-v1--product/`; 4 tools/test/workflow members skipped; 0 identical to main; 0 already archived
