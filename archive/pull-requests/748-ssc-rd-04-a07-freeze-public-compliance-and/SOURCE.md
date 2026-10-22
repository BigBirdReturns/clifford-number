# Source: pull request #748, "SSC RD-04 A07: freeze public compliance and restoration receipt census"

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

Research files that existed only in this pull request's head commit: they were not on `main`'s tree, not under `archive/`, and not in any other archived programme when the pull-request disposition ledger (`retrospective/2026-10-12/disposition/`) was computed from blob hashes.

| Field | Value |
|---|---|
| Pull request | #748, closed, opened 2026-08-02, closed 2026-08-02, draft: yes |
| Head branch | `agent/ssc-rd04-a07-public-compliance-receipts` (not listed in `prune/branches.tsv`; the head branch was already gone before the prune plan) |
| Head commit | `fd4f3d7eb5e93178839400b77201a18fdc22b379` (`refs/pull/748/head`; equals the head recorded in `retrospective/2026-10-12/github/pulls-full.jsonl`) |
| Base ref | `main` |
| Merge-base with main (`d8392cfb`) | `d1597233110715e58e76e3b50b6792c226d9f7e8` |
| Activity class | `research_acquisition` (rule `rd04-acq`) in `retrospective/2026-10-12/github/pr-activity.tsv` |
| Retrospective record | `retrospective/2026-10-12/github/pr-bodies.jsonl`, `pulls-full.jsonl`, `pr-files.jsonl`, `pr-reviews.jsonl`, `pr-review-comments.jsonl` and `issue-comments-full.jsonl` (entry for #748) |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`); every `refs/pull/*/head` is in it |

## What was copied and how

Method: files added or modified between the merge-base with main and the head commit (`git diff --name-only --no-renames --diff-filter=AM`), minus `.github/`, `build/`, `dist/`, `node_modules/` and carrier scaffolding (hidden top-level work directories, `tmp/`, `transport/`, base64 chunk files). Each remaining file's blob hash at the head was compared with the same path on the working branch, with every blob under `archive/` and `retrospective/`, and with every other path on the working branch. Files in a research directory (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`) with no match anywhere were copied here, byte for byte (`git hash-object <file>` reproduces the blob in `MANIFEST.tsv`).

- Files considered after exclusions: **71**
- Already on the working branch or under `archive/` or `retrospective/` (not copied): **0**
- Research-directory files with no copy anywhere (copied here): **60**; stored in this folder: **60** (701,697 bytes); pointer to an identical file stored in an earlier pull-request folder: **0**
- Code, test and other non-research files with no copy anywhere (**not** copied; they stay in the bundle at `refs/pull/748/head`): **11**

Not copied (code and other):

- `test/acquire-status-sovereignty-rd04-calfresh-compliance-receipts-a07.test.js`
- `test/ssc-rd04-a07-order-candidate-extractor.test.js`
- `test/status-sovereignty-rd04-calfresh-compliance-receipts-a07-progress.test.js`
- `test/status-sovereignty-rd04-calfresh-compliance-receipts-a07.test.js`
- `test/status-sovereignty-rd04-calfresh-county-agency-roots-a07.test.js`
- `tools/acquire-status-sovereignty-rd04-calfresh-compliance-receipts-a07.mjs`
- `tools/build-status-sovereignty-rd04-calfresh-county-agency-roots-a07.mjs`
- `tools/ssc-rd04-a07-order-candidate-extractor.mjs`
- `tools/temporary-reconcile-a07-county-progress.mjs`
- `tools/validate-status-sovereignty-rd04-calfresh-compliance-receipts-a07-progress.mjs`
- `tools/validate-status-sovereignty-rd04-calfresh-compliance-receipts-a07.mjs`

`MANIFEST.tsv` lists every copied file with its git blob SHA-1, size and where it is stored. `kind` is `new` (path absent on the working branch) or `diverged` (path present with different content).
