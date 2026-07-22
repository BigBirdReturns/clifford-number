#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { readJson, readJsonl, root, writeJson } from './lib/ledger.mjs';

export const NEXT_TEN_ESTATES_SCHEMA_VERSION = 'next-ten-estates-manifest@1';
export const ESTATE_RAW_SCHEMA_VERSION = 'estate-raw@1';
export const ESTATE_INTAKE_SCHEMA_VERSION = 'estate-intake@1';

const BASE = 'data/intake/next-ten-estates';
const ALLOWED_COVERAGE = new Set([
  'not_searched',
  'partially_searched',
  'surface_complete',
  'unavailable_after_search'
]);
const AFTER_SEARCH_PROVENANCE = ['query', 'attempted_urls', 'timestamp', 'result'];
const FORBIDDEN_KEYS = /^(?:guilt_score|corruption_score|motive_score|influence_score|risk_score|probability_score|ranking|rank|score|verdict|finding|claim_status)$/i;

function fail(message) {
  throw new Error(`next-ten-estates: ${message}`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function fileBytes(file) {
  return fs.readFileSync(path.join(root, file));
}

function stateCounts(rows) {
  const counts = {};
  for (const row of rows ?? []) {
    counts[row.state] = (counts[row.state] ?? 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function rawUnitCount(records) {
  return (records ?? []).reduce((total, record) => {
    const units = record.unit_count ?? 1;
    if (!Number.isInteger(units) || units < 1) fail(`record ${record.record_id ?? '(unnamed)'} has invalid unit_count`);
    return total + units;
  }, 0);
}

function walk(value, visit, pointer = '$') {
  if (Array.isArray(value)) {
    value.forEach((item, index) => walk(item, visit, `${pointer}[${index}]`));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, item] of Object.entries(value)) {
    visit(key, item, `${pointer}.${key}`);
    walk(item, visit, `${pointer}.${key}`);
  }
}

function validateAfterSearch(owner, row) {
  if (!String(row?.state ?? row?.coverage_state ?? '').endsWith('_after_search')) return;
  const provenance = row.search_provenance;
  if (!provenance || AFTER_SEARCH_PROVENANCE.some(field => {
    const value = provenance[field];
    return value == null || value === '' || (Array.isArray(value) && value.length === 0);
  })) {
    fail(`${owner} uses an after-search state without complete search_provenance`);
  }
}

function validateRaw(raw, summary, sourceById, declaredTrackIds) {
  if (raw.schema_version !== ESTATE_RAW_SCHEMA_VERSION) fail(`${summary.estate_id} raw schema is invalid`);
  for (const field of ['estate_id', 'track_id', 'axis', 'label', 'question', 'as_of', 'selection_basis']) {
    if (!String(raw[field] ?? '').trim()) fail(`${summary.estate_id} raw file lacks ${field}`);
  }
  if (raw.estate_id !== summary.estate_id) fail(`${summary.estate_id} raw estate_id diverged`);
  if (raw.track_id !== summary.track_id) fail(`${summary.estate_id} raw track_id diverged`);
  if (!declaredTrackIds.has(raw.track_id)) fail(`${summary.estate_id} references undeclared track ${raw.track_id}`);
  if (raw.graph_effect !== 'none') fail(`${summary.estate_id} must remain graph-inert`);
  if (raw.promotes_to !== 'candidate_only') fail(`${summary.estate_id} may promote only to candidate_only`);
  if (raw.conclusion_generated !== false) fail(`${summary.estate_id} may not generate a conclusion`);

  walk(raw, (key, item, pointer) => {
    if (FORBIDDEN_KEYS.test(key)) fail(`${summary.estate_id} contains prohibited field ${pointer}`);
    if (key === 'graph_effect' && item !== 'none') fail(`${summary.estate_id} contains graph-active field ${pointer}`);
    if (key === 'conclusion_generated' && item !== false) fail(`${summary.estate_id} contains conclusion-generating field ${pointer}`);
  });

  const denominator = raw.denominator;
  if (!denominator || !String(denominator.definition ?? '').trim()) fail(`${summary.estate_id} lacks a denominator definition`);
  if (!Number.isInteger(denominator.expected_count) || denominator.expected_count < 0) fail(`${summary.estate_id} denominator expected_count is invalid`);
  if (!Number.isInteger(denominator.acquired_count) || denominator.acquired_count < 0) fail(`${summary.estate_id} denominator acquired_count is invalid`);
  if (denominator.acquired_count > denominator.expected_count) fail(`${summary.estate_id} denominator acquired_count exceeds expected_count`);
  if (!ALLOWED_COVERAGE.has(denominator.coverage_state)) fail(`${summary.estate_id} denominator coverage_state is invalid`);
  if (denominator.coverage_state === 'surface_complete' && denominator.acquired_count !== denominator.expected_count) {
    fail(`${summary.estate_id} labels an incomplete denominator surface_complete`);
  }
  if (denominator.coverage_state === 'not_searched' && denominator.acquired_count !== 0) {
    fail(`${summary.estate_id} labels acquired denominator rows not_searched`);
  }
  validateAfterSearch(`${summary.estate_id} denominator`, denominator);

  if (!Array.isArray(raw.records)) fail(`${summary.estate_id} records must be an array`);
  const recordIds = new Set();
  for (const [index, record] of raw.records.entries()) {
    if (!String(record.record_id ?? '').trim()) fail(`${summary.estate_id} record ${index + 1} lacks record_id`);
    if (recordIds.has(record.record_id)) fail(`${summary.estate_id} duplicates record ${record.record_id}`);
    recordIds.add(record.record_id);
    if (!String(record.record_type ?? '').trim()) fail(`${summary.estate_id} record ${record.record_id} lacks record_type`);
    if (!String(record.evidence_state ?? '').trim()) fail(`${summary.estate_id} record ${record.record_id} lacks evidence_state`);
    if (!Array.isArray(record.source_ids) || record.source_ids.length === 0) fail(`${summary.estate_id} record ${record.record_id} lacks source_ids`);
  }

  if (!Array.isArray(raw.anchors)) fail(`${summary.estate_id} anchors must be an array`);
  for (const anchor of raw.anchors) if (!recordIds.has(anchor)) fail(`${summary.estate_id} anchor ${anchor} does not resolve`);

  if (!Array.isArray(raw.required_layers) || raw.required_layers.length === 0) fail(`${summary.estate_id} required_layers must be nonempty`);
  const layerNames = new Set();
  for (const layer of raw.required_layers) {
    if (!String(layer.layer ?? '').trim()) fail(`${summary.estate_id} has an unnamed required layer`);
    if (layerNames.has(layer.layer)) fail(`${summary.estate_id} duplicates required layer ${layer.layer}`);
    layerNames.add(layer.layer);
    if (!ALLOWED_COVERAGE.has(layer.state)) fail(`${summary.estate_id} layer ${layer.layer} has invalid state ${layer.state}`);
    if (layer.state !== 'surface_complete' && !String(layer.next_step ?? '').trim()) {
      fail(`${summary.estate_id} incomplete layer ${layer.layer} lacks next_step`);
    }
    validateAfterSearch(`${summary.estate_id} layer ${layer.layer}`, layer);
  }

  const sourceIds = new Set(raw.source_ids ?? []);
  if (sourceIds.size === 0) fail(`${summary.estate_id} has no estate-level source_ids`);
  const assertSource = (sourceId, owner) => {
    const source = sourceById.get(sourceId);
    if (!source) fail(`${owner} references missing source ${sourceId}`);
    if (!(source.supports ?? []).includes(raw.estate_id)) fail(`${sourceId} does not declare support for ${raw.estate_id}`);
    if (!sourceIds.has(sourceId)) fail(`${owner} source ${sourceId} is absent from the estate source_ids`);
  };
  for (const sourceId of sourceIds) assertSource(sourceId, summary.estate_id);
  for (const record of raw.records) for (const sourceId of record.source_ids) assertSource(sourceId, `${summary.estate_id}/${record.record_id}`);
  for (const layer of raw.required_layers) for (const sourceId of layer.source_ids ?? []) assertSource(sourceId, `${summary.estate_id}/${layer.layer}`);
  for (const sourceId of denominator.source_ids ?? []) assertSource(sourceId, `${summary.estate_id}/denominator`);

  if (summary.raw_records !== rawUnitCount(raw.records)) fail(`${summary.estate_id} summary raw_records diverged`);
  if (JSON.stringify(summary.denominator) !== JSON.stringify({
    definition: denominator.definition,
    expected_count: denominator.expected_count,
    acquired_count: denominator.acquired_count,
    coverage_state: denominator.coverage_state
  })) fail(`${summary.estate_id} summary denominator diverged`);
  if (JSON.stringify(summary.required_layer_state_counts) !== JSON.stringify(stateCounts(raw.required_layers))) {
    fail(`${summary.estate_id} required-layer state counts diverged`);
  }
  if (JSON.stringify(summary.source_ids) !== JSON.stringify(raw.source_ids)) fail(`${summary.estate_id} summary source_ids diverged`);
  if (summary.graph_effect !== 'none' || summary.promotes_to !== 'candidate_only' || summary.conclusion_generated !== false) {
    fail(`${summary.estate_id} summary exceeds the candidate-only boundary`);
  }
}

export function buildNextTenEstates({ write = true } = {}) {
  const summaries = readJsonl(`${BASE}/estates.jsonl`);
  const sources = readJsonl(`${BASE}/sources.jsonl`);
  const trackIndex = readJson('data/research-tracks/index.json');
  const declaredTracks = trackIndex.tracks ?? [];
  const declaredTrackIds = new Set(declaredTracks.map(track => track.track_id));

  if (declaredTracks.length !== 10) fail(`expected ten declared research tracks, found ${declaredTracks.length}`);
  if (summaries.length !== 10) fail(`expected ten estate summaries, found ${summaries.length}`);

  const sourceById = new Map();
  for (const source of sources) {
    if (!String(source.source_id ?? '').trim()) fail('source record lacks source_id');
    if (sourceById.has(source.source_id)) fail(`duplicate source_id ${source.source_id}`);
    if (!String(source.publisher ?? '').trim() || !String(source.title ?? '').trim() || !/^https?:\/\//.test(source.url ?? '')) {
      fail(`source ${source.source_id} lacks public source metadata`);
    }
    if (!Array.isArray(source.supports) || source.supports.length === 0) fail(`source ${source.source_id} has no supports list`);
    sourceById.set(source.source_id, source);
  }

  const summaryByEstate = new Map();
  const estateByTrack = new Map();
  const rawItems = [];
  for (const summary of summaries) {
    if (summary.schema_version !== ESTATE_INTAKE_SCHEMA_VERSION) fail(`${summary.estate_id ?? 'estate'} summary schema is invalid`);
    if (summaryByEstate.has(summary.estate_id)) fail(`duplicate estate_id ${summary.estate_id}`);
    if (estateByTrack.has(summary.track_id)) fail(`track ${summary.track_id} is populated more than once`);
    if (!/^data\/intake\/next-ten-estates\/raw\/[a-z0-9][a-z0-9._-]*\.json$/.test(summary.raw_file ?? '')) {
      fail(`${summary.estate_id} raw_file is outside the estate package`);
    }
    const raw = readJson(summary.raw_file);
    validateRaw(raw, summary, sourceById, declaredTrackIds);
    summaryByEstate.set(summary.estate_id, summary);
    estateByTrack.set(summary.track_id, summary.estate_id);
    rawItems.push({ summary, raw, bytes: fileBytes(summary.raw_file) });
  }

  const missingTracks = declaredTracks.map(track => track.track_id).filter(trackId => !estateByTrack.has(trackId));
  const extraTracks = [...estateByTrack.keys()].filter(trackId => !declaredTrackIds.has(trackId));
  if (missingTracks.length || extraTracks.length) {
    fail(`track coverage diverged; missing [${missingTracks.join(', ')}], extra [${extraTracks.join(', ')}]`);
  }

  for (const source of sources) {
    for (const estateId of source.supports) if (!summaryByEstate.has(estateId)) fail(`source ${source.source_id} supports unknown estate ${estateId}`);
  }

  const orderedItems = declaredTracks.map(track => rawItems.find(item => item.raw.track_id === track.track_id));
  const allLayers = orderedItems.flatMap(item => item.raw.required_layers);
  const denominatorStateCounts = stateCounts(orderedItems.map(item => ({ state: item.raw.denominator.coverage_state })));
  const layerStateCounts = stateCounts(allLayers);
  const asOf = orderedItems.map(item => item.raw.as_of).sort().at(-1) ?? null;

  const manifest = {
    schema_version: NEXT_TEN_ESTATES_SCHEMA_VERSION,
    as_of: asOf,
    purpose: 'One source-addressed, candidate-only raw estate for each declared research-track harness.',
    graph_effect: 'none',
    conclusion_generated: false,
    promotes_to: 'candidate_only',
    counts: {
      estates: orderedItems.length,
      tracks: declaredTracks.length,
      sources: sources.length,
      raw_records: orderedItems.reduce((total, item) => total + rawUnitCount(item.raw.records), 0),
      denominator_states: denominatorStateCounts,
      required_layer_states: layerStateCounts
    },
    track_ids: declaredTracks.map(track => track.track_id),
    estate_ids: orderedItems.map(item => item.raw.estate_id),
    estates: orderedItems.map(item => ({
      estate_id: item.raw.estate_id,
      track_id: item.raw.track_id,
      axis: item.raw.axis,
      label: item.raw.label,
      raw_file: item.summary.raw_file,
      raw_sha256: sha256(item.bytes),
      raw_records: rawUnitCount(item.raw.records),
      denominator: {
        expected_count: item.raw.denominator.expected_count,
        acquired_count: item.raw.denominator.acquired_count,
        coverage_state: item.raw.denominator.coverage_state
      },
      required_layer_state_counts: stateCounts(item.raw.required_layers),
      source_ids: item.raw.source_ids,
      raw_status: item.raw.raw_status,
      graph_effect: 'none'
    })),
    source_ids: [...sourceById.keys()].sort(),
    integrity: {
      estates_registry_sha256: sha256(fileBytes(`${BASE}/estates.jsonl`)),
      sources_registry_sha256: sha256(fileBytes(`${BASE}/sources.jsonl`))
    },
    boundaries: [
      'An estate is a raw acquisition domain, not a finding or case conclusion.',
      'A complete denominator or anchor does not imply complete ownership, transaction, disclosure, or causal coverage.',
      'Every missing layer remains explicitly not_searched or partially_searched.',
      'No raw record creates a graph edge, causal verdict, suspicion score, or publication approval.',
      'Promotion requires a typed, receipted case ledger and human review.'
    ]
  };

  if (write) writeJson(`${BASE}/manifest.json`, manifest);
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = buildNextTenEstates();
  console.log(`next ten estates: ${manifest.counts.estates} estates, ${manifest.counts.sources} sources, ${manifest.counts.raw_records} raw records`);
}
