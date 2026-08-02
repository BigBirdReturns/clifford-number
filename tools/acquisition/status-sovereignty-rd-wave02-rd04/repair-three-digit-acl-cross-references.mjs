#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

export const SEED = path.resolve(process.env.RD04_VERSION_ARTIFACT || '/tmp/rd04-version-seed');
export const V2 = path.resolve(process.env.RD04_CROSSREF_V2_ARTIFACT || '/tmp/rd04-crossref-v2');
export const OUTPUT = path.resolve(process.env.RD04_CROSSREF_V3_OUTPUT || '/tmp/rd04-crossref-v3');
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const normalizeLine = (value) => value.replace(/\s+/g, ' ').trim();

const EXPECTED_IDS = Object.freeze([
  'CA-ACL-20-145',
  'CA-ACL-21-101',
  'CA-ACL-21-101E',
  'CA-ACL-23-100',
  'CA-ACL-23-107'
]);
const EXPECTED = Object.freeze({
  supplementalOccurrences: 27,
  supplementalIds: 5,
  totalOccurrences: 687,
  totalIds: 159,
  seedAliases: 14,
  newCandidates: 145
});

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

function verifyInputs() {
  const seedManifest = readJson(path.join(SEED, 'manifest.json'));
  const seedSummary = readJson(path.join(SEED, 'summary.json'));
  ok(seedManifest.entries.length === 62, 'seed manifest entry count changed');
  for (const entry of seedManifest.entries) {
    const bytes = fs.readFileSync(path.join(SEED, entry.path));
    ok(bytes.length === entry.bytes, `${entry.path}: byte count changed`);
    ok(sha256(bytes) === entry.sha256, `${entry.path}: digest changed`);
  }
  const seedCombined = sha256(Buffer.from(
    seedManifest.entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''),
    'utf8'
  ));
  ok(seedCombined === 'b4f1eb8b79d5b564e5479b73df898e8ddb874b492171b84b401350eff4c26b92', 'seed manifest digest changed');
  ok(seedSummary.counts.resolved_sources === 13 && seedSummary.counts.unresolved_sources === 1, 'seed source accounting changed');

  const registryBytes = fs.readFileSync(path.join(V2, 'registry.json'));
  const deltaBytes = fs.readFileSync(path.join(V2, 'delta.json'));
  const receiptBytes = fs.readFileSync(path.join(V2, 'receipt.json'));
  ok(registryBytes.length === 612641 && sha256(registryBytes) === '77f4038e4663caf5ee639f58bb39f0ca120d88a93ae0d0b7a3ab98bd9319ba19', 'v2 registry changed');
  ok(deltaBytes.length === 5021 && sha256(deltaBytes) === 'f05043d6480cef9ba9b4b574dcf4026a79a9480ec50b7c7bfde8bfd9e6d312b0', 'v2 delta changed');
  ok(receiptBytes.length === 1203 && sha256(receiptBytes) === '9a8f9dce8a1101ce6915a57c47991518e5e6ac9bbdde3424867db7e128206390', 'v2 receipt changed');
  const v2 = JSON.parse(registryBytes.toString('utf8'));
  ok(v2.counts.reference_occurrences === 660 && v2.counts.unique_reference_ids === 154, 'v2 denominator changed');
  ok(v2.extraction_contract.grammar_version === 'rd04-version-cross-reference-grammar@2', 'v2 grammar changed');
  return { seedSummary, v2 };
}

function bodyToText(source, bodyPath, scratch) {
  const bytes = fs.readFileSync(bodyPath);
  if (source.expected_content_class === 'pdf') {
    const textPath = path.join(scratch, `${source.source_id}.txt`);
    const result = spawnSync('pdftotext', ['-layout', '-enc', 'UTF-8', bodyPath, textPath], { encoding: 'utf8' });
    ok(result.status === 0, `${source.source_id}: pdftotext failed: ${result.stderr || result.stdout}`);
    return fs.readFileSync(textPath, 'utf8');
  }
  let text = bytes.toString('utf8');
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<[^>]+>/g, '\n');
  return decodeEntities(text);
}

