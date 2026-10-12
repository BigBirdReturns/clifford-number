# Allocator-war source schemas and lawful joins Wave 34

```text
source routes / tasks:                  7 / 38
source receipts / uses:                 19 / 153
schema adapters / profiles:             19 / 19
declared field mappings:                50
structural handles:                     39
sensitive exclusions:                   1
lawful join contracts:                  7
candidate key classes:                  35
missing institutional requirements:     31
requirement access classes:             {"authorized_lawful_access_only":3,"public_or_authorized_acquisition":25,"public_or_lawful_case_access":3}
authorized joins / joined rows:         0 / 0
complete denominators:                  0
evidence rows:                          0
estate adoptions:                       0
finding promotions:                     0
graph effects:                          0
publication clearances:                 0
```

| Adapter | Parse | Source | Profile | Mappings | Handles | Exclusions | Route uses | Task uses |
|---|---|---|---|---:|---:|---:|---:|---:|
| LAW34-A001 | LAW33-P001 | LAW31-S001 | opm-fwd-file-inventory-v1 | 3 | 2 | 0 | 2 | 14 |
| LAW34-A002 | LAW33-P002 | LAW31-S002 | opm-public-dataset-catalogue-v1 | 3 | 2 | 0 | 1 | 8 |
| LAW34-A003 | LAW33-P003 | LAW31-S003 | opm-fwd-getting-started-catalogue-v1 | 3 | 2 | 0 | 1 | 8 |
| LAW34-A004 | LAW33-P004 | LAW31-S004 | federal-register-document-index-v1 | 5 | 4 | 0 | 2 | 12 |
| LAW34-A005 | LAW33-P005 | LAW31-S005 | usaspending-aggregate-count-v1 | 5 | 2 | 0 | 3 | 13 |
| LAW34-A006 | LAW33-P006 | LAW31-S006 | usaspending-award-type-vocabulary-v1 | 4 | 2 | 0 | 1 | 4 |
| LAW34-A007 | LAW33-P007 | LAW31-S007 | sam-contract-award-access-boundary-v1 | 1 | 1 | 0 | 2 | 10 |
| LAW34-A008 | LAW33-P008 | LAW31-S008 | sam-contract-awards-public-guide-v1 | 2 | 2 | 0 | 1 | 4 |
| LAW34-A009 | LAW33-P009 | LAW31-S009 | sam-assistance-access-boundary-v1 | 1 | 1 | 0 | 3 | 13 |
| LAW34-A010 | LAW33-P010 | LAW31-S010 | grants-opportunity-envelope-v1 | 7 | 5 | 1 | 1 | 4 |
| LAW34-A011 | LAW33-P011 | LAW31-S011 | doj-initiative-publication-structure-v1 | 2 | 2 | 0 | 1 | 4 |
| LAW34-A012 | LAW33-P012 | LAW31-S012 | doj-resolution-publication-structure-v1 | 2 | 2 | 0 | 2 | 7 |
| LAW34-A013 | LAW33-P013 | LAW31-S013 | doj-publications-index-structure-v1 | 2 | 2 | 0 | 1 | 4 |
| LAW34-A014 | LAW33-P014 | LAW31-S014 | gao-bid-protest-http-access-state-v1 | 1 | 1 | 0 | 1 | 9 |
| LAW34-A015 | LAW33-P015 | LAW31-S015 | gao-bid-protest-faq-http-access-state-v1 | 1 | 1 | 0 | 1 | 9 |
| LAW34-A016 | LAW33-P016 | LAW31-S016 | pacer-case-locator-access-boundary-v1 | 1 | 1 | 0 | 1 | 9 |
| LAW34-A017 | LAW33-P017 | LAW31-S017 | mspb-case-report-index-structure-v1 | 3 | 3 | 0 | 1 | 9 |
| LAW34-A018 | LAW33-P018 | LAW31-S018 | fac-public-data-guide-structure-v1 | 3 | 3 | 0 | 2 | 9 |
| LAW34-A019 | LAW33-P019 | LAW31-S019 | fac-api-access-boundary-v1 | 1 | 1 | 0 | 1 | 3 |

| Join | Route class | Candidate keys | Missing requirements | Access classes | State |
|---|---|---:|---:|---|---|
| LAW34-J001 | internal-authority-and-inventory | 5 | 4 | {"public_or_authorized_acquisition":4} | blocked_missing_institutional_requirements |
| LAW34-J002 | public-award-and-contract-denominators | 5 | 4 | {"public_or_authorized_acquisition":4} | blocked_missing_institutional_requirements |
| LAW34-J003 | published-enforcement-and-action-registers | 5 | 5 | {"public_or_authorized_acquisition":5} | blocked_missing_institutional_requirements |
| LAW34-J004 | correction-dockets-and-outcomes | 5 | 5 | {"public_or_authorized_acquisition":2,"public_or_lawful_case_access":3} | blocked_missing_institutional_requirements |
| LAW34-J005 | protected-personnel-records | 5 | 3 | {"authorized_lawful_access_only":3} | blocked_missing_institutional_requirements |
| LAW34-J006 | affected-comparator-and-distributional-joins | 5 | 5 | {"public_or_authorized_acquisition":5} | blocked_missing_institutional_requirements |
| LAW34-J007 | financial-recovery-and-continuity | 5 | 5 | {"public_or_authorized_acquisition":5} | blocked_missing_institutional_requirements |

Wave 34 maps only source shapes already frozen by Wave 33. It performs no network request, excludes the observed Grants.gov token before projection, and preserves HTTP errors and credentialed systems as access outcomes.

A source field or candidate identifier may support later reconciliation. It does not authorize a join, complete an institutional denominator, prove identity or relationship, adjudicate evidence, promote a finding, alter the graph, or clear publication.
