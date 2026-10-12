# Branch prune plan, 12 October 2026

Verified, not executed. Of 2,347 branches on GitHub: keep 3 (`main`, `claude/kind-gauss-mgmf99`, `archive/retrospective-2026-10-12`) plus all 93 tags; delete 2,343; one branch needed review and its 13 uncovered files were added to `archive/allocator-war/wave-22-estate-acquisition/` first. The only raw source PDF outside the archive (`observer/ssc-rd04-fy26q3-pdf-visual-custody-v1`) was copied to `archive/snap-state-matrix/fy26q3-pdf-visual-custody/`.

Why deletion is safe: the all-refs git bundle on branch `archive/retrospective-2026-10-12` (`retrospective/2026-10-12/git-bundle/`, SHA-256 `55fca0402cd4264629bd746621cf19971cbf3d60eebbebf40ba45d544d5c3d42`) holds every one of the 6,629 commits that exist only on non-keep branches; all 2,345 bundled heads matched the live tips at analysis time. `branches.tsv` records, per branch, why it is deletable (reachable from a keep ref, carrier/controller class, archived under `archive/`, or no research content absent from main).

How to run it (from a clone with push rights):

    bash retrospective/2026-10-12/prune/preflight.sh      # must print nothing under the two "must be empty" headings except the working branch
    sed -i '3d' retrospective/2026-10-12/prune/delete-plan.sh   # remove the "not approved" guard line
    bash retrospective/2026-10-12/prune/delete-plan.sh     # 24 pushes of up to 100 deletions each

`batch-pr-heads.txt` lists the three branches that head open PRs (#2639, #2605, #2628); delete them after the PRs are closed. `issues-to-close.tsv` and `prs.tsv` are the lists used to close the bot issues and stale PRs.
