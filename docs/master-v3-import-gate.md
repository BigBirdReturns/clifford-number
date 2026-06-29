# Master v3 import gate

This document defines how to handle `clifford-number-master-v3.md` without turning the public graph into a raw research dump.

The master document is a pre-import reference. The public graph is stricter: every promoted edge must remain public-role-only, sourced, validated, and safe to click through.

## Import rule

Do not commit the raw v3 master document as canonical graph data. Generate a local queue first:

```bash
npm run import:master:v3 -- path/to/clifford-number-master-v3.md data/import-queues/master-v3.import-queue.json
npm run check
```

The queue does not mutate `graph.json`. It separates ready rows from review rows, verify rows, held rows, and rejected private-field rows.

## Evidence mapping

| Master value | Repo value | Meaning |
|---|---|---|
| `official` | `confirmed` | Official source or primary authority supports the row directly. |
| `primary_public` | `primary_public` | Public source material supports the row directly. |
| `reported` | `reported` | Credible reporting supports the row, pending primary recheck. |
| `derived` | `derived` | Sourced ingredients support an analytic connection, not a standalone factual claim. |
| `judgment` | `judgment` | Interpretive classification for navigation only. |
| `open` | `open` | Not publication-ready. |

## Status preservation

`listed`, `registered`, and `attended` must never collapse into each other. Co-presence is not coordination. A directory listing is not attendance.

## Import batches

1. **Ready** — official/primary public rows about public roles, publications, appointments, organizations, or directory listings.
2. **Review** — reported rows where the source exists but the primary record has not been rechecked inside the repo.
3. **Verify** — procurement, nonprofit, VC/capital, SEC, Companies House, Find a Tender, and lobbying rows needing primary record capture.
4. **Hold** — open claims, hypotheses, low-confidence clusters, and rows with no clean evidence mapping.
5. **Reject** — private contact material, raw registrant fields, intimate data, questionnaire answers, or any private-field guard hit.

## Control question

Can this row become a receipt-backed public graph edge without changing what the source actually proves? If no, keep it in the queue.
