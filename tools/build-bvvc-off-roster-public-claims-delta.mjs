import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DIR = path.join(ROOT, 'data/intake/bvvc-defense-capital');
const MANIFEST_PATH = path.join(DIR, 'manifest.json');
const COVERAGE_PATH = path.join(DIR, 'coverage-matrix.json');
const README_PATH = path.join(DIR, 'README.md');
const VALIDATOR_PATH = path.join(ROOT, 'tools/validate-bvvc-defense-capital.mjs');
const SOURCE_PART = 'source-inventory-06.jsonl';
const SOURCE_PART_PATH = path.join(DIR, SOURCE_PART);
const DELTA_FILE = 'portfolio-delta-candidates.jsonl';
const DELTA_PATH = path.join(DIR, DELTA_FILE);
const RECEIPT_PATH = path.join(DIR, 'portfolio-delta-candidates-receipt.json');

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line));
const writeJson = (file, value) => fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
const writeJsonl = (file, rows) => fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + '\n');
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const fileRecord = file => ({ bytes: fs.statSync(file).size, sha256: sha256(file) });
const fail = message => { throw new Error(message); };

const manifest = readJson(MANIFEST_PATH);
const coverage = readJson(COVERAGE_PATH);
let readme = fs.readFileSync(README_PATH, 'utf8');
let validator = fs.readFileSync(VALIDATOR_PATH, 'utf8');

if (manifest.schema_version !== 'bvvc-defense-capital-manifest@2') fail('unexpected manifest schema');
if (manifest.counts.source_inventory_rows !== 79) fail('expected 79 source rows after transaction wave 02');
if (manifest.counts.transaction_and_investment_observation_rows !== 17) fail('expected 17 transaction rows after transaction wave 02');
if (fs.existsSync(SOURCE_PART_PATH) || fs.existsSync(DELTA_PATH) || fs.existsSync(RECEIPT_PATH)) fail('off-roster delta already exists');

