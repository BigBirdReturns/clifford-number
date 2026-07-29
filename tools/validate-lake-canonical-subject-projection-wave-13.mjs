#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-canonical-subject-projection-wave-13-policy.json';
const full = relative => path.join(root, relative);
const errors = [];
const fail = message => errors.push(message);

function readJson(relative) {
  try { return JSON.parse(fs.readFileSync(full(relative), 'utf8')); }
  catch (error) { fail(`${relative}: ${error.message}`); return null; }
}
function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}
function fingerprint(rows) {
  return sha256(Buffer.from((rows ?? []).map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));
}
function validateManifest(rows, label) {
  for (const row of rows ?? []) {
    if (!fs.existsSync(full(row.path))) { fail(`${label}: ${row.path} missing`); continue; }
    const bytes = fs.readFileSync(full(row.path));
    if (bytes.length !== row.bytes) fail(`${label}: ${row.path} byte length drift`);
    if (sha256(bytes) !== row.sha256) fail(`${label}: ${row.path} hash drift`);
  }
}

const policy = readJson(policyPath);
const projection = policy ? readJson(policy.projection_path) : null;
const plan = policy ? readJson(policy.plan_path) : null;
const reconciliation = policy && fs.existsSync(full(policy.reconciliation_path)) ? readJson(policy.reconciliation_path) : null;
const report = policy && fs.existsSync(full(policy.report_path)) ? fs.readFileSync(full(policy.report_path), 'utf8') : '';
const reconciliationReport = policy && fs.existsSync(full(policy.reconciliation_report_path)) ? fs.readFileSync(full(policy.reconciliation_report_path), 'utf8') : '';

if (policy?.schema_version !== 'lake-canonical-subject-projection-wave-13-policy@1') fail('unexpected Wave 13 policy schema');
if (projection?.schema_version !== 'canonical-subject-projection-wave-13@1') fail('unexpected Wave 13 projection schema');
if (plan?.schema_version !== 'canonical-subject-projection-wave-13-plan@1') fail('unexpected Wave 13 plan schema');
if (projection?.program_key !== policy?.program_key || plan?.program_key !== policy?.program_key) fail('Wave 13 program key drift');
if (projection?.source_fingerprint_sha256 !== fingerprint(projection?.input_manifest)) fail('Wave 13 projection fingerprint mismatch');
if (plan?.source_fingerprint_sha256 !== fingerprint(plan?.input_manifest)) fail('Wave 13 plan fingerprint mismatch');
if (projection?.source_fingerprint_sha256 !== plan?.source_fingerprint_sha256) fail('Wave 13 projection and plan fingerprints disagree');
validateManifest(projection?.source_claim_manifest, 'Wave 13 source claim manifest');

if (projection?.counts?.resolution_rows !== policy?.expected?.current_resolution_rows) fail('Wave 13 resolution row count drift');
if (projection?.counts?.resolution_registry_files !== policy?.expected?.current_resolution_registry_files) fail('Wave 13 registry file count drift');
if ((projection?.counts?.compiled_cases ?? 0) < policy?.expected?.minimum_compiled_cases) fail('Wave 13 compiled case count below minimum');
if ((projection?.counts?.case_claim_subject_references ?? 0) < policy?.expected?.minimum_case_claim_subject_references) fail('Wave 13 claim subject denominator below minimum');
if ((projection?.counts?.resolved_case_claim_subject_references ?? 0) < policy?.expected?.minimum_resolved_case_claim_subject_references) fail('Wave 13 resolved claim subject count below minimum');
if ((projection?.counts?.public_catalog_subjects ?? 0) < policy?.expected?.minimum_public_catalog_subjects) fail('Wave 13 public catalog subject count below minimum');
if ((projection?.counts?.reporter_briefings ?? 0) < policy?.expected?.minimum_reporter_briefings) fail('Wave 13 briefing count below minimum');
if (projection?.counts?.source_subject_id_changes !== 0) fail('Wave 13 source subject IDs changed');
if (projection?.counts?.source_claim_text_changes !== 0) fail('Wave 13 source claim text changed');
if (projection?.counts?.searchable_resolution_rows !== projection?.counts?.resolution_rows) fail('Wave 13 resolutions are not all searchable');
if (projection?.counts?.case_resolution_occurrences !== projection?.counts?.catalog_resolution_occurrences) fail('Wave 13 case/catalog resolution occurrence count drift');

for (const row of projection?.resolutions ?? []) {
  if (!(row.case_claim_ids?.length > 0)) fail(`${row.resolution_id}: compiled case occurrences missing`);
  if (!(row.catalog_claim_ids?.length > 0)) fail(`${row.resolution_id}: catalog occurrences missing`);
  if (!['canonical_id', 'canonical_alias'].includes(row.search_mode)) fail(`${row.resolution_id}: invalid search mode`);
  for (const field of ['source_subject_id_preserved', 'claim_text_preserved']) if (row[field] !== true) fail(`${row.resolution_id}: ${field} missing`);
  for (const field of ['source_records_mutated', 'source_records_merged', 'relationship_created', 'participation_created', 'accepted_cross_case_identity_bridge', 'automatic_cross_case_join_authorized', 'cross_case_graph_join_authorized', 'cross_case_hop_creation_authorized']) {
    if (row[field] !== false) fail(`${row.resolution_id}: ${field} must be false`);
  }
  if (row.graph_effect !== 'none') fail(`${row.resolution_id}: graph effect drift`);
}

