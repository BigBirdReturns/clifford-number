#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  PRODUCT_ROOT,
  EXECUTION_RECEIPT_PATH,
  CONSTITUTION_PATH,
  WAVE01_PATH,
  SEED_PATH,
  CLOSURE_REFERENCE_PATH,
  WAVE02_PROGRESS_PATH,
  PROVENANCE_INDEX_PATH,
  deriveProduct,
  validateInputs
} from './build-status-sovereignty-rd-wave02-rd04-version-history.mjs';

export { ROOT, PRODUCT_ROOT, EXECUTION_RECEIPT_PATH, CONSTITUTION_PATH, WAVE01_PATH, SEED_PATH, CLOSURE_REFERENCE_PATH, WAVE02_PROGRESS_PATH, PROVENANCE_INDEX_PATH };
export const CLASS_SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave02-rd04-version-history.schema.json';
export const PROGRESS_SCHEMA_PATH = 'schemas/status-sovereignty-residual-denominator-wave-02-progress.schema.json';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const read = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const unique = (values, message) => ok(new Set(values).size === values.length, message);

export function readBundle(root = ROOT) {
  return {
    receipt: read(root, EXECUTION_RECEIPT_PATH),
    constitution: read(root, CONSTITUTION_PATH),
    wave01: read(root, WAVE01_PATH),
    seed: read(root, SEED_PATH),
    relationship: read(root, `${PRODUCT_ROOT}/relationship-edge-ledger.json`),
    intervals: read(root, `${PRODUCT_ROOT}/operative-interval-ledger.json`),
    gaps: read(root, `${PRODUCT_ROOT}/source-gap-ledger.json`),
    dates: read(root, `${PRODUCT_ROOT}/instrument-date-ledger.json`),
    classReceipt: read(root, `${PRODUCT_ROOT}/class-receipt.json`),
    summary: read(root, `${PRODUCT_ROOT}/summary.json`),
    manifest: read(root, `${PRODUCT_ROOT}/manifest.json`),
    closureReference: read(root, CLOSURE_REFERENCE_PATH),
    progress: read(root, WAVE02_PROGRESS_PATH),
    provenance: read(root, PROVENANCE_INDEX_PATH)
  };
}

function schemaConstants(schema, expectedId, expectedVersion) {
  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === expectedId, 'schema id changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema root is not closed');
  ok(schema?.properties?.schema_version?.const === expectedVersion, 'schema version contract changed');
}

