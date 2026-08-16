# Electric Twin September 2025 register-of-members acquisition

**Acquisition ID:** `ET-ROM-2025-09-01`  
**Issue:** `#2138`  
**State:** prepared, not sent  
**Canonical graph effect:** none

This packet prepares a narrow statutory and first-party acquisition concerning Electric Twin Ltd, company number `15173006`. Its target is the historical register state surrounding the Seed 2 financing between 12 and 30 September 2025. It does not attribute any SH01 allotment to Atomico, LocalGlobe, Mercuri, or another holder.

The public evidence presently separates three objects. The SH01 filings establish issuer-level allotment dates, classes, and quantities. The CS01 establishes registered names, classes, and exact holdings as at 27 September 2025. The written resolutions establish allotment authority, pre-emption disapplication, and the eligible-member cohort on 12 September 2025. Matching quantities across those instruments are an acquisition lead, not a transactional join.

The packet contains:

- `request.json`, which defines the acquisition target, legal route, authority state, response states, and non-inference boundaries.
- `custody-manifest.json`, which binds the request to the canonical source receipts and specifies the dispatch and response artifacts that must be hashed.
- `response-ledger.jsonl`, which begins with the prepared-but-unsent state and must receive one append-only row for every later custody event.
- `adjudication-rules.json`, which defines the minimum transaction-specific evidence required before any allottee field can change.
- `requester-input.example.json`, which defines the private local input shape without containing requester particulars or authorization.
- `dispatch-input.example.json`, which defines the private postal-dispatch evidence input shape without authorizing or performing dispatch.
- `delivery-input.example.json`, which defines the private delivery-evidence and working-day-calendar input shape without establishing receipt or a legal deadline.
- `response-input.example.json`, which defines the private response-evidence and unverified-disposition input shape without adjudicating authenticity, timeliness, compliance, or transaction meaning.
- `docs/requests/electric-twin-section-116-register-of-members-request.md`, which contains separate statutory and voluntary request templates.
- `tools/finalize-electric-twin-register-request.mjs`, which validates private local inputs and produces separately hashed source documents without sending them.
- `tools/render-electric-twin-register-request-pdfs.mjs`, which verifies a finalized source directory and creates deterministic private PDFs plus a non-identifying custody manifest without sending them.
- `tools/record-electric-twin-register-request-dispatch.mjs`, which verifies an authorized outbound PDF and copies exact evidence of an externally performed postal dispatch without contacting the company.
- `tools/record-electric-twin-register-request-delivery.mjs`, which verifies the dispatch chain, preserves exact delivery evidence, and calculates a bounded operational response checkpoint without adjudicating statutory receipt or a legal deadline.
- `tools/record-electric-twin-register-request-response.mjs`, which verifies the complete source-to-delivery chain, preserves exact response bytes, and records only unverified response dispositions for later review.

The statutory request must not be sent until the requester’s real full name, postal address, email address, date, and intended disclosure recipients have been inserted. A public contact route does not confer authority to send. Any dispatch requires a custody-bearing postal method to the registered office and may be copied by email only for routing. The voluntary request for a redacted allotment or closing instrument remains separate from the statutory register request.

## Local source finalization gate

Requester particulars must remain outside version control. Copy `requester-input.example.json` to `data/local/electric-twin-register-of-members-requester.json`, replace every placeholder, record an opaque local finalization-authorization ID, and leave each channel’s dispatch authorization false unless that channel has separately been authorized. The finalizer rejects private inputs outside the ignored `data/local/` root, rejects group- or world-readable input files, rejects unresolved placeholders, and rejects output paths outside the ignored `build/source-acquisition/electric-twin-register-of-members/` root.

Run the tracked-packet validation without private data:

```sh
node tools/finalize-electric-twin-register-request.mjs --validate-tracked
```

After the private input has been completed and finalization has been separately authorized, produce immutable source files and their manifest locally:

```sh
chmod 600 data/local/electric-twin-register-of-members-requester.json
node tools/finalize-electric-twin-register-request.mjs \
  --input data/local/electric-twin-register-of-members-requester.json
```

The source finalizer creates separate statutory and voluntary UTF-8 files, records their exact byte lengths and SHA-256 digests, and writes a manifest that contains no requester particulars. It refuses to overwrite an existing finalization directory. The finalizer itself has no network, email, postal, PDF, or messaging capability, does not calculate a response deadline, and does not convert source finalization or dispatch authorization into proof of dispatch.

## Local deterministic PDF custody gate

After source finalization, pass the exact immutable output directory to the PDF renderer:

```sh
node tools/render-electric-twin-register-request-pdfs.mjs \
  --source-dir build/source-acquisition/electric-twin-register-of-members/<immutable-run-id>
```