export function scanPage(page, sourceId, pageNumber) {
  const lines = page.split(/\r?\n/);
  let normalized = '';
  const spans = [];
  for (let index = 0; index < lines.length; index += 1) {
    const value = normalizeLine(lines[index]);
    if (!value) continue;
    if (normalized) normalized += ' ';
    const start = normalized.length;
    normalized += value;
    spans.push({ start, end: normalized.length, line: index + 1 });
  }
  const regex = /\b(?:ALL\s+COUNTY\s+LETTER(?:\s*\(ACL\))?\s*(?:NO\.?\s*)?|ACL\s*(?:NO\.?\s*)?)(\d{2}-\d{3}[A-Z]?)\b/gi;
  const rows = [];
  for (const match of normalized.matchAll(regex)) {
    const offset = match.index ?? 0;
    const line = (spans.find((span) => offset >= span.start && offset < span.end) || spans.at(-1) || { line: 1 }).line;
    const contextStart = Math.max(0, offset - 250);
    const contextEnd = Math.min(normalized.length, offset + match[0].length + 250);
    const context = normalized.slice(contextStart, contextEnd);
    rows.push({
      reference_id: `CA-ACL-${match[1].toUpperCase()}`,
      reference_class: 'california_all_county_letter',
      source_id: sourceId,
      page: pageNumber,
      line,
      matched_text: match[0],
      context,
      context_sha256: sha256(Buffer.from(context, 'utf8')),
      supplemental_grammar: 'three_digit_acl_sequence'
    });
  }
  return rows;
}

