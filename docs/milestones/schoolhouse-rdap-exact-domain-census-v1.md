# School.House exact-domain RDAP census

The `.house` service was selected through the IANA DNS RDAP bootstrap, then the exact `school.house` domain object was retrieved from that selected HTTPS authority. Both fixed routes parsed successfully in two total requests.

```text
fixed / terminal routes: 2 / 2
total requests: 2
exact LDH / Unicode domain match: true / true
registrar-role name values: 1 (NameCheap, Inc.)
registrant-organization values: 0
candidate rows: 0
redaction present: true
identities / relationships / owner-operator admissions: 0 / 0 / 0
negative-existence claims: 0
outside-human dependency: false
publication / adoption / graph: none / none / none
public School.House legal identity: unresolved
```

`NameCheap, Inc.` is retained only as a registrar-role value. It is not a registrant, owner, operator, or legal-identity finding. The redacted or absent registrant-organization value is not evidence that no registrant or legal entity exists. No candidate adjudication or identical RDAP replay is authorized absent a material bootstrap, provider, object-version, denominator, or canonical-predecessor change.
