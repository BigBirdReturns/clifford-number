# Prune-decision log

`docs/self-assembling-architecture.md` section 5 and `docs/durability-plan.md`
name this log as the one artifact automation can never regenerate: the human
judgment to accept, reject, merge, split, downgrade, reframe or retire a
proposal, with a reason code and the reason in the decider's own words.

Rows live in `prune-decisions.jsonl` under `reservoir-decision@1`. The decider
must be a human (`human_words` or `human_relayed`). A decision never creates a
claim, hop or graph edge; it records why a proposal did or did not advance.
`verified: false` marks a decision whose subject this repository has not yet
inspected, for example a commit that exists only on an estate checkout.

Validated by `npm run validate:reservoir`.
