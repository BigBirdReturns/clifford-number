# Synthetic-population vendor denominator lock

Cross-vendor claims require a neutral denominator. Publicly visible vendor recognition posts are useful discovery material, but they are not the analyst roster and cannot be treated as a market census.

## Current source state

Issue #38 identifies Gartner document 7718657, *Emerging Tech: AI Vendor Race: Startups to Watch in Synthetic Population and Behavioral Simulation*, dated 14 April 2026. The public issue record reports a universe of 60 reviewed vendors, 33 startups to watch, and 10 front-runners. The complete licensed document, roster, tier labels, and method text are not available in the repository.

The durable recovery ledger currently transcribes fourteen public candidates. Issue #38 later reports a fifteenth public recovery that has not yet been durably transcribed into the ledger. Zero candidate memberships or tiers are confirmed from the licensed source document.

## Why the recovery set is not the denominator

Public visibility is non-random. Vendors that publish recognition posts are easier to find than vendors that remain silent. Analyst and industry commentary may repeat incomplete or context-free lists. Therefore the recovery set cannot support:

- prevalence or market-share calculations;
- tier distributions;
- inclusion or exclusion rates;
- capability or quality comparisons;
- claims that an unrecovered vendor was absent from the report;
- claims that inclusion is endorsement, validation, procurement advice, deployment, or investment merit.

A first-party post establishes only that the vendor publicly claimed recognition. It does not independently establish the analyst roster, exact tier, methodology, or full report context.

## Storage classes

### Public recovery candidate

A discovery row supported by a vendor claim, individual claim, seed-case reference, or public commentary. It remains outside the denominator. Any publicly claimed designation is stored as a claim, never as a confirmed analyst tier.

### Denominator member

A row transcribed from an authorized complete source artifact with:

- a stable vendor identity;
- exact source span;
- exact tier label;
- complete-roster context;
- accepted human identity and tier review.

No denominator members are admitted while the source is partial. Partial source-document transcriptions remain recovery candidates until all 33 watched positions are accounted for.

## Promotion gate

`usable_as_denominator` may become `true` only when all of the following hold:

1. an authorized complete source artifact is present;
2. all 33 watched vendors are transcribed;
3. all tier labels and method text are transcribed;
4. every row has a source span;
5. public claims are reconciled against the source;
6. every identity and tier passes human review.

The validator derives the gate from those facts. Changing the status flag alone cannot freeze the denominator.

## Thesis relationship

Denominator recovery enters the thesis dossier as `coverage`, not `supports`. It can move the research assembly from “no work recorded” to “collecting evidence,” but it contributes zero support packets, zero thesis evidence packets, zero case findings, and zero graph effects.

The allowed thesis relations are `coverage` and `context` until the denominator is frozen. Even after freezing, membership in an analyst report remains evidence about category formation—not evidence that a vendor is capable, superior, deployed, independently validated, or representative of the market.

## Commands

```text
npm run compile:denominator
npm run validate:denominator
node test/vendor-denominator.test.js
```

Generated output:

- `build/research/synthetic-population-vendor-denominator.json`
- `build/research/synthetic-population-vendor-denominator.md`

Both outputs are deterministic projections of the source ledger and can be regenerated from a clean clone.
