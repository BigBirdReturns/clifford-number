#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const LANE_ROOT = 'data/intake/status-sovereignty-rd-wave02-rd01-legal-entity';
export const SOURCE_ROOT = `${LANE_ROOT}/source-custody/legal-entity-protocol-v1`;
export const STAGE1_ZIP_PATH = `${SOURCE_ROOT}/stage1-candidate-census-v1.zip`;
export const BASE_ZIP_PATH = `${SOURCE_ROOT}/terminal-census-v1.zip`;
export const REPLAY_ZIP_PATH = `${SOURCE_ROOT}/failed-route-replay-v1.zip`;
export const ARTIFACT_INDEX_PATH = `${SOURCE_ROOT}/artifact-index.json`;
export const PRODUCT_ROOT = 'data/research/status-sovereignty-rd-wave02-rd01-legal-entity';
export const CLOSURE_PATH = 'data/project/ssc-residual-wave02/closures/RD-01-C03.json';
export const MANIFEST_PATH = `${PRODUCT_ROOT}/manifest.json`;
export const CLASS_RECEIPT_PATH = `${PRODUCT_ROOT}/class-receipt.json`;
export const SUMMARY_PATH = `${PRODUCT_ROOT}/summary.json`;
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave02-rd01-legal-entity.schema.json';
export const VALIDATOR_PATH = 'tools/validate-status-sovereignty-rd-wave02-rd01-legal-entity.mjs';
export const TEST_PATH = 'test/status-sovereignty-rd-wave02-rd01-legal-entity.test.js';
export const MILESTONE_PATH = 'docs/milestones/ssc-rd-wave02-rd01-legal-entity.md';
export const WORKFLOW_PATH = '.github/workflows/status-sovereignty-rd01-wave02-terminal-closure.yml';

export const EXPECTED = Object.freeze({
  research_head: '72e657baa024e0e90cca5bfc532f8350fe6bca60',
  source_pr: 801,
  issue: 786,
  stage1: Object.freeze({
    run: 30838940006,
    artifact_id: 8866039696,
    zip_sha256: 'ac81681b0f080715326bf7b4d8bc8225e7f69d52c0b2b4e73b9f57dc90c335aa',
    manifest_entries: 926,
    manifest_sha256: '5061d7ddaa9060d952b468a4514f201151f57daebf0261f2d042c8d1b4360daa'
  }),
  base: Object.freeze({
    run: 30841401728,
    artifact_id: 8866950187,
    zip_sha256: 'e961aeed386e7ca1709369b096f39794003d88ec7bb03f0e34b68af690ffd09f',
    manifest_entries: 3179,
    manifest_sha256: '7884982c8f9be70fb1d3dd92f524cf2c45c4943364c63f39b66af03f5a128936'
  }),
  replay: Object.freeze({
    run: 30842577024,
    artifact_id: 8867425854,
    zip_sha256: '6dc7ac0c52fe28b1e46debf746c60dbffa408550c2b688c2607c2be24c84cec8',
    manifest_entries: 577,
    manifest_sha256: '051b96d4819fea3540f6637c5fe8d45e0d2c537905b7dfe2b0c33efc3fb2d913'
  })
});

export const PRODUCT_ENTRY_NAMES = Object.freeze([
  'protocol.json',
  'failed-route-universe.json',
  'final-route-state-index.json',
  'candidate-index.json',
  'terminal-classification.json',
  'comparison.json',
  'class-receipt.json',
  'summary.json'
]);

const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
export const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const abs = (root, rel) => path.join(root, rel);
const readJson = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const write = (root, rel, bytes) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), bytes);
};
const writeJson = (root, rel, value) => write(root, rel, stable(value));
const ok = (condition, message) => { if (!condition) throw new Error(message); };

function findEocd(buffer) {
  const minimum = Math.max(0, buffer.length - 65557);
  for (let offset = buffer.length - 22; offset >= minimum; offset -= 1) {
    if (buffer.readUInt32LE(offset) === 0x06054b50) return offset;
  }
  throw new Error('ZIP end-of-central-directory record not found');
}

