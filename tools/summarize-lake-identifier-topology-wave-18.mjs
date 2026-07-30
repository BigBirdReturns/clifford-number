#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const policy = JSON.parse(fs.readFileSync(full('data/project/lake-identifier-topology-wave-18-policy.json'), 'utf8'));
const preflight = JSON.parse(fs.readFileSync(full(policy.paths.preflight), 'utf8'));
const objects = fs.readFileSync(full('build/lake-index/objects.jsonl'), 'utf8')
  .split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));

function increment(map, key, by = 1) { map.set(key, (map.get(key) ?? 0) + by); }
function sortedCounts(map) {
  return [...map.entries()]
    .sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))
    .map(([key, count]) => ({ key, count }));
}
function unique(values) { return [...new Set(values)].sort((a, b) => a.localeCompare(b)); }
function projectionOccurrence(occurrence) {
  return occurrence.generated === true
    || ['report_product', 'briefing_product', 'estate_projection', 'gametrail_projection'].includes(occurrence.role);
}
function pathFamily(file) {
  const parts = String(file).split('/');
  if (file.startsWith('build/lake-index/')) return 'build/lake-index';
  if (file.startsWith('build/lake-actions/')) return 'build/lake-actions';
  if (file.startsWith('build/cases/')) return 'build/cases';
  if (file.startsWith('build/briefings/')) return 'build/briefings';
  if (file.startsWith('build/core-thesis/')) return 'build/core-thesis';
  if (file.startsWith('build/estate-game-trails/')) return 'build/estate-game-trails';
  if (file.startsWith('build/estate-frontier/')) return 'build/estate-frontier';
  if (file.startsWith('build/estate-closures/')) return 'build/estate-closures';
  if (file.startsWith('build/')) return `build/${parts[1] ?? 'root'}`;
  if (file.startsWith('data/intake/')) return `data/intake/${parts[2] ?? 'root'}`;
  if (file.startsWith('data/research-tracks/')) return `data/research-tracks/${parts[2] ?? 'root'}`;
  if (file.startsWith('data/research/')) return 'data/research';
  if (file.startsWith('data/project/')) return 'data/project';
  if (file.startsWith('data/canonical/')) return 'data/canonical';
  if (file.startsWith('data/ledger/')) return 'data/ledger';
  if (file.startsWith('cases/')) return `cases/${parts[1] ?? 'root'}`;
  if (file.startsWith('reports/')) return `reports/${parts[1] ?? 'root'}`;
  if (file.startsWith('docs/')) return `docs/${parts[1] ?? 'root'}`;
  if (file.startsWith('estates/')) return 'estates';
  if (file.startsWith('gametrails/')) return 'gametrails';
  if (file.startsWith('briefs/')) return 'briefs';
  return parts[0] || 'root';
}
function pointerTemplate(pointer) {
  return String(pointer ?? '')
    .replace(/\/line-\d+(?=\/|$)/g, '/line-*')
    .replace(/\/\d+(?=\/|$)/g, '/*');
}

const objectByCompound = new Map(objects.map(object => [`${object.id_key}:${object.id_value}`, object]));
const undecided = preflight.topology_rows.filter(row => row.source_only?.classification === 'source_only_family_adjudication_required');
const samePath = preflight.topology_rows.filter(row => row.divergence?.classification === 'same_path_projection_variants');

const undecidedByKey = new Map();
const undecidedByFamily = new Map();
const undecidedByRole = new Map();
const undecidedByKeyFamily = new Map();
const undecidedByPath = new Map();
for (const row of undecided) {
  const familySignature = row.source_families.join('+') || '(none)';
  const roleSignature = row.source_roles.join('+') || '(none)';
  increment(undecidedByKey, row.id_key);
  increment(undecidedByFamily, familySignature);
  increment(undecidedByRole, roleSignature);
  increment(undecidedByKeyFamily, `${row.id_key} :: ${familySignature}`);
  for (const sourcePath of row.source_paths) increment(undecidedByPath, sourcePath);
}

const samePathByKey = new Map();
const samePathByFamily = new Map();
const samePathByPath = new Map();
const samePathByPathKey = new Map();
const samePathShapeCounts = new Map();
const singleTemplateByFamilyKeyTemplate = new Map();
const multiTemplateByFamilyKey = new Map();
const samePathDetails = [];
for (const row of samePath) {
  const object = objectByCompound.get(`${row.id_key}:${row.id_value}`);
  if (!object) throw new Error(`missing object row for ${row.id_key}:${row.id_value}`);
  const projections = object.occurrences.filter(projectionOccurrence);
  const byPath = new Map();
  for (const occurrence of projections) {
    const list = byPath.get(occurrence.path) ?? [];
    list.push(occurrence);
    byPath.set(occurrence.path, list);
  }
  const conflictingPaths = [...byPath.entries()].filter(([, occurrences]) => new Set(occurrences.map(item => item.object_hash)).size > 1);
  const pathDetails = conflictingPaths.map(([file, occurrences]) => {
    const templates = unique(occurrences.map(item => pointerTemplate(item.pointer)));
    const hashes = unique(occurrences.map(item => item.object_hash));
    const family = pathFamily(file);
    const shape = templates.length > 1
      ? 'multiple_pointer_templates_same_path'
      : occurrences.length > 1
        ? 'single_pointer_template_repeated_rows'
        : 'single_occurrence_hash_anomaly';
    increment(samePathShapeCounts, shape);
    increment(samePathByPath, file);
    increment(samePathByFamily, family);
    increment(samePathByPathKey, `${file} :: ${row.id_key}`);
    if (shape === 'single_pointer_template_repeated_rows') {
      increment(singleTemplateByFamilyKeyTemplate, `${family} :: ${row.id_key} :: ${templates[0]}`);
    } else if (shape === 'multiple_pointer_templates_same_path') {
      increment(multiTemplateByFamilyKey, `${family} :: ${row.id_key}`);
    }
    return {
      path: file,
      family,
      occurrence_count: occurrences.length,
      hash_count: hashes.length,
      pointer_templates: templates,
      shape
    };
  });
  increment(samePathByKey, row.id_key);
  samePathDetails.push({ id_key: row.id_key, id_value: row.id_value, conflicting_paths: pathDetails });
}

