#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ALLOWED_STATUSES = new Set(['active', 'staged', 'proposed', 'support_only', 'suspended', 'retired']);
const ALLOWED_KINDS = new Set(['case', 'corpus', 'source_plane', 'support_only']);
const ALLOWED_METHODS = new Set(['source_complete', 'rule_based_universe', 'matched_comparator', 'support_only']);
const ALLOWED_DENOMINATORS = new Set(['exact', 'approximate', 'open', 'not_applicable']);
const DATE = /^\d{4}-\d{2}-\d{2}$/;

function issue(code, file, message) {
  return { code, file: file.replaceAll('\\', '/'), message };
}

function readJson(root, relativePath, errors) {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
  } catch (error) {
    errors.push(issue('unreadable-selection-file', relativePath, error.message));
    return null;
  }
}

function readJsonl(root, relativePath, errors) {
  try {
    return fs.readFileSync(path.join(root, relativePath), 'utf8')
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line, index) => {
        try { return JSON.parse(line); }
        catch (error) {
          errors.push(issue('invalid-selection-jsonl', relativePath, `line ${index + 1}: ${error.message}`));
          return null;
        }
      })
      .filter(Boolean);
  } catch (error) {
    errors.push(issue('unreadable-selection-file', relativePath, error.message));
    return [];
  }
}

function nonempty(value, minimum = 1) {
  return typeof value === 'string' && value.trim().length >= minimum;
}

