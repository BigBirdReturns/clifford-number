---
number: 47
kind: issue
title: "Research fan-out: Capital, board control, and strategic rights"
state: closed (not_planned)
author: BigBirdReturns
created_at: 2026-07-19T15:33:52Z
closed_at: 2026-08-11T18:44:45Z
url: https://github.com/BigBirdReturns/clifford-number/issues/47
comments: 3
body_sha256: 95190408c75ca502cccac6d107bdbb646f06dc9adaf3c5a2cc713c071cfeb104
retrospective_source: retrospective/2026-10-12/github/issues-full.jsonl (issue object), issue-bodies.jsonl (lean copy, identical body), issue-comments-full.jsonl (comments)
---

# #47: Research fan-out: Capital, board control, and strategic rights

## Body (verbatim)

<!-- BEGIN BODY #47 bytes=2976 sha256=95190408c75ca502cccac6d107bdbb646f06dc9adaf3c5a2cc713c071cfeb104 -->
## Research-batch contract

- `batch_id`: `ownership/capital-board-strategic-rights`
- `parent_program`: #30
- `selection_lane`: `ai-policy-public-private-topology`
- `classification`: financing, governance, and control-rights cohort case
- `graph_effect`: `none`
- `verification_status`: `machine_proposed_unverified`
- `publication_status`: `blocked_pending_receipts_and_human_review`

## Case object

**Public-interest question:** Who finances synthetic-population vendors, what securities and governance rights are created, which investors recur across vendors, and how do filed control rights differ from public funding narratives?

**Selection unit:** one legal entity, funding round, security class, allotment, investor, director or observer appointment, shareholder agreement term where public, PSC state, charge, acquisition, secondary sale, or fund relationship.

**Selection universe:** the complete frozen vendor cohort and every filed financing or ownership event for their legal entities, followed through named funds and individuals without inferring operational influence from investment alone.

## Task packet

1. Build legal-entity and jurisdiction bundles for every vendor, including former names, subsidiaries, parents, PSCs, and filing identifiers.
2. Freeze funding chronology from company registries, securities filings, press announcements, fund portfolio pages, and investor reports.
3. Reconcile announced round amounts with filed allotments, currencies, closing dates, tranches, security classes, share counts, and changes in rights.
4. Map director, board-observer, consent, veto, information, liquidation, pre-emption, anti-dilution, and control rights only where publicly documented.
5. Resolve recurring funds and individuals across the vendor cohort and compare against matched AI-market categories.
6. Track acquisitions, insolvency, recapitalisation, down rounds, exits, and custody of models or customer data without treating capital events as misconduct.

## Source families

- company registries and securities filings
- fund and vendor announcements
- annual reports and portfolio disclosures
- charges, insolvency, and acquisition records
- competition and regulatory filings

## Predicate and inference boundary

**Allowed predicates:** `invested_in_round`, `allotted_security`, `appointed_director`, `person_with_significant_control`, `board_observer_right`, `security_right_varied`, `acquired_by`.

**Forbidden inferences:** investment proves operational control; investor ideology transfers to company; board seat proves involvement in every decision; announced amount equals cash received; recurring investor proves coordination.

## Acceptance

A filing-first capital and governance ledger with reconciled amounts, rights, actors, recurrence, and explicit separation of economic exposure from documented control.

Promotion requires human review and all repository gates. Until then, every observation remains `graph_effect: none`.
<!-- END BODY #47 -->

## Comments (3)

### Comment 1 of 3: BigBirdReturns, 2026-07-19T16:12:36Z (id 5016431469)

https://github.com/BigBirdReturns/clifford-number/issues/47#issuecomment-5016431469 . updated 2026-07-19T16:12:36Z . author_association OWNER . body sha256 `732baa0a4bc6b4278f930782c63cf10cbe39a761892ff26a712e2d6115c5c6a1`

<!-- BEGIN COMMENT 5016431469 bytes=3807 sha256=732baa0a4bc6b4278f930782c63cf10cbe39a761892ff26a712e2d6115c5c6a1 -->
## First pass: Electric Twin filing bundle resolves entity and control, not round economics

