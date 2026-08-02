#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = path.resolve(process.env.RD04_REPOSITORY_ROOT || process.cwd());
const ARTIFACT = path.resolve(process.env.RD04_VERSION_ARTIFACT || '/tmp/rd04-version-seed');
const OUTPUT = path.resolve(process.env.RD04_CROSSREF_OUTPUT || '/tmp/rd04-crossref');
const RECEIPT_PATH = path.join(ROOT, 'data/intake/status-sovereignty-rd-wave02-rd04-version-history/seed-capture-receipt.json');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const normalizeLine = (value) => value.replace(/\s+/g, ' ').trim();

function verifyArtifact() {
  const manifest = readJson(path.join(ARTIFACT, 'manifest.json'));
  const summary = readJson(path.join(ARTIFACT, 'summary.json'));
  const receipt = readJson(RECEIPT_PATH);
  ok(receipt.execution.artifact_id === 8838664098, 'artifact ID changed');
  ok(receipt.execution.artifact_zip_sha256 === 'f99ef3ea3c06a0120ca46b84f0c71f110a5a5bb3600ff980c1d4182804796515', 'artifact ZIP digest changed');
  ok(manifest.entries.length === receipt.execution.artifact_manifest_entries, 'manifest entry count changed');
  for (const entry of manifest.entries) {
    const target = path.join(ARTIFACT, entry.path);
    const bytes = fs.readFileSync(target);
    ok(bytes.length === entry.bytes, `${entry.path}: byte count changed`);
    ok(sha256(bytes) === entry.sha256, `${entry.path}: digest changed`);
  }
  const combined = sha256(Buffer.from(manifest.entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''), 'utf8'));
  ok(combined === manifest.combined_sha256, 'artifact combined digest changed');
  ok(combined === receipt.execution.artifact_manifest_sha256, 'receipt manifest digest changed');
  ok(summary.counts.seed_sources === 14 && summary.counts.resolved_sources === 13 && summary.counts.unresolved_sources === 1, 'source accounting changed');
  ok(summary.sources.length === 14 && receipt.source_terminal_ledger.length === 14, 'source ledger denominator changed');
  for (let index = 0; index < 14; index += 1) {
    const source = summary.sources[index];
    const row = receipt.source_terminal_ledger[index];
    const last = source.attempts.at(-1);
    ok(source.source_id === row.source_id && source.ordinal === row.ordinal, `${source.source_id}: receipt order changed`);
    ok(source.terminal_state === row.terminal_state && source.attempts.length === row.attempts, `${source.source_id}: terminal receipt changed`);
    ok(last.http_status === row.http_status && last.body_bytes === row.body_bytes && last.body_sha256 === row.body_sha256, `${source.source_id}: terminal body changed`);
  }
  return { summary, receipt };
}

function decodeEntities(value) {
  return value
    .replace(/&nbsp;|&#160;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;|&#0*39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)));
}

function bodyToText(source, bodyPath, scratch) {
  const bytes = fs.readFileSync(bodyPath);
  if (source.expected_content_class === 'pdf') {
    const textPath = path.join(scratch, `${source.source_id}.txt`);
    const result = spawnSync('pdftotext', ['-layout', '-enc', 'UTF-8', bodyPath, textPath], { encoding: 'utf8' });
    ok(result.status === 0, `${source.source_id}: pdftotext failed: ${result.stderr || result.stdout}`);
    const text = fs.readFileSync(textPath, 'utf8');
    return { text, extraction: 'pdftotext_layout_utf8', text_sha256: sha256(Buffer.from(text, 'utf8')) };
  }
  let text = bytes.toString('utf8');
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<[^>]+>/g, '\n');
  text = decodeEntities(text);
  return { text, extraction: 'html_tag_strip_entity_decode_v1', text_sha256: sha256(Buffer.from(text, 'utf8')) };
}

