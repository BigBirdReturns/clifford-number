import assert from 'node:assert/strict';
import {
  loadNatSec1002025RecoveryInputs,
  validateNatSec1002025Recovery,
} from '../tools/validate-natsec100-2025-roster-recovery.mjs';

function codes(result) {
  return result.errors.map(row => row.code);
}

function clone(value) {
  return structuredClone(value);
}

function normalizeName(value) {
  return String(value ?? '').toLowerCase().replace(/[^a-z0-9]+/g, '');
}

function rosterRows(inputs) {
  return inputs.rosterText.split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
}

function rosterText(rows) {
  return `${rows.map(row => JSON.stringify(row)).join('\n')}\n`;
}

const actualInputs = loadNatSec1002025RecoveryInputs();
const actual = validateNatSec1002025Recovery(actualInputs);
assert.deepEqual(actual.errors, []);
assert.equal(actual.counts.recovered_rows, 100);
assert.equal(actual.counts.unique_ranks, 100);
assert.equal(actual.counts.unique_websites, 100);
assert.equal(
  actual.counts.existing_registry_matches + actual.counts.unresolved_source_identity_rows,
  100,
);
assert.ok(actual.counts.unresolved_source_identity_rows > 0,
  'source-only identities must remain explicit until case promotion');
assert.equal(actual.counts.prior_partial_rows, 42);
assert.equal(actual.counts.prior_rows_reconciled, 42);
assert.equal(actual.counts.prior_rows_with_exact_rank, 27);
assert.equal(actual.counts.prior_presence_only_rows, 15);
assert.equal(actual.counts.new_source_rows_recovered, 58);
assert.equal(actual.counts.previously_present_rows_given_exact_rank, 15);
assert.equal(actual.mappings[0].rank, 1);
assert.equal(actual.mappings.at(-1).rank, 100);

{
  const rows = rosterRows(actualInputs);
  rows.pop();
  const result = validateNatSec1002025Recovery({
    ...actualInputs,
    rosterText: rosterText(rows),
  });
  assert.ok(codes(result).includes('TRANSCRIPTION_HASH'));
  assert.ok(codes(result).includes('ROW_COUNT'));
  assert.ok(codes(result).includes('MISSING_RANK'));
}

{
  const rows = rosterRows(actualInputs);
  rows[1].rank = 1;
  const result = validateNatSec1002025Recovery({
    ...actualInputs,
    rosterText: rosterText(rows),
  });
  assert.ok(codes(result).includes('DUPLICATE_RANK'));
  assert.ok(codes(result).includes('MISSING_RANK'));
}

{
  const rows = rosterRows(actualInputs);
  rows[0].source_page = 15;
  assert.ok(codes(validateNatSec1002025Recovery({
    ...actualInputs,
    rosterText: rosterText(rows),
  })).includes('SOURCE_PAGE'));
}

{
  const rows = rosterRows(actualInputs);
  rows[0].graph_effect = 'hop';
  assert.ok(codes(validateNatSec1002025Recovery({
    ...actualInputs,
    rosterText: rosterText(rows),
  })).includes('ROW_SCOPE'));
}

{
  const mapped = actual.mappings.find(row => row.existing_company_id);
  assert.ok(mapped);
  const companies = clone(actualInputs.companies);
  companies.push({
    company_id: 'ambiguous-copy',
    canonical_name: mapped.company_name_as_reported,
    aliases: [],
    website: mapped.website,
  });
  assert.ok(codes(validateNatSec1002025Recovery({
    ...actualInputs,
    companies,
  })).includes('AMBIGUOUS_COMPANY'));
}

{
  const left = actual.mappings.find(row => {
    if (!row.existing_company_id) return false;
    const company = actualInputs.companies.find(item => item.company_id === row.existing_company_id);
    const sourceName = normalizeName(row.company_name_as_reported);
    return [company?.canonical_name, ...(company?.aliases ?? [])]
      .some(name => normalizeName(name) === sourceName);
  });
  const right = actual.mappings.find(row => (
    row.existing_company_id
    && row.existing_company_id !== left?.existing_company_id
  ));
  assert.ok(left && right);

  const companies = clone(actualInputs.companies);
  for (const company of companies) company.website = null;
  const rightCompany = companies.find(company => company.company_id === right.existing_company_id);
  assert.ok(rightCompany);
  rightCompany.website = left.website;

  assert.ok(codes(validateNatSec1002025Recovery({
    ...actualInputs,
    companies,
  })).includes('IDENTITY_CONFLICT'));
}

{
  const years = clone(actualInputs.companyYears);
  const ranked = years.find(row => row.year === 2025 && row.rank !== null);
  ranked.rank = ranked.rank === 1 ? 2 : 1;
  assert.ok(codes(validateNatSec1002025Recovery({
    ...actualInputs,
    companyYears: years,
  })).includes('PRIOR_RANK_MISMATCH'));
}

{
  const years = clone(actualInputs.companyYears);
  years.splice(years.findIndex(row => row.year === 2025), 1);
  assert.ok(codes(validateNatSec1002025Recovery({
    ...actualInputs,
    companyYears: years,
  })).includes('DENOMINATOR'));
}

{
  const receipts = clone(actualInputs.receipts);
  const source = receipts.find(row => row.receipt_id === 'R003');
  source.archive.ref = null;
  assert.ok(codes(validateNatSec1002025Recovery({
    ...actualInputs,
    receipts,
  })).includes('SOURCE_ARCHIVE'));
}

{
  const manifest = clone(actualInputs.manifest);
  manifest.source.transcription_sha256 = `sha256:${'0'.repeat(64)}`;
  assert.ok(codes(validateNatSec1002025Recovery({
    ...actualInputs,
    manifest,
  })).includes('TRANSCRIPTION_HASH'));
}

{
  const manifest = clone(actualInputs.manifest);
  manifest.scope.promotes_to = 'canonical';
  assert.ok(codes(validateNatSec1002025Recovery({
    ...actualInputs,
    manifest,
  })).includes('MANIFEST_SCOPE'));
}

console.log('natsec100-2025-roster-recovery.test: OK');
