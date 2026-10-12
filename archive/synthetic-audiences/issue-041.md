---
number: 41
kind: issue
title: "Research fan-out: Political persuasion and message-optimisation use"
state: closed (not_planned)
author: BigBirdReturns
created_at: 2026-07-19T15:31:01Z
closed_at: 2026-08-11T18:44:09Z
url: https://github.com/BigBirdReturns/clifford-number/issues/41
comments: 1
body_sha256: 210de4631d8cabb37acb8c066f11e67c6f53b9bfea1975968e9368d9734721d8
retrospective_source: retrospective/2026-10-12/github/issues-full.jsonl (issue object), issue-bodies.jsonl (lean copy, identical body), issue-comments-full.jsonl (comments)
---

# #41: Research fan-out: Political persuasion and message-optimisation use

## Body (verbatim)

<!-- BEGIN BODY #41 bytes=3116 sha256=210de4631d8cabb37acb8c066f11e67c6f53b9bfea1975968e9368d9734721d8 -->
## Research-batch contract

- `batch_id`: `deployment/political-message-optimisation`
- `parent_program`: #30
- `selection_lane`: `ai-policy-public-private-topology`
- `classification`: political, advocacy, and public-affairs deployment corpus
- `graph_effect`: `none`
- `verification_status`: `machine_proposed_unverified`
- `publication_status`: `blocked_pending_receipts_and_human_review`

## Case object

**Public-interest question:** Which campaigns, parties, governments, advocacy organisations, lobbying firms, public-affairs consultancies, and issue groups use synthetic audiences or population simulation for message testing, persuasion, mobilisation, fundraising, policy framing, or opposition research?

**Selection unit:** one disclosed client, contract, campaign filing, consultancy service, product use, case study, ad test, public statement, procurement record, or acceptable-use decision.

**Selection universe:** all political and public-affairs use recovered from the complete vendor cohort and declared official filing systems, with client identity held unresolved until a source supports it.

A founder's campaign history or a product's message-testing capability is a discovery lead only. It is not evidence of a current political client or electoral deployment.

## Task packet

1. Freeze vendor capability claims and acceptable-use rules concerning politics, persuasion, elections, advocacy, government communications, and sensitive targeting.
2. Search campaign-finance, lobbying, consultancy, procurement, grant, and corporate disclosure systems using legal names, former names, products, founders, and resellers.
3. Separate product capability, sales outreach, pilot, disclosed customer, paid contract, campaign expenditure, and observed deployment.
4. Record target population, geography, issue, channel, decision, data source, timing, and legal regime where public.
5. Compare the full vendor cohort, including vendors that prohibit political use or report no political clients.
6. Preserve nulls as source-bounded results and screen for ordinary market-research services that do not use synthetic populations.

## Source families

- campaign-finance and lobbying filings
- government procurement and transparency records
- vendor acceptable-use and marketing materials
- consultancy and client disclosures
- advertising libraries and regulator records

## Predicate and inference boundary

**Allowed predicates:** `marketed_for_message_testing`, `contracted_by_campaign`, `reported_campaign_expenditure`, `used_for_advocacy`, `political_use_prohibited`, `client_unresolved`.

**Forbidden inferences:** campaign background proves current use; capability proves deployment; political client proves manipulation or illegality; message testing proves microtargeting; vendor silence proves hidden political work.

## Acceptance

A legal-name-resolved political-use corpus with capability, sale, contract, expenditure, deployment, prohibition, and null states kept distinct.

Promotion requires human review and all repository gates. Until then, every observation remains `graph_effect: none`.
<!-- END BODY #41 -->

## Comments (1)

### Comment 1 of 1: BigBirdReturns, 2026-07-19T16:12:37Z (id 5016431563)

https://github.com/BigBirdReturns/clifford-number/issues/41#issuecomment-5016431563 . updated 2026-07-19T16:12:37Z . author_association OWNER . body sha256 `643dbd5674a95b9472de35a80434441f6a368f466cd098e2a7709d5ab0384cde`

<!-- BEGIN COMMENT 5016431563 bytes=2632 sha256=643dbd5674a95b9472de35a80434441f6a368f466cd098e2a7709d5ab0384cde -->
## First-pass findings receipt — capability recovered; client and expenditure identities remain unresolved

Parent: #30  
Captured: 2026-07-19  
State: `graph_effect: none`; preliminary, not promotion evidence.

### 1. Smallest real path exercised

I opened Aaru's current product page and then searched public federal-election results for the exact vendor string. I also checked the contemporaneous reporting that first disclosed the vendor's political work.

- Aaru directly markets a Politics product, **Dynamo**, for election forecasting, turnout modelling, message testing, opposition-scenario planning, endorsement impact, donor sentiment, ground-game strategy, and narrative tracking: https://aaru.com/products
- Semafor reported founder statements that Aaru had been hired by political campaigns, think tanks, and super PACs, and that an unnamed California campaign relied mainly on Aaru for polling: https://www.semafor.com/article/09/20/2024/ai-startup-aaru-uses-chatbots-instead-of-humans-for-political-polls

### 2. Exact observed states

| Observation | Evidence state | Allowed interpretation |
|---|---|---|
| Dynamo political feature list | first-party current marketing | `marketed_for_message_testing` and adjacent political capability |
| Political campaigns / super PAC customer classes | named reporter attributing statements to Aaru founders | reported sale/customer class, not a resolved client |
| “one campaign in California” | client unnamed | `client_unresolved` |
| Exact-string FEC web recovery | no attributable Aaru recipient recovered; OCR/name false positives appeared | source-bounded preliminary null only |

The result does **not** establish a campaign legal name, contract, expenditure, deployment channel, target population, or legality. It also does not establish microtargeting or persuasion. No vendor acceptable-use rule specific to elections or political clients was recovered in this pass, so prohibition/permission remains **unresolved**, not “permitted.”

### 3. Nearest boundary

The next required object is Aaru's legal-identity bundle (legal entity, aliases, products, founders, resellers) followed by searches in FEC itemised disbursements and relevant state filing systems—especially California—using every identity. Exact-name web search alone is not source-complete and cannot satisfy the issue contract.

### 4. Rerun status

The source path is reproducible from the two links above. It yields one direct capability record and one unresolved political-client report; it does **not** yet yield a legal-name-resolved contract or expenditure. Acceptance remains open.
<!-- END COMMENT 5016431563 -->