Parent: #30  
Captured: 2026-07-19  
Graph effect: **none**

### Smallest real filing-first path

Started with the seed legal entity rather than the funding announcement:

- **ELECTRIC TWIN LTD**, company 15173006, active, incorporated 28 September 2023.
- Previous name: **ELECTRIC SHEEP INTELLIGENCE LTD** (28–30 September 2023).
- SICs include software development, data processing/hosting, and market research/public-opinion polling.
- Current Companies House surface lists three directors: Alexander Vaughan Cooper, Ben Warner, and Benjamin Adam Blume (appointed 12 September 2025).
- Current PSC register lists Cooper and Warner, each with more than 25% but not more than 50% of shares and voting rights, plus the right to appoint or remove directors.

Official sources:
- Overview: https://find-and-update.company-information.service.gov.uk/company/15173006
- Filing history: https://find-and-update.company-information.service.gov.uk/company/15173006/filing-history
- Officers: https://find-and-update.company-information.service.gov.uk/company/15173006/officers
- PSCs: https://find-and-update.company-information.service.gov.uk/company/15173006/persons-with-significant-control

### Announcement versus filing chronology

Electric Twin's 11 February 2026 announcement says **$14m total funding**: a $10m round led by Atomico with LocalGlobe, Mercuri and Marc Andreessen participating, following a $4m pre-seed.

Source: https://www.electrictwin.com/blog/electric-twin-announcing-14m-in-funding

The filing index independently shows a denser legal chronology:

- 12 Sep 2025: Benjamin Adam Blume appointed director.
- 16–26 Sep 2025: multiple allotments, a share-class redesignation, variation of rights, new articles, allotment authority, and removal of pre-emption rights.
- 13 Jan, 6 Mar, 2 Apr, and 9 Jul 2026: further SH01 allotment filings.
- The register therefore contains relevant events both before and after the public funding announcement.

This supports `allotted_security`, `security_right_varied`, and `appointed_director` as events. It does **not** yet reconcile investor identity, consideration, cash received, round close, tranche, share class, or rights.

### Observed access failure

Attempts to open the SH01/resolution PDFs through the public filing path failed at the redirected, short-lived document URL/cache boundary in this research session. The filing index is readable, but the underlying forms needed for share counts/classes and the 71-page articles were not captured.

That failure is recorded as **source retrieval incomplete**, not as absence of terms.

### Inference controls

- The announced $14m is not treated as cash received.
- Director appointment is not treated as investor control.
- PSC status is documented control, but not proof of involvement in every decision.
- Atomico/LocalGlobe/Mercuri/angel participation remains a company announcement until reconciled to filed allotments and fund/legal identities.
- No board-observer, veto, liquidation, anti-dilution, information, or consent right is claimed from the index alone.

### Next same-path run

1. Retrieve and archive the Sept 2025 resolutions/articles and all SH01 PDFs.
2. Transcribe allotment dates, classes, counts, nominal values, consideration, and rights.
3. Resolve Benjamin Adam Blume and each announced fund to legal identities; do not infer representation without a filing or fund disclosure.
4. Reconcile the public $4m/$10m narrative to filed tranches and currencies.
5. Repeat across the frozen #38 cohort, including null and ordinary-control vendors.

Acceptance remains **incomplete**. The seed entity/control bundle is real; cohort recurrence and round economics are not yet frozen.
<!-- END COMMENT 5016431469 -->

### Comment 2 of 3: BigBirdReturns, 2026-07-19T16:48:37Z (id 5016552029)

https://github.com/BigBirdReturns/clifford-number/issues/47#issuecomment-5016552029 . updated 2026-07-19T16:48:37Z . author_association OWNER . body sha256 `94fda39deb66ea5325228610604d957fcea5f42b3ff3ad98f4e30bb7877ee2e3`

<!-- BEGIN COMMENT 5016552029 bytes=2555 sha256=94fda39deb66ea5325228610604d957fcea5f42b3ff3ad98f4e30bb7877ee2e3 -->
## Second pass: director identity is now investor-linked; formal representation and rights remain unresolved

Parent: #30  
Captured: 2026-07-19  
Graph effect: **none**