const sourceRows = [
  {
    content_sha256: null,
    evidence_class: 'primary_public_platform_post',
    graph_effect: 'none',
    locator_url: 'https://www.linkedin.com/posts/bvvc_fearless-builders-founders-activity-7467043566247120896-y8Lc',
    note: 'BVVC public post dated 2026-06-01 lists a bounded set of builders it says it backs, including Atropos Group, InfoPort, Lodestar Space, Hybron, and Furientis, none of which appears in the frozen 2026-08-04 Portfolio Universe page.',
    promotes_to: 'candidate_only',
    receipt_id: 'r-bvvc-fearless-builders-post-2026-06-01',
    retrieved_at: '2026-08-04',
    source_state: 'search_index_only'
  },
  {
    content_sha256: null,
    evidence_class: 'primary_public_platform_post',
    graph_effect: 'none',
    locator_url: 'https://www.linkedin.com/posts/bvvc_physicalai-actuators-gearboxes-activity-7473046940918652928-nHgk',
    note: 'BVVC public post dated 2026-06-17 states that the firm invested in Supercool Metals.',
    promotes_to: 'candidate_only',
    receipt_id: 'r-bvvc-supercool-investment-post-2026-06-17',
    retrieved_at: '2026-08-04',
    source_state: 'search_index_only'
  },
  {
    content_sha256: null,
    evidence_class: 'counterparty_primary_public',
    graph_effect: 'none',
    locator_url: 'https://hybron.com/hybron-closes-oversubscribed-seed-roundraising-25m/',
    note: 'Hybron company announcement dated 2026-04-09 of a $25M seed round led by Marque Ventures with participation from Bravo Victor Venture Capital and other named investors.',
    promotes_to: 'candidate_only',
    receipt_id: 'r-hybron-bvvc-seed-2026-04-09',
    retrieved_at: '2026-08-04',
    source_state: 'live_locator'
  },
  {
    content_sha256: null,
    evidence_class: 'counterparty_primary_public',
    graph_effect: 'none',
    locator_url: 'https://www.flynavi.com/newsroom',
    note: 'Navi AI company announcement dated 2026-03-25 separates a $3.35M seed round naming BVVC from a $1.27M SBIR Phase II contract and a $6.7M total-funding claim.',
    promotes_to: 'candidate_only',
    receipt_id: 'r-navi-ai-bvvc-seed-sbir-2026-03-25',
    retrieved_at: '2026-08-04',
    source_state: 'live_locator'
  },
  {
    content_sha256: null,
    evidence_class: 'counterparty_primary_public_platform_post',
    graph_effect: 'none',
    locator_url: 'https://www.linkedin.com/posts/ash-modeste-johnson-073b72198_today-we-are-proud-to-announce-that-applied-activity-7470583218933760002-_4d2',
    note: 'Founder Ash Modeste Johnson public announcement dated 2026-06-10 of a $4M Applied Atomics space-mobility pre-seed round led by Oxford Science Enterprises and naming BVVC among the backers and supporters.',
    promotes_to: 'candidate_only',
    receipt_id: 'r-applied-atomics-space-bvvc-preseed-2026-06-10',
    retrieved_at: '2026-08-04',
    source_state: 'search_index_only'
  },
  {
    content_sha256: null,
    evidence_class: 'primary_public_platform_post',
    graph_effect: 'none',
    locator_url: 'https://www.linkedin.com/posts/leylagladish_congratulations-to-the-applied-atomics-team-activity-7470802941667606528-HeyU',
    note: 'BVVC leader Leyla Gladish public post dated 2026-06-11 states that she is proud to stand with the Applied Atomics space-mobility team from BVVC; this does not resolve the exact legal entity.',
    promotes_to: 'candidate_only',
    receipt_id: 'r-leylagladish-applied-atomics-space-bvvc-2026-06-11',
    retrieved_at: '2026-08-04',
    source_state: 'search_index_only'
  },
  {
    content_sha256: null,
    evidence_class: 'primary_public_search_index',
    graph_effect: 'none',
    locator_url: 'https://www.linkedin.com/company/bvvc',
    note: 'Public BVVC company-page update snapshot uses backing language for Element Energy. The exact post permalink and transaction instrument were not resolved in this pass.',
    promotes_to: 'candidate_only',
    receipt_id: 'r-bvvc-element-energy-company-page-snapshot-2026-08-04',
    retrieved_at: '2026-08-04',
    source_state: 'search_index_snapshot'
  }
];

const common = {
  as_of: '2026-08-04',
  current_portfolio_snapshot_as_of: '2026-08-04',
  current_portfolio_snapshot_membership: false,
  current_portfolio_membership_not_admitted: true,
  delta_state: 'public_claim_not_reconciled_to_frozen_current_portfolio_page',
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};

