#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const full = relative => path.join(root, relative);
const policyPath = 'data/project/lake-receipt-custody-wave-20-policy.json';

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}
function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8')
    .split(/\r?\n/)
    .filter(Boolean)
    .map(line => JSON.parse(line));
}
function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}
function writeCompactJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value)}\n`);
}
function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${rows.map(row => JSON.stringify(row)).join('\n')}\n`);
}
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stable(value[key])]));
}
function digest(value) {
  return crypto.createHash('sha256').update(JSON.stringify(stable(value))).digest('hex');
}
function fileDigest(relative) {
  return crypto.createHash('sha256').update(fs.readFileSync(full(relative))).digest('hex');
}
function stableId(prefix, parts) {
  return `${prefix}-${crypto.createHash('sha256').update(Buffer.from(parts.join('\0'))).digest('hex').slice(0, 24)}`;
}
function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(value => value !== null && value !== undefined).map(String))]
    .sort((left, right) => left.localeCompare(right));
}
function increment(map, key, by = 1) {
  map.set(key, (map.get(key) ?? 0) + by);
}
function asObject(map) {
  return Object.fromEntries([...map.entries()].sort(([left], [right]) => left.localeCompare(right)));
}
function appendSection(relative, marker, section) {
  const current = fs.readFileSync(full(relative), 'utf8');
  if (current.includes(marker)) return;
  fs.writeFileSync(full(relative), `${current.trimEnd()}\n\n${section.trim()}\n`);
}

const policy = readJson(policyPath);
const receiptSemantics = readJson('build/lake-index/receipt-semantics.json');
const rawReceiptRows = readJsonl('build/lake-index/receipts.jsonl');
const unusedGaps = readJsonl('build/lake-index/receipt-gaps.jsonl')
  .filter(row => row.gap_class === 'unused_receipt_definition')
  .sort((left, right) => left.receipt_id.localeCompare(right.receipt_id));

assert.equal(policy.schema_version, 'lake-receipt-custody-wave-20-policy@1');
assert.equal(receiptSemantics.canonical_receipt_ids, policy.baseline.canonical_receipt_ids);
assert.equal(receiptSemantics.source_locator_tokens, policy.baseline.source_locator_tokens);
assert.equal(receiptSemantics.content_hash_tokens, policy.baseline.content_hash_tokens);
assert.equal(receiptSemantics.inline_receipt_use_ids, policy.baseline.inline_receipt_use_ids);
assert.equal(unusedGaps.length, policy.baseline.unused_receipt_definitions);
assert.equal(rawReceiptRows.filter(row => row.defined && !row.used).length, policy.baseline.unused_receipt_definitions);
assert.equal(rawReceiptRows.filter(row => !row.defined && row.referenced).length, policy.baseline.undefined_receipt_references);

const receiptById = new Map(rawReceiptRows.map(row => [row.receipt_id, row]));
const structuredCache = new Map();

function loadStructured(relative) {
  if (structuredCache.has(relative)) return structuredCache.get(relative);
  if (!fs.existsSync(full(relative))) {
    structuredCache.set(relative, []);
    return [];
  }
  if (relative === 'data/project/lake-identifier-topology-registry-wave-18.json') {
    structuredCache.set(relative, []);
    return [];
  }
  let values = [];
  if (relative.endsWith('.jsonl')) {
    values = readJsonl(relative);
  } else if (relative.endsWith('.json')) {
    values = [readJson(relative)];
  }
  structuredCache.set(relative, values);
  return values;
}

function collectReceiptObjects(value, targets, output) {
  if (Array.isArray(value)) {
    for (const item of value) collectReceiptObjects(item, targets, output);
    return;
  }
  if (!value || typeof value !== 'object') return;
  if (typeof value.receipt_id === 'string' && targets.has(value.receipt_id)) output.push(value);
  for (const nested of Object.values(value)) collectReceiptObjects(nested, targets, output);
}

function metadataFor(target, constituentTokens, sourcePaths) {
  const targets = new Set([target, ...constituentTokens]);
  const objects = [];
  for (const relative of sourcePaths) {
    for (const value of loadStructured(relative)) collectReceiptObjects(value, targets, objects);
  }

  const locators = [];
  const hashes = [];
  const statuses = [];
  const hashStatuses = [];
  const evidenceClasses = [];
  const unavailable = [];
  for (const object of objects) {
    for (const key of ['locator_url', 'url', 'source_url', 'landing_url']) {
      if (typeof object[key] === 'string' && object[key]) locators.push(object[key]);
    }
    for (const key of ['content_sha256', 'sha256', 'content_hash', 'source_sha256']) {
      if (typeof object[key] === 'string' && object[key]) hashes.push(object[key]);
    }
    if (typeof object.status === 'string') statuses.push(object.status);
    if (typeof object.hash_status === 'string') hashStatuses.push(object.hash_status);
    if (typeof object.evidence_class === 'string') evidenceClasses.push(object.evidence_class);
    if (Array.isArray(object.unavailable_after_search)) unavailable.push(...object.unavailable_after_search);
  }
  return {
    definition_object_count: objects.length,
    locator_urls: uniqueSorted(locators),
    observed_content_hashes: uniqueSorted(hashes),
    statuses: uniqueSorted(statuses),
    hash_statuses: uniqueSorted(hashStatuses),
    evidence_classes: uniqueSorted(evidenceClasses),
    unavailable_after_search: uniqueSorted(unavailable)
  };
}

