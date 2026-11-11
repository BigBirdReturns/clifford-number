# Lens hunt, 10 November 2026

Leads for intake. Nothing in this folder is in the ledger: every row carries `graph_effect: none` and `verification_status: machine_proposed_unverified`.

Jonathan's request, 10 November 2026: "fan out with the cheap hands and research what we need for the lens and anything else, be sure to ask Astra and Sol".

The ledger read was `work/galaxy-arrival-20261108` at ca2ae200: 1,155 surfaces, 4,411 rows.

## What ran

- 99 research hands. 71 were the estate's budgeted Codex hands (`gpt-5.6-luna`, low), one subject and two web searches each. 28 were Claude Haiku subagents, several subjects each.
- Two rounds of the same brief to `gpt-6-astra` and `gpt-6.1-sol`, independently. Round one asked what the lens needs. Round two gave them the results.
- A script fetched every cited page once and looked for the quoted words. No model judged a lead.

## What came back

732 items: 541 leads, 135 searched with nothing found, 15 not searched, 41 superseded or duplicate (left out of `leads.jsonl`).

| Lane | Hunted | Leads | Quote found on the page | Page unreadable | Searched, nothing |
|---|---|---:|---:|---:|---:|
| A | 146 self-reported government roles of 50 senior people | 67 | 63 | 3 | 83 |
| B | A bounded shared surface for 30 people with no path | 22 | 12 | 9 | 11 |
| C | 10 organisation-only procurement records | 13 | 10 | 2 | 3 |
| D | Five named scout findings | 233 | 232 | 1 | 2 |
| E | Published practice on showing evidence gaps | 9 | 8 | 0 | 1 |
| F | 38 single-person surfaces: who else is on the body | 61 | 56 | 1 | 20 |
| U | 24 press or year-only surfaces | 37 | 28 | 3 | 9 |
| X | 25 exits reported in an industry list | 99 | 38 | 61 | 1 |

Source class of the leads: 183 official, 183 register, 129 first-party, 46 press.

A quote found on the page shows the words are there. It does not show the claim is true, the person is the right person, or the dates hold. The 80 unreadable pages are 56 SEC EDGAR pages (the script sends no declared requester), 14 PDFs and 10 blocked or missing pages; they are unchecked, not wrong.

## Leads to adjudicate first

Astra and Sol were asked separately and named the same five.

1. **Jonathan Black with Matt Clifford, 10 August 2023.** GOV.UK names both as the Prime Minister's Representatives for the AI Safety Summit. This is the participation row the ledger's appointment surface lacks. Ref `D-03.1`.
2. **Feryal Clark with Matt Clifford, 30 April 2025.** GOV.UK: the AI Minister and the Prime Minister's AI Adviser jointly open the AI Growth Zones qualifying process. Ref `F-05.2`.
3. **Ben Warner in SAGE minutes 17, 63, 71 and 75**, listed as a No. 10 attendee. Refs under packet `R-17`.
4. **Ben Warner on the Challenge Panel of the 2023 independent review of the UK Statistics Authority.** The GOV.UK announcement lists the whole panel: Guy Goodwin, Guy Nason, Rebecca Riley, Alice Sullivan, Ben Warner and John Curtice. Packet `R-17`.
5. **DIUx Austin opening at Capital Factory, 14 September 2016.** The Texas Governor's release names Ash Carter and William McRaven. Packet `R-25`.

Also worth a reviewer's time:

- **Electric Twin is on the government's G-Cloud 15 framework**: Digital Marketplace service 763372757220010, "Synthetic audience", Lot 2b. A framework place, not a purchase. Ref `D-01.new`.
- **The DSIT ministerial meetings register**, October to December 2023, carries the 25 October roundtable row with Matt Clifford and eight investment firms, and two 17 October techUK roundtable rows with ministers Michelle Donelan and Jonathan Berry. Organisations only on the investor row. Packets `D-03`, `U-01`.
- **Six named individuals on procurement announcements**, for example Lt Col Dan Sawyers (Head of jHub) and Greg Kausner (Anduril) on the TALOS Phase 3 release. Packets `C-01`, `C-05`, `C-07`.
- **Ben Warner's two Companies House person-with-significant-control records**: Solatek Ltd and BOWU Ltd. Packet `R-17`.
- **Project ENTRELEZAR**: the Contracts Finder notice gives Companies House number 12316056 against a Californian address, so the supplier identity conflict the ledger records is in the official notice itself. Ref `U-01.4`.

