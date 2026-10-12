# GitHub Actions artifacts, research tier

Artifacts GitHub would have deleted on expiry (most by 2026-12-11). `research/` holds every unique research-tier artifact as downloaded, verified against GitHub's SHA-256 digest; duplicates (same digest, different run) are recorded in `research-manifest.jsonl` but stored once. Files over GitHub's 100 MB limit are stored as `<name>.parts/part000…`; reassemble with `cat part* > <name>`.

The full index of all 19,096 artifacts (research, diagnostic and derived-build tiers, with run ids, sizes, digests and expiry dates) is `../github/actions-artifacts-index.jsonl`. Diagnostic and derived-build artifacts are not copied: they regenerate from the repository's own tools and workflows.
