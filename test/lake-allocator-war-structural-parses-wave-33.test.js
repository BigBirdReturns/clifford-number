#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  loadState,
  validateArtifacts
} from '../tools/validate-lake-allocator-war-structural-parses-wave-33.mjs';
import {
  parseHtmlStructure,
  parseJsonStructure
} from '../tools/build-lake-allocator-war-structural-parses-wave-33.mjs';

const base = loadState();
assert.deepEqual(validateArtifacts(base), [], 'baseline Wave 33 artifacts must validate');

function cloneState() {
  return {
    ...base,
    policy: structuredClone(base.policy),
    plan: structuredClone(base.plan),
    sourcePolicy: structuredClone(base.sourcePolicy),
    sourcePlan: structuredClone(base.sourcePlan),
    sourceProjection: structuredClone(base.sourceProjection),
    sourceRows: structuredClone(base.sourceRows),
    sourceRawByPath: base.sourceRawByPath,
    parserFingerprint: structuredClone(base.parserFingerprint),
    parseRows: structuredClone(base.parseRows),
    projection: structuredClone(base.projection),
    reportText: base.reportText,
    wave21Policy: structuredClone(base.wave21Policy),
    lakeIndexPolicy: structuredClone(base.lakeIndexPolicy),
    basinRegistry: structuredClone(base.basinRegistry),
    pkg: structuredClone(base.pkg),
    installerText: base.installerText,
    buildInstructions: base.buildInstructions,
    readme: base.readme,
    workflowText: base.workflowText,
    repositoryFiles: [...base.repositoryFiles]
  };
}

const mutations = [
  ['duplicate parse reference', state => { state.plan.parse_specs[1].parse_ref = state.plan.parse_specs[0].parse_ref; }],
  ['duplicate snapshot specification', state => { state.plan.parse_specs[1].snapshot_ref = state.plan.parse_specs[0].snapshot_ref; }],
  ['source specification mismatch', state => { state.plan.parse_specs[0].source_ref = 'LAW31-S999'; }],
  ['parser profile absent', state => { state.plan.parse_specs[0].parser_profile = 'missing-profile'; }],
  ['parser profile format drift', state => { state.plan.parser_profiles['json-root-array-catalog-v1'].format = 'html'; }],
  ['parser executes scripts', state => { state.plan.parser_limits.html_parser_executes_scripts = true; }],
  ['parse row missing', state => { state.parseRows.pop(); }],
  ['parse row order drift', state => { [state.parseRows[0], state.parseRows[1]] = [state.parseRows[1], state.parseRows[0]]; }],
  ['parse schema drift', state => { state.parseRows[0].schema_version = 'wrong'; }],
  ['invalid parse state', state => { state.parseRows[0].parse_state = 'promoted_evidence'; }],
  ['parser profile custody drift', state => { state.parseRows[0].parser_profile = 'json-object-envelope-v1'; }],
  ['parser implementation path drift', state => { state.parseRows[0].parser_implementation_path = 'tools/other.mjs'; }],
  ['parser implementation hash drift', state => { state.parseRows[0].parser_implementation_sha256 = '0'.repeat(64); }],
  ['source snapshot row hash drift', state => { state.parseRows[0].source_snapshot_row_sha256 = '0'.repeat(64); }],
  ['response path drift', state => { state.parseRows[0].source_response_body_path = 'wrong.json'; }],
  ['response byte count drift', state => { state.parseRows[0].source_response_body_bytes += 1; }],
  ['response hash drift', state => { state.parseRows[0].source_response_body_sha256 = 'f'.repeat(64); }],
  ['JSON parser family drift', state => { state.parseRows[0].structure.parser_family = 'semantic-classifier'; }],
  ['JSON structural counts absent', state => { delete state.parseRows[0].structure.node_type_counts; }],
  ['HTML parser executes scripts', state => { state.parseRows[7].structure.parser_executes_scripts = true; }],
  ['HTTP error promoted to HTML success', state => { state.parseRows[13].parse_state = 'parsed_html_structure'; }],
  ['credential boundary manufactured structure', state => { state.parseRows[6].structure = { rows: [] }; }],
  ['credential boundary manufactured body', state => { state.parseRows[6].source_response_body_path = 'fake.json'; }],
  ['complete denominator promotion', state => { state.parseRows[0].complete_denominator = true; }],
  ['evidence promotion', state => { state.parseRows[0].evidence_adjudicated = true; }],
  ['finding promotion', state => { state.parseRows[0].finding_promoted = true; }],
  ['graph promotion', state => { state.parseRows[0].graph_effect = 'relationship_created'; }],
  ['publication promotion', state => { state.parseRows[0].publication_status = 'cleared'; }],
  ['blocked promotion drift', state => { state.parseRows[0].blocked_promotions.pop(); }],
  ['projection parse-state drift', state => { state.projection.counts.parse_states.parsed_json_structure -= 1; }],
  ['projection response-byte drift', state => { state.projection.counts.response_parse_bytes += 1; }],
  ['projection route missing', state => { state.projection.routes.pop(); }],
  ['route parse reference missing', state => { state.projection.routes[1].parse_refs[0] = null; }],
  ['task parse reference missing', state => { state.projection.tasks[0].parse_refs[0] = null; }],
  ['task authority inflation', state => { state.projection.tasks[0].complete_denominator = true; }],
  ['network boundary drift', state => { state.projection.execution_contract.network_requests_performed = 1; }],
  ['policy boundary inflation', state => { state.policy.boundaries.parser_success_authorizes_join = true; }],
  ['Wave 21 boundary absent', state => { delete state.wave21Policy.boundaries.wave_33_structural_parse_is_evidence_row; }],
  ['Wave 21 generated path absent', state => { state.wave21Policy.projection_contract.allowed_generated_paths = state.wave21Policy.projection_contract.allowed_generated_paths.filter(path => path !== state.policy.paths.parse_ledger); }],
  ['lake authoritative root absent', state => { state.lakeIndexPolicy.authoritative_roots = state.lakeIndexPolicy.authoritative_roots.filter(path => path !== state.policy.paths.projection); }],
  ['basin registry drift', state => { state.basinRegistry.basins.find(row => row.basin_id === 'allocator-war-source').path_prefixes.pop(); }],
  ['package build script drift', state => { state.pkg.scripts['build:lake-allocator-war-structural-parses-wave-33'] = 'node wrong.mjs'; }],
  ['release gate omission', state => { state.pkg.scripts.check = state.pkg.scripts.check.replace(' && npm run validate:lake-allocator-war-structural-parses-wave-33', ''); }],
  ['installer registration absent', state => { state.installerText = state.installerText.replaceAll('data/acquisition/lake-allocator-war-wave-33/parse-ledger.jsonl', 'removed-wave33-ledger'); }],
  ['build instruction absent', state => { state.buildInstructions = state.buildInstructions.replace('3.33 **Allocator-war frozen source structural parses — Wave 33.**', 'removed'); }],
  ['README surface absent', state => { state.readme = state.readme.replace('## Allocator-war frozen source structural parses Wave 33', 'removed'); }],
  ['permanent workflow absent', state => { state.workflowText = ''; }],
  ['abandoned trigger survived', state => { state.repositoryFiles.push('.github/tmp/wave33-tree-export-trigger.json'); }],
  ['temporary workflow survived', state => { state.repositoryFiles.push('.github/workflows/temporary-wave33-materializer.yml'); }],
  ['report drift', state => { state.reportText += '\ndrift\n'; }]
];

