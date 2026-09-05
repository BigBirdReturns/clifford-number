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
