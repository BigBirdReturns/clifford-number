# Clifford Number — Master Database Population Document

**Generated:** 2026-06-28 (v3 — consolidated)  
**Sources:** Dialog raw dump (crimew/Wired, June 16 2026), deep research passes 26–35, Executive Summary, Editorial Strategy  
**Status:** Pre-import reference — all claims typed, sourced, and evidence-classed  
**Version:** 3

---

## Surface-Hop Compiler Law

This document remains the raw research master. It is not itself the hop graph. The surface-hop compiler parses it into review artifacts, then the maintainer promotes bounded surfaces and participation rows into `data/ledger/`.

A Clifford Number hop requires a bounded surface with explicit actor participation. Broad institutions, offices, agencies, policy areas, organizations, or concepts do not create hops by themselves. No. 10, Cabinet Office, DSIT, ARIA, News UK, Faculty, and Electric Twin are venues or organizations unless a named surface inside them is defined.

Surface-type recurrence is a first-class discovery object. The compiler tracks when the same bounded logic recurs across policy, commercial, media, procurement, category, board, funding, or advisory venues.

---

## How to read this document

Every entity, edge, and umbrella membership is written as a discrete, falsifiable claim. Three fields matter for every row:

- `predicate` — the specific typed relationship (never "associated with")
- `evidence_class` — `official` / `primary_public` / `reported` / `derived` / `open`
- `ui_weight` — 1 (full opacity) / 2 (expandable) / 3 (hover only) / 4 (off by default in public view)

Umbrella paths render differently from direct claim paths. A topology match is not a direct relationship claim.

### Three camouflage mechanisms (methodological frame)

The graph exists because the public record is partitioned in ways that let coordination hide in plain sight. Three mechanisms explain why:

- **Mission mismatch** — organizations present civilian, consumer, or broadly public-interest missions while formal roles connect them to defense modernization. Meta says it builds "the future of human connection." The Army says Detachment 201 helps the force become "leaner, smarter, and more lethal." Both are true. Neither audience sees the other frame.
- **Bio gap** — the most legible public biographies omit a second institutional role that changes how the first is understood. Bosworth's Meta leadership page says CTO. The Army's announcement says Lt. Colonel.
- **Procurement invisibility** — federal spending records are public but do not surface all relevant relationships in one place. USAspending acknowledges subaward tracking limits. GAO has found repeated visibility problems around OTAs, consortium firms, and DOD outcome tracking. The visibility problem is endogenous to the systems.

### Confidence/publication tiers

| Tier | What it proves | Status |
|---|---|---|
| High — Detachment 201 | Formal Army Reserve coordination layer, named individuals, official Army source | Publish first |
| High-to-medium — bio gap reveals | Public bios omit second institutional role | Publish with primary-source support |
| Medium — procurement/awards layer | Operational consequences of the personnel links | Publish after award-path verification |
| Medium pending — 990/Form D layer | Entity design, financing, related-party architecture | Hold until extraction complete |
| Low — Cluster I nodes | Hypothesis-generating; not yet publication-grade | Internal only until upgraded |

---

## Part 1: Anchor Node

### Matt Clifford

| Predicate | Object | Date | Evidence Class | Source | UI Weight |
|---|---|---|---|---|---|
| `co-founded` | Entrepreneur First | ~2011 | primary_public | EF public record | 1 |
| `co-founded` | Entrepreneur First (with Alice Bentinck) | ~2011 | primary_public | EF website | 1 |
| `co-authored` | "How to Be a Founder" (with Alice Bentinck) | — | primary_public | EF website / publisher record | 1 |
| `chair-of` | Entrepreneur First | current | primary_public | EF website | 1 |
| `commissioned-to-author` | AI Opportunities Action Plan | July 2024 | official | GOV.UK / Peter Kyle foreword | 1 |
| `authored` | AI Opportunities Action Plan | 2025-01-13 | official | GOV.UK publications | 1 |
| `appointed-as` | Prime Minister's AI Opportunities Adviser | 2025-01-13 | official | GOV.UK: "Appointment of Matt Clifford CBE as the AI Opportunities Adviser" | 1 |
| `reported-to` | Prime Minister + DSIT Secretary of State | 2025 | official | GOV.UK appointment notice | 1 |
| `chair-of` | ARIA (Advanced Research and Invention Agency) | 2022-07-19 | official | GOV.UK announcement | 1 |
| `vice-chair-of` | UK AI Safety Institute Advisory Board | ~2023 | primary_public | ARIA governance page | 1 |
| `represented-PM-at` | AI Safety Summit 2023 | 2023 | primary_public | ARIA governance page | 2 |
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
| `recommends` | 20x expansion of AI Research Resource by 2030 | official | Action Plan text |
| `recommends` | AI Growth Zones | official | Action Plan text |
| `recommends` | government as strategic AI customer | official | Action Plan text |
| `recommends` | National Data Library | official | Action Plan text |
| `recommends` | procurement reform | official | Action Plan text |
| `recommends` | domestic AI national champions | official | Action Plan text |
| `recommends` | compute allocation modeled on DARPA and ARIA | official | Action Plan text |
| `recommends` | deeper collaboration with national security community | official | Action Plan text |
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
|---|---|---|---|---|
| `inaugural-chair` | Matt Clifford | 2022-07-19 | official | GOV.UK announcement |
| `inaugural-CEO` | Ilan Gur | 2022-07-19 | official | GOV.UK announcement |
| `board-member` | Max Jaderberg (President, Isomorphic Labs) | — | primary_public | ARIA governance page |
| `external-adviser` | Demis Hassabis | — | primary_public | ARIA governance page |
| `sponsored-by` | DSIT | — | official | ARIA website |
| `type` | Non-departmental public body | — | official | ARIA website |

### Entrepreneur First (Org node)

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `co-founded-by` | Matt Clifford | primary_public | EF website |
| `co-founded-by` | Alice Bentinck | primary_public | EF website |
| `current-CEO` | Alice Bentinck | primary_public | EF website |
| `current-chair` | Matt Clifford | primary_public | EF website |
| `portfolio-value` | $16B+ (combined) | primary_public | EF website |
| `portfolio-companies` | 600+ | primary_public | EF website |
| `investor` | Reid Hoffman | primary_public | EF website |
| `investor` | Eric Schmidt | primary_public | EF website |
| `investor` | Demis Hassabis | primary_public | EF website |
| `recent-adviser` | Adam D'Angelo | primary_public | EF website |
| `recent-adviser` | Eric Schmidt | primary_public | EF website |
| `recent-adviser` | Demis Hassabis | primary_public | EF website |
| `recent-adviser` | Charlie Songhurst | primary_public | EF website |
| `recent-adviser` | Matt Cohler | primary_public | EF website |

**Note on EF adviser categorization:** Reid Hoffman appears in the investor bucket and as a featured fireside-chat guest; D'Angelo and Schmidt appear in the "recent advisors and speakers" bucket. These are distinct predicates — do not collapse into a single `adviser-of` edge.

### EF Portfolio — Defense and Procurement Adjacent (Org nodes)

**Evidence class:** `primary_public` — Source: EF portfolio page

| Company | EF Description | Umbrella |
|---|---|---|
| Omnea | "Effortless procurement automation" | U05 Public-sector AI procurement |
| Hadean | "Helps defence forces, government agencies and businesses to plan, train and make faster, better decisions" | U06 Defence autonomy |
| Permutive | "Rebuilding data in advertising to protect privacy" | U08 Data infrastructure |
| Intropic | "Data refineries for investment management firms" | U08 Data infrastructure |

---

## Part 3: Detachment 201 / Executive Innovation Corps

**Source:** U.S. Army Public Affairs announcements  
**Evidence class:** `official`  
**UI weight:** 1  

This is the highest-confidence cross-firm coordination surface in the graph. The Army itself created it, named the participants, and described the program's military modernization purpose.

### Organization node