export function validateProductData(bundle, classSchema, progressSchema) {
  const product = {
    'relationship-edge-ledger.json': bundle.relationship,
    'operative-interval-ledger.json': bundle.intervals,
    'source-gap-ledger.json': bundle.gaps,
    'instrument-date-ledger.json': bundle.dates
  };
  validateInputs({ receipt: bundle.receipt, constitution: bundle.constitution, wave01: bundle.wave01, seed: bundle.seed, product });

  schemaConstants(
    classSchema,
    'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-rd-wave02-rd04-version-history.schema.json',
    'ssc-rd-wave02-rd04-class-receipt@1'
  );
  ok(classSchema?.properties?.terminal_state?.const === 'bounded_source_unavailable', 'class schema terminal state changed');
  ok(classSchema?.properties?.class_closed?.const === true, 'class schema closure changed');
  ok(classSchema?.properties?.counts?.additionalProperties === false, 'class count schema is open');
  ok(classSchema?.properties?.authority?.additionalProperties === false, 'class authority schema is open');
  ok(classSchema?.properties?.counts?.properties?.candidate_records_terminal?.const === 683, 'class schema candidate denominator changed');
  ok(classSchema?.properties?.residual_atlas_effect_if_promoted?.properties?.open_after?.const === 41, 'class schema atlas state changed');

  schemaConstants(
    progressSchema,
    'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-residual-denominator-wave-02-progress.schema.json',
    'status-sovereignty-residual-denominator-wave-02-progress@1'
  );
  ok(progressSchema?.properties?.counts?.properties?.closed_residual_classes?.const === 1, 'progress schema closed count changed');
  ok(progressSchema?.properties?.counts?.properties?.open_residual_classes?.const === 41, 'progress schema open count changed');
  ok(progressSchema?.properties?.selected_classes_not_adjudicated_by_this_receipt?.minItems === 5, 'progress schema cross-lane boundary changed');

  const receipt = bundle.receipt;
  const classReceipt = bundle.classReceipt;
  ok(classReceipt?.schema_version === 'ssc-rd-wave02-rd04-class-receipt@1', 'class receipt schema changed');
  ok(classReceipt?.wave_id === 'SSC-RD-W02' && classReceipt?.lane_id === 'RD-04' && classReceipt?.class_id === 'RD-04-C01', 'class receipt identity changed');
  ok(classReceipt?.issue === 789 && classReceipt?.class_label === 'current statutory, regulatory, and guidance version history after the 2025 law', 'class receipt label changed');
  ok(classReceipt?.terminal_state === 'bounded_source_unavailable' && classReceipt?.class_closed === true, 'class receipt terminal state changed');
  ok(Array.isArray(classReceipt?.closure_basis) && classReceipt.closure_basis.length === 5, 'closure basis changed');
  same(classReceipt?.bounded_source_gaps, bundle.gaps.source_gaps.map((row) => row.execution_unit_id), 'class receipt source gaps changed');
  same(classReceipt?.counts, receipt.counts, 'class receipt counts changed');
  same(classReceipt?.authority, receipt.authority, 'class receipt authority changed');
  same(classReceipt?.residual_atlas_effect_if_promoted, { canonical_classes_before: 42, open_before: 42, closed_before: 0, open_after: 41, closed_after: 1 }, 'class receipt atlas effect changed');

  const summary = bundle.summary;
  ok(summary?.schema_version === 'ssc-rd-wave02-rd04-terminal-chronology@1', 'summary schema changed');
  ok(summary?.wave_id === 'SSC-RD-W02' && summary?.lane_id === 'RD-04' && summary?.class_id === 'RD-04-C01' && summary?.issue === 789, 'summary identity changed');
  same(summary?.counts, receipt.counts, 'summary counts changed');
  same(summary?.boundaries, receipt.authority, 'summary boundaries changed');
  ok(summary?.current_result?.terminal_state === 'bounded_source_unavailable', 'summary terminal state changed');
  ok(summary?.current_result?.candidate_universe_frozen === true, 'candidate universe unfrozen');
  ok(summary?.current_result?.source_identity_adjudication_complete === true, 'source identity adjudication incomplete');
  ok(summary?.current_result?.relationship_event_adjudication_complete === true, 'relationship adjudication incomplete');
  ok(summary?.current_result?.operative_interval_adjudication_complete === true, 'interval adjudication incomplete');
  ok(summary?.current_result?.second_order_reference_triage_complete === true, 'second-order triage incomplete');
  ok(summary?.current_result?.version_edge_adjudication_complete === true && summary?.current_result?.class_closed === true, 'version history not terminal');
  ok(summary?.current_result?.outside_human_dependency === false && summary?.current_result?.project_blocking === false, 'human or project dependency introduced');
  ok(summary?.current_result?.graph_effect === 'none' && summary?.current_result?.publication_effect === 'none' && summary?.current_result?.adoption_effect === 'none', 'summary effect authority escalated');

  const manifest = bundle.manifest;
  ok(manifest?.schema_version === 'ssc-rd-wave02-rd04-terminal-chronology-manifest@1', 'manifest schema changed');
  ok(Array.isArray(manifest?.entries) && manifest.entries.length === 6, 'manifest entry denominator changed');
  same(manifest.entries.map((row) => row.path), ['class-receipt.json','instrument-date-ledger.json','operative-interval-ledger.json','relationship-edge-ledger.json','source-gap-ledger.json','summary.json'], 'manifest paths changed');
  ok(manifest?.combined_sha256 === 'b023737f4367bf1f54a1b792faf70d12f3ca5cf89f92a5c0d16169665806b79b', 'manifest combined digest changed');

  const closure = bundle.closureReference;
  ok(closure?.schema_version === 'ssc-residual-denominator-wave02-class-closure-reference@1', 'closure reference schema changed');
  ok(closure?.wave_issue === 785 && closure?.child_issue === 789 && closure?.source_pr === 804, 'closure reference custody changed');
  ok(closure?.class_id === 'RD-04-C01' && closure?.lane_id === 'RD-04', 'closure reference identity changed');
  ok(closure?.terminal_state === 'bounded_source_unavailable' && closure?.class_closed === true, 'closure reference state changed');
  same(closure?.residual_atlas_effect, classReceipt.residual_atlas_effect_if_promoted, 'closure reference atlas effect changed');
  same(closure?.authority, classReceipt.authority, 'closure reference authority changed');
  ok(closure?.product?.manifest_combined_sha256 === manifest.combined_sha256, 'closure reference manifest changed');
  ok(closure?.terminal_execution?.artifact_zip_sha256 === receipt.execution.artifact_zip_sha256, 'closure execution artifact changed');
  ok(closure?.terminal_execution?.provenance_index_path === PROVENANCE_INDEX_PATH, 'closure provenance binding changed');

  const progress = bundle.progress;
  ok(progress?.schema_version === 'status-sovereignty-residual-denominator-wave-02-progress@1', 'progress schema changed');
  ok(progress?.wave_id === 'SSC-RD-W02' && progress?.hypothesis_id === 'SSC-H01' && progress?.issue === 785, 'progress identity changed');
  ok(progress?.authority === 'one_terminal_class_receipt_promoted_without_cross_lane_empirical_authority', 'progress authority changed');
  ok(Array.isArray(progress?.promoted_class_receipts) && progress.promoted_class_receipts.length === 1, 'one promoted class receipt required');
  const promoted = progress.promoted_class_receipts[0];
  ok(promoted?.class_id === 'RD-04-C01' && promoted?.terminal_state === 'bounded_source_unavailable' && promoted?.class_closed === true, 'promoted class receipt changed');
  ok(promoted?.manifest_combined_sha256 === manifest.combined_sha256, 'promoted manifest binding changed');
  ok(Array.isArray(progress?.selected_classes_not_adjudicated_by_this_receipt) && progress.selected_classes_not_adjudicated_by_this_receipt.length === 5, 'five cross-lane nonadjudications required');
  unique(progress.selected_classes_not_adjudicated_by_this_receipt.map((row) => row.class_id), 'duplicate unadjudicated class');
  ok(progress.selected_classes_not_adjudicated_by_this_receipt.every((row) => row.state_in_this_progress_object === 'not_adjudicated_by_rd04_receipt' && row.class_closed_by_this_progress_object === false), 'cross-lane authority shared');
  ok(progress?.counts?.closed_residual_classes === 1 && progress?.counts?.open_residual_classes === 41 && progress?.counts?.classes_closed_this_wave === 1, 'progress class accounting changed');
  for (const key of ['outside_human_dependencies','external_contacts','external_reviews','reviewed_disposition_changes','complete_compact_findings','racial_order_findings','prevalence_findings','coordination_findings','common_purpose_findings','graph_effects','publication_effects','adoption_effects']) ok(progress?.counts?.[key] === 0, `${key} changed`);
  ok(progress?.current_result?.classes_closed === 1 && progress?.current_result?.classes_open === 41 && progress?.current_result?.rd04_class_closed === true, 'progress result accounting changed');
  ok(progress?.current_result?.all_six_selected_classes_closed === false && progress?.current_result?.wave_complete === false, 'wave overclosed');
  ok(progress?.current_result?.outside_human_dependency === false && progress?.current_result?.project_blocking === false, 'progress human or project dependency changed');
  ok(progress?.current_result?.graph_effect === 'none' && progress?.current_result?.publication_effect === 'none' && progress?.current_result?.adoption_effect === 'none', 'progress effect authority escalated');
  for (const [name, value] of Object.entries(progress?.boundaries || {})) {
    if (name.endsWith('_effect')) ok(value === 'none', `${name} changed`);
    else ok(value === false, `${name} weakened`);
  }

  const provenance = bundle.provenance;
  ok(provenance?.schema_version === 'ssc-rd-wave02-rd04-provenance-index@1', 'provenance schema changed');
  ok(provenance?.branch === 'agent/ssc-rd-wave02-rd04-version-history', 'provenance branch changed');
  ok(Array.isArray(provenance?.receipts) && provenance.receipts.length === 18, 'eighteen provenance receipts required');
  unique(provenance.receipts.map((row) => row.path), 'duplicate provenance path');
  unique(provenance.receipts.map((row) => row.git_blob_sha), 'duplicate provenance blob');
  ok(provenance.receipts.every((row) => /^[0-9a-f]{40}$/.test(row.git_blob_sha) && typeof row.custody_role === 'string' && row.custody_role.length > 0), 'invalid provenance entry');
  ok(provenance?.seed?.path === SEED_PATH && provenance?.seed?.git_blob_sha === 'da55972dafee4417b9e492e64b4cd86633ee9396', 'seed provenance changed');
  ok(provenance?.temporary_workflows_retained === 0 && provenance?.transport_carriers_retained === 0, 'transport retained');

  return bundle;
}

