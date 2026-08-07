# School.House USAspending recipient census

The fixed Treasury USAspending census executed three recipient-autocomplete requests and three recipient-index requests for `School.House`, `Schoolhouse`, and `School House`. All six routes returned terminal public JSON in six total request attempts, and every recipient-index response reported `hasNext=false`.

```text
product parent: 8a2f4538bdbcf9455f02e70c35a71cb39f805b18
source workflow run / artifact: 31196898247 / 9001168026
source artifact SHA-256: b56408461a681a3f2b2388b33f08960abc9f81e6dade1b2b6efc64a9530eea2d
qualification workflow run / artifact: 31198311051 / 9001773839
qualification artifact SHA-256: c80b2283050cad46e72ad82266ec7852ed76723d9ed17e2faac3b7f5960f25cf
fixed / terminal routes: 6 / 6
autocomplete rows / exact matches: 200 / 0
recipient-index rows / exact matches: 684 / 1
exact matches with / without public UEI: 0 / 1
UEI-backed recipient candidates: 0
identity / relationship admissions: 0 / 0
federal-award / funding admissions: 0 / 0
negative-existence claims: 0
outside-human dependency: false
publication / adoption / graph: none / none / none
public School.House legal identity: unresolved
```

The sole strict normalized-name match lacks a public UEI and is therefore not a `federal_spending_recipient_name_candidate`. A recipient-name match is not a School.House identity, federal-award, funding, ownership, governance, or control finding. Zero qualifying candidates is a bounded result for this fixed public recipient-index protocol, not evidence that no relevant entity or federal award exists. No candidate adjudication or identical USAspending replay is authorized absent a material endpoint, index-version, denominator, or canonical-predecessor change.
