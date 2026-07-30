#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildPoofCliffordEcology, computeReleaseManifest, manifestPath, outputRoot, releaseScope } from './build-poof-clifford-ecology.mjs';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (root, relative) => JSON.parse(fs.readFileSync(path.join(root, relative), 'utf8'));

function matchesType(value, type) {
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
  if (type === 'integer') return Number.isInteger(value);
  return typeof value === type;
}

export function validateObjectAgainstSchema(value, schema, location = '$') {
  const errors = [];
  const fail = (message) => errors.push(`${location}: ${message}`);
  if ('const' in schema && JSON.stringify(value) !== JSON.stringify(schema.const)) fail(`expected const ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.some((item) => JSON.stringify(item) === JSON.stringify(value))) fail(`not in enum ${schema.enum.join(', ')}`);
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    if (!types.some((type) => matchesType(value, type))) {
      fail(`expected type ${types.join('|')}`);
      return errors;
    }
  }
  if (typeof value === 'string') {
    if (schema.minLength && value.length < schema.minLength) fail(`shorter than ${schema.minLength}`);
    if (schema.pattern && !(new RegExp(schema.pattern).test(value))) fail(`does not match ${schema.pattern}`);
    if (schema.format === 'date-time' && Number.isNaN(Date.parse(value))) fail('invalid date-time');
  }
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) fail(`fewer than ${schema.minItems} items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) fail(`more than ${schema.maxItems} items`);
    if (schema.uniqueItems && new Set(value.map((item) => JSON.stringify(item))).size !== value.length) fail('items not unique');
    if (schema.items) value.forEach((item, index) => errors.push(...validateObjectAgainstSchema(item, schema.items, `${location}[${index}]`)));
  }
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    for (const required of schema.required || []) if (!(required in value)) errors.push(`${location}.${required}: required`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...validateObjectAgainstSchema(item, schema.properties[key], `${location}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${location}.${key}: additional property`);
      else if (schema.additionalProperties && typeof schema.additionalProperties === 'object') errors.push(...validateObjectAgainstSchema(item, schema.additionalProperties, `${location}.${key}`));
    }
  }
  return errors;
}

function hrefTargets(html) {
  const values = [];
  for (const pattern of [/\bhref="([^"]+)"/g, /\bsrc="([^"]+)"/g]) {
    let match;
    while ((match = pattern.exec(html))) values.push(match[1]);
  }
  return values;
}

