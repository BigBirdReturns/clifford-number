---
number: 37
kind: issue
title: "Research fan-out: Former-official AI advisory portfolios and post-office controls"
state: closed (not_planned)
author: BigBirdReturns
created_at: 2026-07-19T15:29:01Z
closed_at: 2026-08-11T18:43:24Z
url: https://github.com/BigBirdReturns/clifford-number/issues/37
comments: 1
body_sha256: 7bf8f3d38f31ee7653ed58aa9b8cbd1102fdf476fc80176e2de233178ab4a255
retrospective_source: retrospective/2026-10-12/github/issues-full.jsonl (issue object), issue-bodies.jsonl (lean copy, identical body), issue-comments-full.jsonl (comments)
---

# #37: Research fan-out: Former-official AI advisory portfolios and post-office controls

## Body (verbatim)

<!-- BEGIN BODY #37 bytes=3295 sha256=7bf8f3d38f31ee7653ed58aa9b8cbd1102fdf476fc80176e2de233178ab4a255 -->
## Research-batch contract

- `batch_id`: `legitimacy/former-official-advisory-portfolios`
- `parent_program`: #30
- `selection_lane`: `ai-policy-public-private-topology`
- `classification`: post-public-service portfolio and regulatory-control cohort case
- `graph_effect`: `none`
- `verification_status`: `machine_proposed_unverified`
- `publication_status`: `blocked_pending_receipts_and_human_review`

## Case object

**Public-interest question:** How do former senior officials assemble portfolios of AI, technology, consulting, investment, ethics, and public-private roles, and how effectively do business-appointment controls describe, limit, monitor, and enforce those roles?

**Selection unit:** one former senior official, approved or disclosed appointment, client or employer, restriction, recusal, lobbying contact, bid participation, board role, compensation state, enforcement event, or expiry date.

**Selection universe:** all former Cabinet Secretaries, permanent secretaries, senior No. 10 officials, and other declared comparator offices leaving within a frozen period, not only Simon Case or AI-linked appointees.

The cohort is defined by prior office before any destination is queried. Appointment approval, restriction, subsequent activity, enforcement, and clean compliance controls remain separate objects.

## Task packet

1. Freeze the office-defined cohort before querying destinations.
2. Collect every ACOBA, Civil Service Commission, departmental, parliamentary, company, and employer record for post-office appointments.
3. Normalize role type, compensation, time commitment, client sector, government-facing remit, restrictions, duration, declared prior dealings, and regulator rationale.
4. Search lobbying, procurement, public appointments, grants, meetings, and policy submissions during restriction windows using explicit identity and date gates.
5. Compare AI and technology roles with finance, defence, health, consulting, and nonprofit destinations.
6. Record enforcement, clarification, amendment, expiry, or absence of monitoring without assuming compliance or breach.

## Source families

- ACOBA and Civil Service Commission decisions
- GOV.UK transparency and meeting records
- Companies House and employer disclosures
- lobbying and procurement records
- parliamentary and regulator reports

## Predicate and inference boundary

**Allowed predicates:** `approved_for_role`, `restricted_from_lobbying`, `restricted_from_bid_advice`, `declared_no_prior_dealings`, `appointed_to_board`, `restriction_expired`, `enforcement_recorded`.

**Forbidden inferences:** approval proves no conflict; restriction proves misconduct risk materialised; former office proves access was used; multiple roles prove an influence network; missing enforcement proves compliance.

The publication unit is a dated appointment, restriction, declared activity, or enforcement record, not an insinuation based on prestige or institutional proximity.

## Acceptance

A complete office-defined cohort, appointment and restriction ledger, restriction-window activity screen, and regulator-effectiveness comparison that preserves both breaches and clean controls.

Promotion requires human review and all repository gates. Until then, every observation remains `graph_effect: none`.
<!-- END BODY #37 -->

## Comments (1)

### Comment 1 of 1: BigBirdReturns, 2026-07-19T16:12:27Z (id 5016430905)

https://github.com/BigBirdReturns/clifford-number/issues/37#issuecomment-5016430905 . updated 2026-07-19T16:12:27Z . author_association OWNER . body sha256 `dd0aa41293daf9d4f11a53f0165ef0eb75c13e3a36c4dfc1826a4625aec6f89e`

<!-- BEGIN COMMENT 5016430905 bytes=3212 sha256=dd0aa41293daf9d4f11a53f0165ef0eb75c13e3a36c4dfc1826a4625aec6f89e -->
## First bounded findings receipt: one official appointment bundle exposes the control/monitoring boundary

Parent program: #30  
Captured: 2026-07-19  
Graph effect: **none**

### Baseline action

Exercised the GOV.UK ACOBA publication path for former Cabinet Secretary Simon Case, then opened the underlying official advice for two paid consultancy commissions.

Bundle: https://www.gov.uk/government/publications/case-simon-cabinet-secretary-and-head-of-the-civil-service-acoba-advice

### Observed artifact

The bundle states that Case left office in December 2024 and publicly records:

- paid adviser role at Invisible Technologies;
- an independent consultancy;
- commissions with Workday, Inc. and Bridgepoint Group plc;
- unpaid patron role at Patchwork Foundation;
- unpaid ambassador role at RAF Charitable Trust.

For the Bridgepoint commission, ACOBA recorded a **six-month waiting period** and, for two years after leaving office, prohibitions on UK-government lobbying, bid/contract advice, use of government contacts, and certain lobbying of contacts in other governments. ACOBA also recorded that Case and the Cabinet Office said there had been no Bridgepoint-specific meetings or decisions and no identified specific information conferring an unfair advantage.

Official letter: https://assets.publishing.service.gov.uk/media/68c9317907d9e92bc5517b46/ACOBA_Advice_-_Simon_Case__commission_with_Bridgepoint_plc.pdf

The Workday letter supplies a materially different control case:

- Workday already held UK government contracts, including the cited £144.3m Matrix-cluster contract.
- Case disclosed one 2023 meeting with Workday concerning the Prime Minister’s AI Safety Summit.
- The proposed role covered global business strategy, senior-leader mentoring, and advisory-board participation.
- Workday wrote that compliance with ACOBA conditions would be contractually binding.
- Case said he would not lobby, work on UK bids/contracts, or use government knowledge to advance Workday’s UK interests.

Official letter: https://assets.publishing.service.gov.uk/media/688b9300fc784fa12a0890c8/ACOBA_Advice_-_Simon_Case__commission_with_Workday__Inc..pdf

These are dated predicates for approval, restrictions, declared dealings, and employer acceptance. They are **not** proof of either compliance or breach.

### Nearest observed boundary

The official advice is a pre-/entry-control record. The publication bundle does not itself provide a restriction-window monitoring log, lobbying-contact screen, procurement screen, or enforcement outcome. Absence of an enforcement entry cannot be treated as compliance.

The selection denominator also remains unfrozen: “all former Cabinet Secretaries, permanent secretaries, senior No. 10 officials, and declared comparator offices” requires an explicit departure window and authoritative office list before destinations are queried.

### Next real run

Freeze a departure period and office roster first; then run this same appointment/restriction/activity screen for every cohort member, including clean controls and no-appointment cases. Acceptance remains **incomplete**; this receipt establishes the record shape and monitoring boundary only.
<!-- END COMMENT 5016430905 -->

