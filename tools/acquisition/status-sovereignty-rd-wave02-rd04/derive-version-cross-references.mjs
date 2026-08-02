#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(process.env.RD04_REPOSITORY_ROOT || process.cwd());
export const ARTIFACT = path.resolve(process.env.RD04_VERSION_ARTIFACT || '/tmp/rd04-version-seed');
export const V1_ARTIFACT = path.resolve(process.env.RD04_CROSSREF_V1_ARTIFACT || '/tmp/rd04-crossref-v1');
export const OUTPUT = path.resolve(process.env.RD04_CROSSREF_OUTPUT || '/tmp/rd04-crossref-v2');
export const RECEIPT_PATH = path.join(
  ROOT,
  'data/intake/status-sovereignty-rd-wave02-rd04-version-history/seed-capture-receipt.json'
);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const normalizeLine = (value) => value.replace(/\s+/g, ' ').trim();
const stripReferenceWhitespace = (value) => value
  .replace(/\s+/g, '')
  .replace(/[—–]/g, '-')
  .toLowerCase();

const EXPECTED = Object.freeze({
  occurrences: 660,
  references: 154,
  seedAliases: 14,
  newCandidates: 140,
  v1References: 103,
  v1Occurrences: 485,
  v1Preserved: 101,
  v1Superseded: 2,
  v2Added: 53
});

const V1_SUPERSEDED = Object.freeze({
  '7-CFR-273.24(b)': ['7-CFR-273.24(b)(2)'],
  'CA-WIC-11403': [
    'CA-WIC-11403(b)',
    'CA-WIC-11403(b)(4)',
    'CA-WIC-11403(b)(5)'
  ]
});

const REQUIRED_V2_IDS = Object.freeze([
  '25-USC-1603(13)',
  '25-USC-1603(18)',
  '25-USC-1679(a)',
  '45-CFR-164.502(a)(5)',
  '7-CFR-273.1',
  '7-CFR-273.2(f)(1)(xiv)(a)',
  '7-CFR-273.24(b)(2)',
  'CA-AB-12',
  'CA-ACL-15-08',
  'CA-HSC-123110(d)(1)',
  'CA-HSC-1231110(d)(1)',
  'CA-MPP-21-115',
  'CA-MPP-21-115.2',
  'CA-MPP-42-701.2(d)(3)-(5)',
  'CA-MPP-63-407',
  'CA-MPP-63-503.442',
  'CA-SB-1050',
  'CA-WIC-11403(b)(4)',
  'CA-WIC-18910.1',
  'US-FNA-2008-SEC-6(o)',
  'US-FRA-2023-SEC-311-312',
  'US-OBBBA-2025',
  'US-TRADE-ACT-1974-SEC-236',
  'USDA-FNS-MEMO-SECRETARY-ABAWD-WAIVERS'
]);

function verifyArtifact() {
  const manifest = readJson(path.join(ARTIFACT, 'manifest.json'));
  const summary = readJson(path.join(ARTIFACT, 'summary.json'));
  const receipt = readJson(RECEIPT_PATH);
  ok(receipt.execution.artifact_id === 8838664098, 'artifact ID changed');
  ok(
    receipt.execution.artifact_zip_sha256 ===
      'f99ef3ea3c06a0120ca46b84f0c71f110a5a5bb3600ff980c1d4182804796515',
    'artifact ZIP digest changed'
  );
  ok(manifest.entries.length === receipt.execution.artifact_manifest_entries, 'manifest entry count changed');
  for (const entry of manifest.entries) {
    const target = path.join(ARTIFACT, entry.path);
    const bytes = fs.readFileSync(target);
    ok(bytes.length === entry.bytes, `${entry.path}: byte count changed`);
    ok(sha256(bytes) === entry.sha256, `${entry.path}: digest changed`);
  }
  const combined = sha256(Buffer.from(
    manifest.entries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''),
    'utf8'
  ));
  ok(combined === manifest.combined_sha256, 'artifact combined digest changed');
  ok(combined === receipt.execution.artifact_manifest_sha256, 'receipt manifest digest changed');
  ok(
    summary.counts.seed_sources === 14 &&
      summary.counts.resolved_sources === 13 &&
      summary.counts.unresolved_sources === 1,
    'source accounting changed'
  );
  ok(summary.sources.length === 14 && receipt.source_terminal_ledger.length === 14, 'source ledger denominator changed');
  for (let index = 0; index < 14; index += 1) {
    const source = summary.sources[index];
    const row = receipt.source_terminal_ledger[index];
    const last = source.attempts.at(-1);
    ok(source.source_id === row.source_id && source.ordinal === row.ordinal, `${source.source_id}: receipt order changed`);
    ok(
      source.terminal_state === row.terminal_state && source.attempts.length === row.attempts,
      `${source.source_id}: terminal receipt changed`
    );
    ok(
      last.http_status === row.http_status &&
        last.body_bytes === row.body_bytes &&
        last.body_sha256 === row.body_sha256,
      `${source.source_id}: terminal body changed`
    );
  }
  return { summary, receipt };
}