## What the hunt showed about the ledger

- **Six exits are dated by the day the list was retrieved**, 2026-10-23 (`exit-as-reported-*`). Heat decays from a row's date, so they read as last month's events. The hands found the event date for four: Voyager's IPO (trading from 2025-06-11), MainStreet (2025-05-05), Spectrum Labs (2023-09-07), GameOn (2020-09-18). Capiche is partly dated; Daylight was not found.
- **The Voyager IPO is in the ledger twice**, as `natsec100-exit-voyager-space-2025-06-11` and `exit-as-reported-voyager-technologies`, so it heats twice.
- **Groq and Nvidia**: Groq's own announcement says a non-exclusive licence and that Groq stays independent. The ledger's note already says so; the surface is still classed as an exit.
- **19 of the 25 exits** have an instrument or the acquirer's own announcement, with 76 named officers and directors.
- **Lane A**: 63 of 146 roles have a confirming source for 26 of 50 people, 8 fully. The usual gap is dates: the source confirms the title, not the tenure. 23 sources are official or register records (Congressional Record nominations, hearing records, committee releases).
- **Lane B found almost no path to the anchor.** 2 of 22 leads name a person with a Clifford number, and both rest on press (Marc Andreessen as angel investor in the Electric Twin round; Simon Case on its ethics board). The other 20 tie pathless people to each other through Reagan National Defense Forum panels and a16z summit sessions. The brief's list of spine names wrongly included well-connected people who have no Clifford number themselves, which let those through.
- **The Queue cannot be cut with fields the ledger has.** 1,121 surfaces are under a finding; dropping `official_*` surfaces leaves 880; only 31 are under a high-priority finding. Both models asked for "has an operative role", and `participation_type` has 218 distinct free-text values, so that test needs a field first.

## What Astra and Sol said the lens needs

They agreed on every point below without seeing each other's answer. Full text is in `asks/`.

- **Cut the Queue** to surfaces that are under an open finding, not official, and carry an operative role; order by finding priority, then newest date. "No path" and "recurring surface type" alone should not make a hunt.
- **Hunt order**: single-person advisory roles first, then press or self-report awaiting an official record, then the senior self-reported government roles, then reported exits, then fund-control observations. Do not chase roster entries, panel attendance, vendor self-descriptions or junior employment.
- **Decision, hunt and dicta are two axes, not three buckets.** A decision is a dated instrument that documents an act; `official_*` only says who published. A hunt is a named missing fact with a plausible source.
- **Fields to add**: the missing fact and what closes it, per finding (Sol: `required_fact`; Astra: `research_target`); whether a row documents an act (`decision_act`); a row-level verification state; whether a missing end date means unknown or continuing ("In force" should read "Not recorded as ended"); an event identifier so one event observed twice does not heat twice.
- **Heat**: presence and self-reported jobs should add nothing to a decision heat. Keep the decay, the class weights and every row. A new label and version, the owner's choice.
- **For a registry**: claim-level custody (exact assertion, excerpt, reviewer, dispute and correction history). Verification applies to claims, never to a whole person.
- **Risks**: junior people in the LinkedIn lane are exposed by aggregation without a public-interest reason; never merge names without a second identifier; a shared surface shows shared attendance and nothing more.
- **Unasked**: the thesis is a hypothesis and the ledger has no comparison group; layout proximity and refusal colours are visual channels beyond heat; a contradicted record and a retrieval-dated record need their own marks.
- **Next fan-out, both**: repair the 25 exit rows against their instruments; adjudicate Black, Clark and the two Electric Twin bridge leads; read the 20 agenda PDFs at session level. Stop each at one decision per item.

Round two told the models that Groq and Voyager were new contradictions. The ledger's own notes already flagged both, so read their answers on those two as how to mark them, not as news.

## Published practice (lane E)

