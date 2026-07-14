import assert from 'node:assert/strict';
import path from 'node:path';
import { root } from '../tools/lib/ledger.mjs';
import {
  loadFieldAutopsy,
  validateFieldAutopsy,
  isFieldAutopsyCase,
} from '../tools/lib/field-autopsy.mjs';
import {
  loadSignatures,
  validateSignature,
  generateTrailSearches,
} from '../tools/lib/formation-signature.mjs';

const caseDir = path.join(root, 'cases/arcadia-field-autopsy');
assert.ok(isFieldAutopsyCase(caseDir), 'arcadia case must be a field-autopsy bundle');

const clean = () => structuredClone(loadFieldAutopsy(caseDir));

// The shipped bundle must validate with zero errors.
{
  const errors = validateFieldAutopsy(clean());
  assert.deepEqual(errors, [], `arcadia bundle must validate:\n${errors.join('\n')}`);
}

function expectFailure(label, mutate, pattern) {
  const bundle = clean();
  mutate(bundle);
  const errors = validateFieldAutopsy(bundle);
  assert.ok(errors.some(e => pattern.test(e)), `${label}: expected an error matching ${pattern}, got:\n${errors.join('\n') || '(none)'}`);
}

// 1. The conversation itself must never serve as an external-fact receipt.
expectFailure('conversation-as-receipt', bundle => {
  const claim = bundle.claims.find(c => c.claim_kind === 'external_fact');
  claim.receipt_ids = bundle.receipts.filter(r => r.source_type === 'conversation_artifact').map(r => r.receipt_id);
  if (claim.count_source_receipt_id) claim.count_source_receipt_id = claim.receipt_ids[0];
}, /rests only on the conversation artifact/);

// 2. An interpretive hypothesis must never change the canonical graph.
expectFailure('hypothesis-graph-effect', bundle => {
  bundle.hypotheses[0].graph_effect = 'edge';
}, /must carry graph_effect none/);
expectFailure('hypothesis-lifted-into-events', bundle => {
  bundle.events[0].claim_ids = [...bundle.events[0].claim_ids, bundle.hypotheses[0].hypothesis_id];
}, /lifts hypothesis/);

// 3. Temporal control regimes must never collapse into one network.
expectFailure('regime-removal', bundle => {
  bundle.chronology.regimes = bundle.chronology.regimes.filter(r => r.regime_id !== 'regime-wartime-federal');
}, /missing required control regime/);
expectFailure('regime-collapse', bundle => {
  for (const regime of bundle.chronology.regimes) regime.valid_from = '1875';
}, /appear collapsed|predates its regime|postdates its regime/);
expectFailure('event-without-regime', bundle => {
  delete bundle.events[0].regime_id;
}, /lacks a regime_id/);

// 4. Alignment alone must never become a coordination edge.
expectFailure('alignment-as-coordination', bundle => {
  const edge = bundle.edges.find(e => e.edge_type === 'structural_alignment');
  edge.edge_type = 'coordination';
}, /alignment alone is not coordination|requires official_record or corroborated/);

// 5. A named person must carry a resolving receipt or be demoted.
expectFailure('person-without-receipt', bundle => {
  const person = bundle.entities.find(e => e.entity_type === 'person' && e.unresolved !== true);
  person.receipt_ids = [];
  person.roles = [];
}, /lacks a resolving non-conversation receipt/);

// 6. Any _after_search state requires exact search provenance.
expectFailure('after-search-without-provenance', bundle => {
  const row = bundle.coverage.find(c => c.state === 'partially_searched');
  row.search_ids = [];
}, /without search provenance/);
expectFailure('after-search-gutted-search', bundle => {
  const row = bundle.coverage.find(c => c.state === 'partially_searched');
  const search = bundle.searches.find(s => s.search_id === row.search_ids[0]);
  search.query = '';
}, /lacks full provenance|lacks query/);
expectFailure('found-without-inspected-evidence', bundle => {
  const search = bundle.searches.find(s => s.result === 'found' && s.inspected?.length);
  search.inspected = [];
}, /marked found lacks inspected locator or record evidence/);
expectFailure('not-found-without-inspected-evidence', bundle => {
  const search = bundle.searches.find(s => s.result === 'not_found' && s.inspected?.length);
  search.inspected = [];
}, /marked not_found lacks inspected locator or record evidence/);

// 7. A partial surface must never be labeled complete.
expectFailure('partial-labeled-complete', bundle => {
  const row = bundle.coverage.find(c => c.state === 'partially_searched');
  row.notes = 'Search closed; coverage complete.';
}, /completion language/);

