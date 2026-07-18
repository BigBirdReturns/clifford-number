# Clifford Number public site: start here

This folder is a portable handoff for a designer or frontend team who knows nothing about Clifford Number, AXM, Program of Record, or the repository.

You should not need backend access to understand the assignment.

## The product in one sentence

Clifford Number is a public research instrument for tracing documented relationships through named public-decision surfaces, examining investigations built from those records, and opening the evidence behind every material claim.

It is not a guilt score, a conspiracy map, or an automated causal verdict.

## What the current product problem is

The research exists in several useful forms—research tracks, people, organizations, public-decision surfaces, connection paths, compiled cases, claims, and source receipts—but the website mainly exposes a small topology explorer.

The redesign must make the published research feel like one coherent body of work without flattening those different object types into an undifferentiated graph.

## The first-minute experience

A cold visitor must be able to do this without instruction:

1. See what Clifford Number is and what it does.
2. Choose a clearly named research track.
3. Understand one finding or unresolved question.
4. Open the claim supporting that statement.
5. Inspect the underlying source receipt.
6. Return without losing their place and explain what the evidence does and does not establish.

That is the primary product loop. Prove it before expanding the interface.

## The four documents

1. **This document** — product orientation and vocabulary.
2. **[Public site brief](01-PUBLIC-SITE-BRIEF.md)** — required pages, interactions, visual behavior, and deliverables.
3. **[Content and evidence contract](02-CONTENT-AND-EVIDENCE-CONTRACT.md)** — what the frontend receives and what it may truthfully display.
4. **[Cold-read test](03-COLD-READ-TEST.md)** — the unaided comprehension gate the design must pass.

## Five words that must not be conflated

**Research track**

A bounded thematic research program, such as Opportunity Zones and value capture. It has a scope, status, findings or candidates, coverage gaps, entities, and receipts.

**Case**

A compiled investigation that joins events, actors, organizations, money, claims, and reported outcomes around a specific question.

**Decision surface**

A named, bounded public process or body on which documented participation can support a connection: for example, a taskforce, review panel, board, authorship group, or small cohort.

**Claim**

A specific assertion with an evidence class, status, dates, qualifications, and supporting receipts.

**Receipt**

The inspectable evidence unit supporting one or more claims: source, publisher, URL or archive, date, locator, retrieval information, and availability status.

## Non-negotiable product laws

- One published corpus, many representations: directory, track, entity profile, graph, timeline, case report, claim, and receipt.
- The same entity and claim must remain the same object everywhere.
- Presentation may explain evidence; it may not strengthen or invent it.
- A connection is asserted only when the documented rules support it.
- “No documented connection” is a valid, explained result.
- Published, exploratory, disputed, historical, and superseded material must remain visibly distinct.
- The visitor should experience the research, not the repository architecture.
- Every material claim must remain one action away from its receipts.
- Internal intake, crawler state, private/local material, and unpublished research must never appear.

## What success feels like

The visitor should be able to say:

> I selected a body of research, understood its scope, followed a claim, inspected its evidence, and know both what the records support and what they do not.

If a cold visitor instead says “this is a network showing who is connected to whom,” the design has failed by oversimplifying the product.
