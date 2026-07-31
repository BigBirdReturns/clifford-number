#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const writeJson = (relative, value) => fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
const policy = readJson('data/project/lake-allocator-war-wave-21-policy.json');

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
const roots = new Set(lakePolicy.authoritative_roots ?? []);
for (const relative of [
  'data/project/lake-allocator-war-wave-21-policy.json',
  policy.paths.observation_registry,
  policy.paths.waterline_registry,
  policy.paths.estate_registry,
  policy.paths.program_registry,
  policy.paths.receipt,
  policy.paths.projection,
  policy.paths.reconciliation,
  policy.paths.report,
  'docs/methods/lake-allocator-war-wave-21.md',
  'docs/milestones/lake-allocator-war-wave-21.md'
]) roots.add(relative);
lakePolicy.authoritative_roots = [...roots].sort();
lakePolicy.boundaries.allocator_war_routing_proves_finding = false;
lakePolicy.boundaries.allocator_war_wave_02_intake_is_reviewed = false;
writeJson(lakePolicyPath, lakePolicy);

const basinPath = 'data/project/lake-basin-registry.json';
const basinRegistry = readJson(basinPath);
const existing = new Map(basinRegistry.basins.map(row => [row.basin_id, row]));
for (const basin of policy.basin_contract) {
  const prior = existing.get(basin.basin_id);
  if (prior && JSON.stringify(prior) !== JSON.stringify(basin)) {
    throw new Error(`${basin.basin_id}: existing basin contract differs`);
  }
  if (!prior) basinRegistry.basins.push(basin);
}
basinRegistry.basins.sort((a, b) => a.basin_id.localeCompare(b.basin_id));
basinRegistry.boundaries.allocator_war_basin_membership_proves_common_purpose = false;
writeJson(basinPath, basinRegistry);

const packagePath = 'package.json';
const pkg = readJson(packagePath);
pkg.scripts['build:lake-allocator-war-wave-21'] = 'node tools/build-lake-allocator-war-wave-21.mjs';
pkg.scripts['validate:lake-allocator-war-wave-21'] = 'node tools/validate-lake-allocator-war-wave-21.mjs';
pkg.scripts['ci:lake-allocator-war-wave-21'] = 'npm run build:lake-allocator-war-wave-21 && npm run validate:lake-allocator-war-wave-21 && node test/lake-allocator-war-wave-21.test.js';
if (!pkg.scripts.check.includes('validate:lake-allocator-war-wave-21')) {
  const marker = 'npm run validate:lake-receipt-custody-wave-20';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 20 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, `${marker} && npm run validate:lake-allocator-war-wave-21`);
}
writeJson(packagePath, pkg);

const buildInstructionsPath = 'BUILD-INSTRUCTIONS.md';
let buildInstructions = fs.readFileSync(full(buildInstructionsPath), 'utf8');
const buildMarker = '3.21 **Allocator-war lake integration — Wave 21.**';
if (!buildInstructions.includes(buildMarker)) {
  buildInstructions += `\n\n${buildMarker}\nReviewed Wave 01 allocator-war packets and unreviewed Wave 02 intake packets enter separate source registries. Exact commit-and-path custody preserves their authority difference. Reviewed packets may feed bounded findings and controls; unreviewed packets may feed acquisition only.\n\nEstate and program routing is one-way. It does not create a finding, identity, relationship, participation, graph edge, prevalence estimate, racial-order conclusion, coordination conclusion, common purpose, publication clearance, or adoption effect.\n`;
}
fs.writeFileSync(full(buildInstructionsPath), buildInstructions);

const readmePath = 'README.md';
let readme = fs.readFileSync(full(readmePath), 'utf8');
const readmeMarker = '## Allocator-war lake waterline';
if (!readme.includes(readmeMarker)) {
  readme += `\n\n${readmeMarker}\n\nWave 21 imports the reviewed allocator-war Wave 01 waterline and the unreviewed SSC Wave 02 frontier through exact commit-and-path custody. It exposes separate observation, findings-waterline, estate-acquisition, and program-feed registries while retaining zero graph and publication effect. See \`reports/lake-allocator-war-wave-21.md\`.\n`;
}
fs.writeFileSync(full(readmePath), readme);

console.log('allocator-war Wave 21 authority surfaces installed');
console.log(`  authoritative roots: ${lakePolicy.authoritative_roots.length}`);
console.log(`  semantic basins: ${basinRegistry.basins.length}`);
console.log('  release gate: registered');
