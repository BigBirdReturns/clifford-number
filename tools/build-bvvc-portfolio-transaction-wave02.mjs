import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const MANIFEST_PATH = path.join(DIR, 'manifest.json');
const TRANSACTIONS_PATH = path.join(DIR, 'transactions.jsonl');
const COVERAGE_PATH = path.join(DIR, 'coverage-matrix.json');
const README_PATH = path.join(DIR, 'README.md');
const SOURCE_PART = 'source-inventory-05.jsonl';
const SOURCE_PART_PATH = path.join(DIR, SOURCE_PART);
const VALIDATOR_PATH = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + '\n');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fileRecord = file => ({ bytes: fs.statSync(file).size, sha256: sha256(file) });
const fail = message => { throw new Error(message); };

const manifest = readJson(MANIFEST_PATH);
const transactions = readJsonl(TRANSACTIONS_PATH);
const coverage = readJson(COVERAGE_PATH);
let readme = fs.readFileSync(README_PATH, 'utf8');
let validator = fs.readFileSync(VALIDATOR_PATH, 'utf8');

if (manifest.schema_version !== 'bvvc-defense-capital-manifest@2') fail('unexpected manifest schema');
if (manifest.counts.source_inventory_rows !== 76) fail('expected 76 source rows before wave 02');
if (manifest.counts.transaction_and_investment_observation_rows !== 14) fail('expected 14 transaction observations before wave 02');
if (transactions.length !== 14) fail('transaction file is not at the wave-01 boundary');
if (fs.existsSync(SOURCE_PART_PATH)) fail(`${SOURCE_PART} already exists`);

const sourceRows = [
  {
    content_sha256: null,
    evidence_class: 'counterparty_primary_public',
    graph_effect: 'none',
    locator_url: 'https://usul.com/news/3-3m-seed-fundraising-announcement',
    note: 'Usul company announcement of a $3.3M seed round led by Scout Ventures with participation from Bravo Victor Venture Capital.',
    promotes_to: 'candidate_only',
    receipt_id: 'r-usul-bvvc-seed-2025',
    retrieved_at: '2026-08-04',
    source_state: 'live_locator'
  },
  {
    content_sha256: null,
    evidence_class: 'counterparty_primary_public_platform_post',
    graph_effect: 'none',
    locator_url: 'https://www.linkedin.com/posts/tucker-dordevic-485366171_today-were-excited-to-announce-that-oureon-activity-7386060778229104640-fdpx',
    note: 'Oureon founder public announcement of a $3.5M pre-seed round led by GTMfund with participation from BVVC and named co-investors.',
    promotes_to: 'candidate_only',
    receipt_id: 'r-oureon-bvvc-preseed-2025',
    retrieved_at: '2026-08-04',
    source_state: 'search_index_only'
  },
  {
    content_sha256: null,
    evidence_class: 'counterparty_primary_public',
    graph_effect: 'none',
    locator_url: 'https://www.prnewswire.com/news-releases/orion-raises-3-5-million-to-scale-its-ai-powered-risk-intelligence-platform-for-real-world-threat-response-302619603.html',
    note: 'Orion company announcement of $3.5M in funding led by Dynamo Ventures with participation from BVVC, Techstars, and Service Provider Capital, plus a Puerto Rico government grant.',
    promotes_to: 'candidate_only',
    receipt_id: 'r-orion-bvvc-funding-2025',
    retrieved_at: '2026-08-04',
    source_state: 'live_locator'
  }
];

const newTransactions = [
  {
    announced_round_amount: { currency: 'USD', value: 3300000 },
    as_of: '2026-08-04',
    bvvc_role: 'participant',
    company_id: 'org-usul',
    company_label: 'Usul',
    date: '2025-05-12',
    date_basis: 'company_announcement_date',
    evidence_class: 'counterparty_primary_public',
    governance_rights_state: 'not_established',
    graph_effect: 'none',
    lead_investor: 'Scout Ventures',
    other_named_participants: ['Y Combinator', 'Steve Blank', 'Jack Shanahan', 'Peter Newell', 'Jacqueline Tame'],
    ownership_state: 'not_established',
    promotes_to: 'candidate_only',
    receipt_ids: ['r-usul-bvvc-seed-2025'],
    round_type: 'seed',
    transaction_id: 'txn-usul-2025-05-12',
    transaction_to_vehicle_join_state: 'not_established'
  },
  {
    announced_round_amount: { currency: 'USD', value: 3500000 },
    as_of: '2026-08-04',
    boundary: 'The retained source is the founder public announcement; exact closing instruments, security terms, check sizes, ownership, and governance rights remain absent.',
    bvvc_role: 'participant',
    company_id: 'org-oureon',
    company_label: 'Oureon',
    date: '2025-10-22',
    date_basis: 'public_announcement_date',
    evidence_class: 'counterparty_primary_public_platform_post',
    governance_rights_state: 'not_established',
    graph_effect: 'none',
    lead_investor: 'GTMfund',
    other_named_participants: ['Boost VC', 'Ensemble VC', 'Flyover Capital', 'JHH VC', 'TipTop VC'],
    ownership_state: 'not_established',
    promotes_to: 'candidate_only',
    receipt_ids: ['r-oureon-bvvc-preseed-2025'],
    round_type: 'pre_seed',
    transaction_id: 'txn-oureon-2025-10-22',
    transaction_to_vehicle_join_state: 'not_established'
  },
  {
    announced_round_amount: { currency: 'USD', value: 3500000 },
    as_of: '2026-08-04',
    bvvc_role: 'participant',
    company_id: 'org-orion-geo',
    company_label: 'Orion',
    date: '2025-11-19',
    date_basis: 'company_announcement_date',
    evidence_class: 'counterparty_primary_public',
    governance_rights_state: 'not_established',
    graph_effect: 'none',
    lead_investor: 'Dynamo Ventures',
    other_named_participants: ['Techstars', 'Service Provider Capital'],
    separate_observation: 'The announcement also names a government grant from Puerto Rico; grant amount and instrument remain unresolved and are not included in the announced round amount.',
    ownership_state: 'not_established',
    promotes_to: 'candidate_only',
    receipt_ids: ['r-orion-bvvc-funding-2025'],
    round_type: 'funding_round_unspecified',
    transaction_id: 'txn-orion-2025-11-19',
    transaction_to_vehicle_join_state: 'not_established'
  }
];

