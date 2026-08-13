# Scout Report

Generated: 2026-08-13T05:09:42.604Z

> graph_effect: none. This is a research queue, not graph data.

Findings: 148

## finding-001: Electric Twin behaves as a surface factory

- Type: surface_factory
- Priority: high
- graph_effect: none

**Observed**

Electric Twin appears across 13 surface(s): electric-twin-incorporation-2023-09-28, electric-twin-ben-warner-director-tenure-2023-09-28, electric-twin-alex-cooper-director-tenure-2023-09-28, electric-twin-ethics-board-2026, electric-twin-seed-round-2026-02-11, electric-twin-seed-round-institutional-investors-2026-02-11, electric-twin-ben-blume-director-appointment-2025-09-12, electric-twin-seed2-governance-instrument-2025-09-12, electric-twin-seed2-capital-actions-2025-09-16-2025-09-26, electric-twin-newsuk-synthetic-audience, gartner-synthetic-population-category-2026, electric-twin-muthukrishna-science-adviser-observations-2024-2026, electric-twin-accuracy-methodology-publication-2026-02-11. Secondary types: category_formation_surface, democratic_input_replacement, model_governance_surface, surface_factory_capital_layer.

**Required action**

Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.

Refs: `electric-twin-incorporation-2023-09-28`, `electric-twin-ben-warner-director-tenure-2023-09-28`, `electric-twin-alex-cooper-director-tenure-2023-09-28`, `electric-twin-ethics-board-2026`, `electric-twin-seed-round-2026-02-11`, `electric-twin-seed-round-institutional-investors-2026-02-11`, `electric-twin-ben-blume-director-appointment-2025-09-12`, `electric-twin-seed2-governance-instrument-2025-09-12`, `electric-twin-seed2-capital-actions-2025-09-16-2025-09-26`, `electric-twin-newsuk-synthetic-audience`, `gartner-synthetic-population-category-2026`, `electric-twin-muthukrishna-science-adviser-observations-2024-2026`, `electric-twin-accuracy-methodology-publication-2026-02-11`

---

## finding-002: Faculty / Faculty Science / ASI Data Science behaves as a surface factory

- Type: surface_factory
- Priority: medium
- graph_effect: none

**Observed**

Faculty / Faculty Science / ASI Data Science appears across 2 surface(s): faculty-science-officer-employee-overlap-2018-01-24, faculty-science-director-shareholder-overlap-2024-10-10. Secondary types: public_private_ai_infrastructure.

**Required action**

Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.

Refs: `faculty-science-officer-employee-overlap-2018-01-24`, `faculty-science-director-shareholder-overlap-2024-10-10`

---

## finding-003: Department for Science, Innovation and Technology (DSIT) behaves as a surface factory

- Type: surface_factory
- Priority: medium
- graph_effect: none

**Observed**

Department for Science, Innovation and Technology (DSIT) appears across 5 surface(s): ai-opportunities-action-plan-development-2024-2025, ai-opportunities-action-plan-2025, ai-safety-summit-representative-appointment-2023-08-10, dsit-techuk-anduril-ai-safety-roundtable-2023-10-17, dsit-matt-clifford-ai-investor-roundtable-2023-10-25. Secondary types: governance_continuity_surface, government_advisory_surface, policy_to_procurement_surface.

**Required action**

Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.

Refs: `ai-opportunities-action-plan-development-2024-2025`, `ai-opportunities-action-plan-2025`, `ai-safety-summit-representative-appointment-2023-08-10`, `dsit-techuk-anduril-ai-safety-roundtable-2023-10-17`, `dsit-matt-clifford-ai-investor-roundtable-2023-10-25`

---

## finding-004: Entrepreneur First is marked as a surface factory but has not been decomposed yet

- Type: surface_factory
- Priority: medium
- graph_effect: none

**Observed**

Entrepreneur First is a known factory candidate in canonical data, but no bounded surfaces have been added to the ledger yet.

**Required action**

Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.



---

## finding-005: Dialog behaves as a surface factory

- Type: surface_factory
- Priority: medium
- graph_effect: none

**Observed**

Dialog appears across 1 surface(s): dialog-public-directory-exposure-2026-06-16. Secondary types: governance_continuity_surface.

