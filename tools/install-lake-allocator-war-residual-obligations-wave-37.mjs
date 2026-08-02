#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const writeJson = (relative, value) => fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
const addSorted = (values, additions) => [...new Set([...(values ?? []), ...additions])].sort();

const policyPath = 'data/project/lake-allocator-war-residual-obligations-wave-37-policy.json';
const policy = readJson(policyPath);
if (policy.schema_version !== 'lake-allocator-war-residual-obligations-wave-37-policy@1') throw new Error('Wave 37 policy schema mismatch');

const sourcePaths = [policyPath, policy.paths.ledger, policy.paths.method, policy.paths.milestone];
const projectionPaths = [policy.paths.projection];
const reportPaths = [policy.paths.report];
const authorityPaths = [...sourcePaths, ...projectionPaths, ...reportPaths];

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
lakePolicy.authoritative_roots = addSorted(lakePolicy.authoritative_roots, authorityPaths);
lakePolicy.boundaries = {
  ...(lakePolicy.boundaries ?? {}),
  allocator_war_wave_37_component_count_is_completion: false,
  allocator_war_wave_37_partial_register_is_complete_denominator: false,
  allocator_war_wave_37_priority_is_evidence_strength: false,
  allocator_war_wave_37_external_review_required_to_classify: false
};
writeJson(lakePolicyPath, lakePolicy);

const basinPath = 'data/project/lake-basin-registry.json';
const basinRegistry = readJson(basinPath);
const installBasinPaths = (basinId, paths) => {
  const basin = basinRegistry.basins.find(row => row.basin_id === basinId);
  if (!basin) throw new Error(`missing basin: ${basinId}`);
  basin.path_prefixes = addSorted(basin.path_prefixes, paths);
  basin.authoritative_entrypoints = addSorted(basin.authoritative_entrypoints, paths);
};
installBasinPaths('allocator-war-source', sourcePaths);
installBasinPaths('allocator-war-lake-actions', projectionPaths);
installBasinPaths('allocator-war-reports', reportPaths);
basinRegistry.boundaries = {
  ...(basinRegistry.boundaries ?? {}),
  allocator_war_wave_37_component_is_requirement_satisfaction: false,
  allocator_war_wave_37_priority_is_evidence_strength: false,
  allocator_war_wave_37_external_review_required_to_classify: false
};
writeJson(basinPath, basinRegistry);

const wave21PolicyPath = 'data/project/lake-allocator-war-wave-21-policy.json';
const wave21Policy = readJson(wave21PolicyPath);
wave21Policy.boundaries = {
  ...(wave21Policy.boundaries ?? {}),
  wave_37_component_is_requirement_satisfaction: false,
  wave_37_priority_is_evidence_strength: false,
  wave_37_external_review_required_to_classify: false,
  wave_37_record_holder_response_is_human_review_authority: false
};
writeJson(wave21PolicyPath, wave21Policy);

const packagePath = 'package.json';
const pkg = readJson(packagePath);
pkg.scripts['build:lake-allocator-war-residual-obligations-wave-37'] = 'node tools/build-lake-allocator-war-residual-obligations-wave-37.mjs';
pkg.scripts['validate:lake-allocator-war-residual-obligations-wave-37'] = 'node tools/validate-lake-allocator-war-residual-obligations-wave-37.mjs && node test/lake-allocator-war-residual-obligations-wave-37.test.js';
pkg.scripts['ci:lake-allocator-war-residual-obligations-wave-37'] = 'npm run build:lake-allocator-war-residual-obligations-wave-37 && npm run validate:lake-allocator-war-residual-obligations-wave-37';
const wave37Gate = 'npm run validate:lake-allocator-war-residual-obligations-wave-37';
if (!pkg.scripts.check.includes(wave37Gate)) {
  const marker = 'npm run validate:lake-allocator-war-public-acquisition-wave-36';
  if (!pkg.scripts.check.includes(marker)) throw new Error('Wave 36 release-gate marker missing');
  pkg.scripts.check = pkg.scripts.check.replace(marker, `${marker} && ${wave37Gate}`);
}
writeJson(packagePath, pkg);

const buildInstructionsPath = 'BUILD-INSTRUCTIONS.md';
let buildInstructions = fs.readFileSync(full(buildInstructionsPath), 'utf8');
const buildMarker = '3.37 **Allocator-war residual institutional obligations — Wave 37.**';
if (!buildInstructions.includes(buildMarker)) {
  buildInstructions += `

${buildMarker}
Run \`node tools/build-lake-allocator-war-residual-obligations-wave-37.mjs\` only after the permanent Wave 36 capture, institutional-record, and task-result products are present. The builder must preserve every inherited completion test, gap, refused substitution, access class, source requirement hash, component reference, and component digest while producing exactly seven route summaries and thirty-one residual obligations.

Priority bands order the next bounded acquisition work and are not evidence strength. Official component count, provenance, partial registers, repeated identifiers, docket presence, announced amounts, and public workforce aggregates cannot satisfy a requirement or authorize a join. Missing outside reviewers do not block reversible internal classification. Protected personnel obligations remain lawful-access-only.
`;
}
fs.writeFileSync(full(buildInstructionsPath), buildInstructions);

const readmePath = 'README.md';
let readme = fs.readFileSync(full(readmePath), 'utf8');
const readmeMarker = '## Allocator-war residual institutional obligations Wave 37';
if (!readme.includes(readmeMarker)) {
  readme += `

${readmeMarker}

Wave 37 compares all thirty-one permanent Wave 36 task results with their inherited completion tests and emits one exact residual institutional obligation per task. Twenty-eight obligations retain official component custody and three retain protected lawful-access-only custody. The complete priority denominator orders further acquisition without treating priority as evidence strength or waiting for undefined outside reviewers. Requirement satisfaction, joins, evidence, findings, graph effects, and publication clearance remain zero. See \`reports/lake-allocator-war-residual-obligations-wave-37.md\`.
`;
}
fs.writeFileSync(full(readmePath), readme);

console.log('allocator-war residual institutional obligations Wave 37 authority surfaces installed');
console.log(`  authoritative roots: ${lakePolicy.authoritative_roots.length}`);
console.log(`  semantic basins: ${basinRegistry.basins.length}`);
console.log('  release gate: registered');
