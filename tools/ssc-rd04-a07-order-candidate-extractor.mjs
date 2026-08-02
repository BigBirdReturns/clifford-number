#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const DEFAULT_ROOT = path.resolve(path.dirname(__filename), '..');
export const DEFAULT_RULES_PATH = path.join(
  DEFAULT_ROOT,
  'data/intake/status-sovereignty-rd04-calfresh-compliance-receipts-a07/candidate-extraction-rules.json'
);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const toPosix = (value) => value.split(path.sep).join('/');

function sameArray(actual, expected) {
  return Array.isArray(actual) && JSON.stringify(actual) === JSON.stringify(expected);
}

function sortedUnique(values) {
  return [...new Set((values ?? []).map((value) => String(value)))].sort((a, b) => a.localeCompare(b));
}

function walkFetchReceipts(directory) {
  if (!fs.existsSync(directory)) throw new Error(`source root does not exist: ${directory}`);
  const out = [];
  const queue = [directory];
  while (queue.length) {
    const current = queue.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const target = path.join(current, entry.name);
      if (entry.isSymbolicLink()) throw new Error(`symbolic link refused in source corpus: ${target}`);
      if (entry.isDirectory()) queue.push(target);
      else if (entry.isFile() && entry.name === 'fetch.json') out.push(target);
    }
  }
  return out.sort((a, b) => toPosix(path.relative(directory, a)).localeCompare(toPosix(path.relative(directory, b))));
}

function normalizeText(text, contract) {
  let normalized = String(text);
  if (contract.unicode_normalization !== 'NFKC') {
    throw new Error(`unsupported unicode normalization: ${contract.unicode_normalization}`);
  }
  normalized = normalized.normalize('NFKC');
  if (contract.line_endings !== 'LF') {
    throw new Error(`unsupported line-ending contract: ${contract.line_endings}`);
  }
  return normalized.replace(/\r\n?/g, '\n');
}

function lineIndex(text) {
  const starts = [0];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === '\n') starts.push(index + 1);
  }
  return starts;
}

function lineNumberAt(starts, offset) {
  let low = 0;
  let high = starts.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    if (starts[mid] <= offset) low = mid + 1;
    else high = mid - 1;
  }
  return high + 1;
}

function lineAt(text, starts, lineNumber) {
  const start = starts[lineNumber - 1] ?? 0;
  const next = starts[lineNumber];
  const end = next === undefined ? text.length : Math.max(start, next - 1);
  return text.slice(start, end);
}

function compilePattern(pattern) {
  try {
    const regex = new RegExp(pattern.regex, pattern.flags);
    if (!regex.global) throw new Error('global flag is required');
    if (!regex.unicode) throw new Error('unicode flag is required');
    return regex;
  } catch (error) {
    throw new Error(`invalid pattern ${pattern.pattern_id}: ${error.message}`);
  }
}

