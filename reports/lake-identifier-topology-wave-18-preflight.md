# Identifier topology — Wave 18 preflight

```text
distinct machine identifiers:       15381
frozen union:                       10371
unindexed machine identifiers:      6661
source IDs without projection:      5612
divergent identifier projections:   3129
projection IDs without source:      0
unclassified source-only rows:       337
same-path projection variants:       1683
review required to decide:           false
graph effect:                        none
```

## Overlap classes

- divergent_projections: 2505
- source_without_projection: 1205
- unindexed: 1630
- unindexed+divergent_projections: 624
- unindexed+source_without_projection: 4407

## Source-only dispositions

- case_local_source_identifier_without_global_projection: 258
- domain_identifier_projection_candidate: 1731
- estate_identifier_projection_candidate: 20
- governance_or_fixture_identifier_source_only: 1835
- intake_source_identifier_not_yet_promoted: 686
- intentional_source_only_control_identifier: 745
- source_only_family_adjudication_required: 337

## Projection divergence classes

- cross_family_projection_views: 1284
- mixed_cross_family_and_intra_family_variants: 130
- same_path_projection_variants: 1683
- single_family_projection_variants: 32

## Top identifier keys

- claim_id: 948
- source_id: 709
- candidate_id: 629
- rejection_id: 515
- event_id: 470
- record_id: 411
- actor_id: 359
- receipt_id: 341
- subject_axm_entity_id: 298
- subject_id: 259
- local_subject_id: 229
- company_id: 196
- canonical_subject_id: 187
- route_id: 186
- exact_subject_observation_id: 160
- legacy_provisional_subject_axm_entity_id: 149
- participant_local_id: 149
- subject_local_id: 149
- lane_id: 138
- search_id: 128
- package_id: 121
- poll_id: 121
- source_mention_id: 106
- trail_id: 101
- proposition_id: 100
- canonical_family_id: 91
- mapping_id: 88
- join_id: 75
- metric_id: 73
- acquisition_id: 67
- entity_id: 67
- source_routing_id: 67
- object_id: 64
- rule_id: 64
- source_record_id: 64
- decision_id: 62
- adjudication_id: 57
- unresolved_subject_id: 57
- system_id: 55
- observation_id: 51

## Boundary

This census classifies identifier topology. It does not infer identity, evidence truth, publication clearance, or a graph relationship. Unindexed and source-only states may be intentional; divergent projections may be valid typed views. Each requires an explicit bounded disposition rather than automatic promotion or forced equality.
