# Clifford public-interest evidence trail: infrastructure, not a verdict

This artifact is public-good research infrastructure. It preserves evidence,
provenance, uncertainty, and coverage without prescribing what the public must
conclude.

The governing rule is simple: **uncertainty changes an edge's label, weight,
and line style; it does not erase the observable edge.** Canonical hop rules
control the Clifford Number. They do not control what the public-interest system is
allowed to show.

## The public-interest map

This principal-focused trail is one view into a much larger evidence system. The full
cross-corpus inventory is
`data/research/clifford-cross-corpus-public-interest-map.json`. It keeps nine lanes
visible at once: the Clifford/Starmer/Dialog/Thiel/Palantir core, NatSec100,
the Austin-Israel defense and venture corridor, person-centered defense
routers, USAspending awards, the unexecuted SAM.gov route, LinkedIn role
crossings, presidential disclosures, and the research fanout.

That distinction matters. The canonical hop graph contains 31 compiled edges;
it is not the complete research corpus. Intake, staged data, held joins,
rejections, and explicit source gaps are inspectable evidence states—not deleted
work.

### Policy formation and state adoption

- **Matt Clifford → AI Opportunities Action Plan → Keir Starmer** is an
  official direct hop. Clifford authored the commissioned plan; Starmer agreed
  to take forward all 50 recommendations and appointed Clifford as the Prime
  Minister's AI Opportunities Adviser.
- The program calls for sovereign compute, AI Growth Zones, a National Data
  Library, procurement reform, government acting as a strategic AI customer,
  domestic AI champions, and deeper collaboration with the national-security
  community.

### Capital, company governance, and state deployment

- The research layer records **Peter Thiel → Founders Fund** and **Peter Thiel
  → Palantir** through partner, co-founder, and chair roles.
- Palantir's reported state-facing outcomes include the $480 million Maven
  prototype, Maven becoming a program of record, an Army enterprise agreement
  worth up to $10 billion over ten years, and NATO supply.
- Palantir CTO and EVP Shyam Sankar was officially commissioned into Army
  Detachment 201, putting company leadership inside a formal military
  technology-modernization channel.
- Sanabil is reported as PIF-owned and publicly lists Founders Fund as a fund
  partner. The exact LP vehicle, commitment, dates, ownership, and control
  rights remain open; the visible structural trail remains on the evidence map.

### Personnel and capability circulation

- Former No. 10 personnel founded Electric Twin and commercialized
  synthetic-audience infrastructure.
- Former Cabinet Secretary Simon Case joined its ethics board.
- Louis Mosley, identified as a Palantir EVP, appears on its reported
  angel-investor surface.
- Electric Twin's modeled-audience capability is reported in use with News UK.

The combined signal is a circulation of personnel, legitimacy, capital, and
modeled-public-input capability across government, AI infrastructure, media,
and defense-adjacent occupational networks. Whether that is an ordinary
revolving-door market, a repeatable governance-production model, or both is a
question for public evaluation—not a verdict supplied by the repository.

### Convening infrastructure

- Clifford is listed in Dialog's public directory; Thiel is reported as a
  co-founder.
- The directory spans investors, technologists, defense and national-security
  figures, elected officials, regulators, media figures, and legal-policy
  actors.
- Trump-administration and conservative political/legal adjacency enters the
  same directory through Jared Kushner, Scott Bessent, Will Scharf, Leonard
  Leo, and Grover Norquist. Donald Trump is not silently substituted for those
  people.

The density of the directory weakens any automatic bilateral claim. It does
not make the convening ecology disappear. The next research step is to find the
smaller sessions, registrations, delegations, and dated encounters inside it.

## What the data suggests looking at

1. **Policy-market convergence:** a state demand-building program and a mature
   state-facing AI supplier ecosystem expand in the same historical window.
2. **Public-private relay:** government personnel, corporate capital,
   legitimacy roles, and synthetic-population capability recur across linked
   institutions.
3. **Capital-defense loop:** sovereign capital, venture management, company
   governance, military personnel channels, and procurement appear along a
   continuous trail whose exact legal vehicles remain partly unresolved.
4. **Elite cross-domain convening:** policy, capital, technology, security,
   law, media, and administration-adjacent actors occupy the same organizing
   environment.

These are visible patterns composed of differently weighted edges. A dotted
inference is not a solid official edge, but it is also not nothing.

## How the infrastructure renders evidence

- official record — heavy solid line;
- primary public representation — solid line;
- reported link — dashed line;
- self-claimed link — dash-dot line;
- inferred structural join — dotted line;
- disputed or contradicted signal — split warning line;
- unavailable or unsearched source — open ghost line.

Every line remains inspectable. Clicking it should reveal the underlying
observation, its source state, what it may indicate, what remains unknown, and
the next source that could change its weight.

## Locked doors

- a named Action Plan implementation vehicle that reaches Palantir or another
  specific supplier;
- exact vehicles, amounts, dates, and rights in the Sanabil–Founders Fund
  capital trail;
- event-level Dialog records that turn the broad directory into smaller
  co-participation surfaces;
- a dated transaction, appointment, campaign vehicle, or contract connecting
  Trump personally to the Clifford/Thiel/Palantir trail;
- durable receipts for the reported Electric Twin capital and customer edges.

Locked doors are objectives. They are not permission to delete the corridors
that lead to them.

The machine-readable evidence trail is
`data/research/clifford-thiel-trump-wrap-up.json`, with the full inventory in
`data/research/clifford-cross-corpus-public-interest-map.json`. Their validators fail if
a signal or entire corpus lane is hidden merely because it is inferred,
reported, dense, non-hop, staged, held, or still waiting on a stronger receipt.

## Crawl-health snapshot and current public view

`data/research/clifford-cross-corpus-public-interest-map.json` is the authored editorial snapshot. Its `generated_at` date and `crawl_health_snapshot` identify the historical scope of its source-health counts. It is not rewritten by the scheduled crawlers.

`npm run build:cross-corpus-map` derives `build/cross-corpus-map/current.json` from that snapshot and the committed `data/crawl/sources.json` and `data/crawl/state.json`. The projection replaces only the fanout source-gap count, exact source/status ledger, and availability statement, and adds input fingerprints and per-source observation timestamps. It does not promote an observation, alter another lane, manufacture a zero result, or admit a claim or graph edge. The editorial snapshot date remains distinct from the source observation times.

The release pipeline builds this view after the research fanout. The map validator checks the entire materialization against its three inputs, retains the independent exact gap-count comparison with the fanout, and rejects a missing fanout. Validation does not regenerate or repair an invalid view. Healthy, failed, partial, unobserved, and recovered sources therefore change the generated availability view without requiring the crawler to edit a research ledger. Disabled sources remain outside the enabled-source denominator.

The Pages builder refuses stale materializations and publishes the validated view at both `build/cross-corpus-map/current.json` and the legacy `data/research/clifford-cross-corpus-public-interest-map.json` URL. Pages validation checks both copies against the current inputs. The repository source retains the original snapshot; unpublished crawl rows and receipts remain excluded from Pages under the existing publication rules.

A changed availability state does not rewrite the independent SAM acquisition contract or the other lane-specific evidence checks. A source marked healthy is not proof of exhaustive coverage, a failed source is not proof of absent records, and recovery does not delete preserved observations or rejections.

The standalone `npm run build:pages` entrypoint explicitly builds the fanout and current map first. Direct low-level Pages assembly and all validators still require an existing valid view and refuse stale inputs. This keeps focused publication workflows independent of the larger release orchestration without allowing validation to repair its own evidence.
