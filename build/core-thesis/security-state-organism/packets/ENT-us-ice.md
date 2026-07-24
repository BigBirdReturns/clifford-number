# U.S. Immigration and Customs Enforcement evidence lane

- Package: `ENT-us-ice`
- Class: `entity`
- Priority: `wave_1_operational`
- Routing: `source_explicit_candidate`
- Synthetic assignment: `false`

## Priority basis

The candidate sits on a named operational, public-gate, transfer, or counterpower seam.

## Proof question

What exact legal, financial, technical, personnel, public-gate, deployment, consequence, and residual-rights records establish or falsify U.S. Immigration and Customs Enforcement's proposed organ functions?

## Explicit targets

- Estate: `ai-data-compute-infrastructure-estate` — Ai Data Compute Infrastructure Estate
- Estate: `judicial-administrative-adjudication-estate` — Judicial Administrative Adjudication Estate
- Estate: `labor-immigration-workforce-mobility-estate` — Labor Immigration Workforce Mobility Estate
- Estate: `public-interest-crossing-estate` — Public Interest Crossing Estate
- Entity: `us-ice` — U.S. Immigration and Customs Enforcement
- Organ: `O11-public-gates` — Public gates and permanent institutions
- Organ: `O13-theater` — Deployment and proving grounds
- Organ: `O5-identity-data` — Identity, data, and ontology
- Organ: `O8-command` — Decision, command, and workflow
- Organ: `O9-effectors` — Effectors and enforcement
- Organism test: `T1-common-purpose` — Common purpose
- Organism test: `T2-differentiation` — Organ differentiation
- Organism test: `T3-metabolism` — Resource metabolism
- Organism test: `T4-coordination` — Coordination and integration
- Organism test: `T5-reproduction` — Institutional reproduction
- Organism test: `T6-feedback` — Feedback and adaptation
- Organism test: `T7-membrane` — Strategic invisibility and accountability membrane
- Organism test: `T8-coercion-extraction` — Coercive governance and extraction

## Required records

- data sources, identity joins, investigative and removal workflows, detention and consequence records, human review, error, appeal, and vendor exit
- complete denominator, date window, nulls, ordinary comparators, and contradictory paths

## Required outputs

- evidence matrix
- open and contradicted joins
- human-review disposition

## Source routes

- `US-COURTS` — US COURTS · `candidate_system_locator` · https://www.uscourts.gov/court-records
- `US-DHS-FOIA` — US DHS FOIA · `candidate_system_locator` · https://www.dhs.gov/foia
- `US-GAO` — US GAO · `candidate_system_locator` · https://www.gao.gov/
- `US-ICE-PROCUREMENT` — US ICE PROCUREMENT · `candidate_system_locator` · https://www.ice.gov/procurement
- `US-SAM-FPDS` — US SAM FPDS · `candidate_system_locator` · https://sam.gov/
- `US-USA-SPENDING` — US USA SPENDING · `candidate_system_locator` · https://www.usaspending.gov/

## Source-bounded evidence intake

- No evidence record is attached.

## Falsifier

A vendor contract proves a specific arrest, removal, or civil-rights violation. The proposed function or link remains unproved unless the required records independently close it.

## Allowed terminal states

- `supported_for_human_review`
- `retained_candidate_only`
- `bounded_non_link`
- `falsified`
- `identity_ambiguous`
- `temporal_order_unresolved`
- `source_restricted`
- `source_unavailable`
- `requires_additional_acquisition`

```text
promotes_to: candidate_only
graph_effect: none
conclusion_generated: false
estate_completion_claimed: false
synthetic_assignment: false
```
