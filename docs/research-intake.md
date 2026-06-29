# Research Intake

Contributions enter as candidate surface packets. A contribution does not edit generated artifacts and does not create Clifford Number hops automatically.

## What to submit

Use `contributions/templates/candidate-surface.md` and include:

- surface label
- surface type
- bounded-by evidence
- participant list
- roles
- dates
- receipts
- evidence class
- whether it is hop-eligible, scorable, or context-only

## Review rule

A broad institution is not enough. `No. 10`, `Cabinet Office`, `DSIT`, `News UK`, `Faculty`, or `Electric Twin` by itself is not a hop. Name the bounded surface: roster, board, filing, funding round, report, contract, programme, appointment record, event, customer deployment, or policy document.

## Maintainer merge path

1. Screen the packet.
2. Add or update canonical actors and organizations.
3. Add receipts to `data/ledger/receipts.jsonl`.
4. Add the surface to `data/ledger/surfaces.jsonl`.
5. Add participation rows to `data/ledger/participation.jsonl`.
6. Add supporting claims to `data/ledger/claims.jsonl`.
7. Run `npm run release:check`.
