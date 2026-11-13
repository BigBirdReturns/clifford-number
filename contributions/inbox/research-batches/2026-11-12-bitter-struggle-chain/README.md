# The Bitter Struggle chain: lines, institutions and sequence

Traced 2026-11-12 from Matt Clifford's repost of Tantum Collins's post announcing *The Bitter Struggle* (Ben Buchanan and Tantum Collins, Crown, 10 November 2026). Two rounds of research hands (20 packets, 230 leads), the ledger's own rows, the 717 UK ministers' meetings returns held on disk, and 30 pages read directly by the supervising session.

Files in this folder:

- `dispositions.jsonl`: every lead with its ruling (entered 57, candidate 63, context 63, rejected 47) and the ledger surfaces it supports.
- `lines.json`: every typed line, entered or not, with mechanism, dates, evidence class and what is missing.
- `candidate-graph.json`: the lines that are not in the ledger, each with what it needs before it could be entered.
- `peer-meetings-summary.json`: meeting rows per AI company in the ministers' returns, by window, and every row naming Anthropic.
- `leads-first-round.jsonl`, `institution-round/T*.json`: the hands' raw results.

The ledger intake is `data/intake/bitter-struggle-chain/bitter-struggle-chain.json`: 31 surfaces (28 official or first-party, 3 reported), all entered `hop_eligible: false` pending a reader.

## Topology

The repost closes a four-node cycle. Each edge is a different mechanism with its own evidence.

| Edge | Mechanism | Date | Evidence | Ledger |
|---|---|---|---|---|
| Clifford to Collins | public amplification (repost) | 2026-11-10 or after | owner's screenshot | candidate: no URL |
| Collins and Buchanan | co-authorship | 2026-11-10 | publisher's title page | entered |
| Buchanan to Anthropic | advisory affiliation | current on 2026-11-10; reported from 2025-05-30 | publisher's title page | entered |
| Anthropic to Clifford | employment, Managing Director for International Affairs, reporting to Tino Cuellar | from about 2026-09-02 | press carrying Anthropic's statement to The Stack | entered as reported |

A fifth line predates the repost. Index Ventures' own post of 31 May 2026 says Clifford is an advisor to Inherent, the company Collins co-founded and, per Companies House, has directed and controlled since 16 January 2026. Clifford and Collins are on one company record five months before the repost.

Under the ledger's admission rule a hop needs a bounded surface on a documented day. The Inherent seed-round surface is that kind of record (several named people on one company object, dated). If a reader rules it a hop base, Collins and his three co-founders get Clifford number 1; if the co-authorship surface is ruled one too, Buchanan gets 2. Paul Christiano already has number 1 through the Frontier AI Taskforce advisory board of 7 September 2023; he was named one of Anthropic's initial Long-Term Benefit Trust trustees twelve days later, so ruling that trust surface a hop base would give Jason Matheny and three other trustees number 2.

## Anthropic's meetings with UK ministers

Denominator first. Across the 717 returns (April 2023 to June 2026), rows naming each company:

| Company | All returns | Lead reviewer's term, 22 Jul to 3 Sep 2024 | Drafting, 26 Jul 2024 to 12 Jan 2025 |
|---|---|---|---|
| Google (excluding DeepMind) | 165 | 6 | 27 |
| Amazon or AWS | 156 | 7 | 22 |
| Microsoft | 127 | 5 | 26 |
| Meta | 86 | 6 | 12 |
| Google DeepMind | 48 | 3 | 11 |
| Nvidia | 25 | 4 | 5 |
| OpenAI | 23 | 0 | 4 |
| Cohere | 23 | 0 | 1 |
| Anthropic | 22 | 3 | 5 |
| CoreWeave | 17 | 3 | 4 |

Anthropic did not meet ministers more often than its peers. What sets it apart is the subject and the sequence.

The 21 meetings (22 rows; the 14 August 2024 roundtable is recorded by two ministers):

