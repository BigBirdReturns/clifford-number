# SSC RD-04 A06 — CalFresh Decision Registry denominator

Issue: #722  
Parent: A05 merged as `80f6f10e0a0a631dd89d7b92df24fd1ffd2d1589`  
Execution: `SSC-RD04-SNAP-A06`

## Fixed acquisition

A06 submits one exact public CDSS Decision Registry request for CalFresh with the registry fields `releasedAfter=06/01/2026` and `releasedBefore=06/30/2026`. No disposition, responsible-agency, issue-code, SHN, language, or organizational-AR filter is supplied.

The complete ordered JSON array returned by that exact request is the registry denominator. The interface labels “After” and “Before” remain registry-defined semantics; A06 does not silently claim that they are inclusive or that the returned set is every CalFresh decision.

## Content sample

The complete metadata result is frozen before any decision PDF is read. If more than twenty-four rows are returned, A06 computes SHA-256 over each canonical metadata row and downloads the twenty-four lowest hashes, with row identity as the deterministic secondary order. No selected decision may be replaced after its disposition, agency, issue codes, or PDF content are inspected.

## Decision and implementation separation

A registry disposition is a metadata observation. A source-addressable decision may contain an administrative order or direction for relief. Neither state establishes county compliance, benefit issuance, restoration amount, restoration date, timeliness, or downstream material recovery.

A06 records implementation only when a separate public receipt supplies it. Otherwise relief-disposition decisions remain `order_only_no_compliance_receipt`; non-relief dispositions remain `no_relief_order_observed`; unavailable and unparseable sources retain their own terminal states.

## Products

The lane retains the exact registry request, raw response, headers, complete ordered metadata denominator, hash-ranked selection, exact selected response bytes, extracted text where available, distributions, decision/order ledger, separate compliance ledger, missing-source ledger, closed schema, deterministic builder, fail-closed validator, adversarial fixtures, exact-byte manifest, noindex report, and read-only workflow.

## Authority ceiling

```text
registry return ≠ complete program denominator
submitted date fields ≠ proven inclusive month
registry disposition ≠ factual or legal correctness
Grant / Partial Grant / Stipulation ≠ implemented relief
order to restore ≠ restoration completed
sample distribution ≠ prevalence
agency count ≠ agency quality
public decision ≠ precedent

residual class closures:       0
reviewed disposition changes:  0
prevalence findings:           0
racial-order findings:         0
coordination findings:         0
common-purpose findings:       0
graph effects:                 0
publication effects:           0
adoption effects:              0
external contacts:             0
external reviews:              0
```

A06 is internal, reversible, and nonblocking. No outside person or agency response is required.
