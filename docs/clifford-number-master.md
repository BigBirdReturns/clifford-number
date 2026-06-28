# Clifford Number — Master Database Population Document

**Generated:** 2026-06-27  
**Sources:** Dialog raw dump (crimew/Wired, June 16 2026), deep research passes 27–30  
**Status:** Pre-import reference — all claims typed, sourced, and evidence-classed  

---

## How to read this document

Every entity, edge, and umbrella membership is written as a discrete, falsifiable claim. Three fields matter for every row:

- `predicate` — the specific typed relationship (never "associated with")
- `evidence_class` — `official` / `primary_public` / `reported` / `derived` / `open`
- `ui_weight` — 1 (full opacity) / 2 (expandable) / 3 (hover only) / 4 (off by default in public view)

Umbrella paths render differently from direct claim paths. A topology match is not a direct relationship claim.

---

## Part 1: Anchor Node

### Matt Clifford

| Predicate | Object | Date | Evidence Class | Source | UI Weight |
|---|---|---|---|---|---|
| `co-founded` | Entrepreneur First | ~2011 | primary_public | EF public record | 1 |
| `commissioned-to-author` | AI Opportunities Action Plan | July 2024 | official | GOV.UK / Peter Kyle foreword | 1 |
| `authored` | AI Opportunities Action Plan | 2025-01-13 | official | GOV.UK publications | 1 |
| `appointed-as` | Prime Minister's AI Opportunities Adviser | 2025-01-13 | official | GOV.UK: "Appointment of Matt Clifford CBE as the AI Opportunities Adviser" | 1 |
| `reported-to` | Prime Minister + DSIT Secretary of State | 2025 | official | GOV.UK appointment notice | 1 |
| `chair-of` | ARIA (Advanced Research and Invention Agency) | 2022-07-19 | official | GOV.UK announcement | 1 |
| `stepped-down-from` | Prime Minister's AI Opportunities Adviser | ~mid-2025 | reported | Public reporting | 2 |
| `listed-in-directory` | Dialog (organization) | 2026 | primary_public | dialog.org HTML source / Wired June 16 2026 | 3 |

**Clifford successor node:**

| Person | Predicate | Object | Evidence Class | Source |
|---|---|---|---|---|
| Jade Leung | `appointed-as` | Prime Minister's AI Adviser | official | GOV.UK |
| Jade Leung | `split-time-between` | No. 10 + AI Security Institute | official | GOV.UK |

---

## Part 2: Policy Spine Objects

### AI Opportunities Action Plan (Document node)

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `commissioned-by` | DSIT / Peter Kyle | official | GOV.UK foreword |
| `published-on` | 2025-01-13 | official | GOV.UK |
| `accepted-by-government` | all 50 recommendations | reported | Public reporting |
| `recommends` | UK Sovereign AI compute | official | Action Plan text |
| `recommends` | AI Growth Zones | official | Action Plan text |
| `recommends` | government as strategic AI customer | official | Action Plan text |
| `recommends` | National Data Library | official | Action Plan text |
| `recommends` | procurement reform | official | Action Plan text |
| `recommends` | domestic AI national champions | official | Action Plan text |
| `doctrine` | "AI maker not AI taker" | official | Action Plan text |

### UK Sovereign AI Unit (Org node)

| Predicate | Object | Date | Evidence Class | Source |
|---|---|---|---|---|
| `created-from` | AI Opportunities Action Plan recommendation | 2025 | reported | Public reporting |
| `chaired-by` | James Wise | June 2025 | reported | Public reporting |
| `backed-by` | ~£500 million | June 2025 | reported | Public reporting |
| `offers` | funding / fast visas / compute access / procurement pathway | 2026 | reported | Public reporting |

### DSIT (Org node)

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `created` | AI Opportunities Unit | official | GOV.UK |
| `acts-as` | Digital Centre of Government | official | GOV.UK / Action Plan foreword |
| `commissioned` | Matt Clifford (Action Plan) | official | GOV.UK |

### ARIA (Org node)

| Predicate | Object | Date | Evidence Class | Source |
|---|---|---|---|
| `inaugural-chair` | Matt Clifford | 2022-07-19 | official | GOV.UK announcement |
| `inaugural-CEO` | Ilan Gur | 2022-07-19 | official | GOV.UK announcement |

---

## Part 3: Dialog Directory — 113 Named Entities

**Evidence class for all rows in this section:** `primary_public`  
**Source:** dialog.org HTML source code, verified by Wired June 16 2026  
**Predicate for all rows:** `listed-in-directory`  
**UI weight:** 3  
**Note:** "Listed ≠ member." Directory includes active members, guests, speakers, and past guests. Do not render as equivalent to `appointed` or `director-of`.

