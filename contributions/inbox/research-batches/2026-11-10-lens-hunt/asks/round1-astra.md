1. **Cut the Queue to unresolved operative claims:**

   `eligible = open scout finding AND status not official_* AND at least one operative participation row`

   Order eligible surfaces by finding priority, then newest recorded date; retain ties. Show only their qualifying participation rows, with context in the inspector. Print the resulting count; it cannot be calculated from these aggregates. This targets possible decisions awaiting corroboration. “No path” and recurring surface types alone should not create research priority.

2. **Provisional research order, not measured yields:**

   | Rank / refusal family | Official source that can close the claim | Common failure |
   |---|---|---|
   | 1. Single-person advisory roles | Appointment notice, board minutes, statutory register | Treating honorary advice as delegated authority |
   | 2. Press/self-report lacking official upgrade | Underlying appointment instrument, award notice or regulatory filing | Finding an official page that repeats publicity without substantiating the act |
   | 3. Self-reported roles: senior government subset | Departmental appointment notices, civil-service directories, official gazettes | Confirming employment while assuming remit, dates or decision authority |
   | 4. Reported exits | Completion filing, merger decision, exchange announcement | Confusing announced transactions with completed exits, or company exits with individual proceeds |
   | 5. Fund-control observations | Regulatory ownership/control filings and corporate registers | Confusing adviser, director, beneficial owner and controller |

   These priorities concern evidentiary movement toward documented acts, not more hops. Organisation-only procurement may already document decisions; adding names is attribution work. Full programmes and rosters generally add presence. SEC Form D notices document notices, not necessarily completed financing.

3. **Use two axes, not three exclusive buckets.** “Decision” means a row documenting a bounded operative act, supported by an instrument establishing that act; `official_*` alone is insufficient. “Dicta” means an assertion or presence observation that does not establish such an act, regardless of publisher. “Hunt” means an unresolved claim with a specified missing fact and plausible source; it can concern either category.

   Existing fields provide proxies, not a reliable classifier. Add a structured `research_target` containing the missing fact and closure criterion. Do not chase ordinary panel appearances, portfolio listings, directory entries or self-described jobs **solely to promote them into decisions**. Chase a concrete disputed fact or consequential claim. Absence of a Clifford path is not an evidence defect.

4. **Show these five things:**

   - Presence versus operative role: existing role field.
   - Source standing versus evidentiary status: retain surface status; add row-level `verification_state`.
   - Unknown endings: existing missing end date. Rename “In force” to “Not recorded as ended”; absence of an end date proves no continuing tenure.
   - Actionable gaps: the proposed `research_target`, rather than generic scout findings.
   - Coverage denominators: existing person, employer and search-cohort records—explicitly show that 49 junior/enlisted-only people were excluded from this search.

5. **Separate event importance from evidence standing.** Preserve the published class weights, but apply them only to supported acts correctly assigned to those classes. A roster establishes presence; a job claim establishes a reported role, not capital movement. Proposed decision heat:

   `heat = Σ verified operative rows [weight(actual act class) × 0.8^years]`

   Presence and unresolved claims remain inspectable rows with zero decision heat. Much listing/self-report brightness would disappear; the exact redistribution requires row-level review. I would retain receipts, historical assertions, the decay rule and bounded-surface hop constraints. This is an owner-approved change of metric, requiring a new label and version—not a silent correction.

6. **The registry needs claim-level custody:** exact assertion, subject identifier, dated receipt/excerpt, source provenance, reviewer, review date, verification rationale, dispute/correction history and supersession links. “Recalled-unverified” requires recording whose recollection it is. Distinguish observation date from event date.

   Public LinkedIn availability does not establish public-interest necessity for exposing junior personnel. Minimise publication and retention. Same-name merges require corroborating identifiers. Shared surfaces establish participation, not agreement, influence or misconduct; path displays must state this locally. Verification applies to claims, never an entire person.

7. The thesis is a hypothesis, not an intake rule. Track comparable career transitions outside Clifford-connected surfaces or acknowledge selection bias. Also resolve the specification conflict: a galaxy containing aggregate people and surfaces cannot literally make every mark one ledger row. Refusal-family colours already introduce a second visual channel beyond heat.