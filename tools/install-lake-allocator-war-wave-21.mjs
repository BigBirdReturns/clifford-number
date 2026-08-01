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
  'docs/milestones/lake-allocator-war-wave-21.md',
  'data/project/lake-allocator-war-estate-execution-wave-22-policy.json',
  'build/lake-actions/allocator-war-estate-execution-wave-22.json',
  'reports/lake-allocator-war-estate-execution-wave-22.md',
  'docs/methods/lake-allocator-war-estate-execution-wave-22.md',
  'docs/milestones/lake-allocator-war-estate-execution-wave-22.md',
  'data/project/lake-allocator-war-lead-acquisition-wave-23-policy.json',
  'build/lake-actions/allocator-war-lead-acquisition-wave-23.json',
  'reports/lake-allocator-war-lead-acquisition-wave-23.md',
  'docs/methods/lake-allocator-war-lead-acquisition-wave-23.md',
  'docs/milestones/lake-allocator-war-lead-acquisition-wave-23.md',
  'data/project/lake-allocator-war-lead-execution-wave-24-policy.json',
  'data/project/lake-allocator-war-lead-execution-wave-24-source-plan.json',
  'build/lake-actions/allocator-war-lead-execution-wave-24.json',
  'reports/lake-allocator-war-lead-execution-wave-24.md',
  'docs/methods/lake-allocator-war-lead-execution-wave-24.md',
  'docs/milestones/lake-allocator-war-lead-execution-wave-24.md',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-01.jsonl',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-02.jsonl',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-03.jsonl',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-04.jsonl',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-05.jsonl',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-06.jsonl',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-07.jsonl',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-08.jsonl',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-09.jsonl',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-10.jsonl',
  'data/acquisition/lake-allocator-war-wave-24/law21-est-11.jsonl',
  'data/project/lake-allocator-war-denominator-closure-wave-25-policy.json',
  'build/lake-actions/allocator-war-denominator-closure-wave-25.json',
  'reports/lake-allocator-war-denominator-closure-wave-25.md',
  'docs/methods/lake-allocator-war-denominator-closure-wave-25.md',
  'docs/milestones/lake-allocator-war-denominator-closure-wave-25.md',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-01.jsonl',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-02.jsonl',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-03.jsonl',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-04.jsonl',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-05.jsonl',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-06.jsonl',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-07.jsonl',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-08.jsonl',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-09.jsonl',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-10.jsonl',
  'data/acquisition/lake-allocator-war-wave-25/law21-est-11.jsonl',
  'data/project/lake-allocator-war-targeted-closure-wave-26-policy.json',
  'data/project/lake-allocator-war-targeted-closure-wave-26-source-plan.json',
  'build/lake-actions/allocator-war-targeted-closure-wave-26.json',
  'reports/lake-allocator-war-targeted-closure-wave-26.md',
  'docs/methods/lake-allocator-war-targeted-closure-wave-26.md',
  'docs/milestones/lake-allocator-war-targeted-closure-wave-26.md',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-01.jsonl',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-02.jsonl',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-03.jsonl',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-04.jsonl',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-05.jsonl',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-06.jsonl',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-07.jsonl',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-08.jsonl',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-09.jsonl',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-10.jsonl',
  'data/acquisition/lake-allocator-war-wave-26/law21-est-11.jsonl',
  'data/project/lake-allocator-war-wave26-source-custody-repair-policy.json',
  'build/lake-actions/allocator-war-wave26-source-custody-repair.json',
  'reports/lake-allocator-war-wave26-source-custody-repair.md',
  'docs/methods/lake-allocator-war-wave26-source-custody-repair.md',
  'docs/milestones/lake-allocator-war-wave26-source-custody-repair.md',
  'data/project/lake-allocator-war-public-interest-downstream-wave-27-policy.json',
  'docs/methods/lake-allocator-war-public-interest-downstream-wave-27.md',
  'docs/milestones/lake-allocator-war-public-interest-downstream-wave-27.md',
  'data/acquisition/lake-allocator-war-wave-27/law21-est-05.jsonl',
  'data/acquisition/lake-allocator-war-wave-27/law21-est-11.jsonl',
  'build/lake-actions/allocator-war-public-interest-downstream-wave-27-source-plan.json',
  'build/lake-actions/allocator-war-public-interest-downstream-wave-27.json',
  'reports/lake-allocator-war-public-interest-downstream-wave-27.md',
  'data/project/lake-allocator-war-public-interest-implementation-wave-28-policy.json',
  'docs/methods/lake-allocator-war-public-interest-implementation-wave-28.md',
  'docs/milestones/lake-allocator-war-public-interest-implementation-wave-28.md',
  'data/acquisition/lake-allocator-war-wave-28/law28-est-04.jsonl',
  'data/acquisition/lake-allocator-war-wave-28/law28-est-05.jsonl',
  'data/acquisition/lake-allocator-war-wave-28/law28-est-06.jsonl',
  'data/acquisition/lake-allocator-war-wave-28/law28-est-07.jsonl',
  'data/acquisition/lake-allocator-war-wave-28/law28-est-10.jsonl',
  'build/lake-actions/allocator-war-public-interest-implementation-wave-28.json',
  'reports/lake-allocator-war-public-interest-implementation-wave-28.md',
  'data/project/lake-allocator-war-public-interest-execution-wave-29-policy.json',
  'data/project/lake-allocator-war-public-interest-execution-wave-29-source-plan.json',
  'docs/methods/lake-allocator-war-public-interest-execution-wave-29.md',
  'docs/milestones/lake-allocator-war-public-interest-execution-wave-29.md',
  'data/acquisition/lake-allocator-war-wave-29/law28-est-04.jsonl',
  'data/acquisition/lake-allocator-war-wave-29/law28-est-05.jsonl',
  'data/acquisition/lake-allocator-war-wave-29/law28-est-06.jsonl',
  'data/acquisition/lake-allocator-war-wave-29/law28-est-07.jsonl',
  'data/acquisition/lake-allocator-war-wave-29/law28-est-10.jsonl',
  'build/lake-actions/allocator-war-public-interest-execution-wave-29.json',
  'reports/lake-allocator-war-public-interest-execution-wave-29.md',
  'data/project/lake-allocator-war-gap-fanout-wave-30-policy.json',
  'docs/methods/lake-allocator-war-gap-fanout-wave-30.md',
  'docs/milestones/lake-allocator-war-gap-fanout-wave-30.md',
  'data/acquisition/lake-allocator-war-wave-30/protected-personnel-records.jsonl',
  'data/acquisition/lake-allocator-war-wave-30/internal-authority-and-inventory.jsonl',
  'data/acquisition/lake-allocator-war-wave-30/public-award-and-contract-denominators.jsonl',
  'data/acquisition/lake-allocator-war-wave-30/published-enforcement-and-action-registers.jsonl',
  'data/acquisition/lake-allocator-war-wave-30/correction-dockets-and-outcomes.jsonl',
  'data/acquisition/lake-allocator-war-wave-30/affected-comparator-and-distributional-joins.jsonl',
  'data/acquisition/lake-allocator-war-wave-30/financial-recovery-and-continuity.jsonl',
  'build/lake-actions/allocator-war-gap-fanout-wave-30.json',
  'reports/lake-allocator-war-gap-fanout-wave-30.md',
  'data/project/lake-allocator-war-public-route-execution-wave-31-policy.json',
  'data/project/lake-allocator-war-public-route-execution-wave-31-source-plan.json',
  'docs/methods/lake-allocator-war-public-route-execution-wave-31.md',
  'docs/milestones/lake-allocator-war-public-route-execution-wave-31.md',
  'data/acquisition/lake-allocator-war-wave-31/affected-comparator-and-distributional-joins.jsonl',
  'data/acquisition/lake-allocator-war-wave-31/correction-dockets-and-outcomes.jsonl',
  'data/acquisition/lake-allocator-war-wave-31/financial-recovery-and-continuity.jsonl',
  'data/acquisition/lake-allocator-war-wave-31/internal-authority-and-inventory.jsonl',
  'data/acquisition/lake-allocator-war-wave-31/protected-personnel-records.jsonl',
  'data/acquisition/lake-allocator-war-wave-31/public-award-and-contract-denominators.jsonl',
  'data/acquisition/lake-allocator-war-wave-31/published-enforcement-and-action-registers.jsonl',
  'build/lake-actions/allocator-war-public-route-execution-wave-31.json',
  'reports/lake-allocator-war-public-route-execution-wave-31.md'
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
pkg.scripts['build:lake-allocator-war-public-route-execution-wave-31'] = 'node tools/build-lake-allocator-war-public-route-execution-wave-31.mjs';
pkg.scripts['validate:lake-allocator-war-public-route-execution-wave-31'] = 'node tools/validate-lake-allocator-war-public-route-execution-wave-31.mjs && node test/lake-allocator-war-public-route-execution-wave-31.test.js';
pkg.scripts['ci:lake-allocator-war-public-route-execution-wave-31'] = 'npm run build:lake-allocator-war-public-route-execution-wave-31 && npm run validate:lake-allocator-war-public-route-execution-wave-31';
if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-public-route-execution-wave-31')) {
  const marker = 'npm run validate:lake-allocator-war-gap-fanout-wave-30';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 30 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, `${marker} && npm run validate:lake-allocator-war-public-route-execution-wave-31`);
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
