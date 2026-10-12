# Source: `agent/ssc-rd04-or-wi-minimum-frontier-materializer-v2`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `snap-state-matrix` |
| Branch | `agent/ssc-rd04-or-wi-minimum-frontier-materializer-v2` |
| Tip commit | `1bc1a30d1c9df8579901b5a045183ba837d7442a` (2026-08-11T05:02:41-07:00), "Add Oregon-Wisconsin adjudication payload segment 01" |
| Merge-base with main (`d8392cfb`) | `146f5ceb1882d02c7be8d225d49665d63478a7df` (2026-08-11); the branch is 10 commit(s) ahead |
| Pull requests | #1936 closed draft, opened 2026-08-11, closed 2026-08-11: TEMP materialize exact RD-04 Oregon-Wisconsin adjudication v2 |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `unmerged_pr_branches_with_research` (entry `agent/ssc-rd04-or-wi-minimum-frontier-materializer-v2`) |
| Trail row(s) | `tiered-trails.json` [28] "SNAP work requirements: federal rules and a 50-state matrix" (tier B; named in trail row) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/ssc-rd04-or-wi-minimum-frontier-materializer-v2` returned `1bc1a30d1c9df8579901b5a045183ba837d7442a` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (2 such files on this branch).

- Research files on the branch that differ from main: **8** (8 new, 0 diverged)
- Stored in this folder: **18** files (306,757 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.

### Transport carriers

The branch carries base64 transport shards (files that smuggled a tarball past the workflow-permission seam). The shards are archived byte-exact; where they decode to a tar archive the research members were also unpacked:

- `data/transport/ssc-rd04-or-wi-minimum-frontier-materializer-v2` (8 base64 shards, carrier sha256 `38596a267c1b7a46...`): gzip tar; 14 members; 10 research files written under `decoded/ssc-rd04-or-wi-minimum-frontier-materializer-v2/`; 4 tools/test/workflow members skipped; 0 identical to main; 0 already archived
