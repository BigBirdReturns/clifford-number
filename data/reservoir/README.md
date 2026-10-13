# Reservoir: the continuing body of inquiry

This directory holds the canonical, hand-maintained part of the reservoir: the
record of what drew attention, what was guessed, which competing explanations
were considered, what evidence corrected them, and what is still open. The
build under `build/reservoir/` joins these rows with questions derived from
other records on `main` and from the 12 October 2026 retrospective.

Files:

- `inquiries.jsonl`: one row per inquiry (`reservoir-inquiry@1`).
- `disagreements.jsonl`: the model-disagreement log that
  `docs/methods/pattern-to-proof.md` specifies (`reservoir-disagreement@1`).
- `../decisions/prune-decisions.jsonl`: the human prune-decision log that
  `docs/self-assembling-architecture.md` section 5 calls irreplaceable
  (`reservoir-decision@1`).
- `sources/<source_id>/`: byte-for-byte copies of records circulated in from
  outside `main`, each with a `provenance.json`.

Every row names its origin. `human_words` is the owner's own text. Everything
else is observation, interpretation or derivation and says so. A disproved
explanation keeps the observation that prompted it and the evidence that
corrected it. A retired piece of machinery keeps its question and what it
taught.

Nothing here creates a claim, hop, graph edge, score or publication state.
Every row carries `graph_effect: none`.

Imported rows (the retrospective's trails, other projects' views) are
`held`: no disposition has been made, their ratings are kept under
`assessments` as attributed judgments, and importing them creates no review
chore. A later headline is never recorded as the original prompt; the row
says `prompting_observation_status: not_located_in_inputs` instead.

Commands:

```bash
npm run build:reservoir                       # build/reservoir/{manifest.json,inquiries.compiled.jsonl,circulation-report.md,delta.json}
npm run validate:reservoir
node test/reservoir.test.js
node tools/reservoir-open.mjs <inquiry_id>   # one inquiry: prompt, history, touches, support and challenge, how to return a result
node tools/build-reservoir.mjs --view <other-project>/reservoir-view.jsonl --join <other-project>/data/reservoir
```

See `docs/methods/reservoir.md` for the model and for how another project on
the estate joins its own reservoir to this one.