**Required action**

Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-006: Ministry of Defence (MoD) behaves as a surface factory

- Type: surface_factory
- Priority: medium
- graph_effect: none

**Observed**

Ministry of Defence (MoD) appears across 3 surface(s): strategic-defence-review-development-2024-2025, strategic-defence-review-2024-2025, anduril-talos-phase-3-contract-observation-2023-11-02. Secondary types: defence_industrial_surface, government_advisory_surface, policy_to_procurement_surface.

**Required action**

Review whether each surface is correctly bounded. Add missing customer, investor, board, filing, deployment, and procurement surfaces as separate rows rather than broad organization edges.

Refs: `strategic-defence-review-development-2024-2025`, `strategic-defence-review-2024-2025`, `anduril-talos-phase-3-contract-observation-2023-11-02`

---

## finding-007: Matt Clifford shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Matt Clifford has 7 surfaces and secondary types governance_continuity_surface, government_advisory_surface, policy_to_procurement_surface, public_private_ai_infrastructure. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `faculty-science-director-shareholder-overlap-2024-10-10`, `ai-opportunities-action-plan-development-2024-2025`, `ai-opportunities-action-plan-2025`, `dialog-public-directory-exposure-2026-06-16`, `dialog-matt-clifford-invitation-nonattendance-2026-06-16`, `ai-safety-summit-representative-appointment-2023-08-10`, `dsit-matt-clifford-ai-investor-roundtable-2023-10-25`

---

## finding-008: Dr. Ben Warner shows recurring surface logic

- Type: surface_type_recurrence
- Priority: high
- graph_effect: none

**Observed**

Dr. Ben Warner has 7 surfaces and secondary types category_formation_surface, model_governance_surface, public_private_ai_infrastructure, surface_factory_capital_layer. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `ben-warner-no10-digital-data-role-observation-2020-2021`, `faculty-science-officer-employee-overlap-2018-01-24`, `electric-twin-incorporation-2023-09-28`, `electric-twin-ben-warner-director-tenure-2023-09-28`, `electric-twin-seed2-governance-instrument-2025-09-12`, `centre-human-progress-director-appointments-2025-08-05`, `electric-twin-accuracy-methodology-publication-2026-02-11`

---

## finding-009: Dr. Marc Warner shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Dr. Marc Warner has 2 surfaces and secondary types public_private_ai_infrastructure. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `faculty-science-officer-employee-overlap-2018-01-24`, `faculty-science-director-shareholder-overlap-2024-10-10`

---

## finding-010: Alex Cooper shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Alex Cooper has 3 surfaces and secondary types model_governance_surface, surface_factory_capital_layer. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `electric-twin-incorporation-2023-09-28`, `electric-twin-alex-cooper-director-tenure-2023-09-28`, `electric-twin-seed2-governance-instrument-2025-09-12`

---

## finding-011: Sir Simon Case / Lord Case shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Sir Simon Case / Lord Case has 3 surfaces and secondary types defence_industrial_surface, democratic_input_replacement, governance_continuity_surface, model_governance_surface. Governance replacement score: 1.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `electric-twin-ethics-board-2026`, `simon-case-cabinet-secretary-2020-2024`, `team-barrow-public-private-fund-2026`

---

## finding-012: Saul Klein shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Saul Klein has 2 surfaces and secondary types public_private_ai_infrastructure. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `faculty-science-officer-employee-overlap-2018-01-24`, `faculty-science-director-shareholder-overlap-2024-10-10`

---

## finding-013: John Healey shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

John Healey has 2 surfaces and secondary types defence_industrial_surface, government_advisory_surface. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `strategic-defence-review-development-2024-2025`, `strategic-defence-review-2024-2025`

---

## finding-014: George Robertson shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

George Robertson has 2 surfaces and secondary types defence_industrial_surface, government_advisory_surface. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `strategic-defence-review-development-2024-2025`, `strategic-defence-review-2024-2025`

---

## finding-015: Richard Barrons shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Richard Barrons has 2 surfaces and secondary types defence_industrial_surface, government_advisory_surface. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `strategic-defence-review-development-2024-2025`, `strategic-defence-review-2024-2025`

---

