# Synthetic-constituency leg

**Status:** unmerged staging lane `data/ledger/staging/synthetic-constituency/`, built by `tools/promote-intake-synthetic-constituency.mjs` from the intake there. Every row cites a receipt archived under `receipts/synthetic-constituency/` (SHA-256, capture date) or in Wayback, with a `limits` sentence.

## Why the leg exists

On 2026-10-23 the owner wrote:

> "the ways this incentive market... POOF to anything they can't predict, and that is the saddest part... they need to simulate 8 billion people making real time decisions ACCURATELY for the system to work, which means they just put in their malformed outcome expectation and make the sausage."

The leg inverts the proximity map: it records where an institution that cannot predict a public is offered or uses a simulated one, and whose output was then acted on. It tests the thesis; it does not establish it.

## What the lane records

Staged: 34 surfaces, 73 participation rows, 35 receipts, 35 new organizations, 8 new actors, 3 gaps.

- **Vendor universe (category_formation_surface).** Rows titled "Gartner synthetic-population vendor race, 14 Apr 2026, as publicly reported by <vendor>" for Stravito (Front Runner, 30 Apr 2026), BluePill (Polished Diamonds, 12 May 2026), Arima (29 May 2026), Qloo (Set Diamonds, 15 Sep 2026; its first first-party self-report in custody) and Verve (home-page Gartner quote), evidence `reported`. Electric Twin's is already in the ledger (`gartner-synthetic-population-category-2026`). All remain public recovery candidates under `docs/synthetic-population-vendor-denominator.md`: no denominator member, no confirmed tier.
- **What vendors say they simulate (model_governance_surface).** Dated first-party pages for Aaru, Stravito, BluePill, Lakmoos AI, Evidenza, Yabble, Semilattice, Artificial Societies, Arima, Unlearn and NewtonX, plus two Electric Twin rows: the CEO's 24 Jul 2026 post on collapsing survey response and the 29 Jul 2026 vendor-funded comparison of seven human panels with one synthetic audience, which covered voting intention and UK military intervention in Ukraine.
- **Customers and partners (customer_vendor_surface and employment_investment_surface).** EY–Aaru (alliance 30 Sep 2026; blinded replication of EY's wealth study), UNDP–CulturePulse (August 2023), Qloo's reported clients, a Teneo testimonial, YouGov's acquisition of Yabble.
- **Political and policy surfaces.** UK politicians' reported use of synthetic voters (Bloomberg via Resultsense, 22 Oct 2026), the reported No. 10 experiment (column, 7 Jul 2025), Axios publishing an Aaru-simulated statistic (New Statesman, 5 May 2026), GOP use of MiroFish (Axios, 14 Apr 2026), Pew's evaluation (30 Sep 2026), the Cabinet Office consultation-reduction release (26 Mar 2026), Argentina's "social digital twin", the Salford/UCL Makerfield synthetic electorate, and the EMA PROCOVA opinion (2022).

## How the fixture's refusal rules apply

The fixture in `docs/performative-synthetic-constituency.md` refuses three moves:

- not exposed ≠ rejected;
- no click ≠ negative preference;
- raw engagement share ≠ population preference.

Each decision-case surface records the fixture's acceptance-boundary fields (model and version, question and option set, synthetic output, disposition, rejected alternatives, exposure policy) in an `acceptance_boundary` object; a field the source omits is marked missing, never inferred.

The strongest case, The Times naming a podcast "The Business" after querying its Electric Twin panel (Digiday, 4 Nov 2025), gives the question, a ranking, the disposition and that rejected names existed, but not the model, option set, outputs or exposure policy, so it remains `preference_identification_unavailable`. The UK politicians, No. 10, MiroFish and Axios rows give almost none.

## Which surfaces carry democratic_input_replacement

25 surfaces carry the secondary type, in four groups:

- the five Gartner self-report rows (matching the existing ledger category surface);
- vendor claims presenting simulated people as a substitute for respondents (Aaru, Stravito, BluePill, Lakmoos AI, Evidenza, Yabble, Semilattice, both Electric Twin rows);
- customer and decision rows (The Times, EY–Aaru twice, UNDP–CulturePulse, YouGov–Yabble, Axios–Aaru);
- political and policy rows (UK politicians, No. 10, MiroFish, Pew).

On vendor-claim rows it marks a claimed use, not a deployment.

Rows whose sources describe no substitute for consulting people do not carry it: the Artificial Societies, Arima, Unlearn and NewtonX claims, Qloo's client list, EMA (trial design), Cabinet Office (AI only finds consultation duties), Argentina (policy simulation) and Salford (no institution acted).

## Gaps: what no public record yet shows

- **Vendor roster.** The licensed Gartner roster, tiers and method are not in custody; the abstract page returned 403 with no Wayback snapshot. Lakmoos and Semilattice recognition posts are LinkedIn-only and unarchived. NewtonX, Aaru, Evidenza, CulturePulse, Unlearn and Yabble show no first-party recognition claim.
- **Recorded decisions.** No public record shows a government, party or pollster stating that it changed policy, pricing, allocation or exposure because of synthetic output and publishing the model, question, output and rejected alternatives together. No record ties Electric Twin to a named government or party client. No record ties a named politician to a named vendor.
- **Official policy.** No UK or US official document proposing synthetic populations as a consultation or polling substitute was found (no DSIT or Cabinet Office pilot, no "AI citizens' assembly", no Federal Register notice). The Spectator and Bloomberg originals and Axios's own item are not in custody.
- **Electric Twin register.** The register-of-members request (`data/research/electric-twin-register-of-members-acquisition/`) is prepared, not sent; this lane adds no allottee fact.

No conclusion here goes beyond the staged rows.
