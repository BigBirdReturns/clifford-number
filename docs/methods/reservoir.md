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

Two fields keep imports honest. `held` is the disposition of an inquiry
about which no disposition has been made: it is retained as found and
available for comparison. `assessments` holds attributed historical
judgments about the work, such as a retrospective's tier, with who judged,
when, the rating and what it meant. An assessment never becomes a
disposition. When the original prompt is not in the reservoir's inputs the
row says `prompting_observation_status: not_located_in_inputs`; a later
headline or finding never stands in for it, and recovery continues through
conversations and estate records.

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
  `provenance.json` naming the branch, commit and blob hashes. Every
  imported trail is `held`. Its tier, stage, source count and the
  retrospective's stated worth, why and risk are kept under `assessments`
  as the retrospective's own judgment. Importing a trail generates no
  review chore: the questions stay available for comparison, and the
  retrospective's recommendation about the work does not decide whether
  the question still matters.
- the game-trail unresolved ledger and each estate's next acquisition;
- the Arcadia field-autopsy hypotheses;
- the M-04D next decisive frontier;
- the hydrology catchments and the hydrology and global-circulation lanes,
  with their falsifiers kept as live explanations;
- any **views** other projects expose (below).

The build then:

- **reconnects** records that share a path within the same repository. A
  bare path is scoped to the row's project's repository; a locator that
  names its `repo` meets any other row naming the same one, so explicit
  references to this repository still meet across projects while two
  projects' identically named files never meet by accident;
- **lists contradictions** where the retrospective says a trail is on `main`
  but none of its paths exist, or says it is not while a path does;
- **counts prompts not located**: rows that kept a question but not what
  first drew attention to it, including every imported trail. The build
  never invents a reason; only the owner or a record that holds it can
  restore one;
- **writes a delta** (`delta.json`) against the previous build in the same
  output directory: which inputs changed by hash, which inquiries were
  added, removed or changed, and how many reconnections moved. A pass over
  unchanged inputs says so and asks for nothing.

Derived rows are regenerated every build and are never edited by hand. To
change what the reservoir says about a derived question, add a canonical
inquiry that relates to it, or correct the source record.

## Opening an inquiry

```bash
node tools/reservoir-open.mjs inq-desktop-relay-slowdown-2026-10-12
node tools/reservoir-open.mjs retro-2026-10-12:23:arcadia-california-testing-a-chatbots-master-plan-against-records --json
```

The view recovers, for one inquiry: the question and whose words it is in;
what drew attention, or that the prompt is not located; the disposition
history and current state; attributed assessments; each competing
explanation with the retained observations that support or challenge it;
every artifact it touches, with unverified locators marked; related
inquiries in both directions and reconnections through shared paths; the
decisions and disagreements that name it; the next examination; and how to
return a result to its history. For a derived row that means adding a
canonical inquiry that relates to it or correcting the source record; for a
canonical row, appending a disposition or explanation with evidence.

## Joining other projects on the estate

A project participates in one of two ways. Neither copies anything out of
the project, and neither requires it to adopt the three ledgers.

**A view** is a JSONL file the project exposes over its own native records,
in its own locations and formats:

```json
{"project": "estate-tooling", "record_id": "teardown-status",
 "question": "Is W01 ready to power off?", "text": "ESTATE STATUS: HOLD",
 "locators": [{"kind": "estate_path", "host": "octo-w01", "path": "D:\\ESTATE-STATUS.txt"}],
 "prompting": {"text": "READY markers must come from receipts, never by hand.",
               "origin": {"kind": "human_relayed", "author": "D:\\README.md"}},
 "as_of": "2026-09-09"}
```

`project`, `record_id`, `text` or `question`, and at least one locator are
required; `origin`, `prompting`, `as_of` and `kind` are optional. Each row
becomes a `held` inquiry pointing back at the native record. A project can
generate its view from whatever it already keeps. Views checked in under
`data/reservoir/views/*.view.jsonl` are part of every build.

The first such adapter is `tools/reservoir-view-from-disposition.mjs`. It
reads the 12 October 2026 Git disposition ledger, the owner's record of
where every one of the 2,069 pull requests and 599 issues lives now, from
its native custody on branch `audit/clifford-operating-cut-20261012`, and
writes `data/reservoir/views/disposition-2026-10-12.view.jsonl`: one row
per issue, with its GitHub item and the path its substance lives at
(archive, head or bundle), and one row per pull request whose research
content is not on main. The ledger itself is not copied; its hashes are
recorded in the view's provenance row and in
`data/reservoir/sources/operating-cut-2026-10-12/provenance.json`.

A path cited by more than ten records is a **hub**: the build lists it
once with everything that meets there instead of expanding it into every
pairwise link. Hubs are the places to enter the body of work by collection
or mechanism; pairwise reconnections stay for the specific meetings.

**A reservoir** is a project that keeps the three ledgers itself:

```bash
node tools/build-reservoir.mjs \
  --join D:/Projects/<other>/data/reservoir \
  --view D:/Projects/<another>/reservoir-view.jsonl \
  --out build/reservoir-estate
```

Joined and viewed rows are validated on the same terms. Cross-project
relations use the `project:inquiry_id` form in `related_inquiry_ids` or a
`reservoir` locator. A joined reservoir may not call itself
`clifford-number`. The union lives in the build output of whichever seat ran
it, and its `delta.json` says what changed since that seat's previous pass.

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


## Local estate operation

`python -B tools/serve-reservoir.py --estate <project-estate-root> --state <durable-private-state> --port 8877 --open` serves the existing reservoir page on loopback with native collection search, source inspection and a result-return form. The estate registry selects canonical project roots; real checkouts in its declared wings supplement it. Sources remain in place. The catalog indexes working-tree paths and text prefixes, plus textual session/notes records, without requiring projects to adopt the reservoir ledgers. Text search covers the first 16 KiB; opening a source reads up to 256 KiB and identifies whether that is an excerpt. Media and benchmark payloads retain their native custody rather than being relabelled as inquiries. Unmounted or unenumerated holdings are outside this pass.

The source reader and interactive circulation run separately. Native readback enters the existing `--view` build; returned observations retain their origin, sources and parent inquiry. Result writes use a separate durable history database so a long acquisition cannot hold their write lock. Stable request ids prevent a lost response from duplicating a returned result. `returned-results.jsonl` exposes that history without altering the original inquiry or source. Each completed page generation keeps its input delta and the previous generation remains available if a build fails.

While this local process runs, it checks known source metadata periodically and discovers new files through later passes. These checks trigger readback; they are not full cryptographic audits or new research findings. The page polls for completed generations and retains unsaved notes instead of replacing them. There is no new GitHub schedule, external collection job, publication or arbitrary-command endpoint. Private catalog/history state stays outside Git and the public artifact.