## finding-016: Dr Fiona Hill shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Dr Fiona Hill has 2 surfaces and secondary types defence_industrial_surface, government_advisory_surface. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `strategic-defence-review-development-2024-2025`, `strategic-defence-review-2024-2025`

---

## finding-017: Dr. Michael Muthukrishna shows recurring surface logic

- Type: surface_type_recurrence
- Priority: medium
- graph_effect: none

**Observed**

Dr. Michael Muthukrishna has 2 surfaces and secondary types model_governance_surface. Governance replacement score: 0.

**Required action**

Check for additional venues where the same surface type recurs. Do not convert recurrence into a hop unless there is a bounded co-participation surface.

Refs: `centre-human-progress-director-appointments-2025-08-05`, `electric-twin-muthukrishna-science-adviser-observations-2024-2026`

---

## finding-018: Sir Simon Case / Lord Case has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Sir Simon Case / Lord Case participates in 3 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-ethics-board-2026`, `simon-case-cabinet-secretary-2020-2024`, `team-barrow-public-private-fund-2026`

---

## finding-019: Dominic Cummings has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Dominic Cummings participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `vote-leave-data-science-2016`

---

## finding-020: Louis Mosley has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Louis Mosley participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-seed-round-2026-02-11`

---

## finding-021: Marc Andreessen has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Marc Andreessen participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-seed-round-2026-02-11`

---

## finding-022: Cal Henderson has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Cal Henderson participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-seed-round-2026-02-11`

---

## finding-023: Tom Shinner has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Tom Shinner participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-seed-round-2026-02-11`

---

## finding-024: Peter Thiel has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Peter Thiel participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-leadership-role-observations-2026-06-16`

---

## finding-025: Auren Hoffman has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Auren Hoffman participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-leadership-role-observations-2026-06-16`

---

## finding-026: Raffi Grinberg has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Raffi Grinberg participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-leadership-role-observations-2026-06-16`

---

## finding-027: Joe Lonsdale has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Joe Lonsdale participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-028: Ted Cruz has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Ted Cruz participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-029: Jim Himes has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Jim Himes participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-030: Dan Driscoll has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Dan Driscoll participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-031: Alexus Grynkewich has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Alexus Grynkewich participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-032: Randy Kroszner has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Randy Kroszner participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-033: Scott Bessent has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Scott Bessent participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-034: Cory Booker has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Cory Booker participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-035: Elon Musk has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Elon Musk participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-036: Joseph Gordon-Levitt has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Joseph Gordon-Levitt participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-037: Sophia Bush has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Sophia Bush participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-038: Ezra Klein has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Ezra Klein participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-039: Jonathan Levin has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Jonathan Levin participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-040: Sam Harris has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Sam Harris participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-041: Bryan Johnson has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Bryan Johnson participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-042: Sarah Bond has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Sarah Bond participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-043: Scott Cook has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Scott Cook participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-044: Lisa Gevelber has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Lisa Gevelber participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-045: Shmuel Abramzon has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Shmuel Abramzon participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-046: Josh Brolin has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Josh Brolin participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-047: Reid Hoffman has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Reid Hoffman participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-048: Wes Moore has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Wes Moore participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-049: Jared Polis has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Jared Polis participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-050: Lisa Monaco has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Lisa Monaco participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-051: Robert Hur has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Robert Hur participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-052: Preet Bharara has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Preet Bharara participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-053: Rachel Brand has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Rachel Brand participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-054: Mitch Daniels has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Mitch Daniels participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-055: Julian Castro has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Julian Castro participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-056: Peggy Hamburg has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Peggy Hamburg participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-057: Reema Al-Saud has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Reema Al-Saud participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-058: Turki Al Faisal Al Saud has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Turki Al Faisal Al Saud participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-059: Sheikh Nawaf Saud Nasir Al-Sabah has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Sheikh Nawaf Saud Nasir Al-Sabah participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-060: Kaja Kallas has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Kaja Kallas participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-061: Tarō Kōno has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Tarō Kōno participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-062: Jens Spahn has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Jens Spahn participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-063: Tom Tugendhat has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Tom Tugendhat participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-064: Shahid Khaqan Abbasi has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Shahid Khaqan Abbasi participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-065: Ali Jehangir Siddiqui has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Ali Jehangir Siddiqui participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-066: Shivon Zilis has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Shivon Zilis participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-067: Stan McChrystal has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Stan McChrystal participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-068: Jonathan Ross has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Jonathan Ross participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-069: Pete Shadbolt has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Pete Shadbolt participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-070: Scott Stephenson has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Scott Stephenson participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-071: Barry Silbert has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Barry Silbert participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-072: Charlie Songhurst has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Charlie Songhurst participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-073: Tom Lue has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Tom Lue participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-074: Fatima Kardar has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Fatima Kardar participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-075: Neal Mohan has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Neal Mohan participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-076: Greg Brockman has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Greg Brockman participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-077: Jason Kwon has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Jason Kwon participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-078: Adam D'Angelo has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Adam D'Angelo participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-079: Manuel Bronstein has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Manuel Bronstein participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-080: Severin Hacker has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Severin Hacker participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-081: Wences Casares has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Wences Casares participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-082: Immad Akhund has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Immad Akhund participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-083: Henry Kravis has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Henry Kravis participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-084: Pete Briger has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Pete Briger participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-085: Peter Brown has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Peter Brown participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-086: Karen Karniol-Tambour has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Karen Karniol-Tambour participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-087: Mike Novogratz has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Mike Novogratz participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-088: Bob Jain has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Bob Jain participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-089: Gaurva Kapadia has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Gaurva Kapadia participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-090: Micky Malka has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Micky Malka participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-091: Chamath Palihapitiya has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Chamath Palihapitiya participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-092: Jared Kushner has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Jared Kushner participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-093: John Arnold has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

