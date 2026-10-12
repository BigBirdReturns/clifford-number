# Source: evidence-lake-identity

Evidence-lake indexing and AXM Genesis identity-resolution, waves 01-20: the basin index, ID migration, cross-case identity census, canonical registry growth and identifier topology.

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

## Origin

| Field | Value |
|---|---|
| Moved folder | `retrospective/2026-10-12/branches/lake-identity-waves-01-20/`, moved here with `git mv` on 2026-10-12; a one-line pointer file `MOVED.txt` is left at the old path |
| Content of the moved folder | 180 files (179 research files plus `NOT-COPIED-regenerable-and-tooling.txt`, which lists the tooling and regenerable products that were left on the branches). The 179 research files are byte-identical to the research files at the tip of `agent/lake-receipt-custody-wave-20` (`ec730441e4779b24226f12f556707f4a89b7fe3f`, 2026-07-31): 179 of 179 blobs match, checked against the bundle |
| Branches | 30 (see the table below); branch dates 2026-07-29 to 2026-07-31; 23 pull requests (#384 to #489), closed 2026-07-30 to 2026-08-11: 22 closed without merging (against a stacked branch); 1 closed without merging (against main) |
| Retrospective record | `retrospective/2026-10-12/branches/lake-branch-heads.tsv` (head of all 43 lake branches); `retrospective/2026-10-12/analyses/preservation.json` > `branches_unique[0]` (`unmerged_pr_branches_with_research`, `branch_only_at_risk`, `pr_less_but_anchored`) |
| Trail row | `retrospective/2026-10-12/trails/tiered-trails.json` entry [38] "Evidence lake, waves 1 to 20: identity and index layer" (tier B) |
| Object source for the intermediate waves | the all-refs git bundle on branch `archive/retrospective-2026-10-12` (reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`); every tip below was re-checked against origin with `git ls-remote` on 2026-10-12 and matched |
| Files in this folder | 394 files, 38,697,664 bytes (including `SOURCE.md` and `MANIFEST.tsv` files) |

## What the programme found (per trail row 38)

Indexed every evidence file in the repo (1,277 with an owner), migrated all 176 entities and 164 claims onto the AXM Genesis ID scheme with zero change to evidence or hops, ran a cross-case identity census (229 distinct mentions: 121 canonical, 104 names not yet in the registry), made 57 adjudications, grew the canonical registry to 161 actors and 65 organisations (main has 32 organisations), and adjudicated 25,994 machine identifiers into a 10,612-record topology. Bulk-closed 11 Aug 2026; only the ID scheme reached main (PR #2604). The 33 organisations only on the branch include Founders Fund, Detachment 201, Anduril PAC, SpaceX, Saudi PIF, the Federalist Society and HM Treasury.

`agent/tmp-wave16-run-monitor`, `agent/tmp-wave17-*` and `agent/tmp-wave18-*` are PR-less temporary validation and monitor branches (branch-only, or anchored only by another branch's pull head). They carry the lake tree as it stood at waves 16-18, plus an old `cases/uk-ai-policy/` tree (`preservation.json` note), and are grouped with the lake chain here.

## Branches and intermediate waves

Each folder under `intermediate-waves/` holds the research files of one branch (or of several branches with byte-identical content) that differ from main **and** are not already in the moved export, i.e. a wave's own earlier versions of registries, reports and manifests that later waves overwrote. Files identical to something already archived are listed in that folder's `MANIFEST.tsv` with a pointer, not copied twice.

| Folder | Branch tip | Date | Pull requests | Research files vs main | Stored here |
|---|---|---|---|---:|---:|
| [`intermediate-waves/agent/lake-axm-active-projection-wave-06`](intermediate-waves/agent/lake-axm-active-projection-wave-06/SOURCE.md) | `8176bb688e` | 2026-07-29 | #396 closed | 43 | 12 |
| [`intermediate-waves/agent/lake-axm-cross-case-acceptance-wave-07`](intermediate-waves/agent/lake-axm-cross-case-acceptance-wave-07/SOURCE.md) | `ae667f629b` | 2026-07-29 | #397 closed | 49 | 5 |
| [`intermediate-waves/agent/lake-axm-lineage-wave-04`](intermediate-waves/agent/lake-axm-lineage-wave-04/SOURCE.md) | `84e85412b1` | 2026-07-29 | #393 closed | 32 | 5 |
| [`intermediate-waves/agent/lake-axm-reproducibility-wave-05`](intermediate-waves/agent/lake-axm-reproducibility-wave-05/SOURCE.md) | `2a280a5be9` | 2026-07-29 | #395 closed | 38 | 5 |
| [`intermediate-waves/agent/lake-basin-execution-wave-01`](intermediate-waves/agent/lake-basin-execution-wave-01/SOURCE.md) | `ce1b2d8207` | 2026-07-29 | #389 closed | 12 | 5 |
| [`intermediate-waves/agent/lake-bounded-hold-resolution-wave-12`](intermediate-waves/agent/lake-bounded-hold-resolution-wave-12/SOURCE.md) | `85f1a62516` | 2026-07-29 | #407 closed | 86 | 7 |
| [`intermediate-waves/agent/lake-canonical-adjudication-wave-11`](intermediate-waves/agent/lake-canonical-adjudication-wave-11/SOURCE.md) | `74375f8016` | 2026-07-29 | #401 closed | 77 | 9 |
| [`intermediate-waves/agent/lake-canonical-identity-census-wave-09`](intermediate-waves/agent/lake-canonical-identity-census-wave-09/SOURCE.md) | `28e4152e4a` | 2026-07-29 | #399 closed | 59 | 5 |
| [`intermediate-waves/agent/lake-canonical-subject-projection-wave-13`](intermediate-waves/agent/lake-canonical-subject-projection-wave-13/SOURCE.md) | `f8ccabd9e4` | 2026-07-29 | #408 closed | 89 | 7 |
| [`intermediate-waves/agent/lake-cross-case-mention-denominator-wave-09`](intermediate-waves/agent/lake-cross-case-mention-denominator-wave-09/SOURCE.md) | `5cf0697fe7` | 2026-07-29 | #404 closed | 56 | 12 |
| [`intermediate-waves/agent/lake-cross-case-production-denominator-wave-08`](intermediate-waves/agent/lake-cross-case-production-denominator-wave-08/SOURCE.md) | `da2db731ba` | 2026-07-29 | #403 closed | 55 | 0 |
| [`intermediate-waves/agent/lake-exact-canonical-subject-wave-14`](intermediate-waves/agent/lake-exact-canonical-subject-wave-14/SOURCE.md) | `a388924766` | 2026-07-29 | #409 closed | 94 | 7 |
| [`intermediate-waves/agent/lake-identifier-repair-wave-02`](intermediate-waves/agent/lake-identifier-repair-wave-02/SOURCE.md) | `a42edb984f` | 2026-07-29 | #391 closed | 17 | 5 |
| [`intermediate-waves/agent/lake-index-census`](intermediate-waves/agent/lake-index-census/SOURCE.md) | `2246c8f110` | 2026-07-29 | #384 closed | 7 | 6 |
| [`intermediate-waves/agent/lake-native-source-migration-wave-03`](intermediate-waves/agent/lake-native-source-migration-wave-03/SOURCE.md) | `82d2f5c966` | 2026-07-29 | #392 closed | 27 | 5 |
| [`intermediate-waves/agent/lake-production-cross-case-census-wave-08`](intermediate-waves/agent/lake-production-cross-case-census-wave-08/SOURCE.md) | `37b93242e2` | 2026-07-29 | #398 closed | 54 | 5 |
| [`intermediate-waves/agent/lake-subject-integration-wave-16`](intermediate-waves/agent/lake-subject-integration-wave-16/SOURCE.md) | `d5f74134d4` | 2026-07-29 | #435 closed | 106 | 7 |
| [`intermediate-waves/agent/lake-subject-ontology-routing-wave-10`](intermediate-waves/agent/lake-subject-ontology-routing-wave-10/SOURCE.md) | `76cd517676` | 2026-07-29 | #400 closed | 66 | 5 |
| [`intermediate-waves/agent/lake-unresolved-subject-adjudication-wave-15`](intermediate-waves/agent/lake-unresolved-subject-adjudication-wave-15/SOURCE.md) | `dd089e22bd` | 2026-07-29 | #420 closed | 99 | 6 |
| [`intermediate-waves/agent/tmp-wave17-gate-integration`](intermediate-waves/agent/tmp-wave17-gate-integration/SOURCE.md) | `96d3ff0867` | 2026-07-29 | none | 113 | 8 |
| [`intermediate-waves/agent/lake-generator-contracts-wave-19`](intermediate-waves/agent/lake-generator-contracts-wave-19/SOURCE.md) | `89d1c8038f` | 2026-07-30 | #482 closed | 126 | 10 |
| [`intermediate-waves/agent/lake-identifier-topology-wave-18`](intermediate-waves/agent/lake-identifier-topology-wave-18/SOURCE.md) | `059bd8248e` | 2026-07-30 | #477 closed | 120 | 8 |
| [`intermediate-waves/agent/lake-residual-frontier-wave-17`](intermediate-waves/agent/lake-residual-frontier-wave-17/SOURCE.md) | `ee5d35a8f7` | 2026-07-30 | #458 closed | 113 | 5 |
| [`intermediate-waves/agent/tmp-wave16-run-monitor`](intermediate-waves/agent/tmp-wave16-run-monitor/SOURCE.md) | `a9c293e9c5` | 2026-07-30 | none | 102 | 3 |
| [`intermediate-waves/agent/tmp-wave17-exact-validation`](intermediate-waves/agent/tmp-wave17-exact-validation/SOURCE.md) | `1847b1dba6` | 2026-07-30 | none | 114 | 1 |
| [`intermediate-waves/agent/tmp-wave17-run-monitor`](intermediate-waves/agent/tmp-wave17-run-monitor/SOURCE.md) | `927e152ccb` | 2026-07-30 | none | 110 | 3 |
| [`intermediate-waves/agent/tmp-wave18-exact-head-validation`](intermediate-waves/agent/tmp-wave18-exact-head-validation/SOURCE.md) (same content as `agent/lake-identifier-topology-wave-18`) | `059bd8248e` | 2026-07-30 | none | 120 | 0 |
| [`intermediate-waves/agent/tmp-wave18-exact-run-monitor`](intermediate-waves/agent/tmp-wave18-exact-run-monitor/SOURCE.md) (same content as `agent/lake-identifier-topology-wave-18`) | `059bd8248e` | 2026-07-30 | none | 120 | 0 |
| [`intermediate-waves/agent/tmp-wave18-run-monitor`](intermediate-waves/agent/tmp-wave18-run-monitor/SOURCE.md) (same content as `agent/lake-identifier-topology-wave-18`) | `059bd8248e` | 2026-07-30 | none | 120 | 0 |
| [`intermediate-waves/agent/lake-receipt-custody-wave-20`](intermediate-waves/agent/lake-receipt-custody-wave-20/SOURCE.md) | `ec730441e4` | 2026-07-31 | #489 closed | 139 | 0 |
