# Source: preference-custody (moved from the working tree)

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

## Programme: Preference-custody audit laboratory (floor v1 to v62, PC-01 to PC-62) and preference-linkage assurance

Issue #594's laboratory for auditing whether a "preference" measured through a platform is the population's or the platform's: a test floor that grew from v1 to v62 in fourteen days on invented fixtures (61 synthetic cases and 2,586 "requirements" by the end), 52 committed control manifests, and a tail of preference-linkage assurance notes about repository, owner and artifact identity. The 2.0.0 consolidation deleted its 357 tools (119 of them under `tools/lib`), 119 tests and 112 workflows (`docs/retrospectives/2026-10-12-consolidation-deletions.md`); the 119 laboratory documents and the fixtures, control manifests and one acquisition request stayed in the working tree with no code reading them and were published by the Pages allowlist without being linked from any page. This folder holds those files. The four real-case captures stayed where they were (see below).

| Field | Value |
|---|---|
| Programme | `preference-custody` (also covers the `preference-linkage-*` fixtures and notes) |
| Moved | 2026-10-22, with `git mv` from the working tree of branch `work/archive-zero-code-programmes-20261022` (parent commit `0b0d76cb`); each file's history follows it (`git log --follow <file>`) |
| Origin paths | `docs/preference-custody-*.md` (119 files); `data/research/preference-custody/*.fixture.json`, `control-manifest*.json`, `human-validation-topology.json` and `representation-validation-authority-matrix.json` (114); `data/research/preference-custody/acquisition/newsuk-matched-method-request.json` (1, a request prepared on 2026-08-01 and never sent) |
| Files | 234 (3,052,878 bytes); all 234 were on the publication allowlist until this move |
| Code | none: 357 tools, 119 tests and 112 workflows were deleted in 2.0.0; nothing under `tools/`, `test/` or `.github/` reads these paths, and no step of `npm run check` or `npm test` names them |
| Cut's verdict | `retrospective/2026-10-12/analyses/apparatus-cost-yield.json`, key `pc_lab`: verdict "golden cage before smoke", timing "cage-first" (floor v1 built 2026-08-01 with no counting evidence in its area; no dated real evidence to 2026-09-15), cost rank 2 of 37 (832 files, 139,154 lines, 222 pull requests of which 73 merged, 2026-08-01 to 2026-08-14; 120 tests, 360 tools, 112 workflows); yield 18 sources, 2 findings of which 1 A/B (tier A "Synthetic audiences in real use: Times ExplorAItion and others", tier C "Exposure-confounding toy"); keep: "The four real-case files and the one-page exposure-confounding explainer." |
| Trail rows | `retrospective/2026-10-12/trails/tiered-trails.json` [71] "Preference-custody test-floor factory (v8 to v62)" (tier D, Let it go; where `docs/preference-custody-laboratory-floor-v59.md`, partly on main); related and kept in place: [4] "Synthetic audiences in real use: Times ExplorAItion and others" (tier A, Show it; where `data/research/preference-custody/real-cases/`) and [57] "Exposure-confounding toy: how click shares fake a preference" (tier C; where `docs/performative-synthetic-constituency.md`) |

## Layout and verification

Every file keeps its repository-relative path under this folder: `archive/programmes/preference-custody/<original path>`. `MANIFEST.tsv` lists each file with its git blob SHA-1 (unchanged by the move; `git hash-object <file>` reproduces it), its size and its origin path. Nothing in the moved files was edited. Relative links inside the moved documents that pointed outside the moved set are left as written and resolve only against the original location.

## Kept in place

| Path | Kept in place because |
|---|---|
| `data/research/preference-custody/real-cases/newsuk-nucleus-human-companion.json` | one of the four real-case captures the cut's keep verdict names; `where` path of tier-A trail [4] |
| `data/research/preference-custody/real-cases/times-exploraition-admission.json` | same |
| `data/research/preference-custody/real-cases/twineo-originalvoices-representation-custody.json` | same |
| `data/research/preference-custody/real-cases/yougov-parallax-hybrid-architecture.json` | same |

Not part of this move and untouched: `docs/performative-synthetic-constituency.md` and `data/research/performative-synthetic-constituencies/exposure-confounding.fixture.json`, which `tools/compile-performative-synthetic-constituency.mjs` and `tools/validate-performative-synthetic-constituency.mjs` read (neither reads anything under `data/research/preference-custody/`); and `docs/requests/newsuk-times-exploraition-nucleus-panel-protocol-request.md`, the request document the moved acquisition record points at.

## References from outside the moved set

- `data/intake/status-sovereignty-rd-wave03-rd04-next-minimum-frontier-route-discovery-protocol/predecessor-custody.json` pins eight of the moved paths by sha256 (`control-manifest-v49.json`, `control-manifest-v50.json`, two `preference-linkage-*` fixtures, four `docs/preference-custody-*` notes), and `data/intake/status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion/promotion-input-custody.json` pins four (`control-manifest-v55.json`, one fixture, two notes). Both are held intake records (`data/intake/` is a held prefix); no step of `npm run check` reads them. Their builder `tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-nd-followup-one-cell-promotion.mjs` reads those four paths by literal path, is run by nothing in the gate or any workflow, and would now fail if run by hand.
- `data/reservoir/sources/retrospective-2026-10-12/raw-trails.json` and `tiered-trails.json` name `docs/preference-custody-laboratory-floor-v59.md` (trail [71], `on_main: partly`) and the acquisition request path (a row of trail [4], whose `where` is the kept `real-cases/` directory). The reservoir derivation records a contradiction only when every path of an `on_main: yes` or `on_main: no` trail disagrees with the tree, so `npm run validate:reservoir` is unaffected.
- `docs/README.md` ("Historical programmes") linked `docs/preference-custody-laboratory-floor.md`; the link now points here.
- `data/project/publication-allowlist.json` listed all 234 paths; they were removed on 2026-10-22 and now fall under the held `archive/` prefix rule.
