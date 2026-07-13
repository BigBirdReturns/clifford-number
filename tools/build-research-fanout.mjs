#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const args = process.argv.slice(2);
const value = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index >= 0 ? args[index + 1] : fallback;
};

const batchSize = Number(value('batch-size', process.env.FANOUT_BATCH_SIZE ?? 25));
if (!Number.isInteger(batchSize) || batchSize < 1 || batchSize > 50) {
  throw new Error('--batch-size must be an integer from 1 to 50');
}

const resolveLocation = location => path.isAbsolute(location) ? location : path.join(root, location);
const readJson = location => JSON.parse(fs.readFileSync(resolveLocation(location), 'utf8'));
const readJsonl = location => fs.readFileSync(resolveLocation(location), 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map(line => JSON.parse(line));
const readOptionalJsonl = location => {
  const resolved = resolveLocation(location);
  const available = fs.existsSync(resolved);
  return {
    rows: available
      ? fs.readFileSync(resolved, 'utf8').split(/\r?\n/).filter(Boolean).map(line => JSON.parse(line))
      : [],
    availability: available ? 'available' : 'not_configured',
  };
};
const clean = value => String(value ?? '').replace(/\s+/g, ' ').trim();
const slug = value => clean(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const hash = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex').slice(0, 20);
const priorityRank = { high: 0, medium: 1, low: 2 };

const scout = readJson(process.env.SCOUT_REPORT_PATH ?? 'build/scout-report.json');
const candidates = readJsonl(process.env.CRAWL_CANDIDATES_PATH ?? 'data/crawl/candidates.jsonl');
const rejections = readJsonl(process.env.CRAWL_REJECTIONS_PATH ?? 'data/crawl/rejections.jsonl');
const crawlSources = readJson(process.env.CRAWL_SOURCES_PATH ?? 'data/crawl/sources.json');
const crawlState = readJson(process.env.CRAWL_STATE_PATH ?? 'data/crawl/state.json');
const linkedinAttentionInput = readOptionalJsonl(process.env.LINKEDIN_ATTENTION_PATH ?? 'data/local/linkedin-attention.jsonl');
const linkedinProfileCapturesInput = readOptionalJsonl(
  process.env.LINKEDIN_PROFILE_CAPTURES_PATH ?? 'data/local/linkedin-profile-captures.jsonl',
);
const publicInterestSeedsInput = readOptionalJsonl(
  process.env.PUBLIC_INTEREST_SEEDS_PATH ?? 'data/research/public-interest-discovery-seeds.jsonl',
);
const linkedinAttention = linkedinAttentionInput.rows;
const linkedinProfileCaptures = linkedinProfileCapturesInput.rows;
const publicInterestSeeds = publicInterestSeedsInput.rows;

const sourceGapStatus = source => crawlState.sources?.[source.id]?.status ?? 'not_run';
const sourceGapAvailability = status => status === 'partial' ? 'partial' : status === 'not_run' ? 'not_observed' : 'unavailable';
const crawlSourceGaps = (crawlSources.sources ?? [])
  .filter(source => source.enabled)
  .map(source => ({ source, state: crawlState.sources?.[source.id], status: sourceGapStatus(source) }))
  .filter(({ status }) => status !== 'ok');

const rejectionClass = reason => {
  const normalized = clean(reason).toLowerCase();
  if (normalized.includes('contact or address')) return 'privacy_guard';
  if (normalized.includes('relevance gate')) return 'relevance_gate';
  return 'adapter_or_normalization_error';
};
const rejectionAction = kind => {
  if (kind === 'privacy_guard') {
    return 'Confirm the privacy exclusion metadata only. Do not restore or expose contact or address data. If a public-role fact is independently relevant, recover it from a separate public source.';
  }
  if (kind === 'relevance_gate') {
    return 'Review the rejection ledger entry and, if the public record remains available, test whether the local relevance gate discarded a weak or indirect lead. Preserve the negative result or restore it only as intake; do not promote it.';
  }
  return 'Inspect the rejection metadata, retry the affected adapter or normalization step, and preserve the result as intake. A parse failure is not evidence that the underlying record or relationship is absent.';
};
const sourceGapAction = status => {
  if (status === 'skipped_missing_credential') {
    return 'Retry this source when its configured credential is available. Until then, record the coverage gap explicitly and do not interpret the missing scan as evidence of absence.';
  }
  if (status === 'partial') {
    return 'Inspect the source state, rerun the affected query window, and preserve both successful and failed portions. Partial coverage must not be interpreted as a negative result.';
  }
  if (status === 'error') {
    return 'Inspect the source state and retry the failed scan. Preserve the failure as an availability event; do not interpret it as evidence that no matching records exist.';
  }
  return 'Run this enabled source or document why it could not be run. Until a scan is observed, treat the source as an explicit coverage gap rather than a negative result.';
};

const items = [
  ...scout.findings.map(finding => {
    const core = {
      task_id: `scout:${finding.id}`,
      origin: 'surface-scout',
      lane: `scout-${slug(finding.type)}`,
      source_id: finding.id,
      type: finding.type,
      priority: finding.priority,
      title: clean(finding.title),
      observed: clean(finding.observed),
      requested_action: clean(finding.action),
      refs: [...(finding.refs ?? [])],
      evidence_layer: finding.evidence_layer ?? 'structural_signal',
      evidence_state: 'inferred',
      discovery_status: 'derived_signal',
      certainty_grade: 'machine_derived_unverified',
      source_availability: 'available',
      graph_effect: 'none',
      verification_status: 'machine_proposed_unverified',
    };
    return { ...core, fingerprint: hash(core) };
  }),
  ...candidates.map(candidate => {
    const core = {
      task_id: `crawl:${candidate.candidate_id}`,
      origin: 'official-record-crawl',
      lane: `crawl-${slug(candidate.source_id)}`,
      source_id: candidate.candidate_id,
      type: 'official_record_candidate',
      priority: candidate.priority,
      title: clean(candidate.label),
      observed: clean(`${candidate.source_id} record ${candidate.source_record_id}; matched on ${candidate.match_basis}.`),
      requested_action: clean(candidate.next_step),
      refs: [...(candidate.observation_ids ?? []), candidate.source_url].filter(Boolean),
      entity_hints: [...(candidate.entity_hints ?? [])],
      event_hints: [...(candidate.event_hints ?? [])],
      candidate_status: candidate.status,
      causal_status: candidate.causal_status,
      evidence_layer: 'documented_fact',
      evidence_state: 'observed',
      discovery_status: 'accepted_intake',
      certainty_grade: 'source_record_observed',
      source_availability: 'available',
      graph_effect: 'none',
      verification_status: 'machine_proposed_unverified',
    };
    return { ...core, fingerprint: hash(core) };
  }),
  ...rejections.map(rejection => {
    const kind = rejectionClass(rejection.reason);
    const core = {
      task_id: `crawl-rejection:${rejection.rejection_id}`,
      origin: 'official-record-crawl-rejection',
      lane: `crawl-rejection-${slug(rejection.source_id)}`,
      source_id: rejection.rejection_id,
      type: 'official_record_rejection_review',
      priority: kind === 'privacy_guard' ? 'medium' : 'low',
      title: clean(`Review held crawl observation from ${rejection.source_id}`),
      observed: clean(
        `The official-record crawler held one ${rejection.source_id} observation outside candidate intake under the ${kind} class. `
        + 'This records a filtering or adapter outcome, not evidence that the underlying fact, relationship, or pattern is absent.',
      ),
      requested_action: rejectionAction(kind),
      refs: [rejection.rejection_id, rejection.source_id].filter(Boolean),
      rejection_class: kind,
      candidate_status: 'intake_only',
      causal_status: 'not_established',
      publication_status: 'internal_intake',
      evidence_layer: 'investigative_hypothesis',
      evidence_state: 'observed',
      discovery_status: 'held_for_review',
      certainty_grade: 'rejection_metadata_observed',
      source_availability: 'unknown',
      graph_effect: 'none',
      verification_status: 'machine_proposed_unverified',
    };
    return { ...core, fingerprint: hash(core) };
  }),
  ...crawlSourceGaps.map(({ source, state, status }) => {
    const core = {
      task_id: `crawl-source-gap:${source.id}`,
      origin: 'official-record-crawl-source-gap',
      lane: 'crawl-source-coverage',
      source_id: source.id,
      type: 'official_record_source_coverage_gap',
      priority: status === 'partial' ? 'high' : 'medium',
      title: clean(`Restore crawl coverage: ${source.label ?? source.id}`),
      observed: clean(
        `The enabled ${source.id} source has crawl status ${status}. `
        + 'This records incomplete or unavailable coverage; it does not establish that no matching records exist.',
      ),
      requested_action: sourceGapAction(status),
      refs: ['data/crawl/state.json', source.id],
      source_status: status,
      source_error_count: Array.isArray(state?.errors) ? state.errors.length : 0,
      candidate_status: 'intake_only',
      causal_status: 'not_established',
      publication_status: 'internal_intake',
      evidence_layer: 'evidence_attrition',
      evidence_state: 'observed',
      discovery_status: 'coverage_gap',
      certainty_grade: 'not_observed_due_to_source_gap',
      source_availability: sourceGapAvailability(status),
      graph_effect: 'none',
      verification_status: 'machine_proposed_unverified',
    };
    return { ...core, fingerprint: hash(core) };
  }),
  ...publicInterestSeeds.map(seed => {
    const core = {
      task_id: `public-interest:${seed.seed_id}`,
      origin: 'public-interest-source-seed',
      lane: `public-interest-${slug(seed.topic)}-${slug(seed.query_kind)}`,
      source_id: seed.source_id,
      type: 'bounded_public_interest_source_query',
      priority: seed.priority,
      title: clean(seed.title).slice(0, 180),
      observed: clean(
        `The checked-in source manifest identifies ${seed.source_id} as a ${seed.source_class} source family for ${seed.topic}. `
        + 'This is a bounded research instruction, not an assertion about any named person, entity, transaction, or event.',
      ),
      requested_action: clean(seed.bounded_action),
      refs: [seed.seed_id, seed.source_id, seed.source_url].filter(Boolean),
      topic: seed.topic,
      query_kind: seed.query_kind,
      allowed_predicates: [...(seed.allowed_predicates ?? [])],
      forbidden_inferences: [...(seed.forbidden_inferences ?? [])],
      privacy_handling: clean(seed.privacy_handling),
      candidate_status: 'intake_only',
      causal_status: 'not_established',
      publication_status: 'internal_intake',
      evidence_layer: 'investigative_hypothesis',
      evidence_state: 'inferred',
      discovery_status: 'preserved_intake',
      certainty_grade: 'machine_derived_unverified',
      source_availability: seed.source_availability,
      graph_effect: 'none',
      verification_status: 'machine_proposed_unverified',
    };
    return { ...core, fingerprint: hash(core) };
  }),
  ...linkedinAttention.map(observation => {
    const hasUrl = /^https?:\/\//i.test(observation.url ?? '');
    const core = {
      task_id: `linkedin:${observation.attention_id}`,
      origin: 'linkedin-retrospective-attention',
      lane: `linkedin-${slug(observation.category)}`,
      source_id: observation.attention_id,
      type: 'retrospective_attention_candidate',
      priority: hasUrl ? 'high' : 'medium',
      title: clean(`${hasUrl ? 'LinkedIn' : 'Private LinkedIn'} ${observation.category} observation on ${observation.observed_at}`).slice(0, 180),
      observed: clean(`The member-data archive records ${observation.category} activity on ${observation.observed_at}. This proves only the member action, not the target content or a relationship among its participants.`),
      requested_action: hasUrl
        ? 'Open the exact public URL under human direction; preserve a dated viewport receipt; extract public actors, institutions, claims, and interaction counts as separately typed candidates. Do not infer coordination from reactions or comments.'
        : 'Treat this as a private search lead. Resolve it against public sources, preserve separate receipts, and do not publish the query itself without review.',
      refs: [observation.attention_id, observation.url].filter(Boolean),
      attention_category: observation.category,
      attention_observed_at: observation.observed_at,
      publication_status: observation.publication_status,
      evidence_layer: 'investigative_hypothesis',
      evidence_state: 'observed',
      discovery_status: 'preserved_intake',
      certainty_grade: 'primary_observation_limited',
      source_availability: hasUrl ? 'live_or_unknown' : 'private_preserved',
      graph_effect: 'none',
      verification_status: 'machine_proposed_unverified',
    };
    return { ...core, fingerprint: hash(core) };
  }),
  ...linkedinProfileCaptures.map(capture => {
    const label = clean(capture.subject?.label) || capture.capture_id;
    const profileUrl = clean(capture.subject?.profile_url);
    const core = {
      task_id: `linkedin-profile:${capture.capture_id}`,
      origin: 'linkedin-retrospective-profile-capture',
      lane: 'linkedin-profile-capture',
      source_id: capture.capture_id,
      type: 'retrospective_profile_capture_candidate',
      priority: 'high',
      title: clean(`Profile capture: ${label}`).slice(0, 180),
      observed: clean(
        `A preserved LinkedIn-generated PDF displayed the profile for ${label} on ${capture.observed_at}. `
        + 'This proves what the captured profile displayed at that time, not the truth of every profile claim or any relationship among named people and institutions.',
      ),
      requested_action: clean(
        'Review the preserved PDF under human direction. Extract public-role and organization claims with their stated intervals as separate candidates; compare other captures in the same series; resolve identity; and corroborate material crossings or capital/institutional links with independent public receipts. Preserve disagreement and change over time. Do not create graph edges from this intake task.',
      ),
      refs: [capture.capture_id, capture.provenance?.raw_copy, profileUrl].filter(Boolean),
      profile_series_id: capture.series_id,
      capture_observed_at: capture.observed_at,
      publication_status: capture.publication_status,
      evidence_layer: 'documented_fact',
      evidence_state: 'observed',
      discovery_status: 'preserved_intake',
      certainty_grade: 'primary_observation_limited',
      source_availability: 'private_preserved',
      graph_effect: 'none',
      verification_status: 'machine_proposed_unverified',
    };
    return { ...core, fingerprint: hash(core) };
  }),
].sort((a, b) =>
  (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9)
  || a.lane.localeCompare(b.lane)
  || a.task_id.localeCompare(b.task_id));

const outputDir = path.join(root, 'build', 'research-fanout');
fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const byLane = new Map();
for (const item of items) {
  if (!byLane.has(item.lane)) byLane.set(item.lane, []);
  byLane.get(item.lane).push(item);
}

const batches = [];
for (const [lane, laneItems] of [...byLane.entries()].sort(([a], [b]) => a.localeCompare(b))) {
  for (let offset = 0; offset < laneItems.length; offset += batchSize) {
    const batchItems = laneItems.slice(offset, offset + batchSize);
    const part = Math.floor(offset / batchSize) + 1;
    const batchId = `${lane}-${String(part).padStart(3, '0')}`;
    const batch = {
      schema_version: 'research-fanout-batch@1',
      batch_id: batchId,
      lane,
      part,
      item_count: batchItems.length,
      graph_effect: 'none',
      verification_status: 'machine_proposed_unverified',
      fingerprint: hash(batchItems.map(item => item.fingerprint)),
      items: batchItems,
    };
    const jsonPath = `build/research-fanout/${batchId}.json`;
    const markdownPath = `build/research-fanout/${batchId}.md`;
    fs.writeFileSync(path.join(root, jsonPath), `${JSON.stringify(batch, null, 2)}\n`);
    fs.writeFileSync(path.join(root, markdownPath), renderBatch(batch));
    batches.push({
      batch_id: batchId,
      lane,
      item_count: batchItems.length,
      fingerprint: batch.fingerprint,
      json_path: jsonPath,
      markdown_path: markdownPath,
    });
  }
}

const countBy = (rows, key) => Object.fromEntries(
  [...new Set(rows.map(row => row[key]))].sort().map(value => [value, rows.filter(row => row[key] === value).length]),
);
const manifest = {
  schema_version: 'research-fanout-manifest@1',
  generated: new Date().toISOString(),
  graph_effect: 'none',
  verification_status: 'machine_proposed_unverified',
  source_counts: {
    scout_findings: scout.findings.length,
    crawl_candidates: candidates.length,
    crawl_rejections: rejections.length,
    crawl_source_gaps: crawlSourceGaps.length,
    linkedin_attention: linkedinAttention.length,
    linkedin_profile_captures: linkedinProfileCaptures.length,
    public_interest_seeds: publicInterestSeeds.length,
    total: items.length,
  },
  counts_by_origin: countBy(items, 'origin'),
  counts_by_priority: countBy(items, 'priority'),
  counts_by_lane: countBy(items, 'lane'),
  counts_by_discovery_status: countBy(items, 'discovery_status'),
  counts_by_certainty_grade: countBy(items, 'certainty_grade'),
  counts_by_source_availability: countBy(items, 'source_availability'),
  counts_by_evidence_state: countBy(items, 'evidence_state'),
  input_coverage: {
    linkedin_attention: linkedinAttentionInput.availability,
    linkedin_profile_captures: linkedinProfileCapturesInput.availability,
    public_interest_seeds: publicInterestSeedsInput.availability,
  },
  batch_size: batchSize,
  batches,
  matrix: { include: batches.map(({ batch_id, markdown_path, fingerprint }) => ({ batch_id, markdown_path, fingerprint })) },
};
fs.writeFileSync(path.join(outputDir, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
console.log(`research fan-out: ${items.length} item(s) across ${batches.length} batch(es)`);
console.log(`  ${scout.findings.length} scout findings; ${candidates.length} crawl candidates; ${rejections.length} held crawl observations`);
if (crawlSourceGaps.length) console.log(`  ${crawlSourceGaps.length} official source coverage gaps`);
if (linkedinAttention.length) console.log(`  ${linkedinAttention.length} retrospective LinkedIn attention observations`);
if (linkedinProfileCaptures.length) console.log(`  ${linkedinProfileCaptures.length} retrospective LinkedIn profile captures`);
if (publicInterestSeeds.length) console.log(`  ${publicInterestSeeds.length} public-interest source seeds`);

function renderBatch(batch) {
  return [
    `# Research fan-out: ${batch.batch_id}`,
    '',
    '> Machine-proposed and unverified. `graph_effect: none`. This packet cannot edit canonical data or create a Clifford hop.',
    '',
    `- Lane: ${batch.lane}`,
    `- Items: ${batch.item_count}`,
    `- Fingerprint: \`${batch.fingerprint}\``,
    '',
    ...batch.items.flatMap(item => [
      `## ${item.task_id}: ${item.title}`,
      '',
      `- Priority: ${item.priority}`,
      `- Type: ${item.type}`,
      `- Origin: ${item.origin}`,
      `- Discovery status: ${item.discovery_status}`,
      `- Certainty: ${item.certainty_grade}`,
      `- Source availability: ${item.source_availability}`,
      `- Evidence state: ${item.evidence_state}`,
      `- Fingerprint: \`${item.fingerprint}\``,
      '',
      '**Observed**',
      '',
      item.observed,
      '',
      '**Bounded next action**',
      '',
      item.requested_action,
      '',
      item.refs.length ? `Refs: ${item.refs.map(ref => `\`${ref}\``).join(', ')}` : 'Refs: none',
      '',
      '---',
      '',
    ]),
  ].join('\n');
}