The renderer rehashes both source files against `outbound-source-manifest.json`, rejects placeholders, altered bytes, symlink paths, non-private files, the acquisition root itself, and every existing PDF or rendering-manifest path. It creates separate A4 PDFs using a deterministic built-in Courier text renderer, embeds no wall-clock creation timestamp, uses no browser runtime or external font, and records the exact PDF byte lengths, page counts, source hashes, and SHA-256 digests in `outbound-pdf-manifest.json`.

The PDFs contain the requester particulars because they are the actual private outbound documents. The PDF manifest does not repeat those particulars. All files remain under the ignored private acquisition directory with group and world access removed. PDF rendering does not make either request dispatch-ready, send a message, perform postal service, create proof of receipt, or calculate a response deadline.

## Local postal-dispatch custody gate

This gate is used only after a person has performed a separately authorized postal dispatch outside the repository tools. Copy `dispatch-input.example.json` to a permission-restricted file under `data/local/`, replace every placeholder, identify the exact channel, and supply the authorization record already bound into `outbound-source-manifest.json`. Place the original postal receipt, carrier export, label, or other dispatch evidence under `data/local/` without converting or editing it.

```sh
chmod 600 data/local/electric-twin-register-of-members-dispatch.json
chmod 600 data/local/electric-twin-register-of-members/postal-proof.pdf
node tools/record-electric-twin-register-request-dispatch.mjs \
  --source-dir build/source-acquisition/electric-twin-register-of-members/<immutable-run-id> \
  --input data/local/electric-twin-register-of-members-dispatch.json
```

The recorder rehashes both source documents, both PDF manifests, and the selected outbound PDF before accepting evidence. It requires the matching statutory or voluntary dispatch authorization to be true, requires the private input’s authorization record to match the source manifest, rejects symlinked or non-private proof files, verifies supported file signatures, and copies the exact proof bytes into a new immutable `dispatch/` child directory. The resulting `outbound-dispatch-manifest.json` records the source and PDF custody chain, the outbound document hash, proof hashes, declared dispatch timestamp, service metadata, and a hash of the tracking reference without repeating the raw tracking reference or requester name, address, or email.

The recorder has no network, email, postal, or messaging capability and cannot perform or authenticate a dispatch. Its state is `postal_dispatch_evidence_recorded_delivery_unconfirmed`. It records an external dispatch assertion and preserved proof, while keeping carrier authenticity unverified, delivery unconfirmed, the receipt timestamp null, and the response deadline uncalculated.

## Local delivery and operational response-checkpoint gate

This gate is used only after a carrier or other source has produced delivery evidence for a previously recorded dispatch. Copy `delivery-input.example.json` to a permission-restricted file under `data/local/`, replace every placeholder, preserve the original delivery confirmation without conversion, and supply the same raw tracking reference used for the dispatch record.

```sh
chmod 600 data/local/electric-twin-register-of-members-delivery.json
chmod 600 data/local/electric-twin-register-of-members/delivery-confirmation.pdf
node tools/record-electric-twin-register-request-delivery.mjs \
  --dispatch-dir build/source-acquisition/electric-twin-register-of-members/<immutable-run-id>/dispatch/<dispatch-event> \
  --input data/local/electric-twin-register-of-members-delivery.json
```

The delivery recorder rehashes the source manifest, both request sources, the PDF manifest, both request PDFs, the dispatch manifest, and every dispatch-proof file. It requires the channel, service provider, and tracking-reference digest to match the dispatch custody record, rejects a delivery timestamp earlier than dispatch, and copies the exact delivery-evidence bytes into a new immutable `delivery/` child directory. The resulting `outbound-delivery-manifest.json` records the custody chain and a custodian-supplied England and Wales working-day calendar without repeating requester particulars or the raw tracking reference.

The tool counts five eligible dates after the supplied local receipt date, treating the first eligible date after receipt as day one, excluding Saturdays, Sundays, and the explicitly supplied non-working dates. Its state is `postal_delivery_evidence_recorded_operational_checkpoint_calculated`. The resulting date is an operational review checkpoint only. The tool does not authenticate the carrier, verify the local-date conversion, adjudicate statutory receipt, establish an exact expiry time, or calculate a legal deadline. Calendar completeness and legal effect require separate review.

## Local response-evidence custody gate

This gate is used only after documentary response evidence has been received for a previously recorded delivery event. Copy `response-input.example.json` to a permission-restricted file under `data/local/`, replace every placeholder, preserve the original email source, letter, court document, register extract, transaction instrument, or other response artifact without conversion, and identify the response route, asserted sender role, primary disposition, any additional dispositions, and the document categories claimed by the custodian.

