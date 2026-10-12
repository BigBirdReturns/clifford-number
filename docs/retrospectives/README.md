# Retrospectives

Records of the 12 October 2026 consolidation and of the agent-run period before it. These are records of what happened. They are not evidence, they hold no receipts or claims, and they add no findings. Anything in them that looks like a research result is the retrospective's own judgment, not an outside review.

## Index

| Record | Where | What it is |
|---|---|---|
| Consolidation deletions | [`2026-10-12-consolidation-deletions.md`](2026-10-12-consolidation-deletions.md) | The list of what the consolidation removed from `tools/`, `test/` and `package.json`, and why. |
| Retrospective capture | [`../../retrospective/2026-10-12/`](../../retrospective/2026-10-12/README.md) | The full agent-run record, 27 June to 14 September 2026: pull requests, issues, comments, reviews, branch analysis, research trails, cost and yield analyses. Held from publication. |
| Recovered research | [`../../archive/`](../../archive/README.md) | Research that lived only in closed issues, unmerged branches and the retrospective exports, gathered in one read-only tree. Held from publication. |
| Archive branch | `archive/retrospective-2026-10-12` (a git branch) | The retrospective folder plus the large binaries that `main` does not carry. |
| Release notes | [`../releases/2.0.0.md`](../releases/2.0.0.md) | What the consolidation release is and is not. |

## The consolidation deletions record

[`2026-10-12-consolidation-deletions.md`](2026-10-12-consolidation-deletions.md) has two parts.

- **The addendum** lists the 54 files (27 under `tools/`, 27 under `test/`) that the final clean-up commit deleted. Each one pinned the exact bytes of a workflow file, or of a sibling validator, inside sealed data. The workflows and validators they pinned were removed, so these checks could no longer pass. The sealed data they pinned was not edited.
- **The verbatim list** from the validator-pruning work package: 116 npm scripts removed (44 left at that point; the later clean-up leaves 46 in `package.json`), 495 files under `tools/` and 189 under `test/` deleted, grouped by the programme they belonged to. It also records the full command of each removed npm script, so an old document that says `npm run validate:selection` can be mapped to the `node tools/...` command that now runs inside `npm run check`.

The list covers the preference-custody laboratory, the counter-selector programme, Project Stable Ground, the residual-denominator waves, the M-04D to M-04G wave chains and the School.House registry validators. Section B of the record gives the groups with file counts.

Two things the record does not itemise: the 329 workflow files deleted from `.github/workflows/` (334 became 5; the five that remain were edited, not added), and the POOF constitutional change receipts 007 and 008 in [`data/project/poof-clifford-constitutional-change-log.json`](../../data/project/poof-clifford-constitutional-change-log.json), which record the two protected-path changes the consolidation needed.

## The retrospective capture

[`retrospective/2026-10-12/README.md`](../../retrospective/2026-10-12/README.md) lists every file and what it holds. In short:

- `github/` exports of all pull requests, issues, comments and reviews, the branch list and a branch-only analysis, and an index of the GitHub Actions artifacts that existed on 12 October.
- `trails/` 142 research trails, merged into 79 and tiered by a separate model pass.
- `analyses/` the time ledger, the cost and yield of each apparatus, what the validators checked, an incentive map, a search for recorded predictions, and what was at risk of loss.
- `branches/` pointers to the evidence-lake branch chains, whose research files moved to `archive/`.

The tiers and one-line findings are a judgment by the agents that made the capture. No outside party has reviewed them.

## The archive branch

Branch `archive/retrospective-2026-10-12` holds the retrospective folder plus:

- `actions-artifacts/research/`: the research-tier GitHub Actions artifacts (3,622 unique, 2.5 GB), which GitHub would have deleted by 11 December 2026;
- `github/workflow-run-logs.tar.gz`: logs of the workflow runs behind those artifacts; and
- `git-bundle/`: a bundle of every ref as of 12 October 2026, split into parts. It is the restore point for any branch pruning. Its README gives the commands to reassemble and verify it; the SHA-256 of the reassembled bundle is `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`.

To read a file from it without switching branches: `git show archive/retrospective-2026-10-12:retrospective/2026-10-12/git-bundle/README.md`.

Not copied anywhere in the tree: the draft CalFresh release (132 assets, 1.33 GB), which stays on GitHub and does not expire, and the diagnostic and derived-build artifact tiers, which regenerate from the repository's tools.
