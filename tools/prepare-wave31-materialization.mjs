#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const writeJson = (relative, value) => fs.writeFileSync(full(relative), JSON.stringify(value, null, 2) + '\n');
const addSorted = (array, values) => [...new Set([...(array ?? []), ...values])].sort();

const wave31PolicyPath = 'data/project/lake-allocator-war-public-route-execution-wave-31-policy.json';
const wave31 = readJson(wave31PolicyPath);
const ledgerPaths = wave31.route_plans
  .map(route => `${wave31.paths.result_root}/${route.route_class}.jsonl`)
  .sort();
const sourcePaths = [
  wave31PolicyPath,
  wave31.paths.source_plan,
  wave31.paths.method,
  wave31.paths.milestone,
  ...ledgerPaths
];
const actionPaths = [wave31.paths.projection];
const reportPaths = [wave31.paths.report];
const allRoots = [...sourcePaths, ...actionPaths, ...reportPaths];
const generatedPaths = [...ledgerPaths, wave31.paths.projection];

const wave21Path = 'data/project/lake-allocator-war-wave-21-policy.json';
const wave21 = readJson(wave21Path);
for (const [basinId, additions] of Object.entries({
  'allocator-war-source': sourcePaths,
  'allocator-war-lake-actions': actionPaths,
  'allocator-war-reports': reportPaths
})) {
  const basin = wave21.basin_contract.find(row => row.basin_id === basinId);
  if (!basin) throw new Error(`${basinId}: Wave 21 basin missing`);
  basin.path_prefixes = addSorted(basin.path_prefixes, additions);
  basin.authoritative_entrypoints = addSorted(basin.authoritative_entrypoints, additions);
}
wave21.projection_contract.allowed_generated_paths = addSorted(
  wave21.projection_contract.allowed_generated_paths,
  generatedPaths
);
wave21.boundaries.wave_31_public_route_result_is_evidence_row = false;
wave21.boundaries.wave_31_protected_route_is_publicly_executable = false;
writeJson(wave21Path, wave21);

const basinPath = 'data/project/lake-basin-registry.json';
const basinRegistry = readJson(basinPath);
for (const waveBasin of wave21.basin_contract) {
  const index = basinRegistry.basins.findIndex(row => row.basin_id === waveBasin.basin_id);
  if (index < 0) basinRegistry.basins.push(structuredClone(waveBasin));
  else basinRegistry.basins[index] = structuredClone(waveBasin);
}
basinRegistry.basins.sort((a, b) => a.basin_id.localeCompare(b.basin_id));
writeJson(basinPath, basinRegistry);

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
lakePolicy.authoritative_roots = addSorted(lakePolicy.authoritative_roots, allRoots);
writeJson(lakePolicyPath, lakePolicy);

const packagePath = 'package.json';
const pkg = readJson(packagePath);
const validateScript = 'node tools/validate-lake-allocator-war-public-route-execution-wave-31.mjs && node test/lake-allocator-war-public-route-execution-wave-31.test.js';
pkg.scripts['build:lake-allocator-war-public-route-execution-wave-31'] = 'node tools/build-lake-allocator-war-public-route-execution-wave-31.mjs';
pkg.scripts['validate:lake-allocator-war-public-route-execution-wave-31'] = validateScript;
pkg.scripts['ci:lake-allocator-war-public-route-execution-wave-31'] = 'npm run build:lake-allocator-war-public-route-execution-wave-31 && npm run validate:lake-allocator-war-public-route-execution-wave-31';
if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-public-route-execution-wave-31')) {
  const marker = 'npm run validate:lake-allocator-war-gap-fanout-wave-30';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 30 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, `${marker} && npm run validate:lake-allocator-war-public-route-execution-wave-31`);
}
writeJson(packagePath, pkg);

