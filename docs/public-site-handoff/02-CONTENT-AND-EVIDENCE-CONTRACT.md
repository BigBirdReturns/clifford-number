# Frontend content and evidence contract

This document describes the information the public interface needs. It deliberately does not prescribe repository paths, storage formats, collection tools, or backend architecture.

The frontend renders published facts and research states. It does not determine them.

## Core content objects

### Release

- Release identifier and published date
- Methodology version
- Counts by object type
- Known warnings
- Link to release notes or changes

The release is the context binding every other displayed object.

### Research track

- Stable identifier and title
- Plain-language description
- Scope, geography, institutions, and time period
- Status and evidence maturity
- Last updated date
- Key questions
- Findings or candidate patterns
- Entities, surfaces, cases, and claims
- Coverage gaps and receipts
- Related and predecessor tracks

### Entity

- Stable identifier and entity type
- Canonical name and aliases
- Neutral description
- Dated roles
- Related surfaces, tracks, cases, and claims
- Identity-confidence or ambiguity information
- Receipts

### Decision surface

- Stable identifier and name
- Surface type and bounded purpose
- Operating dates
- Participants and roles
- Why the surface qualifies or does not qualify for adjacency
- Receipts

### Connection path

- Start and end actors
- Optional “as of” date
- Accepted or refused status
- Ordered path steps and supporting surfaces
- Overlap windows
- Evidence class and qualifications
- Receipts
- Specific refusal reason when rejected

### Case

- Stable identifier and title
- Investigative question and summary
- Status and confidence
- Typed events
- Actors and organizations
- Claims and outcomes
- Timeline
- Evidence gaps and receipts
- Related tracks

### Claim

- Stable identifier
- Exact assertion
- Claim type, status, and evidence class
- Relevant entities and dates
- Supporting and contradicting receipts
- Qualification and review date

### Receipt

- Stable identifier
- Source title, publisher, and source type
- Original and archived URLs
- Publication and retrieval dates
- Relevant locator or excerpt
- Availability status
- Claims supported
- Optional technical provenance

### Coverage gap

- Gap type and plain-language description
- Affected track, entity, claim, or date range
- Why it matters
- What source or work could close it

## Required status language

### Research maturity

- **Published:** accepted into the public corpus
- **Exploratory:** organized research that has not reached published-finding status
- **Incomplete:** required coverage is visibly missing
- **Historical:** retained for lineage but not current
- **Superseded:** replaced by a named later object or interpretation

### Claim status

- **Verified:** directly supported under the published evidence rules
- **Reported:** attributed to a named external source
- **Derived:** computed or synthesized from disclosed inputs
- **Contextual:** relevant context that does not establish the asserted relationship
- **Disputed:** materially conflicting evidence exists
- **Unresolved:** available evidence cannot settle the question
- **Rejected:** the evidence rules do not permit the assertion

These statuses are not interchangeable confidence colors. They describe different epistemic conditions and require visible text labels.

## Truth boundaries

The interface may:

- Summarize published structured information
- Reorder or filter results
- Visualize accepted paths and typed relationships
- Explain the rule responsible for an accepted or refused result
- Link related objects
- Show uncertainty and coverage gaps

The interface may not:

- Create a relationship because two entities appear nearby
- Infer contact, coordination, influence, benefit, intent, or wrongdoing
- Convert sequence into causation
- Hide a qualification to simplify a headline
- Present an exploratory candidate as a published finding
- Merge distinct entities without an accepted identity decision
- Let content self-assert its own verification or trust status
- Expose internal intake, crawler, private, local, or unpublished material

## Representation consistency

Directory, graph, timeline, case report, entity profile, connection result, and receipt archive are views of the same published objects.

Therefore:

- Names, dates, statuses, and counts must agree across views.
- A claim opened from a graph must be the same claim opened from a case.
- A receipt must list the same supported claims everywhere.
- Changing representation must not silently broaden the query.
- Filters and date constraints must remain visible.
- A graph edge must resolve to the exact path step and receipts that authorize it.

## Required frontend states

Design each major component for:

- Complete and partial data
- Unknown or open-ended dates
- Identity ambiguity
- Missing archive or link rot
- Contradictory evidence
- Exploratory material
- Rejected connection
- No results
- Loading
- Published-data error
- Superseded content

Do not use blank space or generic “something went wrong” messaging where a specific evidence state is known.

## Progressive disclosure

The normal depth is:

**Plain-language summary → exact claim → role/event/path step → receipt → technical provenance**

The first layer must remain understandable without sacrificing access to the last layer.

## Frontend implementation boundary

Design components against these public content concepts rather than backend directories. Implementation may map existing published artifacts into the contract later.

If the available published data cannot support a required component, show a truthful unavailable or incomplete state. Never mock a successful research result into existence.