function classify(target, constituentTokens, metadata) {
  const compound = constituentTokens.length > 1;
  const coverage = metadata.evidence_classes.includes('coverage_source')
    || /^r-(?:roster|portfolio)-/.test(target);
  const explicitUnresolved = metadata.statuses.includes('receipt_unresolved')
    || metadata.unavailable_after_search.length > 0;
  const hashed = metadata.observed_content_hashes.length > 0
    || metadata.hash_statuses.includes('hashed');
  const located = metadata.locator_urls.length > 0;

  if (compound) {
    return {
      custody_classification: 'compound_reference_encoding_defect',
      availability_state: 'compound_scalar_reference',
      source_normalization_required: true,
      next_action: 'normalize_scalar_compound_reference_to_a_typed_receipt_token_array_without_changing_claim_semantics',
      disposition: 'adjudicated_repair_required'
    };
  }
  if (explicitUnresolved && !located && !hashed) {
    return {
      custody_classification: 'explicit_unresolved_custody',
      availability_state: 'explicitly_unavailable_after_search',
      source_normalization_required: false,
      next_action: 'preserve_unavailable_after_search_and_reacquire_bytes_only_when_a_public_capture_route_exists',
      disposition: 'adjudicated_unresolved_source'
    };
  }
  if (coverage && hashed) {
    return {
      custody_classification: 'coverage_hash_custody',
      availability_state: 'hash_pinned_coverage_source',
      source_normalization_required: false,
      next_action: 'retain_hash_pinned_coverage_definition_without_manufacturing_a_claim_attachment',
      disposition: 'adjudicated_retained_definition'
    };
  }
  if (coverage && located) {
    return {
      custody_classification: 'coverage_locator_only_custody',
      availability_state: 'locator_only_coverage_source',
      source_normalization_required: false,
      next_action: 'capture_source_bytes_or_preserve_locator_only_status_before_evidentiary_promotion',
      disposition: 'adjudicated_locator_only'
    };
  }
  if (hashed) {
    return {
      custody_classification: 'hash_pinned_custody',
      availability_state: 'hash_pinned',
      source_normalization_required: false,
      next_action: 'retain_hash_pinned_definition_and_link_it_only_when_a_source_record_explicitly_consumes_it',
      disposition: 'adjudicated_retained_definition'
    };
  }
  if (located) {
    return {
      custody_classification: 'locator_only_custody',
      availability_state: 'locator_only',
      source_normalization_required: false,
      next_action: 'capture_source_bytes_or_preserve_locator_only_status_before_evidentiary_promotion',
      disposition: 'adjudicated_locator_only'
    };
  }
  return {
    custody_classification: 'repository_definition_only',
    availability_state: 'repository_definition_without_external_locator',
    source_normalization_required: false,
    next_action: 'retain_repository_definition_and_add_external_custody_only_when_the_source_semantics_require_it',
    disposition: 'adjudicated_repository_only'
  };
}

const classificationCounts = new Map();
const availabilityCounts = new Map();
const definitionSourcePaths = new Set();

