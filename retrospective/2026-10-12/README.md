# Retrospective capture, 12 October 2026

A full record of what the agents did in this repo between 27 June and 14 September 2026: everything on `main`, plus the work that only lives in pull requests, issues, comments, reviews, branches and GitHub Actions artifacts. Nothing outside this folder was changed.

## What's here

| Path | What it is |
|---|---|
| `github/prs.tsv`, `github/pr-bodies.jsonl`, `github/pulls-full.jsonl` | All 2,069 pull requests: state, branch, dates, title, description, and the full API objects |
| `github/pr-files.jsonl` | Files changed by each of 1,442 closed pull requests |
| `github/pr-activity.tsv` | Each pull request classified by activity (acquisition, findings, tools, validators, plumbing, carriers…) |
| `github/issues.tsv`, `github/issue-bodies.jsonl`, `github/issues-full.jsonl` | All 599 issues, bodies and full API objects |
| `github/comments.jsonl`, `github/issue-comments-full.jsonl` | All 2,536 issue and pull-request comments (verified complete against GitHub) |
| `github/pr-review-comments.jsonl`, `github/pr-reviews.jsonl` | 1,516 inline review comments and 987 reviews the first export lacked |
| `github/branches.txt`, `github/branch-only-analysis.json` | All 2,345 branch names, and which hold content that never reached `main` |
| `github/topics.json` | Research topics clustered from titles, with on-main status |
| `github/actions-artifacts-index.jsonl` | Index of all 19,096 GitHub Actions artifacts: run ids, sizes, digests, expiry dates |
| `github/api/` | Labels, milestones, 100 Pages deployments |
| `trails/raw-trails.json`, `trails/slice-*.json` | 142 research trails, one row each: the question, how far it got, what it found |
| `trails/tiered-trails.json` | The 142 rows merged into 79 trails and tiered: show it, keep and finish, park it, let it go |
| `analyses/time-ledger.json` | Weekly phases, effort split, time sinks, instruction-of-record quotes, the 11 August pivot |
| `analyses/apparatus-cost-yield.json` | 37 apparatuses: PR, tool, test, workflow and line counts; first-evidence versus build dates; verdicts |
| `analyses/reusable-kit.json` | 34 engines, 19 datasets, 17 method documents; what the 386 validators check |
| `analyses/incentive-map.json` | 134 actors, 71 dated and sourced edges, 19 documented non-links, 19 ambiguity points |
| `analyses/conclusion-tests.json` | Search for any recorded prediction or reproduction test, and what a blind test would need |
| `analyses/preservation.json` | What was at risk of loss, by when, and what was saved |
| `disposition/` | Where the content of every pull request (2,069) and issue (599) lives now, computed from blob hashes against the all-refs bundle: `pr-disposition.tsv`, `issue-disposition.tsv` and `SUMMARY.md`. The 195 research files that existed only in 29 pull request heads were copied to `archive/pull-requests/` |
| `branches/lake-identity-waves-01-20/` | Moved to `archive/evidence-lake-identity/` (a one-line pointer file remains here). Research files from the evidence-lake identity branch chain (bulk-closed 11 Aug): canonical registry with 65 organisations, identity census, topology |
| `branches/lake-allocator-war-waves-21-38/` | Moved to `archive/allocator-war/` (a one-line pointer file remains here). Research files from the allocator-war branch chain: 150 official-source captures and 31 open obligations |
| `branches/lake-branch-heads.tsv` | Head commit of all 43 lake branches |
| `site/trail-map.html` | Source of the trail-map page built from these files |

## On the archive branch, not here

Branch `archive/retrospective-2026-10-12` holds this folder plus the large binaries, so `main` stays lean:

- `actions-artifacts/research/`: all 3,622 unique research-tier Actions artifacts (2.5 GB), digest-verified, which GitHub would have deleted by 11 December 2026.
- `github/workflow-run-logs.tar.gz`: logs of the 2,455 workflow runs behind them.
- `git-bundle/`: a full bundle of every ref as of 12 October 2026, the restore point for any branch pruning.

## Not copied, and why

- The draft CalFresh release (132 assets, 1.33 GB, the only copy of the 11,672 decision PDFs): it never expires and stays on GitHub.
- The diagnostic and derived-build artifact tiers (15,438 artifacts, 9 GB): indexed above; they regenerate from the repository's tools and workflows.
- Tooling and generated build products on the lake branches: listed in each branch folder's `NOT-COPIED-regenerable-and-tooling.txt`; they regenerate from the branches.
- The full git mirror: redundant while the branches exist on GitHub. `analyses/preservation.json` lists the 64 research branches reachable only by name, which pruning would lose.

## How it was made

Agents read the repo slice by slice and pulled the full history from GitHub. A separate model merged and tiered the trails and spot-checked key figures against the files. Tiers are a judgment, not an outside review.
