#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const expansionRoot = path.join(root, 'data', 'intake', 'estate-expansion-01');
const baseRoot = path.join(root, 'data', 'intake', 'next-ten-estates');

const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const readJson = file => JSON.parse(read(file));
const readJsonl = file => read(file).split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const writeJson = (file, value) => {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
};
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const countBy = (rows, field) => Object.fromEntries([...rows.reduce((map, row) => {
  const key = row[field] ?? 'unspecified';
  map.set(key, (map.get(key) ?? 0) + 1);
  return map;
}, new Map()).entries()].sort(([a], [b]) => a.localeCompare(b)));
const unique = values => [...new Set(values.filter(Boolean))];
const logicalRecordCount = records => (records ?? []).reduce((total, record) => total + (Number.isInteger(record.unit_count) ? record.unit_count : 1), 0);
const forbiddenKeys = new Set([
  'score', 'rank', 'ranking', 'verdict', 'finding', 'claim_status', 'causal_status',
  'publication_status', 'guilt_score', 'corruption_score', 'motive_score',
  'influence_score', 'risk_score', 'probability_score'
]);

function walkKeys(value, visit) {
  if (Array.isArray(value)) {
    value.forEach(item => walkKeys(item, visit));
    return;
  }
  if (!value || typeof value !== 'object') return;
  for (const [key, child] of Object.entries(value)) {
    visit(key, child);
    walkKeys(child, visit);
  }
}

function assert(condition, message, errors) {
  if (!condition) errors.push(message);
}

function sourceIds(value) {
  return unique([
    ...(value.source_ids ?? []),
    ...((value.denominator?.source_ids) ?? []),
    ...(value.records ?? []).flatMap(record => record.source_ids ?? []),
    ...(value.required_layers ?? []).flatMap(layer => layer.source_ids ?? []),
    ...(value.layer_closures ?? []).flatMap(layer => layer.source_ids ?? [])
  ]);
}

function validateBoundary(value, label, errors) {
  assert(value.promotes_to === 'candidate_only', `${label} must promote only to candidate_only`, errors);
  assert(value.graph_effect === 'none', `${label} must remain graph-inert`, errors);
  assert(value.conclusion_generated === false, `${label} must not generate a conclusion`, errors);
}

function validateSourcesForEstate(value, sourceById, label, errors) {
  for (const id of sourceIds(value)) {
    const source = sourceById.get(id);
    assert(Boolean(source), `${label} references missing source ${id}`, errors);
    if (source) assert((source.supports ?? []).includes(value.estate_id), `${label} source ${id} does not declare support for ${value.estate_id}`, errors);
  }
}