// 8. A terminal state must carry structured, terminal search provenance and
// must agree with the frontier in both directions.
function makeTerminal(bundle) {
  const trail = bundle.trails[0];
  trail.status = 'terminal_unavailable';
  trail.search_ids = ['arc-s01'];
  bundle.frontier.open_trail_ids = bundle.frontier.open_trail_ids.filter(id => id !== trail.trail_id);
  bundle.frontier.terminal_trail_ids = [trail.trail_id];
  return trail;
}
expectFailure('terminal-with-continuation', bundle => {
  const trail = makeTerminal(bundle);
  trail.notes = 'Terminal, but follow-up pending next step.';
}, /continuation language/);
expectFailure('terminal-listed-open', bundle => {
  const trail = makeTerminal(bundle);
  bundle.frontier.open_trail_ids = [...bundle.frontier.open_trail_ids, trail.trail_id];
}, /lists terminal trail/);
expectFailure('terminal-without-search-ids', bundle => {
  const trail = makeTerminal(bundle);
  trail.search_ids = [];
}, /lacks structured search_ids/);
expectFailure('terminal-with-found-search', bundle => {
  const trail = makeTerminal(bundle);
  trail.search_ids = ['af-s01'];
}, /cites non-terminal search result/);
expectFailure('in-progress-without-search-ids', bundle => {
  const trail = bundle.trails.find(t => t.status === 'in_progress');
  trail.search_ids = [];
}, /in_progress trail .* lacks structured search_ids/);

// 9. A source-specific count must carry its own source's receipt.
expectFailure('count-borrowed-receipt', bundle => {
  const claim = bundle.claims.find(c => /(_count|_amount|_rate)$/.test(c.predicate ?? ''));
  claim.count_source_receipt_id = 'not-one-of-its-receipts';
}, /count_source_receipt_id is not among its own receipts/);

// 10. Spatial correlation must never yield occult/ethnic/causal/wrongful coordination.
expectFailure('prohibited-inference-edge', bundle => {
  bundle.edges[0].edge_type = 'occult_coordination';
}, /prohibited inference|unknown edge_type/);
expectFailure('spatial-correlation-graph-edge', bundle => {
  const edge = bundle.edges.find(e => e.basis === 'spatial_correlation' || e.basis === 'alignment');
  edge.graph_effect = 'edge';
}, /may not reach the graph|may not carry graph_effect edge/);

// 11. A rejected or corrected claim must never disappear from the record.
expectFailure('correction-erased', bundle => {
  const contradiction = bundle.contradictions.find(c => ['corrected', 'rejected'].includes(c.status));
  bundle.observations = bundle.observations.filter(o => !contradiction.observation_ids.includes(o.observation_id));
}, /missing observation|no contradiction record preserves/);
expectFailure('correction-unlinked', bundle => {
  const contradiction = bundle.contradictions.find(c => ['corrected', 'rejected'].includes(c.status));
  contradiction.observation_ids = [];
}, /must reference the preserved observation/);

// 12. The formation signature must never promote candidates into findings.
expectFailure('trail-promotes-findings', bundle => {
  bundle.trails[0].promotes_to = 'finding';
}, /candidate_only/);
expectFailure('trail-search-carries-verdict', bundle => {
  bundle.trails[0].bounded_searches[0].verdict = 'confirmed';
}, /candidates must stay candidates/);

// 13. Receipt identity and receipt-v2 provenance are fail-closed.
expectFailure('duplicate-receipt-locator', bundle => {
  const source = bundle.receipts.find(r => r.url);
  bundle.receipts.push({ ...structuredClone(source), receipt_id: 'duplicate-artifact-id' });
}, /duplicate receipt locator/);
expectFailure('receipt-v2-without-search-link', bundle => {
  const receipt = bundle.receipts.find(r => r.provenance_contract === 'receipt-v2');
  receipt.search_ids = [];
}, /lacks search linkage/);
expectFailure('receipt-v2-with-wrong-search-link', bundle => {
  const receipt = bundle.receipts.find(r => r.provenance_contract === 'receipt-v2');
  receipt.search_ids = ['arc-s01'];
}, /not exactly linked/);

