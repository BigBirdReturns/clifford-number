# The explorer

Status: current (2026-10-22, release line 2.1.0). This page explains what a reader sees on [`explorer.html`](../explorer.html) and how to read it. The rules of the evidence model are in [`methodology.md`](methodology.md); the vocabulary is in [`definitions.md`](definitions.md); what each release changed is in [`releases/`](releases/2.1.0.md).

The explorer is a static page over compiled artifacts. The aperture reads four: `build/surface-graph.json` (actors, organizations, bounded surfaces and their participation rows), `build/hop-graph.json` (the admitted hop bases and shortest routes), `build/receipt-graph.json` (the receipts) and `graph.json` (the older research-network context). `app.js` loads three more for the rest of the page: `build/scores.json` (the entity pages' numbers), `build/public-catalog.json` (the case, track, claim and receipt catalogue) and `build/public-data-boundary.json` (the data-boundary notice). Everything on the page is derived from those seven files in the browser. Nothing on the page is a fact that is not in them, and the page never writes anything back.

## The display rules, once

Every view below obeys the same rules. They are stated here and not repeated.

1. **Every mark is one ledger row.** A dot, bar or node stands for one participation row or one surface row, never for a score or a summary of rows.
2. **A hop is a surface, never a line between two people.** Where two people share a bounded surface on a documented day, the display shows the surface (a column, a diamond, a step card). No view draws a person-to-person line, and shared context never becomes an arc between two people.
3. **A dense roster is one object.** The Dialog public directory (112 listed names) is drawn as one block or one roster container with its count, and no line joins any two of its names. A name documented on no other surface (110 of the 112) gets no mark anywhere. A name that is also documented elsewhere (2 today: Matt Clifford and Dan Driscoll) keeps its own lane, and its Dialog row is drawn as one mark on that lane and counted once; the block's card names them.
4. **Undated rows are never time-sliced.** A row with no documented date is listed, never placed on an axis, and never dimmed or counted as inside or outside a time window.
5. **Evidence class and receipts stay attached.** Every mark, column, step and row carries its evidence class (official, primary public, reported) and opens its receipts.
6. **No composite score drives a channel.** Size, colour and prominence come from documented counts and evidence classes. There is no heat, factory or machine score behind any visual.
7. **Counts name their denominator.** "N of M rows in window", "112 listed names", "15 named lanes": a number on the page says what it is a count of.
8. **Prominence is not an allegation.** Co-presence is never coordination. The page shows documented shared context and nothing more; the reader draws the conclusion, in their own name.

## The four aperture modes

The workspace starts with search and the panel headed "Documented activity". Its four tabs sit directly above the view. A URL with no `ap_` parameters opens Timeline. Search remains available on record pages; opening a record or the connection checker replaces the visualization, and Explore returns to it. Method, Research queue, Estates and Game trails are in More. Dataset build dates and release metadata are under "About this dataset and release".

### 01 Timeline (arrival)

A ledger timeline: rows on lanes against a date axis.

- **Lanes** group the rows by People (default), Organizations or Surface types. In the People view every actor documented on two or more surfaces has a named lane (15 at this release); everyone else sits in one strip labelled "People documented on one surface" (38 rows). Up to 18 named lanes can be shown; "Add a lane" searches people, organizations and surface types.
- **A mark** is one participation row at its documented date. Fill is evidence class; outline says whether the surface is hop-eligible. A row with an end date is a span; a year or month row is widened to the period it names; an open-ended row runs to the edge of the axis; rows within a few pixels fold into one "+N" object that still counts each row.
- **A column** is one hop basis: a surface that two or more people share on one day, drawn as segments that touch only the lanes of that surface's participants. The 95 hop bases in the release form 19 such surface-day objects on 18 days.
- **The roster block** is the Dialog directory, drawn once with its count (rule 3). Its card lists the names also documented elsewhere and says how many appear on no other surface.
- **Controls:** Date range offers Recent activity (the responsive default), individual years and Full record (the entire documented range). Filters & tools contains Add a lane, the Surfaces filter (all, hop-eligible only, context only); the evidence floor; "Mark a window" to dim rows outside a [from, to] window without removing them; Reset. Ctrl (or Cmd) + wheel zooms the axis; a plain wheel scrolls the page. The overview strip under the plot carries the axis handles.
- **Keyboard:** Tab reaches one mark, then the arrow keys, Home and End walk the days and lanes; the lane labels are a second stop.
- **Cards:** every mark, lane, column, block and fold has an inspector card with its role, window, evidence class, receipt buttons and actions (open the record, add lanes, route from here, open the roster view). The first card, "Select a mark", offers a reading guide and an example. On phones it stays below the chart until a selection opens the detail sheet.
- **URL keys:** `ap_time_by`, `ap_time_from`, `ap_time_to`, `ap_time_cursor`, `ap_time_lanes`, `ap_time_sel`, `ap_time_evidence`, `ap_time_hop`, written only when they differ from their defaults.

### 02 Network

The research network as a spherical field, rendered with WebGL when the browser has it and as SVG scenes otherwise.

- **Nodes** are actors, organizations and surfaces. Size and halo are the documented surface count for that object (participants, for a surface), as the legend says. **Arcs** are the sourced edges of `graph.json`, one for one, coloured by evidence class; the canonical overlay arcs run from a participant to a surface.
- **Controls:** "Start with a person or organization" (a name search); **Depth**, a slider whose stops are Whole network, Neighborhood, Bounded surface and Evidence; **Evidence time**, a [from, to] window with two handles and an "All time" button. Out-of-window arcs and pulses dim and are never removed; the header reads "N of M rows in window". Play advances the window over 52 seconds; it is off by default and never starts under a reduced-motion preference.
- **Selecting an arc** opens what it is: a participation row (surface, role, window, evidence class, receipts, "Open public record") for an overlay arc, or the claim with its receipts for a research arc.
- **The inspector** lists every ledger row of the selected object, oldest first. A row the field cannot draw is still listed and says why: "not drawn on the field (privacy guard)" or "drawn as one contained roster object, not as an arc".
- The field pauses when the stage is off-screen or the tab is hidden. "Jump to a bounded surface" picks a surface family and surface directly.

### 03 Route

The shortest admitted route between two actors as actor → bounded surface → actor steps, from `build/hop-graph.json`.

- **Controls:** From actor, To actor (and a swap button), "Active during" (a year, month or day), the evidence floor, Reset.
- Each step is a surface card with the two roles, the validity window, the evidence class and the receipt count; selecting a step opens its exact roles, window, receipts and archive state. A route longer than 24 steps is shown in a window of 24 with the whole path retained and reachable.
- When no route survives the controls, the view says so and, where the compiler recorded a refusal (two participations on one surface whose dates do not overlap), shows it as a blocked step with both windows. "No route" means not documented in this corpus; it is never proof of absence.

### 04 Roster

One bounded surface as a roster container, for surfaces with two or more actors.

- **Controls:** the surface; "Find actor or role"; "Active during"; the evidence floor; "People shown" (6 to 36 actors shown at once, 18 by default); Clear pins.
- Participants appear in an aligned grid within one source container. Selecting a person opens their recorded role, dates, evidence class and receipts. A count identifies the additional people available through search or a higher display limit. No participant-to-participant line is drawn, and pinned actors stay visible.

### Shared by every mode

- **The evidence overview** under the stage is a stable, paged table of the rows the view is showing (25, 50 or 100 per page). Selecting a row selects the object; sorting and paging never reorder the row under the pointer.
- **Copy exact view** puts the current view, as `ap_` parameters, into a link. **Saved views** keep several such views in the browser and compare them. **Export** produces a publication packet (a printable page with the receipt union and the interpretation caveat) for the current view.
- **The evidence dialog** opens any receipt or claim. The aperture publishes the mode and object a receipt was opened from (`globalThis.__cliffordApertureOrigin`), but `app.js` does not read it yet, so at this release the dialog opens with its plain toolbar label. A breadcrumb naming the mode and object is part of the entity-page contract below.
- Hash routes (`#actor/...`, `#surface/...`, `#desk/...`) keep the aperture's `ap_` state, so a shared link restores the view the sender had.

## The connection checker

The main navigation’s "Check a connection" opens a dedicated view. It takes two actors and an optional date and answers from `build/hop-graph.json`:

- the Clifford route (minimum hops) first, always, and labelled canonical;
- optionally a secondary projection (strongest evidence, best dated, official only), clearly labelled as secondary and shown as an explicit absence when none exists;
- for each step, both roles, the overlap window and its precision, the evidence class and the receipts;
- the connections the compiler refused and why;
- copy-ready caveat language for publication.

## The entity pages

Searching, or following any name, opens a record page under a hash route: `#actor/<id>`, `#organization/<id>`, `#surface/<id>`, `#chain/<id>`, and from 2.1.0 also `#type/<surface_type>` and `#year/<yyyy>`. The pages are fed from the same derived model as the Timeline, so a row on a page and a mark on the timeline are the same ledger row. Every page shows:

- fact chips with their denominators ("10 documented surfaces of 54", "across 6 surface types", "with 8 organizations", first and last dated day);
- a date-sorted ledger table (row number, date or window with precision, surface, role, organizations, evidence class, receipts) with a status line that is never silent: it says how many rows are shown of how many, and what any filter hid;
- "Patterns in the rows": surface-type counts, organization counts, hop partners with the day of their shared surface (each opens the connection checker with both names), then counted co-presence with dense surfaces excluded and labelled;
- a single-lane mini timeline above the ledger table and an "Open in the timeline" button that opens the Timeline tab on that person, organization or surface;
- "Copy ledger as text"; a machine-derived profile, where no hand-written one exists, labelled as such.

A surface page adds the surface's window with precision, every participant with their own window and role, the evidence-class mix, hop eligibility and the ledger's refusal reason; the Dialog surface page lists its roster sorted by "Also documented on". Nothing on a page is a score: the "Structural context index" and "Factory Score" of 1.3.0 are gone.

## What the page is not

The explorer is a reading instrument over published records. It does not compute Clifford Numbers (the compiler does, in `tools/`), it does not fetch anything beyond the compiled artifacts, and it does not add, weigh or rank evidence. A number of hops is a count of documented shared surfaces on a route and nothing else.
