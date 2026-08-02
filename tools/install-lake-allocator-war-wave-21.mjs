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
  'reports/lake-allocator-war-public-route-execution-wave-31.md',
  'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-policy.json',
  'data/project/lake-allocator-war-bounded-source-snapshots-wave-32-plan.json',
  'data/acquisition/lake-allocator-war-wave-32/snapshot-ledger.jsonl',
  'docs/methods/lake-allocator-war-bounded-source-snapshots-wave-32.md',
  'docs/milestones/lake-allocator-war-bounded-source-snapshots-wave-32.md',
  'data/acquisition/lake-allocator-war-wave-32/routes/affected-comparator-and-distributional-joins.jsonl',
  'data/acquisition/lake-allocator-war-wave-32/routes/correction-dockets-and-outcomes.jsonl',
  'data/acquisition/lake-allocator-war-wave-32/routes/financial-recovery-and-continuity.jsonl',
  'data/acquisition/lake-allocator-war-wave-32/routes/internal-authority-and-inventory.jsonl',
  'data/acquisition/lake-allocator-war-wave-32/routes/protected-personnel-records.jsonl',
  'data/acquisition/lake-allocator-war-wave-32/routes/public-award-and-contract-denominators.jsonl',
  'data/acquisition/lake-allocator-war-wave-32/routes/published-enforcement-and-action-registers.jsonl',
  'build/lake-actions/allocator-war-bounded-source-snapshots-wave-32.json',
  'reports/lake-allocator-war-bounded-source-snapshots-wave-32.md',
  'data/project/lake-allocator-war-structural-parses-wave-33-policy.json',
  'data/project/lake-allocator-war-structural-parses-wave-33-plan.json',
  'data/acquisition/lake-allocator-war-wave-33/parse-ledger.jsonl',
  'docs/methods/lake-allocator-war-structural-parses-wave-33.md',
  'docs/milestones/lake-allocator-war-structural-parses-wave-33.md',
  'build/lake-actions/allocator-war-structural-parses-wave-33.json',
  'reports/lake-allocator-war-structural-parses-wave-33.md',
  'data/project/lake-allocator-war-schema-joins-wave-34-policy.json',
  'data/project/lake-allocator-war-schema-joins-wave-34-plan.json',
  'data/acquisition/lake-allocator-war-wave-34/schema-adapter-ledger.jsonl',
  'data/acquisition/lake-allocator-war-wave-34/lawful-join-contract-ledger.jsonl',
  'docs/methods/lake-allocator-war-schema-joins-wave-34.md',
  'docs/milestones/lake-allocator-war-schema-joins-wave-34.md',
  'build/lake-actions/allocator-war-schema-joins-wave-34.json',
  'reports/lake-allocator-war-schema-joins-wave-34.md',
  'data/project/lake-allocator-war-join-requirements-wave-35-policy.json',
  'data/acquisition/lake-allocator-war-wave-35/internal-authority-and-inventory.jsonl',
  'data/acquisition/lake-allocator-war-wave-35/public-award-and-contract-denominators.jsonl',
  'data/acquisition/lake-allocator-war-wave-35/published-enforcement-and-action-registers.jsonl',
  'data/acquisition/lake-allocator-war-wave-35/correction-dockets-and-outcomes.jsonl',
  'data/acquisition/lake-allocator-war-wave-35/protected-personnel-records.jsonl',
  'data/acquisition/lake-allocator-war-wave-35/affected-comparator-and-distributional-joins.jsonl',
  'data/acquisition/lake-allocator-war-wave-35/financial-recovery-and-continuity.jsonl',
  'docs/methods/lake-allocator-war-join-requirements-wave-35.md',
  'docs/milestones/lake-allocator-war-join-requirements-wave-35.md',
  'build/lake-actions/allocator-war-join-requirements-wave-35.json',
  'reports/lake-allocator-war-join-requirements-wave-35.md'
]) roots.add(relative);
lakePolicy.authoritative_roots = [...roots].sort();
lakePolicy.boundaries.allocator_war_routing_proves_finding = false;
lakePolicy.boundaries.allocator_war_wave_02_intake_is_reviewed = false;
lakePolicy.boundaries.allocator_war_wave_35_requirement_task_is_evidence = false;
writeJson(lakePolicyPath, lakePolicy);