const patterns = [
  {
    reference_class: 'california_all_county_letter',
    regex: /\b(?:ALL\s+COUNTY\s+LETTER\s*(?:\(|NO\.?\s*)?|ACL\s*(?:NO\.?\s*)?)(\d{2}-\d{2}[A-Z]?)\b/gi,
    normalize: (match) => `CA-ACL-${match[1].toUpperCase()}`
  },
  {
    reference_class: 'california_all_county_information_notice',
    regex: /\b(?:ALL\s+COUNTY\s+INFORMATION\s+NOTICE\s*(?:\(|NO\.?\s*)?|ACIN\s*(?:NO\.?\s*)?)(I-\d{2}-\d{2}[A-Z]?)\b/gi,
    normalize: (match) => `CA-ACIN-${match[1].toUpperCase()}`
  },
  {
    reference_class: 'public_law',
    regex: /\b(?:PUBLIC\s+LAW|P\.?\s*L\.?)\s*(119-21)\b/gi,
    normalize: (match) => `US-PL-${match[1]}`
  },
  {
    reference_class: 'house_bill',
    regex: /\bH\.?\s*R\.?\s*1\b|\bHOUSE\s+OF\s+REPRESENTATIVES\s+1\b/gi,
    normalize: () => 'US-HR-1-119'
  },
  {
    reference_class: 'cfr',
    regex: /\b(?:TITLE\s+7\s+(?:OF\s+THE\s+)?CODE\s+OF\s+FEDERAL\s+REGULATIONS\s*(?:\(|CFR\))?\s*|7\s+CFR\s+)(\d+(?:\.\d+)?(?:\s*\([a-z0-9ivx]+\))*)/gi,
    normalize: (match) => `7-CFR-${match[1].replace(/\s+/g, '').toLowerCase()}`
  },
  {
    reference_class: 'usc',
    regex: /\b(?:TITLE\s+7\s+(?:OF\s+THE\s+)?UNITED\s+STATES\s+CODE\s+SECTION\s+|7\s+U\.?S\.?C\.?\s+)(\d+(?:\([a-z0-9ivx]+\))*)/gi,
    normalize: (match) => `7-USC-${match[1].toLowerCase()}`
  },
  {
    reference_class: 'california_welfare_and_institutions_code',
    regex: /\b(?:WELFARE\s+AND\s+INSTITUTIONS\s+CODE\s*(?:\(|WIC\))?\s*SECTION\s+|WIC\s+(?:SECTION\s+)?)(\d+(?:\.\d+)?)/gi,
    normalize: (match) => `CA-WIC-${match[1]}`
  },
  {
    reference_class: 'california_abawd_handbook',
    regex: /\b(?:ABAWD\s+TIME\s+LIMIT\s+)?HANDBOOK\s+VERSION\s+([0-9]+\.[0-9]+)\b/gi,
    normalize: (match) => `CA-ABAWD-HANDBOOK-${match[1]}`
  },
  {
    reference_class: 'fns_handbook',
    regex: /\b(?:FOOD\s+AND\s+NUTRITION\s+SERVICE\s+)?HANDBOOK\s+310\b|\bSNAP\s+QUALITY\s+CONTROL\s+REVIEW\s+HANDBOOK\b/gi,
    normalize: () => 'USDA-FNS-HANDBOOK-310'
  },
  {
    reference_class: 'fiscal_responsibility_act_2023',
    regex: /\bFISCAL\s+RESPONSIBILITY\s+ACT\s+OF\s+2023\b|\bFRA\s+OF\s+2023\b/gi,
    normalize: () => 'US-FRA-2023'
  },
  {
    reference_class: 'fns_memo',
    regex: /\bTHE\s+SECRETARY[’']S\s+AUTHORITY\s+ON\s+ABLE-BODIED\s+ADULTS\s+WITHOUT\s+DEPENDENTS\s*\(ABAWD\)\s+WAIVERS\b/gi,
    normalize: () => 'USDA-FNS-MEMO-SECRETARY-ABAWD-WAIVERS'
  },
  {
    reference_class: 'fns_memo',
    regex: /\bUSE\s+OF\s+INFORMATION\s+RECEIVED\s+FROM\s+OTHER\s+PUBLIC\s+ASSISTANCE\s+PROGRAMS\b/gi,
    normalize: () => 'USDA-FNS-MEMO-OTHER-PUBLIC-ASSISTANCE-INFO'
  },
  {
    reference_class: 'statutory_section',
    regex: /\bSECTION\s+10102\s*(?:\(([a-z0-9]+)\))?/gi,
    normalize: (match) => `US-PL-119-21-SEC-10102${match[1] ? `-${match[1].toLowerCase()}` : ''}`
  }
];

const seedAliases = new Map([
  ['US-PL-119-21', ['FED-PL119-21']],
  ['US-HR-1-119', ['FED-PL119-21']],
  ['US-FRA-2023', ['FED-FRA-2023-FINAL-RULE']],
  ['CA-ACL-25-60', ['CA-ACL-25-60']],
  ['CA-ACL-25-64', ['CA-ACL-25-64']],
  ['CA-ACL-25-93', ['CA-ACL-25-93']],
  ['CA-ACL-25-93E', ['CA-ACL-25-93E']],
  ['CA-ACL-26-15', ['CA-ACL-26-15']],
  ['CA-ACL-26-26', ['CA-ACL-26-26']],
  ['CA-ACIN-I-14-26', ['CA-ACIN-I-14-26']],
  ['CA-ACL-26-29', ['CA-ACL-26-29']],
  ['CA-ACL-26-43', ['CA-ACL-26-43']],
  ['CA-ABAWD-HANDBOOK-3.0', ['CA-ACL-26-29']]
]);

function extractReferences(summary) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'rd04-crossref-'));
  const occurrences = [];
  const sourceExtractions = [];
  try {
    for (const source of summary.sources) {
      const last = source.attempts.at(-1);
      if (!source.resolved) {
        sourceExtractions.push({ source_id: source.source_id, state: 'source_unresolved_not_extracted', terminal_state: source.terminal_state });
        continue;
      }
      const bodyPath = path.join(ARTIFACT, last.body_path);
      const extracted = bodyToText(source, bodyPath, scratch);
      sourceExtractions.push({
        source_id: source.source_id,
        state: 'extracted',
        extraction: extracted.extraction,
        body_sha256: last.body_sha256,
        text_bytes: Buffer.byteLength(extracted.text),
        text_sha256: extracted.text_sha256
      });
      const pages = extracted.text.split('\f');
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        const lines = pages[pageIndex].split(/\r?\n/);
        for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
          const context = normalizeLine(lines[lineIndex]);
          if (!context) continue;
          for (const pattern of patterns) {
            pattern.regex.lastIndex = 0;
            for (const match of context.matchAll(pattern.regex)) {
              occurrences.push({
                reference_id: pattern.normalize(match),
                reference_class: pattern.reference_class,
                source_id: source.source_id,
                page: pageIndex + 1,
                line: lineIndex + 1,
                matched_text: match[0],
                context: context.slice(0, 500),
                context_sha256: sha256(Buffer.from(context.slice(0, 500), 'utf8'))
              });
            }
          }
        }
      }
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  return { occurrences, sourceExtractions };
}