const candidates = [
  {
    ...common,
    candidate_id: 'delta-atropos-group',
    label: 'Atropos Group',
    identity_state: 'label_only_pending_exact_entity',
    observed_claim_types: ['firm_narrative_backing_list'],
    public_claim_date: '2026-06-01',
    receipt_ids: ['r-bvvc-fearless-builders-post-2026-06-01'],
    transaction_observation: null
  },
  {
    ...common,
    candidate_id: 'delta-infoport',
    label: 'InfoPort',
    identity_state: 'label_only_pending_exact_entity',
    observed_claim_types: ['firm_narrative_backing_list'],
    public_claim_date: '2026-06-01',
    receipt_ids: ['r-bvvc-fearless-builders-post-2026-06-01'],
    transaction_observation: null
  },
  {
    ...common,
    candidate_id: 'delta-lodestar-space',
    label: 'Lodestar Space',
    identity_state: 'label_only_pending_exact_entity',
    observed_claim_types: ['firm_narrative_backing_list'],
    public_claim_date: '2026-06-01',
    receipt_ids: ['r-bvvc-fearless-builders-post-2026-06-01'],
    transaction_observation: null
  },
  {
    ...common,
    candidate_id: 'delta-furientis',
    label: 'Furientis',
    identity_state: 'label_only_pending_exact_entity',
    observed_claim_types: ['firm_narrative_backing_list'],
    public_claim_date: '2026-06-01',
    receipt_ids: ['r-bvvc-fearless-builders-post-2026-06-01'],
    transaction_observation: null
  },
  {
    ...common,
    candidate_id: 'delta-hybron',
    label: 'Hybron',
    identity_state: 'counterparty_source_explicit_company',
    observed_claim_types: ['firm_narrative_backing_list', 'counterparty_financing_announcement'],
    public_claim_date: '2026-04-09',
    receipt_ids: ['r-bvvc-fearless-builders-post-2026-06-01', 'r-hybron-bvvc-seed-2026-04-09'],
    transaction_observation: {
      announced_round_amount: { currency: 'USD', value: 25000000 },
      announcement_date: '2026-04-09',
      bvvc_role: 'participant',
      lead_investor: 'Marque Ventures',
      round_type: 'seed',
      security_terms_state: 'not_established',
      transaction_to_vehicle_join_state: 'not_established'
    }
  },
  {
    ...common,
    candidate_id: 'delta-supercool-metals',
    label: 'Supercool Metals',
    identity_state: 'firm_source_explicit_company',
    observed_claim_types: ['firm_explicit_investment_claim'],
    public_claim_date: '2026-06-17',
    receipt_ids: ['r-bvvc-supercool-investment-post-2026-06-17'],
    transaction_observation: {
      announced_round_amount: null,
      announcement_date: '2026-06-17',
      bvvc_role: 'firm_self_represented_investor',
      lead_investor: null,
      round_type: null,
      security_terms_state: 'not_established',
      transaction_to_vehicle_join_state: 'not_established'
    }
  },
  {
    ...common,
    candidate_id: 'delta-navi-ai-aviation',
    label: 'Navi AI (aviation training)',
    identity_state: 'counterparty_source_explicit_company_disambiguated_from_other_navi_ai_entities',
    observed_claim_types: ['counterparty_financing_announcement', 'government_award_claim'],
    public_claim_date: '2026-03-25',
    receipt_ids: ['r-navi-ai-bvvc-seed-sbir-2026-03-25'],
    transaction_observation: {
      announced_round_amount: { currency: 'USD', value: 3350000 },
      announcement_date: '2026-03-25',
      bvvc_role: 'participant',
      lead_investor: null,
      round_type: 'seed',
      security_terms_state: 'not_established',
      transaction_to_vehicle_join_state: 'not_established'
    },
    separate_government_surface: {
      amount: { currency: 'USD', value: 1270000 },
      agency_claim: 'U.S. Department of War / U.S. Air Force',
      award_type_claim: 'SBIR Phase II',
      award_identifier_state: 'not_resolved_in_this_pass',
      boundary: 'The government award is not included in the seed-round amount and does not establish technical acceptance.'
    }
  },
  {
    ...common,
    candidate_id: 'delta-applied-atomics-space-mobility',
    label: 'Applied Atomics (space mobility; Ash Modeste Johnson)',
    identity_state: 'predicate_specific_identity_unresolved',
    must_not_merge_with: 'Applied Atomics nuclear-power company associated with Ben Kellie without identifier-grade evidence',
    observed_claim_types: ['founder_financing_announcement', 'bvvc_leader_public_corroboration'],
    public_claim_date: '2026-06-10',
    receipt_ids: ['r-applied-atomics-space-bvvc-preseed-2026-06-10', 'r-leylagladish-applied-atomics-space-bvvc-2026-06-11'],
    transaction_observation: {
      announced_round_amount: { currency: 'USD', value: 4000000 },
      announcement_date: '2026-06-10',
      bvvc_role: 'named_backer_or_supporter',
      lead_investor: 'Oxford Science Enterprises',
      round_type: 'pre_seed',
      security_terms_state: 'not_established',
      transaction_to_vehicle_join_state: 'not_established'
    }
  },
  {
    ...common,
    candidate_id: 'delta-element-energy',
    label: 'Element Energy',
    identity_state: 'firm_snapshot_label_pending_exact_entity_and_transaction',
    observed_claim_types: ['firm_backing_language_in_public_company_page_snapshot'],
    public_claim_date: null,
    receipt_ids: ['r-bvvc-element-energy-company-page-snapshot-2026-08-04'],
    transaction_observation: null,
    boundary: 'The acquired snapshot supports firm backing language only; exact post date, transaction, fund vehicle, ownership, and governance rights remain unresolved.'
  }
];

