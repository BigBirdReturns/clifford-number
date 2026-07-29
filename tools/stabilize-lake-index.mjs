#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const root = process.cwd();
const policyPath = path.join(root, 'data/project/lake-index-policy.json');
const indexPath = path.join(root, 'build/lake-index.json');
const objectPath = path.join(root, 'build/lake-object-index.json');
const gapsPath = path.join(root, 'build/lake-index-gaps.json');
const reportPath = path.join(root, 'reports/lake-index-census.md');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
}

function unique(values) {
  return [...new Set(values)];
}

function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}

function sourceOccurrence(occurrence) {
  return !projectionOccurrence(occurrence)
    && !['documentation', 'report_product', 'briefing_product'].includes(occurrence.role);
}

function pathsFor(object) {
  return unique((object.occurrences ?? []).map(occurrence => occurrence.path).filter(Boolean)).sort();
}

const policy = readJson(policyPath);
const index = readJson(indexPath);
const objects = readJson(objectPath);
const gaps = readJson(gapsPath);
const localIdentifierKeys = new Set(policy.local_identifier_keys ?? ['id']);
const allObjects = objects.objects ?? [];
const localObjects = allObjects.filter(object => localIdentifierKeys.has(object.id_key));
const globalObjects = allObjects.filter(object => !localIdentifierKeys.has(object.id_key));
const localOccurrencesByPath = new Map();

for (const object of localObjects) {
  for (const occurrence of object.occurrences ?? []) {
    localOccurrencesByPath.set(occurrence.path, (localOccurrencesByPath.get(occurrence.path) ?? 0) + 1);
  }
}

for (const object of globalObjects) {
  const projectionOccurrences = (object.occurrences ?? []).filter(projectionOccurrence);
  const sourceOccurrences = (object.occurrences ?? []).filter(sourceOccurrence);
  const allHashes = unique((object.occurrences ?? []).map(occurrence => occurrence.object_hash));
  const projectionHashes = unique(projectionOccurrences.map(occurrence => occurrence.object_hash));
  const sourceHashes = unique(sourceOccurrences.map(occurrence => occurrence.object_hash));
  object.occurrence_count = (object.occurrences ?? []).length;
  object.distinct_object_hashes = allHashes.length;
  object.distinct_projection_hashes = projectionHashes.length;
  object.distinct_source_hashes = sourceHashes.length;
  object.divergent_projections = projectionHashes.length > 1;
  object.source_definition_variants = sourceHashes.length;
  object.indexed = (object.occurrences ?? []).some(occurrence => occurrence.index_file === true);
  object.source_occurrence = sourceOccurrences.length > 0;
  object.projection_occurrence = projectionOccurrences.length > 0;
  object.source_without_projection = object.source_occurrence && !object.projection_occurrence;
  object.projection_without_source = object.projection_occurrence && !object.source_occurrence;
}
objects.objects = globalObjects.sort((a, b) => `${a.id_key}:${a.id_value}`.localeCompare(`${b.id_key}:${b.id_value}`));
objects.identifier_semantics = {
  schema_version: 'lake-identifier-semantics@1',
  global_identifier_keys_require_explicit_namespace: true,
  local_identifier_keys: [...localIdentifierKeys].sort(),
  local_identifier_values_excluded_from_global_join: localObjects.length,
  local_identifier_occurrences_excluded_from_global_join: localObjects.reduce((sum, object) => sum + (object.occurrences?.length ?? 0), 0),
  projection_divergence_compares_projection_occurrences_only: true,
  boundaries: {
    repeated_local_id_proves_same_object: false,
    source_projection_shape_difference_is_projection_divergence: false,
    source_registration_proves_evidence_truth: false
  }
};

for (const file of index.files ?? []) {
  const localCount = localOccurrencesByPath.get(file.path) ?? 0;
  file.local_identifier_count = localCount;
  file.machine_id_count = Math.max(0, Number(file.machine_id_count ?? 0) - localCount);
}