### New primary-source join

The smallest real unresolved join from the first pass was `Benjamin Adam Blume -> investor identity`.

Three public primary surfaces now support a bounded link:

1. **Companies House** records Benjamin Adam Blume as an active Electric Twin director, appointed 12 September 2025:  
   https://find-and-update.company-information.service.gov.uk/officers/9uNgdVlr80BjvpnwQ2dbC-RmXNg/appointments
2. **Atomico's own team page** identifies Ben Blume as a Partner on its investment team, leading investments in AI and advanced software:  
   https://atomico.com/team/ben-blume
3. **Electric Twin's funding announcement** says the $10m round was led by Atomico, with LocalGlobe, Mercuri and Marc Andreessen participating:  
   https://www.electrictwin.com/blog/electric-twin-announcing-14m-in-funding

The Companies House filing index independently places the appointment (12 Sep 2025), filing (24 Sep), share-right changes, new articles and September allotments in the same financing-period chronology:  
https://find-and-update.company-information.service.gov.uk/company/15173006/filing-history

### What this resolves

This supports two separate, documented facts:

- Benjamin Adam Blume is an Electric Twin director.
- Ben Blume is an Atomico investment Partner, while Electric Twin says Atomico led its $10m round.

It materially narrows the previously unresolved identity join and establishes an **investor-linked director** in the round chronology.

### What it does not resolve

No source captured here says that Blume:

- was appointed **as Atomico's nominee**,
- holds the seat pursuant to a contractual investor right,
- participated in or approved any particular company decision,
- has observer, veto, information, liquidation, anti-dilution, consent, or other control rights,
- received shares personally or that Atomico received a specific filed allotment.

Accordingly, `appointed_director` and the public `invested_in_round` announcement remain separate predicates. Formal representation is **inconclusive**, not inferred.

### Remaining same-path work

Retrieve the September 2025 articles, resolutions and SH01 forms; then reconcile classes, counts, consideration, pre-emption changes, allottee identities and any nominee/observer rights. Until those underlying instruments are captured, round economics and strategic rights remain incomplete.
<!-- END COMMENT 5016552029 -->

### Comment 3 of 3: BigBirdReturns, 2026-07-19T17:33:32Z (id 5016710143)

https://github.com/BigBirdReturns/clifford-number/issues/47#issuecomment-5016710143 . updated 2026-07-19T17:33:32Z . author_association OWNER . body sha256 `79533f3d8049ae01aa9d880fbd1953281f29ca75d6d9e76404d2a35177abc582`

<!-- BEGIN COMMENT 5016710143 bytes=5552 sha256=79533f3d8049ae01aa9d880fbd1953281f29ca75d6d9e76404d2a35177abc582 -->
## Third pass: filed cash tranches and investor rights now resolve the financing mechanics

Parent: #30  
Captured: 2026-07-19  
Graph effect: **none**

### Retrieval boundary closed

The underlying September 2025 instruments that failed in the first pass were retrieved from the official Companies House filing history and checked as image-only PDFs:

- 12 Sep member resolutions — 146,791 bytes; SHA-256 `4be21af31cd198d2ce0778b6822affb8521285f4a6635c3e59ea8b246e4c94f9`
- 12 Sep adopted articles — 3,533,126 bytes; SHA-256 `84a0363d5e2b8075c3d68cf06c769e0e20cf98164f1b7bc48283c473e1dc3bae`
- SH08 share-class redesignation — 62,767 bytes; SHA-256 `6d16dc98745a3bc9c0a1b498c8ad6fb70d1d68ddb924796b50ab0c7913198738`
- SH10 variation of rights — 96,891 bytes; SHA-256 `64dfc352383793e504d74906c000424d985cfde432cfb81ced58f9e1e8b20cb9`