function verifyV1Artifact() {
  const registryPath = path.join(V1_ARTIFACT, 'registry.json');
  const receiptPath = path.join(V1_ARTIFACT, 'receipt.json');
  ok(fs.existsSync(registryPath) && fs.existsSync(receiptPath), 'v1 cross-reference artifact missing');
  const registryBytes = fs.readFileSync(registryPath);
  ok(registryBytes.length === 245561, 'v1 registry byte count changed');
  ok(
    sha256(registryBytes) === '1f820604ad6f2a8fa383ce30eebe7bd1326ec433fc2153e9737cc846233260f7',
    'v1 registry digest changed'
  );
  const registry = JSON.parse(registryBytes.toString('utf8'));
  const receipt = readJson(receiptPath);
  ok(registry.extraction_contract?.grammar_version === 'rd04-version-cross-reference-grammar@1', 'v1 grammar changed');
  ok(
    receipt.counts?.reference_occurrences === EXPECTED.v1Occurrences &&
      receipt.counts?.unique_reference_ids === EXPECTED.v1References,
    'v1 denominator changed'
  );
  ok(registry.references?.length === EXPECTED.v1References, 'v1 registry row count changed');
  return { registry, receipt };
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
    const result = spawnSync(
      'pdftotext',
      ['-layout', '-enc', 'UTF-8', bodyPath, textPath],
      { encoding: 'utf8' }
    );
    ok(result.status === 0, `${source.source_id}: pdftotext failed: ${result.stderr || result.stdout}`);
    const text = fs.readFileSync(textPath, 'utf8');
    return {
      text,
      extraction: 'pdftotext_layout_utf8',
      text_sha256: sha256(Buffer.from(text, 'utf8'))
    };
  }
  let text = bytes.toString('utf8');
  text = text.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ');
  text = text.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ');
  text = text.replace(/<[^>]+>/g, '\n');
  text = decodeEntities(text);
  return {
    text,
    extraction: 'html_tag_strip_entity_decode_v1',
    text_sha256: sha256(Buffer.from(text, 'utf8'))
  };
}