function validateManifestBytes(root, manifest, receipt) {
  for (const entry of manifest.entries) {
    const bytes = readBytes(root, `${PRODUCT_ROOT}/${entry.path}`);
    ok(bytes.length === entry.bytes, `${entry.path}: byte count changed`);
    ok(sha256(bytes) === entry.sha256, `${entry.path}: digest changed`);
  }
  const combined = sha256(Buffer.from(manifest.entries.map((row) => `${row.path}\0${row.bytes}\0${row.sha256}\n`).join(''), 'utf8'));
  ok(combined === manifest.combined_sha256, 'manifest recomputation changed');
  ok(sha256(readBytes(root, `${PRODUCT_ROOT}/class-receipt.json`)) === receipt.execution.class_receipt_sha256, 'execution receipt class digest mismatch');
  ok(sha256(readBytes(root, `${PRODUCT_ROOT}/instrument-date-ledger.json`)) === receipt.execution.instrument_date_ledger_sha256, 'execution receipt date digest mismatch');
  ok(sha256(readBytes(root, `${PRODUCT_ROOT}/operative-interval-ledger.json`)) === receipt.execution.operative_interval_ledger_sha256, 'execution receipt interval digest mismatch');
  ok(sha256(readBytes(root, `${PRODUCT_ROOT}/relationship-edge-ledger.json`)) === receipt.execution.relationship_edge_ledger_sha256, 'execution receipt relationship digest mismatch');
  ok(sha256(readBytes(root, `${PRODUCT_ROOT}/source-gap-ledger.json`)) === receipt.execution.source_gap_ledger_sha256, 'execution receipt source-gap digest mismatch');
  ok(sha256(readBytes(root, `${PRODUCT_ROOT}/summary.json`)) === receipt.execution.summary_sha256, 'execution receipt summary digest mismatch');
}