const basinPath = 'data/project/lake-basin-registry.json';
const basinRegistry = readJson(basinPath);
const existing = new Map(basinRegistry.basins.map((row, index) => [row.basin_id, { row, index }]));
for (const basin of policy.basin_contract) {
  const prior = existing.get(basin.basin_id);
  if (!prior) {
    basinRegistry.basins.push(basin);
    continue;
  }
  if (JSON.stringify(prior.row) === JSON.stringify(basin)) continue;
  const stableFields = value => Object.fromEntries(Object.entries(value).filter(([key]) =>
    !['path_prefixes', 'authoritative_entrypoints'].includes(key)));
  if (JSON.stringify(stableFields(prior.row)) !== JSON.stringify(stableFields(basin))) {
    throw new Error(`${basin.basin_id}: non-path basin contract differs`);
  }
  basinRegistry.basins[prior.index] = basin;
}
basinRegistry.basins.sort((a, b) => a.basin_id.localeCompare(b.basin_id));
basinRegistry.boundaries.allocator_war_basin_membership_proves_common_purpose = false;
basinRegistry.boundaries.allocator_war_wave_34_schema_is_join_authority = false;
basinRegistry.boundaries.allocator_war_wave_35_task_is_join_authority = false;
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
pkg.scripts['acquire:lake-allocator-war-bounded-source-snapshots-wave-32'] = 'node tools/acquire-lake-allocator-war-bounded-source-snapshots-wave-32.mjs';
pkg.scripts['build:lake-allocator-war-bounded-source-snapshots-wave-32'] = 'node tools/build-lake-allocator-war-bounded-source-snapshots-wave-32.mjs';
pkg.scripts['validate:lake-allocator-war-bounded-source-snapshots-wave-32'] = 'node tools/validate-lake-allocator-war-bounded-source-snapshots-wave-32.mjs && node test/lake-allocator-war-bounded-source-snapshots-wave-32.test.js';
pkg.scripts['ci:lake-allocator-war-bounded-source-snapshots-wave-32'] = 'npm run build:lake-allocator-war-bounded-source-snapshots-wave-32 && npm run validate:lake-allocator-war-bounded-source-snapshots-wave-32';
if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-bounded-source-snapshots-wave-32')) {
  const marker = 'npm run validate:lake-allocator-war-public-route-execution-wave-31';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 31 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, `${marker} && npm run validate:lake-allocator-war-bounded-source-snapshots-wave-32`);
}
pkg.scripts['build:lake-allocator-war-structural-parses-wave-33'] = 'node tools/build-lake-allocator-war-structural-parses-wave-33.mjs';
pkg.scripts['validate:lake-allocator-war-structural-parses-wave-33'] = 'node tools/validate-lake-allocator-war-structural-parses-wave-33.mjs && node test/lake-allocator-war-structural-parses-wave-33.test.js';
pkg.scripts['ci:lake-allocator-war-structural-parses-wave-33'] = 'npm run build:lake-allocator-war-structural-parses-wave-33 && npm run validate:lake-allocator-war-structural-parses-wave-33';
if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-structural-parses-wave-33')) {
  const marker = 'npm run validate:lake-allocator-war-bounded-source-snapshots-wave-32';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 32 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, `${marker} && npm run validate:lake-allocator-war-structural-parses-wave-33`);
}
pkg.scripts['build:lake-allocator-war-schema-joins-wave-34'] = 'node tools/build-lake-allocator-war-schema-joins-wave-34.mjs';
pkg.scripts['validate:lake-allocator-war-schema-joins-wave-34'] = 'node tools/validate-lake-allocator-war-schema-joins-wave-34.mjs && node test/lake-allocator-war-schema-joins-wave-34.test.js';
pkg.scripts['ci:lake-allocator-war-schema-joins-wave-34'] = 'npm run build:lake-allocator-war-schema-joins-wave-34 && npm run validate:lake-allocator-war-schema-joins-wave-34';
if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-schema-joins-wave-34')) {
  const marker = 'npm run validate:lake-allocator-war-structural-parses-wave-33';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 33 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, `${marker} && npm run validate:lake-allocator-war-schema-joins-wave-34`);
}
pkg.scripts['build:lake-allocator-war-join-requirements-wave-35'] = 'node tools/build-lake-allocator-war-join-requirements-wave-35.mjs';
pkg.scripts['validate:lake-allocator-war-join-requirements-wave-35'] = 'node tools/validate-lake-allocator-war-join-requirements-wave-35.mjs && node test/lake-allocator-war-join-requirements-wave-35.test.js';
pkg.scripts['ci:lake-allocator-war-join-requirements-wave-35'] = 'npm run build:lake-allocator-war-join-requirements-wave-35 && npm run validate:lake-allocator-war-join-requirements-wave-35';
if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-join-requirements-wave-35')) {
  const marker = 'npm run validate:lake-allocator-war-schema-joins-wave-34';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 34 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, `${marker} && npm run validate:lake-allocator-war-join-requirements-wave-35`);
}
writeJson(packagePath, pkg);

