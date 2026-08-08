import { loadProduct, validateProduct } from '../tools/validate-status-sovereignty-rd-wave03-rd04-postpromotion-five-route-adjudication.mjs';

function clone(value) {
  return structuredClone(value);
}
function setBadHash(row) {
  row.sha256 = '0'.repeat(64);
}

const baseline = loadProduct();
validateProduct(baseline);

const mutations = [
  ['drop successful execution', (p) => p.capture.successful_executions.pop()],
  ['change total attempts', (p) => { p.capture.transport_ledger.total_http_attempts = 9; }],
  ['change unique route count', (p) => { p.capture.transport_ledger.unique_route_count = 6; }],
  ['change unique body count', (p) => { p.capture.transport_ledger.unique_body_identity_count = 4; }],
  ['claim body drift', (p) => { p.capture.transport_ledger.body_changes_between_runs = 1; }],
  ['claim failed carrier request', (p) => { p.capture.failed_zero_request_execution.request_attempts = 1; }],
  ['claim failed carrier capture', (p) => { p.capture.failed_zero_request_execution.capture_directory_present = true; }],
  ['capture matrix mutation', (p) => { p.capture.authority_boundary.matrix_updates = 1; }],
  ['capture class closure', (p) => { p.capture.authority_boundary.class_closed = true; }],
  ['capture publication', (p) => { p.capture.authority_boundary.publication_effect = 'published'; }],
  ['drop source decision', (p) => p.source.decisions.pop()],
  ['increase source admissions', (p) => { p.source.summary.narrow_source_admissions = 5; }],
  ['decrease source observations', (p) => { p.source.summary.transport_observations = 9; }],
  ['admit runtime shell', (p) => { p.source.decisions.find((d) => d.route_id === 'RD04-W03-PPN-ND-001').source_admitted_for_narrow_scope = true; }],
  ['give shell visible text', (p) => { p.source.decisions.find((d) => d.route_id === 'RD04-W03-PPN-ND-001').html_review.visible_text_characters = 1; }],
  ['give shell candidate field', (p) => { p.source.decisions.find((d) => d.route_id === 'RD04-W03-PPN-ND-001').candidate_fields_for_offline_review.push('operative_state_implementation_authority_and_version'); }],
  ['drop transport observation', (p) => p.source.decisions[0].transport_observations.pop()],
  ['merge transport dates', (p) => { p.source.decisions[0].transport_observations[1].response_date = p.source.decisions[0].transport_observations[0].response_date; }],
  ['alter first body hash', (p) => { p.source.decisions[0].transport_observations[0].body_sha256 = 'a'.repeat(64); }],
  ['alter second response receipt', (p) => { p.source.decisions[0].transport_observations[1].response_receipt_sha256 = 'b'.repeat(64); }],
  ['double substantive weight', (p) => { p.source.decisions[0].substantive_weight_count = 2; }],
  ['source class closure', (p) => { p.source.authority_boundary.class_closed = true; }],
  ['drop PDF receipt', (p) => p.pdf.receipts.pop()],
  ['change rendered page count', (p) => { p.pdf.rendering.rendered_page_count = 7; }],
  ['deny complete visual review', (p) => { p.pdf.rendering.all_pages_visually_reviewed = false; }],
  ['drop PDF page review', (p) => p.pdf.receipts[0].page_reviews.pop()],
  ['unset page reviewed', (p) => { p.pdf.receipts[0].page_reviews[0].visually_reviewed = false; }],
  ['malform render hash', (p) => { p.pdf.receipts[0].page_reviews[0].render_sha256 = 'bad'; }],
  ['drop field decision', (p) => p.field.decisions.pop()],
  ['increase field candidates', (p) => { p.field.summary.evidence_complete_candidates = 5; }],
  ['decrease field holds', (p) => { p.field.summary.held_open_fields = 1; }],
  ['change terminal matrix cells', (p) => { p.field.frontier.terminal_matrix_cells_before = 223; }],
  ['change open substantive cells', (p) => { p.field.frontier.open_substantive_cells_before = 187; }],
  ['remove Montana authority candidate', (p) => { p.field.decisions[0].promotion_candidate = false; }],
  ['promote North Dakota authority', (p) => { const d=p.field.decisions.find((x)=>x.decision_id.includes('ND-OPERATIVE')); d.promotion_candidate=true; d.disposition='evidence_complete_bounded_finding'; }],
  ['change North Dakota authority disposition', (p) => { p.field.decisions.find((x)=>x.decision_id.includes('ND-OPERATIVE')).disposition='partial_support_hold_open'; }],
  ['invent current North Dakota waiver', (p) => { p.field.decisions.find((x)=>x.decision_id.includes('ND-ABAWD')).bounded_finding.current_post_period_state='none'; }],
  ['promote North Dakota waiver', (p) => { p.field.decisions.find((x)=>x.decision_id.includes('ND-ABAWD')).promotion_candidate=true; }],
  ['create field classification', (p) => { p.field.decisions[0].field_classification_effect='terminal'; }],
  ['create field terminalization', (p) => { p.field.decisions[0].substantive_field_terminalizations=1; }],
  ['field class closure', (p) => { p.field.authority_boundary.class_closed=true; }],
  ['candidate count drift', (p) => { p.candidate.candidate_count=3; }],
  ['candidate unique drift', (p) => { p.candidate.unique_candidate_cell_count=3; }],
  ['drop candidate row', (p) => p.candidate.candidates.pop()],
  ['alter candidate finding', (p) => { p.candidate.candidates[0].bounded_finding.finding_summary='widened'; }],
  ['increase followup route count', (p) => { p.followup.fixed_route_count=3; }],
  ['increase followup request ceiling', (p) => { p.followup.maximum_total_requests_in_later_separate_execution=3; }],
  ['claim exact URL overlap', (p) => { p.followup.url_exclusion_custody.selected_exact_overlap_count=1; }],
  ['claim normalized URL overlap', (p) => { p.followup.url_exclusion_custody.selected_normalized_overlap_count=1; }],
  ['alter followup URL', (p) => { p.followup.routes[0].requested_url='https://example.com/'; }],
  ['widen followup host', (p) => { p.followup.routes[0].expected_host='example.com'; }],
  ['increase followup attempts', (p) => { p.followup.routes[0].maximum_attempts=2; }],
  ['spawn followup request', (p) => { p.followup.routes[0].result_spawned_requests=1; }],
  ['followup source admission', (p) => { p.followup.authority_boundary.source_admissions_created=1; }],
  ['index matrix update', (p) => { p.index.matrix_summary.matrix_updates=1; }],
  ['index transport drift', (p) => { p.index.transport_summary.http_attempts=5; }],
  ['manifest path count drift', (p) => { p.manifest.permanent_path_count=15; }],
  ['manifest hash count drift', (p) => { p.manifest.hashed_file_count=12; }],
  ['drop manifest path', (p) => p.manifest.permanent_paths.pop()],
  ['malform manifest SHA-256', (p) => { p.manifest.hashed_files[0].sha256='bad'; }],
  ['malform manifest Git blob', (p) => { p.manifest.hashed_files[0].git_blob='bad'; }],
  ['manifest publication', (p) => { p.manifest.authority_boundary.publication_effect='published'; }],
];

let refused = 0;
for (const [name, mutate] of mutations) {
  const value = clone(baseline);
  mutate(value);
  let rejected = false;
  try {
    validateProduct(value);
  } catch {
    rejected = true;
  }
  if (!rejected) {
    throw new Error(`adversarial mutation admitted: ${name}`);
  }
  refused += 1;
}

console.log(JSON.stringify({
  adversarial_refusals: refused,
  baseline_candidate_count: baseline.candidate.candidate_count,
  baseline_field_decisions: baseline.field.decisions.length,
  baseline_followup_routes: baseline.followup.routes.length,
  baseline_transport_attempts: baseline.capture.transport_ledger.total_http_attempts,
}));