| # | Name | Title / Primary Affiliation |
|---|---|---|
| 1 | Peter Thiel | Co-Founder, Dialog; Co-Founder, Palantir; Managing Partner, Founders Fund; Co-Founder, PayPal |
| 2 | Auren Hoffman | Chairman, Dialog; Chairman, SafeGraph; Founder, LiveRamp; CEO, NQB8 |
| 3 | Scott Bessent | U.S. Secretary of the Treasury |
| 4 | Ted Cruz | U.S. Senator (R-TX); Chair, Senate Commerce/Science/Transportation Committee |
| 5 | Cory Booker | U.S. Senator (D-NJ) |
| 6 | Elon Musk | CEO, SpaceX; CEO, Tesla; Owner, X; Co-Founder, Neuralink |
| 7 | Joseph Gordon-Levitt | Actor |
| 8 | Sophia Bush | Actress |
| 9 | Ezra Klein | Opinion Columnist, NYT; Fmr. Editor-in-Chief, Vox |
| 10 | Jonathan Levin | President, Stanford University |
| 11 | Sam Harris | Host, "Making Sense" podcast; Author |
| 12 | Bryan Johnson | Founder & CEO, Kernel; Founder, Blueprint |
| 13 | Sarah Bond | President, Xbox (Microsoft) |
| 14 | Scott Cook | Co-Founder & Chairman, Intuit |
| 15 | Lisa Gevelber | Global VP, Google |
| 16 | Shmuel Abramzon | Chief Economist, Israel Ministry of Finance |
| 17 | Josh Brolin | Actor |
| 18 | Reid Hoffman | Partner, Greylock; Co-Founder, LinkedIn |
| 19 | Joe Lonsdale | Founding Partner, 8VC; Co-Founder, Palantir; Co-Founder, Addepar |
| 20 | Alexus Grynkewich | NATO Supreme Allied Commander Europe (SACEUR); Commander, US European Command |
| 21 | Dan Driscoll | U.S. Secretary of the Army |
| 22 | Jim Himes | U.S. Representative (D-CT); Ranking Member, House Intelligence Committee |
| 23 | Wes Moore | Governor, Maryland (D) |
| 24 | Jared Polis | Governor, Colorado (D) |
| 25 | Lisa Monaco | Fmr. Deputy Attorney General, DOJ |
| 26 | Robert Hur | Fmr. Special Counsel, DOJ |
| 27 | Preet Bharara | Fmr. U.S. Attorney, SDNY |
| 28 | Rachel Brand | Chief Legal Officer, Walmart; Fmr. Associate Attorney General |
| 29 | Mitch Daniels | Fmr. Governor, Indiana; Fmr. President, Purdue University |
| 30 | Julian Castro | Fmr. Secretary, HUD |
| 31 | Peggy Hamburg | Fmr. Commissioner, FDA |
| 32 | Reema Al-Saud | Ambassador of Saudi Arabia to the United States |
| 33 | Turki Al Faisal Al Saud | Fmr. Minister of Intelligence, Saudi Arabia; Founder, King Faisal Foundation |
| 34 | Sheikh Nawaf Saud Nasir Al-Sabah | CEO, Kuwait Petroleum Corporation |
| 35 | Kaja Kallas | VP, European Commission; Fmr. Prime Minister, Estonia |
| 36 | Tarō Kōno | Fmr. Digital Minister, Japan; Fmr. Minister of Defense, Japan (**Note:** no longer current digital minister as of this writing — use `former_minister_of`) |
| 37 | Jens Spahn | MP, Germany (CDU); Fmr. Federal Minister of Health |
| 38 | Tom Tugendhat | MP, UK (Conservative) |
| 39 | Shahid Khaqan Abbasi | Fmr. Prime Minister, Pakistan; Founder, Airblue |
| 40 | Ali Jehangir Siddiqui | Board Chair, OnZero; Fmr. Ambassador of Pakistan to the United States; Fmr. Ambassador-at-Large for Foreign Investment |
| 41 | Shivon Zilis | Director, Neuralink |
| 42 | Stan McChrystal | Fmr. General, U.S. Army; Founder, McChrystal Group |
| 43 | Jonathan Ross | Founder & CEO, Groq |
| 44 | Pete Shadbolt | Founder & CSO, PsiQuantum |
| 45 | Scott Stephenson | Chairman, President & CEO, Verisk Analytics |
| 46 | Barry Silbert | Founder & CEO, Digital Currency Group |
| 47 | Charlie Songhurst | Board Director, Meta; Fmr. Head of Corporate Strategy, Microsoft |
| 48 | Tom Lue | Google DeepMind; Leads global affairs, frontier AI division |
| 49 | Fatima Kardar | Vice President, Xbox (Microsoft) |
| 50 | Neal Mohan | CEO, YouTube (Google) |
| 51 | Greg Brockman | Co-Founder & President, OpenAI |
| 52 | Jason Kwon | Chief Strategy Officer, OpenAI |
| 53 | Adam D'Angelo | Co-Founder & CEO, Quora; Fmr. CTO, Facebook |
| 54 | Manuel Bronstein | Chief Product Officer, Roblox |
| 55 | Severin Hacker | Co-Founder & CTO, Duolingo |
| 56 | Wences Casares | Founder & Fmr. CEO, Xapo Bank |
| 57 | Immad Akhund | Founder & CEO, Mercury |
| 58 | Henry Kravis | Co-Founder, Co-Chairman, KKR |
| 59 | Pete Briger | Principal & Chairman, Fortress Investment Group |
| 60 | Peter Brown | CEO, Renaissance Technologies |
| 61 | Karen Karniol-Tambour | Co-CIO, Bridgewater Associates |
| 62 | Mike Novogratz | CEO, Galaxy Digital; Fmr. CIO, Fortress |
| 63 | Bob Jain | CIO, Millennium Management; Founder, Jain Family Institute |
| 64 | Gaurva Kapadia | Founder & CEO, XN |
| 65 | Micky Malka | Founder & Managing Partner, Ribbit Capital |
| 66 | Chamath Palihapitiya | Founder & CEO, Social Capital LP; Co-Owner, Golden State Warriors |
| 67 | Jared Kushner | Founder, Affinity Partners |
| 68 | John Arnold | Co-Chair, Arnold Ventures; Fmr. Founder, Centaurus Advisors |
| 69 | Robert Rubin | Fmr. Secretary of the Treasury; Fmr. Co-Chairman, Goldman Sachs |
| 70 | Lawrence Summers | Fmr. President, Harvard University; Fmr. Secretary of the Treasury |
| 71 | Eric Schmidt | Founder, Schmidt Futures; Fmr. CEO, Google/Alphabet |
| 72 | Susan Athey | Professor, Stanford GSB; Fmr. Chief Economist, DOJ Antitrust Division |
| 73 | Steven Pinker | Professor, Harvard University |
| 74 | Tyler Cowen | Professor, George Mason University; Director, Mercatus Center |
| 75 | Adam Grant | Organizational Psychologist, Wharton (UPenn) |
| 76 | Jonathan Haidt | Professor, NYU Stern School of Business |
| 77 | Anne-Marie Slaughter | CEO, New America; Fmr. Director of Policy Planning, State Department |
| 78 | Leonard Leo | Co-Chairman, Federalist Society |
| 79 | Grover Norquist | President, Americans for Tax Reform |
| 80 | Matt Clifford | PM's AI Opportunities Adviser (fmr.), UK; Co-Founder, Entrepreneur First; Chair, ARIA |
| 81 | Nick Thompson | CEO, The Atlantic; Fmr. Editor-in-Chief, Wired |
| 82 | Bret Stephens | Opinion Columnist, NYT; Pulitzer Prize winner |
| 83 | Tim Ferriss | Author, "4-Hour" series; Podcast host |
| 84 | Mike Cannon-Brookes | Co-Founder & Co-CEO, Atlassian |
| 85 | Marcos Galperin | Co-Founder & CEO, MercadoLibre |
| 86 | Demet Mutlu | Founder & CEO, Trendyol Group |
| 87 | Cesar Carvalho | Co-Founder & CEO, Wellhub |
| 88 | Howie Liu | Founder & CEO, Airtable |
| 89 | Scott Belsky | Partner, A24 Films; Fmr. CSO/CPO, Adobe; Founder, Behance |
| 90 | Steve Ells | Founder & Fmr. CEO, Chipotle |
| 91 | Nicolas Berggruen | Founder & President, Berggruen Holdings |
| 92 | Matt Cohler | Fmr. General Partner, Benchmark Capital |
| 93 | Will Scharf | Co-Founder & CTO, Oscar Health |
| 94 | Mario Schlosser | Staff Secretary and Assistant to the President, White House |
| 95 | Astro Teller | Captain of Moonshots, X (Google) |
| 96 | Strauss Zelnick | Chairman & CEO, Take-Two Interactive |
| 97 | Benj Pasek | Songwriter/Producer; EGOT winner |
| 98 | Drew Scott | Co-Host, Property Brothers; Co-Founder, Scott Brothers Global |
| 99 | Kim Scott | Author, "Radical Candor" |
| 100 | Rick Warren | Author, "The Purpose Driven Life"; Pastor |
| 101 | Gretchen Rubin | Author, "The Happiness Project" |
| 102 | Charles Duhigg | Author, "The Power of Habit" |
| 103 | Daniel Pink | Author, "Drive" |
| 104 | Tom Goldstein | Partner, Goldstein & Russell; Founder, SCOTUSblog |
| 105 | Neal Katyal | Partner, Milbank; Fmr. Supreme Court Practice Leader, Hogan Lovells |
| 106 | Garry Kasparov | Fmr. World Chess Champion; Russian opposition figure |
| 107 | Atul Gawande | Author, "Being Mortal"; Fmr. Assistant Administrator, USAID Global Health |
| 108 | Bob Cialdini | Author, "Influence" |
| 109 | John Townsend | Author, "Boundaries" |
| 110 | Tim Urban | Writer, Wait But Why |
| 111 | Thasunda Brown Duckett | President & CEO, TIAA |
| 112 | Vas Narasimhan | CEO, Novartis |
| 113 | Elizabeth Blackburn | Fmr. President, Salk Institute; Nobel Prize laureate |