export function buildEstateExpansion({ write = true } = {}) {
  const errors = [];
  const baseSummaries = readJsonl('data/intake/next-ten-estates/estates.jsonl');
  const inheritedSources = readJsonl('data/intake/next-ten-estates/sources.jsonl');
  const newSources = readJsonl('data/intake/estate-expansion-01/sources.jsonl');
  const completion = readJson('data/intake/estate-expansion-01/completion.json');
  const nextTen = readJson('data/intake/estate-expansion-01/next-ten.json');
  const triage = readJson('data/intake/estate-expansion-01/triage.json');
  const trackIndex = readJson('data/research-tracks/index.json');

  const inheritedIds = new Set(inheritedSources.map(source => source.source_id));
  const newIds = new Set();
  for (const [index, source] of newSources.entries()) {
    assert(Boolean(source.source_id), `new source ${index + 1} lacks source_id`, errors);
    assert(!newIds.has(source.source_id), `duplicate new source ${source.source_id}`, errors);
    assert(!inheritedIds.has(source.source_id), `new source ${source.source_id} collides with inherited source`, errors);
    newIds.add(source.source_id);
    assert(/^https?:\/\//.test(source.url ?? ''), `new source ${source.source_id} lacks a safe public URL`, errors);
    assert(Array.isArray(source.supports) && source.supports.length > 0, `new source ${source.source_id} lacks supports`, errors);
  }
  const sourceById = new Map([...inheritedSources, ...newSources].map(source => [source.source_id, source]));

  validateBoundary(completion, 'completion package', errors);
  validateBoundary(nextTen, 'second-cohort package', errors);
  validateBoundary(triage, 'fog frontier', errors);

  const baseById = new Map(baseSummaries.map(item => [item.estate_id, item]));
  const incompleteByEstate = new Map();
  for (const summary of baseSummaries) {
    const raw = readJson(summary.raw_file);
    incompleteByEstate.set(summary.estate_id, new Map(
      (raw.required_layers ?? [])
        .filter(layer => layer.state !== 'surface_complete')
        .map(layer => [layer.layer, layer.state])
    ));
  }

  assert(completion.schema_version === 'estate-completion-pass@1', 'completion schema version is invalid', errors);
  assert(completion.estates.length === baseSummaries.length, 'completion must cover every first-ten estate', errors);
  const completionIds = new Set();
  let closedLayers = 0;
  const closureRows = [];
  for (const estate of completion.estates) {
    validateBoundary(estate, `completion estate ${estate.estate_id}`, errors);
    assert(baseById.has(estate.estate_id), `completion references unknown first-ten estate ${estate.estate_id}`, errors);
    assert(!completionIds.has(estate.estate_id), `completion duplicates estate ${estate.estate_id}`, errors);
    completionIds.add(estate.estate_id);
    assert(baseById.get(estate.estate_id)?.track_id === estate.track_id, `completion ${estate.estate_id} changes track identity`, errors);
    validateSourcesForEstate(estate, sourceById, `completion ${estate.estate_id}`, errors);

    const expected = incompleteByEstate.get(estate.estate_id) ?? new Map();
    const seen = new Set();
    for (const closure of estate.layer_closures ?? []) {
      closedLayers += 1;
      closureRows.push(closure);
      assert(expected.has(closure.layer), `completion ${estate.estate_id} closes non-incomplete layer ${closure.layer}`, errors);
      assert(!seen.has(closure.layer), `completion ${estate.estate_id} duplicates closure ${closure.layer}`, errors);
      seen.add(closure.layer);
      assert(closure.previous_state === expected.get(closure.layer), `completion ${estate.estate_id}.${closure.layer} previous_state diverges`, errors);
      assert(['surface_complete', 'partially_searched', 'unavailable_after_search'].includes(closure.closure_state),
        `completion ${estate.estate_id}.${closure.layer} has invalid closure_state ${closure.closure_state}`, errors);
      assert(closure.closure_state !== 'not_searched', `completion ${estate.estate_id}.${closure.layer} remains not_searched`, errors);
      assert(Boolean(closure.resolution), `completion ${estate.estate_id}.${closure.layer} lacks resolution`, errors);
      assert(Array.isArray(closure.source_ids) && closure.source_ids.length > 0, `completion ${estate.estate_id}.${closure.layer} lacks source IDs`, errors);
      if (closure.closure_state === 'partially_searched') {
        assert(Boolean(closure.residual_fog), `completion ${estate.estate_id}.${closure.layer} partial state lacks residual_fog`, errors);
        assert(Boolean(closure.next_step), `completion ${estate.estate_id}.${closure.layer} partial state lacks next_step`, errors);
      }
      if (closure.closure_state === 'unavailable_after_search') {
        assert(Boolean(closure.search_provenance?.query), `completion ${estate.estate_id}.${closure.layer} unavailable state lacks query provenance`, errors);
        assert(Boolean(closure.search_provenance?.attempted_at), `completion ${estate.estate_id}.${closure.layer} unavailable state lacks timestamp`, errors);
        assert(Boolean(closure.search_provenance?.result), `completion ${estate.estate_id}.${closure.layer} unavailable state lacks result`, errors);
      }
    }
    assert(seen.size === expected.size, `completion ${estate.estate_id} closes ${seen.size}/${expected.size} incomplete layers`, errors);
    for (const layer of expected.keys()) assert(seen.has(layer), `completion ${estate.estate_id} omits layer ${layer}`, errors);
  }
  assert(completionIds.size === baseSummaries.length, 'completion estate identities do not reconcile', errors);

  assert(nextTen.schema_version === 'estate-second-cohort@1', 'second-cohort schema version is invalid', errors);
  assert(nextTen.estates.length === 10, 'second cohort must contain exactly ten estates', errors);
  const declaredTracks = (trackIndex.tracks ?? []).map(item => item.track_id).sort();
  const secondTracks = nextTen.estates.map(item => item.track_id).sort();
  assert(JSON.stringify(secondTracks) === JSON.stringify(declaredTracks), 'second cohort must cover every declared research track exactly once', errors);
  const nextIds = new Set();
  const secondLayerRows = [];
  for (const estate of nextTen.estates) {
    validateBoundary(estate, `second estate ${estate.estate_id}`, errors);
    assert(!nextIds.has(estate.estate_id), `second cohort duplicates estate ${estate.estate_id}`, errors);
    nextIds.add(estate.estate_id);
    assert(estate.denominator?.coverage_state === 'surface_complete' || estate.denominator?.coverage_state === 'partially_searched',
      `second estate ${estate.estate_id} denominator state is invalid`, errors);
    if (estate.denominator?.coverage_state === 'surface_complete') {
      assert(estate.denominator.expected_count === estate.denominator.acquired_count,
        `second estate ${estate.estate_id} complete denominator does not reconcile`, errors);
    }
    assert((estate.records ?? []).length > 0, `second estate ${estate.estate_id} lacks raw records`, errors);
    assert((estate.required_layers ?? []).length > 0, `second estate ${estate.estate_id} lacks required layers`, errors);
    validateSourcesForEstate(estate, sourceById, `second estate ${estate.estate_id}`, errors);
    for (const layer of estate.required_layers ?? []) {
      secondLayerRows.push(layer);
      assert(['surface_complete', 'partially_searched', 'unavailable_after_search'].includes(layer.state),
        `second estate ${estate.estate_id}.${layer.layer} has invalid state ${layer.state}`, errors);
      assert(layer.state !== 'not_searched', `second estate ${estate.estate_id}.${layer.layer} remains not_searched`, errors);
      assert(Boolean(layer.resolution), `second estate ${estate.estate_id}.${layer.layer} lacks resolution`, errors);
      assert(Array.isArray(layer.source_ids) && layer.source_ids.length > 0, `second estate ${estate.estate_id}.${layer.layer} lacks source IDs`, errors);
      if (layer.state === 'partially_searched') {
        assert(Boolean(layer.residual_fog), `second estate ${estate.estate_id}.${layer.layer} partial state lacks residual_fog`, errors);
        assert(Boolean(layer.next_step), `second estate ${estate.estate_id}.${layer.layer} partial state lacks next_step`, errors);
      }
    }
  }

  assert(triage.schema_version === 'estate-fog-frontier@1', 'fog frontier schema version is invalid', errors);
  const order = triage.next_ten_work_order ?? [];
  assert(order.length === 10, 'fog frontier work order must contain ten estates', errors);
  assert(new Set(order.map(item => item.position)).size === 10, 'fog frontier work positions must be unique', errors);
  assert(JSON.stringify(order.map(item => item.position).sort((a, b) => a - b)) === JSON.stringify([1,2,3,4,5,6,7,8,9,10]),
    'fog frontier work positions must be 1-10', errors);
  assert(new Set(order.map(item => item.estate_id)).size === 10, 'fog frontier work order duplicates estates', errors);
  for (const item of order) assert(nextIds.has(item.estate_id), `fog frontier references unknown second estate ${item.estate_id}`, errors);
  assert(new Set((triage.first_ten_after_closure ?? []).map(item => item.estate_id)).size === baseSummaries.length,
    'fog frontier must summarize every first-ten estate', errors);

  for (const [label, value] of [['completion', completion], ['second cohort', nextTen], ['fog frontier', triage]]) {
    walkKeys(value, key => assert(!forbiddenKeys.has(key), `${label} contains forbidden key ${key}`, errors));
  }

  if (errors.length) throw new Error(errors.join('\n'));

  const completionText = read('data/intake/estate-expansion-01/completion.json');
  const nextText = read('data/intake/estate-expansion-01/next-ten.json');
  const triageText = read('data/intake/estate-expansion-01/triage.json');
  const sourceText = read('data/intake/estate-expansion-01/sources.jsonl');

  const manifest = {
    schema_version: 'estate-expansion-manifest@1',
    as_of: completion.as_of,
    purpose: 'Close the first ten investigation pass and add ten fog-reducing control estates.',
    promotes_to: 'candidate_only',
    graph_effect: 'none',
    conclusion_generated: false,
    counts: {
      first_ten_estates: completion.estates.length,
      first_ten_incomplete_layers_closed: closedLayers,
      first_ten_closure_states: countBy(closureRows, 'closure_state'),
      first_ten_completion_records: completion.estates.reduce((total, estate) => total + logicalRecordCount(estate.records), 0),
      second_cohort_estates: nextTen.estates.length,
      second_cohort_tracks: new Set(nextTen.estates.map(item => item.track_id)).size,
      second_cohort_records: nextTen.estates.reduce((total, estate) => total + logicalRecordCount(estate.records), 0),
      second_cohort_layer_states: countBy(secondLayerRows, 'state'),
      inherited_sources: inheritedSources.length,
      new_sources: newSources.length,
      total_source_registry: sourceById.size
    },
    first_ten_estate_ids: completion.estates.map(item => item.estate_id),
    second_cohort_estate_ids: nextTen.estates.map(item => item.estate_id),
    track_ids: nextTen.estates.map(item => item.track_id),
    work_order: order.map(item => ({ position: item.position, estate_id: item.estate_id, control_type: item.control_type })),
    integrity: {
      completion_sha256: sha256(completionText),
      second_cohort_sha256: sha256(nextText),
      triage_sha256: sha256(triageText),
      new_sources_sha256: sha256(sourceText)
    },
    boundaries: unique([...(completion.boundaries ?? []), ...(nextTen.boundaries ?? []), ...(triage.boundaries ?? [])])
  };

  if (write) writeJson('data/intake/estate-expansion-01/manifest.json', manifest);
  return manifest;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const manifest = buildEstateExpansion();
  console.log(`estate expansion: ${manifest.counts.first_ten_incomplete_layers_closed} first-pass layers closed, ${manifest.counts.second_cohort_estates} control estates, ${manifest.counts.second_cohort_records} logical second-cohort records`);
}
