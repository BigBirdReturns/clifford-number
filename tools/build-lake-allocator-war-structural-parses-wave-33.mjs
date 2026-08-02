#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.cwd();
const full = relative => path.join(root, relative);
const readJson = relative => JSON.parse(fs.readFileSync(full(relative), 'utf8'));
const readJsonl = relative => fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const writeJson = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), JSON.stringify(value, null, 2) + '\n');
};
const writeJsonl = (relative, rows) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + '\n');
};
const writeText = (relative, value) => {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), value);
};
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const canonical = value => {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
};
const canonicalJson = value => JSON.stringify(canonical(value));
const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length])
);
const increment = (map, key, amount = 1) => map.set(key, (map.get(key) ?? 0) + amount);
const sortedObject = map => Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));

function valueType(value) {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function getJsonPath(value, jsonPath) {
  if (jsonPath === '$') return { found: true, value };
  if (!jsonPath.startsWith('$.')) return { found: false, value: undefined };
  let current = value;
  for (const segment of jsonPath.slice(2).split('.')) {
    if (!current || typeof current !== 'object' || Array.isArray(current) || !(segment in current)) {
      return { found: false, value: undefined };
    }
    current = current[segment];
  }
  return { found: true, value: current };
}

function summarizeCandidateArray(value, jsonPath, limits) {
  const resolved = getJsonPath(value, jsonPath);
  if (!resolved.found) return { path: jsonPath, state: 'path_absent', row_count: 0, row_types: {}, shape_signatures: [] };
  if (!Array.isArray(resolved.value)) {
    return { path: jsonPath, state: 'path_not_array', row_count: 0, observed_type: valueType(resolved.value), row_types: {}, shape_signatures: [] };
  }
  const rowTypes = new Map();
  const shapeCounts = new Map();
  for (const row of resolved.value) {
    const type = valueType(row);
    increment(rowTypes, type);
    if (type === 'object') {
      const keys = Object.keys(row).sort();
      const signature = sha256(keys.join('\u0000'));
      const prior = shapeCounts.get(signature) ?? { signature_sha256: signature, keys, count: 0 };
      prior.count += 1;
      shapeCounts.set(signature, prior);
    }
  }
  const shapeSignatures = [...shapeCounts.values()]
    .sort((left, right) => right.count - left.count || left.signature_sha256.localeCompare(right.signature_sha256))
    .slice(0, limits.maximum_candidate_shape_signatures);
  return {
    path: jsonPath,
    state: 'array_observed',
    row_count: resolved.value.length,
    row_types: sortedObject(rowTypes),
    distinct_object_shapes: shapeCounts.size,
    shape_signatures: shapeSignatures
  };
}

export function parseJsonStructure(bytes, spec, plan) {
  const text = bytes.toString('utf8');
  const value = JSON.parse(text);
  const limits = plan.parser_limits;
  const counts = new Map([
    ['array', 0], ['boolean', 0], ['null', 0], ['number', 0], ['object', 0], ['string', 0]
  ]);
  const keyCounts = new Map();
  const arrayPaths = [];
  let maximumDepth = 0;
  let truncatedArrayPaths = false;
  let truncatedKeys = false;

  const visit = (node, jsonPath, depth) => {
    if (depth > limits.maximum_json_depth) throw new Error(`${spec.parse_ref}: JSON depth exceeds parser limit`);
    maximumDepth = Math.max(maximumDepth, depth);
    const type = valueType(node);
    increment(counts, type);
    if (type === 'array') {
      if (arrayPaths.length < limits.maximum_json_array_paths) arrayPaths.push({ path: jsonPath, length: node.length });
      else truncatedArrayPaths = true;
      node.forEach((child, index) => visit(child, `${jsonPath}[${index}]`, depth + 1));
    } else if (type === 'object') {
      for (const key of Object.keys(node).sort()) {
        if (keyCounts.size < limits.maximum_json_key_names || keyCounts.has(key)) increment(keyCounts, key);
        else truncatedKeys = true;
        visit(node[key], `${jsonPath}.${key}`, depth + 1);
      }
    }
  };
  visit(value, '$', 0);
  arrayPaths.sort((left, right) => left.path.localeCompare(right.path));
  return {
    parser_family: 'deterministic-json-recursive-v1',
    input_utf8_characters: text.length,
    root_type: valueType(value),
    root_keys: value && typeof value === 'object' && !Array.isArray(value) ? Object.keys(value).sort() : [],
    node_type_counts: sortedObject(counts),
    maximum_depth: maximumDepth,
    distinct_key_names: keyCounts.size,
    key_occurrences: sortedObject(keyCounts),
    array_paths: arrayPaths,
    array_paths_truncated: truncatedArrayPaths,
    key_names_truncated: truncatedKeys,
    candidate_arrays: spec.candidate_array_paths.map(jsonPath => summarizeCandidateArray(value, jsonPath, limits))
  };
}

function stripHtmlForText(html) {
  return html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(?:#\d+|#x[0-9a-f]+|[a-z][a-z0-9]+);/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseHtmlStructure(bytes, plan) {
  const html = bytes.toString('utf8');
  const limits = plan.parser_limits;
  const tagCounts = new Map();
  const attributeCounts = new Map();
  let totalTagTokens = 0;
  let closingTagTokens = 0;
  let selfClosingTagTokens = 0;
  let truncatedTags = false;
  let truncatedAttributes = false;
  const tagPattern = /<\s*(\/?)\s*([a-zA-Z][a-zA-Z0-9:-]*)([^<>]*?)\s*(\/?)>/g;
  let match;
  while ((match = tagPattern.exec(html)) !== null) {
    totalTagTokens += 1;
    const closing = match[1] === '/';
    const selfClosing = match[4] === '/';
    const tag = match[2].toLowerCase();
    if (closing) closingTagTokens += 1;
    if (selfClosing) selfClosingTagTokens += 1;
    if (!closing) {
      if (tagCounts.size < limits.maximum_html_tag_names || tagCounts.has(tag)) increment(tagCounts, tag);
      else truncatedTags = true;
      const attrs = match[3] ?? '';
      const attrPattern = /(?:^|\s)([a-zA-Z_:][a-zA-Z0-9_:.-]*)(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g;
      let attrMatch;
      while ((attrMatch = attrPattern.exec(attrs)) !== null) {
        const name = attrMatch[1].toLowerCase();
        if (attributeCounts.size < limits.maximum_html_attribute_names || attributeCounts.has(name)) increment(attributeCounts, name);
        else truncatedAttributes = true;
      }
    }
  }
  const titleMatch = html.match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i);
  const titleText = titleMatch ? stripHtmlForText(titleMatch[1]) : '';
  const visibleText = stripHtmlForText(html);
  const tag = name => tagCounts.get(name) ?? 0;
  return {
    parser_family: 'deterministic-html-token-count-v1',
    input_utf8_characters: html.length,
    line_count: html.length === 0 ? 0 : html.split(/\r?\n/).length,
    doctype_present: /<!doctype\s+html\b/i.test(html),
    html_element_present: tag('html') > 0,
    head_element_present: tag('head') > 0,
    body_element_present: tag('body') > 0,
    comment_count: (html.match(/<!--[\s\S]*?-->/g) ?? []).length,
    total_tag_tokens: totalTagTokens,
    closing_tag_tokens: closingTagTokens,
    self_closing_tag_tokens: selfClosingTagTokens,
    distinct_tag_names: tagCounts.size,
    tag_counts: sortedObject(tagCounts),
    distinct_attribute_names: attributeCounts.size,
    attribute_counts: sortedObject(attributeCounts),
    title_present: Boolean(titleMatch),
    title_characters: titleText.length,
    title_sha256: titleText ? sha256(titleText) : null,
    heading_counts: Object.fromEntries(['h1','h2','h3','h4','h5','h6'].map(name => [name, tag(name)])),
    structure_counts: {
      anchors: tag('a'),
      forms: tag('form'),
      inputs: tag('input'),
      buttons: tag('button'),
      tables: tag('table'),
      table_rows: tag('tr'),
      table_headers: tag('th'),
      table_cells: tag('td'),
      ordered_lists: tag('ol'),
      unordered_lists: tag('ul'),
      list_items: tag('li'),
      paragraphs: tag('p'),
      scripts: tag('script'),
      styles: tag('style'),
      meta: tag('meta'),
      links: tag('link')
    },
    visible_text_characters: visibleText.length,
    visible_word_tokens: visibleText ? visibleText.split(/\s+/).length : 0,
    tag_names_truncated: truncatedTags,
    attribute_names_truncated: truncatedAttributes,
    parser_constructs_dom: false,
    parser_executes_scripts: false
  };
}

function parseState(sourceRow) {
  if (sourceRow.capture_state === 'credential_boundary_preserved') return 'credential_boundary_preserved';
  if (sourceRow.capture_state === 'captured_json_response') return 'parsed_json_structure';
  if (sourceRow.capture_state === 'captured_http_error_response') return 'parsed_http_error_structure';
  return 'parsed_html_structure';
}

function structuralAuthority(policy) {
  return {
    parse_authority: 'frozen_response_structural_parsing_only',
    complete_denominator: false,
    evidence_adjudicated: false,
    evidence_rows: 0,
    estate_adopted: false,
    finding_promoted: false,
    blocked_promotions: policy.blocked_promotions,
    graph_effect: 'none',
    publication_status: 'blocked'
  };
}

function parseOne(spec, sourceRow, sourceRaw, parserFingerprint, policy, plan) {
  if (sourceRow.snapshot_ref !== spec.snapshot_ref || sourceRow.source_ref !== spec.source_ref) {
    throw new Error(`${spec.parse_ref}: source snapshot custody drift`);
  }
  const sourceRowHash = sha256(canonicalJson(sourceRow));
  const state = parseState(sourceRow);
  const base = {
    schema_version: 'lake-allocator-war-structural-parse-wave-33@1',
    row_type: 'bounded_source_structural_parse',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    parse_ref: spec.parse_ref,
    parse_sequence: spec.parse_sequence,
    snapshot_ref: sourceRow.snapshot_ref,
    source_ref: sourceRow.source_ref,
    source_title: sourceRow.source_title,
    publisher: sourceRow.publisher,
    source_locator: sourceRow.source_locator,
    observed_at: sourceRow.observed_at,
    source_capture_mode: sourceRow.capture_mode,
    source_expected_format: sourceRow.expected_format,
    source_capture_state: sourceRow.capture_state,
    source_response_status: sourceRow.response_status,
    source_snapshot_row_sha256: sourceRowHash,
    parser_profile: spec.parser_profile,
    parser_implementation_path: parserFingerprint.path,
    parser_implementation_sha256: parserFingerprint.sha256,
    parser_limits: plan.parser_limits,
    parse_state: state,
    structural_purpose: spec.structural_purpose,
    source_limits: spec.limits,
    ...structuralAuthority(policy)
  };
  if (state === 'credential_boundary_preserved') {
    return {
      ...base,
      source_response_body_path: null,
      source_response_body_bytes: null,
      source_response_body_sha256: null,
      credential_requirement: sourceRow.credential_requirement,
      boundary_reason: sourceRow.boundary_reason,
      structure: null
    };
  }
  if (!Buffer.isBuffer(sourceRaw)) throw new Error(`${spec.parse_ref}: source response bytes absent`);
  if (sourceRaw.length !== sourceRow.response_body_bytes || sha256(sourceRaw) !== sourceRow.response_body_sha256) {
    throw new Error(`${spec.parse_ref}: source response hash custody failed`);
  }
  const structure = sourceRow.expected_format === 'json'
    ? parseJsonStructure(sourceRaw, spec, plan)
    : parseHtmlStructure(sourceRaw, plan);
  return {
    ...base,
    source_response_body_path: sourceRow.response_body_path,
    source_response_body_bytes: sourceRaw.length,
    source_response_body_sha256: sha256(sourceRaw),
    structure
  };
}

function collectWave32TaskRows(sourceProjection) {
  const rows = [];
  for (const route of sourceProjection.routes) {
    const raw = fs.readFileSync(full(route.result_path), 'utf8');
    rows.push(...raw.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
      .filter(row => row.row_type === 'bounded_source_snapshot_task_result'));
  }
  return rows.sort((left, right) => left.result_sequence - right.result_sequence);
}

export function buildStructuralParses(inputs) {
  const { policy, plan, sourcePolicy, sourcePlan, sourceProjection, sourceRows, sourceRawByPath, parserFingerprint } = inputs;
  const sourceBySnapshot = new Map(sourceRows.map(row => [row.snapshot_ref, row]));
  const parseRows = plan.parse_specs.map(spec => {
    const sourceRow = sourceBySnapshot.get(spec.snapshot_ref);
    if (!sourceRow) throw new Error(`${spec.parse_ref}: source snapshot absent`);
    return parseOne(spec, sourceRow, sourceRawByPath[sourceRow.response_body_path], parserFingerprint, policy, plan);
  });
  const parseBySource = new Map(parseRows.map(row => [row.source_ref, row]));
  const sourceTaskRows = collectWave32TaskRows(sourceProjection);
  const routes = sourceProjection.routes
    .slice()
    .sort((left, right) => left.route_sequence - right.route_sequence)
    .map(route => ({
      route_ref: route.route_ref,
      route_class: route.route_class,
      route_sequence: route.route_sequence,
      route_owner: route.route_owner,
      source_task_count: route.source_task_count,
      source_refs: route.source_refs,
      parse_refs: route.source_refs.map(sourceRef => parseBySource.get(sourceRef)?.parse_ref ?? null),
      parse_states: countBy(route.source_refs.map(sourceRef => parseBySource.get(sourceRef)).filter(Boolean), 'parse_state'),
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    }));
  const tasks = sourceTaskRows.map(row => ({
    source_task_ref: row.source_task_ref,
    source_route_ref: row.source_route_ref,
    source_route_class: row.source_route_class,
    source_result_state: row.result_state,
    source_refs: row.source_refs,
    parse_refs: row.source_refs.map(sourceRef => parseBySource.get(sourceRef)?.parse_ref ?? null),
    parse_states: countBy(row.source_refs.map(sourceRef => parseBySource.get(sourceRef)).filter(Boolean), 'parse_state'),
    complete_denominator: false,
    evidence_adjudicated: false,
    estate_adopted: false,
    finding_promoted: false,
    graph_effect: 'none',
    publication_status: 'blocked'
  }));
  const rawBytes = parseRows.filter(row => row.source_response_body_path).reduce((sum, row) => sum + row.source_response_body_bytes, 0);
  const sourceUseCount = tasks.reduce((sum, row) => sum + row.source_refs.length, 0);
  const projection = {
    schema_version: 'lake-allocator-war-structural-parses-wave-33@1',
    program_ref: policy.program_ref,
    wave_ref: policy.wave_ref,
    as_of: policy.as_of,
    generated_from: {
      policy_path: 'data/project/lake-allocator-war-structural-parses-wave-33-policy.json',
      policy_sha256: sha256(JSON.stringify(policy, null, 2) + '\n'),
      plan_path: policy.paths.parse_plan,
      plan_sha256: sha256(JSON.stringify(plan, null, 2) + '\n'),
      source_policy_path: policy.paths.source_policy,
      source_policy_sha256: sha256(JSON.stringify(sourcePolicy, null, 2) + '\n'),
      source_plan_path: policy.paths.source_plan,
      source_plan_sha256: sha256(JSON.stringify(sourcePlan, null, 2) + '\n'),
      source_projection_path: policy.paths.source_projection,
      source_projection_sha256: sha256(JSON.stringify(sourceProjection, null, 2) + '\n'),
      source_snapshot_ledger_path: policy.paths.source_snapshot_ledger,
      parser_implementation_path: parserFingerprint.path,
      parser_implementation_sha256: parserFingerprint.sha256
    },
    counts: {
      source_routes: routes.length,
      source_tasks: tasks.length,
      source_receipts: sourceProjection.counts.source_receipts,
      source_receipt_uses: sourceUseCount,
      parse_specs: plan.parse_specs.length,
      parse_rows: parseRows.length,
      parser_profiles: Object.keys(plan.parser_profiles).length,
      json_parse_rows: parseRows.filter(row => row.source_expected_format === 'json').length,
      html_parse_rows: parseRows.filter(row => row.source_expected_format === 'html').length,
      credential_boundary_rows: parseRows.filter(row => row.parse_state === 'credential_boundary_preserved').length,
      response_parse_rows: parseRows.filter(row => row.source_response_body_path).length,
      response_parse_bytes: rawBytes,
      parse_states: countBy(parseRows, 'parse_state'),
      route_rows: routes.length,
      task_rows: tasks.length,
      complete_denominators: 0,
      evidence_rows: 0,
      estate_adoptions: 0,
      finding_promotions: 0,
      graph_effects: 0,
      publication_clearances: 0
    },
    parse_objects: parseRows.map(row => ({
      parse_ref: row.parse_ref,
      parse_sequence: row.parse_sequence,
      snapshot_ref: row.snapshot_ref,
      source_ref: row.source_ref,
      parser_profile: row.parser_profile,
      parse_state: row.parse_state,
      source_response_status: row.source_response_status,
      source_response_body_path: row.source_response_body_path,
      source_response_body_bytes: row.source_response_body_bytes,
      source_response_body_sha256: row.source_response_body_sha256,
      source_snapshot_row_sha256: row.source_snapshot_row_sha256,
      structure: row.structure,
      complete_denominator: false,
      evidence_adjudicated: false,
      graph_effect: 'none',
      publication_status: 'blocked'
    })),
    routes,
    tasks,
    execution_contract: {
      one_parse_per_source_snapshot: true,
      network_requests_performed: 0,
      frozen_response_hashes_verified: true,
      parser_identity_hash_bound: true,
      parse_objects_reused_by_route_and_task: true,
      release_validation_refetches_network: false,
      complete_denominator_created: false
    },
    boundaries: policy.boundaries
  };
  return { parseRows, projection };
}

export function renderReport(projection) {
  const lines = [
    '# Allocator-war frozen source structural parses Wave 33',
    '',
    '```text',
    'source routes / tasks:              ' + projection.counts.source_routes + ' / ' + projection.counts.source_tasks,
    'source receipts / uses:             ' + projection.counts.source_receipts + ' / ' + projection.counts.source_receipt_uses,
    'parse specifications / rows:        ' + projection.counts.parse_specs + ' / ' + projection.counts.parse_rows,
    'JSON / HTML / boundary parses:       ' + projection.counts.json_parse_rows + ' / ' + projection.counts.html_parse_rows + ' / ' + projection.counts.credential_boundary_rows,
    'response parse files / bytes:       ' + projection.counts.response_parse_rows + ' / ' + projection.counts.response_parse_bytes,
    'parser profiles:                    ' + projection.counts.parser_profiles,
    'parse states:                       ' + JSON.stringify(projection.counts.parse_states),
    'complete denominators:              0',
    'evidence rows:                      0',
    'estate adoptions:                   0',
    'finding promotions:                 0',
    'graph effects:                      0',
    'publication clearances:             0',
    '```',
    '',
    '| Parse | Snapshot | Source | Profile | State | Status | Bytes | Structural headline |',
    '|---|---|---|---|---|---:|---:|---|'
  ];
  for (const row of projection.parse_objects) {
    let headline = 'credential or lawful-access boundary preserved';
    if (row.structure?.parser_family === 'deterministic-json-recursive-v1') {
      headline = `root=${row.structure.root_type}; objects=${row.structure.node_type_counts.object}; arrays=${row.structure.node_type_counts.array}; keys=${row.structure.distinct_key_names}`;
    } else if (row.structure?.parser_family === 'deterministic-html-token-count-v1') {
      headline = `tags=${row.structure.total_tag_tokens}; links=${row.structure.structure_counts.anchors}; forms=${row.structure.structure_counts.forms}; text=${row.structure.visible_text_characters}`;
    }
    lines.push(`| ${row.parse_ref} | ${row.snapshot_ref} | ${row.source_ref} | ${row.parser_profile} | ${row.parse_state} | ${row.source_response_status ?? ''} | ${row.source_response_body_bytes ?? ''} | ${headline} |`);
  }
  lines.push(
    '',
    'Wave 33 verifies each frozen response hash before parsing and performs no network request. The parse objects expose source shape, parser identity, and bounded structural counts for later acquisition design.',
    '',
    'A key name, array length, tag count, link count, HTTP error body, or credential boundary does not establish a complete institutional denominator, authorize a cross-source join, adjudicate evidence, promote a finding, alter the graph, or clear publication.',
    ''
  );
  return lines.join('\n');
}

export function loadInputs() {
  const policyPath = 'data/project/lake-allocator-war-structural-parses-wave-33-policy.json';
  const policy = readJson(policyPath);
  const plan = readJson(policy.paths.parse_plan);
  const sourcePolicy = readJson(policy.paths.source_policy);
  const sourcePlan = readJson(policy.paths.source_plan);
  const sourceProjection = readJson(policy.paths.source_projection);
  const sourceRows = readJsonl(policy.paths.source_snapshot_ledger);
  const sourceRawByPath = {};
  for (const row of sourceRows) {
    if (row.response_body_path) sourceRawByPath[row.response_body_path] = fs.readFileSync(full(row.response_body_path));
  }
  const implementationPath = 'tools/build-lake-allocator-war-structural-parses-wave-33.mjs';
  const parserFingerprint = { path: implementationPath, sha256: sha256(fs.readFileSync(full(implementationPath))) };
  return { policy, plan, sourcePolicy, sourcePlan, sourceProjection, sourceRows, sourceRawByPath, parserFingerprint };
}

export function runBuild() {
  const inputs = loadInputs();
  const { parseRows, projection } = buildStructuralParses(inputs);
  writeJsonl(inputs.policy.paths.parse_ledger, parseRows);
  writeJson(inputs.policy.paths.projection, projection);
  writeText(inputs.policy.paths.report, renderReport(projection));
  return projection;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  const projection = runBuild();
  console.log('allocator-war frozen source structural parses Wave 33 built');
  console.log('  routes / tasks / sources / parses: ' + projection.counts.source_routes + ' / ' + projection.counts.source_tasks + ' / ' + projection.counts.source_receipts + ' / ' + projection.counts.parse_rows);
  console.log('  JSON / HTML / boundaries: ' + projection.counts.json_parse_rows + ' / ' + projection.counts.html_parse_rows + ' / ' + projection.counts.credential_boundary_rows);
  console.log('  parse states: ' + JSON.stringify(projection.counts.parse_states));
  console.log('  evidence / adoption / findings / graph / publication: 0 / 0 / 0 / 0 / 0');
}
