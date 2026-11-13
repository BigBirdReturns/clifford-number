# DePue / Coxon amplification chain: report (2026-11-13)

The supervising session's report of 13 November 2026, adapted for this research batch: the ledger entry paragraphs below say what this pass entered. Traced on the owner's "do it?" (12 November 2026: continue the proof) and entered on his "Yes, enter them" (13 November 2026), the answer to "Enter the 20 admission-ready lines into the ledger?".

Files in this folder:

- `dispositions.jsonl`: every lead (134) with its ruling.
- `lines.json`: the 32 typed lines, admission-ready or not, with dates, evidence class and what is missing.
- `candidate-graph.json`: the 12 lines that fall short of admission, each with what it needs before it could be entered.

The ledger intake is `data/intake/amplification-chain/amplification-chain.json` (20 source pages, 20 drafted surfaces); the lane is `tools/promote-intake-amplification-chain.mjs` and its staged rows, gaps and summary are in `data/ledger/staging/amplification-chain/`. Every surface is `hop_eligible: false` (`entered_2026_11_13_pending_hop_review`); there is no hop-bases ruling for this lane. X posts are archived through their api.fxtwitter.com JSON mirror URLs, the ledger's first such source.

The question: NIK (@ns123abc) posted a chart titled "509 accounts with 8.5M followers amplified both posts" and called Will DePue's Blackwell result of 12 November "Jacob Coxon 2.0". In other words, he said the network that pushed Coxon's resignation thread also pushed DePue's post. A pasted analysis added three claims:

* DePue had defended Coxon as a close friend.
* FTI found that Encode coordinated the amplification.
* The Washington Post reported Coxon recruiting about ten people.

Nine research hands returned 134 leads, and I read the key pages and X posts myself. Every lead is ruled in `dispositions.jsonl`: 16 admission-ready, 13 candidate, 82 context, 23 rejected. The 32 typed relationships are in `lines.json`; the 12 that fall short of admission are in `candidate-graph.json`. At the time of this report nothing had entered the ledger; see Ledger entry below for what this pass entered.

## Answer

**The core of the overlap is real, and it is the same people.** The group around Encode that Coxon himself named as his early amplifiers also amplified DePue's post within minutes:

| | Coxon, 9 Sep 2026 (UTC) | DePue, 12 Nov 2026 (UTC) |
|---|---|---|
| Nathan Calvin, Encode chief strategy officer | quote-post at +6m06s, "Extremely powerful and urgent thread" (read) | quote-post at +16m17s, "Brilliant work from Will, and strong evidence that ... we don't robustly enforce them" (read); a second quote at 22:21, "Bullish", on DePue's fundraising post |
| Sneha Revanur, Encode founder | repost at +2m28s (FTI); in Coxon's group chat of about 10 (his own words to the Post) | repost, in her timeline (read; X gives no time) |
| Daniel Kokotajlo, AI Futures Project | Coxon "also spoke with" him (Post); on the chart at +10m | repost, in his timeline (read; X gives no time) |

**What this does not show:**

* **There is no evidence of coordination with DePue.** Nothing ties DePue to Encode, Kokotajlo or any advocacy group. DePue's ties run to OpenAI (2023 to 2026) and to his own Unemployment Labs. In a 22:08 post he described it as a subsidiary of Macrogrants, a non-profit with 501(c)(3) status pending, raising $5M. Coxon admitted to a group chat; nobody has said anything similar about DePue.
* **The engagement fits the advocates' standing position.** The result supports export-control enforcement, which these people already argue for in public. Calvin's quote says so in its own words. Fast engagement by a small, tight network is how that network behaves. It does not establish an operation.
* **The chart cannot carry its own title.** Only 180 of the 509 accounts have a time on DePue's post, all of them quote-posts or replies. The other 329 are untimed reposts. "180 of 509 by minute 172" just counts every timed account before the data stops. Replies, which can be criticism, count as amplification. 8.5M is followers summed, not reach. There is no control post, and the data file is not published.
* **The overlap is expected, apart from that core.** Coxon's post had 799,000 likes and 176 million views, so most active AI accounts touched it. DePue's first shared account, at minute 10, is anonymous. Only three advocacy-tagged accounts are timed on DePue's post (Calvin 16m, @GroundhogStrat 31m, @ericneyman 43m), against eight on Coxon's.
* **The friendship claim is rejected.** No source has DePue defending Coxon, calling him a close friend, or saying the two started together. The WSJ (17 Sep) quotes DePue calling Coxon "a former colleague" and a "normal researcher". The Post's "about three years" is Coxon's career. The site the analysis cites, Zamantika, refuses every request.

**The Coxon side, as documented:**

