# AXM identity reconciliation

This implementation is derived from Clifford Number commit `5f6484bf7b36c4345fe22105bc690efa0a23f8f4` and qualified against the unmodified AXM Genesis reference at `74db57b32ca5c02c7d340aa6caa25df993818667`. The reference module is `src/axm_verify/identity.py`. Reconciliation concerns serialization and identifier derivation; it does not authorize cross-case entity joins or new graph edges.

## Reference custody

The fixture at `test/fixtures/axm-identity-reconciliation.json` preserves the exact bytes of Genesis `tests/vectors/identity-reconciliation-clifford.json`, Git blob `64f1b2182474d34bd600512d3d6ef2012c080cc2`. Its SHA-256 is `b35fe3625e3dd48859f8a13d19daf8e03522ffd6dfb3d135e614ce441a79518a`. It contains fourteen entity cases and two claim cases.

The older Clifford donor committed an LF-normalized copy while Genesis committed CRLF. The working copies looked identical, but their Git blobs were different. This candidate preserves the reference fixture without text normalization through its path-specific `.gitattributes` entry, and the identity test checks its byte hash before checking its outputs. Genesis is unchanged.

## Identifier contract

Entity and claim identifiers encode the full SHA-256 digest as lowercase, unpadded base32 following `e1_` and `c1_`. The preimage follows the reference canonicalization and NUL-separated field ordering. Entity identity includes the case namespace. Time, roles, evidence classes, and source receipts remain attached to participation windows rather than entering claim identity.

The separate generated identity projection carries the reconciliation state. The release validator recomputes it from the canonical registries and participation records. Matching serialization does not resolve name ambiguity or establish that records in different namespaces identify the same real-world entity.

## Historical query compatibility

The first port lost existing `e_` query handles: a previously successful Starmer-to-Clifford query returned an empty route when given its historical identifier. `legacy_axm_ids` now preserves those tokens only as case-local lookup aliases. Query and narration resolution require a unique local match. Ambiguous legacy tokens remain unresolved; they never choose the first row or become reconciled identity keys.

The focused tests retain the reference vectors and add historical canonical-token, alias-token, and Unicode-collision regressions. Run `node test/axm-id.test.js` and `node test/axm-identity.test.js`, then run the complete `npm run release:check`. A focused pass alone does not constitute release qualification.

## Evidence-lake registry merge

The evidence-lake identity programme (archived under `archive/evidence-lake-identity/`, waves 01 to 20) grew the canonical registries and adjudicated case-local identifiers on branches that were never merged. This section records what now sits on the canonical registries, what main kept instead of the archive, and what remains open. The merge is registry growth only. It adds no participation row, surface, relation, hop edge or cross-case join, and no identity decision below is a cross-case bridge.

The merge is reproducible. `npm run merge:lake-identity` plans and writes it from the archive (`npm run merge:lake-identity -- --plan` prints the plan and writes nothing; a second run changes nothing), `npm run validate:lake-identity` checks the result inside `npm run check`, and `test/lake-identity-merge.test.js` pins the hop edge set. The machine-readable record is `data/canonical/lake-identity-merge.json`.

### Counts

| Registry | Main before | Archive | Added | Main after |
|---|---:|---:|---:|---:|
| Actors | 170 | 161 | 7 | 177 |
| Organizations | 32 | 65 | 16 | 48 |
| Aliases | 65 | 30 | 7 | 72 |

Of the archive's 19 actors, 40 organizations and 8 aliases that main did not carry, 7 actors, 16 organizations and 7 aliases were added. The other 12 actors, 24 organizations and 1 alias are main-wins refusals, listed below. Every added row keeps its archived `source`, case, acquisition and routing identifiers, `receipt_ids`, `canonical_status` and `graph_effect` exactly as archived; the validator fails if any of them changes.

Added actors: `anita-baldwin`, `frederic-hsieh`, `gregory-kausner`, `lucky-baldwin`, `michael-obadal`, `ben-zhang`, `erik-wahl`. Added organizations: `anduril-pac`, `arcadia-successor-agency`, `arcadia-town-center-llc`, `chandler-syndicate`, `la-turf-club`, `pi-properties-111`, `positive-investments`, `sanyao-pds`, `stronach-group`, `anti-defamation-league`, `arcadia-improvement-association`, `city-of-arcadia`, `data-blanket`, `opendefense`, `regent-defense`, `trammell-crow-residential`. Added aliases: ADL, DAIA, Downtown Arcadia Improvement Association, Arcadia CA, Data Blanket Inc., Regent Defense and TCR, each to the organization above.

