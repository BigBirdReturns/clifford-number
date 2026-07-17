# LinkedIn targeted-pull review projection

This directory is the portable, PDF-free handoff for the two targeted profile
pulls captured on 2026-07-14. It exists so another reviewer can inspect the
cohort, role extraction, chronology, crossing logic, duplicate warnings, and
visual spot-check notes without receiving the original LinkedIn-generated PDFs.

Run the local rebuild when the private intake exists:

```bash
npm run build:linkedin-review-projection
npm run validate:linkedin-review-projection
```

The projection includes displayed names, public profile URLs, capture times,
PDF hashes and sizes, page counts, page-addressed role tuples, machine crossing
candidates, bounded visual-review observations, and explicit extraction
warnings. It also preserves neutral acquisition gaps for the four requested
profiles that were unavailable or not located. It excludes PDF bytes, full profile prose, contact information,
addresses, skills, and private LinkedIn activity.

## What another reviewer can do without the PDFs

- Reconstruct every projected role timeline and machine crossing candidate.
- Audit whether candidate edges follow from the projected role tuples.
- Identify duplicate extraction, layout shifts, zero-detector results, and
  overcounting.
- Revisit the public profile URLs and seek independent public corroboration.
- Compare a reacquired PDF against the retained SHA-256 when the artifact is
  content-identical.

## What another reviewer cannot do without the PDFs

- Independently confirm that the original PDF visually displayed every tuple.
- Recheck embedded PDF metadata or page layout.
- Detect a mistaken extraction that is not exposed by the projected fields.
- Treat the PDF hash as proof of content without possessing matching bytes.

The role records remain timestamped observations of public self-claims. They do
not independently establish identity, employment, ownership, influence,
coordination, causation, or wrongdoing. Every projected row remains
`graph_effect: none` until a later, source-specific promotion step.
