# Source: synthetic-audiences

Synthetic-audience / Electric Twin research programme: GitHub issues #29-#52, every body and comment verbatim, plus a table of every URL and hash they cite.

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

## Origin

| Field | Value |
|---|---|
| Issues | #29-#52 of `BigBirdReturns/clifford-number`: 23 issues, closed 2026-08-11 (state_reason `not_planned`, bulk close), created 2026-07-19; and #50, which is the staging pull request (`agent/synthetic-population-fanout`, draft, closed unmerged 2026-08-11) |
| Retrospective record | bodies `retrospective/2026-10-12/github/issue-bodies.jsonl` (lean) and `issues-full.jsonl` (API objects; the two bodies were compared and are identical); comments `retrospective/2026-10-12/github/issue-comments-full.jsonl` (API objects with ids, authors, timestamps) and `comments.jsonl` (lean; bodies compared and identical); PR #50 from `pulls-full.jsonl` and `pr-bodies.jsonl` |
| Volume | 24 files, 86 comments; last comment 2026-08-13T01:00:53Z |
| Trail rows | `retrospective/2026-10-12/trails/tiered-trails.json` entry [3] "Electric Twin's '96% independently validated' claim" (tier A); `retrospective/2026-10-12/trails/tiered-trails.json` entry [4] "Synthetic audiences in real use: Times ExplorAItion and others" (tier A); `retrospective/2026-10-12/trails/tiered-trails.json` entry [6] "Clinical-trial 'digital twins': what the EMA actually qualified" (tier A); `retrospective/2026-10-12/trails/tiered-trails.json` entry [24] "Synthetic-audience market map (F-01 to F-20)" (tier B); `retrospective/2026-10-12/trails/tiered-trails.json` entry [25] "What synthetic-audience vendors disclose about models, clouds and data" (tier B); `retrospective/2026-10-12/trails/tiered-trails.json` entry [26] "Professional rules for synthetic respondents (MRS, ESOMAR, AAPOR)" (tier B) |
| Related branch | `agent/synthetic-population-fanout` (PR #50): 5 research files in `branch-synthetic-population-fanout/` (see its `SOURCE.md`) |

## Files

- `issue-NNN.md`: one file per issue (and #50): front matter (metadata from the API object), then the body and every comment, each between `<!-- BEGIN ... bytes=N sha256=H -->` and `<!-- END ... -->` marker lines. The text between the markers is the original text unmodified (exactly `bytes` UTF-8 bytes after the BEGIN line); comments are in creation order.
- `items.tsv`: every body and comment with author, timestamp, byte count and the SHA-256 of its verbatim text.
- `receipts.jsonl`: 462 rows, one per citation of a URL (416 rows, 265 distinct), a SHA-256 (15 rows, 15 distinct) or a 40-hex git commit/tree id (31 rows, 25 distinct). Each row: issue, item (`body` or `comment`), comment id and URL, timestamp, author, line number, the nearest preceding markdown heading (`section`, which carries the "bounded findings receipt" titles), `type`, `value`, the full line as `context`, and for hashes `nearest_url`. Extraction is mechanical (regular expressions over the verbatim text); nothing was re-fetched, so a cited URL is a record of what the comment cited, not a claim that it still resolves.
- `branch-synthetic-population-fanout/`: the five research files of the PR #50 branch (selection coverage, discovery seeds, program manifest, selection, program document).

## Issues

| # | Kind | Title | State | Created | Closed | Comments | Trail rows naming it |
|---:|---|---|---|---|---|---:|---|
| 29 | issue | [Research fan-out: Electric Twin capability lineage and governance](issue-029.md) | closed | 2026-07-19 | 2026-08-11 | 6 | [3] |
| 30 | issue | [Research program: synthetic populations, state transfer, and modeled publics](issue-030.md) | closed | 2026-07-19 | 2026-08-11 | 7 | [24] |
| 31 | issue | [Research fan-out: No. 10 and pandemic-data personnel diaspora](issue-031.md) | closed | 2026-07-19 | 2026-08-11 | 1 | none |
| 32 | issue | [Research fan-out: 10DS to i.AI to GDS/DSIT institutional succession](issue-032.md) | closed | 2026-07-19 | 2026-08-11 | 1 | none |
| 33 | issue | [Research fan-out: Faculty to Accenture public-sector AI scaling](issue-033.md) | closed | 2026-07-19 | 2026-08-11 | 1 | [5] |
| 34 | issue | [Research fan-out: Commercialisation of pandemic decision infrastructure](issue-034.md) | closed | 2026-07-19 | 2026-08-11 | 1 | [10] |
| 35 | issue | [Research fan-out: Validator-to-adviser scientific legitimacy market](issue-035.md) | closed | 2026-07-19 | 2026-08-11 | 3 | [24] |
| 36 | issue | [Research fan-out: Centre for Human Progress behavioural-science bridge](issue-036.md) | closed | 2026-07-19 | 2026-08-11 | 1 | none |
| 37 | issue | [Research fan-out: Former-official AI advisory portfolios and post-office controls](issue-037.md) | closed | 2026-07-19 | 2026-08-11 | 1 | [53] |
| 38 | issue | [Research fan-out: Gartner and analyst-made synthetic-population category](issue-038.md) | closed | 2026-07-19 | 2026-08-11 | 3 | [24] |
| 39 | issue | [Research fan-out: Publisher synthetic-audience deployment corpus](issue-039.md) | closed | 2026-07-19 | 2026-08-11 | 4 | [4] |
| 40 | issue | [Research fan-out: Modelled populations replacing observed consultation](issue-040.md) | closed | 2026-07-19 | 2026-08-11 | 26 | none |
| 41 | issue | [Research fan-out: Political persuasion and message-optimisation use](issue-041.md) | closed | 2026-07-19 | 2026-08-11 | 1 | none |
| 42 | issue | [Research fan-out: Government, classified, and defence deployment](issue-042.md) | closed | 2026-07-19 | 2026-08-11 | 1 | none |
| 43 | issue | [Research fan-out: Synthetic-data lineage, consent, and anonymisation](issue-043.md) | closed | 2026-07-19 | 2026-08-11 | 4 | [25] |
| 44 | issue | [Research fan-out: Metric and benchmark governance for synthetic populations](issue-044.md) | closed | 2026-07-19 | 2026-08-11 | 4 | [3] |
| 45 | issue | [Research fan-out: Cross-cultural and multilingual extrapolation](issue-045.md) | closed | 2026-07-19 | 2026-08-11 | 3 | [3] |
| 46 | issue | [Research fan-out: Foundation-model, cloud, and subprocessor dependence](issue-046.md) | closed | 2026-07-19 | 2026-08-11 | 4 | [25] |
| 47 | issue | [Research fan-out: Capital, board control, and strategic rights](issue-047.md) | closed | 2026-07-19 | 2026-08-11 | 3 | none |
| 48 | issue | [Research fan-out: Labour substitution and professional research standards](issue-048.md) | closed | 2026-07-19 | 2026-08-11 | 2 | [26] |
| 49 | issue | [Frontier fan-out: second-order seams exposed by synthetic-population infrastructure](issue-049.md) | closed | 2026-07-19 | 2026-08-11 | 5 | [24] |
| 50 | pull_request | [Stage synthetic-population research program](issue-050.md) | closed | 2026-07-19 | 2026-08-11 | 0 | none |
| 51 | issue | [Research fan-out: Synthetic-response standards, disclosure, and enforcement scope](issue-051.md) | closed | 2026-07-19 | 2026-08-11 | 2 | [26] |
| 52 | issue | [Research fan-out: Clinical-trial digital twins and regulatory qualification scope](issue-052.md) | closed | 2026-07-19 | 2026-08-11 | 2 | [6] |