export const patterns = Object.freeze([
  {
    reference_class: 'california_all_county_letter',
    regex: /\b(?:ALL\s+COUNTY\s+LETTER(?:\s*\(ACL\))?\s*(?:NO\.?\s*)?|ACL\s*(?:NO\.?\s*)?)(\d{2}-\d{2}[A-Z]?)\b/gi,
    normalize: (match) => `CA-ACL-${match[1].toUpperCase()}`
  },
  {
    reference_class: 'california_all_county_information_notice',
    regex: /\b(?:ALL\s+COUNTY\s+INFORMATION\s+NOTICE(?:\s*\(ACIN\))?\s*(?:NO\.?\s*)?|ACIN\s*(?:NO\.?\s*)?)(I-\d{2}-\d{2}[A-Z]?)\b/gi,
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
    regex: /\b(?:(?:TITLE\s+)?(\d+)\s+(?:OF\s+THE\s+)?CODE\s+OF\s+FEDERAL\s+REGULATIONS(?:\s*\(CFR\))?(?:\s+(?:SECTION|PART))?\s*|(?:TITLE\s+)?(\d+)\s+CFR\s+)(\d+(?:\.\d+)?(?:\s*\([a-z0-9ivx]+\))*)/gi,
    normalize: (match) => `${match[1] || match[2]}-CFR-${stripReferenceWhitespace(match[3])}`
  },
  {
    reference_class: 'usc',
    regex: /\b(?:(?:TITLE\s+)?(\d+)\s+(?:OF\s+THE\s+)?UNITED\s+STATES\s+CODE(?:\s+SECTION)?\s+|(\d+)\s+U\.?\s*S\.?\s*C\.?\s*)(\d+(?:\.\d+)?(?:\s*\([a-z0-9ivx]+\))*)/gi,
    normalize: (match) => `${match[1] || match[2]}-USC-${stripReferenceWhitespace(match[3])}`
  },
  {
    reference_class: 'california_welfare_and_institutions_code',
    regex: /\b(?:WELFARE\s+AND\s+INSTITUTIONS\s+CODE(?:\s*\(WIC\))?\s*(?:SECTION\s+)?|WIC\s+(?:SECTION\s+)?)(\d+(?:\.\d+)?(?:\s*\([a-z0-9ivx]+\))*)/gi,
    normalize: (match) => `CA-WIC-${stripReferenceWhitespace(match[1])}`
  },
  {
    reference_class: 'california_health_and_safety_code',
    regex: /\b(?:HEALTH\s+AND\s+SA(?:FETY|FTEY)\s+CODE(?:\s*\(HSC\))?\s*(?:SECTION\s+)?|HSC\s+(?:SECTION\s+)?)(\d+(?:\.\d+)?(?:\s*\([a-z0-9ivx]+\))*)/gi,
    normalize: (match) => `CA-HSC-${stripReferenceWhitespace(match[1])}`
  },
  {
    reference_class: 'california_manual_of_policies_and_procedures',
    regex: /\b(?:MANUAL\s+OF\s+POLIC(?:Y|IES)\s+AND\s+PROCEDURES\s*\(MPP\)\s*|MPP\s*)(?:SECTION(?:S)?|§)\s*(\d{2}\s*-\s*\d{3}(?:\.\d+)?(?:\s*\([a-z0-9ivx]+\))*(?:\s*[—–-]\s*\([a-z0-9ivx]+\))?)/gi,
    normalize: (match) => `CA-MPP-${stripReferenceWhitespace(match[1])}`
  },
  {
    reference_class: 'california_assembly_bill',
    regex: /\b(?:ASSEMBLY\s+BILL\s*\(AB\)|AB)\s+(\d+)\b/gi,
    normalize: (match) => `CA-AB-${match[1]}`
  },
  {
    reference_class: 'california_senate_bill',
    regex: /\b(?:SENATE\s+BILL\s*\(SB\)|SB)\s+(\d+)\b/gi,
    normalize: (match) => `CA-SB-${match[1]}`
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
    regex: /\bFISCAL\s+RESPONSIBILITY\s+ACT\s+(?:\(FRA\)\s+)?OF\s+2023\b|\bFRA\s+OF\s+2023\b/gi,
    normalize: () => 'US-FRA-2023'
  },
  {
    reference_class: 'one_big_beautiful_bill_act_2025',
    regex: /\bONE\s+BIG\s+BEAUTIFUL\s+BILL\s+ACT\s+OF\s+2025\b/gi,
    normalize: () => 'US-OBBBA-2025'
  },
  {
    reference_class: 'food_and_nutrition_act_2008',
    regex: /\bFOOD\s+AND\s+NUTRITION\s+ACT\s+OF\s+2008\b/gi,
    normalize: () => 'US-FNA-2008'
  },
  {
    reference_class: 'trade_act_1974',
    regex: /\bTRADE\s+ACT(?:\s+OF\s+1974)?\b/gi,
    normalize: () => 'US-TRADE-ACT-1974'
  },
  {
    reference_class: 'prwora_1996',
    regex: /\bPERSONAL\s+RESPONSIBILITY\s+AND\s+WORK\s+OPPORTUNITY\s+RECONCILIATION\s+ACT\s+OF\s+1996\b|\bPRWORA\b/gi,
    normalize: () => 'US-PRWORA-1996'
  },
  {
    reference_class: 'indian_health_care_improvement_act',
    regex: /\bINDIAN\s+HEALTH\s+CARE\s+IMPROVEMENT\s+ACT\b/gi,
    normalize: () => 'US-IHCIA'
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
  },
  {
    reference_class: 'statutory_section',
    regex: /\bSECTIONS?\s+311\s*[—–-]\s*312\s+OF\s+THE\s+FISCAL\s+RESPONSIBILITY\s+ACT\s+OF\s+2023\b/gi,
    normalize: () => 'US-FRA-2023-SEC-311-312'
  },
  {
    reference_class: 'statutory_section',
    regex: /\bSECTION\s+6\s*\(\s*o\s*\)\s+OF\s+THE\s+FOOD\s+AND\s+NUTRITION\s+ACT\s+OF\s+2008\b/gi,
    normalize: () => 'US-FNA-2008-SEC-6(o)'
  },
  {
    reference_class: 'statutory_section',
    regex: /\bSECTION\s+236\s+OF\s+THE\s+TRADE\s+ACT(?:\s+OF\s+1974)?\b/gi,
    normalize: () => 'US-TRADE-ACT-1974-SEC-236'
  }
]);

