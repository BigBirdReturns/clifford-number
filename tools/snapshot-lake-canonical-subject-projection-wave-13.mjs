#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const full = relative => path.join(root, relative);
const outputPath = process.argv[2];
assert.ok(outputPath, 'usage: node tools/snapshot-lake-canonical-subject-projection-wave-13.mjs <output-path>');

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}

function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch (error) {
        throw new Error(`${relative}:${index + 1}: ${error.message}`);
      }
    });
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

function omitTopLevel(value, keys) {
  const copy = structuredClone(value);
  for (const key of keys) delete copy[key];
  return copy;
}

function normalizeReport(value) {
  return String(value)
    .replace(/Source fingerprint: `(?:[a-f0-9]{64})`/g, 'Source fingerprint: `<semantic-replay-normalized>`')
    .replace(/Source fingerprint: (?:[a-f0-9]{64})/g, 'Source fingerprint: <semantic-replay-normalized>');
}

const VOLATILE_LAKE_KEYS = new Set([
  'sha256',
  'source_sha256',
  'file_sha256',
  'content_sha256',
  'source_fingerprint_sha256',
  'object_hash',
  'occurrence_hash',
  'bytes',
  'file_bytes',
  'size',
  'mtime',
  'mtime_ms',
  'mtime_ns',
  'generated_at',
  'indexed_at',
  'built_at',
  'created_at',
  'updated_at'
]);

function normalizeLakeMetadata(value) {
  if (Array.isArray(value)) return value.map(normalizeLakeMetadata);
  if (!value || typeof value !== 'object') return value;
  const out = {};
  for (const [key, item] of Object.entries(value)) {
    if (VOLATILE_LAKE_KEYS.has(key)
      || /(?:^|_)sha256$/i.test(key)
      || /(?:^|_)bytes$/i.test(key)
      || /(?:^|_)(?:hash|digest)$/i.test(key)) continue;
    out[key] = normalizeLakeMetadata(item);
  }
  return out;
}

const policy = readJson('data/project/lake-canonical-subject-projection-wave-13-policy.json');
const projection = readJson(policy.projection_path);
const plan = readJson(policy.plan_path);
const reconciliation = readJson(policy.reconciliation_path);
const caseIndex = readJson('build/cases/index.json');
const publicCatalog = readJson('build/public-catalog.json');
const surfaceGraph = readJson('build/surface-graph.json');
const hopGraph = readJson('build/hop-graph.json');
const activeIdentity = readJson('build/axm-identity.json');
const briefingIndex = readJson('build/briefings/index.json');
const lakeSummary = readJson('build/lake-index/summary.json');
const lakeFiles = readJsonl('build/lake-index/files.jsonl');
const lakeObjects = readJsonl('build/lake-index/objects.jsonl');

const cases = [...caseIndex.cases]
  .sort((left, right) => left.case_id.localeCompare(right.case_id))
  .map(entry => ({ entry, artifact: readJson(entry.href) }));

const briefingArtifacts = [...(briefingIndex.briefings ?? [])]
  .sort((left, right) => left.case_id.localeCompare(right.case_id))
  .map(entry => ({ entry, artifact: readJson(`build/briefings/${entry.case_id}.json`) }));

const relevantPaths = new Set([
  policy.projection_path,
  policy.plan_path,
  policy.reconciliation_path,
  policy.report_path,
  policy.reconciliation_report_path,
  'build/cases/index.json',
  ...caseIndex.cases.map(entry => entry.href),
  'build/public-catalog.json',
  'build/surface-graph.json',
  'build/hop-graph.json',
  'build/axm-identity.json',
  'build/briefings/index.json',
  ...briefingIndex.briefings.map(entry => `build/briefings/${entry.case_id}.json`)
]);

const relevantLakeFiles = lakeFiles
  .filter(row => relevantPaths.has(row.path))
  .map(normalizeLakeMetadata)
  .sort((left, right) => String(left.path).localeCompare(String(right.path)));

const resolutionIds = new Set((projection.resolutions ?? []).map(row => row.resolution_id));
const relevantLakeObjects = lakeObjects
  .filter(row => resolutionIds.has(row.id_value)
    || (row.occurrences ?? []).some(occurrence => relevantPaths.has(occurrence.path)))
  .map(normalizeLakeMetadata)
  .sort((left, right) => `${left.id_key}\0${left.id_value}`.localeCompare(`${right.id_key}\0${right.id_value}`));

const snapshot = {
  schema_version: 'canonical-subject-projection-wave-13-semantic-snapshot@1',
  purpose: 'Compare semantic projection state across deterministic replay while excluding wall-clock timestamps and byte or object hashes that are expected to change when timestamp-bearing generated wrappers are rebuilt.',
  cases,
  public_catalog: publicCatalog,
  surface_graph: omitTopLevel(surfaceGraph, ['generated']),
  hop_graph: omitTopLevel(hopGraph, ['generated']),
  active_identity: omitTopLevel(activeIdentity, ['generated']),
  briefing_index: briefingIndex,
  briefing_artifacts: briefingArtifacts,
  wave_13_projection: omitTopLevel(projection, ['source_fingerprint_sha256', 'input_manifest']),
  wave_13_plan: omitTopLevel(plan, ['source_fingerprint_sha256', 'input_manifest']),
  wave_13_reconciliation: omitTopLevel(reconciliation, ['source_fingerprint_sha256', 'input_manifest']),
  wave_13_report: normalizeReport(fs.readFileSync(full(policy.report_path), 'utf8')),
  wave_13_reconciliation_report: normalizeReport(fs.readFileSync(full(policy.reconciliation_report_path), 'utf8')),
  lake_summary: omitTopLevel(lakeSummary, ['source_fingerprint_sha256']),
  lake_relevant_files: relevantLakeFiles,
  lake_relevant_objects: relevantLakeObjects
};

const output = path.resolve(outputPath);
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, `${JSON.stringify(canonical(snapshot), null, 2)}\n`);
console.log(`Wave 13 semantic replay snapshot written: ${output}`);
console.log(`  cases / briefings / lake files / lake objects: ${cases.length} / ${briefingArtifacts.length} / ${relevantLakeFiles.length} / ${relevantLakeObjects.length}`);
