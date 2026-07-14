import assert from 'node:assert/strict';
import {
  NODE_TYPES, RELATIONSHIP_TYPES, ALLOWED_EDGE_PREDICATES, FORBIDDEN_EDGE_PREDICATES,
  normalizePayee, classifyAnchorStrength, resolveIdentity, temporalRelation, evaluateCrossingGate,
} from '../tools/lib/entity-resolution.mjs';
import { shouldResumeSkip, classifyEnumeration, classifySearchResult } from '../tools/lib/acquisition-state.mjs';
import { parseOperatingExpenditureLine, normalizeBulkOperatingExpenditure, createReportAmendmentAudit } from '../tools/lib/fec-bulk-oppexp.mjs';

// --- fixture: same name, different entity ---------------------------------
// Two vendors share a name but each carries only name-similarity (weak). Name alone cannot resolve.
{
  const r = resolveIdentity({
    source_text: 'MERIDIAN LLC',
    candidates: [
      { candidate_entity_id: 'ent-a', node_type: 'legal_entity', rule: 'name_match', anchors: [{ kind: 'name_similarity', value: 'MERIDIAN LLC' }] },
      { candidate_entity_id: 'ent-b', node_type: 'legal_entity', rule: 'name_match', anchors: [{ kind: 'name_similarity', value: 'MERIDIAN LLC' }] },
    ],
  });
  assert.equal(r.disposition, 'unresolved', 'name similarity alone must not resolve identity');
  assert.equal(r.accepted_entity_id, null);
  assert.equal(r.candidates.length, 2, 'every candidate is preserved');
}

// --- fixture: two distinct official ids under one source string -> ambiguous, never pick ---
{
  const r = resolveIdentity({
    source_text: 'BUSH-CHENEY',
    candidates: [
      { candidate_entity_id: 'cik-1', node_type: 'legal_entity', rule: 'sec', anchors: [{ kind: 'sec_cik', value: '0000001' }] },
      { candidate_entity_id: 'cik-2', node_type: 'legal_entity', rule: 'sec', anchors: [{ kind: 'sec_cik', value: '0000002' }] },
    ],
  });
  assert.equal(r.disposition, 'ambiguous', 'two accepted-equivalent candidates must not be silently merged');
  assert.equal(r.accepted_entity_id, null);
}

// --- fixture: parent vs subsidiary are typed relationships, not aliases ---
{
  assert.ok(RELATIONSHIP_TYPES.has('parent_of') && RELATIONSHIP_TYPES.has('subsidiary_of'));
  assert.ok(NODE_TYPES.has('legal_entity'));
  const parent = resolveIdentity({ source_text: 'ACME HOLDINGS', candidates: [{ candidate_entity_id: 'p', node_type: 'legal_entity', rule: 'id', anchors: [{ kind: 'sec_cik', value: '10' }] }] });
  const sub = resolveIdentity({ source_text: 'ACME PRINTING', candidates: [{ candidate_entity_id: 's', node_type: 'legal_entity', rule: 'id', anchors: [{ kind: 'sec_cik', value: '11' }] }] });
  assert.notEqual(parent.accepted_entity_id, sub.accepted_entity_id, 'parent and subsidiary resolve to distinct entities');
}

// --- fixture: property vs owner/operator distinct node + relationship types ---
{
  assert.ok(NODE_TYPES.has('property') && NODE_TYPES.has('person'));
  assert.ok(RELATIONSHIP_TYPES.has('owns_property') && RELATIONSHIP_TYPES.has('operator_of'));
  assert.ok(ALLOWED_EDGE_PREDICATES.has('operates_property'));
}

// --- fixture: spouse-held vs filer-held; missing holder scope fails the gate ---
{
  assert.ok(ALLOWED_EDGE_PREDICATES.has('spouse_interest_in') && ALLOWED_EDGE_PREDICATES.has('owns_interest_in'));
  const g = evaluateCrossingGate({
    itemization: { source_sha256: 'abc' },
    committee_resolution: { disposition: 'accepted' },
    payee_resolution: { disposition: 'accepted' },
    interest: { source_locator: 'oge:x' /* no holder_scope */ },
    itemization_interval: { valid_from: '2019-01-01', valid_until: '2019-12-31' },
    interest_interval: { valid_from: '2019-01-01', valid_until: '2020-01-01' },
    predicate: 'paid',
  });
  assert.equal(g.gate, 'fail');
  assert.ok(g.failures.includes('missing_holder_scope'));
}

