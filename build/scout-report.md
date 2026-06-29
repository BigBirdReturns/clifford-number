# Scout Report

Generated: 2026-06-29T18:54:23.944Z

> graph_effect: none. This is a research queue, not graph data.

Findings: 18

## finding-001: Electric Twin behaves as a surface factory

- Type: surface_factory
- Priority: high
- graph_effect: none

**Observed**

Electric Twin appears across 5 surface(s): electric-twin-founder-2023, electric-twin-ethics-board-2026, electric-twin-funding-surface-2023-2026, electric-twin-newsuk-synthetic-audience, gartner-synthetic-population-category-2026. Secondary types: democratic_input_replacement, model_governance_surface, surface_factory_capital_layer.

**Required action**

Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.

Refs: `electric-twin-founder-2023`, `electric-twin-ethics-board-2026`, `electric-twin-funding-surface-2023-2026`, `electric-twin-newsuk-synthetic-audience`, `gartner-synthetic-population-category-2026`

---

## finding-002: Faculty / Faculty Science / ASI Data Science is marked as a surface factory but has not been decomposed yet

- Type: surface_factory
- Priority: medium
- graph_effect: none

**Observed**

Faculty / Faculty Science / ASI Data Science is a known factory candidate in canonical data, but no bounded surfaces have been added to the ledger yet.

**Required action**

Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.



---

## finding-003: Entrepreneur First is marked as a surface factory but has not been decomposed yet

- Type: surface_factory
- Priority: medium
- graph_effect: none

**Observed**

Entrepreneur First is a known factory candidate in canonical data, but no bounded surfaces have been added to the ledger yet.

**Required action**

Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.



---

## finding-004: Dialog behaves as a surface factory

- Type: surface_factory
- Priority: medium
- graph_effect: none

**Observed**

Dialog appears across 1 surface(s): dialog-society-membership. Secondary types: governance_continuity_surface.

**Required action**

Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.

Refs: `dialog-society-membership`

---

## finding-005: Dr. Ben Warner shows recurring surface logic

- Type: surface_type_recurrence
- Priority: high
- graph_effect: none

**Observed**

Dr. Ben Warner has 6 surfaces and secondary types democratic_input_replacement, model_governance_surface, public_private_ai_infrastructure. Governance replacement score: 3.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `no10-digital-data-advisory-2019-2021`, `faculty-investor-employee-2015-2019`, `vote-leave-data-science-2016`, `electric-twin-founder-2023`, `electric-twin-newsuk-synthetic-audience`, `gartner-synthetic-population-category-2026`

---

## finding-006: Alex Cooper shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Alex Cooper has 1 surfaces and secondary types democratic_input_replacement, model_governance_surface. Governance replacement score: 1.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `electric-twin-founder-2023`

---

## finding-007: Sir Simon Case / Lord Case shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Sir Simon Case / Lord Case has 3 surfaces and secondary types defence_industrial_surface, democratic_input_replacement, governance_continuity_surface, model_governance_surface. Governance replacement score: 1.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `electric-twin-ethics-board-2026`, `simon-case-cabinet-secretary-2020-2024`, `team-barrow-public-private-fund-2026`

---

## finding-008: Dominic Cummings shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Dominic Cummings has 2 surfaces and secondary types model_governance_surface. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `no10-digital-data-advisory-2019-2021`, `vote-leave-data-science-2016`

---

## finding-009: Sir Simon Case / Lord Case has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Sir Simon Case / Lord Case participates in 3 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-ethics-board-2026`, `simon-case-cabinet-secretary-2020-2024`, `team-barrow-public-private-fund-2026`

---

## finding-010: Louis Mosley has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Louis Mosley participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-funding-surface-2023-2026`

---

## finding-011: Marc Andreessen has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Marc Andreessen participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-funding-surface-2023-2026`

---

## finding-012: Cal Henderson has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Cal Henderson participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-funding-surface-2023-2026`

---

## finding-013: Tom Shinner has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Tom Shinner participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-funding-surface-2023-2026`

---

## finding-014: Simon Case Cabinet Secretary / Head of Civil Service surface, 2020-2024 contains broad institution context

- Type: broad_institution_guard
- Priority: high
- graph_effect: none

**Observed**

Broad venues present: Cabinet Office. This is acceptable only because hops are generated from actor co-participation, not from the broad institution itself.

**Required action**

Verify this surface is tightly named and bounded. If it is merely an office or agency, mark it hop_eligible=false.

Refs: `simon-case-cabinet-secretary-2020-2024`

---

## finding-015: Team Barrow public-private development fund surface contains broad institution context

- Type: broad_institution_guard
- Priority: high
- graph_effect: none

**Observed**

Broad venues present: UK Government. This is acceptable only because hops are generated from actor co-participation, not from the broad institution itself.

**Required action**

Verify this surface is tightly named and bounded. If it is merely an office or agency, mark it hop_eligible=false.

Refs: `team-barrow-public-private-fund-2026`

---

## finding-016: AI Opportunities Action Plan surface, 2025 contains broad institution context

- Type: broad_institution_guard
- Priority: high
- graph_effect: none

**Observed**

Broad venues present: Department for Science, Innovation and Technology (DSIT). This is acceptable only because hops are generated from actor co-participation, not from the broad institution itself.

**Required action**

Verify this surface is tightly named and bounded. If it is merely an office or agency, mark it hop_eligible=false.

Refs: `ai-opportunities-action-plan-2025`

---

## finding-017: Policy creation → procurement corridor → personnel continuity → commercial deployment is a scored laundering chain with no Clifford hop

- Type: laundering_chain
- Priority: high
- graph_effect: none

**Observed**

Chain spans 4/5 stage categories (policy_creation, procurement_capture, personnel_continuity, commercial_deployment); machine_score 0.52; weakest evidence judgment. It does not create a Clifford hop.

**Required action**

Strengthen the weakest stage receipts (e.g. confirm procurement award IDs/amounts/dates) before any UI weight upgrade. Never convert a chain into a hop without a bounded shared-participation surface.

Refs: `ai-opportunities-action-plan-2025`, `detachment-201-commissioning-2025`, `no10-digital-data-advisory-2019-2021`, `electric-twin-newsuk-synthetic-audience`

---

## finding-018: Full master doc has been classified, not blindly migrated

- Type: migration_queue
- Priority: high
- graph_effect: none

**Observed**

ingest-master classified 718 typed rows. Buckets: {"receipt_candidate":170,"surface_candidate":120,"context_only":236,"participation_claim":117,"actor_claim":63,"organization_claim":12}.

**Required action**

Review build/migration-review.md and promote rows into surfaces/participation ledgers only when boundedness is explicit.

Refs: `build/migration-review.md`

---

