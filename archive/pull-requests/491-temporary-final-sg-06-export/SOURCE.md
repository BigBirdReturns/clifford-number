# Source: pull request #491, "Temporary final SG-06 export"

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

Research files that existed only in this pull request's head commit: they were not on `main`'s tree, not under `archive/`, and not in any other archived programme when the pull-request disposition ledger (`retrospective/2026-10-12/disposition/`) was computed from blob hashes.

| Field | Value |
|---|---|
| Pull request | #491, closed, opened 2026-07-30, closed 2026-08-02, draft: yes |
| Head branch | `agent/publication-sg06-final-export` (branch decision DELETE, class carrier/controller/temp, archived_in archive/branches/agent/publication-sg06-final-export in `retrospective/2026-10-12/prune/branches.tsv`) |
| Head commit | `15522c9d0e4ca36b1a9018ebdd7cabcaebdf80b1` (`refs/pull/491/head`; equals the head recorded in `retrospective/2026-10-12/github/pulls-full.jsonl`) |
| Base ref | `main` |
| Merge-base with main (`d8392cfb`) | `0d701692fa83a405bd0ba86e7b45c525022589f7` |
| Activity class | `controller_dispatch` (rule `ctrl-prefix`) in `retrospective/2026-10-12/github/pr-activity.tsv` |
| Retrospective record | `retrospective/2026-10-12/github/pr-bodies.jsonl`, `pulls-full.jsonl`, `pr-files.jsonl`, `pr-reviews.jsonl`, `pr-review-comments.jsonl` and `issue-comments-full.jsonl` (entry for #491) |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`); every `refs/pull/*/head` is in it |

## What was copied and how

Method: files added or modified between the merge-base with main and the head commit (`git diff --name-only --no-renames --diff-filter=AM`), minus `.github/`, `build/`, `dist/`, `node_modules/` and carrier scaffolding (hidden top-level work directories, `tmp/`, `transport/`, base64 chunk files). Each remaining file's blob hash at the head was compared with the same path on the working branch, with every blob under `archive/` and `retrospective/`, and with every other path on the working branch. Files in a research directory (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`) with no match anywhere were copied here, byte for byte (`git hash-object <file>` reproduces the blob in `MANIFEST.tsv`).

- Files considered after exclusions: **39**
- Already on the working branch or under `archive/` or `retrospective/` (not copied): **18**
- Research-directory files with no copy anywhere (copied here): **1**; stored in this folder: **1** (10,139 bytes); pointer to an identical file stored in an earlier pull-request folder: **0**
- Code, test and other non-research files with no copy anywhere (**not** copied; they stay in the bundle at `refs/pull/491/head`): **20**

Not copied (code and other):

- `app.js`
- `index.html`
- `package.json`
- `src/visual-aperture-part-11.js`
- `src/visual-aperture-part-2.js`
- `test/project-stable-ground-sg05.test.js`
- `test/project-stable-ground-sg06.test.js`
- `test/publication-manifest.test.js`
- `test/publication-pages-browser.test.js`
- `test/status-sovereignty-compact.test.js`
- `test/ui-contract.test.js`
- `tools/build-pages.mjs`
- `tools/build-project-stable-ground-sg06.mjs`
- `tools/build-standalone.mjs`
- `tools/lib/publication-manifest.mjs`
- `tools/validate-pages.mjs`
- `tools/validate-project-stable-ground-sg04.mjs`
- `tools/validate-project-stable-ground-sg05.mjs`
- `tools/validate-project-stable-ground-sg06.mjs`
- `tools/validate-publication-plan.mjs`

`MANIFEST.tsv` lists every copied file with its git blob SHA-1, size and where it is stored. `kind` is `new` (path absent on the working branch) or `diverged` (path present with different content).
