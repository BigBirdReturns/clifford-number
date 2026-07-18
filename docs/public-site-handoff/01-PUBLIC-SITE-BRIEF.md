# Clifford Number public website brief

## Assignment

Design the public-facing Clifford Number website as a coherent research-exploration product.

The site must let a general reader discover research, understand why it matters, follow people and institutions across multiple investigations, verify claims against sources, and recognize uncertainty or refusal. It must do this without requiring knowledge of the backend, repository, ingestion process, or internal research workflow.

## Primary audiences

- A curious member of the public arriving cold
- A journalist checking a person, institution, or claimed relationship
- A researcher comparing programs, organizations, or decision surfaces
- A skeptical reviewer auditing evidence and methodology
- A contributor looking for coverage gaps or corrections

The first audience controls basic comprehensibility. The skeptical reviewer controls evidence depth.

## Questions the interface must answer

1. What is Clifford Number?
2. What subjects have been researched?
3. What people, organizations, decisions, programs, and financial pathways appear?
4. What evidence supports a displayed claim or connection?
5. What is verified, reported, derived, unresolved, disputed, or rejected?
6. What does the evidence explicitly not establish?
7. What release or version am I looking at?

## Required navigation

### Home

The first viewport must contain useful research, not only branding.

Required elements:

- One-sentence product definition
- Global search
- Current release label and core corpus counts
- Visible research-track entry points
- A featured or representative case
- Connection-checker entry point
- Short evidence-standard explanation
- Methodology and source links

Reduce the current oversized hero treatment. A visitor should reach substantive research without scrolling through a marketing preamble.

### Research tracks

Provide a browsable directory of thematic research programs. The interface must accommodate at least:

- Opportunity Zones and value capture
- TIF district value capture
- Stadium and arena public finance
- Metro-station transit-oriented development
- CHIPS Act fab siting
- OGE 278 revolving-door pathways
- Regulatory revolving doors
- Congressional disclosure crossings
- Defense accelerator and fund rosters
- State-officeholder land and contract crossings

Every track card must show:

- Title and plain-language description
- Geography or institutional scope
- Time period
- Research status
- Last updated date
- Counts of relevant entities, claims, and receipts
- Important coverage gaps
- Whether the track contains published findings or exploratory material

Filters must support subject, geography, time, institution, status, and evidence maturity.

### Explore

Provide one global index across:

- People
- Organizations and companies
- Programs
- Decision surfaces
- Research tracks
- Cases
- Claims
- Receipts

Support search and browsing. Search results must identify their object type and explain why they matched.

### Connection checker

Allow a user to select two people and optionally an “as of” date.

The result must display:

- Whether a qualifying path exists
- Path length
- Every intermediate person and bounded surface
- Roles and overlapping date windows
- Evidence class and receipts
- Any qualification affecting the result
- An explicit, understandable refusal when no supported connection exists

A graph may supplement the result. A readable step-by-step route is mandatory.

### Cases

Provide a directory of compiled investigations. Each case must expose:

- Investigative question
- Executive summary
- Status and confidence
- Timeline
- Actors and organizations
- Typed financial, program, role, or outcome events
- Verified, unresolved, and disputed claims
- Evidence gaps
- Receipts
- What causal conclusions are and are not supported

### Methodology

Explain in ordinary language:

- What counts as a connection
- What a bounded surface is
- Evidence classes and claim statuses
- Time-overlap rules
- Receipt requirements
- Dense-surface exclusions
- Causal-language limitations
- Redaction and privacy policy
- Corrections process

These explanations must also appear contextually wherever the relevant rule affects a result.

## Required page templates

### Research-track page

1. Title and one-sentence thesis or question
2. Status, scope, geography, time period, and update date
3. What was examined
4. What the evidence currently shows
5. Key actors, organizations, programs, and surfaces
6. Findings, candidate patterns, and rejected interpretations
7. Timeline or other appropriate representation
8. Claims grouped by evidence status
9. Coverage gaps and unresolved questions
10. Receipt/source list
11. Related tracks and cases
12. Release and lineage information

### Entity page

For a person, organization, company, program, or surface:

- Canonical name and aliases
- Entity type and neutral description
- Relevant roles with dates
- Associated decision surfaces
- Appearances across tracks and cases
- Claims and connection paths
- Receipts
- Identity ambiguity warnings

Appearance must never imply misconduct, contact, influence, or coordination.

### Claim view

Every consequential claim must expose:

- Exact assertion
- Claim type and status
- Evidence class
- Relevant dates and entities
- Supporting receipts
- Contradicting evidence, if present
- Qualification or limitation
- Last reviewed date

This may be a page, drawer, or both. Opening it must preserve the surrounding context.

### Receipt view

Display:

- Source title and publisher
- Source type
- Original and archived links when available
- Publication and retrieval dates
- Relevant excerpt or locator
- Claims using the receipt
- Link availability or archive warning
- Optional technical provenance details

## Interaction requirements

### Preserve context

Moving among summary, timeline, graph, entity, claim, and receipt views must preserve selected track, filters, dates, and navigation history.

### Keep evidence one action away

Every material claim, edge, event, or number must provide direct receipt access.

### Treat refusals as findings

Explain why a proposed connection fails: missing overlap, insufficiently bounded surface, missing evidence, identity ambiguity, or another specific rule.

### Make graphs optional, not compulsory

Every graph needs a legend, clear node/edge semantics, receipt access, date qualifications, keyboard support, and a textual equivalent.

### Maintain stable identity

Track, case, entity, claim, and receipt URLs must be stable and shareable. The same object must not acquire different names or statuses across representations.

## Visual direction

The desired character is investigative, editorial, serious, modern, calm under information density, and visibly source-conscious.

Avoid:

- Conspiracy-board aesthetics
- Decorative networks
- Intelligence-agency cosplay
- Excessive dark navy
- Giant typography that delays the research
- Generic dashboard clutter
- Red as an automatic implication of guilt
- Unexplained acronyms
- Charts without readable alternatives

The current navy, cream, and amber identity may evolve. Information hierarchy and readability take priority.

Use labels, icons, shapes, and text—not color alone—to distinguish:

- Published versus exploratory
- Verified versus reported versus derived
- Resolved versus disputed versus incomplete
- Direct evidence versus context
- Current versus historical or superseded
- Accepted connection versus refusal
- Available source versus link rot

## Responsive and accessibility requirements

Meet WCAG 2.2 AA expectations, including:

- Full keyboard operation and visible focus
- Semantic headings and landmarks
- Proper form labels
- Screen-reader descriptions and text equivalents for graphs
- Adequate contrast
- Reduced-motion support
- Usable layouts at 200% zoom
- Touch-friendly mobile controls
- Complete evidence access on mobile even when graphs simplify

## Performance and publishing requirements

- Core page content must remain useful before advanced visualization loads.
- Do not load the complete corpus to render the first page.
- Search and filtering should feel immediate.
- Graphs should load progressively.
- Empty, partial, unavailable, and failed states must look intentional.
- Every page needs a meaningful title, share preview, release label, and stable URL.
- Only explicitly published material may be consumed.

## Required design deliverables

1. Sitemap and navigation
2. Desktop and mobile home page
3. Research-track directory and track page
4. Search and browse experience
5. Entity page
6. Connection checker, accepted result, and refused result
7. Case directory and case page
8. Claim/evidence drawer
9. Receipt view
10. Methodology and contextual help
11. Loading, empty, partial, warning, dispute, and error states
12. Accessibility annotations
13. Component inventory and design tokens
14. Clickable prototype of the required cold-read journeys

Do not build the complete visual system before the primary evidence journey has passed the cold-read test.
