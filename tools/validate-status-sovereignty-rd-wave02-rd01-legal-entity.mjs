#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  ROOT,
  LANE_ROOT,
  SOURCE_ROOT,
  STAGE1_ZIP_PATH,
  BASE_ZIP_PATH,
  REPLAY_ZIP_PATH,
  ARTIFACT_INDEX_PATH,
  PRODUCT_ROOT,
  CLOSURE_PATH,
  MANIFEST_PATH,
  CLASS_RECEIPT_PATH,
  SUMMARY_PATH,
  SCHEMA_PATH,
  EXPECTED,
  PRODUCT_ENTRY_NAMES,
  readZipEntries,
  sha256
} from './build-status-sovereignty-rd-wave02-rd01-legal-entity.mjs';

const SCAFFOLD_PATH = `${LANE_ROOT}/roster-scaffold.json`;
const abs = (root, rel) => path.join(root, rel);
const read = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const bytes = (root, rel) => fs.readFileSync(abs(root, rel));
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (a, b, message) => ok(JSON.stringify(a) === JSON.stringify(b), message);
const unique = (values, message) => ok(new Set(values).size === values.length, message);

function exactKeys(value, keys, label) {
  ok(value && typeof value === 'object' && !Array.isArray(value), `${label} must be an object`);
  same(Object.keys(value).sort(), [...keys].sort(), `${label} keys changed`);
}

function assertAuthorityZero(authority, label, requireExternalCounts = true) {
  ok(authority?.outside_human_dependency === false, `${label}.outside_human_dependency changed`);
  if (requireExternalCounts) {
    ok(authority?.external_contacts === 0, `${label}.external_contacts changed`);
    ok(authority?.external_reviews === 0, `${label}.external_reviews changed`);
  }
  ok(authority?.denominator_widened === false, `${label}.denominator_widened changed`);
  for (const key of ['publication_effect','adoption_effect','graph_effect']) {
    ok(authority?.[key] === 'none', `${label}.${key} changed`);
  }
}

function verifyZip(root, rel, expected, label) {
  const archive = bytes(root, rel);
  ok(sha256(archive) === expected.zip_sha256, `${label} archive digest changed`);
  const entries = readZipEntries(archive);
  const manifest = JSON.parse(entries.get('manifest.json').toString('utf8'));
  ok(manifest.entries === expected.manifest_entries, `${label} manifest count changed`);
  ok(manifest.combined_sha256 === expected.manifest_sha256, `${label} manifest digest changed`);
  return entries;
}

