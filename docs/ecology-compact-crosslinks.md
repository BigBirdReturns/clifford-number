# Clifford Number: compact source-reference acceleration

This is an owner-local performance layer over **already acquired public-source evidence**, not a new authority, ingest, entity resolver, public claim graph or publication route. The source-of-truth SQLite and SHA256-addressed bodies remain in the existing Clifford Estate custody. The performance cache stores reversible source-native IDs and indexed metadata only. It creates no reviewed event attendance, legal-person identity, money flow, intent or causal relations.

## Native source and durable coordinates

- Canonical Clifford code: `tools/ecology_compact_links.py`, `tools/ecology_check_next_delta.py`, `tools/ecology_verify_source_id_samples.py`, `tools/ecology_fast_crossing_pivots.py`.
- Source-native input: `sessions/integrity-acquisition-20261102/ecology/ecology.sqlite` (existing W03 project; never modified by these tools).
- Source-typed meeting input: `sessions/conference-circuit-20261103/reports/conference-circuit-v8.sqlite` (accepted private W03 edition).
- Performance state and versioned durable output: `sessions/performance-crosslinks-20261103/reports/`. Current metadata: `COMPACT-LINKS-CURRENT.json`, `INDEPENDENT-SOURCE-ORACLE.json`, `FAST-CROSSING-PIVOTS.json`.
- Fast, derivative working cache: W03 NVMe `/srv/w03/nvme-work/jobs/clifford-performance-20261103/compact-crosslinks-v2.sqlite`.
- Off-device independent copy: W01 `C:/Users/Jonathan/AppData/Local/Clifford/Crosslinks/compact-links-r1151544-c71716-e6841f01c1e52.sqlite`, SHA256 `ece5ec7dbd2ede45705c48b7a00dba2add003b7423b89ff0eeae1609d653d377`. Desktop `Clifford Crosslink Lookup.cmd`. Native receipt: `S:/Scratch/Runs/Clifford-Ecology-20261102/CROSSLINK-W01-ACCEPTANCE.json`.

Runtime configuration `CLIFFORD_PROJECT_HOME`, `CLIFFORD_CROSSLINK_STATE`, `CLIFFORD_ECOLOGY_DB`, `CLIFFORD_CONFERENCE_DB`, `CLIFFORD_HOT_INDEX_DIR` may override W03 defaults for qualification. No new scheduler or service was installed.

## Actual source acceptance, November 3, 2026

Native SQL/SQLite `INSERT ... SELECT` eliminated per-row Python materialization for the actual retained population. It indexed **1,151,544 public source-reference rows** in **13.45 seconds** and **71,716 explicit statutory citation occurrence rows** in **1.11 seconds**. The materialized, source-native population is **1,223,260 pointer rows**, **34,057 namespaced keys**, **2,748 typed conference metadata rows** and **652 exact written source-role labels**. These counts describe source observations and distinct key strings, not verified unique legal entities or human interactions.

The hot index occupies **527,622,144 bytes**, about 528 MB, compared with a 6.7 GB source ecology database. It duplicates **zero original source-body bytes**. The working cache lives on W03's independent 3.5 TB NVMe; original source and versioned backup remain on W03's project custody array. The source volume had ~4.3 TB free and the NVMe ~3.1 TB free at preflight. There was no deletion, repartition, filesystem migration or alteration of original source receipts.

The writer independently checked the full logical row-by-row digest of the compact NVMe DB and the versioned W03 durable SQLite backup; the files' physical bytes differ legitimately because SQLite backups may use a different header/change counter. The **semantic SHA256** is `b908cc650134e9329ac340f195c79ec91403041a38266e3ec5d3665de5668afc`. Versioned W03 backup bytes SHA256 `ece5ec7dbd2ede45705c48b7a00dba2add003b7423b89ff0eeae1609d653d377`. W01 independently copied this exact byte-version and passed hash, SQLite integrity, actual reference count and query checks.

Independent source-native oracle `clifford_compact_links_source_native_oracle_20261103a` passed. It checked first, one-third, two-thirds and final exact source row IDs per original SQLite reference/citation table, complete indexed watermarks, unchanged event row count and an exact Public Law 102-190 canary (**28 native record references and 154 text citation occurrences**, each matched to the original separate source tables). W01's real read-only `102-190` query passed. The previous expansive cold-HDD validator was stopped after I/O contention and is not counted as acceptance; bounded source-ID and off-device independent checks cleared the narrower floor.

Benchmarks on the actual source ID values in `COMPACT-LINKS-CURRENT.json`: reverse source-document reference lookup, original unindexed source 163.736 ms median versus 0.004 ms median indexed NVMe cache; a public-law citation lookup, original 2.043 ms versus indexed 0.718 ms. These are particular source-key benchmarks with warm/cache effects, not universal throughput claims. Four full grouped candidate queries over the source-native pointer population completed in **350.697 ms**, yielding 30 bounded namespaced-source recurrence candidates, 30 exact written-name recurrence candidates, 14 same *declared named venue and day* record groups, and 30 same-original-source fingerprint groups. A group's record count often counts programme roles, not distinct meetings or witnessed participants. The crossing output is a **research prioritization** instrument, not promoted graph truth.

## Incremental operating path

```bash
python3 tools/ecology_check_next_delta.py
# If NEW_SOURCE_LINK_ROWS_READY and the source conference hash is unchanged:
python3 -u tools/ecology_compact_links.py build --limit 1500000 --chunk 40000 --seconds 600
python3 tools/ecology_verify_source_id_samples.py
python3 tools/ecology_fast_crossing_pivots.py --limit 30
python3 tools/ecology_compact_links.py lookup --namespace us_public_law --id 102-190 --max-results 30
```

The cheap check reads only indexed source rowid maxima, original-native ID canaries and the conference file fingerprint. Observed immediately after acceptance: `UNCHANGED_NO_REBUILD`, zero pending reference/citation rows. When the conference input hash changes, its changed source-typed records need source-specific version adoption; do **not** use the append-only `INSERT OR IGNORE` metadata path to silently reuse stale event rows. New source rows can be appended under the original rowids and namespaced IDs without rebuilding existing entries. Retain the original job ID on uncertain dispatch. Preserve original source or rights holds, the three-lane acquisition owner and the no-broad-private-index refusal.

This is an index for fast connections **between evidence records**. A documented citation may connect a law to a Federal Register document; a shared official conference programme may connect several *written* names to a session; an original FEC committee ID may group many filings. Person equivalence, room presence, board/control rights, private conversations, legal effect, dollars paid and institutional causation require independent source and review gates.

Current evidence and subsequent source passes remain under the project's existing hourly historical-research campaign, not another recurring daemon. Off-device and source-custody status must be explicitly read before claiming delivery.