const buildInstructionsPath = 'BUILD-INSTRUCTIONS.md';
let buildInstructions = fs.readFileSync(full(buildInstructionsPath), 'utf8');
const buildMarker = '3.21 **Allocator-war lake integration — Wave 21.**';
if (!buildInstructions.includes(buildMarker)) {
  buildInstructions += `\n\n${buildMarker}\nReviewed Wave 01 allocator-war packets and unreviewed Wave 02 intake packets enter separate source registries. Exact commit-and-path custody preserves their authority difference. Reviewed packets may feed bounded findings and controls; unreviewed packets may feed acquisition only.\n\nEstate and program routing is one-way. It does not create a finding, identity, relationship, participation, graph edge, prevalence estimate, racial-order conclusion, coordination conclusion, common purpose, publication clearance, or adoption effect.\n`;
}
const wave32BuildMarker = '3.32 **Allocator-war bounded source snapshots — Wave 32.**';
if (!buildInstructions.includes(wave32BuildMarker)) {
  buildInstructions += `

${wave32BuildMarker}
Run \`node tools/acquire-lake-allocator-war-bounded-source-snapshots-wave-32.mjs\` only in the bounded acquisition lane. The acquisition must emit nineteen exact source objects: fifteen public HTTP requests and four credential boundaries. The seven required JSON controls must parse successfully. Release validation reads the frozen bytes and must never refetch the network.

Run \`node tools/build-lake-allocator-war-bounded-source-snapshots-wave-32.mjs\` after the snapshot ledger is complete. The builder preserves the exact thirty-eight-task Wave 31 denominator and creates no complete denominator, evidence adjudication, estate adoption, finding, graph effect, or publication clearance.
`;
}
const wave33BuildMarker = '3.33 **Allocator-war frozen source structural parses — Wave 33.**';
if (!buildInstructions.includes(wave33BuildMarker)) {
  buildInstructions += `\n\n${wave33BuildMarker}\nRun \`node tools/build-lake-allocator-war-structural-parses-wave-33.mjs\` only after the permanent Wave 32 snapshot ledger and response bytes are present. The builder must verify all response hashes, emit exactly nineteen parse rows, perform no network requests, preserve HTTP errors and credential boundaries, and reuse the unchanged seven-route, thirty-eight-task, 153-use denominator.\n\nA structural parse is addressability only. JSON array lengths, field names, HTML tags, links, text counts, HTTP error bodies, and credential boundaries do not establish institutional completeness, authorize joins, adjudicate evidence, create findings, alter the graph, or clear publication.\n`;
}
const wave34BuildMarker = '3.34 **Allocator-war source schemas and lawful joins — Wave 34.**';
if (!buildInstructions.includes(wave34BuildMarker)) {
  buildInstructions += `\n\n${wave34BuildMarker}\nRun \`node tools/build-lake-allocator-war-schema-joins-wave-34.mjs\` only after the permanent Wave 33 parse ledger is present. The builder must adapt all nineteen parse objects exactly once, preserve source-specific structural limits and sensitive exclusions, and emit seven blocked lawful-join contracts covering all route classes.\n\nA schema adapter or candidate key is not institutional semantics or join authority. Every join remains blocked until its exact action, no-action, affected-party, comparator, correction, recovery, or lawful-access requirements are satisfied. Protected personnel rows may not be replaced with public aggregate workforce data.\n`;
}
const wave35BuildMarker = '3.35 **Allocator-war lawful join requirement fan-out — Wave 35.**';
if (!buildInstructions.includes(wave35BuildMarker)) {
  buildInstructions += `

${wave35BuildMarker}
Run \`node tools/build-lake-allocator-war-join-requirements-wave-35.mjs\` only after the permanent Wave 34 lawful-join ledger is present. The builder must emit one estate-owned queue per join and one deterministic acquisition task per unsatisfied institutional requirement, preserving source receipts, schema adapters, candidate-key classes, access classes, completion tests, and refused substitutions.

A requirement task is acquisition custody, not an acquisition result or join authorization. Public and lawful-case tasks remain separate from the three protected-personnel tasks that require authorized lawful access. Task admission creates no complete denominator, evidence adjudication, finding, graph effect, or publication clearance.
`;
}
fs.writeFileSync(full(buildInstructionsPath), buildInstructions);

