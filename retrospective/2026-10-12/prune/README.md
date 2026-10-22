# Branch prune plan, 12 October 2026

## Execution update, 22 October 2026

The original 2,343 deletions were executed from a fresh GitHub clone after a
second copy of the all-refs bundle was verified on W03. The copy matched the
published SHA-256 and 365,200,700-byte size; an independent mirror restore
passed `git fsck --full`. Each deletion used the recorded tip as an exact
lease, in atomic batches. All 94 current tags were preserved.

The final retention policy is `main` and
`archive/retrospective-2026-10-12`. The two remaining `claude/*` branches were
ancestors of `main`; Wave 22's tip is in the verified bundle, and its 13
previously uncovered files match the archive on `main` byte for byte.
Those three branches have also been pruned. The audit branch is merged and
its exact tip is tagged `v2.1.0`; prune it once the reservoir's release-tag
references and generator default have landed on `main` and passed validation.

Keep the retrospective archive branch: it holds research artifacts and logs
added after the all-refs bundle was created. The bundle alone does not replace
that branch's custody.

The inventory and scripts below preserve the original plan. They are
historical evidence, not a current deletion checklist; do not rerun them
against today's refs.

## Original plan

At analysis time, of 2,347 branches on GitHub: keep 3 (`main`, `claude/kind-gauss-mgmf99`, `archive/retrospective-2026-10-12`) plus all 93 tags; delete 2,343; one branch needed review and its 13 uncovered files were added to `archive/allocator-war/wave-22-estate-acquisition/` first. The only raw source PDF outside the archive (`observer/ssc-rd04-fy26q3-pdf-visual-custody-v1`) was copied to `archive/snap-state-matrix/fy26q3-pdf-visual-custody/`.

Why deletion is safe: the all-refs git bundle on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, SHA-256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`) holds every one of the 6,629 commits that exist only on non-keep branches; all 2,345 bundled heads matched the live tips at analysis time. `branches.tsv` records, per branch, why it is deletable (reachable from a keep ref, carrier/controller class, archived under `archive/`, or no research content absent from main).

Original execution procedure (retained for provenance):

    bash retrospective/2026-10-12/prune/preflight.sh      # must print nothing under the two "must be empty" headings except the working branch
    sed -i '3d' retrospective/2026-10-12/prune/delete-plan.sh   # remove the "not approved" guard line
    bash retrospective/2026-10-12/prune/delete-plan.sh     # 24 pushes of up to 100 deletions each

`batch-pr-heads.txt` lists the three branches that head open PRs (#2639, #2605, #2628); delete them after the PRs are closed. `issues-to-close.tsv` and `prs.tsv` are the lists used to close the bot issues and stale PRs.
