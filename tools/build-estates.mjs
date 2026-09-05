#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson, readJsonl, root, writeJson } from './lib/ledger.mjs';

export const ESTATE_REGISTRY_SCHEMA_VERSION = 'estate-registry@1';
export const COMPILED_ESTATE_REGISTRY_SCHEMA_VERSION = 'compiled-estate-registry@1';

const BASE = 'data/estates';
const META_SOURCE = `${BASE}/meta.json`;
const ESTATES_DIRECTORY = `${BASE}/definitions`;
const CASE_MAP_SOURCE = `${BASE}/case-map.jsonl`;
const TRACK_MAP_SOURCE = `${BASE}/track-map.jsonl`;
const SLICE_MAP_SOURCE = `${BASE}/slice-map.jsonl`;
const OUTPUT = 'build/estates/index.json';
const FORBIDDEN_KEYS = /^(?:guilt_score|corruption_score|motive_score|influence_score|risk_score|probability_score|ranking|rank|score|verdict|finding|claim_status|publication_approval)$/i;

function fail(message) {
  throw new Error(`estates: ${message}`);
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
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

function assertMapCoverage({ rows, sourceIds, idField, owner }) {
  const seen = new Set();
  for (const row of rows) {
    const id = row[idField];
    if (!String(id ?? '').trim()) fail(`${owner} row lacks ${idField}`);
    if (seen.has(id)) fail(`${owner} duplicates ${id}`);
    seen.add(id);
  }
  const missing = sourceIds.filter(id => !seen.has(id));
  const extra = [...seen].filter(id => !sourceIds.includes(id));
  if (missing.length || extra.length) fail(`${owner} coverage diverged; missing [${missing.join(', ')}], extra [${extra.join(', ')}]`);
}

function validateMembership(row, estateIds, owner) {
  if (!estateIds.has(row.primary_estate_id)) fail(`${owner} references missing primary estate ${row.primary_estate_id}`);
  const related = row.related_estate_ids ?? [];
  if (!Array.isArray(related)) fail(`${owner} related_estate_ids must be an array`);
  if (new Set(related).size !== related.length) fail(`${owner} duplicates a related estate`);
  if (related.includes(row.primary_estate_id)) fail(`${owner} repeats its primary estate as related`);
  for (const estateId of related) if (!estateIds.has(estateId)) fail(`${owner} references missing related estate ${estateId}`);
}

function validateEstate(estate, estateIds) {
  for (const field of ['estate_id', 'label', 'generation', 'domain', 'scope', 'current_state', 'dominant_fog', 'boundary']) {
    if (!String(estate[field] ?? '').trim()) fail(`${estate.estate_id ?? 'estate'} lacks ${field}`);
  }
  if (!['existing', 'next', 'frontier'].includes(estate.generation)) fail(`${estate.estate_id} has invalid generation ${estate.generation}`);
  if (!Array.isArray(estate.jurisdictions) || estate.jurisdictions.length === 0) fail(`${estate.estate_id} lacks jurisdictions`);
  if (!Array.isArray(estate.asset_refs) || estate.asset_refs.length === 0) fail(`${estate.estate_id} lacks asset_refs`);
  if (!Array.isArray(estate.fog) || estate.fog.length === 0) fail(`${estate.estate_id} lacks fog`);
  if (!estate.next_acquisition || !String(estate.next_acquisition.operation ?? '').trim()
    || !String(estate.next_acquisition.decisive_output ?? '').trim()
    || !Array.isArray(estate.next_acquisition.source_routes)
    || estate.next_acquisition.source_routes.length === 0) fail(`${estate.estate_id} lacks an executable next acquisition`);
  for (const asset of estate.asset_refs) {
    if (!['path', 'logical'].includes(asset.kind)) fail(`${estate.estate_id} asset has invalid kind ${asset.kind}`);
    if (!String(asset.role ?? '').trim()) fail(`${estate.estate_id} asset lacks role`);
    if (asset.kind === 'path') {
      if (!String(asset.path ?? '').trim()) fail(`${estate.estate_id} path asset lacks path`);
      if (!fs.existsSync(path.join(root, asset.path))) fail(`${estate.estate_id} path asset does not exist: ${asset.path}`);
    } else if (!String(asset.ref ?? '').trim()) {
      fail(`${estate.estate_id} logical asset lacks ref`);
    }
  }
  if (!estateIds.has(estate.estate_id)) fail(`${estate.estate_id} did not enter the estate set`);
}

export function buildEstates({ write = true } = {}) {
  const registry = {
    ...readJson(META_SOURCE),
    estates: fs.readdirSync(path.join(root, ESTATES_DIRECTORY), { withFileTypes: true })
      .filter(entry => entry.isFile() && entry.name.endsWith('.json'))
      .map(entry => readJson(`${ESTATES_DIRECTORY}/${entry.name}`))
      .sort((a, b) => a.estate_id.localeCompare(b.estate_id)),
    case_map: readJsonl(CASE_MAP_SOURCE),
    track_map: readJsonl(TRACK_MAP_SOURCE),
    slice_map: readJsonl(SLICE_MAP_SOURCE)
  };
  const publicCatalog = readJson('build/public-catalog.json');
  const trackIndex = readJson('data/research-tracks/index.json');
  const firstSlices = readJsonl('data/intake/next-ten-estates/estates.jsonl');
  const expansion = readJson('data/intake/estate-expansion-01/next-ten.json');
  const completion = readJson('data/intake/estate-expansion-01/completion.json');

  if (registry.schema_version !== ESTATE_REGISTRY_SCHEMA_VERSION) fail(`expected ${ESTATE_REGISTRY_SCHEMA_VERSION}`);
  if (registry.graph_effect !== 'none' || registry.conclusion_generated !== false) fail('registry exceeds the non-inference boundary');
  if (!Array.isArray(registry.estates) || registry.estates.length !== 24) fail('registry must contain twenty-four macro estates');

  walk(registry, (key, item, pointer) => {
    if (FORBIDDEN_KEYS.test(key)) fail(`registry contains prohibited field ${pointer}`);
    if (key === 'graph_effect' && item !== 'none') fail(`registry contains graph-active field ${pointer}`);
    if (key === 'conclusion_generated' && item !== false) fail(`registry contains conclusion-generating field ${pointer}`);
  });

  const estateIds = new Set();
  for (const estate of registry.estates) {
    if (estateIds.has(estate.estate_id)) fail(`duplicate estate_id ${estate.estate_id}`);
    estateIds.add(estate.estate_id);
  }
  for (const estate of registry.estates) validateEstate(estate, estateIds);

  const generationById = new Map();
  for (const generation of registry.generations ?? []) {
    if (!['existing', 'next', 'frontier'].includes(generation.generation)) fail(`invalid generation ${generation.generation}`);
    for (const estateId of generation.estate_ids ?? []) {
      if (!estateIds.has(estateId)) fail(`generation ${generation.generation} references missing estate ${estateId}`);
      if (generationById.has(estateId)) fail(`estate ${estateId} occurs in multiple generations`);
      generationById.set(estateId, generation.generation);
    }
  }
  if (generationById.size !== estateIds.size) fail('generation membership does not cover every estate');
  const existingCount = [...generationById.values()].filter(value => value === 'existing').length;
  const nextCount = [...generationById.values()].filter(value => value === 'next').length;
  const frontierCount = [...generationById.values()].filter(value => value === 'frontier').length;
  if (existingCount !== 4 || nextCount !== 10 || frontierCount !== 10) {
    fail(`expected four existing, ten next, and ten frontier estates, found ${existingCount}, ${nextCount}, and ${frontierCount}`);
  }
  for (const estate of registry.estates) if (generationById.get(estate.estate_id) !== estate.generation) fail(`${estate.estate_id} generation diverged`);

  const cases = publicCatalog.cases ?? [];
  const tracks = trackIndex.tracks ?? [];
  const secondSlices = expansion.estates ?? [];
  const slices = [
    ...firstSlices.map(item => ({ slice_id: item.estate_id, source_package: 'next-ten-estates', track_id: item.track_id, raw_records: item.raw_records ?? 0 })),
    ...secondSlices.map(item => ({ slice_id: item.estate_id, source_package: 'estate-expansion-01', track_id: item.track_id, raw_records: rawUnitCount(item.records) }))
  ];
  const completionBySlice = new Map((completion.estates ?? []).map(item => [item.estate_id, item]));

  assertMapCoverage({ rows: registry.case_map ?? [], sourceIds: cases.map(item => item.case_id), idField: 'case_id', owner: 'case_map' });
  assertMapCoverage({ rows: registry.track_map ?? [], sourceIds: tracks.map(item => item.track_id), idField: 'track_id', owner: 'track_map' });
  assertMapCoverage({ rows: registry.slice_map ?? [], sourceIds: slices.map(item => item.slice_id), idField: 'slice_id', owner: 'slice_map' });

  for (const row of registry.case_map) validateMembership(row, estateIds, `case ${row.case_id}`);
  for (const row of registry.track_map) validateMembership(row, estateIds, `track ${row.track_id}`);
  for (const row of registry.slice_map) validateMembership(row, estateIds, `slice ${row.slice_id}`);

  const trackById = new Map(tracks.map(item => [item.track_id, item]));
  const sliceById = new Map(slices.map(item => [item.slice_id, item]));
  for (const row of registry.slice_map) {
    const slice = sliceById.get(row.slice_id);
    if (!slice) fail(`slice map references missing slice ${row.slice_id}`);
    if (row.source_package !== slice.source_package) fail(`${row.slice_id} source package diverged`);
    if (row.track_id !== slice.track_id) fail(`${row.slice_id} track diverged`);
    if (!trackById.has(row.track_id)) fail(`${row.slice_id} references undeclared track ${row.track_id}`);
  }

  const casesById = new Map(cases.map(item => [item.case_id, item]));
  const compiledEstates = registry.estates.map(estate => {
    const primaryCases = registry.case_map.filter(item => item.primary_estate_id === estate.estate_id).map(item => item.case_id);
    const relatedCases = registry.case_map.filter(item => (item.related_estate_ids ?? []).includes(estate.estate_id)).map(item => item.case_id);
    const primaryTracks = registry.track_map.filter(item => item.primary_estate_id === estate.estate_id).map(item => item.track_id);
    const relatedTracks = registry.track_map.filter(item => (item.related_estate_ids ?? []).includes(estate.estate_id)).map(item => item.track_id);
    const primarySlices = registry.slice_map.filter(item => item.primary_estate_id === estate.estate_id).map(item => item.slice_id);
    const relatedSlices = registry.slice_map.filter(item => (item.related_estate_ids ?? []).includes(estate.estate_id)).map(item => item.slice_id);

    const primaryCaseRows = primaryCases.map(id => casesById.get(id)).filter(Boolean);
    const primarySliceRows = primarySlices.map(id => sliceById.get(id)).filter(Boolean);
    const completionRecords = primarySlices.reduce((total, id) => total + rawUnitCount(completionBySlice.get(id)?.records), 0);

    return {
      ...estate,
      membership: {
        primary_cases: primaryCases,
        related_cases: relatedCases,
        primary_tracks: primaryTracks,
        related_tracks: relatedTracks,
        primary_slices: primarySlices,
        related_slices: relatedSlices
      },
      custody_counts: {
        path_assets: estate.asset_refs.filter(item => item.kind === 'path').length,
        logical_assets: estate.asset_refs.filter(item => item.kind === 'logical').length,
        primary_cases: primaryCases.length,
        related_cases: relatedCases.length,
        primary_tracks: primaryTracks.length,
        related_tracks: relatedTracks.length,
        primary_slices: primarySlices.length,
        related_slices: relatedSlices.length,
        primary_case_claims: primaryCaseRows.reduce((total, item) => total + Number(item.counts?.claims ?? 0), 0),
        primary_case_receipts: primaryCaseRows.reduce((total, item) => total + Number(item.counts?.receipts ?? 0), 0),
        primary_slice_records: primarySliceRows.reduce((total, item) => total + Number(item.raw_records ?? 0), 0),
        primary_slice_completion_records: completionRecords
      },
      graph_effect: 'none',
      conclusion_generated: false
    };
  });

  const compiled = {
    schema_version: COMPILED_ESTATE_REGISTRY_SCHEMA_VERSION,
    as_of: registry.as_of,
    definition: registry.definition,
    legacy_translation: registry.legacy_translation,
    graph_effect: 'none',
    conclusion_generated: false,
    counts: {
      estates: compiledEstates.length,
      existing_estates: existingCount,
      next_estates: nextCount,
      frontier_estates: frontierCount,
      mapped_cases: cases.length,
      mapped_tracks: tracks.length,
      mapped_slices: slices.length,
      primary_case_claims: cases.reduce((total, item) => total + Number(item.counts?.claims ?? 0), 0),
      primary_case_receipts: cases.reduce((total, item) => total + Number(item.counts?.receipts ?? 0), 0),
      slice_records: slices.reduce((total, item) => total + Number(item.raw_records ?? 0), 0),
      completion_records: (completion.estates ?? []).reduce((total, item) => total + rawUnitCount(item.records), 0)
    },
    generations: registry.generations,
    fog_vocabulary: registry.fog_vocabulary,
    estates: compiledEstates,
    crosswalks: {
      cases: registry.case_map.map(item => ({ ...item, case_title: casesById.get(item.case_id)?.title ?? item.case_id })),
      tracks: registry.track_map.map(item => ({ ...item, track_label: trackById.get(item.track_id)?.label ?? item.track_id })),
      slices: registry.slice_map.map(item => ({ ...item, raw_records: sliceById.get(item.slice_id)?.raw_records ?? 0 }))
    },
    boundaries: registry.boundaries,
    integrity: {
      sources: [META_SOURCE, `${ESTATES_DIRECTORY}/*.json`, CASE_MAP_SOURCE, TRACK_MAP_SOURCE, SLICE_MAP_SOURCE],
      source_sha256: sha256([
        fs.readFileSync(path.join(root, META_SOURCE)),
        ...fs.readdirSync(path.join(root, ESTATES_DIRECTORY)).filter(name => name.endsWith('.json')).sort()
          .map(name => fs.readFileSync(path.join(root, ESTATES_DIRECTORY, name))),
        fs.readFileSync(path.join(root, CASE_MAP_SOURCE)),
        fs.readFileSync(path.join(root, TRACK_MAP_SOURCE)),
        fs.readFileSync(path.join(root, SLICE_MAP_SOURCE))
      ].reduce((chunks, value) => Buffer.concat([chunks, value]), Buffer.alloc(0)))
    }
  };

  if (write) writeJson(OUTPUT, compiled);
  return compiled;
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && invokedPath === path.resolve(fileURLToPath(import.meta.url))) {
  const output = buildEstates();
  console.log(`estates: ${output.counts.estates} macro estates, ${output.counts.mapped_slices} slices, ${output.counts.mapped_cases} cases, ${output.counts.mapped_tracks} tracks`);
}