John Arnold participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-094: Robert Rubin has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Robert Rubin participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-095: Lawrence Summers has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Lawrence Summers participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-096: Eric Schmidt has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Eric Schmidt participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-097: Susan Athey has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Susan Athey participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-098: Steven Pinker has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Steven Pinker participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-099: Tyler Cowen has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Tyler Cowen participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-100: Adam Grant has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Adam Grant participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-101: Jonathan Haidt has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Jonathan Haidt participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-102: Anne-Marie Slaughter has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Anne-Marie Slaughter participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-103: Leonard Leo has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Leonard Leo participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-104: Grover Norquist has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Grover Norquist participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-105: Nick Thompson has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Nick Thompson participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-106: Bret Stephens has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Bret Stephens participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-107: Tim Ferriss has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Tim Ferriss participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-108: Mike Cannon-Brookes has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Mike Cannon-Brookes participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-109: Marcos Galperin has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Marcos Galperin participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-110: Demet Mutlu has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Demet Mutlu participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-111: Cesar Carvalho has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Cesar Carvalho participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-112: Howie Liu has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Howie Liu participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-113: Scott Belsky has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Scott Belsky participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-114: Steve Ells has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Steve Ells participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-115: Nicolas Berggruen has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Nicolas Berggruen participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-116: Matt Cohler has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Matt Cohler participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-117: Will Scharf has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Will Scharf participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-118: Mario Schlosser has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Mario Schlosser participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-119: Astro Teller has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Astro Teller participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-120: Strauss Zelnick has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Strauss Zelnick participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-121: Benj Pasek has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Benj Pasek participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-122: Drew Scott has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Drew Scott participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-123: Kim Scott has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Kim Scott participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-124: Rick Warren has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Rick Warren participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-125: Gretchen Rubin has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Gretchen Rubin participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-126: Charles Duhigg has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Charles Duhigg participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-127: Daniel Pink has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Daniel Pink participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-128: Tom Goldstein has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Tom Goldstein participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-129: Neal Katyal has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Neal Katyal participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-130: Garry Kasparov has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Garry Kasparov participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-131: Atul Gawande has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Atul Gawande participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-132: Bob Cialdini has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Bob Cialdini participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-133: John Townsend has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