export function validateRules(rules) {
  const errors = [];
  const eq = (actual, expected, label) => {
    if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, observed ${JSON.stringify(actual)}`);
  };
  const check = (condition, label) => {
    if (!condition) errors.push(label);
  };

  eq(rules?.schema_version, 'ssc-rd04-a07-candidate-extraction-rules@1', 'rules schema');
  eq(rules?.execution_id, 'SSC-RD04-SNAP-A07', 'rules execution');
  eq(rules?.issue, 741, 'rules issue');
  eq(rules?.as_of, '2026-08-02', 'rules as-of');
  eq(rules?.dictionary_version, 'a07-order-candidate-v1', 'dictionary version');

  const population = rules?.population_contract ?? {};
  eq(population.parent_execution_id, 'SSC-RD04-SNAP-A06', 'population parent');
  eq(population.expected_documents, 11672, 'population documents');
  eq(population.expected_registry_rows, 12282, 'population registry rows');
  eq(population.processing_order, 'ascending_document_identity', 'processing order');
  eq(population.complete_population_required_before_follow_up, true, 'complete population gate');
  eq(population.negative_documents_preserved, true, 'negative document custody');

  const normalization = rules?.normalization_contract ?? {};
  eq(normalization.unicode_normalization, 'NFKC', 'unicode normalization');
  eq(normalization.line_endings, 'LF', 'line-ending normalization');
  eq(normalization.case_matching, 'unicode_case_insensitive', 'case matching');
  eq(normalization.offset_unit, 'utf16_code_units_in_normalized_text', 'offset unit');
  eq(normalization.source_text_sha256_required, true, 'source hash requirement');
  eq(normalization.source_text_bytes_required, true, 'source byte requirement');
  eq(normalization.normalization_changes_source_custody, false, 'source custody boundary');

  const boundaries = rules?.selection_boundaries ?? {};
  eq(boundaries.dictionary_frozen_before_parent_text_inspection, true, 'selection boundary dictionary_frozen_before_parent_text_inspection');
  for (const key of [
    'disposition_used_for_matching',
    'county_name_used_for_matching',
    'claimant_name_used_for_matching',
    'issue_code_used_for_matching',
    'amount_used_for_substantive_ranking',
    'candidate_count_used_for_substantive_ranking',
    'query_expansion_after_result_inspection',
    'rule_match_proves_ordered_relief',
    'rule_match_proves_implementation',
    'rule_match_proves_separate_compliance_receipt',
    'follow_up_selection_authorized_by_rule_match_alone'
  ]) eq(boundaries[key], false, `selection boundary ${key}`);

  const expectedCandidateFields = [
    'explicit_order_or_directed_action',
    'benefit_increase_or_decrease_language',
    'restoration_or_retroactive_benefit_language',
    'remand_or_rehearing_language',
    'compliance_report_language'
  ];
  const expectedSupportFields = ['stated_amount_if_any', 'stated_period_if_any'];
  const expectedMetadataFields = [
    'responsible_agency_or_county',
    'release_or_adoption_date',
    'shn_number',
    'registry_id',
    'decision_id'
  ];
  check(sameArray(rules?.candidate_fields, expectedCandidateFields), 'candidate field vocabulary');
  check(sameArray(rules?.support_fields, expectedSupportFields), 'support field vocabulary');
  check(sameArray(rules?.metadata_passthrough_fields, expectedMetadataFields), 'metadata passthrough vocabulary');

  const textRules = rules?.text_rules;
  check(Array.isArray(textRules) && textRules.length === 7, 'text-rule field denominator');
  const fieldIds = (textRules ?? []).map((row) => row.field_id);
  check(sameArray(fieldIds, [...expectedCandidateFields, ...expectedSupportFields]), 'text-rule field order');
  check(new Set(fieldIds).size === fieldIds.length, 'duplicate text-rule fields');
  const patternIds = [];
  for (const row of textRules ?? []) {
    eq(row.source, 'document_text', `rule source ${row.field_id}`);
    eq(row.candidate_signal, expectedCandidateFields.includes(row.field_id), `candidate signal ${row.field_id}`);
    check(Array.isArray(row.patterns) && row.patterns.length >= 2, `pattern denominator ${row.field_id}`);
    for (const pattern of row.patterns ?? []) {
      check(/^A07-[A-Z]{3}-\d{3}$/.test(pattern.pattern_id), `pattern identity ${pattern.pattern_id}`);
      eq(pattern.flags, 'giu', `pattern flags ${pattern.pattern_id}`);
      check(typeof pattern.regex === 'string' && pattern.regex.length >= 8, `pattern body ${pattern.pattern_id}`);
      patternIds.push(pattern.pattern_id);
      try {
        const compiled = compilePattern(pattern);
        const empty = ''.match(compiled);
        check(!empty, `zero-length pattern refused ${pattern.pattern_id}`);
      } catch (error) {
        errors.push(error.message);
      }
    }
  }
  check(patternIds.length === 19, 'pattern denominator');
  check(new Set(patternIds).size === patternIds.length, 'duplicate pattern identities');

  const serializedPatterns = JSON.stringify((textRules ?? []).flatMap((row) => row.patterns ?? [])).toLowerCase();
  for (const forbidden of [
    'grant', 'partial grant', 'denial', 'dismissal', 'stipulation',
    'los angeles', 'san diego', 'alameda', 'claimant_name', 'issue_code'
  ]) {
    check(!serializedPatterns.includes(forbidden), `forbidden selector token in patterns: ${forbidden}`);
  }

  const output = rules?.output_contract ?? {};
  eq(output.schema_version, 'ssc-rd04-a07-order-candidate-ledger@1', 'output schema');
  for (const key of [
    'preserve_every_document',
    'preserve_every_negative_field',
    'preserve_pattern_id',
    'preserve_match_text',
    'preserve_match_sha256',
    'preserve_normalized_offsets',
    'preserve_line_number',
    'preserve_line_sha256',
    'preserve_source_text_sha256',
    'preserve_source_text_bytes'
  ]) eq(output[key], true, `output custody ${key}`);
  eq(output.preserve_full_context_excerpt, false, 'context-excerpt boundary');
  eq(output.candidate_state_positive, 'content_neutral_rule_match', 'positive candidate state');
  eq(output.candidate_state_negative, 'no_predeclared_rule_match', 'negative candidate state');
  eq(output.follow_up_authorized, false, 'output follow-up authority');
  eq(output.implementation_observed, false, 'output implementation authority');
  eq(output.separate_public_compliance_receipt_observed, false, 'output compliance authority');

  const pilot = rules?.pilot_contract ?? {};
  eq(pilot.content_neutral_shard_allowed, true, 'pilot content-neutral shard');
  for (const key of [
    'pilot_results_are_population_complete',
    'pilot_results_authorize_follow_up',
    'pilot_results_authorize_rule_change'
  ]) eq(pilot[key], false, `pilot boundary ${key}`);
  eq(pilot.full_run_requires_all_64_parent_shards, true, 'full-run shard denominator');

  return errors;
}

export function loadRules(rulesPath = DEFAULT_RULES_PATH) {
  const bytes = fs.readFileSync(rulesPath);
  const rules = JSON.parse(bytes.toString('utf8'));
  const errors = validateRules(rules);
  if (errors.length) throw new Error(`invalid A07 extraction rules:\n${errors.map((error) => `- ${error}`).join('\n')}`);
  return { rules, bytes, sha256: sha256(bytes) };
}

function extractField(normalizedText, starts, rule) {
  const matches = [];
  for (const pattern of rule.patterns) {
    const regex = compilePattern(pattern);
    for (const match of normalizedText.matchAll(regex)) {
      const text = match[0];
      if (!text.length) throw new Error(`zero-length match from ${pattern.pattern_id}`);
      const start = match.index;
      const end = start + text.length;
      const lineNumber = lineNumberAt(starts, start);
      const line = lineAt(normalizedText, starts, lineNumber);
      matches.push({
        pattern_id: pattern.pattern_id,
        normalized_start: start,
        normalized_end: end,
        line_number: lineNumber,
        match_text: text,
        match_sha256: sha256(Buffer.from(text, 'utf8')),
        line_sha256: sha256(Buffer.from(line, 'utf8'))
      });
    }
  }
  matches.sort((a, b) =>
    a.normalized_start - b.normalized_start
    || a.normalized_end - b.normalized_end
    || a.pattern_id.localeCompare(b.pattern_id)
  );
  return {
    matched: matches.length > 0,
    match_count: matches.length,
    matches
  };
}

function readDocument(sourceRoot, fetchPath, rules) {
  const receipt = JSON.parse(fs.readFileSync(fetchPath, 'utf8'));
  if (receipt.terminal_state !== 'exact_pdf_and_text_recovered') {
    throw new Error(`document lacks exact extracted text: ${receipt.document_identity ?? fetchPath}`);
  }
  if (!receipt.document_identity || !receipt.extracted_text_path) {
    throw new Error(`incomplete fetch receipt: ${fetchPath}`);
  }
  const documentDirectory = path.dirname(fetchPath);
  const textPath = path.resolve(documentDirectory, receipt.extracted_text_path);
  const relativeToDocument = path.relative(documentDirectory, textPath);
  if (relativeToDocument.startsWith('..') || path.isAbsolute(relativeToDocument)) {
    throw new Error(`text path escapes document directory: ${fetchPath}`);
  }
  const textBytes = fs.readFileSync(textPath);
  const observedTextSha = sha256(textBytes);
  if (observedTextSha !== receipt.extracted_text_sha256) {
    throw new Error(`source text hash mismatch ${receipt.document_identity}`);
  }
  if (textBytes.length !== receipt.extracted_text_bytes) {
    throw new Error(`source text byte mismatch ${receipt.document_identity}`);
  }
  const rawText = textBytes.toString('utf8');
  const normalizedText = normalizeText(rawText, rules.normalization_contract);
  const starts = lineIndex(normalizedText);
  const fields = {};
  const candidateFieldMatches = [];
  const supportFieldMatches = [];
  for (const rule of rules.text_rules) {
    const result = extractField(normalizedText, starts, rule);
    fields[rule.field_id] = result;
    if (result.matched) {
      if (rule.candidate_signal) candidateFieldMatches.push(rule.field_id);
      else supportFieldMatches.push(rule.field_id);
    }
  }

  const fingerprintMaterial = rules.text_rules.map((rule) => ({
    field_id: rule.field_id,
    matches: fields[rule.field_id].matches.map((match) => ({
      pattern_id: match.pattern_id,
      normalized_start: match.normalized_start,
      normalized_end: match.normalized_end,
      line_number: match.line_number,
      match_text: match.match_text,
      match_sha256: match.match_sha256,
      line_sha256: match.line_sha256
    }))
  }));

  const positive = candidateFieldMatches.length > 0;
  return {
    document_identity: receipt.document_identity,
    document_identity_sha256: receipt.document_identity_sha256 ?? sha256(Buffer.from(receipt.document_identity, 'utf8')),
    decision_id: receipt.decision_id ?? null,
    registry_ids: sortedUnique(receipt.registry_ids),
    registry_row_count: Number(receipt.registry_row_count ?? (receipt.registry_ids ?? []).length),
    metadata_passthrough: {
      responsible_agency_or_county: sortedUnique(receipt.responsible_agencies),
      release_or_adoption_date: [],
      shn_number: [],
      registry_id: sortedUnique(receipt.registry_ids),
      decision_id: receipt.decision_id ? [String(receipt.decision_id)] : []
    },
    source_receipt_path: toPosix(path.relative(sourceRoot, fetchPath)),
    source_text_path: toPosix(path.relative(sourceRoot, textPath)),
    source_text_bytes: textBytes.length,
    source_text_sha256: observedTextSha,
    normalized_text_bytes: Buffer.byteLength(normalizedText, 'utf8'),
    normalized_text_sha256: sha256(Buffer.from(normalizedText, 'utf8')),
    candidate_state: positive
      ? rules.output_contract.candidate_state_positive
      : rules.output_contract.candidate_state_negative,
    candidate_signal_fields: candidateFieldMatches,
    support_match_fields: supportFieldMatches,
    fields,
    rule_match_fingerprint: sha256(Buffer.from(JSON.stringify(fingerprintMaterial), 'utf8')),
    follow_up_authorized: false,
    ordered_relief_observed: false,
    implementation_observed: false,
    separate_public_compliance_receipt_observed: false,
    complete_restoration_observed: false,
    remedy_timeliness_observed: false
  };
}

export function extractCorpus({
  sourceRoot,
  rulesPath = DEFAULT_RULES_PATH,
  mode = 'full',
  expectedDocuments = null,
  outputPath = null
}) {
  if (!sourceRoot) throw new Error('sourceRoot is required');
  if (!['full', 'pilot', 'test'].includes(mode)) throw new Error(`unsupported extraction mode: ${mode}`);
  const loaded = loadRules(rulesPath);
  const { rules } = loaded;
  const fetchPaths = walkFetchReceipts(sourceRoot);
  const expected = expectedDocuments ?? (
    mode === 'full' ? rules.population_contract.expected_documents : fetchPaths.length
  );
  if (!Number.isInteger(expected) || expected < 1) throw new Error(`invalid expected document count: ${expected}`);
  if (fetchPaths.length !== expected) {
    throw new Error(`document denominator mismatch: expected ${expected}, observed ${fetchPaths.length}`);
  }
  if (mode === 'full' && expected !== rules.population_contract.expected_documents) {
    throw new Error(`full extraction requires ${rules.population_contract.expected_documents} documents`);
  }

  const documents = fetchPaths.map((fetchPath) => readDocument(sourceRoot, fetchPath, rules));
  documents.sort((a, b) => a.document_identity.localeCompare(b.document_identity));
  const identities = documents.map((document) => document.document_identity);
  if (new Set(identities).size !== identities.length) throw new Error('duplicate document identity in extraction population');

  const fieldMatchCounts = Object.fromEntries(rules.text_rules.map((rule) => [rule.field_id, 0]));
  const patternMatchCounts = {};
  for (const rule of rules.text_rules) {
    for (const pattern of rule.patterns) patternMatchCounts[pattern.pattern_id] = 0;
  }
  let totalMatches = 0;
  let candidateDocuments = 0;
  let supportOnlyDocuments = 0;
  let negativeDocuments = 0;
  let registryRows = 0;
  for (const document of documents) {
    registryRows += document.registry_row_count;
    if (document.candidate_state === rules.output_contract.candidate_state_positive) candidateDocuments += 1;
    else {
      negativeDocuments += 1;
      if (document.support_match_fields.length) supportOnlyDocuments += 1;
    }
    for (const [fieldId, result] of Object.entries(document.fields)) {
      fieldMatchCounts[fieldId] += result.match_count;
      totalMatches += result.match_count;
      for (const match of result.matches) patternMatchCounts[match.pattern_id] += 1;
    }
  }

  const populationComplete = mode === 'full'
    && documents.length === rules.population_contract.expected_documents
    && registryRows === rules.population_contract.expected_registry_rows;

  const ledger = {
    schema_version: rules.output_contract.schema_version,
    execution_id: rules.execution_id,
    issue: rules.issue,
    as_of: rules.as_of,
    extraction_mode: mode,
    rules: {
      repository_path: toPosix(path.relative(DEFAULT_ROOT, rulesPath)),
      schema_version: rules.schema_version,
      dictionary_version: rules.dictionary_version,
      exact_bytes: loaded.bytes.length,
      sha256: loaded.sha256,
      pattern_count: Object.keys(patternMatchCounts).length
    },
    population: {
      expected_documents: mode === 'full' ? rules.population_contract.expected_documents : expected,
      documents_processed: documents.length,
      registry_rows_represented: registryRows,
      population_complete: populationComplete,
      processing_order: rules.population_contract.processing_order,
      negative_documents_preserved: true
    },
    counts: {
      candidate_documents: candidateDocuments,
      support_only_documents: supportOnlyDocuments,
      negative_documents: negativeDocuments,
      total_matches: totalMatches,
      field_match_counts: fieldMatchCounts,
      pattern_match_counts: patternMatchCounts
    },
    documents,
    authority: {
      follow_up_selection_authorized: false,
      ordered_relief_observed: false,
      implementation_observed: false,
      separate_public_compliance_receipt_observed: false,
      complete_restoration_observed: false,
      remedy_timeliness_observed: false,
      prevalence_supported: false,
      racial_order_supported: false,
      coordination_supported: false,
      common_purpose_supported: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: {
      rule_match_is_candidate_only: true,
      disposition_used_for_matching: false,
      county_name_used_for_matching: false,
      claimant_name_used_for_matching: false,
      issue_code_used_for_matching: false,
      amount_used_for_substantive_ranking: false,
      negative_documents_discarded: false,
      pilot_authorizes_rule_change: false,
      absence_of_match_is_absence_of_relief: false
    }
  };

  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, stable(ledger));
  }
  return ledger;
}

function parseCli(argv) {
  const command = argv[0] ?? 'help';
  const options = {};
  for (let index = 1; index < argv.length; index += 1) {
    const token = argv[index];
    if (!token.startsWith('--')) throw new Error(`unexpected argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--')) throw new Error(`missing value for --${key}`);
    options[key] = value;
    index += 1;
  }
  return { command, options };
}