for (const field of [
  'every_current_resolution_projected_into_compiled_cases',
  'every_current_resolution_projected_into_public_catalog',
  'every_current_resolution_searchable',
  'briefing_subjects_projected_for_selected_claims',
  'unresolved_subjects_visible',
  'source_subject_ids_preserved',
  'source_claim_text_preserved'
]) if (projection?.completion?.[field] !== true) fail(`Wave 13 completion ${field} missing`);
for (const field of [
  'source_records_mutated',
  'source_records_merged',
  'relationship_created',
  'participation_created',
  'automatic_cross_case_join_authorized',
  'cross_case_graph_join_authorized',
  'cross_case_hop_creation_authorized',
  'evidence_truth_determined',
  'publication_cleared'
]) if (projection?.completion?.[field] !== false) fail(`Wave 13 completion ${field} must be false`);
if (projection?.completion?.accepted_cross_case_identity_bridges !== 0) fail('Wave 13 accepted bridge count drift');
if (projection?.completion?.decisions_requiring_human_permission !== 0) fail('Wave 13 human-permission dependency drift');
if (projection?.completion?.graph_effect !== 'none') fail('Wave 13 graph effect drift');

if (!report.includes('searchable resolution rows:')) fail('Wave 13 report lacks search projection census');
if (!report.includes('source subject-ID changes:                0')) fail('Wave 13 report lacks source-ID preservation boundary');

if (reconciliation) {
  if (reconciliation.schema_version !== 'canonical-subject-projection-wave-13-reconciliation@1') fail('unexpected Wave 13 reconciliation schema');
  if (reconciliation.program_key !== policy.program_key) fail('Wave 13 reconciliation program key drift');
  if (reconciliation.source_fingerprint_sha256 !== fingerprint(reconciliation.input_manifest)) fail('Wave 13 reconciliation fingerprint mismatch');
  if (reconciliation.counts.resolution_rows !== policy.expected.current_resolution_rows) fail('Wave 13 reconciliation resolution count drift');
  for (const field of [
    'resolution_ids_source_observed',
    'resolution_ids_compiled_case_observed',
    'resolution_ids_public_catalog_observed',
    'resolution_ids_surface_search_observed',
    'resolution_ids_wave13_projection_observed'
  ]) if (reconciliation.counts[field] !== policy.expected.current_resolution_rows) fail(`Wave 13 reconciliation ${field} drift`);
  if (reconciliation.counts.source_subject_id_changes !== 0 || reconciliation.counts.source_claim_text_changes !== 0) fail('Wave 13 reconciliation source mutation drift');
  if (reconciliation.counts.participation_delta !== 0 || reconciliation.counts.active_claim_delta !== 0 || reconciliation.counts.graph_edge_delta !== 0) fail('Wave 13 reconciliation graph payload drift');
  for (const field of [
    'every_resolution_id_source_and_index_observed',
    'every_resolution_id_compiled_case_and_index_observed',
    'every_resolution_id_public_catalog_and_index_observed',
    'every_resolution_id_surface_search_and_index_observed',
    'every_resolution_id_wave13_projection_and_index_observed',
    'briefing_subjects_projected_for_selected_claims',
    'unresolved_subjects_visible',
    'source_subject_ids_preserved',
    'source_claim_text_preserved',
    'post_execution_reconciliation_complete'
  ]) if (reconciliation.completion?.[field] !== true) fail(`Wave 13 reconciliation completion ${field} missing`);
  for (const field of [
    'source_records_mutated',
    'source_records_merged',
    'relationship_created',
    'participation_created',
    'automatic_cross_case_join_authorized',
    'cross_case_graph_join_authorized',
    'cross_case_hop_creation_authorized',
    'evidence_truth_determined',
    'publication_cleared'
  ]) if (reconciliation.completion?.[field] !== false) fail(`Wave 13 reconciliation completion ${field} must be false`);
  if (reconciliation.completion.accepted_cross_case_identity_bridges !== 0) fail('Wave 13 reconciliation bridge count drift');
  if (reconciliation.completion.decisions_requiring_human_permission !== 0) fail('Wave 13 reconciliation human-permission drift');
  if (reconciliation.completion.graph_effect !== 'none') fail('Wave 13 reconciliation graph effect drift');
  if (!reconciliationReport.includes('participation / active-claim / hop delta:0 / 0 / 0')) fail('Wave 13 reconciliation report lacks zero-delta boundary');
}

for (const [key, value] of Object.entries(policy?.boundaries ?? {})) {
  if (key === 'graph_effect') {
    if (value !== 'none') fail(`Wave 13 policy boundary ${key} drift`);
  } else if (value !== false) fail(`Wave 13 policy boundary ${key} must be false`);
}

if (errors.length) {
  console.error(`canonical subject projection Wave 13 validation failed with ${errors.length} error(s):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('canonical subject projection Wave 13 validation: OK');
console.log(`  resolutions / case occurrences / catalog occurrences: ${projection.counts.resolution_rows} / ${projection.counts.case_resolution_occurrences} / ${projection.counts.catalog_resolution_occurrences}`);
console.log(`  resolved / unresolved subject references: ${projection.counts.resolved_case_claim_subject_references} / ${projection.counts.unresolved_case_claim_subject_references}`);
console.log(`  source subject/text changes: ${projection.counts.source_subject_id_changes} / ${projection.counts.source_claim_text_changes}`);
console.log('  relationship, participation, graph, hop, and human-permission effects: 0');