John Townsend participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-134: Tim Urban has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Tim Urban participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-135: Thasunda Brown Duckett has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Thasunda Brown Duckett participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-136: Vas Narasimhan has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Vas Narasimhan participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-137: Elizabeth Blackburn has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Elizabeth Blackburn participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `dialog-public-directory-exposure-2026-06-16`

---

## finding-138: Eric Salama has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Eric Salama participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-seed-round-2026-02-11`

---

## finding-139: Ben Blume has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Ben Blume participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `electric-twin-ben-blume-director-appointment-2025-09-12`

---

## finding-140: Shyam Sankar has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Shyam Sankar participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `detachment-201-commissioning-2025`

---

## finding-141: Andrew “Boz” Bosworth has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Andrew “Boz” Bosworth participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `detachment-201-commissioning-2025`

---

## finding-142: Kevin Weil has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Kevin Weil participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `detachment-201-commissioning-2025`

---

## finding-143: Bob McGrew has surfaces but no Clifford path

- Type: island_with_surfaces
- Priority: medium
- graph_effect: none

**Observed**

Bob McGrew participates in 1 surface(s), but no valid shared-surface path to Matt Clifford exists.

**Required action**

Scout for bounded surfaces shared with actors already on the Clifford spine. Do not use broad institutions as bridges.

Refs: `detachment-201-commissioning-2025`

---

## finding-144: AI Opportunities Action Plan publication and government response, 13 January 2025 contains broad institution context

- Type: broad_institution_guard
- Priority: high
- graph_effect: none

**Observed**

Broad venues present: Department for Science, Innovation and Technology (DSIT). This is acceptable only because hops are generated from actor co-participation, not from the broad institution itself.

**Required action**

Verify this surface is tightly named and bounded. If it is merely an office or agency, mark it hop_eligible=false.

Refs: `ai-opportunities-action-plan-2025`

---

## finding-145: Detachment 201 inaugural four-officer commissioning, 13 June 2025 contains broad institution context

- Type: broad_institution_guard
- Priority: high
- graph_effect: none

**Observed**

Broad venues present: US Army (Detachment 201, Executive Innovation Corps). This is acceptable only because hops are generated from actor co-participation, not from the broad institution itself.

**Required action**

Verify this surface is tightly named and bounded. If it is merely an office or agency, mark it hop_eligible=false.

Refs: `detachment-201-commissioning-2025`

---

## finding-146: Strategic Defence Review terms and commission, 17 July 2024 contains broad institution context

- Type: broad_institution_guard
- Priority: high
- graph_effect: none

**Observed**

Broad venues present: Ministry of Defence (MoD). This is acceptable only because hops are generated from actor co-participation, not from the broad institution itself.

**Required action**

Verify this surface is tightly named and bounded. If it is merely an office or agency, mark it hop_eligible=false.

Refs: `strategic-defence-review-2024-2025`

---

## finding-147: Policy creation → military advisory integration → personnel continuity → commercial deployment is a scored laundering chain with no Clifford hop

- Type: laundering_chain
- Priority: high
- graph_effect: none

**Observed**

Chain spans 4/5 stage categories (policy_creation, military_advisory_integration, personnel_continuity, commercial_deployment); machine_score 0.35; weakest evidence primary_public. It does not create a Clifford hop.

**Required action**

Strengthen the weakest stage receipts (e.g. confirm procurement award IDs/amounts/dates) before any UI weight upgrade. Never convert a chain into a hop without a bounded shared-participation surface.

Refs: `ai-opportunities-action-plan-2025`, `detachment-201-program-context-2025`, `ben-warner-no10-digital-data-role-observation-2020-2021`, `electric-twin-newsuk-synthetic-audience`

---

## finding-148: Full master doc has been classified, not blindly migrated

- Type: migration_queue
- Priority: high
- graph_effect: none

**Observed**

ingest-master classified 718 typed rows. Buckets: {"receipt_candidate":170,"surface_candidate":120,"context_only":236,"participation_claim":117,"actor_claim":63,"organization_claim":12}.

**Required action**

Review build/migration-review.md and promote rows into surfaces/participation ledgers only when boundedness is explicit.

Refs: `build/migration-review.md`

---

