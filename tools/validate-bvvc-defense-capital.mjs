import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DEFAULT_DIR = 'data/intake/bvvc-defense-capital';

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${file}:${index + 1}: ${error.message}`);
    }
  });
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');

function collectReceiptIds(value, out = []) {
  if (Array.isArray(value)) {
    for (const item of value) collectReceiptIds(item, out);
    return out;
  }
  if (!value || typeof value !== 'object') return out;
  for (const [key, item] of Object.entries(value)) {
    if (key === 'receipt_id' && typeof item === 'string') out.push(item);
    else if (key === 'receipt_ids' && Array.isArray(item)) {
      for (const id of item) if (typeof id === 'string') out.push(id);
    } else collectReceiptIds(item, out);
  }
  return out;
}

function unique(values) {
  return new Set(values).size === values.length;
}

export function validateBVVCDefenseCapital(dir = DEFAULT_DIR) {
  const errors = [];
  const check = (condition, message) => {
    if (!condition) errors.push(message);
  };

  const manifest = readJson(path.join(dir, 'manifest.json'));
  const sourceInventory = manifest.storage_contract.source_inventory_parts.flatMap(file => readJsonl(path.join(dir, file)));
  const leadership = manifest.storage_contract.leadership_current_parts.flatMap(file => readJsonl(path.join(dir, file)));
  const leadershipHistory = readJsonl(path.join(dir, 'leadership-history.jsonl'));
  const portfolio = manifest.storage_contract.portfolio_current_parts.flatMap(file => readJsonl(path.join(dir, file)));
  const schoolhouse = readJson(path.join(dir, 'schoolhouse.json'));
  const vehicles = readJsonl(path.join(dir, 'vehicles-offerings.jsonl'));
  const transactions = readJsonl(path.join(dir, 'transactions.jsonl'));
  const claims = readJsonl(path.join(dir, 'institutional-claims.jsonl'));
  const rejected = readJsonl(path.join(dir, 'rejected-joins.jsonl'));
  const coverage = readJson(path.join(dir, 'coverage-matrix.json'));
  const frontier = readJson(path.join(dir, 'acquisition-frontier.json'));
  const portfolioDelta = readJsonl(path.join(dir, 'portfolio-delta-candidates.jsonl'));
  const secRouteResults = readJsonl(path.join(dir, 'sec-form-d-route-results.jsonl'));
  const secRouteCustody = readJson(path.join(dir, 'sec-form-d-route-custody.json'));

  check(manifest.schema_version === 'bvvc-defense-capital-manifest@2', 'manifest schema must be v2');
  check(manifest.graph_effect === 'none' && manifest.promotes_to === 'candidate_only', 'manifest must remain graph-inert candidate custody');
  check(manifest.counts.private_support_rows === 0, 'private support rows must remain zero');
  check(manifest.counts.public_graph_rows_created === 0, 'public graph rows created must remain zero');

  const countChecks = {
    source_inventory_rows: sourceInventory.length,
    leadership_current_rows: leadership.length,
    leadership_historical_only_rows: leadershipHistory.length,
    portfolio_current_rows: portfolio.length,
    schoolhouse_faculty_rows: schoolhouse.faculty_surface.rows.length,
    schoolhouse_demo_day_company_rows: schoolhouse.demo_day_2024.companies.length,
    schoolhouse_demo_day_panelist_rows: schoolhouse.demo_day_2024.panelists.length,
    schoolhouse_demo_day_sponsor_partner_rows: schoolhouse.demo_day_2024.sponsors_and_partners.length,
    schoolhouse_demo_day_organizer_rows: schoolhouse.demo_day_2024.tagged_organizers.length,
    schoolhouse_visible_employee_rows: schoolhouse.linkedin_public_company_profile.visible_employees.length,
    vehicle_and_related_entity_rows: vehicles.length,
    transaction_and_investment_observation_rows: transactions.length,
    institutional_self_claim_rows: claims.length,
    rejected_join_rows: rejected.length,
    coverage_denominator_rows: coverage.denominators.length,
    explicit_gap_rows: coverage.explicit_nulls_and_gaps.length,
    acquisition_frontier_tasks: frontier.tasks.length,
    portfolio_delta_candidate_rows: portfolioDelta.length,
    sec_form_d_acquisition_attempts: secRouteCustody.official_route_attempts.length,
    sec_form_d_route_result_rows: secRouteResults.length
  };
  for (const [key, actual] of Object.entries(countChecks)) {
    check(manifest.counts[key] === actual, `manifest count drift for ${key}: expected ${manifest.counts[key]}, got ${actual}`);
  }

  check(leadership.length === 27, 'current leadership denominator must contain 27 rows');
  check(portfolio.length === 30, 'current Portfolio Universe denominator must contain 30 rows');
  check(schoolhouse.faculty_surface.rows.length === 18, 'School.House faculty denominator must contain 18 rows');
  check(schoolhouse.demo_day_2024.companies.length === 20, '2024 Demo Day must contain 20 company rows');
  check(schoolhouse.demo_day_2024.panelists.length === 6, '2024 Demo Day must contain 6 panelists');
  check(schoolhouse.demo_day_2024.sponsors_and_partners.length === 9, '2024 Demo Day must contain 9 sponsors and partners');
  check(vehicles.length === 7, 'vehicle plane must contain 7 filed or filed-related entity rows');
  check(transactions.length === 17, 'transaction plane must contain 17 typed observations');
  check(rejected.length === 16, 'rejected-join ledger must contain 16 rows');
  check(frontier.tasks.length === 7, 'acquisition frontier must contain 7 tasks');
  check(portfolioDelta.length === 9, 'portfolio delta must contain 9 public-claim candidates');
  check(secRouteCustody.official_route_attempts.length === 3, 'SEC route custody must contain 3 bounded attempts');
  check(secRouteResults.length === 95, 'SEC route-result denominator must contain 95 rows');

  check(unique(leadership.map(row => row.actor_id)), 'leadership actor IDs must be unique');
  check(unique(portfolio.map(row => row.organization_id)), 'portfolio organization IDs must be unique');
  check(unique(sourceInventory.map(row => row.receipt_id)), 'receipt IDs must be unique');
  check(unique(transactions.map(row => row.transaction_id)), 'transaction IDs must be unique');
  check(unique(rejected.map(row => row.rejection_id)), 'rejection IDs must be unique');
  check(unique(portfolioDelta.map(row => row.candidate_id)), 'portfolio-delta candidate IDs must be unique');
  check(unique(secRouteResults.map(row => row.route_id)), 'SEC route-result IDs must be unique');

  for (const row of leadership) {
    check(row.surface_population === 27, `${row.actor_id} must carry the 27-row denominator`);
    check(row.current_listing === true, `${row.actor_id} must remain a current-listing observation`);
    check(row.hop_eligible === false, `${row.actor_id} leadership roster row must not be hop-eligible`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.actor_id} must remain graph-inert`);
  }
  for (const row of portfolio) {
    check(row.surface_population === 30, `${row.organization_id} must carry the 30-row denominator`);
    check(row.current_listing === true, `${row.organization_id} must remain a current-listing observation`);
    check(row.hop_eligible === false, `${row.organization_id} portfolio roster row must not be hop-eligible`);
    check(row.ownership_state === 'not_established', `${row.organization_id} must not infer ownership`);
    check(row.governance_rights_state === 'not_established', `${row.organization_id} must not infer governance rights`);
    check(row.vehicle_join_state === 'not_established', `${row.organization_id} must not infer a vehicle join`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.organization_id} must remain graph-inert`);
  }
  check(schoolhouse.faculty_surface.hop_eligible === false, 'School.House faculty surface must not be hop-eligible');
  check(schoolhouse.demo_day_2024.hop_eligible === false, 'School.House Demo Day surface must not be hop-eligible');
  for (const row of portfolioDelta) {
    check(row.current_portfolio_snapshot_membership === false, `${row.candidate_id} must remain absent from the frozen current snapshot`);
    check(row.current_portfolio_membership_not_admitted === true, `${row.candidate_id} must not be admitted as a current-page member`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.candidate_id} must remain graph-inert`);
  }
  const appliedAtomicsDelta = portfolioDelta.find(row => row.candidate_id === 'delta-applied-atomics-space-mobility');
  check(appliedAtomicsDelta?.identity_state === 'predicate_specific_identity_unresolved', 'Applied Atomics space-mobility identity must remain unresolved');
  check(/must_not_merge/i.test(Object.keys(appliedAtomicsDelta || {}).join(' ')), 'Applied Atomics row must carry a non-merge boundary');
  check(secRouteCustody.counts.route_result_rows === 95, 'SEC custody route count must be 95');
  check(secRouteCustody.counts.source_rows_acquired === 0, 'SEC route attempts must not invent source rows');
  check(secRouteCustody.interpretation.source_failure_is_not_absence === true, 'SEC route custody must preserve source-failure boundary');
  check(secRouteCustody.graph_effect === 'none' && secRouteCustody.promotes_to === 'candidate_only', 'SEC route custody must remain graph-inert');
  for (const row of secRouteResults) {
    check(row.state === 'source_unavailable_after_search', `${row.route_id} must preserve the source-unavailable state`);
    check(row.http_status === 403, `${row.route_id} must preserve HTTP 403`);
    check(row.result_rows === 0, `${row.route_id} must preserve zero acquired rows`);
    check(row.absence_claim_permitted === false, `${row.route_id} must refuse absence inference`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.route_id} must remain graph-inert`);
  }

  for (const row of vehicles) {
    check(row.portfolio_transaction_join_state === 'not_established', `${row.row_id} must not infer a portfolio transaction join`);
    check(/SEC has not necessarily reviewed/i.test(row.sec_caveat), `${row.row_id} must carry the SEC accuracy caveat`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.row_id} must remain graph-inert`);
  }
  for (const row of transactions) {
    check(Object.hasOwn(row, 'announced_round_amount'), `${row.transaction_id} must explicitly carry announced_round_amount`);
    check(row.transaction_to_vehicle_join_state === 'not_established', `${row.transaction_id} must not infer a vehicle join`);
    check(row.ownership_state === 'not_established', `${row.transaction_id} must not infer ownership`);
    check(row.governance_rights_state === 'not_established', `${row.transaction_id} must not infer governance rights`);
    check(row.graph_effect === 'none' && row.promotes_to === 'candidate_only', `${row.transaction_id} must remain graph-inert`);
    if (row.announced_round_amount !== null) {
      check(typeof row.announced_round_amount.value === 'number', `${row.transaction_id} amount must be numeric`);
      check(typeof row.announced_round_amount.currency === 'string', `${row.transaction_id} currency must be explicit`);
    }
  }

  check(rejected.some(row => row.rejection_id === 'reject-shield-ai'), 'Shield AI unsupported join must remain explicitly rejected');
  check(rejected.some(row => row.rejection_id === 'reject-private-dm-public-evidence'), 'private-message public-evidence join must remain explicitly rejected');
  check(rejected.every(row => row.disposition === 'not_admitted'), 'every rejected join must remain not_admitted');

  for (const task of frontier.tasks) {
    check(task.outside_human_dependency === false, `${task.task_id} must not depend on an outside human`);
    check(task.graph_effect === 'none' && task.promotes_to === 'candidate_only', `${task.task_id} must remain graph-inert`);
    check(Boolean(task.stopping_rule), `${task.task_id} must have a stopping rule`);
    check(Boolean(task.forbidden_inference), `${task.task_id} must carry a forbidden inference`);
  }

  const forbiddenLocatorFragments = ['linkedin.com/messaging', 'private-user-images', 'file://', '/mnt/data/'];
  for (const receipt of sourceInventory) {
    check(receipt.graph_effect === 'none' && receipt.promotes_to === 'candidate_only', `${receipt.receipt_id} must remain graph-inert`);
    check(typeof receipt.locator_url === 'string' && /^https:\/\//.test(receipt.locator_url), `${receipt.receipt_id} must have a public HTTPS locator`);
    for (const fragment of forbiddenLocatorFragments) {
      check(!receipt.locator_url.includes(fragment), `${receipt.receipt_id} contains forbidden private locator fragment ${fragment}`);
    }
  }

  const knownReceiptIds = new Set(sourceInventory.map(row => row.receipt_id));
  const referencedReceiptIds = collectReceiptIds([
    leadership, leadershipHistory, portfolio, schoolhouse, vehicles,
    transactions, claims, coverage, portfolioDelta
  ]);
  for (const receiptId of referencedReceiptIds) {
    check(knownReceiptIds.has(receiptId), `referenced receipt is missing from source inventory: ${receiptId}`);
  }

  for (const [filename, expected] of Object.entries(manifest.files)) {
    const file = path.join(dir, filename);
    check(fs.existsSync(file), `manifest-bound file missing: ${filename}`);
    if (fs.existsSync(file)) {
      check(fs.statSync(file).size === expected.bytes, `${filename} byte-count drift`);
      check(sha256(file) === expected.sha256, `${filename} SHA-256 drift`);
    }
  }

  return errors;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const dir = process.argv[2] || DEFAULT_DIR;
  const errors = validateBVVCDefenseCapital(dir);
  if (errors.length) {
    for (const error of errors) console.error(`ERROR: ${error}`);
    process.exit(1);
  }
  console.log('BVVC defense-capital public-source lake: PASS');
}