function validateGitCustody(root, bundle) {
  const inside = spawnSync('git', ['rev-parse', '--is-inside-work-tree'], { cwd: root, encoding: 'utf8' });
  if (inside.status !== 0) return;

  const tracked = (patterns) => spawnSync('git', ['ls-files', '--', ...patterns], { cwd: root, encoding: 'utf8' }).stdout.trim().split('\n').filter(Boolean);
  const forbidden = tracked([
    ':(glob).rd04-*/**',
    ':(glob).github/workflows/temporary-ssc-rd-wave02-rd04-*',
    'tools/acquisition/status-sovereignty-rd-wave02-rd04',
    'test/status-sovereignty-rd-wave02-rd04-authority-units.test.js',
    'test/status-sovereignty-rd-wave02-rd04-cross-reference-v3.test.js',
    'test/status-sovereignty-rd-wave02-rd04-cross-reference.test.js',
    'test/status-sovereignty-rd-wave02-rd04-ecfr-api-correction.test.js',
    'test/status-sovereignty-rd-wave02-rd04-source-correction.test.js',
    'test/status-sovereignty-rd-wave02-rd04-source-plan.test.js',
    'test/status-sovereignty-rd-wave02-rd04-supplemental-acls.test.js',
    'test/status-sovereignty-rd-wave02-rd04-version-seed.test.js'
  ]);
  ok(forbidden.length === 0, `temporary or superseded RD-04 machinery retained: ${forbidden.join(', ')}`);

  for (const row of [...bundle.provenance.receipts, bundle.provenance.seed]) {
    const result = spawnSync('git', ['ls-files', '-s', '--', row.path], { cwd: root, encoding: 'utf8' });
    ok(result.status === 0 && result.stdout.trim().length > 0, `untracked provenance path: ${row.path}`);
    const observed = result.stdout.trim().split(/\s+/)[1];
    ok(observed === row.git_blob_sha, `${row.path}: provenance blob changed`);
  }

  const ancestry = spawnSync('git', ['merge-base', '--is-ancestor', 'c1997a1bfea3e214e2769df31f64f6fad6a4295c', 'HEAD'], { cwd: root });
  ok(ancestry.status === 0, 'frozen execution base is not an ancestor of HEAD');
}

export function validateProduct(root = ROOT) {
  const bundle = readBundle(root);
  const classSchema = read(root, CLASS_SCHEMA_PATH);
  const progressSchema = read(root, PROGRESS_SCHEMA_PATH);
  validateProductData(bundle, classSchema, progressSchema);

  const derived = deriveProduct(root);
  same(bundle.classReceipt, derived.classReceipt, 'class receipt deterministic drift');
  same(bundle.summary, derived.summary, 'summary deterministic drift');
  same(bundle.closureReference, derived.closureReference, 'closure reference deterministic drift');
  same(bundle.progress, derived.progress, 'Wave 02 progress deterministic drift');
  validateManifestBytes(root, bundle.manifest, bundle.receipt);
  validateGitCustody(root, bundle);

  console.log('validate-status-sovereignty-rd-wave02-rd04-version-history: 683/683 terminal, 7 edges, 7 intervals, 41 open / 1 closed, authority zero');
  return bundle;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    validateProduct();
  } catch (error) {
    console.error(`validate-status-sovereignty-rd-wave02-rd04-version-history: ${error.message}`);
    process.exit(1);
  }
}