| Date | Minister | Subject as recorded | Relation to the Action Plan | Ledger |
|---|---|---|---|---|
| 2023-04-27 | Donelan | AI | before | held |
| 2023-05-24 | Sunak | roundtable with DeepMind, Anthropic, OpenAI on frontier AI risks and opportunities; Booth-Smith observing (ACOBA) | before | missing |
| 2023-06-14 | Chloe Smith | AI, with Dario Amodei | before | missing (return held) |
| 2023-08-29 | Donelan | AI | before | held |
| 2023-09-27 | Dowden | AI and AI risks | before | missing (return held) |
| 2023-11-02 | Dowden | summit roundtable with eight AI companies and civil society | before | missing |
| 2024-03-06 | Donelan | AI safety | before | held |
| 2024-08-05 | Kyle | the AI Opportunities Action Plan, AI regulation, the work of the AISI | inside Clifford's appointment term | held |
| 2024-08-14 | Kyle and Clark | AI regulation roundtable (Google, AWS, Startup Coalition, Ada Lovelace, GovAI, Turing and others) | drafting | held |
| 2024-12-20 | Kyle | the UK's position on AI and the US tech landscape (Scale AI the day before, OpenAI the same day) | drafting | held |
| 2025-01-06 | Kyle | "sequence of high level engagement" on the plan's objectives (AMD and Microsoft the same day, Google, AWS, NScale after) | week before publication | held |
| 2025-02-10 | Kyle | the upcoming memorandum, with Dario Amodei | after publication | held |
| 2025-02-13 | Kyle | signing the memorandum | after publication | held |
| 2025-02-13 | Starmer | the Action Plan and Anthropic's partnership with the government | after publication | held |
| 2025-03-21 | Kyle | AI regulation, public sector transformation, public-private partnership | after | held |
| 2025-07-30 | Kyle | AI | after; same day the AISI Alignment Project with Anthropic was reported | held |
| 2025-09-16 | Kendall | AI and copyright plenary | after | held |
| 2025-11-25 | Western (DWP) | roundtable on scaling AI in public services | after | missing |
| 2026-02-17 | Narayan | AI opportunities in the UK | after | held |
| 2026-03-04 | Narayan | AI opportunities in the UK | after | held |
| 2026-06-17 | Starmer | G7 roundtable with tech chief executives | after | held |

Three things the registers show that volume does not:

- Between August and December 2024, only two one-to-one meetings name the Action Plan as their subject: Anthropic on 5 August and CoreWeave on 13 August. Both fall inside Clifford's appointment as lead reviewer, which his declared-interests record dates 22 July to 3 September 2024. No row places Clifford at either meeting; the reviewer's own meetings appear in no return.
- Anthropic signed the first of the three company memoranda the registers record, on 13 February 2025, three days after the minister met Dario Amodei to discuss it. Cohere and OpenAI signed later in 2025.
- Officials and ministers then moved to Anthropic, on official records: DSIT's Deputy Director for AI International Policy left 15 days after the signing and joined Anthropic's Policy Division 18 days later; the former No.10 chief of staff and the former Prime Minister took paid roles in 2025; DSIT's Head of AI Engineering joined in December 2025. Clifford followed in September 2026.

