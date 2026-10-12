# The reservoir: retained attention and estate-wide circulation

## Purpose

The project's attention is part of its work. What drew a researcher
somewhere, what was suspected, what kept recurring, what agents pursued, and
how evidence changed the question all belong to the body of inquiry. A
disproved guess keeps the observation that prompted it, the alternatives
considered and the evidence that corrected it. An unfinished investigation
keeps its question and the territory it exposed. An agent's confirmation-seeking
detour keeps the distinction between the original curiosity and the narrower
story the agent tried to prove. Where the reason for looking was recorded, it
survives in the recorder's own words; where it was not, later interpretation
stays marked as interpretation.

Before this method existed, the repository kept questions in many places and
read almost none of them back: game-trail and issue handoffs were rendered,
posted and closed; hypotheses stayed `preserved` with no falsifier; hydrology
and circulation lanes carried questions, falsifiers and stopping rules that no
workflow ever opened; scheduled monitors wrote their results to Actions
artifacts that expire. The prune-decision log that
[`self-assembling-architecture.md`](../self-assembling-architecture.md)
section 5 calls irreplaceable and the model-disagreement log that
[`pattern-to-proof.md`](pattern-to-proof.md) specifies were both named and
never built. The reservoir is where they live.

## Objects

Three canonical ledgers, all validated by `npm run validate:reservoir` against
the constraints documented in [`schemas/reservoir.schema.json`](../../schemas/reservoir.schema.json):

| Ledger | Path | Row |
|---|---|---|
| Inquiries | `data/reservoir/inquiries.jsonl` | `reservoir-inquiry@1` |
| Prune decisions | `data/decisions/prune-decisions.jsonl` | `reservoir-decision@1` |
| Model disagreements | `data/reservoir/disagreements.jsonl` | `reservoir-disagreement@1` |

An **inquiry** carries a question, the origin of that question, the
observation that prompted it (in the words of whoever recorded it), a set of
competing explanations each with evidence for and against and a status, a
history of dispositions, locators to every artifact the inquiry touches,
related inquiries, and the next examination. A disproved or superseded
explanation must keep at least one piece of evidence against it. A narrowed
explanation must say what narrowed it. A retired inquiry keeps its question.

A **prune decision** is a human judgment to accept, reject, merge, split,
downgrade, reframe or retire a proposal, with a reason code and the reason in
the decider's words. The decider must be human. `verified: false` marks a
decision whose subject this repository has not inspected, such as a commit
that exists only on an estate checkout.

A **model disagreement** keeps the six fields pattern-to-proof names: the
original human claim, the model's reformulation, the reason for rejection, the
missing distinction, later evidence and the current disposition. The original
claim must come from the human.

### Origin

Every text that matters carries an origin:

```text
human_words                  verbatim text the owner wrote
human_relayed                the owner's position as relayed or paraphrased
agent_observation            something an agent saw or measured
agent_interpretation         an agent's reading of what it saw
retrospective_interpretation a judgment by the retrospective capture
derived_from_record          a value lifted mechanically from another record
```

Repetition by agents preserves the history of an idea; it does not strengthen
it. Independent observations can. The origin field is what lets a later
reader tell the two apart.

### Locators

A locator points at anything on the estate, not only inside this repository:

```text
git_path, git_commit, git_branch       this or another repository
github_item, github_artifact           issues, pull requests, Actions artifacts
estate_path                            a host and path on the estate, e.g. octo-w01 D:\Projects
local_file                             a named file whose path is not yet resolved
conversation, url                      a session or page
reservoir                              another project's inquiry (project, id)
text                                   a quoted fragment when nothing else exists
```

`verified: false` says this repository has not inspected the target. A closed
issue, a local file, a failed experiment, an unmerged branch or an irritated
comment is admitted on the same terms as anything else; its origin and locator
say how to read it.

## Circulation

`npm run build:reservoir` writes `build/reservoir/`:

- `inquiries.compiled.jsonl`: the canonical inquiries plus inquiries derived
  from question-bearing records already on `main` and from the retrospective.
- `manifest.json`: counts, contradictions, reconnections, disproved and
  narrowed explanations, the oldest open inquiries, next examinations, and
  the list of inquiries whose reason for looking was never recorded.
- `circulation-report.md`: the same, readable.

Derived rows come from:

- the 79 tiered trails of the 12 October 2026 retrospective, copied byte for
  byte into `data/reservoir/sources/retrospective-2026-10-12/` with
  `provenance.json` naming the branch, commit and blob hashes. Tier A maps to
  `answered` (a candidate for outside review, not a finding), B to `open`,
  C to `parked`, D to `retired`. The tiers are the retrospective model's
  judgment; every derived row says so.
- the game-trail unresolved ledger and each estate's next acquisition;
- the Arcadia field-autopsy hypotheses;
- the M-04D next decisive frontier;
- the hydrology catchments and the hydrology and global-circulation lanes,
  with their falsifiers kept as live explanations.

The build then:

- **reconnects** records that share a path, so a retrospective trail and the
  main-side object it judged sit in one view;
- **lists contradictions** where the retrospective says a trail is on `main`
  but none of its paths exist, or says it is not while a path does;
- **counts attention lost**: rows that kept a question but not what first
  drew attention to it. The build never invents a reason; only the owner or
  a record that holds it can restore one.

Derived rows are regenerated every build and are never edited by hand. To
change what the reservoir says about a derived question, add a canonical
inquiry that relates to it, or correct the source record.

## Joining other projects on the estate

Each project keeps its own `data/reservoir/` with the same three ledgers and
names itself in every row's `project` field. An estate-level view is a join,
not a copy:

```bash
node tools/build-reservoir.mjs \
  --join D:/Projects/<other>/data/reservoir \
  --join D:/Projects/<another>/data/reservoir \
  --out build/reservoir-estate
```

Joined rows are validated on the same terms. Cross-project relations use the
`project:inquiry_id` form in `related_inquiry_ids` or a `reservoir` locator.
A joined reservoir may not call itself `clifford-number`. Nothing from a
joined reservoir is written into this repository; the union lives in the
build output of whichever seat ran it.

Circulation runs both ways. New material in any project reconnects to older
inquiries through shared locators, and the union's open questions, oldest
inquiries and next examinations guide what the next investigation acquires.

## Boundaries

```text
graph_effect: none
conclusion_generated: false
promotes_to: candidate_only
retrospective tiers are an outside review: false
```

The reservoir cannot create a claim, hop, graph edge, score, allegation,
causal conclusion or publication approval. It records attention and its
corrections so that the next investigation starts from the accumulated
history rather than from the first guess.
