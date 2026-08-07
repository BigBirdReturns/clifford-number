# School.House exact-domain RDAP custody

The `.house` RDAP authority was resolved through the IANA DNS bootstrap object, then the registry service returned an HTTP 200 RDAP domain object for exactly `school.house`. The source run retained no raw response or contact material. A request-free qualifier authenticated the source artifact and corrected one privacy-minimized projection field: the conformance vector contains `redacted`, so `redaction_present` is `true`.

```text
fixed / terminal routes:                     2 / 2
request attempts / response bytes:       2 / 78,739
exact domain object:                         true
registrant entities:                            0
registrar entities:                             1
public registrant org values:                   0
registrant-organization candidates:             0
source projection defects / corrections:      1 / 1
identities / relationships admitted:          0 / 0
owner/operator admissions:                       0
negative-existence claims:                       0
outside-human dependency:                    false
publication / adoption / graph: none / none / none
public School.House legal identity:      unresolved
```

The registry object identifies `NameCheap, Inc.` only in the registrar role and lists `ns1.siteground.net` and `ns2.siteground.net` as nameservers. Those values are not registrant, owner, operator, governance, control, or legal-entity evidence. No public `registrant` entity or public registrant-organization value was present in the privacy-minimized response, but redaction or absence is not evidence that no registrant or legal entity exists.

No candidate successor and no identical source replay are authorized absent a material IANA bootstrap, provider condition, domain-object version, or canonical-predecessor change.