// --- fixture: trust/fund indirect interest node + relationship types ---
{
  assert.ok(NODE_TYPES.has('trust') && NODE_TYPES.has('fund'));
  assert.ok(RELATIONSHIP_TYPES.has('trustee_of') && RELATIONSHIP_TYPES.has('beneficiary_of'));
}

// --- fixture: historical name change resolves only via dated DBA (strong anchor) ---
{
  assert.equal(classifyAnchorStrength('temporally_valid_dba_registration'), 'strong');
  const r = resolveIdentity({
    source_text: 'OLD NAME CORP',
    candidates: [{ candidate_entity_id: 'e', node_type: 'legal_entity', rule: 'dba', anchors: [{ kind: 'temporally_valid_dba_registration', value: 'OLD->NEW 2011' }, { kind: 'state_filing_id', value: 'X1' }] }],
  });
  assert.equal(r.disposition, 'accepted', 'two independent strong anchors resolve');
}

// --- fixture: shared-address false positive stays unresolved ---
{
  assert.equal(classifyAnchorStrength('shared_registered_agent_address'), 'weak');
  const r = resolveIdentity({
    source_text: 'VENDOR ONE LLC',
    candidates: [{ candidate_entity_id: 'e', node_type: 'legal_entity', rule: 'address', anchors: [{ kind: 'shared_registered_agent_address', value: '1209 ORANGE ST' }, { kind: 'name_similarity', value: 'VENDOR ONE' }] }],
  });
  assert.equal(r.disposition, 'unresolved', 'shared registered-agent address + name are weak; must not resolve');
}

// --- fixture: non-overlapping payment and ownership ---
{
  assert.equal(temporalRelation({ valid_from: '2005-01-01', valid_until: '2005-12-31' }, { valid_from: '2019-01-01', valid_until: '2019-12-31' }), 'non_overlapping');
  const g = evaluateCrossingGate({
    itemization: { source_sha256: 'h' }, committee_resolution: { disposition: 'accepted' }, payee_resolution: { disposition: 'accepted' },
    interest: { source_locator: 'oge:y', holder_scope: 'filer' },
    itemization_interval: { valid_from: '2005-01-01', valid_until: '2005-12-31' },
    interest_interval: { valid_from: '2019-01-01', valid_until: '2019-12-31' }, predicate: 'paid',
  });
  assert.equal(g.gate, 'fail');
  assert.ok(g.failures.includes('non_overlapping_intervals'));
}

// --- fixture: temporally unknown never becomes permanent overlap ---
{
  assert.equal(temporalRelation({ valid_from: null, valid_until: null }, { valid_from: '2019-01-01', valid_until: '2019-12-31' }), 'temporally_unknown');
  assert.equal(temporalRelation({ valid_from: '2019-01-01', valid_until: null }, { valid_from: '2019-06-01', valid_until: null }), 'possibly_overlapping');
}

// --- fixture: passing crossing gate emits a bounded candidate with firewall ---
{
  const g = evaluateCrossingGate({
    itemization: { source_sha256: 'h' }, committee_resolution: { disposition: 'accepted' }, payee_resolution: { disposition: 'accepted' },
    interest: { source_locator: 'oge:z', holder_scope: 'filer' },
    itemization_interval: { valid_from: '2019-03-01', valid_until: '2019-03-31' },
    interest_interval: { valid_from: '2018-01-01', valid_until: '2020-01-01' }, predicate: 'paid',
  });
  assert.equal(g.gate, 'pass');
  assert.equal(g.temporal_relation, 'overlapping');
  assert.equal(g.candidate.graph_effect, 'none');
  assert.equal(g.candidate.verification_status, 'machine_proposed_unverified');
  assert.deepEqual(g.candidate.does_not_establish.includes('wrongdoing'), true);
}

// --- fixture: forbidden predicates rejected ---
{
  for (const p of ['linked_to', 'tied_to', 'associated_with', 'involved_in']) assert.ok(FORBIDDEN_EDGE_PREDICATES.has(p));
  const g = evaluateCrossingGate({
    itemization: { source_sha256: 'h' }, committee_resolution: { disposition: 'accepted' }, payee_resolution: { disposition: 'accepted' },
    interest: { source_locator: 'l', holder_scope: 'filer' },
    itemization_interval: { valid_from: '2019-01-01', valid_until: '2019-12-31' },
    interest_interval: { valid_from: '2019-01-01', valid_until: '2019-12-31' }, predicate: 'linked_to',
  });
  assert.ok(g.failures.some(f => f.startsWith('disallowed_predicate')));
}