for (const [name, mutate] of mutations) {
  const state = cloneState();
  mutate(state);
  const errors = validateArtifacts(state);
  assert.ok(errors.length > 0, `${name}: mutation was not rejected`);
}

const htmlSummary = parseHtmlStructure(Buffer.from('<!doctype html><html><head><title>Control</title><script>throw new Error()</script></head><body><a href="/x">x</a><form><input></form></body></html>'), base.plan);
assert.equal(htmlSummary.parser_executes_scripts, false);
assert.equal(htmlSummary.parser_constructs_dom, false);
assert.equal(htmlSummary.structure_counts.scripts, 1);
assert.equal(htmlSummary.structure_counts.anchors, 1);
assert.equal(htmlSummary.structure_counts.forms, 1);
assert.equal(htmlSummary.structure_counts.inputs, 1);

const jsonSpec = { parse_ref: 'TEST', candidate_array_paths: ['$.rows'] };
const jsonSummary = parseJsonStructure(Buffer.from(JSON.stringify({ rows: [{ id: 1, state: 'x' }, { id: 2, state: 'y' }] })), jsonSpec, base.plan);
assert.equal(jsonSummary.root_type, 'object');
assert.equal(jsonSummary.candidate_arrays[0].row_count, 2);
assert.equal(jsonSummary.candidate_arrays[0].distinct_object_shapes, 1);
assert.deepEqual(jsonSummary.candidate_arrays[0].shape_signatures[0].keys, ['id', 'state']);

console.log(`allocator-war frozen source structural parses Wave 33 adversarial mutations passed: ${mutations.length}`);
