# Source: `agent/ssc-wave02-final-ref-preflight-v3`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `branches` |
| Branch | `agent/ssc-wave02-final-ref-preflight-v3` |
| Tip commit | `887544198f79b3e6485c29af73827f0e74b9502d` (2026-09-04T15:55:39-07:00), "fix: bind V3 failed-controller historical main" |
| Merge-base with main (`d8392cfb`) | `0fc2fa718a8a2a49c22d7923f7cce2ee6ec8aa05` (2026-09-04); the branch is 1 commit(s) ahead |
| Pull requests | #2599 closed draft, opened 2026-09-04, closed 2026-09-08: chore: preflight final SSC Wave-02 ref retirement v3 [never merge] |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `unmerged_pr_branches_with_research` (entry `agent/ssc-wave02-final-ref-preflight-v3`) |
| Trail row(s) | `tiered-trails.json` [60] "'Status-for-sovereignty compact' umbrella thesis" (tier C; inferred from branch topic) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/ssc-wave02-final-ref-preflight-v3` returned `887544198f79b3e6485c29af73827f0e74b9502d` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (1 such files on this branch).

- Research files on the branch that differ from main: **8** (8 new, 0 diverged)
- Stored in this folder: **8** files (12,232 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.

### Transport carriers

The branch carries base64 transport shards (files that smuggled a tarball past the workflow-permission seam). The shards are archived byte-exact; where they decode to a tar archive the research members were also unpacked:

- `reports/transport/ssc-wave02-final-ref-preflight-v3` (8 shards): decodes (gzip, 34961 bytes) to a script/non-tar payload; not research content