const decisions = unusedGaps.map(gap => {
  const constituentTokens = uniqueSorted(String(gap.receipt_id).split(';').map(value => value.trim()).filter(Boolean));
  const compound = constituentTokens.length > 1;
  const constituentDefinitions = constituentTokens.map(token => {
    const row = receiptById.get(token);
    return {
      receipt_token: token,
      defined: row?.defined === true,
      used: row?.used === true,
      definition_paths: uniqueSorted(row?.definition_paths ?? []),
      reference_paths: uniqueSorted(row?.reference_paths ?? [])
    };
  });
  if (compound) {
    assert.ok(constituentDefinitions.every(row => row.defined), `${gap.receipt_id}: compound constituent is not defined`);
  }

  const sourcePaths = uniqueSorted([
    ...(gap.definition_paths ?? []),
    ...constituentDefinitions.flatMap(row => row.definition_paths)
  ].filter(relative =>
    relative !== 'data/project/lake-identifier-topology-registry-wave-18.json'
    && !relative.startsWith('build/')
    && fs.existsSync(full(relative))
  ));
  for (const relative of sourcePaths) definitionSourcePaths.add(relative);

  const metadata = metadataFor(gap.receipt_id, constituentTokens, sourcePaths);
  const classification = classify(gap.receipt_id, constituentTokens, metadata);
  increment(classificationCounts, classification.custody_classification);
  increment(availabilityCounts, classification.availability_state);

  return {
    schema_version: 'lake-receipt-custody-decision-wave-20@1',
    program_id: policy.program_id,
    receipt_custody_decision_id: stableId('LAKEW20RECEIPT', [
      policy.program_id,
      gap.receipt_id,
      classification.custody_classification
    ]),
    target_receipt_token: gap.receipt_id,
    raw_gap_class: gap.gap_class,
    raw_unused_definition_preserved: true,
    definition_paths: uniqueSorted(gap.definition_paths ?? []),
    constituent_receipt_tokens: constituentTokens,
    constituent_definitions: constituentDefinitions,
    compound_reference: compound,
    custody_classification: classification.custody_classification,
    availability_state: classification.availability_state,
    definition_object_count: metadata.definition_object_count,
    locator_urls: metadata.locator_urls,
    observed_content_hashes: metadata.observed_content_hashes,
    statuses: metadata.statuses,
    hash_statuses: metadata.hash_statuses,
    evidence_classes: metadata.evidence_classes,
    unavailable_after_search: metadata.unavailable_after_search,
    source_normalization_required: classification.source_normalization_required,
    disposition: classification.disposition,
    next_action: classification.next_action,
    current_custody_action_open: false,
    consumer_attachment_created: false,
    source_claim_or_receipt_mutated: false,
    evidence_truth_determined: false,
    review_required_to_decide: false,
    correction_route: 'append_a_superseding_custody_decision_and_preserve_this_row',
    graph_effect: 'none'
  };
}).sort((left, right) => left.receipt_custody_decision_id.localeCompare(right.receipt_custody_decision_id));

assert.equal(decisions.length, policy.baseline.unused_receipt_definitions);
assert.equal(new Set(decisions.map(row => row.receipt_custody_decision_id)).size, decisions.length);
assert.equal(new Set(decisions.map(row => row.target_receipt_token)).size, decisions.length);
assert.ok(decisions.some(row => row.compound_reference), 'Wave 20 expected at least one compound receipt encoding defect');
assert.ok(decisions.every(row => row.review_required_to_decide === false));
assert.ok(decisions.every(row => row.graph_effect === 'none'));

const sourceDefinitionDigests = Object.fromEntries(
  [...definitionSourcePaths].sort((left, right) => left.localeCompare(right))
    .map(relative => [relative, fileDigest(relative)])
);
const graphDigests = {
  participation_sha256: digest(readJsonl('data/ledger/participation.jsonl')),
  active_claims_sha256: digest(readJson('build/axm-identity.json').claims),
  hop_edges_sha256: digest(readJson('build/hop-graph.json').edges),
  rejected_hop_surfaces_sha256: digest(readJson('build/hop-graph.json').rejected_hop_surfaces),
  rejected_hop_pairs_sha256: digest(readJson('build/hop-graph.json').rejected_hop_pairs)
};
const registrySha256 = digest(decisions);
const counts = {
  raw_unused_receipt_definitions: decisions.length,
  custody_decisions: decisions.length,
  compound_reference_encoding_defects: decisions.filter(row => row.compound_reference).length,
  compound_constituent_links: decisions.reduce((sum, row) => sum + (row.compound_reference ? row.constituent_receipt_tokens.length : 0), 0),
  source_normalizations_required: decisions.filter(row => row.source_normalization_required).length,
  definitions_with_observed_hashes: decisions.filter(row => row.observed_content_hashes.length > 0).length,
  definitions_with_locator_urls: decisions.filter(row => row.locator_urls.length > 0).length,
  explicit_unresolved_custody: decisions.filter(row => row.custody_classification === 'explicit_unresolved_custody').length,
  classification_counts: asObject(classificationCounts),
  availability_counts: asObject(availabilityCounts),
  raw_unused_receipt_definitions_after: decisions.length,
  unadjudicated_receipt_definitions_after: 0,
  consumer_attachments_created: 0,
  source_claim_or_receipt_mutations: 0,
  decisions_requiring_human_permission: 0,
  relationship_delta: 0,
  participation_delta: 0,
  active_claim_delta: 0,
  graph_edge_delta: 0
};