Compiled effect: `build/axm-identity.json` grows from 256 to 279 entities with the same 286 `participates_in` claims. `build/hop-graph.json` keeps 93 edges, the same sorted edge ids and the same bases, 35 rejected hop surfaces and no rejected pairs; only its `shortest_paths` index gains one empty route for each added actor (170 to 177 keys). `graph.json` and `cases/uk-ai-policy.json` gain 23 overlay nodes and keep all 392 edges. No added row appears in any hop edge.

### Where main wins

Main wins wherever an archive row meets a main row for the same entity. No existing main row was changed; the merge only appends.

**Same AXM entity.** The archive's organization `anduril` ("Anduril Industries") derives the same AXM entity id as main's `anduril-industries`, because the id depends only on the case namespace and the label. Both cannot enter one namespace, so `anduril` was not added. Main's alias "Anduril" points at `anduril-industries`; the archive's alias "Anduril" pointed at `anduril` and was not added. Main's `anduril-industries` keeps its `source_name_scope` note: it does not resolve every record to the U.S. parent or the UK subsidiary.

**Legacy-bridge entities (35 rows held back).** Twelve archive actors and 23 archive organizations are, on main, legacy research-graph nodes that the compiler bridges into the surface app with their own description and tags, and `test/compiler.test.js` asserts that bridge for Alex Karp. Main promotes such an id to the canonical registry together with its participation and an editorial profile. An archived provisional record has neither, so adding it would replace the bridge entry with an empty canonical page. These rows stay in the archive and in the manifest with their archived provenance. `node tools/merge-lake-identity.mjs --include-legacy-bridged` adds them once a promotion supplies the profile and participation and the bridge test is updated for it.

- Actors: `alex-karp`, `charles-koch`, `demis-hassabis`, `jacob-dewitte`, `jeremy-obrien`, `jonathan-greenblatt`, `mark-zuckerberg`, `max-jaderberg`, `robert-mercer`, `ryan-stowers`, `sam-altman`, `yasmin-green`.
- Organizations: `ai-opportunities-unit`, `anthropic`, `charles-koch-foundation`, `digital-centre-of-government`, `federalist-society`, `founders-fund`, `google-deepmind`, `groq`, `hm-treasury`, `mercatus-center`, `meta-ai`, `microsoft-ai`, `new-america`, `oklo`, `psiquantum`, `sanabil`, `saudi-pif`, `spacex`, `wayve`, `liveramp`, `safegraph`, `code-first-girls`, `detachment-201`.

`detachment-201` has a second reason to wait: main already carries the unit inside `us-army` ("US Army (Detachment 201, Executive Innovation Corps)") and its commissioning surfaces, and how a separate unit entity relates to that organization has not been decided.

**Same id on both sides, rows differ (14 actors, 1 organization, 1 alias).** Main's row is kept in every case.

| Rows | Difference | Kept |
|---|---|---|
| `matt-clifford`, `marc-warner`, `saul-klein`, `keir-starmer`, `john-healey`, `george-robertson`, `richard-barrons`, `fiona-hill` | The archive row is the bare id, label and kind; main carries the bounded `plain` profile | Main |
| `ben-warner` | Both carry a `plain` profile and the text differs; main's is bounded to the dated No. 10 role observations. The archive text is not copied | Main |
| `alice-bentinck`, `bob-mcgrew`, `kevin-weil`, `shyam-sankar` | Main carries `plain`; the archive row carries wave-11 provenance (source, case, acquisition and routing ids, receipts, `canonical_status`, `graph_effect`) | Main; the archive provenance is kept verbatim in the manifest |
| `andrew-bosworth` | Label `Andrew “Boz” Bosworth` on main, `Andrew Bosworth` in the archive; main also has both spellings as aliases. Same provenance note as above | Main |
| `faculty`, alias "ASI Data Science" | Main carries `identity_status` and `receipt_ids` | Main |

**Possible duplicate, not merged.** The added actor `gregory-kausner` (archive receipt `anduril-kausner-2022`, case `anduril-access-ownership`) and main's `greg-kausner` share a surname and a first-name stem. Main's profile of `greg-kausner` keeps him distinct from "unresolved or misspelled names in other records", so no alias or resolution row joins them. Deciding they are one person needs a source and is left open.

### Identity decisions

The archive's wave-15 registry holds 57 decisions on case-local subjects: 17 identity decisions and 40 typed non-identity objects. Case-local subject ids are not names and the alias registry is not case-qualified, so the identity decisions are written as case-qualified, graph-inert rows in `data/canonical/local-subject-resolutions.jsonl` (the wave-16 integration rows, which carry the wave-15 decision id) and not as aliases. Each row keeps `entities_merged`, `relationship_created`, `participation_created` and every cross-case flag false.