const priorReceiptIds = new Set(
  manifest.storage_contract.source_inventory_parts
    .flatMap(file => readJsonl(path.join(DIR, file)))
    .map(row => row.receipt_id)
);
for (const row of sourceRows) if (priorReceiptIds.has(row.receipt_id)) fail(`receipt already exists: ${row.receipt_id}`);
if (new Set(candidates.map(row => row.candidate_id)).size !== candidates.length) fail('candidate IDs are not unique');

writeJsonl(SOURCE_PART_PATH, sourceRows);
writeJsonl(DELTA_PATH, candidates);

coverage.denominators.push({
  coverage_state: 'partial_open_universe',
  declared_total: null,
  enumerated_total: candidates.length,
  surface: 'public BVVC backing or transaction claims absent from the frozen 2026-08-04 Portfolio Universe page'
});
coverage.explicit_nulls_and_gaps.push('off-roster public-claim universe remains open; the frozen current portfolio page does not reconcile all dated firm and counterparty claims');
writeJson(COVERAGE_PATH, coverage);

manifest.counts.source_inventory_rows = 86;
manifest.counts.portfolio_delta_candidate_rows = candidates.length;
manifest.counts.coverage_denominator_rows = 12;
manifest.counts.explicit_gap_rows = 12;
manifest.coverage.portfolio_delta_candidates = '9_public_claim_candidates_not_reconciled_to_frozen_current_page';
manifest.storage_contract.source_inventory_parts.push(SOURCE_PART);
manifest.source_inventory.evidence_class_counts.counterparty_primary_public = 11;
manifest.source_inventory.evidence_class_counts.counterparty_primary_public_platform_post = 4;
manifest.source_inventory.evidence_class_counts.primary_public_platform_post = 6;
manifest.source_inventory.evidence_class_counts.primary_public_search_index = 7;
manifest.source_inventory.source_state_counts.live_locator = 68;
manifest.source_inventory.source_state_counts.search_index_only = 16;
manifest.source_inventory.source_state_counts.search_index_snapshot = 2;
manifest.files[SOURCE_PART] = fileRecord(SOURCE_PART_PATH);
manifest.files[DELTA_FILE] = fileRecord(DELTA_PATH);
manifest.files['coverage-matrix.json'] = fileRecord(COVERAGE_PATH);
writeJson(MANIFEST_PATH, manifest);

const replacements = [
  ['public-source receipts                         79', 'public-source receipts                         86'],
  ['transaction or investment observations         17', 'transaction or investment observations         17\noff-roster public-claim candidates                 9'],
  ['- `transactions.jsonl` separates eleven dated counterparty or syndicated financing announcements from six undated firm-self-represented investment observations.', '- `transactions.jsonl` separates eleven dated counterparty or syndicated financing announcements from six undated firm-self-represented investment observations.\n- `portfolio-delta-candidates.jsonl` preserves nine public backing or transaction claims that are absent from the frozen current Portfolio Universe page without admitting them as current-page members.']
];
for (const [from, to] of replacements) {
  if (!readme.includes(from)) fail(`README boundary missing: ${from}`);
  readme = readme.replace(from, to);
}
const continuationAnchor = 'The checked-in frontier now directs the next bounded pass toward the complete BVVC vehicle denominator';
if (!readme.includes(continuationAnchor)) fail('README continuation anchor missing');
readme = readme.replace(
  continuationAnchor,
  'The off-roster delta now proves that the frozen current Portfolio Universe page is not a complete ledger of all public firm and counterparty backing claims. It preserves the discrepancy as an acquisition state rather than silently expanding current membership.\n\n' + continuationAnchor
);
fs.writeFileSync(README_PATH, readme);

