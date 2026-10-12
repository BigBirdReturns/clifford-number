---
number: 42
kind: issue
title: "Research fan-out: Government, classified, and defence deployment"
state: closed (not_planned)
author: BigBirdReturns
created_at: 2026-07-19T15:31:16Z
closed_at: 2026-08-11T18:44:15Z
url: https://github.com/BigBirdReturns/clifford-number/issues/42
comments: 1
body_sha256: bdff19dd7a27f4c7896388aea25dc0910421fe3598c86bdbfe5b2195f67d46b9
retrospective_source: retrospective/2026-10-12/github/issues-full.jsonl (issue object), issue-bodies.jsonl (lean copy, identical body), issue-comments-full.jsonl (comments)
---

# #42: Research fan-out: Government, classified, and defence deployment

## Body (verbatim)

<!-- BEGIN BODY #42 bytes=3106 sha256=bdff19dd7a27f4c7896388aea25dc0910421fe3598c86bdbfe5b2195f67d46b9 -->
## Research-batch contract

- `batch_id`: `deployment/government-classified-defence`
- `parent_program`: #30
- `selection_lane`: `ai-policy-public-private-topology`
- `classification`: public procurement, supplier, and sensitive-environment deployment case
- `graph_effect`: `none`
- `verification_status`: `machine_proposed_unverified`
- `publication_status`: `blocked_pending_receipts_and_human_review`

## Case object

**Public-interest question:** Which synthetic-population vendors are listed, procured, funded, piloted, subcontracted, or deployed by governments, defence organisations, intelligence-adjacent bodies, emergency services, or classified environments?

**Selection unit:** one supplier listing, framework lot, opportunity, bid, award, subcontract, grant, pilot, official case study, security claim, department disclosure, or classified-environment capability statement.

**Selection universe:** the complete vendor cohort searched across declared official procurement, grants, supplier-framework, spending, innovation, and company-record sources in each claimed jurisdiction.

## Task packet

1. Build identity bundles for each vendor: legal and former names, company numbers, trading names, products, founders, resellers, parent entities, and known subcontractors.
2. Run source-complete searches across Contracts Finder, Find a Tender, Digital Marketplace, departmental spending, grants, defence innovation, and equivalent foreign systems.
3. Separate supplier listing, bid, award, subcontract, pilot, grant, deployment, and claimed classified readiness.
4. Resolve buyer, contract value, dates, amendments, framework mechanics, data classification, security accreditation, and product scope where public.
5. Search prime contractors and resellers so a vendor is not missed merely because it is a subcontractor.
6. Compare vendors with positive, negative, unavailable, credential-blocked, and unresolved source coverage.

## Source families

- official procurement and spending APIs
- government supplier frameworks
- defence innovation and grant portals
- company filings and security certifications
- official customer and vendor statements

## Predicate and inference boundary

**Allowed predicates:** `listed_as_supplier`, `bid_for`, `awarded_contract`, `subcontractor_to`, `received_grant`, `piloted_by`, `designed_for_classified_environment`.

**Forbidden inferences:** classified readiness proves classified customer; supplier listing proves award; former official proves procurement access; zero web result proves no government work; contract proves policy influence.

Source failures and search limitations must travel with every null. Exact-name search alone is inadmissible where bulk data, resellers, or subcontracting can conceal the legal counterparty.

## Acceptance

A reproducible jurisdiction-by-vendor query matrix and award ledger with source-bounded nulls, identity resolution, subcontractor coverage, and no inference beyond the official record.

Promotion requires human review and all repository gates. Until then, every observation remains `graph_effect: none`.
<!-- END BODY #42 -->

## Comments (1)

### Comment 1 of 1: BigBirdReturns, 2026-07-19T16:12:43Z (id 5016431849)

https://github.com/BigBirdReturns/clifford-number/issues/42#issuecomment-5016431849 . updated 2026-07-19T16:12:43Z . author_association OWNER . body sha256 `48ad53605784d9a546af15e26f881802ffe34e1951da850689c38c4e55927582`

<!-- BEGIN COMMENT 5016431849 bytes=2828 sha256=48ad53605784d9a546af15e26f881802ffe34e1951da850689c38c4e55927582 -->
## First-pass findings receipt — official programme selection found; award/deployment not proved

Parent: #30  
Captured: 2026-07-19  
State: `graph_effect: none`; preliminary, not promotion evidence.

### 1. Smallest real official-record path exercised

I queried an official defence-innovation cohort, a UK corporate register, and a UK government transparency disclosure before considering vendor narratives.

- NATO DIANA's official 2026 cohort page lists **CulturePulse** under **Data Assisted Decision Making**, describes “psychologically realistic digital twins for operational foresight,” and assigns country **Slovakia**: https://www.diana.nato.int/about-diana/2026-cohort-of-companies.html
- Companies House identifies **ELECTRIC TWIN LTD**, company number **15173006**: https://find-and-update.company-information.service.gov.uk/company/15173006
- A Cabinet Office senior-officials disclosure records a **2025-04-02** meeting with Electric Twin to discuss the “potential of working together on AI capability”: https://www.gov.uk/csv-preview/6967884606fabb02127034c8/Cabinet_Office_Senior_Officials_Meetings_-April_to_June_2025.csv
- Electric Twin's FAQ says its system was designed to operate in classified environments for government clients: https://www.electrictwin.com/faq

### 2. Exact observed states

| Vendor | Record | State that is supported | State that is not supported |
|---|---|---|---|
| CulturePulse | official NATO DIANA cohort | selected programme participant; defence-innovation discovery lead | supplier listing, award, paid pilot, deployment, clearance |
| Electric Twin Ltd | Companies House | legal-name/company-number anchor | buyer or contract |
| Electric Twin | Cabinet Office meeting disclosure | meeting / market-engagement lead | procurement, pilot, award, policy influence |
| Electric Twin | vendor FAQ | `designed_for_classified_environment` claim | classified customer or classified deployment |

NATO cohort membership is not being converted into `awarded_contract` or `piloted_by`. The Cabinet Office meeting is not an award. The classified-readiness statement is a first-party capability claim, not customer evidence.

### 3. Nearest boundary

The next pass must use the resolved identities in official procurement/award systems and recover DIANA's programme mechanics: whether cohort selection carries grant funding, testing access, paid pilots, or no award at all. Prime/reseller/subcontractor searches remain required. Public values, dates, amendments, security accreditation, and product scope are not yet recovered.

### 4. Rerun status

The official paths reproduce a programme-selection record, a legal entity, and a government meeting. They do not reproduce an award ledger. Acceptance remains open and all nulls remain limited to the sources actually exercised.
<!-- END COMMENT 5016431849 -->

