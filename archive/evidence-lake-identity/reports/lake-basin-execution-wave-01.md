# Evidence Lake Basin Execution Wave 01

Source fingerprint: `cae5c917b4de607e8f275382432aadb8016ae5d8bec9ff5a2b592d314ef4c8a9`

## Decision

The current census contains enough information to execute bounded indexing and custody decisions. This wave does not wait for an unspecified reviewer. It creates the missing core-thesis entrypoint, dispositions every current unclassified path, classifies every case ID, dispositions every observed open PR, and converts all identifier gaps into an ordered repair queue.

```text
core-thesis products indexed:          184
unclassified paths dispositioned:      62
identifier gap rows queued:             22024
identifier repair groups:               600
case IDs classified:                    27
non-public case IDs classified:         23
open PRs dispositioned:                 16
branch-only paths dispositioned:        131
decisions requiring human permission:  0
```

## Work order

| Priority | Workstream | Evidence count | State | Action |
|---:|---|---:|---|---|
| 1 | core_thesis_entrypoint | 184 | executed_in_wave_01 | build/core-thesis/index.json |
| 2 | unclassified_path_disposition | 62 | executed_in_wave_01 | apply_the_disposition_ledger_to_the_basin_registry_and_regenerate_the_census |
| 3 | identifier_projection_integrity | 22024 | queued_by_identifier_family | execute_identifier_repair_groups_in_priority_order |
| 4 | case_catalog_disposition | 23 | executed_in_wave_01 | attach_each_case_to_its_declared_internal_or_public_entrypoint |
| 5 | branch_shadow_disposition | 131 | executed_in_wave_01 | apply_the_per_PR_dispositions_and_preserve_unique_receipted_rows |
| 6 | public_reachability_after_release_integrity | 55 | blocked_by_material_publication_safety_dependency | stack_after_PR_382_and_recompute_public_reachability_against_the_status_aware_allowlist |

## Identifier repair frontier

| Priority | Gap class | ID key | Path cluster | Rows | Action |
|---:|---|---|---|---:|---|
| 1 | projection_id_without_source | claim_id | build/migrated-claims.jsonl | 718 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | object_id | build/core-thesis | 408 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | trail_id | build/estate-game-trails | 273 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | id | build/estate-game-trails | 254 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | claim_id | build/cases | 224 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | event_id | build/cases | 224 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | axm_entity_id | build/axm-identity.json | 176 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | local_id | build/axm-identity.json | 176 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | subject_id | build/cases | 170 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | claim_id | build/axm-identity.json | 164 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | participant_id | build/receipt-graph.json | 149 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | subj_local_id | build/axm-identity.json | 149 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | task_id | build/estate-closures | 143 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | id | build/scout-report.json | 141 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | explicit_mapping_id | build/core-thesis | 112 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | issue_id | build/core-thesis | 61 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | target_estate_id | build/estate-game-trails | 24 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | origin_estate_id | build/estate-game-trails | 19 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | candidate_handoff_task_id | build/estate-closures | 14 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | obj_local_id | build/axm-identity.json | 14 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | from_estate_id | estates | 12 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | receipt_id | build/cases | 12 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | to_estate_id | estates | 11 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | canonical_id | build/surface-graph.json | 10 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |
| 1 | projection_id_without_source | organization_id | build/scores.json | 9 | identify_or_create_the_source_object_or_downgrade_the_projection_to_unresolved |

## Disposition counts

### Unclassified paths

```json
{
  "residual-explicit-disposition": 51,
  "comprehension-protocol": 8,
  "contribution-pipeline": 1,
  "repository-config": 1,
  "root-legacy-artifact": 1
}
```

### Case IDs

```json
{
  "public_case": 4,
  "thesis_subcase_not_public_case": 16,
  "internal_benchmark_or_control": 5,
  "internal_case_packet": 2
}
```

### Open PRs

```json
{
  "salvage_method_and_fixtures_then_close": 1,
  "salvage_program_sources_then_close": 1,
  "abandon_temporary_transport_and_close": 1,
  "salvage_mapping_rows_then_close": 1,
  "salvage_unique_evidence_then_close": 1,
  "superseded_by_merged_source_ecology_repair": 1,
  "active_separate_research_program": 1,
  "abandon_broken_transport_preserve_requirements": 1,
  "archive_terminal_audit_and_close": 2,
  "active_publication_followup": 1,
  "active_release_integrity_dependency": 1,
  "active_lake_index_parent": 1,
  "active_judgment_authority_dependency": 1,
  "freeze_diff_salvage_unique_rows_then_close_or_rebase": 2
}
```

## Material dependency

The 55 public-reachability conflicts are not waiting for a reviewer. They are held by a concrete publication-safety defect: current main recursively copies broad source trees. Recompute those rows after PR #382 installs the status-aware publication allowlist.

## Boundary

These are indexing, custody, and work-allocation judgments. They do not determine evidence truth, publication clearance, guilt, motive, coordination, common purpose, or graph edges. Every disposition is append-preserving and replaceable when the source corpus changes.
