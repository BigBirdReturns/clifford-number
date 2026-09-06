#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');

const REQUIRED_ROW_KEYS = [
  'company_name_as_reported',
  'evidence_class',
  'graph_effect',
  'identity_state',
  'rank',
  'recovery_method',
  'source_page',
  'source_receipt_id',
  'website',
  'year',
];

function readJsonlText(text) {
  return text.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function readJsonl(filePath) {
  return readJsonlText(fs.readFileSync(filePath, 'utf8'));
}

function normalizeName(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function normalizeWebsite(value) {
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : `https://${raw}`);
    return parsed.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

function exactKeys(value, expected) {
  return JSON.stringify(Object.keys(value ?? {}).sort()) === JSON.stringify([...expected].sort());
}

function sourcePageForRank(rank) {
  if (rank <= 23) return 12;
  if (rank <= 53) return 13;
  if (rank <= 83) return 14;
  return 15;
}

function addIndex(index, key, companyId) {
  if (!key) return;
  if (!index.has(key)) index.set(key, new Set());
  index.get(key).add(companyId);
}

function companyIndexes(companies) {
  const websites = new Map();
  const names = new Map();
  for (const company of companies) {
    addIndex(websites, normalizeWebsite(company.website), company.company_id);
    for (const name of [company.canonical_name, ...(company.aliases ?? [])]) {
      addIndex(names, normalizeName(name), company.company_id);
    }
  }
  return { names, websites };
}

function resolveCompanyCandidate(row, indexes) {
  const websiteIds = [...(indexes.websites.get(normalizeWebsite(row.website)) ?? [])].sort();
  const nameIds = [...(indexes.names.get(normalizeName(row.company_name_as_reported)) ?? [])].sort();

  if (websiteIds.length > 1) {
    return { error: 'AMBIGUOUS_COMPANY', detail: `rank ${row.rank} website resolves to ${websiteIds.join(', ')}` };
  }
  if (nameIds.length > 1) {
    return { error: 'AMBIGUOUS_COMPANY', detail: `rank ${row.rank} name resolves to ${nameIds.join(', ')}` };
  }
  if (websiteIds.length === 1 && nameIds.length === 1 && websiteIds[0] !== nameIds[0]) {
    return {
      error: 'IDENTITY_CONFLICT',
      detail: `rank ${row.rank} website resolves to ${websiteIds[0]} but name resolves to ${nameIds[0]}`,
    };
  }
  if (websiteIds.length === 1) return { company_id: websiteIds[0], resolution: 'website' };
  if (nameIds.length === 1) return { company_id: nameIds[0], resolution: 'name_or_alias' };
  return { company_id: null, resolution: 'unresolved_source_identity' };
}

function hashText(text) {
  return crypto.createHash('sha256').update(text, 'utf8').digest('hex');
}

function addError(errors, code, detail) {
  errors.push({ code, detail });
}

export function validateNatSec1002025Recovery({
  rosterText,
  manifest,
  companies,
  companyYears,
  receipts,
} = {}) {
  const errors = [];
  let roster = [];
  try {
    roster = readJsonlText(rosterText ?? '');
  } catch (cause) {
    addError(errors, 'ROSTER_JSON', cause.message);
  }

  const expectedHash = String(manifest?.source?.transcription_sha256 ?? '');
  const actualHash = `sha256:${hashText(rosterText ?? '')}`;
  if (expectedHash !== actualHash) {
    addError(errors, 'TRANSCRIPTION_HASH', `expected ${expectedHash || 'missing'}, got ${actualHash}`);
  }

  if (manifest?.schema_version !== 'natsec100-2025-roster-recovery@1') {
    addError(errors, 'MANIFEST_SCHEMA', 'schema_version drift');
  }
  if (manifest?.status !== 'source_transcription_complete_identity_reconciliation_pending_case_promotion') {
    addError(errors, 'MANIFEST_STATUS', 'status drift');
  }
  if (manifest?.scope?.promotes_to !== 'candidate_only'
      || manifest?.scope?.graph_effect !== 'none'
      || manifest?.scope?.identity_effect !== 'none') {
    addError(errors, 'MANIFEST_SCOPE', 'recovery must remain candidate-only and graph/identity inert');
  }

  const sourceReceipt = receipts.find(row => row.receipt_id === manifest?.source?.receipt_id);
  if (!sourceReceipt) {
    addError(errors, 'SOURCE_RECEIPT', 'manifest source receipt is missing');
  } else {
    if (sourceReceipt.receipt_id !== 'R003'
        || sourceReceipt.source_type !== 'official_pdf'
        || sourceReceipt.evidence_class !== 'official') {
      addError(errors, 'SOURCE_RECEIPT', 'R003 must remain the official 2025 PDF receipt');
    }
    if (sourceReceipt.url !== manifest.source.url) {
      addError(errors, 'SOURCE_URL', 'manifest URL does not match R003');
    }
    if (!sourceReceipt.archive?.ref || sourceReceipt.archive.ref !== manifest.source.archive_ref) {
      addError(errors, 'SOURCE_ARCHIVE', 'manifest archive reference does not match R003');
    }
  }

  if (roster.length !== 100) addError(errors, 'ROW_COUNT', `expected 100 rows, found ${roster.length}`);
  const ranks = new Set();
  const websites = new Set();
  const mappedCompanyIds = new Set();
  const resolutionCounts = {};
  const mappings = [];
  const indexes = companyIndexes(companies);

  for (const row of roster) {
    if (!exactKeys(row, REQUIRED_ROW_KEYS)) {
      addError(errors, 'ROW_KEYS', `rank ${row?.rank ?? 'missing'} has an unexpected row shape`);
    }
    if (row.year !== 2025
        || row.source_receipt_id !== 'R003'
        || row.evidence_class !== 'official'
        || row.recovery_method !== 'visual_transcription_of_official_pdf_table'
        || row.identity_state !== 'source_name_and_website_only'
        || row.graph_effect !== 'none') {
      addError(errors, 'ROW_SCOPE', `rank ${row?.rank ?? 'missing'} violates the source-transcription boundary`);
    }
    if (!Number.isInteger(row.rank) || row.rank < 1 || row.rank > 100) {
      addError(errors, 'RANK_RANGE', `invalid rank ${JSON.stringify(row.rank)}`);
    } else {
      if (ranks.has(row.rank)) addError(errors, 'DUPLICATE_RANK', `rank ${row.rank} occurs more than once`);
      ranks.add(row.rank);
      const expectedPage = sourcePageForRank(row.rank);
      if (row.source_page !== expectedPage) {
        addError(errors, 'SOURCE_PAGE', `rank ${row.rank} must be on PDF page ${expectedPage}`);
      }
    }
    if (!String(row.company_name_as_reported ?? '').trim()) {
      addError(errors, 'COMPANY_NAME', `rank ${row?.rank ?? 'missing'} has no company name`);
    }
    const website = normalizeWebsite(row.website);
    if (!website) {
      addError(errors, 'WEBSITE', `rank ${row?.rank ?? 'missing'} has an invalid website`);
    } else {
      if (websites.has(website)) addError(errors, 'DUPLICATE_WEBSITE', `${website} occurs more than once`);
      websites.add(website);
    }

    const resolved = resolveCompanyCandidate(row, indexes);
    if (resolved.error) {
      addError(errors, resolved.error, resolved.detail);
    } else {
      if (resolved.company_id && mappedCompanyIds.has(resolved.company_id)) {
        addError(errors, 'DUPLICATE_COMPANY_MAPPING', `${resolved.company_id} occupies more than one recovered rank`);
      }
      if (resolved.company_id) mappedCompanyIds.add(resolved.company_id);
      resolutionCounts[resolved.resolution] = (resolutionCounts[resolved.resolution] ?? 0) + 1;
      mappings.push({
        rank: row.rank,
        company_name_as_reported: row.company_name_as_reported,
        website: row.website,
        existing_company_id: resolved.company_id,
        resolution: resolved.resolution,
      });
    }
  }

  for (let rank = 1; rank <= 100; rank += 1) {
    if (!ranks.has(rank)) addError(errors, 'MISSING_RANK', `rank ${rank} is absent`);
  }

  const prior = companyYears.filter(row => row.year === 2025);
  const priorIds = new Set();
  const mappingByCompany = new Map(
    mappings.filter(row => row.existing_company_id).map(row => [row.existing_company_id, row]),
  );
  let priorRanked = 0;
  let priorReconciled = 0;
  let priorPresenceOnlyRanked = 0;
  for (const row of prior) {
    if (priorIds.has(row.company_id)) {
      addError(errors, 'DUPLICATE_PRIOR_COMPANY', `${row.company_id} has more than one prior 2025 row`);
    }
    priorIds.add(row.company_id);
    const recovered = mappingByCompany.get(row.company_id);
    if (!recovered) {
      addError(errors, 'PRIOR_ROW_UNRESOLVED', `${row.company_id} is absent from the recovered official roster`);
      continue;
    }
    priorReconciled += 1;
    if (row.rank !== null && row.rank !== undefined) {
      priorRanked += 1;
      if (row.rank !== recovered.rank) {
        addError(errors, 'PRIOR_RANK_MISMATCH', `${row.company_id} was ${row.rank}, official table is ${recovered.rank}`);
      }
    } else {
      priorPresenceOnlyRanked += 1;
    }
  }

  const priorPresenceOnly = prior.length - priorRanked;
  const newSourceRows = roster.length - priorReconciled;
  const expected = manifest?.denominator ?? {};
  const actualCounts = {
    recovered_rows: roster.length,
    prior_partial_rows: prior.length,
    prior_rows_reconciled: priorReconciled,
    prior_rows_with_exact_rank: priorRanked,
    prior_presence_only_rows: priorPresenceOnly,
    new_source_rows_recovered: newSourceRows,
    previously_present_rows_given_exact_rank: priorPresenceOnlyRanked,
  };
  const expectedCounts = {
    recovered_rows: expected.expected_rows,
    prior_partial_rows: expected.prior_partial_rows,
    prior_rows_reconciled: expected.prior_partial_rows,
    prior_rows_with_exact_rank: expected.prior_rows_with_exact_rank,
    prior_presence_only_rows: expected.prior_presence_only_rows,
    new_source_rows_recovered: expected.new_source_rows_recovered,
    previously_present_rows_given_exact_rank: expected.previously_present_rows_given_exact_rank,
  };
  for (const [key, value] of Object.entries(expectedCounts)) {
    if (actualCounts[key] !== value) {
      addError(errors, 'DENOMINATOR', `${key} expected ${value}, found ${actualCounts[key]}`);
    }
  }

  return {
    schema_version: 'natsec100-2025-roster-recovery-validation@1',
    source_receipt_id: sourceReceipt?.receipt_id ?? null,
    transcription_sha256: actualHash,
    counts: {
      ...actualCounts,
      existing_registry_matches: mappedCompanyIds.size,
      unresolved_source_identity_rows: resolutionCounts.unresolved_source_identity ?? 0,
      unique_ranks: ranks.size,
      unique_websites: websites.size,
      resolution_methods: Object.fromEntries(
        Object.entries(resolutionCounts).sort(([left], [right]) => left.localeCompare(right)),
      ),
    },
    mappings: mappings.sort((left, right) => left.rank - right.rank),
    errors,
  };
}

export function loadNatSec1002025RecoveryInputs(base = ROOT) {
  const chunk = path.join(base, 'data', 'intake', 'natsec100-pathways', 'chunk1');
  return {
    rosterText: fs.readFileSync(path.join(chunk, 'roster-2025-official-visual-recovery.jsonl'), 'utf8'),
    manifest: JSON.parse(fs.readFileSync(path.join(chunk, 'roster-2025-official-visual-recovery.json'), 'utf8')),
    companies: readJsonl(path.join(chunk, 'companies.jsonl')),
    companyYears: readJsonl(path.join(chunk, 'company_years.jsonl')),
    receipts: readJsonl(path.join(chunk, 'receipts.jsonl')),
  };
}

function main() {
  const result = validateNatSec1002025Recovery(loadNatSec1002025RecoveryInputs());
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  if (result.errors.length) {
    if (!process.argv.includes('--json')) {
      console.error(`validate-natsec100-2025-roster-recovery: ${result.errors.length} FAILURE(S)`);
      for (const row of result.errors) console.error(`  ${row.code}: ${row.detail}`);
    }
    process.exit(1);
  }
  if (!process.argv.includes('--json')) {
    console.log(
      `validate-natsec100-2025-roster-recovery: OK `
      + `(${result.counts.recovered_rows} official ranks; `
      + `${result.counts.prior_rows_reconciled} prior rows reconciled; `
      + `${result.counts.new_source_rows_recovered} newly recovered source rows; `
      + `${result.counts.unresolved_source_identity_rows} source identities remain for case promotion)`,
    );
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