| Field | Value |
|---|---|
| Unit name | Detachment 201, Executive Innovation Corps |
| Component | U.S. Army Reserve |
| Launch | June 13, 2025 (Army press release) |
| Second cohort | June 10, 2026 (Army press release) |
| Purpose (Army's own language) | "Bring private-sector know-how into uniform to help the Army become leaner, smarter, and more lethal" |
| Direct commission timeline | ~6 months (modernized from 18+ months) |

### Named Lt. Colonels — Inaugural cohort

| Person | Civilian Role | Company | Evidence Class | Source |
|---|---|---|---|---|
| Shyam Sankar | Chief Technology Officer & EVP | Palantir | official | Army press release + Palantir proxy statement |
| Andrew "Boz" Bosworth | Chief Technology Officer | Meta | official | Army press release + Meta leadership page |
| Kevin Weil | Chief Product Officer | OpenAI | official | Army press release + OpenAI announcement |
| Bob McGrew | Fmr. Chief Research Officer; then adviser | OpenAI / Thinking Machines Lab | official | Army press release |

### Documented influence areas (Army's own description, June 2026)

- Munitions supply chain data analysis
- Organic Industrial Base investments
- Autonomous systems (foundational strategy)
- Counter-drone strategy

### Cross-firm edges this creates

| Edge | Predicate | Type | Evidence Class |
|---|---|---|---|
| Shyam Sankar ↔ Andrew Bosworth ↔ Kevin Weil ↔ Bob McGrew | `commissioned-into-same-unit` | Detachment 201 | official |
| Palantir ↔ Meta ↔ OpenAI | `executives-share-army-reserve-unit` | Institutional co-presence | official |

### Bio gap matrix for Detachment 201 principals

| Person | Public Bio (most visible) | Missing from public bio |
|---|---|---|
| Andrew Bosworth | Meta CTO, Reality Labs | Army Reserve Lt. Colonel, Detachment 201 |
| Shyam Sankar | Palantir CTO & EVP | Army Reserve Lt. Colonel, Detachment 201 |
| Kevin Weil | OpenAI CPO | Army Reserve Lt. Colonel, Detachment 201 |

### Surrounding corporate context (same period)

| Company | Development | Evidence Class | Source |
|---|---|---|---|
| OpenAI | ChatGPT Gov launched for U.S. agencies | reported | Public reporting |
| OpenAI | DoD contract, $200M ceiling, frontier AI for program/acquisition data analysis and cyber defense | reported | Public reporting |
| Palantir | Maven program of record, Army enterprise agreement up to $10B/10yr | reported | Reuters |
| Meta | 2025 partnership with Anduril — integrated XR products for warfighters | reported | Public reporting |

---

## Part 4: Missing CEO/Founder Nodes (Priority Queue)

These are the highest-priority additions — people who close structural holes between already-populated nodes and institutions with state, regulatory, or capital-market weight. All claims are from public record; no additional research passes required.

| Person | Predicate | Object | Evidence Class | Priority Reason |
|---|---|---|---|---|
| Alex Karp | `co-founded` | Palantir | primary_public | Palantir CEO; central to every contract edge in graph |
| Alex Karp | `CEO-of` | Palantir | primary_public | Operational face of Maven, Army agreement, NATO |
| Sam Altman | `CEO-of` | OpenAI | primary_public | Closes OpenAI leadership gap (Brockman + Kwon already in) |
| Sam Altman | `fmr-chair-of` | Oklo | primary_public | Stepped down; Jacob DeWitte became chair |
| Alice Bentinck | `co-founded` | Entrepreneur First | primary_public | EF co-founder and current CEO; Clifford's co-author |
| Alice Bentinck | `CEO-of` | Entrepreneur First | primary_public | Current operational head of EF |
| Alice Bentinck | `co-authored` | "How to Be a Founder" | primary_public | With Clifford |
| Laura Arnold | `co-chair-of` | Arnold Ventures | primary_public | Co-chair alongside John Arnold (#68 in directory) |
| Jeremy O'Brien | `co-founded` | PsiQuantum | primary_public | CEO; face of AUKUS quantum positioning |
| Jeremy O'Brien | `CEO-of` | PsiQuantum | primary_public | |
| Jacob DeWitte | `co-founded` | Oklo | primary_public | CEO; NRC/DOE regulatory surface |
| Jacob DeWitte | `CEO-of` | Oklo | primary_public | |
| Jacob DeWitte | `became-chair-of` | Oklo | primary_public | After Sam Altman stepped down |
| Demis Hassabis | `CEO-of` | Google DeepMind | primary_public | Closes DeepMind gap; also EF investor and ARIA adviser |
| Demis Hassabis | `co-founded` | DeepMind | primary_public | |
| Demis Hassabis | `external-adviser-to` | ARIA | primary_public | ARIA governance page |
| Demis Hassabis | `investor-in` | Entrepreneur First | primary_public | EF website |
| Sundar Pichai | `CEO-of` | Alphabet / Google | primary_public | Google has four nodes already in graph |
| Mark Zuckerberg | `founder-CEO-of` | Meta | primary_public | Meta has three nodes in graph; Zuckerberg absent |
| Robert Mercer | `fmr-co-CEO-of` | Renaissance Technologies | primary_public | Major political donor; Thiel-adjacent |
| Shyam Sankar | `CTO-of` | Palantir | official | Army press release + Palantir proxy — Detachment 201 |
| Andrew Bosworth | `CTO-of` | Meta | official | Army press release + Meta leadership page — Detachment 201 |
| Kevin Weil | `CPO-of` | OpenAI | official | Army press release — Detachment 201 |
| Bob McGrew | `fmr-CRO-of` | OpenAI | official | Army press release — Detachment 201 |
| Max Jaderberg | `president-of` | Isomorphic Labs | primary_public | On ARIA board |

---

## Part 5: Dialog Directory — 113 Named Entities

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
| 32 | Reema bint Bandar Al-Saud | Ambassador of Saudi Arabia to the United States (Princess Reema bint Bandar) |
| 33 | Turki Al Faisal Al Saud | Fmr. Minister of Intelligence, Saudi Arabia; Founder, King Faisal Foundation |
| 34 | Sheikh Nawaf Saud Nasir Al-Sabah | CEO, Kuwait Petroleum Corporation |
| 35 | Kaja Kallas | VP, European Commission / High Representative; Fmr. Prime Minister, Estonia |
| 36 | Tarō Kōno | Fmr. Digital Minister, Japan (2022–2024); Fmr. Minister of Defense, Japan; Fmr. Foreign Minister, Japan (**use `former_minister_of` — current digital minister is Matsumoto Hisashi**) |
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
| 80 | Matt Clifford | PM's AI Opportunities Adviser (fmr.), UK; Co-Founder & Chair, Entrepreneur First; Chair, ARIA |
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

## Part 6: Additional Registrants — 222-Person List Only

**Evidence class:** `primary_public`  
**Source:** Wired June 16 2026 / Airtable database  
**Predicate:** `registered-for`  
**Object:** Dialog Global 2026, Dublin  
**UI weight:** 3  
**Note:** Confirmed in the 222-person registration list but NOT in the 113-name public directory.

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

## Part 7: Pakistan Delegation — November 2025

**Evidence class:** `reported`  
**Source:** Wired June 16 2026 (leaked Airtable / internal documents)  
**Predicate:** `attended`  
**Object:** Dialog Pakistan delegation, meeting with FM Aurangzeb, November 2025  
**UI weight:** 2

| Name | Primary Affiliation |
|---|---|
| Ali Jehangir Siddiqui | Board Chair, OnZero; Fmr. Ambassador of Pakistan to US; Fmr. Ambassador-at-Large for Foreign Investment |
| Simon Stevens | Lord Stevens of Birmingham; Fmr. CEO, NHS England |
| Veit Dengler | Media/publishing executive |
| Yasmin Green | Director, ADL (**cross-surface hit:** also `director-of` ADL per 990 filing) |
| Fatima Kardar | VP, Xbox (Microsoft) — also in 113 directory (#49) |
| Shadi Martini | Executive |
| Evan Marwell | Founder, EducationSuperHighway |
| Himanshu Gulati | MP, Norway (Fremskrittspartiet) |

---

## Part 8: Dialog — Leadership and Organizational Edges

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
| Peter Thiel | `chair-of` | Palantir (since 2003) | primary_public | Palantir investor relations |
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

## Part 9: Typed Organizational Edges — State and Procurement Surface

### Palantir

| Predicate | Object | Amount | Date | Evidence Class | Source |
|---|---|---|---|---|---|
| `awarded` | Pentagon Maven Smart System prototype | $480M | May 2024 | reported | Reuters |
| `program-of-record` | Pentagon Maven Smart System | — | March 2026 | reported | Reuters |
| `enterprise-agreement` | U.S. Army (consolidating dozens of software contracts) | up to $10B / 10yr | 2025 | reported | Public reporting |
| `supplied-to` | NATO Allied Command Operations (Maven Smart System NATO) | — | 2025 | reported | Public reporting |
| `partnership-with` | Anduril (defense data for AI training) | — | ~2025 | reported | Reuters |
| `retained-lobbyist` | Ballard Partners | — | — | reported | Public reporting (LDA pull pending) |

### SafeGraph / Veraset

| Predicate | Object | Date | Evidence Class | Source |
|---|---|---|---|---|
| `sold-data-to` | U.S. government agencies (device-level location data) | 2018–2020 | reported | EFF |
| `sold-data-to` | Illinois Department of Transportation | — | reported | Wired |
| `awarded` | CDC contract (pandemic) | — | reported | Wired |
| `banned-from` | Google Android Play marketplace | August 2021 | reported | Public reporting |
| `sold-data-re` | abortion clinic visitors | May 2022 | reported | Motherboard/Vice |
| `awarded` | AFWERX Phase I contract, U.S. Air Force | undated | reported | Wired |

### SpaceX

| Predicate | Object | Amount | Date | Evidence Class | Source |
|---|---|---|---|---|---|
| `awarded` | Space Force Space Data Network Backbone contract | $2.29B | — | reported | Public reporting |
| `NASA-HLS-contractor` | NASA Human Landing System (lunar) | — | — | reported | Public reporting |
| `lobbied-to-eliminate` | National Space Council (via lobbyist Mat Dunn) | — | — | reported | Reuters (LDA pull pending) |

### Groq

| Predicate | Object | Amount | Date | Evidence Class | Source |
|---|---|---|---|---|---|
| `UK-datacenter` | London data centre (UK govt AI investment announcement) | ~£100M | June 2025 | reported | Public reporting |
| `participant-in` | DOE Genesis Mission (advanced AI chips for national scientific/security initiative) | — | December 2025 | reported | Reuters |

### PsiQuantum

| Predicate | Object | Amount | Date | Evidence Class | Source |
|---|---|---|---|---|---|
| `received-investment-from` | Australia federal + Queensland governments (Brisbane/Petrie utility-scale quantum) | ~A$940M combined | — | reported | Public reporting |
| `received-investment-from` | Illinois public support (Chicago site) | — | — | reported | Reuters |
| `evaluated-by` | DARPA Quantum Benchmarking Initiative (intermediate-scale test system) | — | — | reported | Reuters |
| `UK-RnD-facility` | UK R&D facility with UK government support | — | — | reported | Public reporting |
| `partnership-with` | U.S. Department of Energy (refrigeration technology) | — | — | reported | Public reporting |

### Oklo

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `regulatory-surface` | DOE / NRC / Idaho National Laboratory | reported | Public reporting |
| `advanced-reactor-pathway` | DOE deployment pathway | reported | Public reporting |
| `deal-with` | Switch (data-center power) | reported | Reuters |

### OpenAI

| Predicate | Object | Amount | Evidence Class | Source |
|---|---|---|---|---|
| `launched` | ChatGPT Gov (U.S. agencies) | — | reported | Public reporting |
| `DoD-contract` | Frontier AI for program/acquisition data analysis and cyber defense | $200M ceiling | reported | Public reporting |

### Meta

| Predicate | Object | Date | Evidence Class | Source |
|---|---|---|---|---|
| `partnership-with` | Anduril (integrated XR products for warfighters) | 2025 | reported | Public reporting |

### Neuralink

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `FDA-designation` | Breakthrough Device designation | reported | Public reporting |
| `director-of` | Shivon Zilis | primary_public | Public record |

---

## Part 10: Nonprofit Layer — Financials and Officers

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

**Schema note:** Type differently from 501(c)(3) foundations. `501c4` orgs are advocacy entities; render separately from grantmaking foundations.

### Arnold Ventures

**Schema note:** Arnold Ventures is structured as an **LLC**, not a standard 501(c)(3). 990 history exists under the prior "Laura and John Arnold Foundation" entity. Current umbrella is a different legal container. Do not conflate. Missing node: **Laura Arnold** (co-chair alongside John Arnold).

### Jain Family Institute

**Status:** Financials and officers not yet retrieved. Node exists via Bob Jain (`founded`, primary_public). Pull IRS/ProPublica in next pass.

---

## Part 11: VC and Capital Layer

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

### Saudi sovereign capital layer

| Entity | Predicate | Object | Evidence Class | Source |
|---|---|---|---|---|
| Saudi Public Investment Fund | `AUM` | $1T+ / 220+ portfolio companies | primary_public | PIF website / Reuters 2026 |
| Sanabil Investments | `wholly-owned-by` | Saudi PIF | reported | Reuters |
| Sanabil Investments | `commits` | $3B+/year (venture, growth, buyouts) | primary_public | Sanabil website |
| Sanabil Investments | `fund-partner` | Andreessen Horowitz | primary_public | Sanabil portfolio page |
| Sanabil Investments | `fund-partner` | Founders Fund | primary_public | Sanabil portfolio page |
| Sanabil Investments | `fund-partner` | Insight Partners | primary_public | Sanabil portfolio page |
| Sanabil Investments | `fund-partner` | NEA | primary_public | Sanabil portfolio page |
| Sanabil Investments | `fund-partner` | NFX Capital | primary_public | Sanabil portfolio page |
| Sanabil Investments | `fund-partner` | Techstars | primary_public | Sanabil portfolio page |
| Sanabil Investments | `fund-partner` | Village Global | primary_public | Sanabil portfolio page |
| Sanabil Investments | `direct-exposure` | Databricks | primary_public | Sanabil portfolio page |
| Sanabil Investments | `direct-exposure` | Alation | primary_public | Sanabil portfolio page |
| Sanabil Investments | `direct-exposure` | SingleStore | primary_public | Sanabil portfolio page |
| Sanabil Investments | `direct-exposure` | Vectra AI | primary_public | Sanabil portfolio page |

**Documented chain (evidence class: primary_public + reported):**  
Sanabil (PIF-owned) → Founders Fund (LP) → Peter Thiel (managing partner) → Palantir (chair since 2003) → Maven/$10B Army enterprise agreement

### Kuwait layer — split correctly

| Entity | Type | Person | Note |
|---|---|---|---|
| Kuwait Investment Authority | Sovereign wealth fund (world's first, per KIA) | — | Capital node; separate from KPC |
| Kuwait Petroleum Corporation | State-owned national oil company | Sheikh Nawaf Saud Nasir Al-Sabah (CEO) | Industrial node; acts on national output policy |

---

## Part 12: Non-US State Layer

### EU / Kaja Kallas

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `VP-and-HR-of` | European Commission / High Representative | official | EC College of Commissioners page |
| `responsible-for` | European Defence Union | official | EC website |
| `responsible-for` | cyber and hybrid attack response | official | EC website |
| `responsible-for` | neighbourhood policy | official | EC website |
| `responsible-for` | foreign and foreign-economic policy | official | EC website |
| `fmr-PM-of` | Estonia | official | Public record |

### Japan / Tarō Kōno

**Correction flag:** Kōno is **former** digital minister. Current Digital Agency minister is Matsumoto Hisashi. All Kōno edges must use `former_minister_of`.

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `fmr-digital-minister-of` | Japan | 2022–2024 | official |
| `fmr-defense-minister-of` | Japan | — | official |
| `fmr-foreign-minister-of` | Japan | — | official |

### Pakistan / Ali Jehangir Siddiqui

| Predicate | Object | Evidence Class | Source |
|---|---|---|---|
| `fmr-ambassador-of` | Pakistan to United States | official | Public record |
| `fmr-ambassador-at-large-for` | Foreign Investment, Pakistan | official | Public record |
| `board-chair-of` | OnZero | primary_public | Public record |
| `attended` | Dialog Pakistan delegation (FM Aurangzeb meeting) | reported | Wired |

---

## Part 13: Conflict-of-Interest Matrix

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
| Palantir (Sankar — Detachment 201) | Dan Driscoll (Army Secretary) | Palantir CTO advises Army as Lt. Colonel; Army Secretary in same room at Dialog |
| SpaceX (Musk) | Alexus Grynkewich (NATO SACEUR) | Starlink in Ukraine/NATO operations |
| Neuralink (Musk/Zilis) | Dan Driscoll (Army Secretary) | BCI military applications |
| Meta (Bosworth — Detachment 201) | Dan Driscoll (Army Secretary) | Meta CTO advises Army modernization; XR/warfighter partnership with Anduril |
| OpenAI (Weil — Detachment 201) | Dan Driscoll (Army Secretary) | OpenAI CPO advises Army; OpenAI has DoD $200M contract |

### Foreign government / U.S. policy collisions

| Foreign Actor | U.S. Official Present | Overlap |
|---|---|---|
| Turki Al Faisal (Fmr. Saudi Intel Chief) | Scott Bessent, Ted Cruz | Saudi investments, defense, oil |
| Reema bint Bandar Al-Saud (Saudi Ambassador) | Multiple | Saudi-U.S. relations |
| Sheikh Nawaf Al-Sabah (Kuwait Petroleum CEO) | Scott Bessent | Oil markets, energy policy |
| Kaja Kallas (EU Commission VP) | Multiple | EU tech regulation, NATO |
| Tarō Kōno (Fmr. Japan Digital/Defense) | Multiple | Indo-Pacific security, tech |
| Jens Spahn (German MP/Health) | Multiple | Health policy, EU relations |
| Shahid Khaqan Abbasi (Fmr. Pak PM) | Multiple | South Asia policy |

---

## Part 14: Umbrella Map

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
| U15 | US Army Reserve / defense modernization pipeline | Formal military channel connecting private-sector tech executives to Army modernization programs |

### Umbrella memberships (ready to insert)

| Entity | Umbrella | Membership Type | Evidence Class | Notes |
|---|---|---|---|---|
| Matt Clifford | U03 | policy-spine | official | authored Action Plan |
| Matt Clifford | U04 | delivery-layer | official | No. 10 advisory appointment |
| Matt Clifford | U02 | policy-spine | official | EF founder + government advisory |
| Matt Clifford | U15 | — | — | not applicable — UK track |
| ARIA | U03 | delivery-layer | official | R&D institution |
| Entrepreneur First | U02 | delivery-layer | primary_public | founder pipeline; EF chair is also Clifford |
| Omnea (EF portfolio) | U05 | procurement-layer | primary_public | "procurement automation" per EF |
| Hadean (EF portfolio) | U06 | defence-layer | primary_public | "defence forces simulation" per EF |
| UK Sovereign AI Unit | U03 | delivery-layer | reported | Implements Action Plan compute recommendation |
| UK Sovereign AI Unit | U05 | procurement-layer | reported | Fast visas, compute access, procurement pathway |
| Palantir | U06 | procurement-layer | reported | Maven Smart System, Army enterprise agreement |
| Palantir | U05 | procurement-layer | reported | Pentagon operating layer |
| Palantir | U15 | defence-layer | official | Sankar in Detachment 201 |
| Meta | U15 | defence-layer | official | Bosworth in Detachment 201; Anduril XR partnership |
| OpenAI | U15 | defence-layer | reported | Weil in Detachment 201; DoD $200M contract |
| Detachment 201 | U15 | policy-spine | official | Army Reserve unit |
| SafeGraph | U08 | data-layer | reported | Govt location data sales 2018–2020, AFWERX |
| Sanabil Investments | U14 | capital-layer | primary_public | PIF-owned; fund partner to Founders Fund et al |
| PsiQuantum | U07 | infrastructure-layer | reported | Australia/UK/US trilateral positioning; DARPA evaluation |
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
| Founders Fund | U14 | capital-layer | primary_public | Thiel; also Sanabil LP relationship |
| Affinity Partners | U14 | capital-layer | reported | Kushner; Saudi/Gulf sovereign co-investment |
| Saudi PIF | U14 | capital-layer | primary_public | $1T+ AUM |

---

## Part 15: What's Still Open

Import as `evidence_class: open`, `ui_weight: 4`, `public: false` until resolved.

| Item | What's Missing | Source to Pull |
|---|---|---|
| Senate LDA filings — Palantir, SpaceX, Meta, Google, Walmart | Row-level registration records, lobbyist names, agencies contacted, spend amounts | lda.senate.gov API (migrating to LDA.gov after June 30 2026 — pull before cutover) |
| FARA registrations | Foreign agent filings for any relevant registrants | DOJ FARA public search (no clean API — use browse/export) |
| SEC Form D — 8VC, Ribbit, Greylock, Fortress, Benchmark, Social Capital, Affinity, Sanabil-linked funds | Issuer entities, fund names, first sale dates, offering amounts, related persons/GP names | data.sec.gov submissions API (no auth, 10 req/sec) |
| 990 Schedule I — grant recipients | Who Koch Foundation, Berggruen, New America, ADL, Mercatus, Federalist Society gave money to | IRS bulk XML / ProPublica Schedule I |
| Jain Family Institute | Financials, officers, EIN | IRS / ProPublica |
| Arnold Ventures LLC | Current legal container vs Laura and John Arnold Foundation 990 history | IRS + entity registry |
| Companies House — Clifford, EF, ARIA-adjacent | Director-of, PSC-of, filing history | Companies House Developer API (auth required, 600 req/5min) |
| Companies House — Cradle Infrastructure | Corporate registry number, directors, filings | Companies House search |
| Find a Tender / Contracts Finder | UK procurement notices, suppliers, buyers | Contracts Finder OCDS API / daily CSV; Find a Tender has no stable machine API confirmed — use HTML/export |
| USAspending / SAM — Palantir, SpaceX, Groq, PsiQuantum, Oklo, Neuralink, OpenAI | Award IDs, amounts, agencies, dates | USAspending API (no auth) / SAM API (API key required) |
| Detachment 201 second cohort — named members | The June 2026 announcement confirmed a second cohort exists but did not name all members | Army public affairs / direct commission program pages |
| EF portfolio full list | Only 4 defense/procurement-adjacent companies identified; full portfolio not yet scraped | EF portfolio page |
| Kallas EU Commission portfolio detail | Portfolio specifics beyond defence/cyber/neighbourhood | EC College of Commissioners page (official) |
| Non-US lobbying / government contacts | UK Register of Consultant Lobbyists; TED (EU procurement) | UK Gov / TED API |
| Clifford arXiv papers | 2024 ML papers co-authored | arXiv search |
| ARIA annual report / interests register | Board memberships with dates, declarations, resignations | aria.org.uk/about-aria/reporting-and-policies |
| Japan Digital Agency — Matsumoto Hisashi | Current digital minister profile | digital.go.jp/about/member |
| PIF governance / annual report | Board composition, investment mandate detail | pif.gov.sa |
| Sanabil fund vintage dates | When specifically each LP relationship was established | SEC EDGAR + Sanabil disclosures |

---

## Part 16: Source Index

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
| S25 | EC College of Commissioners — Kaja Kallas portfolio | Current | Official | official |
| S26 | Japan Digital Agency website — current minister | Current | Official | official |
| S27 | Saudi PIF website — AUM | Current | Primary public | primary_public |
| S28 | dialog.org HTML source (now removed) | June 2026 | Primary source | primary_public |
| S29 | DOJ Epstein files (2014 retreat invite — note: "Jeff Epstein" = Oracle CFO, NOT sex trafficker, per Wired correction) | 2014/2026 | Official (with correction) | reported |
| S30 | U.S. Army Public Affairs — Detachment 201 launch | June 13 2025 | Official | official |
| S31 | U.S. Army Public Affairs — Detachment 201 second cohort | June 10 2026 | Official | official |
| S32 | ARIA governance page — board and advisers | Current | Primary public | primary_public |
| S33 | EF website — co-founders, investors, advisers, portfolio | Current | Primary public | primary_public |
| S34 | Sanabil Investments portfolio page | Current | Primary public | primary_public |
| S35 | Reuters — Palantir/Anduril defense data partnership | ~2025 | Journalism | reported |
| S36 | Reuters — PsiQuantum DARPA Quantum Benchmarking Initiative | — | Journalism | reported |
| S37 | Reuters — Oklo / Sam Altman / Jacob DeWitte / Switch | — | Journalism | reported |
| S38 | Reuters — OpenAI DoD contract | — | Journalism | reported |
| S39 | Public reporting — Meta/Anduril XR warfighter partnership | 2025 | Journalism | reported |
| S40 | Palantir investor relations — Thiel chair since 2003 | Current | Primary public | primary_public |

---

## Part 17: Claim Taxonomy and Import Methodology

*Source: deep-research-report__27__ — Typed Claim Map for the Dialog Raw Dump*

### What the Dialog raw dump can actually prove

The source is a compiled intelligence memo assembled from multiple outlets (Wired, Forbes, Wikipedia, Straight Arrow News, Bluesky, Axios, Semafor, others). Two evidence classes coexist in the same file: **Dialog-native event claims** (direct from the leak) and **compiled role/affiliation strings** (secondary labels). These must not be imported at the same confidence level.

**Load-bearing provenance anchors:**
- Main website: exposed 113-name directory in HTML source code
- Public sign-in page: exposed Dialog Global 2026 registration portal
- Airtable backend: exposed 222 registration records for the Dublin retreat (membership status, attendee type, retreat history)

**Critical scope warnings:**
1. The website directory did **not** equal "current members" — it included active members, guests, event speakers, and outside guests from years past. `listed_in_directory` ≠ `current_member_of_dialog`
2. The Airtable contains **registration records**, not confirmed attendance. Correct predicate: `registered_for_dialog_global_2026`, not `attended_dialog_global_2026`

### Dialog-native predicates (tightest evidence class)

- `co_founded_dialog`
- `chairs_dialog`
- `executive_director_of_dialog`
- `listed_in_directory`
- `registered_for_dialog_global_2026`
- `attended_dialog_pakistan_delegation_2025`
- `runs_session`
- `moderates_session`
- `first_time_dialoger`
- `verified_contact`

### Role predicate import rules

**Import if text uses:** `founder`, `co-founder`, `chairman`, `CEO`, `president`, `senator`, `governor`, `ambassador`, `minister`, `partner`, `board director`, `professor`, `director`, `staff secretary`

**Do not import if text only names organizations without a role verb.** "Elon Musk — SpaceX, Tesla, X, Neuralink" does not specify founder vs. CEO vs. owner. Leave in notes/staging field, do not generate a hard edge.

### Special-case flags

| Person | Special Claim | Evidence |
|---|---|---|
| Josh Brolin | `first_time_dialoger` | File text |
| Shmuel Abramzon | `first_time_dialoger` | File text |
| Josh Brolin | `verified_contact` — Straight Arrow News called leaked number, reached voicemail with his voice | Straight Arrow News |
| Souad Mekhennet | `runs_session` — "Ulysses Book Club" | Session list |

### Alias trap: Ali Siddiqui

The Pakistan delegation section uses "Ali Jehangir Siddiqui." The directory table uses "Ali Siddiqui." These are the same person. **Do not auto-merge without an alias record.** Create an alias pair in the entity resolution layer.

### Session moderators — unnamed placeholders

- "Build-a-Cult" — moderated by founder of Pray.com (unnamed)
- "Build-a-Party" — moderated by a former White House national security official (unnamed)

Do not create person nodes for these until identified.

### Two-claim import model

```
For each person:
  1. Import Dialog-status claim (listed / registered / attended / runs_session / first_time_dialoger / verified_contact)
  2. Separately import role strings that are predicate-specific
  Keep Dialog adjacency separate from occupational identity
```

---

## Part 18: Engineering Specification — Importer Stack and Data Model

*Source: deep-research-report__30__ and deep-research-report__33__*

### Source stack — priority order

| Source | What it gives you | Auth | Key structure |
|---|---|---|---|
| GOV.UK publications/news | commissions, appointments, policy papers | none | title, dept, published date, URL, body |
| Companies House Developer API | company profile, officers, PSCs, filing history, streaming | API key (HTTP Basic) | 600 req/5min default; OpenAPI-spec'd |
| Senate LDA API | registrant, client, filings, issue codes, agencies, lobbyists, amounts | API key | paginated REST; **migrating to LDA.gov after June 30 2026 — pull before cutover** |
| DOJ FARA | foreign-agent filings | none (public browse) | no stable API confirmed; use browse/export |
| IRS TEOS bulk + Form 990 XML | nonprofit filings, 990 series bulk downloads | none | monthly ZIPs + yearly index CSV |
| ProPublica Nonprofit Explorer | convenience API + cross-linked 990 PDFs/XML | none | best accelerator for 990 haul; IRS = source of truth |
| SEC EDGAR data.sec.gov | submissions history, Form D, XBRL, bulk ZIPs | none (10 req/sec, User-Agent required) | prefer nightly bulk ZIPs for scale |
| USAspending API | award details, downloads, recipient search | none | endpoint catalog, CSV downloads |
| SAM.gov Contract Awards API | contract award data, deleted contracts, extracts | API key | limit/offset, date range, daily rate limits |
| SAM.gov Opportunities API | posted opportunities and notices | API key | mandatory pagination; limit max 1000; date range max 1 year |
| Contracts Finder OCDS/CSV | UK procurement and contract notices | none (public) | OCDS JSON, XML, daily CSV |
| Find a Tender | UK higher-threshold procurement | no stable machine API confirmed — use HTML/export | — |
| European Commission College page | commissioner portfolios | none | one page; official |
| ARIA annual report/governance | board, advisers, interests register | none | PDF + web |

### Highest-yield first-week fetches

| Priority | Fetch | Edge types generated |
|---|---|---|
| 1 | GOV.UK: Action Plan, commission notice, AI adviser appointment, ARIA chair | `commissioned`, `authored`, `appointed`, `chair-of` |
| 2 | Companies House: Clifford, EF, ARIA-adjacent entities | `director-of`, `PSC-of`, `filed`, `incorporated-on` |
| 3 | Senate LDA: Palantir, Meta, Google, Walmart, SpaceX | `lobbied`, `contacted`, `client-of`, `reported-spend` |
| 4 | IRS/ProPublica: nine nonprofit targets | `officer-of`, `granted`, `received-grant-from` |
| 5 | SEC EDGAR Form D: 8VC, Ribbit, Greylock, Fortress, Benchmark, Social Capital, Affinity | `issuer-of`, `related-person`, `first-sale-date`, `offering-amount` |
| 6 | USAspending + SAM: Palantir, SpaceX, Groq, PsiQuantum, Oklo, Neuralink | `awarded-to`, `recipient-of`, `funded-by` |
| 7 | Find a Tender + Contracts Finder | `notice-published-by`, `supplier-to` |

### Field extraction mappings

**Senate LDA:**
- `registrant.name` → organization entity
- `client.name` → organization entity
- `lobbying_activities[].general_issue_code_display` → topic tag
- `lobbying_activities[].government_entities[].name` → `reported-contact-with`
- `income` / `expenses` → quantitative property on filing claim
- `filing_document_url` → documentary evidence URL

**SEC Form D / submissions:**
- issuer legal name → organization entity
- related persons / executive officers / promoters → `related-person`
- total offering amount / amount sold → quantitative attributes
- first sale date → date anchor
- form type `D` / amended `D/A` → status and supersession logic
- accession number → provenance key

**Companies House:**
- company profile → company node
- officer list → `director-of`, `secretary-of`, `member-of-llp`
- PSC list → `PSC-of` with nature-of-control and dates
- filing history → `filed` edges + supporting docs
- stream events → incremental update queue

### Importer pseudocode

```python
def import_lda_filings(client_name: str, api_key: str):
    page_url = f"https://lda.senate.gov/api/v1/filings/?client_name={urlencode(client_name)}"
    while page_url:
        payload = get_json(page_url, headers={"Authorization": f"Token {api_key}"})
        for row in payload["results"]:
            claim_emit(
                subject=entity("org", row["registrant"]["name"]),
                predicate="registrant-for",
                object=entity("org", row["client"]["name"]),
                status="filed",
                evidence_class="official",
                source_url=row["filing_document_url"],
                attrs={
                    "filing_uuid": row["filing_uuid"],
                    "filing_year": row["filing_year"],
                    "filing_period": row["filing_period"],
                    "income": row["income"],
                    "expenses": row["expenses"]
                }
            )
            for act in row.get("lobbying_activities", []):
                for agency in act.get("government_entities", []):
                    claim_emit(
                        subject=entity("org", row["client"]["name"]),
                        predicate="reported-contact-with",
                        object=entity("org", agency["name"]),
                        status="reported",
                        evidence_class="official",
                        source_url=row["filing_document_url"],
                        attrs={"issue": act.get("general_issue_code_display")}
                    )
        page_url = payload["next"]

def import_sec_submissions(cik: str):
    url = f"https://data.sec.gov/submissions/CIK{cik.zfill(10)}.json"
    headers = {"User-Agent": "ResearchTeam ops@example.org"}
    data = get_json(url, headers=headers, rate_limit_per_sec=10)
    org = entity("org", data["name"])
    for i, form in enumerate(data["filings"]["recent"]["form"]):
        accession = data["filings"]["recent"]["accessionNumber"][i]
        filed_on = data["filings"]["recent"]["filingDate"][i]
        claim_emit(
            subject=org,
            predicate="filed",
            object=entity("filing", accession),
            status="filed",
            evidence_class="official",
            source_url=f"https://www.sec.gov/Archives/edgar/data/{data['cik']}/{accession.replace('-', '')}/index.json",
            attrs={"form": form, "filing_date": filed_on}
        )
```

### Relational schema

```sql
CREATE TABLE sources (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  publisher TEXT,
  source_tier TEXT NOT NULL CHECK (source_tier IN ('primary','secondary','user_supplied')),
  access_method TEXT NOT NULL,
  base_locator TEXT,
  notes TEXT
);

CREATE TABLE documents (
  id BIGSERIAL PRIMARY KEY,
  source_id BIGINT NOT NULL REFERENCES sources(id),
  source_document_id TEXT NOT NULL,
  title TEXT,
  canonical_locator TEXT NOT NULL,
  retrieved_at TIMESTAMPTZ NOT NULL,
  published_at TIMESTAMPTZ,
  effective_date DATE,
  mime_type TEXT,
  hash_sha256 TEXT,
  UNIQUE (source_id, source_document_id)
);

CREATE TABLE entities (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  entity_type TEXT NOT NULL CHECK (entity_type IN ('person','organisation','office','document','program','fund','government_body','umbrella')),
  canonical_name TEXT NOT NULL,
  country_code TEXT,
  jurisdiction TEXT,
  metadata JSONB DEFAULT '{}'::jsonb
);

CREATE TABLE aliases (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT NOT NULL REFERENCES entities(id),
  alias TEXT NOT NULL,
  alias_type TEXT DEFAULT 'name',
  UNIQUE (entity_id, alias)
);

CREATE TABLE claims (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  document_id BIGINT NOT NULL REFERENCES documents(id),
  subject_entity_id BIGINT NOT NULL REFERENCES entities(id),
  predicate TEXT NOT NULL,
  object_entity_id BIGINT REFERENCES entities(id),
  object_literal JSONB,
  status TEXT NOT NULL,
  evidence_class TEXT NOT NULL CHECK (evidence_class IN ('confirmed','reported','derived','judgment','open')),
  source_tier TEXT NOT NULL CHECK (source_tier IN ('primary','secondary','user_supplied')),
  effective_start DATE,
  effective_end DATE,
  filed_at DATE,
  amount NUMERIC,
  currency TEXT,
  locator TEXT,
  quote_text TEXT,
  context JSONB DEFAULT '{}'::jsonb,
  review_state TEXT NOT NULL DEFAULT 'queued' CHECK (review_state IN ('queued','approved','rejected','redacted')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE edges (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT UNIQUE NOT NULL REFERENCES claims(id),
  src_entity_id BIGINT NOT NULL REFERENCES entities(id),
  dst_entity_id BIGINT REFERENCES entities(id),
  edge_type TEXT NOT NULL,
  ui_strength NUMERIC NOT NULL DEFAULT 0.0
);

CREATE TABLE umbrellas (
  id BIGSERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  umbrella_type TEXT NOT NULL,
  description TEXT
);

CREATE TABLE entity_umbrella_memberships (
  id BIGSERIAL PRIMARY KEY,
  entity_id BIGINT NOT NULL REFERENCES entities(id),
  umbrella_id BIGINT NOT NULL REFERENCES umbrellas(id),
  basis_claim_id BIGINT REFERENCES claims(id),
  membership_type TEXT NOT NULL,
  depth INTEGER NOT NULL DEFAULT 0,
  UNIQUE (entity_id, umbrella_id, membership_type, depth)
);

CREATE TABLE redactions (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT REFERENCES claims(id),
  entity_id BIGINT REFERENCES entities(id),
  field_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE reviews (
  id BIGSERIAL PRIMARY KEY,
  claim_id BIGINT NOT NULL REFERENCES claims(id),
  reviewer TEXT NOT NULL,
  decision TEXT NOT NULL CHECK (decision IN ('approve','reject','needs_work','redact')),
  rationale TEXT,
  reviewed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX claim_subject_idx ON claims(subject_entity_id);
CREATE INDEX claim_object_idx ON claims(object_entity_id);
CREATE INDEX claim_predicate_idx ON claims(predicate);
CREATE INDEX claim_review_idx ON claims(review_state);
```

### Evidence classes and UI weighting

**Evidence classes:**

| Class | Meaning | Base multiplier |
|---|---|---|
| `confirmed` | Direct primary or official document/registry row | 1.00 |
| `reported` | Reputable secondary source, not yet primary-verified | 0.75 |
| `derived` | Mechanically derived from stronger rows | 0.60 |
| `judgment` | Analyst classification or umbrella grouping | 0.35 |
| `open` | Unresolved lead / fetch target | 0.10 |

**Claim-type base weights:**

| Claim type | Base |
|---|---:|
| `chair_of`, `appointed_to`, `director_of`, `psc_of`, `registered_lobbying_for`, `awarded_contract_to`, `filed_form_d`, `grant_made_to` | 0.95 |
| `board_member_of`, `external_advisor_to`, `executive_of_issuer`, `commissioned_to_write`, `authored` | 0.85 |
| `officer_of`, `supplier_to`, `recipient_of_contract` | 0.80 |
| `listed_in_directory`, `registered_for_event`, `attended` | 0.30 |

**Final edge strength formula:**

```
edge_strength =
  claim_type_base
  × evidence_class_multiplier
  × source_tier_multiplier   (primary 1.00 / secondary 0.85 / user_supplied 0.70)
  × recency_multiplier       (1.00 if current; max(0.75, 1 - years_old×0.03) otherwise)
  × review_multiplier        (approved 1.00 / queued 0.85 / needs_work 0.60)
```

**UI tier policy:**

| Tier | What belongs here | UI treatment |
|---|---|---|
| 1 | `appointed`, `chair-of`, `director-of`, `PSC-of`, `authored`, `awarded-to`, `lobbied` | Full opacity, visible labels |
| 2 | `funded-by`, `granted`, `issuer-of`, `related-person` | Medium opacity, expandable detail |
| 3 | `attended`, `listed`, `registered`, `speaker-at` | Faint lines, hidden label until hover |
| 4 | `open`, `derived`, `contested` | Off by default in public view |

### Path ranking and weakest-hop surfacing

```
path_score =
  0.55 × min(edge_strengths)
+ 0.25 × avg(edge_strengths)
+ 0.10 × source_diversity
+ 0.10 × type_diversity
- 0.05 × (hop_count - 1)
```

Return alongside every path:
- `weakest_hop` — edge with minimum strength
- `umbrella_radius` — shortest hops from Clifford to umbrella root to target
- `supporting_documents_count`
- `is_low_confidence` flag if any hop < 0.40

### Crawler expansion rules

**Seed entities:** Matt Clifford, ARIA, Entrepreneur First, AI Opportunities Action Plan, DSIT, No.10, all Dialog names already extracted, target firms and nonprofits named above.

**Expand one hop when the new edge is one of:**
- `appointed_to`, `chair_of`, `board_member_of`, `external_advisor_to`
- `director_of`, `psc_of`, `officer_of`
- `commissioned_to_write`, `authored`, `reports_to`
- `registered_lobbying_for`, `lobbied_on_issue`, `represented_foreign_principal`
- `filed_form_d`, `executive_of_issuer`, `offering_by`
- `awarded_contract_to`, `received_federal_award`, `buyer_awarded_to_supplier`
- `grant_made_to`, `officer_of_nonprofit`
- `listed_in_directory`, `registered_for_event`, `attended` — **discovery only, never sole basis for umbrella membership**

**One-hop recursion rule:** expand from a newly added node only if:
- Strongest incoming edge weight ≥ 0.55, OR
- At least two independent sources asserting different claim types, OR
- Explicitly designated as an umbrella root (fund, public body, company, nonprofit, program)

**Stop conditions:**
- Maximum graph radius from Clifford: 4 hops (strong edges), 2 hops (weak edges)
- No expansion from nodes whose only inbound relationship is `listed`, `registered`, or `attended`
- Stop when `new_unique_claims / api_call` < 0.30 for two consecutive batches
- Stop on high-ambiguity entity matches until review resolves them

**Deduplication key:**
```
sha256(normalize(subject) + "|" + predicate + "|" + normalize(object) + "|" + coalesce(effective_start,"") + "|" + source_document_id)
```

**Entity resolution priority:**
1. Exact external ID match (company number, CIK, EIN, filing UUID)
2. Exact legal name + jurisdiction
3. Alias match + corroborating role or date
4. Human review queue

### Redaction policy

Never publish:
- Home addresses, personal phone numbers, personal email addresses, passport/ID numbers, signatures
- Minors and non-public individuals unless independently newsworthy and essential
- Exact identifiers creating unnecessary privacy or security exposure
- Weak edges connecting a private person to a stigmatized target unless the claim is material and clearly described

**Human review mandatory when:**
- Edge touches criminality, sanctions, or intelligence
- Source is leaked or non-official
- Claim is derived from joins rather than direct fields
- Weak edge sits within two hops of a high-stigma node

### Six-week sprint

| Week | Batch | Scope |
|---|---|---|
| 1 | Spine | GOV.UK: Action Plan, appointment, commissioning, ARIA annual report |
| 1–2 | Corporate | Companies House: Clifford, EF, ARIA-linked orgs |
| 2 | DSIT corpus | GOV.UK release corpus, transparency seed list |
| 3 | Lobbying | LDA: Palantir, Meta, Google, Walmart, SpaceX |
| 3–4 | Contracts | USAspending + SAM: Palantir, SpaceX, Google, Meta, Groq, PsiQuantum, Oklo |
| 4–5 | Nonprofits | Koch, New America, ADL, Mercatus, Federalist Society + IRS Schedule I recipients |
| 5–6 | VC/funds | SEC EDGAR: 8VC, Ribbit, Greylock, Fortress, Benchmark, Social Capital, Affinity |
| 6 | Non-US state | EC page, Find a Tender, KPC/PIF/Japan manual seeds |

### Repo layout

```
/importers
  /govuk
  /companies_house
  /lda
  /fara
  /irs_990
  /propublica
  /sec
  /usaspending
  /sam
  /contracts_finder
/manifests/raw
/manifests/normalized
/sql
/docs
/tests
```

**Manifest naming:** `<source_key>/<YYYY>/<MM>/<DD>/<stable-document-id>.json`

**Tooling stack:** `httpx`, `tenacity`, `pydantic`, `orjson`/`ijson`, `lxml`/`selectolax`, `zipfile`+`lxml` for IRS/SEC XML, `polars` for CSV-heavy sources, `sqlalchemy`+`alembic`, `networkx` or materialized edge table for path computation, `pytest`+`vcrpy`/`respx`, `ruff`+`mypy`+`pre-commit`

---

## Part 19: Editorial Strategy

*Source: deep-research-report__35__*

### The structural problem

Report 32's thesis is strongest as a **structural argument about camouflage**, not a grab-bag of anomalous links. The three mechanisms work together because each exploits a different documentary blind spot:

- **Mission mismatch** — makes the institutional pairing feel socially or narratively implausible. Meta says "build the future of human connection." The Army says Detachment 201 helps the force become "leaner, smarter, and more lethal." Both are true. Neither audience sees the other frame.
- **Bio gap** — keeps consequential affiliations out of the most easily consumed public biographies. The public record did not lie — it was not assembled in a way that let anyone see the whole picture.
- **Procurement invisibility** — locates operational proof in record systems that are fragmented, delayed, thresholded, or incomplete. USAspending acknowledges subaward tracking limits. GAO has repeatedly found transparency problems around OTAs, consortium management firms, and DOD outcome tracking. **The visibility problem is endogenous to the systems.**

This is why the story cannot be published as a succession of odd discoveries — it will read like coincidence-hunting. Published as a theory of documentary camouflage, readers understand why these edges were hard to see, why some are visible only in one archive, and why a methodology story is part of the story itself.

### Publication sequencing

| Proposed piece | Core claim | Primary proof base | Status |
|---|---|---|---|
| **Detachment 201 opener** | Formal Army Reserve layer connects senior tech executives across major firms | Army announcements, company bios, leadership pages | **Publish first** |
| **Bio-gap follow-up** | Public bios become materially different once military role is added | Leadership pages, corporate announcements, Army swearing-in records | Publish with primary-source support |
| **Procurement explainer** | Operational effects and contracting records are harder to see than personnel links | USAspending, SAM.gov, GAO, agency records | Publish after award-path verification |
| **990 / Form D design piece** | Financing, related entities, and governance may explain how the topology was built | IRS TEOS/XML, SEC EDGAR/Form D datasets | Hold until extraction complete |
| **Cluster I investigation** | Additional nodes may extend the pattern | Only after node-by-node primary verification | Internal only until upgraded |

### Why Detachment 201 goes first

Best ratio of surprise to proof. The Army announcement:
- States that Det. 201 is an Army Reserve unit recruiting senior tech executives as part-time senior advisers on targeted projects
- Names Bosworth, Sankar, Weil, and McGrew by name
- Explains the policy rationale in the Army's own language: "leaner, smarter, and more lethal"
- June 2026 follow-up confirms second cohort, describes concrete influence areas (munitions supply chain, Organic Industrial Base, autonomous systems, counter-drone strategy)
- The program is durable and repeatable, not a one-off ceremony

The most disciplined first-story claim: the Army created a formal Reserve vehicle that places senior executives from Meta, Palantir, and OpenAI-aligned leadership in the same modernization channel, openly, in its own words, for military technology transformation. **Already publishable on primary sources alone.**

### Bio-gap narrative template

**Lead:** the public bio and the institutional identity it implies. For Bosworth — Meta's leadership page. For Sankar — Palantir's proxy statement. For Weil — OpenAI's official leadership announcement.

**Second paragraph:** the official edge that complicates that identity — the Army's Detachment 201 announcement.

**Third paragraph:** what the second record says the role actually does (munitions supply chains, autonomous systems, counter-drone).

**Fourth paragraph:** why the two-record juxtaposition matters structurally, not just personally. This is where the larger camouflage thesis enters.

**The reveal is not speculative.** It is a shift from one official record to another official record that most readers would never have thought to put side by side.

| Evidence type | Use | Source |
|---|---|---|
| Leadership pages | Establish public-facing identity | Official company site |
| Corporate announcements | Establish role, remit, timing | Official newsroom |
| Proxy statements / SEC filings | Establish titled roles and legal capacities | SEC EDGAR |
| Army announcements | Establish military role, cohort, mission | Army / Army Reserve official sites |
| IRS 990 schedules | Establish related entities, transactions, governance | IRS TEOS / bulk XML |
| Procurement databases | Establish award, agency, vendor traces | USAspending / SAM.gov |
| GAO / IG reports | Establish system-level visibility limits | Official oversight bodies |

### What the 990 / Form D layer adds

This layer moves reporting from **personnel adjacency to entity architecture**.

**IRS Form 990** — not just a financial statement:
- Schedule R: related organizations and transactions
- Schedule L: transactions with interested persons
- Part VII + Schedule J: key employees and compensation
- Schedule O: narrative explanations where opaque organizational changes appear in prose
- IRS makes 990-series returns public through TEOS and bulk XML downloads — scalable extraction, not manual

**SEC Form D** — notice for exempt offerings under Regulation D:
- Filed after first sale of securities
- Includes promoters, executive officers, directors, and offering details
- SEC publishes structured Form D datasets from XML submissions
- Useful for revealing existence, timing, personnel, and legal identity of private exempt offerings that otherwise never enter reporting

**Important caveat:** IRS disclosure rules do not make everything public. Most exempt organizations are generally not required to publicly disclose contributor names and addresses. The 990 layer can show structure, compensation, related organizations, governance, and transactions — but not always the full donor graph.

### Cluster I risk management

A node moves from LOW to publishable only when:
1. Identity resolved to a specific legal or institutional entity
2. Edge shown in at least one primary document and corroborated by a second independent record
3. Dates line up
4. Edge can be described in ordinary language without inferential leaps larger than the documents can bear
5. Role is dated and attached to the correct capacity (employee / officer / adviser / board member / military role / contractor / grantee / promoter)

**If a low-confidence cluster is published in the same rhetorical register as Detachment 201, readers will assume the proof quality is the same. Tier separation is mandatory.**

### Deliverables package

**1. Detachment 201 source packet:**
- Army announcement + archived copy
- Dated principal list (Bosworth, Sankar, Weil, McGrew)
- Screenshots/archives of relevant company bios
- One-page claims sheet: every factual sentence + supporting primary source

**2. Bio-gap dossiers (one per principal):**
- Public bio
- Dated changes if any
- Army edge (source + locator)
- Note on why juxtaposition matters

**3. 990/Form D extraction deliverable:**
- Normalized entity-and-edge dataset
- Memo distinguishing documentary edges from inferential edges

**4. Cluster I:** Internal-only queue until upgrade criteria met.

### Required visuals (three classes)

**Network graph:** color-coded by edge type — military service / corporate role / nonprofit relation / financing relation / procurement relation. Every visual edge carries a source tag and evidence tier.

**Timeline:** overlays when each public bio role exists alongside each less-visible edge.

**Entity-relationship chart:** separates people, companies, nonprofits, military units, filings, and award systems.

**Visual discipline mirrors evidence discipline: every visual edge must carry a source tag and an evidence tier.**

### Phrasing discipline

**Bad:**
- "X is part of the Clifford machine."
- "X is associated with Y."

**Good:**
- "X was appointed as Y on date Z."
- "X appears as a director of company N in a Companies House filing."
- "Registrant A reported lobbying client B on issue C and listed Senate / House as contacted entities."
- "Organization M reported grants to N on Schedule I for tax year T."

**The published unit is always a claim, not an insinuation.**

---

## Part 21: UK No. 10 / GCHQ / DSIT Revolving Door

**Source:** Deep Research Backing Conversation (session PDF)  
**Evidence class:** `official` / `primary_public` / `reported` as noted per person  
**UI weight:** 1–2 for named roles; 3 for post-gov private positions  
**Note:** This cluster maps the institutional pipeline between UK government AI/data/security roles and private sector, think tanks, and venture-adjacent positions. These are not Dialog nodes. They are the operational layer that surrounds and implements the Clifford policy spine.

---

### Ben Warner

| Field | Value |
|---|---|
| Gov role | Chief Advisor on Digital and Data to the Prime Minister, No. 10 / Cabinet Office |
| Gov tenure | December 2019 – May 2021 |
| Post-gov role | Co-founder & Chief Data Scientist, Electric Twin (AI market research startup) |
| Post-gov start | September 2023 |
| Evidence class | primary_public / official |
| Sources | Official No. 10 bio; Electric Twin funding reports; Companies House Electric Twin Ltd |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `chief-advisor-on` | Digital and Data, No. 10 / Cabinet Office | Dec 2019 – May 2021 | official |
| `co-founded` | Electric Twin | Sep 2023 | primary_public |
| `role-at` | Electric Twin (Chief Data Scientist) | Sep 2023–present | primary_public |
| `previously-ran` | Vote Leave data modelling | pre-2019 | reported |

**Electric Twin funding:**

| Investor | Type | Evidence Class |
|---|---|---|
| Atomico | Lead, Series A (~$10M) | reported |
| LocalGlobe | VC | reported |
| Mercuri | VC | reported |
| Samos | VC | reported |
| Marc Andreessen | Angel | reported |
| Cal Henderson | Angel | reported |
| Tom Shinner | Angel (EF-linked) | reported |
| Louis Mosley | Angel (Palantir EVP) | reported |

**Note on Louis Mosley:** Palantir EVP as angel investor in Electric Twin is a cross-surface hit — Palantir is a central node in the graph. Flag for `surprise-edge` field.

---

### Dr. Laura Gilbert CBE

| Field | Value |
|---|---|
| Gov role 1 | Founding Director, 10 Downing Street Data Science Unit (10DS), No. 10 |
| Gov tenure 1 | September 2020 – January 2025 |
| Gov role 2 | Director, Incubator for AI (i.AI), Cabinet Office |
| Gov tenure 2 | January 2023 – January 2025 |
| Post-gov role | Senior Director AI & Innovation, Ellison Institute of Technology (Oxford) — Head of AI for Government Programs |
| Post-gov start | January 2025 |
| Continued access | One day/week: Expert Advisor to Digital Centre of Government (DSIT); one day/week: Tony Blair Institute (AI & Innovation team) |
| Evidence class | reported / official |
| Sources | OpenUK expert profile; EIT Oxford announcement |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `founding-director-of` | 10 Downing Street Data Science Unit (10DS) | Sep 2020 – Jan 2025 | official |
| `director-of` | Incubator for AI (i.AI), Cabinet Office | Jan 2023 – Jan 2025 | official |
| `senior-director-at` | Ellison Institute of Technology, Oxford | Jan 2025–present | reported |
| `expert-advisor-to` | Digital Centre of Government (DSIT) | post Jan 2025, 1 day/week | reported |
| `advisor-to` | Tony Blair Institute (AI & Innovation) | post Jan 2025, 1 day/week | reported |

**Org funders:**

| Org | Funder | Evidence Class |
|---|---|---|
| Ellison Institute of Technology | Sir John Bell + philanthropic donors | reported |
| Tony Blair Institute | Gulf states (Saudi, Abu Dhabi) + corporate sponsors | reported |

**Note:** Tony Blair Institute funder profile (Saudi, Abu Dhabi) is a cross-surface hit with the Saudi/Gulf sovereign capital layer in Part 11. Flag.

---

### Dr. Jade Leung

| Field | Value |
|---|---|
| Gov role | Prime Minister's AI Adviser, No. 10 |
| Gov start | August 2025–present |
| Concurrent role | Chief Technology Officer, UK AI Security Institute (AISI) — government-funded |
| AISI tenure | October 2023–present |
| Continued access | Splits time between No. 10 and AISI |
| AISI funding | £66M+ annual (UK government) |
| Evidence class | official |
| Sources | UK Tech News; AISI About page; Wikipedia |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `appointed-as` | Prime Minister's AI Adviser | Aug 2025 | official |
| `CTO-of` | UK AI Security Institute (AISI) | Oct 2023–present | official |
| `fmr-governance-lead-at` | OpenAI | pre-Oct 2023 | reported |

**Note:** Jade Leung was already in v3 as Clifford's successor node (Part 1). These edges expand that node with AISI funding, OpenAI background, and the concurrent dual-role structure.

---

### Dr. Marc Warner

| Field | Value |
|---|---|
| Gov role | Informal AI advisor (via Faculty) during COVID; attended SAGE meetings as Faculty CEO |
| Gov period | March 2020 |
| Post-gov role | Co-founder & CEO, Faculty (AI consultancy) 2014–present; CTO, Accenture (following Accenture acquisition of Faculty) |
| Post-gov start | March 2026 (Accenture CTO) |
| Continued access | Faculty continues multiple UK government AI contracts (NHS COVID data modelling, AI strategy review) |
| Evidence class | reported |
| Sources | The Guardian (Faculty SAGE involvement); Accenture press release |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `attended-as-private-CEO` | SAGE (Scientific Advisory Group for Emergencies) | March 2020 | reported |
| `co-founded` | Faculty (AI consultancy) | 2014 | primary_public |
| `CEO-of` | Faculty | 2014–2026 | primary_public |
| `CTO-of` | Accenture (post-acquisition of Faculty) | March 2026–present | reported |

**Faculty gov contracts:**

| Contract | Client | Evidence Class |
|---|---|---|
| NHS early warning AI system | NHS / UK government | reported |
| Cross-government AI adoption review | UK government | reported |
| COVID data modelling | UK government | reported |

**Faculty investors (pre-acquisition):**

| Investor | Evidence Class |
|---|---|
| Lord Agnew | reported |
| Andreessen Horowitz | reported |

**Note:** Andreessen Horowitz is a cross-surface hit (also angels into Electric Twin via Marc Andreessen). Flag.

---

### Alex Cooper

| Field | Value |
|---|---|
| Gov role | Director of Mass COVID-19 Testing (Head of UK national testing programme), DHSC / No. 10 testing taskforce |
| Gov period | 2020 |
| Post-gov role | Co-founder & CEO, Electric Twin |
| Post-gov start | September 2023 |
| Evidence class | primary_public |
| Sources | BusinessCloud (Electric Twin founders); Companies House Electric Twin |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `director-of` | UK Mass COVID-19 Testing programme, DHSC / No. 10 | 2020 | official |
| `co-founded` | Electric Twin | Sep 2023 | primary_public |
| `CEO-of` | Electric Twin | Sep 2023–present | primary_public |

**Note:** Alex Cooper + Ben Warner both co-founding Electric Twin after No. 10 roles — two former No. 10 data officials founding same AI startup. Simon Case (fmr Cabinet Secretary) then joined Electric Twin ethics board. That's a three-person No. 10 alumni cluster in one private company.

---

### Adam Beaumont CBE

| Field | Value |
|---|---|
| Gov role | Chief AI Officer, GCHQ |
| Gov period | Pre-2024 (date unspecified) |
| Post-gov role | Interim Director, UK AI Security Institute (AISI) |
| Post-gov start | 2024–present |
| Continued access | Now leads a government unit (AISI) — still within civil apparatus |
| AISI funding | £66M/year (UK government) |
| Evidence class | official |
| Sources | GOV.UK profile |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `fmr-chief-AI-officer-of` | GCHQ | pre-2024 | official |
| `interim-director-of` | UK AI Security Institute (AISI) | 2024–present | official |

**Note:** Intelligence-to-policy pipeline in a single career: GCHQ top AI role → running AISI. Cross-surface with Jade Leung (also at AISI).

---

### Ian Hogarth

| Field | Value |
|---|---|
| Gov role | Chair, UK AI Security Institute (formerly AI Safety Institute / Frontier AI Taskforce), DSIT |
| Gov tenure | June 2023 – December 2025 |
| Post-gov role | General Partner, Plural (tech VC fund); co-founder, Songkick |
| Continued access | Plural backed by US tech investors; retains informal AI startup network |
| Conflict management | Divested Anthropic, Stability AI shares on appointment |
| Evidence class | official |
| Sources | DSIT declared interests |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `chaired` | UK AI Security Institute (AISI) / Frontier AI Taskforce | Jun 2023 – Dec 2025 | official |
| `general-partner-at` | Plural (VC) | current | primary_public |
| `co-founded` | Songkick | — | primary_public |
| `divested-on-appointment` | Anthropic shares | Jun 2023 | official |
| `divested-on-appointment` | Stability AI shares | Jun 2023 | official |

---

### Sir Jeremy Fleming

| Field | Value |
|---|---|
| Gov role | Director, GCHQ |
| Gov tenure | April 2017 – May 2023 |
| Post-gov role | Chair, Strategic Advisory Board, GALLOS Technologies (security tech venture studio) |
| Post-gov start | September 2023 |
| Ethics approval | ACOBA approved |
| Evidence class | official |
| Sources | GALLOS announcement |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `director-of` | GCHQ | Apr 2017 – May 2023 | official |
| `chair-strategic-advisory-board-of` | GALLOS Technologies | Sep 2023–present | reported |
| `ACOBA-approved-for` | GALLOS Technologies role | 2023 | official |

**Note:** Fmr. GCHQ chief → shaping early-stage defence AI venture studio. Intelligence-to-investment channel with official ethics approval. GALLOS is co-founded by Josh Burch and Dean Jones.

---

### Jonathan Black

| Field | Value |
|---|---|
| Gov role | Deputy National Security Adviser & G7/G20 Sherpa, No. 10 |
| Gov tenure | 2019 – 2025 |
| Post-gov role | Distinguished Visiting Fellow, Center on Global Energy Policy, Columbia University (SIPA); Fellow, Ditchley Foundation |
| Post-gov start | 2026 |
| Surprise edge | Co-led UK's G7 presidency and Bletchley AI Safety Summit 2023 |
| Evidence class | primary_public |
| Sources | Columbia SIPA profile |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `deputy-national-security-adviser` | No. 10 | 2019–2025 | official |
| `G7-G20-sherpa` | No. 10 | 2019–2025 | official |
| `co-led` | Bletchley AI Safety Summit 2023 | 2023 | official |
| `visiting-fellow-at` | Columbia SIPA, Center on Global Energy Policy | 2026–present | primary_public |
| `fellow-at` | Ditchley Foundation | current | primary_public |

---

### Sir Simon Case (Lord Case)

| Field | Value |
|---|---|
| Gov role | Cabinet Secretary & Head of Civil Service, Cabinet Office |
| Gov tenure | 2020 – December 2024 |
| Post-gov role 1 | Ethics Board Advisor, Electric Twin |
| Post-gov start 1 | June 2026 |
| Post-gov role 2 | Chairs "Team Barrow" development fund (£200M — UK Gov + BAE Systems + local council) |
| Evidence class | reported |
| Sources | The Times (Case joins Electric Twin) |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `cabinet-secretary-and-head-of-civil-service` | Cabinet Office | 2020 – Dec 2024 | official |
| `ethics-board-advisor-of` | Electric Twin | Jun 2026–present | reported |
| `chairs` | Team Barrow development fund (£200M) | current | reported |

**Team Barrow funders:**

| Funder | Type | Evidence Class |
|---|---|---|
| UK Government | Public | reported |
| BAE Systems | Industry | reported |
| Local council | Public | reported |

**Note:** This is the most structurally significant node in this cluster. The fmr. Cabinet Secretary (highest civil servant in UK government) joined Electric Twin's ethics board in June 2026 — a company co-founded by two of his former No. 10 colleagues (Ben Warner, Alex Cooper). He simultaneously chairs a £200M public-private fund with BAE Systems. Three roles, one person, all bridging the same No. 10 → private sector → defence industrial corridor. BAE Systems is also a cross-surface hit with the defence/AUKUS umbrella layer. Flag as `surprise-edge` weight 1.

---

### Markus Anderljung

| Field | Value |
|---|---|
| Gov role | Senior AI Policy Specialist (seconded to UK Cabinet Office) |
| Gov period | ~2021–2022 |
| Post-gov role | Director of Policy and Research, Centre for the Governance of AI (GovAI) |
| Post-gov start | 2022–present |
| Continued access | Co-chairs EU AI Code of Practice drafting |
| GovAI funders | Open Philanthropy, Centre for Emerging Risk, other philanthropies |
| Evidence class | official / primary_public |
| Sources | GovAI team page |

**Typed edges:**

| Predicate | Object | Date | Evidence Class |
|---|---|---|---|
| `seconded-to` | UK Cabinet Office (AI Policy) | ~2021–2022 | official |
| `director-policy-research-at` | Centre for the Governance of AI (GovAI) | 2022–present | primary_public |
| `co-chairs` | EU AI Code of Practice drafting | current | reported |

---

### Electric Twin — Consolidated Org Node

Electric Twin is the most structurally dense private node in this cluster. Three No. 10 alumni co-founded it; the fmr. Cabinet Secretary joined its ethics board; and its investor list includes a Palantir EVP.

| Predicate | Object | Evidence Class |
|---|---|---|
| `co-founded-by` | Ben Warner (fmr. No. 10 Chief Data Advisor) | primary_public |
| `co-founded-by` | Alex Cooper (fmr. DHSC/No. 10 COVID testing director) | primary_public |
| `ethics-board-advisor` | Simon Case (fmr. Cabinet Secretary) | reported |
| `angel-investor` | Louis Mosley (Palantir EVP) | reported |
| `angel-investor` | Marc Andreessen | reported |
| `lead-investor` | Atomico (~$10M Series A) | reported |
| `total-raised` | ~$10M+ | reported |
| `product` | AI market research / synthetic population platform | primary_public |
| `customers` | News UK, Lebara (marketing) | reported |

**Umbrella membership:** U09 Synthetic populations and audience modelling — `primary_public`

---

### AISI — Consolidated Org Node

The UK AI Security Institute appears across four people in this cluster. Consolidating:

| Person | Predicate | Date | Evidence Class |
|---|---|---|---|
| Ian Hogarth | `chaired` (as Frontier AI Taskforce / AISI) | Jun 2023 – Dec 2025 | official |
| Adam Beaumont | `interim-director-of` | 2024–present | official |
| Jade Leung | `CTO-of` | Oct 2023–present | official |
| Jade Leung | `PM-adviser-while-at` | Aug 2025–present | official |

| Field | Value | Evidence Class |
|---|---|---|
| Annual funding | £66M+ (UK government) | official |
| Type | Government-funded AI research body | official |
| Reporting line | DSIT | official |

---

### New Umbrella Memberships from this cluster

| Entity | Umbrella | Membership Type | Evidence Class | Notes |
|---|---|---|---|---|
| Electric Twin | U09 | data-layer | primary_public | "synthetic population" AI product |
| Electric Twin | U02 | delivery-layer | reported | Founded by No. 10 alumni; Simon Case ethics board |
| Faculty / Accenture | U04 | delivery-layer | reported | NHS AI contracts, cross-govt AI review |
| GALLOS Technologies | U06 | defence-layer | reported | Security tech venture studio; fmr. GCHQ director chairs advisory board |
| GovAI | U13 | policy-layer | primary_public | Open Philanthropy funded; co-chairs EU AI Code |
| Tony Blair Institute | U13 | policy-layer | reported | Gulf-state funded; Gilbert advises one day/week |
| Team Barrow | U07 | sovereignty-layer | reported | £200M public-private; BAE Systems; Case chairs |

---

### New Sources from this cluster

| # | Source | Date | Type | Evidence Class |
|---|---|---|---|---|
| S41 | Official No. 10 bio — Ben Warner | — | official | official |
| S42 | Companies House — Electric Twin Ltd | current | primary_public | primary_public |
| S43 | Electric Twin funding reports (Atomico Series A) | — | reported | reported |
| S44 | OpenUK expert profile — Dr. Laura Gilbert CBE | current | primary_public | primary_public |
| S45 | EIT Oxford announcement — Gilbert appointment | Jan 2025 | reported | reported |
| S46 | UK Tech News — Jade Leung appointment | Aug 2025 | reported | reported |
| S47 | AISI About page | current | official | official |
| S48 | Wikipedia — Jade Leung | current | secondary | reported |
| S49 | The Guardian — Faculty SAGE involvement | 2020 | journalism | reported |
| S50 | Accenture press release — Faculty acquisition | Mar 2026 | primary_public | reported |
| S51 | BusinessCloud — Electric Twin founders | — | journalism | reported |
| S52 | GOV.UK profile — Adam Beaumont CBE | current | official | official |
| S53 | DSIT declared interests — Ian Hogarth | Jun 2023 | official | official |
| S54 | GALLOS Technologies announcement — Fleming | Sep 2023 | primary_public | reported |
| S55 | Columbia SIPA profile — Jonathan Black | 2026 | primary_public | primary_public |
| S56 | The Times — Simon Case joins Electric Twin ethics board | Jun 2026 | journalism | reported |
| S57 | GovAI team page — Markus Anderljung | current | primary_public | primary_public |

---

## Part 20: Darkhive / Fleetforge — Separate Research Thread

*Source: deep-research-report__26__ — Darkhive Fleetforge and Attritable Autonomy Supply Chain Report*

**Status: SEPARATE THREAD — not part of Dialog/Clifford network. Filed here for completeness; treat as independent research.**

This thread covers the Darkhive APFIT contract, LUCAS program architecture, and supply-chain sovereignty for attritable autonomy. Full analysis preserved in standalone file: `darkhive-fleetforge-attritable-autonomy.md`.

**Key findings summary:**
- Darkhive received a $49.7M APFIT award tied to Army "Real-Time Command and Control at the Tactical Edge"
- Prior raise: $21M from Ten Eleven Ventures (2024)
- Products: Yellowjacket, Obelisk, Redqueen, Fleetforge
- LUCAS program (SpektreWorks): modular, ~$35K/unit, government-owned design IP, Viasat/SpaceX connectivity, Noda software
- The real hazard is **integrated-stack lock-in**, not just modem lock-in — compute BSP, secure boot chains, radio drivers, and OTA update paths all interact
- Mitigation: dual-lane architecture (SWaP-optimized + portability/auditability), modular radio abstraction, signed SBOM + provenance attestation, government-controlled key hierarchy, explicit data rights in contract before LRIP-scale buy
- "Zombie hardware" revival is technically valid: chassis/optics/antennas retain value when compute/radio/BSP is replaced; DE&S Deca and Rochester Electronics are live institutional examples

**Public verification gap:** Darkhive's exact role inside LUCAS, the specific Qualcomm module path, and Doodle Labs integration details are **not confirmed in public record** — these appear in the uploaded scenario memo. Architecture decisions should be framed as contingencies until verified.