export function validateCorpusSelection({
  root = process.cwd(),
  charterFile = 'BUILD-INSTRUCTIONS.md',
  selectionFile = 'data/canonical/corpus-selection.json',
  coverageFile = 'data/research/corpus-coverage.json',
  seedsFile = 'data/research/public-interest-discovery-seeds.jsonl',
} = {}) {
  const errors = [];
  let charter = '';
  try { charter = fs.readFileSync(path.join(root, charterFile), 'utf8'); }
  catch (error) { errors.push(issue('unreadable-selection-file', charterFile, error.message)); }
  if (!/1\.10 \*\*Selection-layer neutrality is constitutional\.\*\*/.test(charter)) {
    errors.push(issue('missing-selection-invariant', charterFile, 'Section 1 must contain the selection-layer neutrality invariant.'));
  }
  if (!/validate:selection/.test(charter)) {
    errors.push(issue('missing-selection-gate', charterFile, 'The charter must name validate:selection as the selection-layer gate.'));
  }

  const selection = readJson(root, selectionFile, errors);
  const coverage = readJson(root, coverageFile, errors);
  const seeds = readJsonl(root, seedsFile, errors);
  if (!selection || !coverage) return { ok: false, errors };
  if (selection.schema_version !== 'corpus-selection@1') {
    errors.push(issue('selection-schema-version', selectionFile, 'Expected corpus-selection@1.'));
  }
  if (coverage.schema_version !== 'corpus-coverage@1') {
    errors.push(issue('coverage-schema-version', coverageFile, 'Expected corpus-coverage@1.'));
  }

  const lanes = Array.isArray(selection.lanes) ? selection.lanes : [];
  const coverageRows = Array.isArray(coverage.lanes) ? coverage.lanes : [];
  const laneById = new Map();
  const coverageById = new Map();
  const gapIds = new Set();

  for (const lane of lanes) {
    const id = lane?.lane_id;
    if (!nonempty(id) || laneById.has(id)) {
      errors.push(issue('duplicate-selection-lane', selectionFile, `Missing or duplicate lane_id: ${JSON.stringify(id)}.`));
      continue;
    }
    laneById.set(id, lane);
    if (!ALLOWED_KINDS.has(lane.lane_kind)) errors.push(issue('invalid-lane-kind', selectionFile, `${id}: invalid lane_kind.`));
    if (!ALLOWED_STATUSES.has(lane.status)) errors.push(issue('invalid-lane-status', selectionFile, `${id}: invalid status.`));
    if (!nonempty(lane.public_interest_question, 50)) errors.push(issue('missing-public-interest-question', selectionFile, `${id}: public-interest question is missing or too weak.`));
    if (!nonempty(lane.selection_unit, 20) || !nonempty(lane.selection_universe, 30)) {
      errors.push(issue('missing-selection-universe', selectionFile, `${id}: selection unit and universe are required.`));
    }
    if (!Array.isArray(lane.inclusion_rules) || lane.inclusion_rules.length < 2) errors.push(issue('missing-inclusion-rules', selectionFile, `${id}: at least two inclusion rules are required.`));
    if (!Array.isArray(lane.exclusion_rules) || lane.exclusion_rules.length < 2) errors.push(issue('missing-exclusion-rules', selectionFile, `${id}: at least two exclusion rules are required.`));
    if (!lane.comparison || !ALLOWED_METHODS.has(lane.comparison.method)
      || !nonempty(lane.comparison.comparator_class, 15) || !nonempty(lane.comparison.symmetry_rule, 40)) {
      errors.push(issue('missing-comparison', selectionFile, `${id}: comparison method, class, and symmetry rule are required.`));
    }
    if (!Array.isArray(lane.sources) || lane.sources.length === 0
      || lane.sources.some(source => !nonempty(source.source_id) || !nonempty(source.source_class) || !nonempty(source.url))) {
      errors.push(issue('missing-selection-sources', selectionFile, `${id}: at least one addressable source family is required.`));
    }
    if (!lane.privacy || !nonempty(lane.privacy.risk)
      || !Array.isArray(lane.privacy.controls) || lane.privacy.controls.length < 2) {
      errors.push(issue('missing-selection-privacy', selectionFile, `${id}: privacy risk and at least two controls are required.`));
    }
    if (typeof lane.replicability?.public_reproducible !== 'boolean'
      || typeof lane.replicability?.counts_toward_public_coverage !== 'boolean') {
      errors.push(issue('missing-selection-replicability', selectionFile, `${id}: public reproducibility and coverage accounting must be explicit.`));
    }
    if (!DATE.test(lane.review?.last_reviewed_at ?? '') || !DATE.test(lane.review?.review_by ?? '')
      || !nonempty(lane.review?.sunset_condition, 30)) {
      errors.push(issue('missing-selection-review', selectionFile, `${id}: dated review and sunset condition are required.`));
    }
    if (lane.graph_effect !== 'none') errors.push(issue('selection-graph-effect', selectionFile, `${id}: selection declarations must have graph_effect: none.`));
    if (lane.lane_kind === 'support_only' || lane.status === 'support_only') {
      if (lane.comparison?.method !== 'support_only') errors.push(issue('support-only-comparison', selectionFile, `${id}: support-only lanes require support_only comparison.`));
      if (lane.replicability?.counts_toward_public_coverage !== false) errors.push(issue('support-only-public-progress', selectionFile, `${id}: private support cannot count toward public coverage.`));
      if (lane.replicability?.public_reproducible !== false) errors.push(issue('support-only-reproducibility', selectionFile, `${id}: private support must not claim public reproducibility.`));
    } else if (lane.comparison?.method === 'support_only') {
      errors.push(issue('public-lane-support-only', selectionFile, `${id}: public lane cannot evade comparison as support-only.`));
    }
  }

  for (const row of coverageRows) {
    const id = row?.lane_id;
    if (!nonempty(id) || coverageById.has(id)) {
      errors.push(issue('duplicate-coverage-lane', coverageFile, `Missing or duplicate coverage lane_id: ${JSON.stringify(id)}.`));
      continue;
    }
    coverageById.set(id, row);
    if (typeof row.counts_toward_public_progress !== 'boolean') errors.push(issue('missing-progress-accounting', coverageFile, `${id}: public progress accounting must be explicit.`));
    if (!Array.isArray(row.metrics) || row.metrics.length === 0) errors.push(issue('missing-coverage-metrics', coverageFile, `${id}: at least one metric is required.`));
    let incompleteBoundedMetric = false;
    for (const metric of row.metrics ?? []) {
      if (!nonempty(metric.metric_id) || !nonempty(metric.unit) || !ALLOWED_DENOMINATORS.has(metric.denominator_kind)) {
        errors.push(issue('invalid-coverage-metric', coverageFile, `${id}: malformed coverage metric.`));
        continue;
      }
      if (!Number.isFinite(metric.observed) || metric.observed < 0) errors.push(issue('invalid-coverage-count', coverageFile, `${id}/${metric.metric_id}: observed must be non-negative.`));
      if (metric.expected !== null && (!Number.isFinite(metric.expected) || metric.expected < 0)) errors.push(issue('invalid-coverage-count', coverageFile, `${id}/${metric.metric_id}: expected must be null or non-negative.`));
      if (metric.denominator_kind === 'exact' && Number.isFinite(metric.expected) && metric.observed > metric.expected) {
        errors.push(issue('coverage-exceeds-exact-denominator', coverageFile, `${id}/${metric.metric_id}: observed exceeds exact expected count.`));
      }
      if (['exact', 'approximate'].includes(metric.denominator_kind) && Number.isFinite(metric.expected) && metric.observed < metric.expected) incompleteBoundedMetric = true;
      if (row.counts_toward_public_progress === false && metric.publicly_reproducible === false
        && metric.counts_toward_public_progress !== false) {
        errors.push(issue('private-metric-public-progress', coverageFile, `${id}/${metric.metric_id}: nonpublic metric must explicitly opt out of public progress.`));
      }
    }
    if (!Array.isArray(row.known_gaps) || row.known_gaps.length === 0) {
      errors.push(issue('unmeasured-coverage-gap', coverageFile, `${id}: every lane must state at least one current gap or terminal boundary.`));
    }
    if (incompleteBoundedMetric && !(row.known_gaps ?? []).some(gap => ['open', 'blocking', 'permanent_boundary'].includes(gap.status))) {
      errors.push(issue('unmeasured-coverage-gap', coverageFile, `${id}: incomplete bounded metrics require an open, blocking, or permanent gap.`));
    }
    for (const gap of row.known_gaps ?? []) {
      if (!nonempty(gap.gap_id) || gapIds.has(gap.gap_id)) errors.push(issue('duplicate-coverage-gap', coverageFile, `${id}: missing or duplicate gap_id.`));
      else gapIds.add(gap.gap_id);
      if (!nonempty(gap.description, 30) || !nonempty(gap.next_action, 25)) errors.push(issue('weak-coverage-gap', coverageFile, `${id}/${gap.gap_id}: description and bounded next action are required.`));
    }
  }

  const selectionIds = [...laneById.keys()].sort();
  const coverageIds = [...coverageById.keys()].sort();
  if (JSON.stringify(selectionIds) !== JSON.stringify(coverageIds)) {
    errors.push(issue('selection-coverage-mismatch', coverageFile, 'Selection and coverage registries must declare the same lane IDs.'));
  }
  for (const [id, lane] of laneById) {
    const row = coverageById.get(id);
    if (!row) continue;
    const selectionCounts = lane.replicability?.counts_toward_public_coverage;
    if (selectionCounts !== row.counts_toward_public_progress) {
      errors.push(issue('progress-accounting-mismatch', coverageFile, `${id}: selection and coverage progress accounting disagree.`));
    }
  }

  const topicOwners = new Map();
  for (const lane of lanes) {
    for (const topic of lane.seed_topics ?? []) {
      if (!topicOwners.has(topic)) topicOwners.set(topic, []);
      topicOwners.get(topic).push(lane.lane_id);
    }
  }
  for (const topic of new Set(seeds.map(seed => seed.topic))) {
    const owners = topicOwners.get(topic) ?? [];
    if (owners.length !== 1) errors.push(issue('undeclared-seed-topic', selectionFile, `Seed topic ${topic} must map to exactly one selection lane; found ${owners.length}.`));
  }

  return { ok: errors.length === 0, errors };
}

export function formatCorpusSelectionErrors(errors) {
  return errors.map(error => `- [${error.code}] ${error.file}: ${error.message}`).join('\n');
}

const invoked = process.argv[1] ? path.resolve(process.argv[1]) : '';
if (invoked === fileURLToPath(import.meta.url)) {
  const root = process.argv[2] ? path.resolve(process.argv[2]) : process.cwd();
  const result = validateCorpusSelection({ root });
  if (!result.ok) {
    console.error(`Corpus selection contract failed with ${result.errors.length} error(s):\n${formatCorpusSelectionErrors(result.errors)}`);
    process.exitCode = 1;
  } else {
    console.log('Corpus selection contract: OK');
  }
}

