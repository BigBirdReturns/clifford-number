# Source: `agent/adversarial-release-integrity`

Research content recovered from an unmerged branch. Read-only. Never published: `archive/` is held by `data/project/publication-allowlist.json`.

| Field | Value |
|---|---|
| Programme | `branches` |
| Branch | `agent/adversarial-release-integrity` |
| Tip commit | `7e0d9847eee183139c9ca0ed5c00a54f6b002206` (2026-07-29T21:09:14-07:00), "Materialize exact current main for clean allowlist reconstruction" |
| Merge-base with main (`d8392cfb`) | `af3386dcfff904f2535edd0194dc5d9f761cdcd8` (2026-07-28); the branch is 53 commit(s) ahead |
| Pull requests | #382 closed draft, opened 2026-07-28, closed 2026-07-30: Harden release integrity after top-to-bottom adversarial review |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `unmerged_pr_branches_with_research` (entry `agent/adversarial-release-integrity`) |
| Trail row(s) | none (no trail row names this branch) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/adversarial-release-integrity` returned `7e0d9847eee183139c9ca0ed5c00a54f6b002206` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (28 such files on this branch).

- Research files on the branch that differ from main: **1** (1 new, 0 diverged)
- Stored in this folder: **1** files (1,776 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.