const existingTransactionIds = new Set(transactions.map(row => row.transaction_id));
const existingReceiptIds = new Set(
  manifest.storage_contract.source_inventory_parts
    .flatMap(file => readJsonl(path.join(DIR, file)))
    .map(row => row.receipt_id)
);
for (const row of sourceRows) if (existingReceiptIds.has(row.receipt_id)) fail(`receipt already exists: ${row.receipt_id}`);
for (const row of newTransactions) if (existingTransactionIds.has(row.transaction_id)) fail(`transaction already exists: ${row.transaction_id}`);

writeJsonl(SOURCE_PART_PATH, sourceRows);
writeJsonl(TRANSACTIONS_PATH, [...transactions, ...newTransactions]);

const transactionCoverage = coverage.denominators.find(row => row.surface === 'portfolio transaction or investment-specific observations');
if (!transactionCoverage || transactionCoverage.enumerated_total !== 14) fail('coverage transaction denominator drift');
transactionCoverage.enumerated_total = 17;
const gapIndex = coverage.explicit_nulls_and_gaps.indexOf('transaction-specific receipts absent for 16 of 30 current portfolio labels');
if (gapIndex < 0) fail('coverage gap string drift');
coverage.explicit_nulls_and_gaps[gapIndex] = 'transaction-specific receipts absent for 13 of 30 current portfolio labels';
writeJson(COVERAGE_PATH, coverage);

manifest.counts.source_inventory_rows = 79;
manifest.counts.transaction_and_investment_observation_rows = 17;
manifest.coverage.transactions = '17_of_30_current_labels_have_transaction_or_explicit_investment_observations';
if (manifest.storage_contract.source_inventory_parts.includes(SOURCE_PART)) fail('source part already registered');
manifest.storage_contract.source_inventory_parts.push(SOURCE_PART);
manifest.source_inventory.evidence_class_counts.counterparty_primary_public = 9;
manifest.source_inventory.evidence_class_counts.counterparty_primary_public_platform_post = 3;
manifest.source_inventory.source_state_counts.live_locator = 66;
manifest.source_inventory.source_state_counts.search_index_only = 12;
manifest.files[SOURCE_PART] = fileRecord(SOURCE_PART_PATH);
manifest.files['transactions.jsonl'] = fileRecord(TRANSACTIONS_PATH);
manifest.files['coverage-matrix.json'] = fileRecord(COVERAGE_PATH);
writeJson(MANIFEST_PATH, manifest);

const replacements = [
  ['public-source receipts                         76', 'public-source receipts                         79'],
  ['transaction or investment observations         14', 'transaction or investment observations         17'],
  ['- `transactions.jsonl` separates eight dated counterparty or syndicated financing announcements from six undated firm-self-represented investment observations.', '- `transactions.jsonl` separates eleven dated counterparty or syndicated financing announcements from six undated firm-self-represented investment observations.'],
];
for (const [from, to] of replacements) {
  if (!readme.includes(from)) fail(`README boundary missing: ${from}`);
  readme = readme.replace(from, to);
}
fs.writeFileSync(README_PATH, readme);

const validatorBoundary = "check(transactions.length === 14, 'transaction plane must contain 14 typed observations');";
if (!validator.includes(validatorBoundary)) fail('validator transaction boundary drift');
validator = validator.replace(
  validatorBoundary,
  "check(transactions.length === 17, 'transaction plane must contain 17 typed observations');"
);
fs.writeFileSync(VALIDATOR_PATH, validator);

const receipt = {
  schema_version: 'bvvc-portfolio-transaction-wave02-receipt@1',
  as_of: '2026-08-04',
  base_source_inventory_rows: 76,
  result_source_inventory_rows: 79,
  base_transaction_rows: 14,
  result_transaction_rows: 17,
  admitted_transaction_ids: newTransactions.map(row => row.transaction_id),
  remaining_current_labels_without_transaction_specific_or_explicit_investment_observation: 13,
  private_support_rows: 0,
  outside_human_dependency: false,
  ownership_findings: 0,
  governance_right_findings: 0,
  transaction_to_vehicle_joins: 0,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(path.join(DIR, 'portfolio-transaction-wave02-receipt.json'), receipt);

console.log(JSON.stringify(receipt));