export function readZipEntries(buffer) {
  const eocd = findEocd(buffer);
  const disk = buffer.readUInt16LE(eocd + 4);
  const centralDisk = buffer.readUInt16LE(eocd + 6);
  const entriesOnDisk = buffer.readUInt16LE(eocd + 8);
  const totalEntries = buffer.readUInt16LE(eocd + 10);
  const centralSize = buffer.readUInt32LE(eocd + 12);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  ok(disk === 0 && centralDisk === 0, 'multi-disk ZIP is not permitted');
  ok(entriesOnDisk === totalEntries, 'ZIP entry denominator differs across disks');
  ok(centralOffset + centralSize <= buffer.length, 'ZIP central directory is out of bounds');
  const result = new Map();
  let cursor = centralOffset;
  for (let index = 0; index < totalEntries; index += 1) {
    ok(buffer.readUInt32LE(cursor) === 0x02014b50, `ZIP central entry ${index} signature mismatch`);
    const flags = buffer.readUInt16LE(cursor + 8);
    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const uncompressedSize = buffer.readUInt32LE(cursor + 24);
    const nameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer.subarray(cursor + 46, cursor + 46 + nameLength).toString((flags & 0x0800) ? 'utf8' : 'utf8');
    ok(!name.startsWith('/') && !name.split('/').includes('..'), `unsafe ZIP entry ${name}`);
    ok(buffer.readUInt32LE(localOffset) === 0x04034b50, `ZIP local entry ${name} signature mismatch`);
    const localNameLength = buffer.readUInt16LE(localOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localOffset + 28);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    ok(dataOffset + compressedSize <= buffer.length, `ZIP entry ${name} is out of bounds`);
    const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
    let body;
    if (method === 0) body = Buffer.from(compressed);
    else if (method === 8) body = zlib.inflateRawSync(compressed);
    else throw new Error(`unsupported ZIP compression method ${method} for ${name}`);
    ok(body.length === uncompressedSize, `ZIP entry ${name} size mismatch`);
    ok(!result.has(name), `duplicate ZIP entry ${name}`);
    result.set(name, body);
    cursor += 46 + nameLength + extraLength + commentLength;
  }
  ok(cursor === centralOffset + centralSize, 'ZIP central-directory size mismatch');
  return result;
}

function parseJsonEntry(entries, name) {
  const bytes = entries.get(name);
  ok(bytes, `ZIP entry ${name} missing`);
  return JSON.parse(bytes.toString('utf8'));
}

function verifyArtifact(root, rel, expected, label) {
  const bytes = fs.readFileSync(abs(root, rel));
  ok(sha256(bytes) === expected.zip_sha256, `${label} ZIP digest changed`);
  const entries = readZipEntries(bytes);
  const manifest = parseJsonEntry(entries, 'manifest.json');
  ok(manifest.entries === expected.manifest_entries, `${label} internal manifest entry count changed`);
  ok(manifest.combined_sha256 === expected.manifest_sha256, `${label} internal manifest digest changed`);
  return { bytes, entries, manifest };
}

function buildArtifactIndex(stage1, base, replay) {
  return {
    schema_version: 'ssc-rd01-wave02-legal-entity-artifact-index@1',
    wave_id: 'SSC-RD-W02',
    class_id: 'RD-01-C03',
    issue: EXPECTED.issue,
    research_head: EXPECTED.research_head,
    protocol_boundary: {
      frozen_rows: 102,
      stage1_fixed_routes: 205,
      stage2_fixed_routes: 612,
      failed_route_replay_routes: 114,
      automatic_third_pass_authorized: false
    },
    artifacts: [
      {
        stage: 'stage1_candidate_census',
        workflow_run: EXPECTED.stage1.run,
        artifact_id: EXPECTED.stage1.artifact_id,
        archive_path: STAGE1_ZIP_PATH,
        archive_bytes: stage1.bytes.length,
        archive_sha256: EXPECTED.stage1.zip_sha256,
        internal_manifest_entries: EXPECTED.stage1.manifest_entries,
        internal_manifest_sha256: EXPECTED.stage1.manifest_sha256
      },
      {
        stage: 'terminal_six_group_award_census',
        workflow_run: EXPECTED.base.run,
        artifact_id: EXPECTED.base.artifact_id,
        archive_path: BASE_ZIP_PATH,
        archive_bytes: base.bytes.length,
        archive_sha256: EXPECTED.base.zip_sha256,
        internal_manifest_entries: EXPECTED.base.manifest_entries,
        internal_manifest_sha256: EXPECTED.base.manifest_sha256
      },
      {
        stage: 'exact_failed_route_replay',
        workflow_run: EXPECTED.replay.run,
        artifact_id: EXPECTED.replay.artifact_id,
        archive_path: REPLAY_ZIP_PATH,
        archive_bytes: replay.bytes.length,
        archive_sha256: EXPECTED.replay.zip_sha256,
        internal_manifest_entries: EXPECTED.replay.manifest_entries,
        internal_manifest_sha256: EXPECTED.replay.manifest_sha256
      }
    ],
    authority: {
      outside_human_dependency: false,
      external_contacts: 0,
      external_reviews: 0,
      denominator_widened: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    }
  };
}