function buildRegistry(occurrences) {
  const byId = new Map();
  for (const occurrence of occurrences) {
    const row = byId.get(occurrence.reference_id) || {
      reference_id: occurrence.reference_id,
      reference_class: occurrence.reference_class,
      disposition: seedAliases.has(occurrence.reference_id) ? 'seed_alias' : 'new_cross_reference_candidate',
      seed_source_ids: seedAliases.get(occurrence.reference_id) || [],
      occurrence_count: 0,
      source_ids: new Set(),
      occurrences: []
    };
    ok(row.reference_class === occurrence.reference_class, `${occurrence.reference_id}: reference class conflict`);
    row.occurrence_count += 1;
    row.source_ids.add(occurrence.source_id);
    row.occurrences.push(occurrence);
    byId.set(occurrence.reference_id, row);
  }
  return [...byId.values()].sort((a, b) => a.reference_id.localeCompare(b.reference_id)).map((row) => ({
    ...row,
    source_ids: [...row.source_ids].sort(),
    occurrences: row.occurrences.sort((a, b) => a.source_id.localeCompare(b.source_id) || a.page - b.page || a.line - b.line || a.matched_text.localeCompare(b.matched_text))
  }));
}

function main() {
  const { summary, receipt } = verifyArtifact();
  const { occurrences, sourceExtractions } = extractReferences(summary);
  const references = buildRegistry(occurrences);
  ok(occurrences.length === 485, `occurrence denominator ${occurrences.length} != 485`);
  ok(references.length === 103, `reference denominator ${references.length} != 103`);
  ok(sourceExtractions.filter((row) => row.state === 'extracted').length === 13, 'extracted-source denominator changed');
  ok(sourceExtractions.filter((row) => row.state !== 'extracted').map((row) => row.source_id).join(',') === 'FED-PL119-21', 'unresolved source identity changed');

  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  const registry = {
    schema_version: 'ssc-rd-wave02-rd04-cross-reference-registry@1',
    wave_id: 'SSC-RD-W02',
    lane_id: 'RD-04',
    class_id: 'RD-04-C01',
    issue: 789,
    as_of: '2026-08-02',
    source_custody: {
      seed_artifact_id: receipt.execution.artifact_id,
      seed_artifact_zip_sha256: receipt.execution.artifact_zip_sha256,
      seed_artifact_manifest_sha256: receipt.execution.artifact_manifest_sha256,
      seed_sources: 14,
      recovered_sources: 13,
      unresolved_sources: ['FED-PL119-21']
    },
    extraction_contract: {
      grammar_version: 'rd04-version-cross-reference-grammar@1',
      pdf_extraction: 'pdftotext -layout -enc UTF-8',
      html_extraction: 'script_style_remove_tag_strip_entity_decode_v1',
      pattern_classes: patterns.map((pattern) => pattern.reference_class),
      outcome_selected_patterns: false,
      titles_alone_create_version_edges: false
    },
    source_extractions: sourceExtractions,
    references,
    counts: {
      source_units: 14,
      source_units_extracted: 13,
      source_units_unresolved: 1,
      reference_occurrences: occurrences.length,
      unique_reference_ids: references.length,
      seed_alias_reference_ids: references.filter((row) => row.disposition === 'seed_alias').length,
      new_cross_reference_candidates: references.filter((row) => row.disposition === 'new_cross_reference_candidate').length,
      version_edges_adjudicated: 0,
      class_closed: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    unresolved_seed_source: {
      source_id: 'FED-PL119-21',
      state: 'http_403_after_two_bounded_attempts',
      official_alternative_locator_candidate: 'https://www.govinfo.gov/content/pkg/PLAW-119publ21/pdf/PLAW-119publ21.pdf',
      alternative_locator_selected_by_identity_rule: true,
      alternative_locator_fetched: false,
      source_failure_is_record_absence: false,
      source_failure_is_noncompliance: false
    },
    current_result: {
      terminal_state: 'cross_reference_candidates_derived_from_thirteen_exact_sources_one_seed_source_unresolved',
      cross_reference_candidate_derivation_complete_for_recovered_sources: true,
      full_source_cross_reference_universe_complete: false,
      version_edge_adjudication_complete: false,
      class_closed: false,
      outside_human_dependency: false,
      project_blocking: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    boundaries: {
      reference_occurrence_is_version_edge: false,
      source_title_is_supersession: false,
      seed_alias_is_controlling_authority: false,
      official_alternative_locator_is_fetched_source: false,
      unresolved_statute_page_is_missing_law: false,
      successful_source_extraction_is_implementation: false,
      one_hundred_three_reference_ids_is_complete_class: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
  writeJson(path.join(OUTPUT, 'registry.json'), registry);
  const registryBytes = fs.readFileSync(path.join(OUTPUT, 'registry.json'));
  writeJson(path.join(OUTPUT, 'receipt.json'), {
    schema_version: 'ssc-rd-wave02-rd04-cross-reference-receipt@1',
    source_artifact_id: receipt.execution.artifact_id,
    registry_path: 'registry.json',
    registry_bytes: registryBytes.length,
    registry_sha256: sha256(registryBytes),
    counts: registry.counts,
    terminal_state: registry.current_result.terminal_state,
    class_closed: false,
    outside_human_dependency: false
  });
  console.log(`derive-version-cross-references: ${occurrences.length} occurrences, ${references.length} references, ${registry.counts.new_cross_reference_candidates} new candidates`);
}

try {
  main();
} catch (error) {
  console.error(error.stack || error.message);
  process.exit(1);
}