const loadAnchor = "  const frontier = readJson(path.join(dir, 'acquisition-frontier.json'));";
if (!validator.includes(loadAnchor)) fail('validator load anchor missing');
validator = validator.replace(loadAnchor, `${loadAnchor}\n  const portfolioDelta = readJsonl(path.join(dir, 'portfolio-delta-candidates.jsonl'));`);
const countAnchor = '    acquisition_frontier_tasks: frontier.tasks.length';
if (!validator.includes(countAnchor)) fail('validator count anchor missing');
validator = validator.replace(countAnchor, `${countAnchor},\n    portfolio_delta_candidate_rows: portfolioDelta.length`);
const directCountAnchor = "  check(frontier.tasks.length === 7, 'acquisition frontier must contain 7 tasks');";
if (!validator.includes(directCountAnchor)) fail('validator direct-count anchor missing');
validator = validator.replace(
  directCountAnchor,
  `${directCountAnchor}\n  check(portfolioDelta.length === 9, 'portfolio delta must contain 9 public-claim candidates');`
);
const uniqueAnchor = "  check(unique(rejected.map(row => row.rejection_id)), 'rejection IDs must be unique');";
if (!validator.includes(uniqueAnchor)) fail('validator uniqueness anchor missing');
validator = validator.replace(
  uniqueAnchor,
  `${uniqueAnchor}\n  check(unique(portfolioDelta.map(row => row.candidate_id)), 'portfolio-delta candidate IDs must be unique');`
);
const loopAnchor = "  check(schoolhouse.demo_day_2024.hop_eligible === false, 'School.House Demo Day surface must not be hop-eligible');";
if (!validator.includes(loopAnchor)) fail('validator delta loop anchor missing');
validator = validator.replace(
  loopAnchor,
  `${loopAnchor}\n  for (const row of portfolioDelta) {\n    check(row.current_portfolio_snapshot_membership === false, \`${'${row.candidate_id}'} must remain absent from the frozen current snapshot\`);\n    check(row.current_portfolio_membership_not_admitted === true, \`${'${row.candidate_id}'} must not be admitted as a current-page member\`);\n    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', \`${'${row.candidate_id}'} must remain graph-inert\`);\n  }\n  const appliedAtomicsDelta = portfolioDelta.find(row => row.candidate_id === 'delta-applied-atomics-space-mobility');\n  check(appliedAtomicsDelta?.identity_state === 'predicate_specific_identity_unresolved', 'Applied Atomics space-mobility identity must remain unresolved');\n  check(/must_not_merge/i.test(Object.keys(appliedAtomicsDelta || {}).join(' ')), 'Applied Atomics row must carry a non-merge boundary');`
);
const receiptAnchor = '    transactions, claims, coverage';
if (!validator.includes(receiptAnchor)) fail('validator receipt anchor missing');
validator = validator.replace(receiptAnchor, '    transactions, claims, coverage, portfolioDelta');
fs.writeFileSync(VALIDATOR_PATH, validator);

const receipt = {
  schema_version: 'bvvc-off-roster-public-claims-delta-receipt@1',
  as_of: '2026-08-04',
  base_source_inventory_rows: 79,
  result_source_inventory_rows: 86,
  frozen_current_portfolio_rows: 30,
  off_roster_candidate_rows: candidates.length,
  current_portfolio_memberships_created: 0,
  ownership_findings: 0,
  governance_right_findings: 0,
  transaction_to_vehicle_joins: 0,
  private_support_rows: 0,
  outside_human_dependency: false,
  graph_effect: 'none',
  promotes_to: 'candidate_only'
};
writeJson(RECEIPT_PATH, receipt);

console.log(JSON.stringify(receipt));