Five of the 22 rows are not in the ledger. Two are in returns the ledger already holds; three are in returns it does not hold (the Prime Minister's returns before July 2024, a Cabinet Office return, a DWP return). They belong to the UK meetings lane.

## The UK sequence

| Date | Event | Evidence |
|---|---|---|
| 2023-05-24 | Sunak roundtable with DeepMind, Anthropic and OpenAI; Booth-Smith observes | register; both ACOBA letters |
| 2023-08-01 to 2023-11-02 | Clifford, Prime Minister's Representative to the AI Safety Summit | official (declared interests) |
| 2023-09-07 | Clifford Vice-Chair of the Frontier AI Taskforce advisory board; Christiano a member | official |
| 2023-09-19 | Christiano an initial trustee of Anthropic's Long-Term Benefit Trust, to April 2024 | first-party |
| 2023-11-03 | Clifford joins the AI Safety Institute Advisory Board, ongoing in February 2025 | official |
| 2024-07-22 to 2024-09-03 | Clifford, Lead Reviewer of the Action Plan | official |
| 2024-08-05 | Kyle meets Anthropic on the Action Plan | register |
| 2024-11-19 | UK and US institutes publish their joint pre-deployment evaluation of an Anthropic model | official |
| 2025-01-13 | Plan published; Clifford becomes the Prime Minister's AI Opportunities Adviser | official |
| 2025-02-13 | Memorandum signed by Peter Kyle and Dario Amodei; non-binding, no money | official |
| 2025-02-28 to 2025-03-18 | Daisy McGregor, DSIT Deputy Director for AI International Policy, to Anthropic External Affairs (London) | official |
| 2025-06-24 | ACOBA: Lord Booth-Smith, paid, full-time External Affairs | official |
| 2025-10-07 | GOV.UK Chat record: the model is Anthropic's, hosted in the government's AWS Bedrock account | official |
| 2025-10-09 | ACOBA: Rishi Sunak, paid, part-time Senior Advisor; payments to charity | official |
| 2025-12-01 to 2025-12-02 | James Lowe, DSIT Head of AI Engineering, to Anthropic | official |
| 2026-01-27 | Anthropic says DSIT selected it to build and pilot a GOV.UK assistant | first-party |
| 2026-05-31 | Clifford named an advisor to Inherent, Collins's company | first-party (lead investor) |
| 2026-09-02 | Clifford joins Anthropic, reporting to Cuellar | reported |
| 2026-09-07 | ARIA's commercial licence with Anthropic reported; Clifford to leave the ARIA chair on 6 November | reported |
| 2026-09-10 | Anthropic reported to have declined AISI pre-release testing of a new model | reported (candidate) |
| 2026-11-10 | Book published; Clifford reposts Collins | first-party; screenshot |

## The US sequence

| Date | Event | Evidence |
|---|---|---|
| 2021 | Jason Matheny, founding director of CSET, takes White House technology roles; reported to have brought Buchanan into government | reported (candidates) |
| 2023-05-04 | Vice President Harris meets four AI chief executives including Amodei; Jake Sullivan and Susan Rice take part | official |
| 2023-07-21 | Seven companies including Anthropic convened for the voluntary commitments | official |
| 2023-09-19 | Matheny (RAND) and Christiano among Anthropic's initial trust trustees | first-party |
| 2023-10-02 | Buchanan on the OSTP staff list, Assistant Director for Cybersecurity and AI | official |
| 2024-04 | Christiano becomes head of AI safety at the US AI Safety Institute | reported (candidate) |
| 2024-08-29 | US AI Safety Institute memoranda with Anthropic and OpenAI; Elizabeth Kelly its director | official |
| by 2025 | Kelly, Chhabra and others at Anthropic in policy roles | self-report and press (candidates) |
| 2025-05-30 | Buchanan reported as an Anthropic adviser | reported; publisher confirms in 2026 |
| 2025-07-14 | Defense Department CDAO agreement, $200 million ceiling | first-party |
| 2025-08-12 | GSA OneGov offer at $1 | official |
| 2025-08-27 | Anthropic's council of eleven former officials | first-party |
| 2026-01-21 to 2026-08-04 | Cuellar, Carnegie president, becomes a trustee, then Chief Global Affairs Officer | first-party |
| 2026-03-05 | Pentagon designates Anthropic a supply chain risk | reported (candidate) |
| 2026-09 | Clifford reports to Cuellar | reported |

## The same practice on both sides

1. **The company is convened into policy-making.** US: the May 2023 meeting and the July 2023 commitments. UK: the May 2023 roundtable, then the Action Plan meetings of 2024 and 2025.
2. **The state's safety institute gets testing access.** US memorandum in August 2024; joint UK and US evaluation in November 2024; the UK memorandum of February 2025 includes security research with the AISI.
3. **Deployment or procurement follows.** US: the CDAO agreement and the GSA offer in 2025. UK: GOV.UK Chat on Anthropic's model, and the GOV.UK assistant selection in 2026.
4. **People who handled the policy move to the company.** UK moves are on official records with dates and lobbying conditions (DSIT business appointment records, ACOBA). US moves (Kelly from the safety institute, Chhabra from the NSC, Huang from OSTP, Baker from Net Assessment, Buchanan as adviser) rest on press and self-description, with weaker dates.
5. **Governance seats bridge state and company.** Trust trustees and council members drawn from government service: Matheny, Christiano, Fontaine, Cuellar, Bernanke, and the eleven council members.

The differences are instructive. The UK instrument is a non-binding memorandum with no money; the US instruments include a $200 million ceiling agreement. In the UK no Contracts Finder notice from 2023 to September 2026 names Anthropic: its model reaches GOV.UK through the government's AWS account, so the procurement record would name AWS.

## What the evidence supports, and what it does not

Supported by official or first-party records:

- Each of the four edges of the cycle, typed as above, and the earlier Clifford and Collins line through Inherent.
- A dated UK sequence from policy engagement to memorandum to deployment to personnel moves, on registers and official letters.
- The same five-step practice in the US, with weaker personnel dates.

Not supported:

- That Anthropic had more ministerial access than its peers. The registers show it did not.
- That Clifford met Anthropic while writing the plan. No register row shows it, and the reviewer's meetings are in no return.
- That any decision was made for Anthropic, or that any appointment rewarded one. Both ACOBA letters record the Cabinet Office's view that none was.
- That Buchanan is paid or employed by Anthropic. Only an advisory affiliation is stated.
- That the book's endorsers have ties to Anthropic. None was found. Sullivan and Rice share the May 2023 White House meeting with Amodei as officials.

Conflicts between records:

- The memorandum's date: 13 February 2025 on its GOV.UK page and in the register; 14 February in the Booth-Smith ACOBA letter.
- Clifford's lead-reviewer appointment: 22 July to 3 September 2024 in his declared interests; the ledger's development surface runs from the announcement (26 July 2024) to publication (13 January 2025).
- Clifford's summit role: from 1 August 2023 in his declared interests; the ledger's surface is the 10 August announcement.
- Clifford's adviser appointment: declared term to 12 January 2026; press reports he left in July 2025.

## Still to hunt

- The repost's URL and time.
- Buchanan's Anthropic start date and terms (his own Foreign Affairs disclosure of October 2025; Semafor, May 2025).
- Official records of the US personnel moves (Kelly, Chhabra, Huang, Baker) and Collins's OSTP and NSC titles on a staff list.
- The five missing meeting rows (UK meetings lane), and AISI's own records of the Alignment Project and of the declined pre-release test.
- ARIA's licence record (contract or transparency data).
- The FOIA documents behind the report that Matheny brought Buchanan into government.
- Which new surfaces become hop bases: the Inherent seed round, the co-authorship, the May 2023 White House meeting, the initial trust trustees, the council roster, the memorandum signing. That ruling is the owner's.