function buildClassReceipt(summary) {
  return {
    schema_version: 'ssc-rd01-wave02-class-receipt@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-01',
    class_id: 'RD-01-C03',
    issue: EXPECTED.issue,
    source_pr: EXPECTED.source_pr,
    class_label: 'legal-entity resolution for selected and matched control companies',
    terminal_state: summary.terminal_state,
    class_closed: summary.class_closed,
    closure_basis: [
      'the immutable denominator contains all 100 published NatSec100 2026 roster rows plus the two explicit assessed SpaceX and Anthropic control rows',
      'the legal-entity protocol froze 205 Stage-1 routes and 612 homogeneous USAspending award routes before result interpretation',
      'the exact 114-route retry denominator was derived only from typed transport failures and two retryable HTTP 500 receipts, then replayed once on a fresh low-concurrency runner',
      'all 612 final Stage-2 routes reached HTTP success and no third automatic pass is authorized',
      'all 102 rows are terminally classified as exact resolution, bounded brand resolution, typed ambiguity, or bounded source unavailability',
      'legal-entity resolution is not parent or common control, selector causation, technical superiority, coordination, common purpose, publication, adoption, or graph evidence'
    ],
    counts: {
      frozen_rows: summary.counts.frozen_rows,
      terminal_rows: summary.counts.terminal_rows,
      stage1_fixed_routes: 205,
      stage2_fixed_routes: summary.counts.fixed_stage2_routes,
      failed_route_replay_routes: summary.counts.fixed_replay_routes,
      final_http_success_routes: 612,
      exact_legal_entity_resolved: summary.counts.exact_legal_entity_resolved,
      bounded_brand_to_entity_resolution: summary.counts.bounded_brand_to_entity_resolution,
      legal_entities_resolved: summary.counts.legal_entities_resolved,
      identity_ambiguous: summary.counts.identity_ambiguous,
      identity_source_unavailable: summary.counts.identity_source_unavailable,
      identity_source_restricted: summary.counts.identity_source_restricted,
      changed_rows_after_replay: summary.counts.changed_rows_after_replay
    },
    source_custody: {
      artifact_index_path: ARTIFACT_INDEX_PATH,
      stage1_artifact_id: EXPECTED.stage1.artifact_id,
      stage1_archive_sha256: EXPECTED.stage1.zip_sha256,
      stage1_manifest_sha256: EXPECTED.stage1.manifest_sha256,
      base_artifact_id: EXPECTED.base.artifact_id,
      base_archive_sha256: EXPECTED.base.zip_sha256,
      base_manifest_sha256: EXPECTED.base.manifest_sha256,
      replay_artifact_id: EXPECTED.replay.artifact_id,
      replay_archive_sha256: EXPECTED.replay.zip_sha256,
      replay_manifest_sha256: EXPECTED.replay.manifest_sha256
    },
    unresolved_limit: {
      identity_ambiguous_rows: summary.counts.identity_ambiguous,
      identity_source_unavailable_rows: summary.counts.identity_source_unavailable,
      unresolved_rows_are_not_silently_removed: true,
      no_entity_absence_inferred: true,
      no_parent_or_common_control_inferred: true,
      automatic_third_pass_authorized: false
    },
    authority: {
      outside_human_dependency: false,
      external_contacts: 0,
      external_reviews: 0,
      denominator_widened: false,
      reviewed_disposition_changed: false,
      selection_causation_finding: false,
      technical_superiority_finding: false,
      common_control_finding: false,
      coordination_finding: false,
      common_purpose_finding: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    }
  };
}

function buildManifest(root) {
  const entries = PRODUCT_ENTRY_NAMES.map((name) => {
    const bytes = fs.readFileSync(abs(root, `${PRODUCT_ROOT}/${name}`));
    return { path: name, bytes: bytes.length, sha256: sha256(bytes) };
  });
  return {
    schema_version: 'ssc-rd01-wave02-terminal-product-manifest@1',
    entries,
    entry_count: entries.length,
    combined_sha256: sha256(Buffer.from(entries.map((entry) => `${entry.sha256}  ${entry.path}\n`).join('')))
  };
}

