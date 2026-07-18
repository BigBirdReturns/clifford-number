# Clifford Number cold-read comprehension test

This is the acceptance gate for the public design. It tests whether someone can understand the product cold—not whether the designer can explain it.

## Purpose

Determine whether a first-time visitor can:

- Understand what Clifford Number is
- Discover research without already knowing its vocabulary
- Distinguish tracks, cases, surfaces, claims, and receipts
- Follow evidence from summary to source
- Understand an accepted and a refused connection
- State the limits of what the interface proves

## Test conditions

- Participant has never used Clifford Number.
- Participant has not read the repository or these handoff documents.
- Participant receives only the prototype or deployed URL.
- Facilitator does not explain terminology, navigation, or intent.
- Participant thinks aloud.
- Record the screen, route taken, completion time, quotes, errors, and abandoned actions.
- Test desktop and mobile separately.

Use at least five participants before calling the information architecture validated. Include at least one journalist or researcher and at least three people without specialist domain knowledge.

## Required prototype content

The prototype must contain enough real-shaped content to support:

- One complete research track
- One supported claim with a reachable receipt
- One person appearing in more than one representation
- One accepted connection path
- One refused connection with a specific reason
- One visible coverage gap
- One missing-archive or link-rot state

Do not test only a perfect happy path.

## Test script

### Task 1: fifteen-second orientation

Show the home page for 15 seconds, then hide it.

Ask:

1. What do you think this website does?
2. What kind of information would you expect to find?
3. What, if anything, did it appear to prove?

Pass condition: the participant describes a source-backed public research or relationship-checking instrument and does not describe it as a guilt score or automatic causal map.

### Task 2: enter the research

Ask:

> Find a body of research about public money, government decisions, or movement between public and private roles. Choose one that interests you and explain its scope.

Do not name “research tracks.”

Observe whether the participant can discover the track directory, compare choices, identify status, and explain scope and time period.

### Task 3: find and qualify a claim

Ask:

> Find one important statement this research makes. Tell me whether the site considers it verified, reported, derived, disputed, unresolved, or something else.

Pass condition: the participant finds a specific claim and correctly identifies its status without inferring from color alone.

### Task 4: inspect the evidence

Ask:

> Show me what supports that statement. What is the source, and what part of it matters?

Pass condition: the participant reaches a receipt in one action from the claim, identifies source and locator, and can return without losing the track or claim context.

### Task 5: move between representations

Ask:

> Open one person or organization mentioned here. Show me where else they appear, then return to this investigation.

Pass condition: the participant recognizes the same entity across track, profile, case, graph, or timeline and does not mistake each view for a separate dataset.

### Task 6: check a supported connection

Provide two names for which the prototype contains an accepted path.

Ask:

> Are these people connected under this site's rules? Explain every step and the evidence for it.

Pass condition: the participant can read a textual route, identify the bounded surfaces and date overlap, and reach supporting receipts.

### Task 7: understand a refusal

Provide two names for which the prototype contains a rejected path.

Ask:

> Does the site connect these people? Why or why not?

Pass condition: the participant understands the exact refusal reason, such as non-overlapping dates or insufficiently bounded evidence, and treats refusal as a checked result rather than missing data.

### Task 8: explain the limits

Ask:

1. What does appearing together in this system establish?
2. What does it not establish?
3. Which part of the research appeared incomplete?
4. How would you share or cite what you found?

Pass condition: the participant does not infer contact, coordination, influence, intent, wrongdoing, or causation merely from sequence or shared context.

## Scoring

Score each dimension from 0 to 2.

| Dimension | 0 | 1 | 2 |
|---|---|---|---|
| Product comprehension | Incorrect mental model | Partially correct | Correct in plain language |
| Research discovery | Cannot find a track | Finds with help or confusion | Finds and compares unaided |
| Object distinction | Conflates object types | Some distinction | Correctly distinguishes all needed types |
| Claim qualification | Misses status | Finds but misexplains | Correctly interprets status |
| Evidence path | Cannot reach source | Reaches with difficulty | Claim-to-receipt is clear and reversible |
| Representation continuity | Treats views as separate | Notices some continuity | Understands one corpus, multiple views |
| Connection reasoning | Treats graph as proof | Understands part of route | Explains steps, overlap, and receipts |
| Refusal reasoning | Treats refusal as error | Notices reason vaguely | Explains the exact failed rule |
| Epistemic limits | Infers causation or wrongdoing | Needs prompting | States limits unaided |
| Shareability | Cannot preserve finding | Shares only broad page | Finds stable object-level link or export |

Maximum score: 20.

## Acceptance threshold

The design passes only when:

- Median participant score is at least 16/20.
- No participant scores 0 on evidence path, refusal reasoning, or epistemic limits.
- At least four of five participants complete the primary journey without facilitator help.
- At least four of five correctly explain that a documented connection does not establish influence, coordination, wrongdoing, or causation.
- Mobile users retain complete access to textual routes and receipts.

## Automatic critical failures

Regardless of score, the design fails if any tested path:

- Presents unsupported adjacency as a connection
- Makes a participant reasonably believe the site alleges wrongdoing merely from appearance
- Hides a material qualification behind optional technical detail
- Cannot reach the receipt behind a material claim
- Loses the selected track or claim when opening evidence
- Exposes unpublished or private research material
- Displays conflicting status, dates, or identity across representations

## Evidence to retain

For every test round, preserve:

- Prototype or release identifier
- Participant profile category
- Task completion times
- Route and interaction recording
- Exact participant answers
- Score sheet
- Observed failures
- Nearest interface change made in response
- Rerun result

Do not replace this evidence with a summary saying the design “tested well.”
