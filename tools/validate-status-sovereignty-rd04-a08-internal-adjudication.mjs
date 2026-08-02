#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  a08Paths,
  MANIFEST_SCOPE,
  buildCore,
  buildReport,
  buildManifest
} from './build-status-sovereignty-rd04-a08-internal-adjudication.mjs';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(__filename), '..');
const EXPECTED_PARENT_RELEASE = 'a4be788259cd48235006d06b43271e61de625b72f2c7bb6d8663e63b82d520a3';
const EXPECTED_CONTROLS = [
  'A08-NC-01',
  'A08-NC-02',
  'A08-NC-03',
  'A08-NC-04',
  'A08-NC-05'
];

const readJson = (root, rel) => JSON.parse(fs.readFileSync(path.join(root, rel), 'utf8'));
const readText = (root, rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

function exactKeys(value, keys) {
  return value && typeof value === 'object' && !Array.isArray(value)
    && same(Object.keys(value).sort(), [...keys].sort());
}

export function loadA08(root = DEFAULT_ROOT) {
  return {
    receipt: readJson(root, a08Paths.receipt),
    adjudications: readJson(root, a08Paths.adjudications),
    supported: readJson(root, a08Paths.supported),
    rejected: readJson(root, a08Paths.rejected),
    failures: readJson(root, a08Paths.failures),
    controls: readJson(root, a08Paths.controls),
    core: readJson(root, a08Paths.core),
    manifest: readJson(root, a08Paths.manifest),
    schema: readJson(root, a08Paths.schema),
    parentCore: readJson(root, a08Paths.parentCore),
    parentManifest: readJson(root, a08Paths.parentManifest),
    report: readText(root, a08Paths.report),
    milestone: readText(root, a08Paths.milestone),
    workflow: readText(root, a08Paths.workflow)
  };
}

export function validateA08(root = DEFAULT_ROOT) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (!same(actual, expected)) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => { if (!condition) errors.push(label); };

  let context;
  try {
    context = loadA08(root);
  } catch (error) {
    return [`load failure: ${error.message}`];
  }

  const {
    receipt,
    adjudications,
    supported,
    rejected,
    failures,
    controls,
    core,
    manifest,
    schema,
    parentCore,
    parentManifest,
    report,
    milestone,
    workflow
  } = context;

  eq(parentCore.execution_id, 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A07', 'A07 parent execution');
  eq(parentCore.issue, 739, 'A07 parent issue');
  eq(parentCore.counts?.same_shn_explicit_language_candidates, 0, 'A07 same-SHN candidate denominator');
  eq(parentCore.counts?.official_case_joined_machine_candidates, 0, 'A07 official candidate denominator');
  eq(parentCore.counts?.official_selected_urls, 347, 'A07 frozen selected URL denominator');
  eq(parentCore.counts?.official_successful_bodies, 346, 'A07 successful URL denominator');
  eq(parentCore.counts?.official_unresolved_urls, 1, 'A07 unresolved URL denominator');
  eq(parentCore.counts?.verified_public_implementation_receipts, 0, 'A07 implementation receipt ceiling');
  eq(parentCore.counts?.verified_public_restoration_receipts, 0, 'A07 restoration receipt ceiling');
  eq(parentCore.current_result?.terminal_state, 'bounded_public_search_complete_no_verified_implementation_or_restoration_receipt', 'A07 terminal receipt');
  eq(parentCore.current_result?.missing_public_receipt_is_noncompliance, false, 'A07 missing-public-material boundary');
  eq(parentManifest.combined_sha256, EXPECTED_PARENT_RELEASE, 'A07 parent release manifest');

  eq(receipt.schema_version, 'ssc-rd04-a08-execution-receipt@1', 'receipt schema');
  eq(receipt.execution_id, 'SSC-RD04-INTERNAL-ADJUDICATION-A08', 'receipt execution');
  eq(receipt.issue, 765, 'receipt issue');
  eq(receipt.status, 'pass', 'receipt status');
  check(exactKeys(receipt.parent, [
    'a07_merge',
    'a07_product_commit',
    'a07_release_sha256',
    'a07_postmerge_proof_run',
    'a07_postmerge_proof_artifact',
    'a07_postmerge_proof_artifact_sha256'
  ]), 'receipt parent closed shape');
  eq(receipt.parent.a07_merge, '281f2c5ef735d3e2a744f5977061c7c36b97a8a9', 'receipt A07 merge');
  eq(receipt.parent.a07_product_commit, 'ffbbbf832a264b15f7c10cf9f6c4ff407134e01c', 'receipt A07 product');
  eq(receipt.parent.a07_release_sha256, EXPECTED_PARENT_RELEASE, 'receipt A07 release');
  eq(receipt.parent.a07_postmerge_proof_run, 30757174885, 'receipt A07 proof run');
  eq(receipt.parent.a07_postmerge_proof_artifact, 8836293666, 'receipt A07 proof artifact');
  eq(receipt.parent.a07_postmerge_proof_artifact_sha256, '9ef3c023e4a9298f872a4caf30c9b7a750f731f1a0f49d3d58763087d3aac912', 'receipt A07 proof digest');

  eq(receipt.execution?.workflow_run, 30757694731, 'A08 execution run');
  eq(receipt.execution?.workflow_head, '8d9a88dde2f1eea8479581afa8a9a078b1f4eae6', 'A08 execution head');
  eq(receipt.execution?.adjudicator_git_blob_sha1, '8eabfb3ebfd5b72adb7bf79c80b18f9424e72cfc', 'A08 adjudicator blob');
  eq(receipt.execution?.artifact_id, 8836465511, 'A08 artifact id');
  eq(receipt.execution?.artifact_bytes, 452793089, 'A08 artifact bytes');
  eq(receipt.execution?.artifact_sha256, '9d162a877cdba4a42884a25825ee7368ca26f864ef0934ad03bee48dffd8d0d6', 'A08 artifact digest');
  eq(receipt.execution?.summary_git_blob_sha1, '52c599c35d1092cbb7321c0e8cd37add3d0fa0dd', 'A08 summary blob');

  for (const key of [
    'same_shn_decision_candidates',
    'official_page_candidates',
    'total_machine_candidates',
    'adjudicated_candidates',
    'internally_supported_public_completed_action_receipts',
    'internally_supported_public_restoration_receipts',
    'rejected_or_unresolved_candidates',
    'negative_control_failures',
    'source_or_structure_failures',
    'external_contacts',
    'external_reviews',
    'graph_effects'
  ]) eq(receipt.counts?.[key], 0, `receipt zero count ${key}`);
  eq(receipt.counts?.negative_controls, 5, 'receipt negative-control denominator');

  check(Array.isArray(adjudications), 'adjudications ledger array');
  check(Array.isArray(supported), 'supported ledger array');
  check(Array.isArray(rejected), 'rejected ledger array');
  check(Array.isArray(failures), 'failure ledger array');
  eq(adjudications.length, 0, 'adjudications ledger denominator');
  eq(supported.length, 0, 'supported receipt denominator');
  eq(rejected.length, 0, 'rejected or unresolved denominator');
  eq(failures.length, 0, 'failure ledger denominator');

  check(Array.isArray(controls), 'negative-control ledger array');
  eq(controls.length, 5, 'negative-control ledger denominator');
  eq(controls.map((row) => row.control_id), EXPECTED_CONTROLS, 'negative-control identities');
  for (const control of controls) {
    eq(control.pass, true, `${control.control_id} pass state`);
    eq(control.observed, control.expected, `${control.control_id} expected result`);
  }

  const expectedCore = buildCore(root);
  eq(core, expectedCore, 'deterministic core projection');
  eq(core.status, 'complete_internal_zero_candidate_adjudication_public_source_refresh_open', 'core status');
  eq(core.current_result?.terminal_state, 'internal_zero_candidate_adjudication_complete_public_source_refresh_pending', 'core terminal state');
  eq(core.candidate_denominator?.admitted_machine_candidates, 0, 'core candidate denominator');
  eq(core.current_result?.internal_adjudication_complete, true, 'internal adjudication completion');
  eq(core.current_result?.public_source_refresh_complete, false, 'public refresh completion boundary');
  eq(core.public_source_refresh?.refresh_attempts, 0, 'public refresh attempt denominator');
  eq(core.public_source_refresh?.refresh_terminal_receipts, 0, 'public refresh receipt denominator');
  eq(core.public_source_refresh?.unresolved_source_is_noncompliance, false, 'unresolved source semantics');

  for (const key of [
    'external_contacts',
    'external_reviews',
    'case_level_implementation_joins',
    'complete_restoration_findings',
    'remedy_timeliness_findings',
    'residual_class_closures',
    'reviewed_disposition_changes',
    'prevalence_findings',
    'racial_order_findings',
    'coordination_findings',
    'common_purpose_findings'
  ]) eq(core.authority?.[key], 0, `authority zero ${key}`);
  eq(core.authority?.outside_human_dependency, false, 'outside-human dependency');
  for (const key of ['graph_effect', 'publication_effect', 'adoption_effect']) eq(core.authority?.[key], 'none', `authority ${key}`);

  eq(core.boundaries?.same_shn_alone_proves_claimant_identity, false, 'same-SHN identity boundary');
  eq(core.boundaries?.official_page_string_hit_proves_case_specific_implementation, false, 'official-page boundary');
  eq(core.boundaries?.internally_supported_receipt_requires_exact_source_and_two_independent_rules, true, 'two-rule promotion contract');
  eq(core.boundaries?.missing_public_material_is_noncompliance, false, 'missing-public-material boundary');
  eq(core.boundaries?.internal_adjudication_is_external_review, false, 'external-review boundary');
  eq(core.boundaries?.project_blocking, false, 'project-blocking boundary');

  check(schema.additionalProperties === false, 'schema top-level closed shape');
  eq(schema.properties?.schema_version?.const, 'ssc-rd04-a08-core@1', 'schema core identity');
  eq(schema.properties?.candidate_denominator?.properties?.admitted_machine_candidates?.const, 0, 'schema candidate ceiling');
  eq(schema.properties?.adjudication?.properties?.internally_supported_public_completed_action_receipts?.const, 0, 'schema supported receipt ceiling');
  eq(schema.properties?.public_source_refresh?.properties?.complete?.const, false, 'schema refresh boundary');
  eq(schema.properties?.authority?.properties?.external_contacts?.const, 0, 'schema external contact ceiling');
  eq(schema.properties?.boundaries?.properties?.missing_public_material_is_noncompliance?.const, false, 'schema absence semantics');

  const expectedReport = buildReport(core);
  eq(report, expectedReport, 'deterministic report projection');
  check(report.includes('noindex,nofollow,noarchive'), 'held report robots boundary');
  check(report.includes('zero case-joined machine candidates'), 'held report zero-candidate statement');
  check(report.includes('remains open'), 'held report refresh-open statement');

  check(milestone.includes('same-SHN decision candidates:                    0'), 'milestone candidate denominator');
  check(milestone.includes('A08 refresh attempts:               0'), 'milestone refresh state');
  check(milestone.includes('missing public source into noncompliance'), 'milestone absence boundary');

  check(workflow.includes('permissions:\n  contents: read'), 'workflow read-only permission');
  check(!workflow.includes('contents: write'), 'workflow write permission forbidden');
  check(workflow.includes('node tools/validate-no-magic-human-gate.mjs'), 'workflow no-magic-human gate');
  check(workflow.includes(`node ${a08Paths.builder}`), 'workflow deterministic builder');
  check(workflow.includes(`node ${a08Paths.validator}`), 'workflow focused validator');
  check(workflow.includes(`node ${a08Paths.test}`), 'workflow adversarial suite');
  check(workflow.includes('git diff --exit-code'), 'workflow deterministic drift refusal');

  const expectedManifest = buildManifest(root);
  eq(manifest, expectedManifest, 'exact-byte release manifest');
  eq(manifest.entries?.length, MANIFEST_SCOPE.length, 'manifest entry denominator');
  eq(manifest.self_included, false, 'manifest self-exclusion');
  eq(manifest.boundaries?.missing_public_material_is_noncompliance, false, 'manifest absence semantics');
  eq(manifest.boundaries?.internal_adjudication_is_external_review, false, 'manifest review boundary');
  eq(manifest.boundaries?.graph_effect, 'none', 'manifest graph boundary');

  return errors;
}

function main() {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_ROOT;
  const errors = validateA08(root);
  if (errors.length) {
    console.error(`validate-status-sovereignty-rd04-a08-internal-adjudication: ${errors.length} error(s)`);
    for (const error of errors) console.error(`- ${error}`);
    process.exit(1);
  }
  console.log('validate-status-sovereignty-rd04-a08-internal-adjudication: PASS — zero admitted candidates, zero supported receipts, refresh pending, zero authority escalation');
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (invoked) main();
