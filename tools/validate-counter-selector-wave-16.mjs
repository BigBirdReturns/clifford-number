#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const fail = (message) => { throw new Error(message); };
const assert = (condition, message) => { if (!condition) fail(message); };

export function validateContract(contract) {
  assert(contract.schema_version === 'counter-selector-targeted-receipt-acquisition@1', 'schema version');
  assert(contract.program_id === 'counter-selector-v1', 'program');
  assert(contract.wave_id === 'CS-W16-TR-01', 'wave');
  assert(contract.status === 'targeted_receipts_acquired_four_person_support_updates_no_field_test', 'status');
  assert(contract.publication_status === 'staged_nonpublic_source_custody', 'publication status');
  assert(/^[0-9a-f]{40}$/.test(contract.parent_main_sha), 'parent main sha');
  assert(/^[0-9a-f]{64}$/.test(contract.parent_release_sha256), 'parent release sha');

  const c = contract.counts;
  const expected = {
    person_near_hits_audited: 3,
    targeted_source_records: 10,
    full_text_or_official_record_sources: 7,
    route_only_sources: 3,
    independent_source_adjudications: 1,
    new_person_bounded_supports: 4,
    person_attributable_bounded_supports_total: 11,
    person_attributable_near_hits: 3,
    external_selector_reviews: 0,
    complete_operator_findings: 0,
    field_test_eligible_candidates: 0,
    contacts_authorized: 0,
    promotions: 0,
    person_rankings: 0,
    public_identity_releases: 0,
    graph_effects: 0,
    adversarial_mutations: 36
  };
  for (const [key, value] of Object.entries(expected)) assert(c[key] === value, `count ${key}`);

  assert(Array.isArray(contract.candidate_updates) && contract.candidate_updates.length === 3, 'three candidates');
  assert(Array.isArray(contract.sources) && contract.sources.length === 10, 'ten sources');
  assert(new Set(contract.sources.map((row) => row.source_id)).size === 10, 'unique source ids');
  assert(new Set(contract.candidate_updates.map((row) => row.candidate_id)).size === 3, 'unique candidates');

  const byId = Object.fromEntries(contract.candidate_updates.map((row) => [row.candidate_id, row]));
  assert(Object.keys(byId).sort().join(',') === 'CS-C0005,CS-C0016,CS-C0019', 'candidate set');

  const olivieri = byId['CS-C0005'];
  assert(olivieri.source_identity === 'Nancy Olivieri', 'olivieri identity');
  assert(olivieri.new_supported_dimensions.join(',') === 'custody,model_elasticity,governed_capacity', 'olivieri new supports');
  assert(olivieri.supported_dimensions_after_update.length === 6, 'olivieri support total');
  assert(olivieri.unresolved_dimensions.join(',') === 'support_adjusted_surplus,cross_domain_transfer', 'olivieri unresolved');
  assert(olivieri.receipt_findings.length === 3, 'olivieri receipts');
  assert(olivieri.support_context.substantial_support_observed === true, 'olivieri support context');
  assert(olivieri.support_context.support_adjusted_surplus_established === false, 'olivieri no surplus');
  assert(olivieri.external_second_party_review_ready === true, 'olivieri review ready');

  const iglesias = byId['CS-C0016'];
  assert(iglesias.source_identity === 'David Iglesias', 'iglesias identity');
  assert(iglesias.new_supported_dimensions.length === 0, 'iglesias no new support');
  assert(iglesias.supported_dimensions_after_update.length === 2, 'iglesias support total');
  assert(iglesias.external_second_party_review_ready === false, 'iglesias not review ready');

  const richardson = byId['CS-C0019'];
  assert(richardson.source_identity === 'Elliot Richardson', 'richardson identity');
  assert(richardson.new_supported_dimensions.join(',') === 'non_zero_sum_orientation', 'richardson new support');
  assert(richardson.supported_dimensions_after_update.length === 3, 'richardson support total');
  assert(richardson.external_second_party_review_ready === true, 'richardson review ready');
  assert(richardson.receipt_findings.length === 2, 'richardson receipts');
  assert(richardson.receipt_findings[0].dimension === 'non_zero_sum_orientation', 'richardson orientation receipt');
  assert(richardson.receipt_findings[0].state === 'bounded_support_individual_independent_authority_design_scope', 'richardson orientation state');
  assert(richardson.receipt_findings[1].dimension === 'custody', 'richardson custody receipt');
  assert(richardson.receipt_findings[1].state === 'no_new_support_successor_continuity_not_attributable_handoff', 'richardson no direct handoff');

  const totalNew = contract.candidate_updates.reduce((sum, row) => sum + row.new_supported_dimensions.length, 0);
  const totalSupported = contract.candidate_updates.reduce((sum, row) => sum + row.supported_dimensions_after_update.length, 0);
  assert(totalNew === 4, 'four new supports');
  assert(totalSupported === 11, 'eleven total person supports');

  for (const row of contract.candidate_updates) {
    assert(row.complete_operator_finding === false, `${row.candidate_id} no operator`);
    assert(row.field_test_eligible === false, `${row.candidate_id} no field test`);
    assert(row.contact_authorized === false, `${row.candidate_id} no contact`);
    assert(row.graph_effect === 'none', `${row.candidate_id} no graph`);
    assert(row.support_context.support_adjusted_surplus_established === false, `${row.candidate_id} no surplus`);
    assert(row.unresolved_dimensions.length > 0, `${row.candidate_id} unresolved`);
    assert(row.receipt_findings.every((finding) => finding.basis && finding.ceiling && finding.source_ids.length), `${row.candidate_id} receipt completeness`);
  }

  const routeCount = contract.sources.filter((row) => row.record_state.includes('route') || row.record_state.includes('locator')).length;
  assert(routeCount === 3, 'three route or locator sources');
  assert(contract.sources.every((row) => row.supports.length && row.limits.length), 'source limits');
  assert(contract.boundaries.independent_source_inquiry_is_external_selector_review === false, 'source review boundary');
  assert(contract.boundaries.safe_patient_transition_is_independent_project_handoff === false, 'handoff boundary');
  assert(contract.boundaries.successor_institutional_continuity_is_direct_person_handoff === false, 'continuity boundary');
  assert(contract.boundaries.new_bounded_support_is_field_test_eligibility === false, 'field test boundary');
  assert(contract.boundaries.supported_dimension_count_is_rank === false, 'rank boundary');
  assert(contract.boundaries.contact_authorized === false, 'contact boundary');
  assert(contract.boundaries.field_test_authorized === false, 'field test authorization boundary');
  assert(contract.boundaries.promotion_authorized === false, 'promotion boundary');
  assert(contract.boundaries.person_ranking_authorized === false, 'ranking authorization boundary');
  assert(contract.boundaries.public_identity_release_authorized === false, 'identity release boundary');
  assert(contract.boundaries.graph_effect === 'none', 'graph boundary');
  return true;
}

export function validateProducts() {
  const contract = read('data/project/counter-selector-wave-16-targeted-receipts.json');
  validateContract(contract);
  const registry = read('data/project/counter-selector-targeted-receipt-registry.json');
  const report = read('reports/core-thesis/counter-selector-wave-16/data.json');
  const manifest = read('data/project/counter-selector-wave-16-release-manifest.json');
  assert(registry.counts.new_person_bounded_supports === 4, 'registry support count');
  assert(report.counts.person_attributable_bounded_supports_total === 11, 'report total support');
  assert(report.release_manifest.combined_sha256 === manifest.combined_sha256, 'manifest link');
  assert(/^[0-9a-f]{64}$/.test(manifest.combined_sha256), 'manifest digest');
  assert(manifest.boundaries.manifest_authorizes_field_test === false, 'manifest field test boundary');
  assert(manifest.boundaries.manifest_authorizes_contact === false, 'manifest contact boundary');
  return true;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  validateProducts();
  console.log('validate-counter-selector-wave-16: contract and products valid');
}