const readmePath = 'README.md';
let readme = fs.readFileSync(full(readmePath), 'utf8');
const readmeMarker = '## Allocator-war lake waterline';
if (!readme.includes(readmeMarker)) {
  readme += `\n\n${readmeMarker}\n\nWave 21 imports the reviewed allocator-war Wave 01 waterline and the unreviewed SSC Wave 02 frontier through exact commit-and-path custody. It exposes separate observation, findings-waterline, estate-acquisition, and program-feed registries while retaining zero graph and publication effect. See \`reports/lake-allocator-war-wave-21.md\`.\n`;
}
const wave32ReadmeMarker = '## Allocator-war bounded source snapshots Wave 32';
if (!readme.includes(wave32ReadmeMarker)) {
  readme += `

${wave32ReadmeMarker}

Wave 32 freezes each of the nineteen Wave 31 official locators as one exact public request-response object or one explicit credential boundary. Fifteen bounded requests and four access boundaries are reused across the unchanged thirty-eight-task route denominator. Frozen source responses remain acquisition-only and create no evidence, finding, graph, or publication effect. See \`reports/lake-allocator-war-bounded-source-snapshots-wave-32.md\`.
`;
}
const wave33ReadmeMarker = '## Allocator-war frozen source structural parses Wave 33';
if (!readme.includes(wave33ReadmeMarker)) {
  readme += `\n\n${wave33ReadmeMarker}\n\nWave 33 verifies every permanent Wave 32 response hash and emits one deterministic structural parse row for each of the nineteen source objects. Seven JSON, eight HTML, and four credential-boundary rows are reused across the unchanged route and task denominator. Structural addressability creates no complete denominator, evidence adjudication, finding, graph effect, or publication authority. See \`reports/lake-allocator-war-structural-parses-wave-33.md\`.\n`;
}
const wave34ReadmeMarker = '## Allocator-war source schemas and lawful joins Wave 34';
if (!readme.includes(wave34ReadmeMarker)) {
  readme += `\n\n${wave34ReadmeMarker}\n\nWave 34 maps all nineteen permanent Wave 33 parse objects through source-specific schema adapters and defines seven explicit lawful-join contracts. The thirty-one missing institutional requirements remain open, including three protected-personnel requirements that require lawful or privacy-safe access. Schema addressability creates no authorized join, complete denominator, evidence adjudication, finding, graph effect, or publication authority. See \`reports/lake-allocator-war-schema-joins-wave-34.md\`.\n`;
}
const wave35ReadmeMarker = '## Allocator-war lawful join requirement fan-out Wave 35';
if (!readme.includes(wave35ReadmeMarker)) {
  readme += `

${wave35ReadmeMarker}

Wave 35 converts all thirty-one unsatisfied Wave 34 institutional requirements into seven estate-owned acquisition queues. Twenty-eight tasks enter public, separately authorized, or lawful-case lanes; three protected-personnel tasks remain bounded to authorized lawful access. Task admission creates no acquisition result, join authorization, complete denominator, evidence adjudication, finding, graph effect, or publication authority. See \`reports/lake-allocator-war-join-requirements-wave-35.md\`.
`;
}
fs.writeFileSync(full(readmePath), readme);

console.log('allocator-war Wave 21 authority surfaces installed');
console.log(`  authoritative roots: ${lakePolicy.authoritative_roots.length}`);
console.log(`  semantic basins: ${basinRegistry.basins.length}`);
console.log('  release gate: registered');