const seedAliases = new Map([
  ['US-PL-119-21', ['FED-PL119-21']],
  ['US-HR-1-119', ['FED-PL119-21']],
  ['US-OBBBA-2025', ['FED-PL119-21']],
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

export function normalizePage(page) {
  const lineStarts = [];
  let text = '';
  const lines = page.split(/\r?\n/);
  for (let index = 0; index < lines.length; index += 1) {
    const normalized = normalizeLine(lines[index]);
    if (!normalized) continue;
    if (text) text += ' ';
    lineStarts.push({ offset: text.length, line: index + 1 });
    text += normalized;
  }
  return { text, lineStarts };
}

function lineForOffset(lineStarts, offset) {
  let line = 1;
  for (const entry of lineStarts) {
    if (entry.offset > offset) break;
    line = entry.line;
  }
  return line;
}

export function extractPageReferences(page, sourceId = 'synthetic', pageNumber = 1) {
  const normalized = normalizePage(page);
  const occurrences = [];
  for (const pattern of patterns) {
    pattern.regex.lastIndex = 0;
    for (const match of normalized.text.matchAll(pattern.regex)) {
      const contextStart = Math.max(0, match.index - 180);
      const contextEnd = Math.min(normalized.text.length, match.index + match[0].length + 320);
      const context = normalized.text.slice(contextStart, contextEnd);
      occurrences.push({
        reference_id: pattern.normalize(match),
        reference_class: pattern.reference_class,
        source_id: sourceId,
        page: pageNumber,
        line: lineForOffset(normalized.lineStarts, match.index),
        matched_text: match[0],
        context,
        context_sha256: sha256(Buffer.from(context, 'utf8'))
      });
    }
  }
  return occurrences;
}

function extractReferences(summary) {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'rd04-crossref-v2-'));
  const occurrences = [];
  const sourceExtractions = [];
  try {
    for (const source of summary.sources) {
      const last = source.attempts.at(-1);
      if (!source.resolved) {
        sourceExtractions.push({
          source_id: source.source_id,
          state: 'source_unresolved_not_extracted',
          terminal_state: source.terminal_state
        });
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
        occurrences.push(...extractPageReferences(pages[pageIndex], source.source_id, pageIndex + 1));
      }
    }
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
  return { occurrences, sourceExtractions };
}

export function buildRegistry(occurrences) {
  const byId = new Map();
  for (const occurrence of occurrences) {
    const row = byId.get(occurrence.reference_id) || {
      reference_id: occurrence.reference_id,
      reference_class: occurrence.reference_class,
      disposition: seedAliases.has(occurrence.reference_id)
        ? 'seed_alias'
        : 'new_cross_reference_candidate',
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
  return [...byId.values()]
    .sort((a, b) => a.reference_id.localeCompare(b.reference_id))
    .map((row) => ({
      ...row,
      source_ids: [...row.source_ids].sort(),
      occurrences: row.occurrences.sort(
        (a, b) =>
          a.source_id.localeCompare(b.source_id) ||
          a.page - b.page ||
          a.line - b.line ||
          a.matched_text.localeCompare(b.matched_text)
      )
    }));
}

function compareWithV1(v1Registry, references) {
  const v1Ids = new Set(v1Registry.references.map((row) => row.reference_id));
  const v2Ids = new Set(references.map((row) => row.reference_id));
  const missing = [...v1Ids].filter((id) => !v2Ids.has(id)).sort();
  const expectedMissing = Object.keys(V1_SUPERSEDED).sort();
  ok(JSON.stringify(missing) === JSON.stringify(expectedMissing), `unexpected v1 losses: ${missing.join(', ')}`);
  for (const [retired, replacements] of Object.entries(V1_SUPERSEDED)) {
    ok(v1Ids.has(retired), `${retired}: superseded v1 ID absent`);
    for (const replacement of replacements) {
      ok(v2Ids.has(replacement), `${retired}: replacement ${replacement} absent`);
    }
  }
  const preserved = [...v1Ids].filter((id) => v2Ids.has(id)).sort();
  const added = [...v2Ids].filter((id) => !v1Ids.has(id)).sort();
  ok(preserved.length === EXPECTED.v1Preserved, `v1 preserved ${preserved.length}`);
  ok(missing.length === EXPECTED.v1Superseded, `v1 superseded ${missing.length}`);
  ok(added.length === EXPECTED.v2Added, `v2 added ${added.length}`);
  for (const id of REQUIRED_V2_IDS) ok(v2Ids.has(id), `required repaired reference absent: ${id}`);
  return {
    v1_reference_ids: v1Ids.size,
    v1_preserved_reference_ids: preserved.length,
    v1_typed_superseded_reference_ids: missing.length,
    v2_added_reference_ids: added.length,
    preserved_reference_ids: preserved,
    superseded_reference_ids: missing.map((id) => ({
      reference_id: id,
      reason:
        id === '7-CFR-273.24(b)'
          ? 'v1 line-scoped parsing truncated a wrapped subsection citation'
          : 'v1 WIC grammar discarded cited subsection identity',
      replacement_reference_ids: V1_SUPERSEDED[id]
    })),
    added_reference_ids: added
  };
}

function referenceClassCounts(references, disposition = null) {
  const counts = {};
  for (const row of references) {
    if (disposition && row.disposition !== disposition) continue;
    counts[row.reference_class] = (counts[row.reference_class] || 0) + 1;
  }
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

export function main() {
  const { summary, receipt } = verifyArtifact();
  const v1 = verifyV1Artifact();
  const { occurrences, sourceExtractions } = extractReferences(summary);
  const references = buildRegistry(occurrences);
  const delta = compareWithV1(v1.registry, references);

  ok(occurrences.length === EXPECTED.occurrences, `occurrence denominator ${occurrences.length}`);
  ok(references.length === EXPECTED.references, `reference denominator ${references.length}`);
  ok(
    references.filter((row) => row.disposition === 'seed_alias').length === EXPECTED.seedAliases,
    'seed-alias denominator changed'
  );
  ok(
    references.filter((row) => row.disposition === 'new_cross_reference_candidate').length === EXPECTED.newCandidates,
    'new-candidate denominator changed'
  );
  ok(sourceExtractions.filter((row) => row.state === 'extracted').length === 13, 'extracted-source denominator changed');
  ok(
    sourceExtractions.filter((row) => row.state !== 'extracted').map((row) => row.source_id).join(',') ===
      'FED-PL119-21',
    'unresolved source identity changed'
  );

  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });

  const registry = {
    schema_version: 'ssc-rd-wave02-rd04-cross-reference-registry@2',
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
    parser_repair: {
      status: 'complete_v1_underinclusive_denominator_superseded',
      superseded_grammar: 'rd04-version-cross-reference-grammar@1',
      superseded_workflow_run: 30765689103,
      superseded_artifact_id: 8838855765,
      superseded_artifact_zip_sha256:
        '04d93768ef7af0f626f30b9fc22e62b66593d8eb3b1b979cab1e637f9f33b95c',
      superseded_registry_sha256:
        '1f820604ad6f2a8fa383ce30eebe7bd1326ec433fc2153e9737cc846233260f7',
      defects_repaired: [
        'line-scoped parsing split authority labels from identifiers',
        'title-seven-only federal code grammars omitted cited Title 25 USC and Title 45 CFR authorities',
        'WIC grammar discarded cited subsection identity',
        'MPP, HSC, California bill, and named statutory-act authority classes were absent'
      ],
      delta
    },
    extraction_contract: {
      grammar_version: 'rd04-version-cross-reference-grammar@2',
      scan_scope: 'page_normalized_with_original_line_locator',
      page_boundaries_preserved: true,
      cross_page_joining: false,
      pdf_extraction: 'pdftotext -layout -enc UTF-8',
      html_extraction: 'script_style_remove_tag_strip_entity_decode_v1',
      pattern_classes: [...new Set(patterns.map((pattern) => pattern.reference_class))],
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
      new_cross_reference_candidates: references.filter(
        (row) => row.disposition === 'new_cross_reference_candidate'
      ).length,
      v1_reference_ids_preserved: delta.v1_preserved_reference_ids,
      v1_reference_ids_typed_superseded: delta.v1_typed_superseded_reference_ids,
      v2_reference_ids_added: delta.v2_added_reference_ids,
      version_edges_adjudicated: 0,
      class_closed: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    reference_class_counts: referenceClassCounts(references),
    new_candidate_class_counts: referenceClassCounts(references, 'new_cross_reference_candidate'),
    unresolved_seed_source: {
      source_id: 'FED-PL119-21',
      state: 'http_403_after_two_bounded_attempts',
      official_alternative_locator_candidate:
        'https://www.govinfo.gov/content/pkg/PLAW-119publ21/pdf/PLAW-119publ21.pdf',
      alternative_locator_selected_by_identity_rule: true,
      alternative_locator_fetched: false,
      source_failure_is_record_absence: false,
      source_failure_is_noncompliance: false
    },
    current_result: {
      terminal_state:
        'corrected_cross_reference_denominator_frozen_from_thirteen_exact_sources_one_seed_source_unresolved',
      parser_repair_complete: true,
      corrected_cross_reference_denominator_frozen: true,
      cross_reference_candidate_derivation_complete_for_recovered_sources: true,
      full_source_cross_reference_universe_complete: false,
      authority_unit_denominator_frozen: false,
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
      one_hundred_fifty_four_reference_ids_is_complete_class: false,
      parser_repair_changes_reviewed_disposition: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };

  writeJson(path.join(OUTPUT, 'registry.json'), registry);
  writeJson(path.join(OUTPUT, 'delta.json'), {
    schema_version: 'ssc-rd-wave02-rd04-cross-reference-delta@2',
    source_v1_artifact_id: 8838855765,
    source_v1_registry_sha256:
      '1f820604ad6f2a8fa383ce30eebe7bd1326ec433fc2153e9737cc846233260f7',
    repaired_registry_path: 'registry.json',
    ...delta,
    authority: {
      parser_delta_is_version_edge: false,
      added_reference_is_controlling_authority: false,
      superseded_parser_id_is_source_correction: false,
      reviewed_disposition_changed: false,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  });

  const registryBytes = fs.readFileSync(path.join(OUTPUT, 'registry.json'));
  const deltaBytes = fs.readFileSync(path.join(OUTPUT, 'delta.json'));
  writeJson(path.join(OUTPUT, 'receipt.json'), {
    schema_version: 'ssc-rd-wave02-rd04-cross-reference-receipt@2',
    source_seed_artifact_id: receipt.execution.artifact_id,
    source_v1_artifact_id: 8838855765,
    registry_path: 'registry.json',
    registry_bytes: registryBytes.length,
    registry_sha256: sha256(registryBytes),
    delta_path: 'delta.json',
    delta_bytes: deltaBytes.length,
    delta_sha256: sha256(deltaBytes),
    counts: registry.counts,
    terminal_state: registry.current_result.terminal_state,
    parser_repair_complete: true,
    class_closed: false,
    outside_human_dependency: false
  });

  console.log(
    `derive-version-cross-references-v2: ${occurrences.length} occurrences, ` +
      `${references.length} references, ${registry.counts.new_cross_reference_candidates} new candidates`
  );
  console.log(
    `derive-version-cross-references-v2: preserved ${delta.v1_preserved_reference_ids}, ` +
      `typed-superseded ${delta.v1_typed_superseded_reference_ids}, added ${delta.v2_added_reference_ids}`
  );
  return registry;
}

const invoked = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invoked) {
  try {
    main();
  } catch (error) {
    console.error(error.stack || error.message);
    process.exit(1);
  }
}
