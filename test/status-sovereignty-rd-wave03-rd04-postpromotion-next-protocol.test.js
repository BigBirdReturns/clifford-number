import assert from 'node:assert/strict';

process.env.RD04_PROTOCOL_SKIP_INPUT_BLOB_CHECKS = '1';

const { buildProduct } = await import('../tools/build-status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.mjs');
const { validateObjects } = await import('../tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-next-protocol.mjs');

const clone = (value) => JSON.parse(JSON.stringify(value));
const baseline = buildProduct();
assert.equal(validateObjects(baseline, { compareExpected: true, checkManifestFiles: true }), true);

let refused = 0;
function mustRefuse(label, mutate, options = { compareExpected: false, checkManifestFiles: false }) {
  const candidate = clone(baseline);
  mutate(candidate);
  assert.throws(() => validateObjects(candidate, options), undefined, label);
  refused += 1;
}

mustRefuse('wrong parent', (p) => { p['predecessor-custody.json'].canonical_parent = '0'.repeat(40); });
mustRefuse('wrong terminal count', (p) => { p['predecessor-custody.json'].terminal_cells_before = 221; });
mustRefuse('outside human', (p) => { p['predecessor-custody.json'].authority_boundary.outside_human_dependency = true; });
mustRefuse('source request', (p) => { p['predecessor-custody.json'].authority_boundary.source_requests_executed = 1; });
mustRefuse('selected state substitution', (p) => { p['frontier-selection.json'].selected_state_ids[1] = 'US-STATE-OR'; });
mustRefuse('selected field substitution', (p) => { p['frontier-selection.json'].selected_field_ids[1] = 'verification_evidence_and_staff_discretion_surface'; });
mustRefuse('minimum cohort inflation', (p) => { p['frontier-selection.json'].minimum_open_substantive_cells_per_row = 4; });
mustRefuse('row-state insertion', (p) => { p['frontier-selection.json'].selected_field_ids.push('field_and_row_terminal_state'); });
mustRefuse('class closure', (p) => { p['frontier-selection.json'].class_closed = true; });
mustRefuse('frozen digest tamper', (p) => { p['previously-frozen-url-exclusion.json'].normalized_url_ledger_sha256 = 'f'.repeat(64); });
mustRefuse('frozen URL deletion', (p) => { p['previously-frozen-url-exclusion.json'].normalized_urls.pop(); });
mustRefuse('frozen overlap count', (p) => { p['previously-frozen-url-exclusion.json'].new_route_overlap_count = 1; });
mustRefuse('route count inflation', (p) => { p['route-ledger.json'].fixed_route_count = 6; });
mustRefuse('route duplication', (p) => { p['route-ledger.json'].routes[1].route_id = p['route-ledger.json'].routes[0].route_id; });
mustRefuse('URL duplication', (p) => { p['route-ledger.json'].routes[1].normalized_url = p['route-ledger.json'].routes[0].normalized_url; });
mustRefuse('frozen URL reuse', (p) => {
  const route = p['route-ledger.json'].routes[0];
  route.requested_url = p['previously-frozen-url-exclusion.json'].normalized_urls[0];
  route.normalized_url = route.requested_url;
  route.url_sha256 = '0'.repeat(64);
});
mustRefuse('HTTP downgrade', (p) => {
  const route = p['route-ledger.json'].routes[0];
  route.requested_url = route.requested_url.replace('https:', 'http:');
  route.normalized_url = route.requested_url;
});
mustRefuse('host substitution', (p) => { p['route-ledger.json'].routes[0].expected_host = 'example.com'; });
mustRefuse('state substitution', (p) => { p['route-ledger.json'].routes[0].state_id = 'US-STATE-OR'; });
mustRefuse('field substitution', (p) => { p['route-ledger.json'].routes[0].target_field_ids[0] = 'verification_evidence_and_staff_discretion_surface'; });
mustRefuse('multiple attempts', (p) => { p['route-ledger.json'].routes[0].maximum_attempts = 2; });
mustRefuse('cross-host redirect', (p) => { p['route-ledger.json'].routes[0].cross_host_redirects_allowed = true; });
mustRefuse('spawned request', (p) => { p['route-ledger.json'].routes[0].result_spawned_requests = 1; });
mustRefuse('automatic source admission', (p) => { p['route-ledger.json'].routes[0].automatic_source_admission = true; });
mustRefuse('automatic field classification', (p) => { p['route-ledger.json'].routes[0].automatic_field_classification = true; });
mustRefuse('automatic row closure', (p) => { p['route-ledger.json'].routes[0].automatic_row_terminalization = true; });
mustRefuse('automatic class closure', (p) => { p['route-ledger.json'].routes[0].automatic_class_closure = true; });
mustRefuse('contract request inflation', (p) => { p['route-query-contract.json'].maximum_total_requests = 6; });
mustRefuse('contract parallelism', (p) => { p['route-query-contract.json'].parallel_workers = 2; });
mustRefuse('credentials enabled', (p) => { p['route-query-contract.json'].credentials_allowed = true; });
mustRefuse('browser state enabled', (p) => { p['route-query-contract.json'].browser_state_allowed = true; });
mustRefuse('form submission enabled', (p) => { p['route-query-contract.json'].form_submissions_allowed = true; });
mustRefuse('summary matrix mutation', (p) => { p['summary.json'].terminal_cells_before = 223; });
mustRefuse('summary class closure', (p) => { p['summary.json'].class_closed = true; });
mustRefuse('manifest path count', (p) => { p['product-manifest.json'].permanent_path_count = 13; });
mustRefuse('manifest write workflow', (p) => { p['product-manifest.json'].write_capable_permanent_workflows = 1; });
mustRefuse('manifest transport path', (p) => { p['product-manifest.json'].transport_paths = 1; });
mustRefuse('unknown nested authority', (p) => { p['route-ledger.json'].routes[0].unreviewed_authority = true; },
  { compareExpected: true, checkManifestFiles: false });

assert.equal(refused, 38);
console.log(`postpromotion_next_protocol_adversarial_refusals=${refused}`);