const summary = {
  schema_version: 'lake-identifier-topology-wave-18-family-diagnostics@2',
  program_id: policy.program_id,
  counts: {
    source_only_family_adjudication_required: undecided.length,
    same_path_projection_variants: samePath.length,
    source_only_by_key: sortedCounts(undecidedByKey),
    source_only_by_family_signature: sortedCounts(undecidedByFamily),
    source_only_by_role_signature: sortedCounts(undecidedByRole),
    source_only_by_key_and_family: sortedCounts(undecidedByKeyFamily),
    source_only_by_path: sortedCounts(undecidedByPath),
    same_path_by_key: sortedCounts(samePathByKey),
    same_path_by_family: sortedCounts(samePathByFamily),
    same_path_by_path: sortedCounts(samePathByPath),
    same_path_by_path_and_key: sortedCounts(samePathByPathKey),
    same_path_shape_counts: sortedCounts(samePathShapeCounts),
    single_template_repetitions_by_family_key_template: sortedCounts(singleTemplateByFamilyKeyTemplate),
    multi_template_repetitions_by_family_and_key: sortedCounts(multiTemplateByFamilyKey)
  },
  source_only_samples: undecided.slice(0, 200).map(row => ({
    id_key: row.id_key,
    id_value: row.id_value,
    source_families: row.source_families,
    source_roles: row.source_roles,
    source_paths: row.source_paths
  })),
  same_path_samples: samePathDetails.slice(0, 320),
  boundaries: policy.boundaries
};

const jsonPath = 'build/lake-actions/identifier-topology-wave-18-family-diagnostics.json';
const reportPath = 'reports/lake-identifier-topology-wave-18-family-diagnostics.md';
fs.mkdirSync(path.dirname(full(jsonPath)), { recursive: true });
fs.writeFileSync(full(jsonPath), `${JSON.stringify(summary, null, 2)}\n`);

const lines = ['# Identifier topology — Wave 18 family diagnostics', '', '```text',
  `unclassified source-only rows: ${undecided.length}`,
  `same-path projection rows:     ${samePath.length}`,
  'review required to decide:     false',
  'graph effect:                  none',
  '```', '', '## Unclassified source-only rows by key', ''];
for (const row of summary.counts.source_only_by_key.slice(0, 80)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Unclassified source-only rows by family signature', '');
for (const row of summary.counts.source_only_by_family_signature.slice(0, 80)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Unclassified source-only rows by role signature', '');
for (const row of summary.counts.source_only_by_role_signature.slice(0, 40)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Unclassified source-only key × family groups', '');
for (const row of summary.counts.source_only_by_key_and_family.slice(0, 120)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Same-path variants by identifier key', '');
for (const row of summary.counts.same_path_by_key.slice(0, 100)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Same-path variants by projection family', '');
for (const row of summary.counts.same_path_by_family.slice(0, 80)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Same-path variant pointer shapes', '');
for (const row of summary.counts.same_path_shape_counts) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Single-template repeated-row groups', '');
for (const row of summary.counts.single_template_repetitions_by_family_key_template.slice(0, 180)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Multi-template same-path groups', '');
for (const row of summary.counts.multi_template_repetitions_by_family_and_key.slice(0, 120)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Top exact projection paths', '');
for (const row of summary.counts.same_path_by_path.slice(0, 100)) lines.push(`- ${row.key}: ${row.count}`);
lines.push('', '## Boundary', '', 'The same identifier appearing in multiple object contexts inside one generated file is not automatically a conflicting definition. Single pointer-template repetition usually identifies repeated contextual rows; multi-template repetition usually identifies multiple typed views. Neither authorizes an identity or truth join without a declared contract.');
fs.writeFileSync(full(reportPath), `${lines.join('\n')}\n`);

console.log('identifier topology Wave 18 family diagnostics built');
console.log(`  source-only undecided / same-path variants: ${undecided.length} / ${samePath.length}`);
console.log(`  same-path shapes: ${JSON.stringify(Object.fromEntries(summary.counts.same_path_shape_counts.map(row => [row.key, row.count])))}`);