```sh
chmod 600 data/local/electric-twin-register-of-members-response.json
chmod 600 data/local/electric-twin-register-of-members/response.eml
node tools/record-electric-twin-register-request-response.mjs \
  --delivery-dir build/source-acquisition/electric-twin-register-of-members/<immutable-run-id>/dispatch/<dispatch-event>/delivery/<delivery-event> \
  --input data/local/electric-twin-register-of-members-response.json
```

The response recorder rehashes the source manifest, both request sources, the PDF manifest, both request PDFs, the dispatch manifest and proof files, the delivery manifest, and every delivery-evidence file. It requires the response channel to match the delivery chain and rejects a response timestamp or local date earlier than the recorded delivery. The original response artifacts are copied without conversion into a new immutable `response/` child directory. The resulting `inbound-response-manifest.json` records exact response hashes, an asserted-sender digest, the custodian-supplied dispositions and document categories, and a chronology relation to the operational checkpoint without repeating the asserted sender or requester particulars.

The response state is `response_evidence_recorded_unadjudicated`. A disposition such as electronic-copy offered, fee requested, inspection offered, court application asserted, or voluntary transaction record supplied remains a custodian classification rather than a verified legal or evidentiary conclusion. A claimed transaction-document category remains a review lead. The tool does not authenticate the sender, verify document semantics, adjudicate statutory compliance, calculate a legal deadline, decide whether a response was timely, infer no response, decide the merits of a court application, or promote allottee identity, beneficial ownership, rights exercise, or an actor hop. A later reviewed adjudication must inspect the original response bytes and preserve every ambiguity.

## Private response-adjudication checkpoint

After a response has been preserved, copy `response-adjudication-input.example.json` to a permission-restricted file under `data/local/` and inspect every original response artifact. Each finding must identify the copied response artifact by exact path and SHA-256 digest, provide a source-addressable page, line range, byte range, message part, document section, or table row, and classify the proposition under the active fail-closed rules.

```sh
chmod 600 data/local/electric-twin-register-of-members-response-adjudication.json
node tools/adjudicate-electric-twin-register-request-response.mjs \
  --response-dir build/source-acquisition/electric-twin-register-of-members/<immutable-run-id>/dispatch/<dispatch-event>/delivery/<delivery-event>/response/<response-event> \
  --input data/local/electric-twin-register-of-members-response-adjudication.json
```

The adjudication checkpoint re-verifies the complete source, PDF, dispatch, delivery, and response chain, requires every response artifact to be source-addressed by at least one reviewed finding, binds the review to `adjudication-rules.json`, and writes `inbound-response-adjudication.json` under a new immutable private `adjudication/` child. Its state is `response_adjudication_recorded_canonical_promotion_blocked`.

A `procedural_disposition` finding must also carry a structured `procedural_disposition_kind`. The `company_application_to_court` outcome accepts only the matching court-application kind. The refusal outcome accepts only `refusal`, `confidentiality_asserted`, or `improper_purpose_asserted`, so free-text assertions cannot cross-label those immutable outcomes.

The supplied `reviewed_at` value must be a calendar-valid UTC timestamp with valid month, day, hour, minute, and second components. The recorder rejects JavaScript-normalizable literals such as a nonexistent February date or `24:00:00`, so the timestamp preserved in the immutable manifest is the same temporal value used by the chronology gate.

The tool records a human review assertion. It does not verify the semantic correctness of a source address or finding, authenticate the sender, adjudicate legal timeliness or statutory compliance, decide court merits, or mutate canonical claims. Even an outcome classified as `transaction_specific_allottee_identified` remains a candidate requiring independent review, checksum-bound source custody, a targeted validator, the complete release gate, and a separate canonical pull request. Second-party review remains required and incomplete, and the canonical effect remains none.

A response that supplies only a registered name, date entered as a member, class, or resulting quantity may strengthen the dated holder history. It does not prove that the holding arose from a specific allotment rather than a transfer, nominee arrangement, aggregation, rectification, or another register movement. Allottee identity may be promoted only when one source-addressable instrument expressly links the issuer, named person or vehicle, share class, quantity, and allotment event, or supplies an equivalent transaction-specific entry.

Evidence tier: official, first-party, and repository-native. The venues are Companies House, Electric Twin’s statutory register, and any voluntarily supplied transaction instrument. The immediate target is a source-addressable historical member entry followed, where available, by a transaction-specific allotment record. The upside is a lawful separation of issuer action, registered title, and original subscription. The downside is that the register may record only resulting legal title. The principal failure mode is converting numerical or temporal correspondence into allotment identity without an explicit mechanism.

The governing control question is whether an obtained entry or instrument names a holder as allottee for a specific September 2025 issue, or whether the repository must retain the exact confirmation-date holder state while leaving the allottee endpoint unresolved.
