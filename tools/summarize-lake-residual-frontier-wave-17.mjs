#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const policy = JSON.parse(fs.readFileSync(full('data/project/lake-residual-frontier-wave-17-policy.json'), 'utf8'));
const preflight = JSON.parse(fs.readFileSync(full(policy.paths.preflight), 'utf8'));

function increment(map, key, row) {
  const current = map.get(key) ?? { count: 0, samples: [] };
  current.count += 1;
  if (current.samples.length < 8) current.samples.push(row);
  map.set(key, current);
}

function sortedGroups(map) {
  return [...map.entries()]
    .sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]))
    .map(([key, value]) => ({ key, ...value }));
}

const pathRefusals = preflight.path_decisions
  .filter(row => row.disposition.startsWith('typed_refusal'))
  .map(row => ({ path: row.path, role: row.role, residual_types: row.residual_types }));

const projectionGroups = new Map();
const projectionKeyClassGroups = new Map();
for (const row of preflight.projection_lineage_candidates) {
  const familyKey = `${row.classification} :: ${row.id_key} :: ${row.families.join('+')}`;
  increment(projectionGroups, familyKey, { id_value: row.id_value, paths: row.paths.slice(0, 4) });
  const keyClass = `${row.classification} :: ${row.id_key}`;
  increment(projectionKeyClassGroups, keyClass, { id_value: row.id_value, families: row.families, paths: row.paths.slice(0, 3) });
}

const diagnostics = {
  schema_version: 'lake-residual-frontier-wave-17-diagnostics@1',
  program_id: policy.program_id,
  path_refusals: pathRefusals,
  projection_groups: sortedGroups(projectionGroups),
  projection_key_class_groups: sortedGroups(projectionKeyClassGroups),
  unclassified_projection_rows: preflight.projection_lineage_candidates
    .filter(row => row.classification === 'unclassified_projection_identifier')
    .map(row => ({ id_key: row.id_key, id_value: row.id_value, families: row.families, paths: row.paths }))
};
const jsonPath = 'build/lake-actions/residual-frontier-wave-17-diagnostics.json';
const reportPath = 'reports/lake-residual-frontier-wave-17-diagnostics.md';
fs.mkdirSync(path.dirname(full(jsonPath)), { recursive: true });
fs.mkdirSync(path.dirname(full(reportPath)), { recursive: true });
fs.writeFileSync(full(jsonPath), `${JSON.stringify(diagnostics, null, 2)}\n`);

const lines = [];
lines.push('# Residual lake frontier — Wave 17 diagnostics', '');
lines.push(`Path semantic-owner refusals: **${pathRefusals.length}**`, '');
for (const row of pathRefusals) lines.push(`- \`${row.path}\` — ${row.role}; ${row.residual_types.join(', ')}`);
lines.push('', '## Projection key/class groups', '');
for (const group of diagnostics.projection_key_class_groups) {
  lines.push(`### ${group.key} — ${group.count}`);
  for (const sample of group.samples) lines.push(`- \`${sample.id_value}\` — ${sample.families.join(', ')} — ${sample.paths.join(', ')}`);
  lines.push('');
}
lines.push('## Highest-volume family combinations', '');
for (const group of diagnostics.projection_groups.slice(0, 120)) {
  lines.push(`- **${group.count}** — ${group.key}`);
  for (const sample of group.samples.slice(0, 3)) lines.push(`  - \`${sample.id_value}\` — ${sample.paths.join(', ')}`);
}
lines.push('', '## Boundary', '', 'These diagnostics describe repository identifier provenance and path custody. They do not establish external source truth, semantic completeness, publication clearance, or graph relationships.');
fs.writeFileSync(full(reportPath), `${lines.join('\n')}\n`);

console.log(`Wave 17 diagnostics built: ${pathRefusals.length} path refusals; ${diagnostics.unclassified_projection_rows.length} projection refusals`);