Official index and instruments:
- https://find-and-update.company-information.service.gov.uk/company/15173006/filing-history
- resolutions: https://find-and-update.company-information.service.gov.uk/company/15173006/filing-history/WUVCTVcwSFZhZGlxemtjeA/document?format=pdf&download=0
- articles: https://find-and-update.company-information.service.gov.uk/company/15173006/filing-history/MzQ4MjEzNzAyN2FkaXF6a2N4/document?format=pdf&download=0
- SH08: https://find-and-update.company-information.service.gov.uk/company/15173006/filing-history/MzQ4MjYzOTEyOGFkaXF6a2N4/document?format=pdf&download=0
- SH10: https://find-and-update.company-information.service.gov.uk/company/15173006/filing-history/MzQ4MjUyMzM1NGFkaXF6a2N4/document?format=pdf&download=0

### September allotment economics

The three September SH01 forms report Seed 2 Preferred shares issued for cash at **£9.267 per share**:

| allotment | shares | filed cash consideration |
|---|---:|---:|
| 16 Sep 2025 | 604,294 | £5,599,992.498 |
| 17 Sep 2025 | 86,327 | £799,992.309 |
| 26 Sep 2025 | 48,559 | £449,996.253 |
| **total** | **739,180** | **£6,849,981.060** |

The forms say no shares in these tranches were allotted other than for cash. They do **not** name the allottees. The total therefore resolves a filed September cash-equivalent amount, not which investor paid which tranche and not the entire publicly announced $10m round.

### What the resolutions and articles add

The 12 Sep resolutions:

1. authorised allotments or conversion rights up to aggregate nominal value **£1.197496**;
2. adopted the new articles;
3. waived/disapplied pre-emption rights for that authority; and
4. authorised redesignation of up to **741,051 Ordinary shares** into Seed 1 Preferred.

The 16 Sep SH08 then records exactly **741,051 Ordinary shares** redesignated as **741,051 Seed 1 Preferred**.

The adopted articles resolve rights that the index alone could not support:

- **Preference amounts:** £3.5625 per Seed 1 Preferred share and **£9.267 per Seed 2 Preferred share**.
- **Liquidation/return-of-capital waterfall:** Seed Preferred ranks ahead of Ordinary and receives the greater of its preference amount or the amount it would receive as converted; any shortfall against preference is shared pro rata, then remaining surplus goes to Ordinary.
- **Anti-dilution:** Article 10 provides formula-based additional Seed Preferred shares for a qualifying issue below the applicable starting price, subject to the stated exclusions and Investor Majority waiver.
- **Atomico governance right:** while it and permitted transferees hold Equity Shares, Atomico may appoint one Investor Director **and** one non-voting Board observer entitled to speak and receive all Board papers.
- **LocalGlobe governance right:** while it and permitted transferees hold Equity Shares, LocalGlobe may appoint one Investor Director.
- **Board quorum:** three Directors, including at least one Investor Director if appointed, with an adjourned-meeting fallback.

The signed member resolutions also name, among their signatories, LocalGlobe UK FLP, Mercuri GP LLP as manager for and on behalf of Mercuri LP, Milltown Ventures Ltd, and GICAI Investments L.P., among others. A signature proves participation in the member resolution; it does not prove receipt of a particular Seed 2 allotment.

### Formal-representation correction

The previous receipt correctly held back an Atomico nominee claim. The articles now prove that **Atomico possessed a contractual appointment right** for a Director and observer. Companies House plus Atomico's team page still prove that Benjamin Adam Blume was appointed an Electric Twin director and was an Atomico Partner.

However, the captured instruments do not expressly name Blume as the person appointed under Article 25.3. The defensible state is therefore:

- formal Atomico appointment right: **documented**;
- Blume as investor-linked director: **documented**;
- Blume as the named exercise of that specific right: **strongly suggested by chronology, not expressly filed**.

### Remaining same-path gap

The September mechanics are now real and substantially reconciled. Still unresolved:

1. allottee identity and allocation for each SH01 tranche;
2. mapping signed member entities or nominees to those tranches;
3. the January, March, April and July 2026 allotments;
4. exchange-rate/date and later-tranche reconciliation to the announced **$10m** round;
5. any additional reserved matters or information rights that exist only in the non-public shareholders' agreement.

Acceptance advances from retrieval-incomplete to **filed September economics and core rights resolved; full round reconciliation incomplete**.
<!-- END COMMENT 5016710143 -->

