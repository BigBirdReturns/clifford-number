# School.House SEC EDGAR exact-domain census

This custody product preserves one fixed SEC EDGAR Full-Text Search attempt for
the exact phrase `"school.house"` across the service's complete date range.

The official endpoint returned HTTP 403 on both authorized attempts. That
provider state is terminal for this fixed transaction and is **not evidence**
that EDGAR contains no filing, issuer, owner, operator, or legal entity related
to School.House.

```text
fixed queries / pages:                    1 / 1
authorized attempts:                          2
terminal HTTP status:                       403
terminal state:      bounded_source_unavailable
response bytes:                           4,819
retained filing-reference candidates:        0
filing documents fetched:                    0
```

The source and request-free independent qualification artifacts are retained
as strict base64 encodings of their exact ZIP bytes. Their ZIP digests,
internal checksums, request receipt, privacy assertions, and authority ceiling
are verified by the permanent validator.

```text
SEC display-name values retained:             0
person/address/contact/signature values:      0
filing body text or snippets retained:        0
raw search responses retained:                0

identities admitted:                          0
relationships admitted:                       0
negative-existence claims:                    0
issuer / owner / operator admissions:     0 / 0 / 0
outside-human dependency:                 false
publication / adoption / graph: none / none / none

public School.House legal identity:   unresolved
```

No identical EDGAR replay is authorized unless the SEC provider/index
condition, fixed query denominator, or canonical predecessor materially
changes.
