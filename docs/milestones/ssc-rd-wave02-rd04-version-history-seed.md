# SSC RD-04-C01 · version-history source and denominator custody

Issue **#789** attempts the Wave 02 closure of:

```text
RD-04-C01
current statutory, regulatory, and guidance version history after the 2025 law
```

The lane now has terminal seed-source custody, a corrected cross-reference denominator, and an exact authority-unit denominator. It has **not** yet adjudicated every predecessor, successor, amendment, correction, supersession, operative interval, or continuing-effect edge and therefore has not closed the class.

## Frozen seed denominator

```text
federal seed instruments:          5
California seed instruments:       9
seed instruments total:           14
terminal source receipts:          14 / 14
resolved source receipts:          13 / 14
unresolved source receipts:         1 / 14
version edges adjudicated:          0
class closures:                     0
```

The nine California rows were not selected from search results. They are the complete county-resource document set exposed by the exact preserved CDSS ABAWD page body:

```text
data/intake/status-sovereignty-rd04-snap-route-adjudication-a04/
page-custody/a02/CA-ABAWD/attempt-1.body
```

Exact parent-body SHA-256:

```text
d3aa66844880b48d63466f64347a8b06389ec52b5a85159ad205942fc4f88bff
```

That page exposes:

```text
ACL 25-60
ACL 25-64
ACL 25-93
ACL 25-93E
ACL 26-15
ACL 26-26
ACIN I-14-26
ACL 26-29 / ABAWD Handbook 3.0
ACL 26-43
```

The five federal rows preserve the enacted parent authority, the pre-H.R.1 FRA 2023 regulatory baseline, the parent OBBB implementation memorandum, and the two ABAWD-specific exception and waiver memoranda.

## Exact seed-source capture

```text
workflow run:
30765064506

artifact:
8838664098

artifact ZIP SHA-256:
f99ef3ea3c06a0120ca46b84f0c71f110a5a5bb3600ff980c1d4182804796515

manifest entries:          62
manifest combined SHA-256:
b4f1eb8b79d5b564e5479b73df898e8ddb874b492171b84b401350eff4c26b92
```

The Congress.gov route for Public Law 119-21 returned two bounded HTTP 403 receipts. It remains an affirmative denominator row. A GovInfo PDF selected through exact public-law identity is retained as an alternative official locator candidate, but it has not yet been fetched inside this lane.

```text
maximum attempts per source:  2
connect timeout:             15 seconds
total timeout:               60 seconds
redirect following:          yes
outcome-selected retry:      no
```

A successful body is source custody, not observed implementation. A failed request is source unavailability, not record absence or noncompliance.

## Cross-reference parser correction

The first reproducible parser was line-scoped and underinclusive:

```text
v1 workflow run:             30765689103
v1 artifact:                 8838855765
v1 occurrences:                      485
v1 unique reference IDs:             103
```

It split authority labels from identifiers at line boundaries, restricted federal-code parsing to Title 7, discarded WIC subsection identity, and omitted MPP, HSC, California-bill, and named-act classes.

The corrected parser is page-scoped while preserving page boundaries and original line locators. It does not join across pages.

```text
v2 workflow run:             30767610459
v2 artifact:                 8839456800
v2 artifact ZIP SHA-256:
ea30dc14f7faeabbba39f9921250c540ac2685352f647a9b6b7fb053888660f2

v2 occurrences:                      660
v2 unique reference IDs:             154
seed-alias reference IDs:             14
new candidate reference IDs:         140

valid v1 IDs preserved:              101
v1 IDs typed superseded:               2
v2 IDs added:                         53
```

The two v1 parser IDs not retained verbatim are explicit repairs rather than silent losses:

```text
7-CFR-273.24(b)
→ 7-CFR-273.24(b)(2)

CA-WIC-11403
→ CA-WIC-11403(b)
→ CA-WIC-11403(b)(4)
→ CA-WIC-11403(b)(5)
```

A reference occurrence is not a version edge, a source title is not supersession, and a parser addition is not controlling authority.

## Frozen authority-unit denominator

Every one of the 140 new reference IDs is mapped exactly once into a typed, source-addressable acquisition unit. The fourteen seed-source units remain separate.

```text
authority-unit workflow run:    30768012480
authority-unit artifact:        8839583867
artifact ZIP SHA-256:
a5327a87cd95b4695516425d0b849a31dec8c0e31a246796c7f6af1ef98628f5

product bytes:                         63,174
product SHA-256:
dc513bb82a8a7faab70ce82fb13cea68fe8107b8aa679220a7ff994b95fe6fe4

candidate references mapped:          140 / 140
candidate authority units:                  79
seed source units:                          14
preadjudication execution units:            93
silent or multiply mapped references:        0
```

Authority-unit classes:

```text
California ACL documents:                   28
California ACIN documents:                   3
California bills:                            2
California handbook:                         1
California MPP sections:                    16
California statute sections:                10
federal guidance documents:                  3
federal regulation root sections:            8
federal statute or act units:                 8
                                            --
total candidate authority units:            79
```

Grouping is structural rather than substantive:

```text
CFR and USC subsections
→ exact title and root section only

WIC and HSC subsections
→ exact code and root section only

MPP paragraphs
→ exact numbered manual section only

named document identifiers
→ one document unit

named act and exact act-section references
→ one act unit where identity is explicit
```

Source availability, expected result, ideological salience, and source count do not affect grouping. One possible HSC typographical alias remains identity-pending rather than silently merged.

## Current boundary

```text
seed source capture complete:          yes
corrected reference denominator:       frozen
candidate references mapped:           140 / 140
authority-unit denominator:            frozen
source acquisitions executed:          0 / 79
version edges adjudicated:              0
class closed:                           no
outside-human dependency:              false
reviewed-disposition effect:            0
graph/publication/adoption effect:      none / none / none
```

The next lawful transaction applies one fixed official-source protocol to all seventy-nine candidate authority units and the unresolved Public Law seed. Each unit must receive exact source custody or a typed restricted, unavailable, ambiguous, or not-publicly-recovered state before chronology adjudication begins.
