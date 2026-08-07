# School.House historical Form 990 website-field screen

## Terminal result

The sealed historical Form 990 XML website-field screen reached terminal custody over every one of the **180** exact historical member locators. It found **161** filings with an official website field and **0** rows satisfying the required EIN + legal-name + exact `school.house` conjunction.

```text
canonical parent:                    a464dbbd96c365a7c040e17847486c5b3ba05c27
canonical parent tree:               e4a8b0072fcdd8ca575f6c0d279f035277110163
acquisition PR / head:               #1318 / 51bfc901846627c2ac8a31e401bd704f8958c3be
workflow run / artifact:             31137021052 / 8978343039
artifact SHA-256:                    3a9a39b3a7ee14a2c9ac58578c7e542338a02a5dcf415cc411c29d31f1dc6fd3
historical exact locator rows:       180
unique candidate EINs:               72
historical archive routes:           45
screened official XML rows:          180
website-field-present rows:          161
candidate legal-name alignments:     149
exact school.house host rows:         0
identifier-grade candidate rows:      0
range requests / response bytes:     543 / 1,000,547
```

## Identifier rule

A filing could become only an identifier-grade **candidate** when its filer EIN matched the candidate EIN, its filing-header legal name aligned with the sealed filing-index name, and an official website field normalized exactly to `school.house` (with `www.school.house` canonicalized to the same host). Near matches, subdomains, suffix domains, generic text, email addresses, credentials, non-HTTP schemes, path text, schedule presence, and person-name overlap were refused.

## Privacy boundary

No observed organization-name value, observed website value, officer or person name, street address, contact detail, preparer value, private support, raw XML, archive, central directory, or matched free text is retained. Only sealed identifiers, request and integrity custody, website-field schema element names, and boolean conjunction results survive.

## Authority boundary

```text
identities admitted:                  0
relationships admitted:               0
negative-existence claims:             0
outside-human dependency:              false
publication / adoption / graph:        none / none / none
public School.House legal identity:    unresolved
```

Zero exact-host conjunctions is a bounded result for this fixed 180-object historical corpus. It is not evidence that the public School.House lacks a legal entity, fiscal sponsor, differently named organization, unlocated filing, or other public identifier. The issue's stopping rule is satisfied, and no identical source retry is authorized absent a material provider or denominator change.