function scan(seedSummary) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'rd04-cross-v3-'));
  const rows = [];
  try {
    for (const source of seedSummary.sources) {
      if (!source.resolved) continue;
      const last = source.attempts.at(-1);
      const text = bodyToText(source, path.join(SEED, last.body_path), scratch);
      const pages = text.split('\f');
      for (let pageIndex = 0; pageIndex < pages.length; pageIndex += 1) {
        rows.push(...scanPage(pages[pageIndex], source.source_id, pageIndex + 1));
      }
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  return rows.sort((a, b) =>
    a.reference_id.localeCompare(b.reference_id) ||
    a.source_id.localeCompare(b.source_id) ||
    a.page - b.page ||
    a.line - b.line ||
    a.matched_text.localeCompare(b.matched_text)
  );
}

export function main() {
  const { seedSummary, v2 } = verifyInputs();
  const occurrences = scan(seedSummary);
  ok(occurrences.length === EXPECTED.supplementalOccurrences, `supplemental occurrence denominator ${occurrences.length}`);
  const grouped = new Map();
  for (const occurrence of occurrences) {
    const row = grouped.get(occurrence.reference_id) || {
      reference_id: occurrence.reference_id,
      reference_class: occurrence.reference_class,
      disposition: 'new_cross_reference_candidate',
      seed_source_ids: [],
      occurrence_count: 0,
      source_ids: new Set(),
      occurrences: []
    };
    row.occurrence_count += 1;
    row.source_ids.add(occurrence.source_id);
    row.occurrences.push(occurrence);
    grouped.set(occurrence.reference_id, row);
  }
  const supplemental = [...grouped.values()]
    .sort((a, b) => a.reference_id.localeCompare(b.reference_id))
    .map((row) => ({ ...row, source_ids: [...row.source_ids].sort() }));
  ok(supplemental.length === EXPECTED.supplementalIds, 'supplemental ID count changed');
  ok(JSON.stringify(supplemental.map((row) => row.reference_id)) === JSON.stringify(EXPECTED_IDS), 'supplemental ID identities changed');
  const v2Ids = new Set(v2.references.map((row) => row.reference_id));
  ok(supplemental.every((row) => !v2Ids.has(row.reference_id)), 'supplemental row already exists in v2');

  const references = [...v2.references, ...supplemental].sort((a, b) => a.reference_id.localeCompare(b.reference_id));
  const counts = {
    ...v2.counts,
    reference_occurrences: v2.counts.reference_occurrences + occurrences.length,
    unique_reference_ids: references.length,
    seed_alias_reference_ids: references.filter((row) => row.disposition === 'seed_alias').length,
    new_cross_reference_candidates: references.filter((row) => row.disposition === 'new_cross_reference_candidate').length,
    v2_reference_ids_preserved: v2.references.length,
    v3_reference_ids_added: supplemental.length,
    v2_reference_ids_removed: 0,
    version_edges_adjudicated: 0,
    class_closed: 0
  };
  ok(counts.reference_occurrences === EXPECTED.totalOccurrences, 'total occurrence denominator changed');
  ok(counts.unique_reference_ids === EXPECTED.totalIds, 'total reference denominator changed');
  ok(counts.seed_alias_reference_ids === EXPECTED.seedAliases, 'seed alias denominator changed');
  ok(counts.new_cross_reference_candidates === EXPECTED.newCandidates, 'candidate denominator changed');

  const registry = {
    ...v2,
    schema_version: 'ssc-rd-wave02-rd04-cross-reference-registry@3',
    extraction_contract: {
      ...v2.extraction_contract,
      grammar_version: 'rd04-version-cross-reference-grammar@3',
      supplemental_repairs: ['three_digit_acl_sequence_numbers'],
      v2_registry_immutable: true
    },
    references,
    counts,
    current_result: {
      ...v2.current_result,
      terminal_state: 'second_corrected_cross_reference_denominator_frozen_from_thirteen_exact_sources_one_seed_source_unresolved',
      cross_reference_candidate_derivation_complete_for_recovered_sources: true,
      full_source_cross_reference_universe_complete: false,
      version_edge_adjudication_complete: false,
      class_closed: false
    },
    boundaries: {
      ...v2.boundaries,
      one_hundred_fifty_nine_reference_ids_is_complete_class: false,
      three_digit_acl_reference_is_version_edge: false
    }
  };
  const delta = {
    schema_version: 'ssc-rd-wave02-rd04-cross-reference-v2-v3-delta@1',
    source_v2_registry_sha256: '77f4038e4663caf5ee639f58bb39f0ca120d88a93ae0d0b7a3ab98bd9319ba19',
    defect: {
      state: 'confirmed_underinclusive_identifier_grammar',
      cause: 'california_all_county_letter_pattern_limited_sequence_to_two_digits',
      repair: 'admit_exact_three_digit_acl_sequence_numbers_without_changing_other_grammar_classes'
    },
    counts: {
      v2_reference_ids: 154,
      v3_reference_ids: 159,
      v2_reference_ids_preserved: 154,
      v3_reference_ids_added: 5,
      v2_reference_ids_removed: 0,
      v2_occurrences: 660,
      v3_occurrences: 687,
      supplemental_occurrences: 27
    },
    added_reference_ids: EXPECTED_IDS,
    authority: {
      added_reference_is_version_edge: false,
      added_reference_is_controlling_authority: false,
      parser_repair_changes_reviewed_disposition: false,
      class_closed: false,
      graph_effect: 'none',
      publication_effect: 'none'
    }
  };

  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  writeJson(path.join(OUTPUT, 'registry.json'), registry);
  writeJson(path.join(OUTPUT, 'delta.json'), delta);
  const registryBytes = fs.readFileSync(path.join(OUTPUT, 'registry.json'));
  const deltaBytes = fs.readFileSync(path.join(OUTPUT, 'delta.json'));
  writeJson(path.join(OUTPUT, 'receipt.json'), {
    schema_version: 'ssc-rd-wave02-rd04-cross-reference-receipt@3',
    source_seed_artifact_id: 8838664098,
    source_v2_artifact_id: 8839456800,
    registry_path: 'registry.json',
    registry_bytes: registryBytes.length,
    registry_sha256: sha256(registryBytes),
    delta_path: 'delta.json',
    delta_bytes: deltaBytes.length,
    delta_sha256: sha256(deltaBytes),
    counts,
    terminal_state: registry.current_result.terminal_state,
    parser_repair_complete: true,
    class_closed: false,
    outside_human_dependency: false
  });
  console.log(`repair-three-digit-acl-cross-references: ${occurrences.length} supplemental occurrences, ${supplemental.length} IDs, ${references.length} total IDs`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try { main(); } catch (error) { console.error(error.stack || error.message); process.exit(1); }
}