export function validateRd01Shape({ scaffold, artifactIndex, protocol, failedUniverse, routeIndex, candidateIndex, terminal, comparison, summary, classReceipt, manifest, closure, schema }) {
  ok(scaffold?.schema_version === 'ssc-rd-wave02-rd01-roster-scaffold@1', 'scaffold schema changed');
  ok(scaffold?.class_id === 'RD-01-C03' && scaffold?.issue === 786, 'scaffold identity changed');
  ok(Array.isArray(scaffold?.rows) && scaffold.rows.length === 102, 'scaffold row denominator changed');
  unique(scaffold.rows.map((row) => row.row_id), 'scaffold duplicate row id');

  exactKeys(artifactIndex, ['schema_version','wave_id','class_id','issue','research_head','protocol_boundary','artifacts','authority'], 'artifact index');
  ok(artifactIndex.schema_version === 'ssc-rd01-wave02-legal-entity-artifact-index@1', 'artifact-index schema changed');
  ok(artifactIndex.wave_id === 'SSC-RD-W02' && artifactIndex.class_id === 'RD-01-C03' && artifactIndex.issue === 786, 'artifact-index identity changed');
  ok(artifactIndex.research_head === EXPECTED.research_head, 'research head custody changed');
  same(artifactIndex.protocol_boundary, {
    frozen_rows: 102,
    stage1_fixed_routes: 205,
    stage2_fixed_routes: 612,
    failed_route_replay_routes: 114,
    automatic_third_pass_authorized: false
  }, 'artifact protocol boundary changed');
  ok(Array.isArray(artifactIndex.artifacts) && artifactIndex.artifacts.length === 3, 'three source artifacts required');
  same(artifactIndex.artifacts.map((row) => row.artifact_id), [EXPECTED.stage1.artifact_id, EXPECTED.base.artifact_id, EXPECTED.replay.artifact_id], 'artifact IDs changed');
  assertAuthorityZero(artifactIndex.authority, 'artifact index authority');

  ok(protocol?.schema_version === 'ssc-rd01-wave02-failed-route-replay-protocol@1', 'final protocol schema changed');
  ok(protocol?.class_id === 'RD-01-C03' && protocol?.issue === 786, 'final protocol identity changed');
  ok(protocol?.replay_contract?.replay_routes === 114, 'replay route denominator changed');
  ok(protocol?.replay_contract?.automatic_third_pass_authorized === false, 'third pass authorized');
  ok(protocol?.replay_contract?.result_spawned_requests === 0, 'result-spawned requests introduced');
  assertAuthorityZero(protocol.authority, 'protocol authority');

  ok(failedUniverse?.schema_version === 'ssc-rd01-wave02-failed-route-universe@1', 'failed route universe schema changed');
  ok(failedUniverse?.routes === 114 && failedUniverse?.frozen_before_requests === true, 'failed route universe changed');
  ok(failedUniverse?.result_spawned_requests === 0, 'failed route universe recursed');
  ok(Array.isArray(failedUniverse.route_keys) && failedUniverse.route_keys.length === 114, 'failed route keys changed');
  unique(failedUniverse.route_keys, 'duplicate failed route key');

  ok(routeIndex?.schema_version === 'ssc-rd01-wave02-final-route-state-index@1', 'route index schema changed');
  ok(routeIndex?.fixed_routes === 612 && routeIndex?.replayed_routes === 114, 'final route denominator changed');
  same(routeIndex.route_state_counts, { http_success_after_fixed_replay: 114, http_success: 498 }, 'final route state counts changed');
  ok(Array.isArray(routeIndex.routes) && routeIndex.routes.length === 612, 'final route rows changed');
  unique(routeIndex.routes.map((row) => `${row.row_id}:${row.award_group}`), 'duplicate final route');
  ok(routeIndex.routes.every((row) => row.final_terminal_state.startsWith('http_success')), 'non-success route remains after replay');

  ok(candidateIndex?.schema_version === 'ssc-rd01-wave02-legal-entity-candidate-index@2', 'candidate-index schema changed');
  ok(candidateIndex?.rows === 102 && candidateIndex?.fixed_replay_routes === 114, 'candidate-index denominator changed');
  ok(candidateIndex?.automatic_third_pass_authorized === false, 'candidate-index third pass changed');
  ok(Array.isArray(candidateIndex.candidate_rows) && candidateIndex.candidate_rows.length === 102, 'candidate rows changed');
  unique(candidateIndex.candidate_rows.map((row) => row.row_id), 'duplicate candidate row');

  ok(terminal?.schema_version === 'ssc-rd01-wave02-legal-entity-terminal-classification@2', 'terminal classification schema changed');
  ok(terminal?.class_id === 'RD-01-C03' && terminal?.issue === 786, 'terminal classification identity changed');
  ok(terminal?.fixed_replay_routes === 114 && terminal?.automatic_third_pass_authorized === false, 'terminal replay boundary changed');
  ok(Array.isArray(terminal.rows) && terminal.rows.length === 102, 'terminal row denominator changed');
  unique(terminal.rows.map((row) => row.row_id), 'duplicate terminal row');
  same(terminal.rows.map((row) => row.row_id).sort(), scaffold.rows.map((row) => row.row_id).sort(), 'terminal rows no longer match scaffold');
  const stateCounts = Object.fromEntries([
    'exact_legal_entity_resolved',
    'bounded_brand_to_entity_resolution',
    'identity_source_restricted',
    'identity_source_unavailable',
    'identity_ambiguous'
  ].map((state) => [state, terminal.rows.filter((row) => row.terminal_row_state === state).length]));
  same(stateCounts, {
    exact_legal_entity_resolved: 45,
    bounded_brand_to_entity_resolution: 3,
    identity_source_restricted: 0,
    identity_source_unavailable: 10,
    identity_ambiguous: 44
  }, 'terminal row state counts changed');
  ok(terminal.rows.every((row) => row.fixed_protocol_complete === true && row.row_closed === true), 'open terminal row remains');
  for (const row of terminal.rows) {
    if (['exact_legal_entity_resolved','bounded_brand_to_entity_resolution'].includes(row.terminal_row_state)) {
      ok(typeof row.resolved_legal_entity === 'string' && row.resolved_legal_entity.length > 0, `${row.row_id} missing resolved entity`);
      ok(typeof row.entity_jurisdiction === 'string' && row.entity_jurisdiction.length > 0, `${row.row_id} missing jurisdiction`);
      ok(row.entity_identifier_and_authoritative_source !== null, `${row.row_id} missing authoritative identifier custody`);
      const ids = row.entity_identifier_and_authoritative_source;
      ok((ids.uei?.length ?? 0) + (ids.lei?.length ?? 0) + (ids.recipient_id?.length ?? 0) > 0, `${row.row_id} lacks identifier`);
    } else {
      ok(row.resolved_legal_entity === null, `${row.row_id} unresolved row has entity`);
    }
  }

  ok(comparison?.schema_version === 'ssc-rd01-wave02-failed-route-replay-comparison@1', 'comparison schema changed');
  ok(comparison?.changed_rows === 8 && comparison?.changed_row_details?.length === 8, 'replay changed-row denominator changed');
  same(comparison.changed_row_details.map((row) => row.row_id), [
    'NATSEC100-2026-RANK-084',
    'NATSEC100-2026-RANK-085',
    'NATSEC100-2026-RANK-089',
    'NATSEC100-2026-RANK-094',
    'NATSEC100-2026-RANK-095',
    'NATSEC100-2026-RANK-096',
    'NATSEC100-2026-RANK-097',
    'NATSEC100-2026-RANK-099'
  ], 'replay changed rows changed');

  exactKeys(summary, ['schema_version','wave_id','class_id','issue','research_head','terminal_state','class_closed','counts','authority'], 'summary');
  ok(summary.schema_version === 'ssc-rd01-wave02-final-legal-entity-summary@2', 'summary schema changed');
  ok(summary.terminal_state === 'bounded_source_unavailable' && summary.class_closed === true, 'summary closure state changed');
  ok(summary.counts.frozen_rows === 102 && summary.counts.terminal_rows === 102, 'summary row counts changed');
  ok(summary.counts.fixed_stage2_routes === 612 && summary.counts.fixed_replay_routes === 114, 'summary route counts changed');
  ok(summary.counts.legal_entities_resolved === 48, 'summary resolved count changed');
  ok(summary.counts.identity_ambiguous === 44 && summary.counts.identity_source_unavailable === 10, 'summary unresolved counts changed');
  ok(summary.counts.changed_rows_after_replay === 8, 'summary replay effect changed');
  assertAuthorityZero(summary.authority, 'summary authority', false);
  ok(summary.counts.external_contacts === 0 && summary.counts.external_reviews === 0, 'summary external counts changed');
  ok(summary.authority.automatic_third_pass_authorized === false, 'summary third pass changed');
  for (const key of ['reviewed_disposition_changed','selection_causation_finding','superiority_finding','common_control_finding','coordination_finding','common_purpose_finding']) {
    ok(summary.authority[key] === false, `summary authority.${key} changed`);
  }

  ok(classReceipt?.schema_version === 'ssc-rd01-wave02-class-receipt@1', 'class receipt schema changed');
  ok(classReceipt.wave_id === 'SSC-RD-W02' && classReceipt.lane_id === 'RD-01' && classReceipt.class_id === 'RD-01-C03', 'class receipt identity changed');
  ok(classReceipt.issue === 786 && classReceipt.source_pr === 801, 'class receipt custody changed');
  ok(classReceipt.class_label === 'legal-entity resolution for selected and matched control companies', 'class label changed');
  ok(classReceipt.terminal_state === 'bounded_source_unavailable' && classReceipt.class_closed === true, 'class receipt closure changed');
  ok(classReceipt.counts.legal_entities_resolved === 48 && classReceipt.counts.final_http_success_routes === 612, 'class receipt counts changed');
  ok(classReceipt.unresolved_limit.automatic_third_pass_authorized === false, 'class receipt third pass changed');
  assertAuthorityZero(classReceipt.authority, 'class receipt authority');
  for (const key of ['reviewed_disposition_changed','selection_causation_finding','technical_superiority_finding','common_control_finding','coordination_finding','common_purpose_finding']) {
    ok(classReceipt.authority[key] === false, `class receipt authority.${key} changed`);
  }

  ok(manifest?.schema_version === 'ssc-rd01-wave02-terminal-product-manifest@1', 'product manifest schema changed');
  ok(manifest.entry_count === PRODUCT_ENTRY_NAMES.length, 'product manifest count changed');
  same(manifest.entries.map((entry) => entry.path), PRODUCT_ENTRY_NAMES, 'product manifest order changed');
  ok(/^[0-9a-f]{64}$/.test(manifest.combined_sha256), 'product manifest digest malformed');

  ok(closure?.schema_version === 'ssc-residual-denominator-wave02-class-closure-reference@1', 'closure reference schema changed');
  ok(closure.wave_issue === 785 && closure.child_issue === 786 && closure.source_pr === 801, 'closure reference custody changed');
  ok(closure.lane_id === 'RD-01' && closure.class_id === 'RD-01-C03', 'closure reference identity changed');
  ok(closure.terminal_state === 'bounded_source_unavailable' && closure.class_closed === true, 'closure reference state changed');
  ok(closure.product.manifest_combined_sha256 === manifest.combined_sha256, 'closure manifest binding changed');
  same(closure.residual_atlas_effect_if_promoted_after_rd04_rd05, {
    canonical_classes: 42,
    open_before: 40,
    closed_before: 2,
    open_after: 39,
    closed_after: 3
  }, 'closure atlas effect changed');
  assertAuthorityZero(closure.authority, 'closure authority');

  ok(schema?.$schema === 'https://json-schema.org/draft/2020-12/schema', 'schema dialect changed');
  ok(schema?.$id === 'https://bigbirdreturns.github.io/clifford-number/schemas/status-sovereignty-rd-wave02-rd01-legal-entity.schema.json', 'schema id changed');
  ok(schema?.type === 'object' && schema?.additionalProperties === false, 'schema root is not closed');
  ok(schema?.properties?.schema_version?.const === 'ssc-rd01-wave02-class-receipt@1', 'schema version binding changed');
  ok(schema?.properties?.class_id?.const === 'RD-01-C03', 'schema class binding changed');
  ok(schema?.properties?.counts?.properties?.frozen_rows?.const === 102, 'schema row denominator changed');
  ok(schema?.properties?.counts?.properties?.final_http_success_routes?.const === 612, 'schema route denominator changed');
  return { summary, classReceipt, manifest };
}