**Rows 114–116 and 123 — needs_review status:**

| # | Name | Issue |
|---|---|---|
| 114 | Peter Attia | Appears in section 3 table beyond row 113; may be in directory or may be 222-only |
| 115 | Caroline Cochran | Same as above |
| 116 | Scooter Braun | Same as above |
| 123 | Souad Mekhennet | Listed as session moderator; directory vs 222-only status unconfirmed |

---

## Part 4: Additional Registrants — 222-Person List Only

**Evidence class:** `primary_public`  
**Source:** Wired June 16 2026 / Airtable database  
**Predicate:** `registered-for`  
**Object:** Dialog Global 2026, Dublin  
**UI weight:** 3  
**Note:** These names are confirmed in the 222-person registration list but NOT in the 113-name public directory.

| Name | Title / Affiliation |
|---|---|
| Hallie Hoffman | Fmr. General Counsel & Acting Chief of Staff, DEA |
| Randy Kroszner | Fmr. Federal Reserve Governor; Bank of England Financial Policy Committee |
| Jonathan Greenblatt | CEO, Anti-Defamation League |
| Peter Goettler | President, Cato Institute |
| Ryan Stowers | Executive Director, Charles Koch Foundation |
| Roger Myerson | Nobel Laureate Economist, University of Chicago |

**Additional names confirmed by Forbes (June 18 2026) — `reported` evidence class:**