- OpenSanctions keeps provenance per statement.
- Open Ownership's standard marks a statement `verified` in its source type and records an unknown party with the reason it is absent.
- Wikidata ranks values and has a "statement disputed by" qualifier.
- OpenCorporates attaches provenance with a confidence value.
- ICIJ gives dataset-level provenance and tells readers to confirm identity themselves.
- Network-visualisation research: fuzziness, transparency, glyphs and explicit null markers for uncertainty.
- Two separate searches found no public first-party description of how the Integrity registry grades evidence.

## Not searched

- The 49 people in the LinkedIn lane whose government titles are all junior or enlisted (`lane-A-not-searched.json`). No official record is likely and searching them is not warranted.
- 46 Contracts Finder awards and 15 USAspending records: identifiers are already held and such records name no individuals.
- 37 Texas entity records and 66 Form D notices.
- 16 vendor self-descriptions (lane D-05): the web-search allowance ran out, and both models class them as not worth chasing.
- One exit (packet `X-16`) and a few single items whose hand ran out of budget.

## Files

- `leads.jsonl`: 686 rows. `state` is `lead`, `searched_not_found` or `not_searched`. `referee` is the script's result for the quote. `subject_in_ledger` says whether the subject's name matches an existing actor or organisation. `names_numbered` lists people with a Clifford number named in the fact. `surface_id`, `actor_id` and `finding_id` tie a row back to the ledger.
- `asks/`: both briefs and the four answers.
- `lane-A-not-searched.json`: actor ids.
- Run folder on W01, with every brief, raw result and script: `S:/Scratch/Runs/Clifford-Lens-Research-20261110`.

## Promoted on 10 November 2026

Jonathan approved the five first leads and the exit-date fixes ("Yes, promote them"). Every row below rests on a page archived under `receipts/lens-hunt/` and read before the row was written.

Entered the ledger:

1. **Jonathan Black with Matt Clifford, 10 August 2023.** `ai-safety-summit-representative-appointment-2023-08-10` is now a two-person joint appointment and a hop. New actor `jonathan-black`. The GOV.UK page itself is archived beside the existing extract; both are cited.
2. **Feryal Clark with Matt Clifford, 30 April 2025.** The archived DSIT release says "Minister Clark and Matt Clifford are leading a series of engagements today with leading investors and MPs". `ai-growth-zones-qualifying-process-2025-04-30` is a hop. New actor `feryal-clark`.
3. **Ben Warner in SAGE 17, 63, 71 and 75.** One surface per meeting, each a slice of the attendee list. SAGE 17 also lists Marc Warner (NHSX); GO-Science's participant list names "Dr Marc Warner, Faculty, on behalf of NHSx", so he is the ledger's Faculty director and SAGE 17 is a hop. SAGE 63, 71 and 75 list no other ledger person and stay single-actor. Dominic Cummings is not listed at any of the four. New organisation `scientific-advisory-group-for-emergencies`.
4. **UKSA review Challenge Panel, announced 9 June 2023.** `uksa-independent-review-challenge-panel-2023-06-09`, six members, a hop. New actors `guy-goodwin`, `guy-nason`, `rebecca-riley`, `alice-sullivan`, `john-curtice`; new organisation `uk-statistics-authority`. The announcement gives no affiliations, so Ben Warner's row rests on name and title. Cabinet Office is the sponsor and reporting line; GOV.UK attributes the page to the UKSA. The review's final report (Annex B) later lists a seventh panel member, Tim Leunig; the surface keeps the 9 June 2023 announcement roster.
5. **DIUx Austin, 14 September 2016.** The Texas Governor's release was already archived and already backs the official hop surface `diux-austin-outpost-at-capital-factory-2016-09-14` (Carter, McRaven, Abbott). The press surface `diux-austin-roll-out-press-2016-09-14` now cites that release and names its counterpart; its press rows are not duplicated as official rows, so the event does not heat twice.

