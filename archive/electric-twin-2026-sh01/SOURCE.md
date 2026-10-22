# Source: `diagnostic/electric-twin-2026-sh01-form-custody-v2`

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

## Programme: Electric Twin 2026 SH01 form custody

Diagnostic custody of four Companies House SH01 (return of allotment of shares) forms for Electric Twin Ltd (company 15173006): filed 2026-01-27, 2026-04-14 (two) and 2026-07-15, for allotments on 2026-01-13, 2026-03-06, 2026-04-02 and 2026-07-09, taking resulting nominal capital from GBP 3.658437 to GBP 3.672047. The folder holds the four PDFs (4 pages each) with a SHA-256 per file, page images, text extracts, `documents.tsv` (document ids and source URLs) and `capture-log.tsv`. The README on the branch states the limit: "diagnostic custody only"; the forms need field-level review before any canonical claim, participant, ownership or topology change.

This is the 2026 follow-on to trail row [2] (Electric Twin ownership and the Atomico round): the row notes "2026 SH01 capture sits on branch diagnostic/electric-twin-2026-sh01-form-custody-v2". Not re-fetched; the files are the branch's.

| Field | Value |
|---|---|
| Programme | `electric-twin-2026-sh01` |
| Branch | `diagnostic/electric-twin-2026-sh01-form-custody-v2` |
| Tip commit | `abbd9b4db301b55565105384b33eaa124371c266` (2026-08-14T15:05:24+00:00), "research: capture Electric Twin 2026 SH01 form custody" |
| Merge-base with main (`d8392cfb`) | `f20fb65c3dce9801b0b4490eb68f3b0ba7906c56` (2026-08-14); the branch is 1 commit(s) ahead |
| Pull requests | none (no pull request has this head branch) |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `branch_only_at_risk` (entry `diagnostic/electric-twin-2026-sh01-form-custody-v2`); `retrospective/2026-10-12/github/branch-only-analysis.json` (entry `b` = this branch: 36 files, 36 absent from main) |
| Trail row(s) | `tiered-trails.json` [2] "Electric Twin ownership and the Atomico round" (tier A; named in trail row) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/diagnostic/electric-twin-2026-sh01-form-custody-v2` returned `abbd9b4db301b55565105384b33eaa124371c266` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (0 such files on this branch).

- Research files on the branch that differ from main: **36** (36 new, 0 diverged)
- Stored in this folder: **36** files (3,180,042 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.