const counts = index.summary.counts;
counts.distinct_machine_ids = globalObjects.length;
counts.local_identifier_values_observed = localObjects.length;
counts.local_identifier_occurrences_observed = localObjects.reduce((sum, object) => sum + (object.occurrences?.length ?? 0), 0);
counts.unindexed_machine_ids = globalObjects.filter(object => !object.indexed).length;
counts.divergent_identifier_projections = globalObjects.filter(object => object.divergent_projections).length;
counts.source_ids_without_projection = globalObjects.filter(object => object.source_without_projection).length;
counts.projection_ids_without_source = globalObjects.filter(object => object.projection_without_source).length;
index.summary.boundaries.bare_local_identifier_globally_joined = false;
index.summary.boundaries.projection_divergence_includes_source_shape_difference = false;

gaps.unindexed_machine_ids = globalObjects
  .filter(object => !object.indexed)
  .map(object => ({ id_key: object.id_key, id_value: object.id_value, paths: pathsFor(object) }));
gaps.divergent_identifier_projections = globalObjects.filter(object => object.divergent_projections);
gaps.source_ids_without_projection = globalObjects
  .filter(object => object.source_without_projection)
  .map(object => ({ id_key: object.id_key, id_value: object.id_value, paths: pathsFor(object) }));
gaps.projection_ids_without_source = globalObjects
  .filter(object => object.projection_without_source)
  .map(object => ({ id_key: object.id_key, id_value: object.id_value, paths: pathsFor(object) }));
gaps.local_identifier_semantics = objects.identifier_semantics;

const fingerprintInput = [...index.files]
  .sort((a, b) => a.path.localeCompare(b.path))
  .map(file => `${file.path}\0${file.sha256}`)
  .join('\n') + '\n';
const fingerprint = crypto.createHash('sha256').update(fingerprintInput).digest('hex');

for (const target of [index.summary, objects, gaps]) {
  delete target.exact_head;
  delete target.exact_tree;
  target.source_fingerprint_sha256 = fingerprint;
}

writeJson(indexPath, index);
writeJson(objectPath, objects);
writeJson(gapsPath, gaps);

let report = fs.readFileSync(reportPath, 'utf8');
report = report.replace(/Exact head: `[^`]+`\s+Exact tree: `[^`]+`/m, `Source fingerprint: \`${fingerprint}\``);
const objectBlock = /distinct machine-addressable IDs:\s+\d+\nunindexed machine-addressable IDs:\s+\d+\ndivergent identifier projections:\s+\d+\nsource IDs without a projection:\s+\d+\nprojection IDs without a source object:\s+\d+/;
const replacement = `distinct machine-addressable IDs:       ${counts.distinct_machine_ids}\nlocal-only identifier values observed:   ${counts.local_identifier_values_observed}\nlocal-only identifier occurrences:       ${counts.local_identifier_occurrences_observed}\nunindexed machine-addressable IDs:      ${counts.unindexed_machine_ids}\ndivergent identifier projections:       ${counts.divergent_identifier_projections}\nsource IDs without a projection:         ${counts.source_ids_without_projection}\nprojection IDs without a source object:  ${counts.projection_ids_without_source}`;
if (!objectBlock.test(report)) throw new Error('lake census report object block drifted');
report = report.replace(objectBlock, replacement);
if (!report.includes(`Source fingerprint: \`${fingerprint}\``)) {
  throw new Error('lake census report did not expose the stabilized source fingerprint');
}
fs.writeFileSync(reportPath, report);
console.log(`lake census stabilized: ${fingerprint}`);
console.log(`  global machine IDs: ${counts.distinct_machine_ids}`);
console.log(`  local-only ID values removed from global joins: ${counts.local_identifier_values_observed}`);
console.log(`  projection IDs without source: ${counts.projection_ids_without_source}`);