export function validatePoofCliffordEcology({ root = moduleRoot, overrides = {} } = {}) {
  const failures = [];
  const fail = (message) => failures.push(message);
  const source = (name, relative) => overrides[name] ?? readJson(root, relative);
  let built;
  try { built = buildPoofCliffordEcology({ root, writeFiles: false }); }
  catch (error) { fail(`source compilation failed: ${error.message}`); return { ok: false, failures }; }

  const contract = source('contract', 'data/project/poof-clifford-ecology-contract.json');
  const bindings = source('bindings', 'data/project/poof-clifford-projection-contracts.json');
  const integration = source('integration', 'data/project/poof-clifford-integration-map.json');
  const objects = source('objects', 'data/project/poof-clifford-object-registry.json');
  const aperture = source('aperture', 'data/project/poof-clifford-aperture.json');
  const core = source('core', 'data/project/core-thesis.json');
  const registry = source('registry', 'data/project/m05-answerable-power-story-registry.json');
  const fanout = source('fanout', 'data/project/m05-answerable-power-fanout.json');

  if (contract.schema_version !== 'poof-clifford-ecology-contract@1') fail('unexpected ecology schema');
  if (contract.status !== 'staged_repository_native_nonpublic_aperture') fail('ecology status laundering');
  if (contract.graph_effect !== 'none' || contract.conclusion_generated !== false || contract.project_complete !== false) fail('ecology result boundary drift');
  if (contract.source_repository.base_commit !== 'fdc13faf46e9a4ea273d7dce3d656b8e36d21844') fail('base commit drift');
  if (contract.poof_source_custody.sha256 !== '1bd0b14bab50bcdcaee7998e4e26392663174cee22c4b3f0a0487115454bfcf2') fail('POOF source custody drift');
  if (contract.poof_source_custody.public_distribution_included !== false || contract.poof_source_custody.canonical_evidence_effect !== false) fail('private manuscript authority leakage');
  if (contract.governing_law.statement !== 'Evidence authority moves outward. Challenges move inward. Publication never writes facts backward into the evidence estate.') fail('governing law drift');
  if (contract.jurisdictions.length !== 4 || new Set(contract.jurisdictions.map((row) => row.jurisdiction_id)).size !== 4) fail('four-jurisdiction contract drift');
  if (contract.authority_stack.length !== 5) fail('authority stack drift');
  if (contract.transaction_objects.length !== 5) fail('transaction object count drift');
  if (contract.publication_state.current_state !== 'staged_nonpublic_generated_aperture' || contract.publication_state.may_be_represented_as_deployed !== false) fail('deployment laundering');
  for (const [key, value] of Object.entries(contract.boundaries)) {
    if (key === 'graph_effect') { if (value !== 'none') fail('contract graph boundary drift'); }
    else if (value !== false) fail(`contract boundary ${key} must remain false`);
  }

  const reportIds = new Set(core.report_contracts.map((row) => row.report_type_id));
  for (const id of ['R8-epistemic-admissibility-ceiling-conversion', 'R9-two-tier-constitution-safeguard-allocation']) if (!reportIds.has(id)) fail(`missing core report contract ${id}`);
  if (core.report_contracts.length !== 9) fail(`expected nine report contracts, saw ${core.report_contracts.length}`);
  if (bindings.source_of_report_contract_truth !== 'data/project/core-thesis.json') fail('projection contract truth duplicated');
  if (JSON.stringify([...bindings.report_type_ids].sort()) !== JSON.stringify(['R8-epistemic-admissibility-ceiling-conversion','R9-two-tier-constitution-safeguard-allocation'].sort())) fail('R8/R9 binding drift');
  for (const row of bindings.bindings) if (row.graph_effect !== 'none') fail(`${row.report_type_id}: graph leak`);

  if (!registry.stories.some((row) => row.story_id === 'M05-S15' && row.maximum_ceiling === 'context_bounded_safeguard_differential')) fail('M05-S15 missing or over ceiling');
  if (!fanout.lanes.some((row) => row.lane_id === 'A18' && row.story_id === 'M05-S15')) fail('A18 missing or disconnected');
  if (registry.counts.stories !== 15 || registry.counts.constitutional_mechanism !== 5) fail('M05 story count drift');
  if (fanout.counts.lanes !== 18 || fanout.counts.story_lanes !== 15) fail('M05 lane count drift');
  if (registry.boundaries.steel_mirror_differential_proves_bad_faith !== false || fanout.boundaries.steel_mirror_differential_proves_bad_faith !== false) fail('Steel Mirror bad-faith shortcut enabled');

  if (integration.report_map.length !== 5 || integration.reader_file_map.length !== 3 || integration.examination_map.length !== 4 || integration.estate_map.length !== 8) fail('POOF integration map count drift');
  for (const required of ['POOF-RPT-INT-K0','POOF-RPT-CH16-MIRROR','POOF-RPT-METHOD-BOUNDARY','POOF-RPT-APP-B-K0','POOF-RPT-APP-C-PREFLIGHT']) if (!integration.report_map.some((row) => row.integration_id === required)) fail(`missing integration ${required}`);
  for (const required of ['POOF-EX-13','POOF-EX-14','POOF-EX-15','POOF-EX-16']) if (!integration.examination_map.some((row) => row.proceeding_id === required)) fail(`missing proceeding ${required}`);
  if (integration.boundaries.graph_effect !== 'none' || integration.boundaries.private_source_text_republished !== false) fail('integration boundary drift');

  if (objects.objects.length !== 5 || new Set(objects.objects.map((row) => row.object_id)).size !== 5) fail('object registry drift');
  for (const row of objects.objects) if (row.canonical_write !== false || row.graph_effect !== 'none') fail(`${row.object_id}: object authority leak`);
  if (aperture.routes.length !== 9 || aperture.publication.deployed !== false || aperture.publication.indexable !== false) fail('aperture publication drift');

  const schemaFixturePairs = [
    ['schemas/poof-projection-manifest.schema.json','test/fixtures/poof-projection-manifest.fixture.json'],
    ['schemas/poof-referral-packet.schema.json','test/fixtures/poof-referral-packet.fixture.json'],
    ['schemas/poof-comprehension-receipt.schema.json','test/fixtures/poof-comprehension-receipt.fixture.json'],
    ['schemas/poof-publication-audit-receipt.schema.json','test/fixtures/poof-publication-audit-receipt.fixture.json'],
    ['schemas/poof-right-of-reply.schema.json','test/fixtures/poof-right-of-reply.fixture.json']
  ];
  for (const [schemaPath, fixturePath] of schemaFixturePairs) {
    const schema = readJson(root, schemaPath);
    const fixture = overrides.fixtures?.[fixturePath] ?? readJson(root, fixturePath);
    for (const error of validateObjectAgainstSchema(fixture, schema)) fail(`${fixturePath}: ${error}`);
    if (fixture.graph_effect !== 'none') fail(`${fixturePath}: graph leak`);
  }

  const packageJson = readJson(root, 'package.json');
  for (const [name, expected] of [
    ['build:poof-ecology','node tools/build-poof-clifford-ecology.mjs'],
    ['validate:poof-ecology','node tools/validate-poof-clifford-ecology.mjs']
  ]) if (packageJson.scripts[name] !== expected) fail(`package script ${name} missing`);
  if (!packageJson.scripts.test.includes('test/poof-clifford-ecology.test.js')) fail('POOF ecology regression absent from npm test');
  if (!packageJson.scripts.check.includes('build:poof-ecology') || !packageJson.scripts.check.includes('validate:poof-ecology')) fail('POOF ecology absent from release gate');

  for (const relative of releaseScope) {
    if (!fs.existsSync(path.join(root, relative))) fail(`${relative}: missing release file`);
    if (/^(data\/canonical|data\/ledger|cases)\//.test(relative)) fail(`${relative}: canonical path in ecology scope`);
    if (/POOF_The_People_Outside|POOF-Director|POOF_WORLD_KIT/.test(relative)) fail(`${relative}: private POOF source redistributed`);
  }

  const expectedManifest = computeReleaseManifest(root);
  const committedManifest = overrides.manifest ?? readJson(root, manifestPath);
  if (JSON.stringify(expectedManifest) !== JSON.stringify(committedManifest)) fail('ecology release manifest drift');
  const outputManifest = readJson(root, `${outputRoot}/release-manifest.json`);
  if (JSON.stringify(outputManifest) !== JSON.stringify(committedManifest)) fail('output release manifest drift');
  const projection = overrides.projection ?? readJson(root, `${outputRoot}/projection-manifest.json`);
  const projectionSchema = readJson(root, 'schemas/poof-projection-manifest.schema.json');
  for (const error of validateObjectAgainstSchema(projection, projectionSchema)) fail(`projection-manifest: ${error}`);
  if (projection.source_commit !== contract.source_repository.base_commit || projection.review_state !== 'review_required') fail('projection custody drift');

  const mcp = overrides.mcp ?? readJson(root, `${outputRoot}/mcp-server-card.json`);
  if (mcp.implementation_status !== 'contract_only_not_deployed' || mcp.endpoint !== null || mcp.canonical_write !== false || mcp.graph_effect !== 'none') fail('MCP deployment or authority laundering');
  const openapi = readJson(root, `${outputRoot}/openapi.json`);
  if (openapi['x-implementation-status'] !== 'contract_only_not_deployed' || openapi['x-canonical-write'] !== false) fail('OpenAPI deployment or authority laundering');
  if (fs.readFileSync(path.join(root, outputRoot, 'robots.txt'), 'utf8') !== 'User-agent: *\nDisallow: /\n') fail('robots publication boundary drift');

  const htmlFiles = aperture.routes.map((row) => path.join(root, outputRoot, routeToFile(row.path)));
  const outputBase = path.join(root, outputRoot);
  for (const file of htmlFiles) {
    if (!fs.existsSync(file)) { fail(`${path.relative(root, file)}: missing route`); continue; }
    const html = fs.readFileSync(file, 'utf8');
    const relative = path.relative(root, file).replaceAll('\\','/');
    if ((html.match(/<h1\b/g) || []).length !== 1) fail(`${relative}: expected one h1`);
    for (const marker of ['<header','<nav','<main','<footer','Skip to content']) if (!html.includes(marker)) fail(`${relative}: missing ${marker}`);
    if (!html.includes('noindex,nofollow')) fail(`${relative}: indexing boundary missing`);
    for (const target of hrefTargets(html)) {
      if (/^(https?:|mailto:|tel:|#|data:|javascript:)/.test(target)) continue;
      const clean = target.split('#')[0].split('?')[0];
      if (!clean) continue;
      const resolved = path.resolve(path.dirname(file), clean);
      if (!resolved.startsWith(outputBase) || !fs.existsSync(resolved)) fail(`${relative}: broken or escaping link ${target}`);
    }
  }

  if (built.data.counts.jurisdictions !== 4 || built.data.counts.transaction_objects !== 5 || built.data.counts.report_contracts !== 2 || built.data.counts.aperture_routes !== 9) fail('compiled ecology count drift');
  return { ok: failures.length === 0, failures };
}

function routeToFile(route) {
  if (route === '/') return 'index.html';
  return `${route.replace(/^\//,'').replace(/\/$/,'')}/index.html`;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validatePoofCliffordEcology();
  if (!result.ok) {
    console.error(`POOF ecology validation failed with ${result.failures.length} error(s):\n${result.failures.map((row) => `- ${row}`).join('\n')}`);
    process.exit(1);
  }
  console.log('validate-poof-clifford-ecology: OK');
}