- **Applied: 15 of 17.** Twelve are provenance matches (eight Arcadia organizations, three Arcadia actors, and `anduril-industries` in the Anduril case), two are named matches to existing entities (`ai-safety-institute` to `aisi`, `no10` to `no-10`), and one is the superseded plan for `frontier-ai-taskforce`, which wave 16 resolved onto `aisi` instead of creating a second entity, matching main's existing alias. The Anduril row targets `anduril-industries`: the archive target `anduril` was refused above, and the row records `archive_canonical_id: "anduril"` and the reason.
- **Pending: 2 of 17.** `code-first-girls` and `detachment-201` (case `uk-ai-policy`) planned new canonical records that are among the held-back legacy-bridge entities. They are listed in `decisions.pending` of the manifest and become applicable when those targets are promoted.
- **Pending: wave-12 hold resolutions.** The archive also holds 12 wave-12 local-to-canonical rows (for example `org-city-of-arcadia` to `city-of-arcadia`). They are outside the 17 wave-15 decisions and were not applied. Ten target rows added above and two (`liveramp`, `safegraph`) target held-back rows.
- **Pending: 40 typed non-identity objects.** The current schema has no place for typed objects that are neither actors nor organizations, so none was written. They are `bounded_nonidentity_object` decisions that deliberately create no actor or organization:
  - `arcadia-field-autopsy` (19): `site-santa-anita-park` (racetrack site), `site-1907-track` (site), `site-morlan-church` (site), `site-alexan-azalea` (development site), `site-city-parking-lots` (public land site), `site-rancho-santa-anita` (historic landholding), `proj-57-wheeler`, `proj-alexan-arroyo`, `proj-alexan-azalea`, `proj-arcadia-town-center`, `proj-derby`, `proj-le-meridien` (development projects), `infra-arcadia-water-wells` (water infrastructure), `infra-gold-line-arcadia` (transit infrastructure), `infra-santa-anita-flood-system` (flood control infrastructure), `geo-raymond-basin` (geographic feature), `geo-raymond-fault` (geological feature), `geo-santa-anita-wash` (watercourse), `role-downtown-architect` (institutional role).
  - `anduril-access-ownership` (11): `70b02c26f00000035` (contract order identifier), `fa882024db001` (contract award identifier), `w9128z-26-d-a001` (contract vehicle), `gao-b419420` and `gao-b423319` (legal protest records), `ghost-shark-program` (defense program), `usmc-installation-cuas-2025` (procurement program), `nato-eairc2-2026` (evaluation program), `ngc2-common-data-baseline` (data baseline), `public-law-119-21-section-90004` (statutory provision), `case-anduril-access-ownership` (analytic case identifier).
  - `uk-ai-policy` (6): `ai-opportunities-action-plan` (policy document), `ai-growth-zones` (policy program), `ai-research-resource` (compute infrastructure program), `national-data-library` (data infrastructure program), `uk-sovereign-ai` (proposed state-market program), `starmer-adoption-layer` (analytic construct).
  - `field-autopsy-03` (4): `product-helsing-hx2` (defense product), `program-crucible-2` (defense innovation program), `program-dawg` (defense acquisition program), `case-field-autopsy-03` (analytic case identifier).

### Unresolved mentions

The archive's wave-09 census classified 229 distinct identifier mentions across four cases: 121 exact canonical ids, 2 exact declared aliases, 2 opaque identifiers and 104 uncovered name-like identifiers. The 104 are written, with case and mention id, to `data/canonical/unresolved-mentions.jsonl` as the open frontier (`anduril-access-ownership` 13, `arcadia-field-autopsy` 36, `field-autopsy-03` 7, `uk-ai-policy` 48). None is resolved there: every row keeps `canonical_mapping_resolved`, `accepted_production_identity_bridge` and the cross-case flags false.

Each row also records `coverage_at_merge`, a mechanical read of the merged registries at the moment of the merge: the canonical id the identifier exactly equals, if any (9 rows), and the resolution row written above, if any (13 rows, one of which also equals a canonical id). That leaves 83 mentions with neither. The same file keeps the dispositions the archive recorded later (`archive_later_dispositions`, waves 11, 12, 15 and 16) as pointers only; they are not applied on main unless they appear in the sections above. The 83 are mostly the typed non-identity objects, the wave-12 rows and the held-back legacy-bridge entities described above.

### Not imported

The wave-06 AXM active identity registry (176 entity and 164 claim supersession rows) and the wave-11, 12 and 16 identity-extension registries are projections of the canonical registries; the compiler regenerates the equivalent in `build/axm-identity.json`. They were used as a check and not copied: all 72 AXM identifiers the extension registries recorded reproduce under the current contract, 162 of the 176 wave-06 entity ids are identical in the current build, 9 surfaces have been relabelled on main since, and 5 wave-06 surfaces are not in the current ledger. The archive's tooling, workflows, generated reports and identifier-topology registries are not part of this merge.
