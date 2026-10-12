# Source: `agent/natsec100-2025-identity-source-custody-20260908`

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

## Programme: NatSec100 2025 identity-source custody (open PR #2639)

Source custody for the 23 unresolved 2025 NatSec100 adjudication rows, observed 2026-09-08 on base `e5a02fa614db4d0f54c44acfb537dfcf53b5a716`. The packet retains all 26 requested source bodies (HTTP 200, TLS verified, 24 terminal hosts; 8,754,182 body bytes) in a deterministic 134-member `sources.zip` (3,841,394 bytes, SHA-256 `fd6f3ff77e2314bfd12cdd34de1f120b552d86c4a27d021e2bcb1bceb87a8149`) with an offline `verify.py`, `manifest.json`, `assessment.json` and `review.md`. Findings recorded in `review.md`: 19 exact brand/domain candidates supported, 2 existing-registry alias/website updates supported (Second Front, OPAQUE), 2 successor-brand continuity candidates supported (Aetherflux/Cowboy Space, Axion/Axion Ray); 0 legal-entity successions, 0 case-receipt admissions, 0 registry or company-year promotions. Status: "source custody complete; case-receipt admission and identity promotion remain pending".

Trail row [27] describes this as the "26-route identity-evidence custody for the 23 unresolved names" waiting in open PR #2639. The branch is 36 commits behind main.

| Field | Value |
|---|---|
| Programme | `natsec100-2025-identity-custody` |
| Branch | `agent/natsec100-2025-identity-source-custody-20260908` |
| Tip commit | `60ec5c883dc131965fe30e6a62117bb5d017b0ab` (2026-09-08T17:52:39-07:00), "Retain NatSec100 2025 identity source custody" |
| Merge-base with main (`d8392cfb`) | `716a15edc3577e0bf8abb4d4236393a3a1924acc` (2026-09-08); the branch is 1 commit(s) ahead |
| Pull requests | #2639 open, opened 2026-09-09: Retain NatSec100 2025 identity source custody |
| Retrospective record | `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` > `unmerged_pr_branches_with_research` (entry `agent/natsec100-2025-identity-source-custody-20260908`) |
| Trail row(s) | `tiered-trails.json` [27] "NatSec100 defence-startup rosters 2023-2026" (tier B; named in trail row) |
| Tip verified on origin | yes: `git ls-remote origin refs/heads/agent/natsec100-2025-identity-source-custody-20260908` returned `60ec5c883dc131965fe30e6a62117bb5d017b0ab` on 2026-10-12, equal to the tip above |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`), cloned bare; object ids are identical to origin's |

## What was copied and how

Method: files added or modified on the branch since the merge-base, restricted to research directories (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`), keeping only those whose blob is absent from main's tree (`new` = path absent on main, `diverged` = path on main with different content). `tools/`, `test/`, `build/`, `.github/` and everything else were not copied (2 such files on this branch).

- Research files on the branch that differ from main: **8** (7 new, 1 diverged)
- Stored in this folder: **8** files (3,973,352 bytes)
- Identical to a file already archived elsewhere (pointer in `MANIFEST.tsv`, not copied again): **0**
- `MANIFEST.tsv` lists every file with its git blob SHA-1 (check with `git hash-object <file>`), size and where it is stored.
