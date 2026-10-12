# Retrospective capture, 12 October 2026

This folder is a full record of what the agents did in this repo between 27 June and 14 September 2026. It covers everything on `main` plus the work that only lives in pull requests, issues, comments and branches. Nothing outside this folder was changed.

## What's here

| Path | What it is |
|---|---|
| `github/prs.tsv` | All 2,069 pull requests: number, state, branch, dates, title |
| `github/pr-bodies.jsonl` | The description of every pull request |
| `github/pr-files.jsonl` | Files changed by each of 1,442 closed pull requests |
| `github/issues.tsv`, `github/issue-bodies.jsonl` | All 599 issues and their bodies |
| `github/comments.jsonl` | Issue and pull request comments |
| `github/branches.txt` | All 2,345 branch names on GitHub |
| `github/branch-only-analysis.json` | Branches whose content never reached `main`, with what's on them |
| `github/topics.json` | Research topics clustered from PR, issue and branch titles, with on-main status |
| `trails/raw-trails.json` | 142 research trails, one row each: the question, how far it got, what it found |
| `trails/slice-*.json` | The same rows split by the six areas they were inventoried in |
| `trails/tiered-trails.json` | The 142 rows merged into 78 trails and tiered: show it, keep and finish, park it, let it go |
| `analyses/conclusion-tests.json` | Search for any recorded prediction or reproduction test (Dialog list, role shortlists) and what a blind test would need |
| `site/trail-map.html` | Source of the trail-map page built from these files |

## How it was made

Agents read the repo slice by slice and pulled the full PR, issue, comment and branch history from GitHub. A separate model merged and tiered the trails and spot-checked key figures against the files. Tiers are a judgment, not an outside review.

Follow-up commits on this branch add the time ledger (what the agents spent their time on), the reusable-tools catalogue, the cost-versus-yield measure of each apparatus, the documented incentive map, and a list of anything at risk of being lost.