function buildClosureReference(manifest, classReceipt) {
  return {
    schema_version: 'ssc-residual-denominator-wave02-class-closure-reference@1',
    wave_issue: 785,
    child_issue: EXPECTED.issue,
    source_pr: EXPECTED.source_pr,
    lane_id: 'RD-01',
    class_id: 'RD-01-C03',
    exact_label: classReceipt.class_label,
    terminal_state: classReceipt.terminal_state,
    class_closed: true,
    product: {
      root: PRODUCT_ROOT,
      manifest_path: MANIFEST_PATH,
      manifest_combined_sha256: manifest.combined_sha256,
      class_receipt_path: CLASS_RECEIPT_PATH
    },
    source_custody: {
      artifact_index_path: ARTIFACT_INDEX_PATH,
      stage1_archive_path: STAGE1_ZIP_PATH,
      stage1_archive_sha256: EXPECTED.stage1.zip_sha256,
      terminal_census_archive_path: BASE_ZIP_PATH,
      terminal_census_archive_sha256: EXPECTED.base.zip_sha256,
      failed_route_replay_archive_path: REPLAY_ZIP_PATH,
      failed_route_replay_archive_sha256: EXPECTED.replay.zip_sha256
    },
    authority: classReceipt.authority,
    residual_atlas_effect_if_promoted_after_rd04_rd05: {
      canonical_classes: 42,
      open_before: 40,
      closed_before: 2,
      open_after: 39,
      closed_after: 3
    }
  };
}

export function buildRd01Closure(root = ROOT) {
  const stage1 = verifyArtifact(root, STAGE1_ZIP_PATH, EXPECTED.stage1, 'Stage-1');
  const base = verifyArtifact(root, BASE_ZIP_PATH, EXPECTED.base, 'base terminal census');
  const replay = verifyArtifact(root, REPLAY_ZIP_PATH, EXPECTED.replay, 'failed-route replay');

  const stage1Summary = parseJsonEntry(stage1.entries, 'summary.json');
  const baseSummary = parseJsonEntry(base.entries, 'summary.json');
  const replaySummary = parseJsonEntry(replay.entries, 'summary.json');
  ok(stage1Summary.rows === 102 && stage1Summary.fixed_routes === 205, 'Stage-1 denominator changed');
  ok(baseSummary.counts?.fixed_stage2_routes === 612, 'base Stage-2 denominator changed');
  ok(baseSummary.counts?.route_state_counts?.transport_failure === 112, 'base transport failure denominator changed');
  ok(baseSummary.counts?.route_state_counts?.terminal_http_non_success === 2, 'base HTTP non-success denominator changed');
  ok(replaySummary.class_id === 'RD-01-C03' && replaySummary.class_closed === true, 'replay class state changed');
  ok(replaySummary.counts?.fixed_replay_routes === 114, 'replay denominator changed');
  ok(replaySummary.counts?.replay_state_counts?.http_success === 114, 'all replay routes must succeed');
  ok(replaySummary.counts?.final_route_state_counts?.http_success === 498, 'original HTTP success count changed');
  ok(replaySummary.counts?.final_route_state_counts?.http_success_after_fixed_replay === 114, 'replayed HTTP success count changed');
  ok(replaySummary.counts?.legal_entities_resolved === 48, 'resolved entity count changed');
  ok(replaySummary.counts?.identity_ambiguous === 44, 'ambiguous entity count changed');
  ok(replaySummary.counts?.identity_source_unavailable === 10, 'source-unavailable count changed');
  ok(replaySummary.authority?.automatic_third_pass_authorized === false, 'automatic third pass introduced');

  writeJson(root, ARTIFACT_INDEX_PATH, buildArtifactIndex(stage1, base, replay));
  for (const name of [
    'protocol.json',
    'failed-route-universe.json',
    'final-route-state-index.json',
    'candidate-index.json',
    'terminal-classification.json',
    'comparison.json',
    'summary.json'
  ]) {
    const bytes = replay.entries.get(name);
    ok(bytes, `replay product ${name} missing`);
    write(root, `${PRODUCT_ROOT}/${name}`, bytes);
  }
  const classReceipt = buildClassReceipt(replaySummary);
  writeJson(root, CLASS_RECEIPT_PATH, classReceipt);
  const manifest = buildManifest(root);
  writeJson(root, MANIFEST_PATH, manifest);
  writeJson(root, CLOSURE_PATH, buildClosureReference(manifest, classReceipt));
  return { summary: replaySummary, classReceipt, manifest };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = buildRd01Closure(ROOT);
  console.log(`RD-01 terminal closure built: ${result.classReceipt.counts.legal_entities_resolved} resolved / ${result.classReceipt.counts.frozen_rows} rows; manifest ${result.manifest.combined_sha256}`);
}