function main() {
  const { command, options } = parseCli(process.argv.slice(2));
  if (command === 'validate-rules') {
    const loaded = loadRules(options.rules ? path.resolve(options.rules) : DEFAULT_RULES_PATH);
    console.log(JSON.stringify({
      rules: loaded.rules.dictionary_version,
      patterns: loaded.rules.text_rules.reduce((sum, row) => sum + row.patterns.length, 0),
      sha256: loaded.sha256
    }, null, 2));
    return;
  }
  if (command === 'extract') {
    if (!options.source || !options.output) {
      throw new Error('extract requires --source and --output');
    }
    const ledger = extractCorpus({
      sourceRoot: path.resolve(options.source),
      rulesPath: options.rules ? path.resolve(options.rules) : DEFAULT_RULES_PATH,
      mode: options.mode ?? 'full',
      expectedDocuments: options.expected ? Number(options.expected) : null,
      outputPath: path.resolve(options.output)
    });
    console.log(JSON.stringify({
      mode: ledger.extraction_mode,
      documents: ledger.population.documents_processed,
      registry_rows: ledger.population.registry_rows_represented,
      candidates: ledger.counts.candidate_documents,
      negatives: ledger.counts.negative_documents,
      matches: ledger.counts.total_matches,
      population_complete: ledger.population.population_complete
    }, null, 2));
    return;
  }
  console.error('usage:');
  console.error('  node tools/ssc-rd04-a07-order-candidate-extractor.mjs validate-rules [--rules PATH]');
  console.error('  node tools/ssc-rd04-a07-order-candidate-extractor.mjs extract --source DIR --output FILE [--rules PATH] [--mode full|pilot|test] [--expected N]');
  process.exit(command === 'help' ? 0 : 1);
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === __filename;
if (invoked) {
  try {
    main();
  } catch (error) {
    console.error(`ssc-rd04-a07-order-candidate-extractor: ${error.message}`);
    process.exit(1);
  }
}
