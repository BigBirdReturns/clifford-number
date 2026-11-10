1. Restrict Queue to nonofficial surfaces under open findings. Rank lexicographically by **high-priority finding first, operative role present first, latest dated row first**. Show ten surfaces, at most one per finding; break remaining ties arbitrarily. This uses recorded fields, limits domination by broad findings, and prioritizes concrete action claims over presence alone. It is a triage rule, not an estimated probability of discovery.

2. Provisional search order below; the ledger provides no measured yield or research cost:

   - **Single-person advisory roles:** official appointment instrument, gazette or appointing authority’s decision. Common failure: treating an advisory-directory entry as an appointment instrument.
   - **Self-reported government roles, starting with the 146 senior-role claims:** official appointment notices or dated government personnel records. Failure: employer confirmation becomes assumed authority or responsibility.
   - **Press/self-report awaiting upgrade:** the underlying official award, appointment or transaction filing. Failure: another article repeating the original claim counts as independent confirmation.
   - **Fund-control observations:** publicly filed partnership agreements, ownership schedules or GP/managing-member instruments. Failure: confusing adviser, registered agent or signatory with controller.
   - **Reported exits:** securities filings, official transaction disclosures or filed completion documents. Failure: announcement, proposed acquisition and completed exit become interchangeable.

   Then: payment records; single-person context; organisation-only evidence; year-only sessions; dense rosters. Apply that ordering only to claims still needing substantive verification. Official procurement records—and already official Form Ds—need no official-source upgrade. Missing people or hops are separate research objectives.

3. These are different dimensions, not three mutually exclusive statuses.

   **Decision:** a dated instrument documenting a specific appointment, allocation, award or exercise of authority. `official_*` establishes source family, not this meaning.

   **Hunt:** an open finding identifying a specific missing fact and a plausible source. Current finding types often identify coverage gaps instead.

   **Dicta:** presence or assertion without a documented operative act. Another source can verify attendance without turning attendance into a decision.

   Do not chase ordinary roster entries, panel attendance, vendor descriptions or junior employment merely to manufacture a decision or connection. A separate, specified public-interest claim can justify research.

4. Show five things:

   - **Presence versus operative roles:** existing role field, with counts.
   - **Official source versus documented decision:** add `decision_act`.
   - **What closes this hunt:** add `required_fact`; display it beside the finding.
   - **Unknown versus continuing tenure:** add `end_date_state`; an absent end date cannot establish “in force.”
   - **Repeated observations of one event:** add `event_id`, exposing duplication before it accumulates heat.

5. Offer an **operative-evidence heat** option:

   `heat = Σ weight(event_class) × 0.8^years × I(verified operative act)`

   Roster presence and self-reported employment contribute zero. Employment is not capital allocation; a documented investment is. Official rosters also contribute zero unless they document the relevant appointment act.

   Listing-heavy and LinkedIn-heavy nodes would cool substantially; the exact change requires recalculation. Keep the decay, existing event-class weights, all evidence rows and bounded-hop rules. Show excluded contributions in the inspector. The owner chooses whether to adopt this alternative.

6. The registry needs claim-level verification states, verification criteria and reviewer history; exact supporting passages; source URLs and retained captures; event, publication and capture dates; corrections and disputes; and stable, reviewed identity links. Surface status cannot substitute for item verification. Define “recalled-unverified” explicitly.

   Junior LinkedIn subjects face disproportionate exposure from aggregation: minimize personal details and require a public-interest reason for inclusion. Never merge names without corroborating identifiers. Shared attendance supports only shared attendance; proximity, heat and paths must not imply endorsement, coordination or wrongdoing. Corrections must propagate to derived views.

7. Reconcile the arithmetic: the refusal families total **1,050**, leaving **46** of the stated 1,096 unexplained.

   Also, the owner’s incentive thesis remains a hypothesis. Thirty-five reachable people establish coverage-dependent paths, not influence or career transition effects. Force-layout proximity supplies another visual signal despite “heat only”; explain or neutralize it. Research success should include disproved links and closed findings, not merely additional connections.