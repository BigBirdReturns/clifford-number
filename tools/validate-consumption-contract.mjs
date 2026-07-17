#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const COMPLETE_STATUS = 'cleared';

function issue(code, file, message) {
  return { code, file: file.replaceAll('\\', '/'), message };
}

function readJson(root, relativePath, errors) {
  try { return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8')); }
  catch (error) {
    errors.push(issue('unreadable-consumption-file', relativePath, error.message));
    return null;
  }
}

function nonempty(value, minimum = 1) {
  return typeof value === 'string' && value.trim().length >= minimum;
}

function uniqueIndex(rows, key, file, code, errors) {
  const index = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = row?.[key];
    if (!nonempty(id) || index.has(id)) errors.push(issue(code, file, `Missing or duplicate ${key}: ${JSON.stringify(id)}.`));
    else index.set(id, row);
  }
  return index;
}

export function validateConsumptionContract({
  root = process.cwd(),
  charterFile = 'BUILD-INSTRUCTIONS.md',
  contractsFile = 'data/canonical/consumption-contracts.json',
  selectionFile = 'data/canonical/corpus-selection.json',
  coverageFile = 'data/research/corpus-coverage.json',
  reviewsFile = 'data/research/selection-adversarial-reviews.json',
} = {}) {
  const errors = [];
  let charter = '';
  try { charter = fs.readFileSync(path.join(root, charterFile), 'utf8'); }
  catch (error) { errors.push(issue('unreadable-consumption-file', charterFile, error.message)); }
  if (!/1\.11 \*\*The interpretation contract travels with the data\.\*\*/.test(charter)) {
    errors.push(issue('missing-consumption-invariant', charterFile, 'Section 1 must require the interpretation contract to travel with data.'));
  }
  if (!/validate:consumption/.test(charter)) {
    errors.push(issue('missing-consumption-gate', charterFile, 'The charter must name validate:consumption as the consumption-layer gate.'));
  }

  const registry = readJson(root, contractsFile, errors);
  const selection = readJson(root, selectionFile, errors);
  const coverage = readJson(root, coverageFile, errors);
  const reviewLedger = readJson(root, reviewsFile, errors);
  if (!registry || !selection || !coverage || !reviewLedger) return { ok: false, errors };

  if (registry.schema_version !== 'consumption-contracts@1') errors.push(issue('consumption-schema-version', contractsFile, 'Expected consumption-contracts@1.'));
  if (reviewLedger.schema_version !== 'selection-adversarial-reviews@1') errors.push(issue('review-schema-version', reviewsFile, 'Expected selection-adversarial-reviews@1.'));

  const contractById = uniqueIndex(registry.contracts, 'contract_id', contractsFile, 'duplicate-consumption-contract', errors);
  for (const [id, contract] of contractById) {
    if (typeof contract.export_allowed !== 'boolean') errors.push(issue('invalid-consumption-contract', contractsFile, `${id}: export_allowed must be boolean.`));
    for (const field of ['what_this_is', 'what_this_is_not', 'copy_ready_caveat', 'denominator_rule', 'redistribution_rule']) {
      if (!nonempty(contract[field], 40)) errors.push(issue('invalid-consumption-contract', contractsFile, `${id}: ${field} is missing or too weak.`));
    }
    if (!Array.isArray(contract.prohibited_inferences) || contract.prohibited_inferences.length < 4) {
      errors.push(issue('invalid-consumption-contract', contractsFile, `${id}: at least four prohibited inferences are required.`));
    }
  }

  const publicContract = contractById.get('public-topology-map@1');
  if (!publicContract || !/not a finding/i.test(publicContract.copy_ready_caveat ?? '')
    || !/not evidence/i.test(publicContract.copy_ready_caveat ?? '')
    || !/denominator/i.test(publicContract.copy_ready_caveat ?? '')) {
    errors.push(issue('denominator-caveat-missing', contractsFile, 'The public copy-ready caveat must say the map is not a finding and the denominator is not evidence.'));
  }
  const privateContract = contractById.get('private-support-only@1');
  if (!privateContract || privateContract.export_allowed !== false || !/not public evidence/i.test(privateContract.copy_ready_caveat ?? '')) {
    errors.push(issue('private-export-boundary-missing', contractsFile, 'Private support must be non-exportable and explicitly not public evidence.'));
  }

  const allowedStatuses = new Set(reviewLedger.protocol?.allowed_statuses ?? []);
  const allowedPublicationStatuses = new Set(reviewLedger.protocol?.allowed_publication_statuses ?? []);
  if (!nonempty(reviewLedger.protocol?.clearing_rule, 80)
    || !Array.isArray(reviewLedger.protocol?.required_challenges)
    || reviewLedger.protocol.required_challenges.length < 4) {
    errors.push(issue('weak-adversarial-protocol', reviewsFile, 'The protocol needs a clearing rule and at least four required challenges.'));
  }

  const reviewById = uniqueIndex(reviewLedger.reviews, 'review_id', reviewsFile, 'duplicate-selection-review', errors);
  const reviewByLane = new Map();
  for (const review of reviewById.values()) {
    if (!nonempty(review.lane_id) || reviewByLane.has(review.lane_id)) {
      errors.push(issue('duplicate-lane-review', reviewsFile, `Missing or duplicate lane review for ${JSON.stringify(review.lane_id)}.`));
      continue;
    }
    reviewByLane.set(review.lane_id, review);
    if (!allowedStatuses.has(review.status)) errors.push(issue('invalid-review-status', reviewsFile, `${review.review_id}: invalid status ${review.status}.`));
    if (!allowedPublicationStatuses.has(review.publication_status)) errors.push(issue('invalid-publication-status', reviewsFile, `${review.review_id}: invalid publication_status ${review.publication_status}.`));
    if (!DATE.test(review.review_due ?? '')) errors.push(issue('invalid-review-date', reviewsFile, `${review.review_id}: review_due must be YYYY-MM-DD.`));
    if (!Array.isArray(review.known_boundary_risks) || review.known_boundary_risks.length === 0) errors.push(issue('missing-boundary-risks', reviewsFile, `${review.review_id}: known boundary risks are required.`));
    if (!nonempty(review.disposition, 40)) errors.push(issue('missing-review-disposition', reviewsFile, `${review.review_id}: a bounded disposition is required.`));

    if (review.status === COMPLETE_STATUS) {
      if (!nonempty(review.author_id) || !nonempty(review.reviewer_id) || review.author_id === review.reviewer_id) {
        errors.push(issue('self-review-cleared', reviewsFile, `${review.review_id}: cleared review requires a distinct author and reviewer.`));
      }
      if (!Array.isArray(review.boundary_attacks) || review.boundary_attacks.length < 2
        || !Array.isArray(review.alternative_universes) || review.alternative_universes.length < 1
        || !Array.isArray(review.comparator_tests) || review.comparator_tests.length < 1) {
        errors.push(issue('incomplete-adversarial-review', reviewsFile, `${review.review_id}: cleared review lacks attacks, an alternative universe, or comparator testing.`));
      }
    } else if (review.publication_status === 'cleared') {
      errors.push(issue('pending-review-cleared', reviewsFile, `${review.review_id}: ${review.status} review cannot be represented as publication-cleared.`));
    }
  }

  const selectionByLane = uniqueIndex(selection.lanes, 'lane_id', selectionFile, 'duplicate-selection-lane', errors);
  const coverageByLane = uniqueIndex(coverage.lanes, 'lane_id', coverageFile, 'duplicate-coverage-lane', errors);
  const expectedFields = ['what_this_is', 'what_this_is_not', 'copy_ready_caveat'];

  for (const [laneId, lane] of selectionByLane) {
    const coverageRow = coverageByLane.get(laneId);
    const review = reviewByLane.get(laneId);
    if (!coverageRow) errors.push(issue('missing-coverage-consumption', coverageFile, `${laneId}: coverage row is missing.`));
    if (!review) errors.push(issue('missing-adversarial-review', reviewsFile, `${laneId}: one adversarial review record is required.`));
    const objects = [[selectionFile, lane.consumption], [coverageFile, coverageRow?.consumption]];
    for (const [file, consumption] of objects) {
      if (!consumption || !nonempty(consumption.contract_id) || !nonempty(consumption.selection_review_id)) {
        errors.push(issue('detached-consumption-contract', file, `${laneId}: contract and review identifiers must travel with the row.`));
        continue;
      }
      const contract = contractById.get(consumption.contract_id);
      if (!contract) {
        errors.push(issue('unknown-consumption-contract', file, `${laneId}: unknown contract ${consumption.contract_id}.`));
        continue;
      }
      for (const field of expectedFields) {
        if (consumption[field] !== contract[field]) errors.push(issue('detached-consumption-contract', file, `${laneId}: ${field} must be an exact attached copy of ${contract.contract_id}.`));
      }
      if (consumption.selection_review_id !== review?.review_id || consumption.selection_review_status !== review?.status) {
        errors.push(issue('stale-selection-review-status', file, `${laneId}: attached review identifier/status does not match the review ledger.`));
      }
    }
    if (lane.lane_kind === 'support_only') {
      if (lane.consumption?.contract_id !== 'private-support-only@1' || review?.publication_status !== 'support_only') {
        errors.push(issue('private-consumption-mismatch', selectionFile, `${laneId}: support-only lane requires the private contract and support-only publication status.`));
      }
    } else {
      if (lane.consumption?.contract_id !== 'public-topology-map@1') errors.push(issue('public-consumption-mismatch', selectionFile, `${laneId}: public lane requires public-topology-map@1.`));
      if (['proposed', 'staged'].includes(lane.status) && review?.status !== COMPLETE_STATUS && review?.publication_status !== 'blocked') {
        errors.push(issue('uncleared-staged-lane-exportable', reviewsFile, `${laneId}: uncleared ${lane.status} lane must remain publication-blocked.`));
      }
      if (lane.status === 'active' && review?.status !== COMPLETE_STATUS && review?.publication_status !== 'provisional') {
        errors.push(issue('uncleared-active-lane-not-provisional', reviewsFile, `${laneId}: uncleared active lane must be visibly provisional.`));
      }
    }
    if (coverageRow?.consumption && lane.consumption
      && JSON.stringify(coverageRow.consumption) !== JSON.stringify(lane.consumption)) {
      errors.push(issue('selection-coverage-consumption-mismatch', coverageFile, `${laneId}: selection and coverage rows must carry the same contract snapshot.`));
    }
  }

  const selectionIds = [...selectionByLane.keys()].sort();
  const reviewIds = [...reviewByLane.keys()].sort();
  if (JSON.stringify(selectionIds) !== JSON.stringify(reviewIds)) {
    errors.push(issue('selection-review-mismatch', reviewsFile, 'Selection and review registries must declare the same lane IDs.'));
  }

  return { ok: errors.length === 0, errors };
}

export function formatConsumptionErrors(errors) {
  return errors.map(error => `- [${error.code}] ${error.file}: ${error.message}`).join('\n');
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = validateConsumptionContract({ root });
  if (!result.ok) {
    console.error(`Consumption contract failed with ${result.errors.length} error(s):\n${formatConsumptionErrors(result.errors)}`);
    process.exitCode = 1;
  } else {
    console.log('Consumption contract: OK');
  }
}