const installerPath = 'tools/install-lake-allocator-war-wave-21.mjs';
let installer = fs.readFileSync(full(installerPath), 'utf8');
const wave31RootLines = allRoots.map(relative => `  '${relative}'`).join(',\n');
if (!installer.includes(wave31PolicyPath)) {
  const rootMarker = "  'reports/lake-allocator-war-gap-fanout-wave-30.md'\n]) roots.add(relative);";
  if (!installer.includes(rootMarker)) throw new Error('Wave 30 installer root marker missing');
  installer = installer.replace(
    rootMarker,
    `  'reports/lake-allocator-war-gap-fanout-wave-30.md',\n${wave31RootLines}\n]) roots.add(relative);`
  );
}
if (!installer.includes('validate:lake-allocator-war-public-route-execution-wave-31')) {
  const packageMarker = 'writeJson(packagePath, pkg);';
  const registration = [
    "pkg.scripts['build:lake-allocator-war-public-route-execution-wave-31'] = 'node tools/build-lake-allocator-war-public-route-execution-wave-31.mjs';",
    `pkg.scripts['validate:lake-allocator-war-public-route-execution-wave-31'] = '${validateScript}';`,
    "pkg.scripts['ci:lake-allocator-war-public-route-execution-wave-31'] = 'npm run build:lake-allocator-war-public-route-execution-wave-31 && npm run validate:lake-allocator-war-public-route-execution-wave-31';",
    "if (!pkg.scripts.check.includes('npm run validate:lake-allocator-war-public-route-execution-wave-31')) {",
    "  const marker = 'npm run validate:lake-allocator-war-gap-fanout-wave-30';",
    "  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 30 release-gate marker missing');",
    "  pkg.scripts.check = pkg.scripts.check.replace(marker, `${marker} && npm run validate:lake-allocator-war-public-route-execution-wave-31`);",
    "}",
    ''
  ].join('\n');
  if (!installer.includes(packageMarker)) throw new Error('installer package write marker missing');
  installer = installer.replace(packageMarker, registration + packageMarker);
}
fs.writeFileSync(full(installerPath), installer);

const validatorPath = 'tools/validate-lake-allocator-war-wave-21.mjs';
let validator = fs.readFileSync(full(validatorPath), 'utf8');
if (!validator.includes(wave31PolicyPath)) {
  const sourceMarker = "      'data/acquisition/lake-allocator-war-wave-30/financial-recovery-and-continuity.jsonl'\n    ]],";
  if (!validator.includes(sourceMarker)) throw new Error('Wave 30 exact source marker missing');
  const sourceInsert = sourcePaths.map(relative => `      '${relative}'`).join(',\n');
  validator = validator.replace(
    sourceMarker,
    `      'data/acquisition/lake-allocator-war-wave-30/financial-recovery-and-continuity.jsonl',\n${sourceInsert}\n    ]],`
  );
  const actionMarker = "'build/lake-actions/allocator-war-gap-fanout-wave-30.json']]";
  if (!validator.includes(actionMarker)) throw new Error('Wave 30 exact action marker missing');
  validator = validator.replace(actionMarker, `'build/lake-actions/allocator-war-gap-fanout-wave-30.json', '${wave31.paths.projection}']]`);
  const reportMarker = "'reports/lake-allocator-war-gap-fanout-wave-30.md']]";
  if (!validator.includes(reportMarker)) throw new Error('Wave 30 exact report marker missing');
  validator = validator.replace(reportMarker, `'reports/lake-allocator-war-gap-fanout-wave-30.md', '${wave31.paths.report}']]`);
}
fs.writeFileSync(full(validatorPath), validator);

const readmePath = 'README.md';
let readme = fs.readFileSync(full(readmePath), 'utf8');
const readmeMarker = '## Allocator-war public-route execution Wave 31';
if (!readme.includes(readmeMarker)) {
  readme += `\n\n${readmeMarker}\n\nWave 31 executes the thirty-four publicly addressable Wave 30 obligations through six reusable official-source lanes while retaining four protected-personnel obligations under privacy-safe or otherwise lawful access. Public base universes, action announcements, dockets, and audit records remain bounded acquisition surfaces rather than complete denominators or findings. See \`${wave31.paths.report}\`.\n`;
}
fs.writeFileSync(full(readmePath), readme);

const buildInstructionsPath = 'BUILD-INSTRUCTIONS.md';
let buildInstructions = fs.readFileSync(full(buildInstructionsPath), 'utf8');
const buildMarker = '3.31 **Allocator-war public-route execution — Wave 31.**';
if (!buildInstructions.includes(buildMarker)) {
  buildInstructions += `\n\n${buildMarker}\nRun \`node tools/build-lake-allocator-war-public-route-execution-wave-31.mjs\` only after the Wave 30 route ledgers and the Wave 31 source plan are present. The builder must preserve the exact thirty-eight-task denominator, execute only the thirty-four public tasks, retain the four protected tasks as access-bounded, and create no evidence, estate adoption, finding, graph, or publication effect.\n`;
}
fs.writeFileSync(full(buildInstructionsPath), buildInstructions);

console.log('Wave 31 materialization contract prepared');
console.log(`  source/action/report roots: ${sourcePaths.length}/${actionPaths.length}/${reportPaths.length}`);
console.log(`  generated paths: ${generatedPaths.length}`);