| Name | Note |
|---|---|
| Barry Sternlicht | Founder, Starwood Capital — appears in Forbes billionaire table; not in 113 directory |
| Robert Rubin | Also in 113 directory (#69) |
| Lawrence Summers | Also in 113 directory (#70) |

---

## Part 5: Pakistan Delegation — November 2025

**Evidence class:** `reported`  
**Source:** Wired June 16 2026 (leaked Airtable / internal documents)  
**Predicate:** `attended`  
**Object:** Dialog Pakistan delegation, meeting with FM Aurangzeb, November 2025  
**UI weight:** 2

| Name | Primary Affiliation |
|---|---|
| Ali Jehangir Siddiqui | Board Chair, OnZero; Fmr. Ambassador of Pakistan to US; Fmr. Ambassador-at-Large for Foreign Investment |
| Simon Stevens | (Lord Stevens of Birmingham; Fmr. CEO, NHS England) |
| Veit Dengler | Media/publishing executive |
| Yasmin Green | Director, ADL (**cross-surface hit:** also `director-of` ADL per 990 filing) |
| Fatima Kardar | VP, Xbox (Microsoft) — also in 113 directory (#49) |
| Shadi Martini | Executive |
| Evan Marwell | Founder, EducationSuperHighway |
| Himanshu Gulati | MP, Norway (Fremskrittspartiet) |

---

## Part 6: Dialog — Leadership and Organizational Edges

**All `official` or `primary_public` evidence class unless noted.**

| Person | Predicate | Object | Evidence Class | Source |
|---|---|---|---|---|
| Peter Thiel | `co-founded` | Dialog | primary_public | Wired / Wikipedia |
| Auren Hoffman | `co-founded` | Dialog | primary_public | Wired / Wikipedia |
| Auren Hoffman | `chairs` | Dialog | primary_public | Wired / Wikipedia |
| Raffi Grinberg | `executive-director-of` | Dialog | primary_public | LinkedIn / Wired |
| Auren Hoffman | `founded` | Rapleaf | primary_public | Wikipedia |
| Auren Hoffman | `founded` | LiveRamp | primary_public | Wikipedia |
| Auren Hoffman | `sold` | LiveRamp → Acxiom ($310M, May 2014) | primary_public | Wikipedia |
| Auren Hoffman | `founded-and-chaired` | SafeGraph | primary_public | Wikipedia |
| Auren Hoffman | `board-member-of` | Datavant (since 2019) | primary_public | Wikipedia |
| Auren Hoffman | `chairs` | Siftery | primary_public | Wikipedia |
| Auren Hoffman | `CEO-of` | NQB8 | primary_public | Wikipedia |
| Peter Thiel | `co-founded` | Palantir | primary_public | Public record |
| Peter Thiel | `co-founded` | PayPal | primary_public | Public record |
| Peter Thiel | `managing-partner-of` | Founders Fund | primary_public | Public record |
| Peter Thiel | `first-outside-board-member` | Facebook | primary_public | Public record |
| Joe Lonsdale | `co-founded` | Palantir | primary_public | Public record |
| Joe Lonsdale | `early-executive-at` | Clarium Capital (Thiel) | primary_public | Public record |
| Joe Lonsdale | `founded` | 8VC | primary_public | Public record |
| Joe Lonsdale | `co-founded` | Addepar | primary_public | Public record |
| Reid Hoffman | `co-founded` | LinkedIn | primary_public | Public record |
| Reid Hoffman | `partner-at` | Greylock | primary_public | Public record |
| Reid Hoffman | `early-investor-in` | Facebook | primary_public | Public record |
| Reid Hoffman | `arranged` | Peter Thiel introduction to Facebook | primary_public | Public record |
| Reid Hoffman | `director-of` | New America | primary_public | ProPublica 990 |
| Adam D'Angelo | `co-founded` | Quora | primary_public | Public record |
| Adam D'Angelo | `first-CTO-of` | Facebook | primary_public | Public record |

---

## Part 7: Typed Organizational Edges — State and Procurement Surface

### Palantir

| Predicate | Object | Amount | Date | Evidence Class | Source |
|---|---|---|---|---|---|
| `awarded` | Pentagon Maven Smart System prototype | $480M | May 2024 | reported | Reuters / public reporting |
| `program-of-record` | Pentagon Maven Smart System | — | March 2026 | reported | Reuters |
| `enterprise-agreement` | U.S. Army (consolidating dozens of software contracts) | up to $10B / 10yr | 2025 | reported | Public reporting |
| `supplied-to` | NATO Allied Command Operations (Maven Smart System NATO) | — | 2025 | reported | Public reporting |
| `retained-lobbyist` | Ballard Partners | — | — | reported | Public reporting (LDA pull pending) |

### SafeGraph / Veraset

| Predicate | Object | Date | Evidence Class | Source |
|---|---|---|---|---|
| `sold-data-to` | U.S. government agencies (device-level location data) | 2018–2020 | reported | EFF |
| `banned-from` | Google Android Play marketplace | August 2021 | reported | Public reporting |
| `sold-data-re` | abortion clinic visitors | May 2022 | reported | Motherboard/Vice |
| `awarded` | AFWERX contract, U.S. Air Force | undated | reported | Public reporting |

### SpaceX

| Predicate | Object | Amount | Date | Evidence Class | Source |
|---|---|---|---|---|---|
| `awarded` | Space Force Space Data Network Backbone contract | $2.29B | — | reported | Public reporting |
| `NASA-HLS-contractor` | NASA Human Landing System (lunar) | — | — | reported | Public reporting |
| `lobbyist-Mat-Dunn` | pushed to eliminate National Space Council | — | — | reported | Reuters (LDA pull pending) |

### Groq

| Predicate | Object | Amount | Date | Evidence Class | Source |
|---|---|---|---|---|---|
| `UK-datacenter` | London data centre (UK govt AI investment announcement) | ~£100M | June 2025 | reported | Public reporting |
| `participant-in` | DOE Genesis Mission (advanced AI chips for national scientific/security initiative) | — | December 2025 | reported | Reuters |

### PsiQuantum

| Predicate | Object | Amount | Date | Evidence Class | Source |
|---|---|---|---|---|---|
| `received-investment-from` | Australia federal + Queensland governments (Brisbane/Petrie utility-scale quantum) | ~A$940M combined | — | reported | Public reporting |
| `UK-RnD-facility` | UK R&D facility with UK government support | — | — | reported | Public reporting |
| `partnership-with` | U.S. Department of Energy (refrigeration technology) | — | — | reported | Public reporting |

### Oklo

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `regulatory-surface` | DOE / NRC / Idaho National Laboratory | reported | Public reporting |
| `advanced-reactor-pathway` | DOE deployment pathway | reported | Public reporting |

### Neuralink

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `FDA-designation` | Breakthrough Device designation | reported | Public reporting |
| `director-of` | Shivon Zilis | primary_public | Public record |

---

## Part 8: Nonprofit Layer — Financials and Officers

**Source:** ProPublica Nonprofit Explorer / IRS filings  
**Evidence class:** `primary_public`  
**Note:** Schedule I grant-recipient data not yet extracted — these are summary-level only.

### Charles Koch Foundation (501c3)

| Field | Value |
|---|---|
| 2024 Revenue | $208,231 |
| 2024 Expenses | $67,934,289 |
| 2024 Net Assets | $755,640,593 |
| 2024 Charitable Disbursements | $67,819,528 |
| Executive Director | Ryan Stowers (outgoing) |
| Chairman | Charles Koch |

Typed edges: `executive-director-of` (Ryan Stowers → Charles Koch Foundation), `chair-of` (Charles Koch → Charles Koch Foundation)

### Berggruen Institute (501c3)

| Field | Value |
|---|---|
| 2024 Revenue | $10,809,541 |
| 2024 Expenses | $15,311,525 |
| 2024 Net Assets | $5,258,198 |
| Chairman | Nicolas Berggruen |
| VP | Nils Gilman |
| VP | Dawn Nakagawa |
| Board includes | Arianna Huffington, Ernesto Zedillo, Mohamed El-Erian, Nathan Gardels |

Typed edges: `chair-of` (Nicolas Berggruen → Berggruen Institute), `VP-of` (Nils Gilman, Dawn Nakagawa)

### New America Foundation (501c3)

| Field | Value |
|---|---|
| 2024 Revenue | $37,233,867 |
| 2024 Expenses | $41,339,553 |
| 2024 Net Assets | $52,313,851 |
| CEO | Anne-Marie Slaughter |
| Chair (from May 2024) | Sally Osberg |
| Director | Reid Hoffman |

Typed edges: `CEO-of` (Anne-Marie Slaughter → New America), `director-of` (Reid Hoffman → New America)

### ADL — Anti-Defamation League (501c3)

| Field | Value |
|---|---|
| 2025 Filing Revenue | $135,300,377 |
| 2025 Filing Expenses | $128,163,819 |
| 2025 Filing Net Assets | $50,454,946 |
| CEO / National Director | Jonathan Greenblatt |
| Director | Yasmin Green (**cross-surface: Pakistan delegation attendee**) |

Typed edges: `CEO-of` (Jonathan Greenblatt → ADL), `director-of` (Yasmin Green → ADL)

### Mercatus Center (501c3)

| Field | Value |
|---|---|
| 2024 Revenue | ~$39.3M (reported) |
| Executive Director | Benjamin Klutsey |
| Board Chair | Tyler Cowen |

Typed edges: `board-chair-of` (Tyler Cowen → Mercatus Center), `executive-director-of` (Benjamin Klutsey → Mercatus Center)

### Federalist Society (501c3)

| Field | Value |
|---|---|
| FY2024 Revenue | ~$22.5M (reported) |
| President & CEO | Sheldon Gilbert |
| Co-Chairman | Leonard Leo |

Typed edges: `co-chairman-of` (Leonard Leo → Federalist Society), `president-CEO-of` (Sheldon Gilbert → Federalist Society)

### Americans for Tax Reform (501c4 — not 501c3)

| Field | Value |
|---|---|
| President | Grover Norquist |
| Legal type | 501(c)(4) — advocacy, not charitable foundation |

**Schema note:** Type differently from 501(c)(3) foundations in the database. `501c4` orgs are advocacy entities; render separately from grantmaking foundations.

### Arnold Ventures

**Schema note:** Arnold Ventures is structured as an **LLC**, not a standard 501(c)(3). 990 history exists under the prior "Laura and John Arnold Foundation" entity. Current umbrella is a different legal container. Do not conflate. File separately and note the structural distinction.

### Jain Family Institute

**Status:** Financials and officers not yet retrieved. Node exists via Bob Jain (`founded`, primary_public). Pull IRS/ProPublica in next pass.

---

## Part 9: VC and Capital Layer

**Evidence class:** `reported` unless noted. SEC Form D row-level data not yet pulled — amounts below are press-sourced estimates. Pull EDGAR for filed dates, issuer entities, and offering amounts before publishing fund-size edges at UI weight 1-2.

| Fund | Person | Predicate | Notes |
|---|---|---|---|
| 8VC | Joe Lonsdale | `founded` | ~$6B AUM (2023, press estimate) |
| 8VC | Jake Medwell | `co-founded` | — |
| Founders Fund | Peter Thiel | `managing-partner-of` | — |
| Greylock | Reid Hoffman | `partner-at` | — |
| Fortress Investment Group | Pete Briger | `principal-and-chair-of` | — |
| Galaxy Digital | Mike Novogratz | `CEO-of` | Fmr. CIO, Fortress |
| Millennium Management | Bob Jain | `CIO-of` | — |
| Ribbit Capital | Micky Malka | `founded` | — |
| Social Capital LP | Chamath Palihapitiya | `founder-CEO-of` | — |
| Affinity Partners | Jared Kushner | `founded` | 2021 |
| Affinity Partners | Qatar Investment Authority | `invested-in` | reported |
| Affinity Partners | Lunate (Abu Dhabi) | `invested-in` | reported |
| Affinity Partners | Saudi Arabia | `invested-in` | $2B reported by congressional investigators |
| Affinity Partners | AUM $4.8B | — | end of 2024, Reuters March 2025 |
| Benchmark | Matt Cohler | `fmr-general-partner-of` | — |
| XN | Gaurva Kapadia | `founder-CEO-of` | — |
| Ribbit Capital | Micky Malka | `founded` | — |

**Saudi layer:**

| Entity | Predicate | Object | Evidence Class | Source |
|---|---|---|---|---|
| Saudi Public Investment Fund | `AUM` | $900B+ / 220+ portfolio companies | primary_public | PIF website |

**Kuwait layer — split correctly:**

| Entity | Type | Person | Note |
|---|---|---|---|
| Kuwait Investment Authority | Sovereign wealth fund (first in world, per KIA) | — | Capital node; separate from KPC |
| Kuwait Petroleum Corporation | State-owned national oil company | Sheikh Nawaf Saud Nasir Al-Sabah (CEO) | Industrial node |

---

## Part 10: Non-US State Layer

### EU / Kaja Kallas

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `VP-of` | European Commission | official | EC website |
| `responsible-for` | European Defence Union | official | EC website |
| `responsible-for` | cyber and hybrid attack response | official | EC website |
| `responsible-for` | neighbourhood policy | official | EC website |
| `fmr-PM-of` | Estonia | official | Public record |

### Japan / Tarō Kōno

**Correction flag:** Kōno is **former** digital minister. Current Digital Agency minister is Matsumoto Hisashi. All Kōno edges must use `former_minister_of` not current officeholder. Live state access inference requires separate sourcing.

| Predicate | Object | Evidence Class |
|---|---|---|
| `fmr-digital-minister-of` | Japan | official |
| `fmr-defense-minister-of` | Japan | official |
| `fmr-foreign-minister-of` | Japan | official |

### Pakistan / Ali Jehangir Siddiqui

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `fmr-ambassador-of` | Pakistan to United States | official | Public record |
| `fmr-ambassador-at-large-for` | Foreign Investment, Pakistan | official | Public record |
| `board-chair-of` | OnZero | primary_public | Public record |
| `attended` | Dialog Pakistan delegation (FM Aurangzeb meeting) | reported | Wired |

---

## Part 11: Conflict-of-Interest Matrix (Direct Claim Pairs)

**Evidence class:** `reported`  
**Source:** Wired June 16 2026 / Novara Media analysis  
**UI weight:** 2  
**Note:** These are co-presence + structural oversight observations, not proven coordination. Label clearly in UI.

### Data broker / regulatory oversight collisions

| Actor A | Actor B | Structural Overlap |
|---|---|---|
| Auren Hoffman (SafeGraph, LiveRamp) | Scott Bessent (Treasury Secretary) | Treasury writes financial data rules |
| Auren Hoffman (SafeGraph, LiveRamp) | Ted Cruz (Chair, Commerce/Science/Transportation) | Committee oversees FTC data-privacy authority |
| Joe Lonsdale (Palantir co-founder) | Dan Driscoll (Army Secretary) | Palantir runs Pentagon data fusion |
| Joe Lonsdale (Palantir co-founder) | Jim Himes (Ranking Member, House Intelligence) | Oversees agencies Palantir contracts with |
| Joe Lonsdale (Palantir co-founder) | Lisa Monaco (Fmr. DAG) | DOJ oversight of Palantir contracts |
| Eric Schmidt (Google/Alphabet) | Multiple officials | Antitrust, AI regulation |
| Elon Musk (SpaceX, Tesla, X, Neuralink) | Multiple officials | Defense contracts, FAA, FCC, SEC |

### Defense contractor / military command collisions

| Contractor | Military Official | Relationship |
|---|---|---|
| Palantir (Lonsdale/Thiel) | Alexus Grynkewich (NATO SACEUR) | Palantir runs NATO/allied command data (Maven Smart System NATO) |
| SpaceX (Musk) | Alexus Grynkewich (NATO SACEUR) | Starlink in Ukraine/NATO operations |
| Neuralink (Musk/Zilis) | Dan Driscoll (Army Secretary) | BCI military applications |

### Foreign government / U.S. policy collisions

| Foreign Actor | U.S. Official Present | Overlap |
|---|---|---|
| Turki Al Faisal (Fmr. Saudi Intel Chief) | Scott Bessent, Ted Cruz | Saudi investments, defense, oil |
| Reema Al-Saud (Saudi Ambassador) | Multiple | Saudi-U.S. relations |
| Sheikh Nawaf Al-Sabah (Kuwait Petroleum CEO) | Scott Bessent | Oil markets, energy policy |
| Kaja Kallas (EU Commission VP) | Multiple | EU tech regulation, NATO |
| Tarō Kōno (Fmr. Japan Digital/Defense) | Multiple | Indo-Pacific security, tech |
| Jens Spahn (German MP/Health) | Multiple | Health policy, EU relations |
| Shahid Khaqan Abbasi (Fmr. Pak PM) | Multiple | South Asia policy |

---

## Part 12: Umbrella Map

Umbrella nodes are **contexts**, not accusations. A topology match is not a direct relationship claim. Render umbrella paths with `TOPOLOGY MATCH — not a direct evidence path` label in UI.

**Umbrella membership types:** `policy-spine` / `delivery-layer` / `capital-layer` / `procurement-layer` / `infrastructure-layer` / `regulatory-layer` / `convening-layer` / `defence-layer` / `data-layer` / `sovereignty-layer`

| ID | Umbrella Label | Description |
|---|---|---|
| U01 | Dialog / off-record elite convening | Annual invitation-only retreat with no-attribution rule; 222+ registrants 2026 |
| U02 | Founder-to-state pipeline | Mechanism by which founders, investors, and accelerators move into advisory, procurement, or strategic-infrastructure roles |
| U03 | UK AI adoption doctrine | Action Plan recommendations: compute, data, talent, procurement, national champions |
| U04 | No. 10 / DSIT / Cabinet Office delivery layer | Implementation machinery for UK AI policy; AI Opportunities Unit; digital centre of government |
| U05 | Public-sector AI procurement | Government-as-customer thesis; AI procurement reform; state spending as market lever |
| U06 | Defence autonomy and future combat systems | Battlefield AI, autonomous systems, next-generation combat doctrine |
| U07 | AUKUS / FCAS / sovereign industrial base | Trilateral advanced-capability programs; defence-industrial sovereignty |
| U08 | Data infrastructure and identity resolution | Data brokerage, identity resolution, synthetic populations, audience modelling |
| U09 | Synthetic populations and audience modelling | Downstream of U08; policy simulation, targeting infrastructure |
| U10 | Green finance / transition-finance market plumbing | Sovereign transition finance, ESG infrastructure, carbon market mechanics |
| U11 | Subsurface infrastructure and sensing | Physical sovereignty layer; subsurface sensing, cabling, monitoring |
| U12 | Test-and-validation infrastructure | T&V sites, ranges, certification pathways for advanced systems |
| U13 | Philanthropy / think tank / policy laundering layer | 501c3/c4 funding flows, grant-to-policy pipelines, revolving door |
| U14 | Venture capital / frontier tech funding layer | VC funds, SPACs, sovereign wealth co-investment in frontier technology |

### Sample umbrella memberships (ready to insert)

| Entity | Umbrella | Membership Type | Evidence Class | Notes |
|---|---|---|---|---|
| Matt Clifford | U03 | policy-spine | official | authored Action Plan |
| Matt Clifford | U04 | delivery-layer | official | No. 10 advisory appointment |
| Matt Clifford | U02 | policy-spine | official | EF founder + government advisory |
| ARIA | U03 | delivery-layer | official | R&D institution |
| UK Sovereign AI Unit | U03 | delivery-layer | reported | Implements Action Plan compute recommendation |
| UK Sovereign AI Unit | U05 | procurement-layer | reported | Fast visas, compute access, procurement pathway |
| Palantir | U06 | procurement-layer | reported | Maven Smart System, Army enterprise agreement |
| Palantir | U05 | procurement-layer | reported | Pentagon operating layer |
| SafeGraph | U08 | data-layer | reported | Govt location data sales 2018–2020, AFWERX |
| PsiQuantum | U07 | infrastructure-layer | reported | Australia/UK/US trilateral positioning |
| Groq | U05 | procurement-layer | reported | DOE Genesis Mission, UK datacenter |
| All 123 Dialog entries | U01 | convening-layer | primary_public | listed-in-directory |
| All 8 Pakistan delegation | U01 | convening-layer | reported | attended Dialog Pakistan delegation |
| Arnold Ventures | U13 | capital-layer | primary_public | grantmaking LLC |
| Charles Koch Foundation | U13 | capital-layer | primary_public | 990 filing |
| New America | U13 | capital-layer | primary_public | 990 filing |
| Federalist Society | U13 | capital-layer | primary_public | 990 filing |
| Mercatus Center | U13 | capital-layer | primary_public | 990 filing |
| ADL | U13 | capital-layer | primary_public | 990 filing |
| 8VC | U14 | capital-layer | reported | Lonsdale-founded VC |
| Founders Fund | U14 | capital-layer | primary_public | Thiel |
| Affinity Partners | U14 | capital-layer | reported | Kushner; Saudi/Gulf sovereign co-investment |
| Saudi PIF | U14 | capital-layer | primary_public | $900B+ AUM |

---

## Part 13: What's Still Open (Do Not Import Without Further Sourcing)

These items exist as leads in the research passes but are not yet backed by row-level primary sources. Import as `evidence_class: open`, `ui_weight: 4`, `public: false` until resolved.

| Item | What's Missing | Source to Pull |
|---|---|---|
| Senate LDA filings — Palantir, SpaceX, Meta, Google, Walmart | Row-level registration records, lobbyist names, agencies contacted, spend amounts | lda.senate.gov API (API key required) |
| FARA registrations | Foreign agent filings for any relevant registrants | DOJ FARA public search (no API documented) |
| SEC Form D — 8VC, Ribbit, Greylock, Fortress, Benchmark, Social Capital, Affinity (detailed) | Issuer entities, fund names, first sale dates, offering amounts, related persons/GP names | data.sec.gov submissions API (no auth, 10 req/sec) |
| 990 Schedule I — grant recipients | Who Koch Foundation, Berggruen, New America, ADL, Mercatus, Federalist Society gave money to | IRS bulk download / ProPublica Schedule I |
| Jain Family Institute | Financials, officers, EIN | IRS / ProPublica |
| Arnold Ventures LLC | Current legal container vs Laura and John Arnold Foundation 990 history | IRS + entity registry |
| Companies House — Clifford, EF, ARIA-adjacent | Director-of, PSC-of, filing history | Companies House Developer API (auth required) |
| Find a Tender / Contracts Finder | UK procurement notices, suppliers, buyers | Find a Tender OCDS API / data.gov.uk |
| USAspending / SAM — Palantir, SpaceX, Groq, PsiQuantum, Oklo, Neuralink | Award IDs, amounts, agencies, dates | USAspending API (no auth) / SAM API (API key required) |
| Cradle Infrastructure / Joseph Mayhew | No public registry or procurement trail confirmed; only uploaded profile material in hand | Companies House search; UK procurement transparency |
| Kallas EU Commission portfolio detail | Portfolio specifics beyond defence/cyber/neighbourhood | EC website (official) |
| Non-US lobbying / government contacts | UK Register of Consultant Lobbyists; TED (EU procurement) | UK Gov / TED API |
| Clifford co-authored documents | Full bibliography beyond Action Plan and arXiv papers | GOV.UK / arXiv |

---

## Part 14: Source Index

| # | Source | Date | Type | Evidence Class |
|---|---|---|---|---|
| S01 | Wired — "Leak Exposes Members of Peter Thiel's Secretive 'Dialog' Society" | June 16 2026 | Investigative journalism | reported |
| S02 | Forbes — "What We Know About Peter Thiel's Secret Society 'Dialog'" | June 18 2026 | Journalism | reported |
| S03 | Wikipedia — "Dialog (organization)" | Updated June 18 2026 | Secondary | reported |
| S04 | Straight Arrow News — "Peter Thiel's Dialog network was super-secret" | June 18 2026 | Journalism | reported |
| S05 | Novara Media — "Peter Thiel's Super-Secret Society Exposed" | June 17 2026 | Journalism | reported |
| S06 | RTE Ireland — "Senator among six Irish on invite list" | June 18 2026 | Journalism | reported |
| S07 | Stanford Daily — Dialog coverage | June 2026 | Journalism | reported |
| S08 | Axios — "Dialog plans D.C.-area campus" | August 7 2025 | Journalism | reported |
| S09 | Semafor — "Private club founded by Peter Thiel, Auren Hoffman eyes campus near DC" | August 8 2025 | Journalism | reported |
| S10 | Bluesky @crimew.gay | June 2026 | Primary leak surface | reported |
| S11 | Andrew Gelman blog — 2022 Dialog invitation | 2022 | Personal account | reported |
| S12 | GOV.UK — AI Opportunities Action Plan | 2025-01-13 | Official government | official |
| S13 | GOV.UK — Appointment of Matt Clifford CBE as AI Opportunities Adviser | 2025 | Official government | official |
| S14 | GOV.UK — ARIA inaugural chair appointment | 2022-07-19 | Official government | official |
| S15 | ProPublica Nonprofit Explorer — Charles Koch Foundation | 2024 filing | Primary public | primary_public |
| S16 | ProPublica Nonprofit Explorer — Berggruen Institute | 2024 filing | Primary public | primary_public |
| S17 | ProPublica Nonprofit Explorer — New America Foundation | 2024 filing | Primary public | primary_public |
| S18 | ProPublica Nonprofit Explorer — ADL | 2025 filing | Primary public | primary_public |
| S19 | ProPublica Nonprofit Explorer — Mercatus Center | 2024 filing | Primary public | primary_public |
| S20 | ProPublica Nonprofit Explorer — Federalist Society | 2024 filing | Primary public | primary_public |
| S21 | Reuters — Palantir Maven Pentagon program of record | March 2026 | Journalism | reported |
| S22 | Reuters — Affinity Partners AUM / Gulf investment | March 2025 | Journalism | reported |
| S23 | EFF — SafeGraph/Veraset government sales | 2021 | Journalism/advocacy | reported |
| S24 | Motherboard/Vice — SafeGraph abortion clinic data | May 2022 | Journalism | reported |
| S25 | EC website — Kaja Kallas portfolio | Current | Official | official |
| S26 | Japan Digital Agency website | Current | Official | official |
| S27 | Saudi PIF website — AUM | Current | Primary public | primary_public |
| S28 | dialog.org HTML source (now removed) | June 2026 | Primary source | primary_public |
| S29 | DOJ Epstein files (2014 retreat invite — note: "Jeff Epstein" = Oracle CFO, NOT sex trafficker, per Wired correction) | 2014/2026 | Official (with correction) | reported |
