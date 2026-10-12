# Full git bundle, all refs, 12 October 2026

A `git bundle` of the whole repository as it stood before any branch pruning: 4,511 refs (2,345 heads, 2,073 pull-request heads, 93 tags), 11,310 commits, fsck clean. Split into 90 MB parts for GitHub's file limit.

Reassemble and verify:

    cat clifford-number-all-refs.bundle.part* > clifford-number-all-refs.bundle
    sha256sum -c <(echo "$(cat SHA256)  clifford-number-all-refs.bundle")
    git bundle verify clifford-number-all-refs.bundle
    git clone clifford-number-all-refs.bundle restored