| Line | Relationship | Evidence | State |
|---|---|---|---|
| L10 | After posting, Coxon got "a group chat of about 10 people" to retweet; it included Encode's founder | His own words to the Washington Post, 10 Sep (read) | admission_ready |
| L7 | Calvin quote-posted Coxon at +6m06s | X timestamps (read) | admission_ready |
| L8, L9 | Encode founder at +2m28s and national-security director at +8m53s | FTI only | candidate |
| L11, L12 | Coxon spoke with Kokotajlo; Ethan Perez helped recruit him to Anthropic in May 2026 | Post (read) | candidate |
| L13 | DEY (communications firm) sought interviews for him from 9 Sep; an AI-safety author introduced him after 100k likes | Pirate Wires via RuntimeWire, RedState; Everything PR | candidate |
| L14 | Hubinger and Marks (Anthropic staff) endorsed the thread the same evening | Fortune | candidate |
| L19 | Survival and Flourishing Fund (Jaan Tallinn) to Encode: $50,000 (2024), $516,000 (2025) | SFF tables | admission_ready |
| L17, L18, L21 | Encode sponsored SB 1047 and SB 53, and co-led the 2025 coalition against the moratorium on state AI laws | Senator Wiener's office; joint release | admission_ready |
| L22 | OpenAI subpoenaed Encode and Calvin in Oct 2025 | Recipients' posts; NBC | candidate |
| L16 | Coxon testified at the NYC Council AI-risk hearing, 5 Oct 2026 | Council release | admission_ready |
| L15 | FTI, 9 Nov: "consistent with coordinated amplification by aligned advocacy efforts" at medium confidence. FTI also finds the author and the resignation genuine. It discloses no client or funder and gives no sample or method. | FTI | admission_ready as a report |

## The two sides of the narrative

* **Who says "op":** NIK and David Sacks. NIK is pseudonymous with no stated affiliation, and on 12 Nov he retracted his own "Anthropic IPO CANCELLED" post as a rumour. Sacks said "definitely an op" on All-In on 11 Sep. On the opposing side, Brockman and a16z back Leading the Future, which gave $500,000 to Build American AI. That figure comes from FEC data as reported by Transformer; I did not read the filing. No link was found from NIK or FTI to either side.
* **DePue's result:** By 13 Nov none of the four labs, Nvidia, Commerce, BIS or Congress had responded. His post overstates his report:
  * The post says the evidence is "conclusive" for six models. The report says it is conclusive only for DeepSeek-V4-Flash.
  * The post says "bit for bit". The report says 445 of 469 rows matched.
  * The post says researchers at labs confirmed the result. The report names no reviewer.
* **Earlier reports of the same claim:** DeepSeek's use of Blackwell chips was reported by The Information in Dec 2025 and by an administration official in Feb 2026. The three labs Anthropic accused of distillation in February are among DePue's four.

## Against the ledger

The ledger was checked at 75a831b4. It holds Anthropic, OpenAI, Greg Brockman, the Future of Life Institute and Open Philanthropy. It holds none of DePue, Coxon, NIK, Encode or its staff, FTI, SFF, Tallinn, Kokotajlo, Perez, Hubinger, Marks or Sacks.

The chain touches the existing graph in three places:

* Coxon's employment at Anthropic (L5)
* the endorsement by Anthropic staff (L14)
* FLI as a named Encode funder (L20)

Under the current hop rule, no admitted line becomes a hop: reposts, a group chat and a grant are not bounded shared surfaces. That describes the rule, not whether these relationships exist.

## Still open

* **Ledger entry (done 2026-11-13):** one lane pass on `work/galaxy-arrival-20261108` drafted 20 surfaces from 20 pages. 18 surfaces and 44 participation rows entered on 18 archived pages, minting 8 people and 9 organisations; no label resolved to an existing record other than the ledger ids the intake names (OpenAI, Anthropic). Gapped by the lane's rules: both SFF recommendation surfaces (the pages give the round's year and no date, so no date is guessed; Jaan Tallinn and SFF are not minted). Sneha Revanur's row on her repost of DePue was first gapped (her timeline shows the display name "Sneha", not "Sneha Revanur"); on the supervisor's review it is admitted on the handle SnehaRevanur, the timeline account's own identifier, and the row note records what the page shows. The Washington Post page carries "Published: September 11, 2026", so that surface is dated 11 September, not the 10 September in its URL.
* **Candidates that a primary record would close:** Revanur's repost time on Coxon's post (FTI is the only source), the subpoena docket, Leading the Future's FEC filings, and the Hubinger and Marks posts.
* **Not checked:**
  * NIK's 509-account file is unpublished, so the other starred first-hour accounts can't be checked one by one.
  * The reply threads under both posts can't be read through the mirror.
  * A post of Calvin's on 12 Nov says "I'm hiring" for a Senior AI Fellow role at Cal OES, while his bio still says Encode. His current role is unresolved.