Exit dates fixed from first-party pages: Voyager (2025-06-11, Voyager's closing release), MainStreet (2025-05-05, Employer.com's announcement on the Bench blog), Spectrum Labs (2023-09-07, ActiveFence's release), GameOn (2020-09-18, Victory Square's release: an asset and IP purchase by V2 Games), Capiche (2021-04-15, the publication date in the metadata of Vendr's own post). The two Voyager surfaces name each other.

Did not enter: Daylight's date. No first-party or official record dates it or confirms "Atlas"; its note says so. Nothing else from this batch is in the ledger.

## Entered in one pass on 10 November 2026

Asked "Enter the 366 official leads and the 155 filings in one pass?", Jonathan answered "Yes, one pass". The rows are machine-drafted, admitted by the project's mechanical rule and kept out of Clifford numbers: every surface below is `hop_eligible: false` with `hop_refusal_reason: entered_2026_11_10_pending_hop_review` until a reader reviews it. No Clifford number moved; the 297 hop edges are unchanged. The intake is under `data/intake/lens-hunt-official/` and `data/intake/sec-form-d/`; the run folder holds the drafting and the supervisor's rulings.

Entered the ledger:

1. **SEC Form D filings, lane `sec-form-d`.** All 123 drafted filings, archived under `receipts/sec-form-d/` and entered as `sec-form-d-<accession>` surfaces (`official_form_d_notice`). 105 issuer rows sit on the ledger organisation the issuer is (60 organisations, among them Booz Allen Hamilton, Palantir, Databricks, Shield AI and Groq); 18 fund or holding-company issuers (8VC, Andreessen Horowitz, Founders Fund, NightDragon, Silent Ventures and Booz Allen Hamilton Holding Corp filings) are 14 new organisations, each with a name-based link row to the ledger firm. 30 related-person rows put eight ledger people on filings that list them: Horacio Rozanski, Joe Lonsdale, Marc Andreessen, Ben Horowitz, Dave DeWalt, Jackson Moses, Brandon Tseng and Trae Stephens. Other related persons and signers are named in the surface notes only.
2. **Official and first-party records, lane `lens-hunt-official`.** 24 new surfaces (23 official, one first-party) with 68 rows: Senate, House, Congressional Record, White House, DoD and NASA records for Jamie Morin, David Norquist (two), Heidi Shyu, Darin DiTommaso, Tom Huntley and Tim Sheehy; the SDA award to Sierra Space; twelve SEC filings for the Rubrik, Firefly, Beta, X-energy and HawkEye 360 offerings and the Kodiak, Infleqtion, Merlin, Capella and Dedrone transactions; the UT System remarks at the DIUx Austin welcome; and three `-further-names` surfaces beside curated ones (Faculty Science's directors, the Lanarkshire AI Growth Zone and the DSIT techUK roundtable row), kept off the curated surfaces on purpose. 22 pages archived under `receipts/lens-hunt/` back them; three pages the ledger already held were reused, not archived again.
3. **Organisation rows on two existing surfaces.** Eight investor firms on `dsit-matt-clifford-ai-investor-roundtable-2023-10-25` and 78 organisations on `uk-ai-safety-summit-2023-confirmed-attendees-programme-roster`, from the archived DSIT register page and GOV.UK attendee list. Both surfaces keep their hop refusals.

New entities: 48 people and 102 organisations.

Went to gaps (`data/ledger/staging/lens-hunt-official/gaps.jsonl`; the Form D lane has none):

- **131 techUK roundtable organisations.** The release contract pins `dsit-techuk-anduril-ai-safety-roundtable-2023-10-17` to Anduril and DSIT (the Clifford-Anduril boundary), so the rest of the meeting's roster would change how that surface is treated.
- **Six surfaces the ledger already holds as the same event.** Five Reagan National Defense Forum panels (2023 panels 2 and 9, 2024 panel 4, 2025 panels 2 and 10, each already a session surface entered by the conventions lane from the forum's own agendas) and the DVIDS story on the Joint Defense Innovation Space opening of 8 March 2024 (already entered from DIU's own release). Entering them again would heat those events twice.
- **The JetZero selection, 16 August 2023.** af.mil refuses automated fetches and the Wayback Machine has no copy.
- **Blake Souter's Senate gift-rule disclosure.** The PDF is a scan with no text layer, so its name could not be checked.
- **Eleven names the archived pages do not show as drafted.** Nine Voyager registration signatories (the drafted words join table cells with "|"), Mark Esper on the Army article (the archived caption stops before his name) and Infleqtion's closing sentence. Two surfaces fall with them, Voyager's signatories and the Army further-names.
- Palantir was already on the summit attendee list.