writeJsonl(policy.paths.registry, decisions);
writeCompactJson(policy.paths.projection, {
  schema_version: 'lake-receipt-custody-wave-20@1',
  program_id: policy.program_id,
  registry_sha256: registrySha256,
  counts,
  decisions: decisions.map(row => ({
    receipt_custody_decision_id: row.receipt_custody_decision_id,
    target_receipt_token: row.target_receipt_token,
    custody_classification: row.custody_classification,
    availability_state: row.availability_state,
    compound_reference: row.compound_reference,
    source_normalization_required: row.source_normalization_required,
    disposition: row.disposition,
    graph_effect: 'none'
  })),
  completion: {
    all_raw_unused_definitions_adjudicated: true,
    raw_unused_definition_count_forced_to_zero: false,
    review_required_to_decide: false,
    graph_effect: 'none'
  },
  boundaries: policy.boundaries
});
writeJson(policy.paths.receipt, {
  schema_version: 'lake-receipt-custody-wave-20-receipt@1',
  program_id: policy.program_id,
  registry_sha256: registrySha256,
  receipt_gap_sha256: digest(unusedGaps),
  receipt_index_sha256: digest(rawReceiptRows),
  source_definition_digests: sourceDefinitionDigests,
  graph_digests: graphDigests,
  counts,
  post_execution_reconciliation_complete: false,
  source_projection_index_complete: false,
  boundaries: policy.boundaries
});

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = readJson(lakePolicyPath);
for (const relative of [policyPath, policy.paths.registry, policy.paths.projection, policy.paths.receipt, policy.paths.reconciliation, policy.paths.report]) {
  if (!lakePolicy.authoritative_roots.includes(relative)) lakePolicy.authoritative_roots.push(relative);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));
for (const relative of ['.github/tmp/lake-receipt-custody-wave-20-trigger.json']) {
  if (!lakePolicy.excluded_paths.includes(relative)) lakePolicy.excluded_paths.push(relative);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));
Object.assign(lakePolicy.boundaries, {
  wave_20_receipt_adjudication_proves_source_truth: false,
  wave_20_locator_proves_byte_capture: false,
  wave_20_adjudication_attaches_receipt_to_claim: false,
  wave_20_raw_unused_definition_count_forced_to_zero: false,
  wave_20_graph_effect: 'none'
});
writeJson(lakePolicyPath, lakePolicy);

appendSection('BUILD-INSTRUCTIONS.md', '3.20 **Receipt and source custody', `3.20 **Receipt and source custody — Wave 20.**
Every raw unused receipt-definition row receives a source-preserving custody decision.
Compound scalar receipt tokens are classified as encoding defects only after every
constituent receipt is independently defined. Hash-pinned, locator-only, coverage,
explicitly unavailable, and repository-only custody remain distinct.

The raw unused-definition denominator remains visible. Adjudication does not attach a
receipt to a claim, invent source bytes, prove evidence truth, clear publication, create
a relationship or participation row, or alter the active graph.`);

appendSection('README.md', '## Receipt and source custody', `## Receipt and source custody

Wave 20 adjudicates the residual unused-receipt denominator without manufacturing
consumption. It separates compound reference-encoding defects from hash-pinned,
locator-only, coverage-source, explicitly unresolved, and repository-only custody.
Every decision is reversible and graph-inert; source claims and receipt definitions
remain byte-stable.`);

const packagePath = 'package.json';
const packageJson = readJson(packagePath);
const scriptName = 'validate:lake-receipt-custody-wave-20';
const scriptCommand = 'node tools/validate-lake-receipt-custody-wave-20.mjs && node test/lake-receipt-custody-wave-20.test.js';
packageJson.scripts[scriptName] = scriptCommand;
if (!packageJson.scripts.check.includes(`npm run ${scriptName}`)) {
  const anchor = ' && npm run validate:lake-generator-contracts-wave-19';
  assert.ok(packageJson.scripts.check.includes(anchor), 'Wave 19 release-gate anchor is missing');
  packageJson.scripts.check = packageJson.scripts.check.replace(anchor, `${anchor} && npm run ${scriptName}`);
}
writeJson(packagePath, packageJson);

const parserCeiling = Number(lakePolicy.max_text_bytes ?? 8_000_000);
for (const relative of [policy.paths.registry, policy.paths.projection, policy.paths.receipt]) {
  assert.ok(fs.statSync(full(relative)).size <= parserCeiling, `${relative}: exceeds parser ceiling`);
}

console.log('receipt custody Wave 20 source controls built');
console.log(`  raw / decisions / unadjudicated: ${decisions.length} / ${decisions.length} / 0`);
console.log(`  compound / normalization required: ${counts.compound_reference_encoding_defects} / ${counts.source_normalizations_required}`);
console.log(`  hashes / locators / explicit unresolved: ${counts.definitions_with_observed_hashes} / ${counts.definitions_with_locator_urls} / ${counts.explicit_unresolved_custody}`);
console.log('  source mutations / graph effects / human-permission dependencies: 0 / 0 / 0');
