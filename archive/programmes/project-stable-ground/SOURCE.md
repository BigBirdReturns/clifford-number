# Source: project-stable-ground (moved from the working tree)

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

## Programme: Project Stable Ground checkpoints SG-01 to SG-12

Twelve dated checkpoints of "what is actually established" per research lane (the alignment checkpoint SG-01 of 2026-07-29, then SG-02 to SG-12 through 2026-08-01), each a project JSON with an exact-byte release manifest, a milestone note and a rendered report, governed by `project-stable-ground-governor.json` and pointed at by `project-stable-ground-current.json`. The 2.0.0 consolidation deleted its 24 validators, 12 tests and 12 workflows (`docs/retrospectives/2026-10-12-consolidation-deletions.md`); the checkpoints, manifests, notes and reports stayed in the working tree with no code reading them except the pointer file, and were published by the Pages allowlist without being linked from any page. This folder holds those files; two project JSON files and one planning note stayed where they were (see below).

| Field | Value |
|---|---|
| Programme | `project-stable-ground` |
| Moved | 2026-10-22, with `git mv` from the working tree of branch `work/archive-zero-code-programmes-20261022` (parent commit `0b0d76cb`); each file's history follows it (`git log --follow <file>`) |
| Origin paths | `data/project/project-stable-ground-{alignment,governor,sg02..sg07,sg09..sg12}.json` and the twelve `project-stable-ground-*-release-manifest.json` files (24 of the 26 `data/project/project-stable-ground-*` files); `docs/milestones/project-stable-ground-{alignment,sg02..sg12}.md` (12); `reports/core-thesis/stable-ground/{index.html,data.json}` and `reports/core-thesis/stable-ground/sg02/` to `sg12/` (24) |
| Files | 60 (661,721 bytes); all 60 were on the publication allowlist until this move |
| Code | none: 24 tools, 12 tests and 12 workflows were deleted in 2.0.0; the only in-gate reader of the programme is `tools/build-status-sovereignty-wave-01-second-party-review.mjs`, which reads the kept pointer file for `current_checkpoint_id` |
| Cut's verdict | `retrospective/2026-10-12/analyses/apparatus-cost-yield.json`, key `stable_ground`: verdict "cage that earned its keep", timing "earned" (SG-01 on 2026-07-29 followed the first sourced findings of 2026-07-24 by five days), cost rank 6 of 37 (110 files, 22,023 lines, 76 pull requests of which 29 merged, 2026-07-30 to 2026-08-12; 12 tests, 24 tools, 12 workflows); yield 0 sources, 0 findings; why: "12 checkpoints were then built and validated in three days, but only the SSC review builders cite them and no release gate, page or reader consumes them"; keep: "The chain as the dated ledger of what each lane established; no new checkpoints without a new finding." |
| Trail rows | `retrospective/2026-10-12/trails/tiered-trails.json` [68] "Outside-review and adoption machinery" (tier D, Let it go), whose rows include "Project stable ground: twelve checkpoints of 'what is actually established'"; its `where` is `docs/milestones/m05-answerable-power-sprint-05.md`, which stays in place |

## Layout and verification

Every file keeps its repository-relative path under this folder: `archive/programmes/project-stable-ground/<original path>`. `MANIFEST.tsv` lists each file with its git blob SHA-1 (unchanged by the move; `git hash-object <file>` reproduces it), its size and its origin path. Nothing in the moved files was edited. The moved release manifests pin the checkpoint JSON files by path and sha256; `project-stable-ground-sg08-release-manifest.json` still points at the kept `data/project/project-stable-ground-sg08.json`, the others at paths that now live under this folder.

## Kept in place

| Path | Kept in place because |
|---|---|
| `data/project/project-stable-ground-current.json` | read by `tools/build-status-sovereignty-wave-01-second-party-review.mjs` (`npm run build:status-sovereignty`, part of `npm run check`) for its `current_checkpoint_id`; its `history[]`, `governor_path` and `current_checkpoint_path` entries still name the original paths of the moved checkpoint files |
| `data/project/project-stable-ground-sg08.json` | named as `parent_checkpoint.path` by `data/project/status-sovereignty-wave-01-second-party-review-campaign.json` (schema constant in `schemas/status-sovereignty-second-party-review-campaign.schema.json`), which `tools/validate-status-sovereignty-wave-01-second-party-review.mjs` validates in `npm run check`; the same pointer is echoed in `build/core-thesis/status-sovereignty/wave-01-second-party-review/data.json` and `reports/core-thesis/status-sovereignty/wave-01-second-party-review/data.json` |
| `docs/project-realignment.md` | not a stable-ground document: it is the core-thesis realignment note, does not mention the checkpoint chain, and `docs/README.md` lists it only as a related planning note |

## References from outside the moved set

- `data/project/dca-h01-crosswalk.json` and `reports/core-thesis/distributed-counterpower-aversion/data.json` name `data/project/project-stable-ground-alignment.json` as a `canonical_source`. Their builder and validator (`tools/build-dca-h01.mjs`, `tools/validate-dca-h01.mjs`) are run by nothing in `npm run check`, `npm test` or any workflow.
- `data/reservoir/sources/retrospective-2026-10-12/raw-trails.json` names `docs/milestones/project-stable-ground-alignment.md` and `docs/milestones/project-stable-ground-sg12.md` as `where` paths of rows under trail [68]; the trail's own `where` stays present, so the reservoir derivation records no contradiction and `npm run validate:reservoir` is unaffected.
- `docs/README.md` ("Historical programmes") linked `docs/milestones/project-stable-ground-alignment.md` and named `sg02.md` to `sg12.md`; the links now point here.
- `data/project/publication-allowlist.json` listed all 60 paths; they were removed on 2026-10-22 and now fall under the held `archive/` prefix rule.