export function validateRd01Closure(root = ROOT) {
  const stage1Entries = verifyZip(root, STAGE1_ZIP_PATH, EXPECTED.stage1, 'Stage-1');
  const baseEntries = verifyZip(root, BASE_ZIP_PATH, EXPECTED.base, 'base terminal census');
  const replayEntries = verifyZip(root, REPLAY_ZIP_PATH, EXPECTED.replay, 'failed-route replay');
  ok(stage1Entries.size === 927, 'Stage-1 ZIP entry count changed');
  ok(baseEntries.size === 3180, 'base ZIP entry count changed');
  ok(replayEntries.size === 578, 'replay ZIP entry count changed');

  for (const name of ['protocol.json','failed-route-universe.json','final-route-state-index.json','candidate-index.json','terminal-classification.json','comparison.json','summary.json']) {
    const committed = bytes(root, `${PRODUCT_ROOT}/${name}`);
    const source = replayEntries.get(name);
    ok(source && committed.equals(source), `${name} no longer matches replay artifact`);
  }

  const values = {
    scaffold: read(root, SCAFFOLD_PATH),
    artifactIndex: read(root, ARTIFACT_INDEX_PATH),
    protocol: read(root, `${PRODUCT_ROOT}/protocol.json`),
    failedUniverse: read(root, `${PRODUCT_ROOT}/failed-route-universe.json`),
    routeIndex: read(root, `${PRODUCT_ROOT}/final-route-state-index.json`),
    candidateIndex: read(root, `${PRODUCT_ROOT}/candidate-index.json`),
    terminal: read(root, `${PRODUCT_ROOT}/terminal-classification.json`),
    comparison: read(root, `${PRODUCT_ROOT}/comparison.json`),
    summary: read(root, SUMMARY_PATH),
    classReceipt: read(root, CLASS_RECEIPT_PATH),
    manifest: read(root, MANIFEST_PATH),
    closure: read(root, CLOSURE_PATH),
    schema: read(root, SCHEMA_PATH)
  };
  const result = validateRd01Shape(values);
  const expectedEntries = PRODUCT_ENTRY_NAMES.map((name) => {
    const file = bytes(root, `${PRODUCT_ROOT}/${name}`);
    return { path: name, bytes: file.length, sha256: sha256(file) };
  });
  same(values.manifest.entries, expectedEntries, 'product manifest entries drifted');
  const combined = sha256(Buffer.from(expectedEntries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join('')));
  ok(values.manifest.combined_sha256 === combined, 'product manifest combined digest changed');
  return result;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateRd01Closure(ROOT);
  console.log(`RD-01 terminal closure validated: ${result.classReceipt.counts.legal_entities_resolved} resolved / ${result.classReceipt.counts.frozen_rows}; ${result.manifest.entry_count} product entries`);
}
