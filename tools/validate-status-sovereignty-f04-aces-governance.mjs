#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { computeAcesGovernanceManifest } from './build-status-sovereignty-f04-aces-governance.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));

export function loadAcesGovernanceContext() {
  return {
    record: read('data/intake/status-sovereignty-f04-aces-governance-first-pass.json'),
    schema: read('schemas/status-sovereignty-governance-denominator-first-pass.schema.json'),
    manifest: read('data/project/status-sovereignty-f04-aces-governance-first-pass-release-manifest.json'),
    buildManifest: read('build/core-thesis/status-sovereignty/f04-aces/manifest.json'),
    buildReport: read('build/core-thesis/status-sovereignty/f04-aces/data.json'),
    publicReport: read('reports/core-thesis/status-sovereignty/f04-aces/data.json'),
    html: fs.readFileSync(path.join(root, 'reports/core-thesis/status-sovereignty/f04-aces/index.html'), 'utf8')
  };
}

export function validateAcesGovernance(c = loadAcesGovernanceContext()) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => {
    if (!condition) errors.push(label);
  };
  const { record, schema, manifest, buildManifest, buildReport, publicReport, html } = c;

  eq(record.schema_version, 'status-sovereignty-governance-denominator-first-pass@1', 'ACES schema');
  eq(record.hypothesis_id, 'SSC-H01', 'ACES hypothesis');
  eq(record.issue, 544, 'ACES issue');
  eq(record.observation_id, 'SSC-OBS-0018', 'ACES observation');
  eq(record.lane_id, 'SSC-F04', 'ACES lane');
  eq(record.as_of, '2026-07-31', 'ACES date');
  eq(record.status, 'complete_published_roster_and_advisory_authority_recovered_neutrality_mechanism_not_established', 'ACES status');
  eq(record.authority, 'source_acquisition_only_not_review_or_adjudication', 'ACES authority');

  eq(record.selection_contract?.selected_institution, 'Advisory Committee on Excellence in Space', 'ACES selected institution');
  check(record.selection_contract?.declared_universe?.includes('Federal advisory committees'), 'ACES declared universe missing');
  check(record.selection_contract?.selection_reason?.includes('complete inaugural roster'), 'ACES selection reason missing');
  eq(record.selection_contract?.selected_because_expected_to_show_tokenism_or_neutrality, false, 'ACES target-first boundary');

  const expectedSourceIds = ['SSC-F04-ACES-S001', 'SSC-F04-ACES-S002', 'SSC-F04-ACES-S003', 'SSC-F04-ACES-S004'];
  eq(record.sources?.length, 4, 'ACES source denominator');
  eq(JSON.stringify(record.sources?.map((row) => row.source_id)), JSON.stringify(expectedSourceIds), 'ACES source order');
  eq(new Set(record.sources?.map((row) => row.source_id)).size, 4, 'ACES source ID uniqueness');
  eq(new Set(record.sources?.map((row) => row.url)).size, 4, 'ACES source URL uniqueness');
  for (const source of record.sources ?? []) {
    check(source.url.startsWith('https://'), `${source.source_id}: source URL must be HTTPS`);
    check(['NOAA Office of Space Commerce', 'U.S. General Services Administration'].includes(source.publisher), `${source.source_id}: nonofficial publisher`);
    check(Array.isArray(source.retrieved_facts) && source.retrieved_facts.length >= 3, `${source.source_id}: recovered facts missing`);
  }

  const denominator = record.governance_denominator ?? {};
  eq(denominator.published_inaugural_members, 17, 'ACES member denominator');
  eq(denominator.published_member_names_and_affiliations, true, 'ACES roster custody');
  eq(denominator.published_charter_and_function, true, 'ACES charter custody');
  eq(denominator.formal_authority, 'advice_and_recommendations', 'ACES formal authority');
  eq(denominator.binding_budget_authority_observed, false, 'ACES budget authority');
  eq(denominator.binding_licensing_authority_observed, false, 'ACES licensing authority');
  eq(denominator.binding_veto_or_stay_authority_observed, false, 'ACES veto authority');
  eq(denominator.committee_terminated, true, 'ACES termination record');
  eq(denominator.complete_nomination_and_rejection_denominator, false, 'ACES nomination denominator');
  eq(denominator.member_specific_exercised_authority_denominator, false, 'ACES exercised-authority denominator');
  eq(denominator.recommendation_adoption_and_outcome_denominator, false, 'ACES outcome denominator');

  const mechanism = record.mechanism_test ?? {};
  eq(mechanism.public_diversity_or_balance_claim_observed, true, 'ACES diversity claim');
  eq(mechanism.public_claim_that_representation_proves_neutrality_observed, false, 'ACES neutrality claim');
  eq(mechanism.representation_used_to_reject_patterned_exclusion_claim_observed, false, 'ACES representation seal');
  eq(mechanism.independent_multiracial_counterpower_established, false, 'ACES counterpower finding');
  eq(mechanism.tokenism_established, false, 'ACES tokenism finding');
  eq(mechanism.ordinary_advisory_representation_explanation_retained, true, 'ACES ordinary explanation');

  eq(record.open_denominators?.length, 6, 'ACES open denominator count');
  check(record.open_denominators?.every((row) => typeof row === 'string' && row.length > 20), 'ACES open denominator detail missing');

  const expectedResult = {
    terminal_state: 'requires_additional_acquisition',
    bounded_non_link_observed: true,
    representation_legitimacy_mechanism_supported: false,
    institutional_neutrality_proved: false,
    tokenism_finding: false,
    racial_hierarchy_finding: false,
    complete_compact_finding: false,
    graph_effect: 'none',
    publication_effect: 'none'
  };
  eq(JSON.stringify(record.current_result), JSON.stringify(expectedResult), 'ACES current result');
  for (const [key, value] of Object.entries(record.boundaries ?? {})) {
    if (key === 'graph_effect') eq(value, 'none', `ACES boundary ${key}`);
    else eq(value, false, `ACES boundary ${key}`);
  }

  eq(schema.properties?.schema_version?.const, 'status-sovereignty-governance-denominator-first-pass@1', 'ACES schema identity');
  eq(schema.properties?.issue?.const, 544, 'ACES schema issue');
  eq(schema.properties?.observation_id?.const, 'SSC-OBS-0018', 'ACES schema observation');
  eq(schema.properties?.lane_id?.const, 'SSC-F04', 'ACES schema lane');

  const expectedManifest = computeAcesGovernanceManifest();
  eq(JSON.stringify(manifest), JSON.stringify(expectedManifest), 'ACES exact-byte manifest');
  eq(JSON.stringify(buildManifest), JSON.stringify(manifest), 'ACES build manifest drift');
  eq(JSON.stringify(buildReport), JSON.stringify(publicReport), 'ACES build/public report drift');
  eq(buildReport.first_pass_id, 'SSC-F04-ACES-01', 'ACES report identity');
  eq(buildReport.counts?.source_records, 4, 'ACES report source count');
  eq(buildReport.counts?.published_inaugural_members, 17, 'ACES report member count');
  eq(buildReport.counts?.open_denominators, 6, 'ACES report open denominator count');
  eq(buildReport.counts?.bounded_non_links, 1, 'ACES report non-link count');
  for (const key of ['representation_legitimacy_findings', 'neutrality_findings', 'tokenism_findings', 'racial_hierarchy_findings', 'complete_compact_findings', 'graph_effects', 'publication_effects']) {
    eq(buildReport.counts?.[key], 0, `ACES report ${key}`);
  }
  eq(buildReport.release_manifest?.combined_sha256, manifest.combined_sha256, 'ACES report release digest');
  check(html.includes('BOUNDED NON-LINK'), 'ACES HTML non-link boundary missing');
  check(html.includes('NEUTRALITY NOT ESTABLISHED'), 'ACES HTML neutrality boundary missing');
  check(html.includes('TOKENISM NOT ESTABLISHED'), 'ACES HTML tokenism boundary missing');
  check(html.includes(manifest.combined_sha256), 'ACES HTML release digest missing');

  return errors;
}

function main() {
  const errors = validateAcesGovernance();
  if (errors.length) {
    console.error(`validate-status-sovereignty-f04-aces-governance: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-f04-aces-governance: PASS');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