// --- fixture: FEC memo / subitemized rows preserve memo fields + forbidden inferences ---
{
  const line = ['C00386987', 'A', '2004', 'M11', 'IMG', '21B', 'F3X', 'SB', 'SOME VENDOR', 'CITY', 'ST', '33101', '10/07/2004', '250', 'G2004', 'MEMO ITEM', 'CAT', 'DESC', 'X', 'SUBITEMIZED DETAIL', 'ORG', 'SUBID', 'FILE1', 'TRANX', 'BACKREF'].join('|');
  const norm = normalizeBulkOperatingExpenditure(parseOperatingExpenditureLine(line), { cohort_id: 'c', person_id: 'p', person_name: 'P', candidate_id: 'P00', committee_name: 'X', source_url: 'u', source_sha256: 's', source_line: 1 });
  assert.equal(norm.memo_code, 'X');
  assert.equal(norm.memo_text, 'SUBITEMIZED DETAIL');
  assert.equal(norm.back_reference_transaction_id, 'BACKREF');
  assert.ok(norm.forbidden_inferences.includes('reported_itemization_is_unique_payment'));
  assert.equal(norm.graph_effect, 'none');
  assert.equal(norm.privacy_projection.includes('ZIP'), true, 'city/state/zip are projected out');
  assert.equal(JSON.stringify(norm).includes('33101'), false, 'ZIP must not be retained');
}

// --- fixture: amendments are NOT automatically duplicate transactions ---
{
  const audit = createReportAmendmentAudit();
  // three rows, all in AMENDED reports (AMNDT_IND=A) but distinct TRAN_IDs -> all distinct, zero dupes
  const rows = [
    { CMTE_ID: 'C00386987', AMNDT_IND: 'A', RPT_YR: '2004', RPT_TP: 'M11', TRAN_ID: 'T1', FILE_NUM: 'F1' },
    { CMTE_ID: 'C00386987', AMNDT_IND: 'A', RPT_YR: '2004', RPT_TP: 'M11', TRAN_ID: 'T2', FILE_NUM: 'F1' },
    { CMTE_ID: 'C00386987', AMNDT_IND: 'A', RPT_YR: '2004', RPT_TP: 'M11', TRAN_ID: 'T3', FILE_NUM: 'F1' },
  ];
  rows.forEach(r => audit.observe(r));
  const s = audit.summarize();
  assert.equal(s.distinct_transaction_report_keys, 3, 'amended rows with distinct tran ids are 3 distinct keys, not duplicates');
  assert.equal(s.duplicate_transaction_report_file_keys, 0);
  assert.equal(s.transaction_report_keys_spanning_multiple_file_numbers, 0);
  // A genuinely repeated key across two file numbers IS detectable as an amendment-chain version.
  const audit2 = createReportAmendmentAudit();
  audit2.observe({ CMTE_ID: 'C00386987', AMNDT_IND: 'N', RPT_YR: '2004', RPT_TP: 'M11', TRAN_ID: 'TZ', FILE_NUM: 'F1' });
  audit2.observe({ CMTE_ID: 'C00386987', AMNDT_IND: 'A', RPT_YR: '2004', RPT_TP: 'M11', TRAN_ID: 'TZ', FILE_NUM: 'F2' });
  assert.equal(audit2.summarize().transaction_report_keys_spanning_multiple_file_numbers, 1);
}

// --- fixture: interrupted download / checkpoint resume ---
{
  assert.equal(shouldResumeSkip({ terminal_state: 'scanned', extracted_sha256: 'x' }), true);
  assert.equal(shouldResumeSkip({ terminal_state: 'scanned' }), false, 'no extracted hash -> not resumable');
  assert.equal(shouldResumeSkip({ terminal_state: 'downloaded', extracted_sha256: 'x' }), false);
  assert.equal(shouldResumeSkip(null), false);
}

// --- fixture: unavailable and zero-result searches ---
{
  assert.equal(classifyEnumeration(200), 'available');
  assert.equal(classifyEnumeration(404), 'unavailable_after_search');
  assert.equal(classifyEnumeration(500), 'transient_failure');
  assert.equal(classifySearchResult(0), 'unavailable_after_search');
  assert.equal(classifySearchResult(7), 'locators_found');
}

console.log('entity-resolution.test.js: OK');