// 14. A source found on one of the cited searches is not unavailable.
expectFailure('found-labeled-unavailable', bundle => {
  const row = bundle.coverage.find(c => c.state === 'partially_searched' && c.search_ids?.length);
  row.state = 'unavailable_after_search';
  row.search_ids = ['af-s01'];
}, /unavailable_after_search but cites search .* marked found/);
expectFailure('partial-labeled-unavailable', bundle => {
  const row = bundle.coverage.find(c => c.state === 'partially_searched' && c.search_ids?.length);
  row.state = 'unavailable_after_search';
  row.search_ids = ['cf-s07'];
}, /unavailable_after_search but cites search .* marked partial/);
expectFailure('not-searched-with-executed-search', bundle => {
  const row = bundle.coverage.find(c => c.state === 'not_searched');
  row.search_ids = ['arc-s01'];
}, /not_searched but cites executed search provenance/);
expectFailure('record-not-searched-with-executed-search', bundle => {
  const row = bundle.entities.find(e => e.entity_type === 'person');
  row.evidence_state = 'not_searched';
  row.search_ids = ['arc-s01'];
}, /not_searched but cites executed search provenance/);
expectFailure('record-unavailable-with-partial-search', bundle => {
  const row = bundle.entities.find(e => e.entity_type === 'person');
  row.evidence_state = 'unavailable_after_search';
  row.search_ids = ['cf-s07'];
}, /unavailable_after_search but cites search .* marked partial/);
expectFailure('edge-unavailable-with-found-search', bundle => {
  const row = bundle.edges[0];
  row.evidence_state = 'unavailable_after_search';
  row.search_ids = ['af-s01'];
}, /unavailable_after_search but cites search .* marked found/);
expectFailure('claim-unavailable-with-partial-search', bundle => {
  const row = bundle.claims.find(c => c.claim_kind === 'external_fact');
  row.evidence_state = 'unavailable_after_search';
  row.search_ids = ['cf-s07'];
}, /unavailable_after_search but cites search .* marked partial/);
expectFailure('blocked-search-cannot-close-trail', bundle => {
  const trail = makeTerminal(bundle);
  trail.search_ids = ['gm-s23'];
}, /cites non-terminal search result .*:unavailable/);
expectFailure('rejected-join-must-stay-preserved', bundle => {
  bundle.rejectedJoins.find(r => r.rejected_id === 'rj-02').preserved = false;
}, /rejected join rj-02 must remain preserved/);
expectFailure('resolution-needs-reciprocal-link', bundle => {
  bundle.rejectedJoins.find(r => r.rejected_id === 'rj-02').superseded_by_claim_ids = [];
}, /lacks superseding claim linkage|does not reciprocally name/);
expectFailure('resolution-scope-cannot-broaden', bundle => {
  bundle.claims.find(c => c.claim_id === 'clm-ben-zhang-identity-resolution').resolution_scope = 'person_and_entities';
}, /must remain person_identity_only/);
expectFailure('resolution-needs-official-corroboration', bundle => {
  bundle.claims.find(c => c.claim_id === 'clm-ben-zhang-identity-resolution').receipt_ids = ['pl-r12', 'af-r08'];
}, /requires multiple receipts including official evidence/);
expectFailure('resolution-retains-active-boundaries', bundle => {
  bundle.rejectedJoins.find(r => r.rejected_id === 'rj-02').retained_boundary_ids = [];
}, /lacks retained boundary joins/);

// Formation-signature machinery: bounded, graph-inert, candidate-only.
{
  const registry = loadSignatures();
  assert.ok(registry.signatures.length >= 1, 'signature registry must contain at least one signature');
  for (const signature of registry.signatures) {
    assert.deepEqual(validateSignature(signature), [], 'shipped signatures must validate');
  }
  const signature = registry.signatures.find(s => s.signature_id === 'sig-place-formation-v1');
  const searches = generateTrailSearches(signature, {
    place_name: 'Monrovia CA',
    region: 'San Gabriel Valley',
    transit_project: 'Foothill Gold Line',
  });
  assert.ok(searches.length >= signature.spine.length, 'expansion must cover every spine stage');
  for (const row of searches) {
    assert.equal(row.status, 'candidate', 'every generated row is a candidate');
    assert.equal(row.graph_effect, 'none', 'candidates are graph-inert');
    assert.equal(row.bounded, true, 'candidates are bounded searches');
    assert.ok(!('claim_status' in row) && !('verdict' in row), 'candidates carry no finding fields');
    assert.ok(row.query.includes('Monrovia CA') || row.query.includes('San Gabriel Valley') || row.query.includes('Foothill Gold Line'), 'templates must bind to the place');
  }
  const broken = structuredClone(signature);
  broken.promotes_to = 'finding';
  assert.throws(() => generateTrailSearches(broken, { place_name: 'X' }), /candidate_only/);
}

console.log('field-autopsy.test: OK');
