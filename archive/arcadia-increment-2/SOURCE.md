# Source: `claude/arcadia-field-autopsy-xqrkkn`

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

## Programme: Arcadia field autopsy, second research increment

Arcadia, California: a chatbot's "master plan" claim tested against public records (case `arcadia-field-autopsy`, FA-2026-0714-ARC1). Main holds the first increment. This branch (2026-07-15, 2,423 commits behind main) executes seven trails from the case's own frontier (deed chronology, DAIA formation instruments, Erik Wahl's title and tenure, station cost share, Monrovia/Duarte/K Line comparables) and resolves the pre-positioning question. The 16 archived files are the branch's versions of `cases/arcadia-field-autopsy/*` and `docs/field-autopsy.md`, which differ from main's.

What the branch's `analysis.md` records: the Alexan Azalea block was bought on 2018-01-24 for $25.6M (price corroborated by the assessor's Prop 13 base year); the Downtown Arcadia Improvement Association is a contribution-funded 501(c)(3) formed in 2013 (FY2025 revenue $160,121), not a documented statutory assessment district; no document titled "1993 Downtown Revitalization Strategy" exists in anything retrieved; the deed chronology that could have supported a pre-positioning story instead puts the first documented Positive Investments purchase 22 months after the train. Standing boundary in the file: no wrongdoing is alleged.

| Field | Value |
|---|---|
| Programme | `arcadia-increment-2` |
| Branch | `claude/arcadia-field-autopsy-xqrkkn` |
| Tip commit | `c224320300639c7616a05837326a3f50ead5ebd8` (2026-07-15T01:03:01+00:00), "arcadia: execute 7 frontier trails, resolve pre-positioning question" |
| Merge-base with main (`d8392cfb`) | `261ac01ded173abb48e5f1986e9ac6cb7dcdbdb3` (2026-07-14); the branch is 4 commit(s) ahead |
| Pull requests | none (no pull request has this head branch) |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `branch_only_at_risk` (entry `claude/arcadia-field-autopsy-xqrkkn`); `retrospective/2026-10-12/github/branch-only-analysis.json` (entry `b` = this branch: 31 files, 0 absent from main) |
| Trail row(s) | `tiered-trails.json` [22] "Arcadia, California: testing a chatbot's 'master plan' against records" (tier B; named in trail row) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/claude/arcadia-field-autopsy-xqrkkn` returned `c224320300639c7616a05837326a3f50ead5ebd8` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (15 such files on this branch).

- Research files on the branch that differ from main: **16** (0 new, 16 diverged)
- Stored in this folder: **16** files (441,212 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.
