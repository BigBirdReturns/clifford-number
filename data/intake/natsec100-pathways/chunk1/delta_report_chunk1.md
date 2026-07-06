# NatSec100 Pathways Database. Delta Report, Chunk 1 (Roster Ingestion)
Accessed 2026-07-05. Scope of this chunk: strict-sequencing steps 1-2 only (roster ingestion and base tables). No overlap analysis performed.

## Coverage
- NatSec100 years fully ingested: 3 of 4 (2023, 2024, 2026, each verified at exactly 100 company_year rows with rank continuity 1-100)
- NatSec100 2025: FAILED FULL RETRIEVAL, documented. Official PDF (SVDG_2025_NatSec100_20250706.pdf) and the natsec100.org edition page both render the roster table as images/widgets that do not expose text. 42 partial 2025 rows recovered: 27 with exact ranks (2026 report movers table, exits section, press corroboration), 15 presence-only rows (Four-Peater table, in-report company quotes, company press releases), each carrying its receipt.

## Counts
- company_year rows: 342 (2023: 100, 2024: 100, 2025: 42 partial, 2026: 100)
- unique companies: 196
- receipts: 16
- surfaces: 4 (natsec100 2023-2026)
- actors: 12 (receipt-backed only: SVDG, J.P. Morgan, Franklin Templeton, Balyasny, Pryzm, and top-investor-table funds)
- surface overlaps: 0 (not yet run, by design)
- Silent Ventures overlaps: 0 (not yet run)
- Capital Factory overlaps: 0 (not yet run)
- Jackson Moses overlaps: 0 (not yet run)
- DIU overlaps: 0 (not yet run)
- AFWERX overlaps: 0 (not yet run)
- SBIR/STTR overlaps: 0 (not yet run)
- USAspending overlaps: 0 (not yet run)
- conversion events: 367 (342 programmatic NatSec100-inclusion events mirroring company_years; 8 documented M&A exits; 11 documented IPOs/filings; 1 SpaceX methodology_exit; 5 FY25 named Air Force award line items at medium confidence pending government_record receipts)
- validation events: 0 (none created; candidate material flagged, e.g. Virtualitics "fielded across multiple branches," Overland AI Army/USMC/SOF collaboration quote, X-Bow AFRL RE-ARM and hypersonic test claims in 2026 report quote blocks)
- credential events: 0 (none created this chunk)
- narrative events: 0 (none created; candidate phrases logged for next pass: Govini "AI-native platform...closing the gap between the factory and the fight"; Onebrief "make military commands superhuman" and "planet-scale simulation"; SVDG's own "new American Industrial Base")
- company ledgers: 0 (deferred until overlap tables exist, per spec)
- myth-to-market scores: 0 (insufficient evidence by definition at this stage)

## Methodology facts recorded (year-scoped, per your rules)
- 2023: inaugural; momentum formula (headcount growth, total capital, fundraising momentum); requires evidence of national-security customers. Public validation surface.
- 2024: aperture widened to national-security-adjacent sectors (homeland security, intelligence, financial crimes); 44 new companies. Public validation surface.
- 2025: same momentum methodology plus FOCI vetting; explicitly not a measure of operational impact. Public validation surface, not procurement-gated.
- 2026: Pryzm USG contracting data becomes a direct ranking input; eligibility gate of at least one USG contract by 2025-12-31 plus FOCI review. Only 2026 inclusion is coded procurement_gate.
- SpaceX: on 2023, 2024, 2025 lists, isolated from comparative analysis due to scale; removed in 2026 after confidential S-1 under the not-filed-to-IPO rule. Recorded as methodology_exit, not a company pathway claim.
- Anthropic/OpenAI: excluded 2025 (eligibility not assessed pre-finalization). 2026: OpenAI included at #12; Anthropic ineligible due to active litigation following OTA termination and supply-chain-risk designation. Recorded as methodology notes.

## Failed retrievals
1. 2025 full roster (official PDF, table pages image-rendered; edition-page widget non-extractable). Recovery paths for next chunk: Wayback Machine snapshots of the 2025 companies widget; investor/company press releases announcing 2025 inclusion (Washington Harbour names 11 but does not enumerate them in retrieved text); SVDG LinkedIn thread assets.
2. No full third-party reproduction of the 2025 roster found in credible press.

## Unresolved OCR / name ambiguities
- 2026 PDF contained two garbled repeat-header rows ("3 Obif bifll209", "23 JtZjtGbNC"); both resolved against clean duplicate rows in the same document (rank 3 Sierra Space, rank 23 JetZero). Resolved.
- Tectonic (2026 coverage) lists "Skidoo" among big movers; no such company on any roster; resolved to Skydio against the official movers table. Resolved, logged on receipt R009.
- RRAI (2023 #54) linked to Forterra (2026 #8) on HQ (Clarksburg MD) and founding year (2002) match plus the known Robotic Research rebrand; identity link held at medium confidence pending a dedicated rebrand receipt. Open.
- Report-level inconsistencies preserved, not corrected: Relativity founded 2015 vs 2016; PsiQuantum 2015 vs 2016; SandboxAQ 2021 vs 2022; Snorkel 2015 vs 2019; Varda 2020 vs 2021; Stoke Space HQ Kent vs Everett; Blue Origin Kent vs Kirkland; Hermeus Atlanta vs Los Angeles; Nominal LA vs Austin.
- Your normalization-hint names not found on any ingested roster: Allen Control Systems, Base Power, Privateer (2024 #30 only), Syntiant. Allen Control Systems, Base Power, and Syntiant are plausible 2025-only members; they cannot be asserted without a receipt. Open receipts needed.
- Armis and GoTenna appear only in the 2026 past-member exits table; membership year unconfirmed (likely 2025). Company records created without company_year rows. Open.

## Rejected hypotheses and reasons
- "Aechelon 2025 rank recoverable from its press release": rejected, release states inclusion only.
- "2025 roster recoverable from the updated 2025 PDF variant": rejected, same image-rendered table.
- Treating the Groq/Nvidia transaction as a standard acquisition: rejected; 2026 report describes a non-exclusive licensing agreement with leadership acqui-hire; recorded as-structured.

## Quality-control confirmations
- "All 100 ingested" verified as exactly 100 rows for 2023, 2024, 2026; 2025 explicitly marked partial (42 rows), and no chart, percentage, or overlap count will be produced against a 2025 denominator until it is complete or permanently capped.
- All 24 Four-Peaters resolve, post-alias-reconciliation, to documented presence in all four years. This is a strong internal check that the alias map (X-Bow/X-Bow Systems, Stoke Space Technologies/Stoke Space, Relativity/Relativity Space, Saronic Technologies/Saronic, etc.) is not splitting entities.
- Topology and interpretation kept separate: every programmatic conversion event carries competing_explanations and a forbidden_inferences field.

## Complete / incomplete ledger
Complete: 2023 roster, 2024 roster, 2026 roster, receipts, companies, surfaces, core actors, documented exit and methodology-exit events.
Incomplete: 2025 roster (58 companies unidentified), validation/credential/narrative event tables (candidates flagged), all overlap tables, company ledgers, myth-to-market scores.

## Next recommended ingestion chunk
Chunk 2, in your stated order: (a) close the 2025 roster via Wayback snapshots and 2025 inclusion press releases; then (b) deterministic overlap pass against Silent Ventures official portfolio (current and prior), then Capital Factory, then Jackson Moses / Silent Capital, with one receipt per portfolio edge. DIU/AFWERX/SBIR/USAspending follow in chunks 3-4. The five FY25 Air Force line items (Sierra Space, X-Bow, JetZero, Dataminr, Castelion) are the cheapest confidence upgrades available: each should resolve to a USAspending or announcement record in one query.
