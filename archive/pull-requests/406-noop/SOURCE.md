# Source: pull request #406, "noop"

Read-only. Never published: `archive/` and `retrospective/` are held rules in `data/project/publication-allowlist.json`.

Research files that existed only in this pull request's head commit: they were not on `main`'s tree, not under `archive/`, and not in any other archived programme when the pull-request disposition ledger (`retrospective/2026-10-12/disposition/`) was computed from blob hashes.

| Field | Value |
|---|---|
| Pull request | #406, closed, opened 2026-07-29, closed 2026-07-30, draft: yes |
| Head branch | `agent/k0-wave07-field-adjudication` (branch decision DELETE, class research, archived_in none in `retrospective/2026-10-12/prune/branches.tsv`) |
| Head commit | `e90805bf12cd67661bd1b44cf6ce59cc208c52e1` (`refs/pull/406/head`; equals the head recorded in `retrospective/2026-10-12/github/pulls-full.jsonl`) |
| Base ref | `main` |
| Merge-base with main (`d8392cfb`) | `83ecef6ab17075742dc70e0ec3fadbd54f87c3cc` |
| Activity class | `controller_dispatch` (rule `ctrl-prefix`) in `retrospective/2026-10-12/github/pr-activity.tsv` |
| Retrospective record | `retrospective/2026-10-12/github/pr-bodies.jsonl`, `pulls-full.jsonl`, `pr-files.jsonl`, `pr-reviews.jsonl`, `pr-review-comments.jsonl` and `issue-comments-full.jsonl` (entry for #406) |
| Object source | the all-refs git bundle held on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, reassembled sha256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`); every `refs/pull/*/head` is in it |

## What was copied and how

Method: files added or modified between the merge-base with main and the head commit (`git diff --name-only --no-renames --diff-filter=AM`), minus `.github/`, `build/`, `dist/`, `node_modules/` and carrier scaffolding (hidden top-level work directories, `tmp/`, `transport/`, base64 chunk files). Each remaining file's blob hash at the head was compared with the same path on the working branch, with every blob under `archive/` and `retrospective/`, and with every other path on the working branch. Files in a research directory (`data/ docs/ cases/ receipts/ contributions/ reports/ briefs/ comprehension/ estates/ gametrails/ gametrail-handoffs/ issue-handoffs/ legacy/ schemas/`) with no match anywhere were copied here, byte for byte (`git hash-object <file>` reproduces the blob in `MANIFEST.tsv`).

- Files considered after exclusions: **22**
- Already on the working branch or under `archive/` or `retrospective/` (not copied): **6**
- Research-directory files with no copy anywhere (copied here): **12**; stored in this folder: **12** (647,752 bytes); pointer to an identical file stored in an earlier pull-request folder: **0**
- Code, test and other non-research files with no copy anywhere (**not** copied; they stay in the bundle at `refs/pull/406/head`): **4**

Not copied (code and other):

- `test/k0-epistemic-admissibility.test.js`
- `tools/build-k0-epistemic-admissibility.mjs`
- `tools/build-k0-wave07-field-adjudication.mjs`
- `tools/validate-k0-epistemic-admissibility.mjs`

`MANIFEST.tsv` lists every copied file with its git blob SHA-1, size and where it is stored. `kind` is `new` (path absent on the working branch) or `diverged` (path present with different content).
