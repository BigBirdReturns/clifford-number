# Source: counter-selector (moved from the working tree)

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

## Programme: Counter-selector waves 00 to 40

A 30-case search for people whose real output beats their status, which found zero complete cases and three near-misses (Olivieri, Elliot Richardson, David Iglesias), then looked at living open-source maintainers and requested records from the Library of Congress, UN Archives and the Carter Library; the later waves turned into handoff and container-checkpoint controls (the wave 34 package, waves 35 to 40). Forty waves ran on 94 real sources in four days with 39 wave workflows and 38 builder/validator pairs. The 2.0.0 consolidation deleted the programme's tools, tests and workflows (`docs/retrospectives/2026-10-12-consolidation-deletions.md`); the data, reports, schemas and documents stayed in the working tree with no code reading them and were published by the Pages allowlist without being linked from any page. This folder holds those files.

| Field | Value |
|---|---|
| Programme | `counter-selector` |
| Moved | 2026-10-22, with `git mv` from the working tree of branch `work/archive-zero-code-programmes-20261022` (parent commit `0b0d76cb`); each file's history follows it (`git log --follow <file>`) |
| Origin paths | `data/project/counter-selector*` (150 files), `data/project/counter-selector-candidates/` (6), `data/project/counter-selector-wave-34-package/` (8); `reports/core-thesis/counter-selector/` and `reports/core-thesis/counter-selector-wave-02/` to `wave-39/` (78); `schemas/counter-selector*` (39); `docs/counter-selector-program.md` (1); `docs/milestones/counter-selector-wave-*.md` (40) |
| Files | 322 (2,767,176 bytes); 283 of them were on the publication allowlist until this move |
| Code | none: 79 tools, 39 tests and 39 workflows were deleted in 2.0.0 (cost-yield record); nothing under `tools/`, `test/` or `.github/` reads these paths, and no step of `npm run check` or `npm test` names them |
| Cut's verdict | `retrospective/2026-10-12/analyses/apparatus-cost-yield.json`, key `counter_selector`: verdict "cage that earned its keep", timing "alongside" (cage opened 2026-07-31, the day the first candidate set was seeded), cost rank 5 of 37 (515 files, 78,938 lines, 47 pull requests of which 39 merged, 2026-07-31 to 2026-08-03); yield 94 sources, 1 finding (tier C), 0 A/B findings; keep: "The 30-case search method and the three near-misses; collapse the wave workflows into one runner." |
| Trail rows | `retrospective/2026-10-12/trails/tiered-trails.json` [61] "Counter-selector: people whose work outruns their status" (tier C, Park it; where `docs/methods/counter-selector.md`, on main); [72] "Counter-selector handoff and container-checkpoint waves" (tier D, Let it go; where `docs/methods/counter-selector-public-handoff-controls.md`, partly on main) |

## Layout and verification

Every file keeps its repository-relative path under this folder: `archive/programmes/counter-selector/<original path>`. `MANIFEST.tsv` lists each file with its git blob SHA-1 (unchanged by the move; `git hash-object <file>` reproduces it), its size and its origin path. Nothing in the moved files was edited. Relative links inside the moved documents that pointed outside the moved set (for example from `docs/milestones/counter-selector-wave-*.md` to `../methods/counter-selector-*.md`) are left as written and resolve only against the original location.

## Kept in place

None of the moved paths is read or pinned by anything still in the release gate, so nothing on the move list stayed behind.

Not part of this move, still in the working tree and still on the publication allowlist: `docs/methods/counter-selector-*.md` (40 files, including the 30-case method `docs/methods/counter-selector.md` and `docs/methods/counter-selector-wave-00.md`) and `docs/requests/counter-selector-wave-21-*.md` (3 records requests). The cut's keep verdict names the search method and the three near-misses, and `docs/README.md` lists these notes.

## References from outside the moved set

- `data/reservoir/sources/retrospective-2026-10-12/raw-trails.json` names `data/project/counter-selector-program.json`, `data/project/counter-selector-wave-26-observability-pivot.json` and `data/project/counter-selector-wave-28-batch-b-blind-review.json` as trail `where` paths. The reservoir derivation (`tools/lib/reservoir.mjs`, `deriveRetrospective`) checks presence per tiered trail; both counter-selector trails still have a present path under `docs/methods/`, so no contradiction row is produced and `npm run validate:reservoir` is unaffected.
- `docs/README.md` ("Historical programmes") linked `docs/counter-selector-program.md`; the link now points here.
- `data/project/publication-allowlist.json` listed 283 of these paths; they were removed on 2026-10-22 and now fall under the held `archive/` prefix rule.
