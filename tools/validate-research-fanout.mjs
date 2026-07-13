#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { root } from './lib/ledger.mjs';

const resolveLocation = location => path.isAbsolute(location) ? location : path.join(root, location);
const readJson = location => JSON.parse(fs.readFileSync(resolveLocation(location), 'utf8'));
const readJsonl = location => fs.readFileSync(resolveLocation(location), 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse);
const readOptionalJsonl = location => {
  const resolved = resolveLocation(location);
  return fs.existsSync(resolved)
    ? fs.readFileSync(resolved, 'utf8').split(/\r?\n/).filter(Boolean).map(JSON.parse)
    : [];
};
const manifest = readJson('build/research-fanout/manifest.json');
const scout = readJson(process.env.SCOUT_REPORT_PATH ?? 'build/scout-report.json');
const candidates = readJsonl(process.env.CRAWL_CANDIDATES_PATH ?? 'data/crawl/candidates.jsonl');
const rejections = readJsonl(process.env.CRAWL_REJECTIONS_PATH ?? 'data/crawl/rejections.jsonl');
const crawlSources = readJson(process.env.CRAWL_SOURCES_PATH ?? 'data/crawl/sources.json');
const crawlState = readJson(process.env.CRAWL_STATE_PATH ?? 'data/crawl/state.json');
const linkedinAttention = readOptionalJsonl(process.env.LINKEDIN_ATTENTION_PATH ?? 'data/local/linkedin-attention.jsonl');
const linkedinProfileCaptures = readOptionalJsonl(
  process.env.LINKEDIN_PROFILE_CAPTURES_PATH ?? 'data/local/linkedin-profile-captures.jsonl',
);
const publicInterestSeeds = readOptionalJsonl(
  process.env.PUBLIC_INTEREST_SEEDS_PATH ?? 'data/research/public-interest-discovery-seeds.jsonl',
);
const sourceGapIds = (crawlSources.sources ?? [])
  .filter(source => source.enabled)
  .filter(source => (crawlState.sources?.[source.id]?.status ?? 'not_run') !== 'ok')
  .map(source => `crawl-source-gap:${source.id}`);
const expectedIds = new Set([
  ...scout.findings.map(finding => `scout:${finding.id}`),
  ...candidates.map(candidate => `crawl:${candidate.candidate_id}`),
  ...rejections.map(rejection => `crawl-rejection:${rejection.rejection_id}`),
  ...sourceGapIds,
  ...linkedinAttention.map(observation => `linkedin:${observation.attention_id}`),
  ...linkedinProfileCaptures.map(capture => `linkedin-profile:${capture.capture_id}`),
  ...publicInterestSeeds.map(seed => `public-interest:${seed.seed_id}`),
]);
const seen = new Set();
const errors = [];
const assert = (condition, message) => { if (!condition) errors.push(message); };
const allowedDiscoveryStatuses = new Set(['derived_signal', 'accepted_intake', 'held_for_review', 'coverage_gap', 'preserved_intake']);
const allowedCertaintyGrades = new Set([
  'machine_derived_unverified',
  'source_record_observed',
  'rejection_metadata_observed',
  'not_observed_due_to_source_gap',
  'primary_observation_limited',
]);
const allowedSourceAvailability = new Set(['available', 'unknown', 'partial', 'unavailable', 'not_observed', 'live_or_unknown', 'private_preserved']);
const allowedEvidenceStates = new Set(['observed', 'self_claimed', 'inferred']);
const evidenceLayerIds = new Set(readJson('data/canonical/evidence-layers.json').layers.map(layer => layer.id));
const attentionById = new Map(linkedinAttention.map(observation => [`linkedin:${observation.attention_id}`, observation]));

for (const descriptor of manifest.batches ?? []) {
  const batch = readJson(descriptor.json_path);
  assert(batch.batch_id === descriptor.batch_id, `${descriptor.batch_id}: descriptor mismatch`);
  assert(batch.item_count === batch.items.length, `${descriptor.batch_id}: item_count mismatch`);
  assert(batch.item_count <= manifest.batch_size, `${descriptor.batch_id}: exceeds batch size`);
  assert(batch.graph_effect === 'none', `${descriptor.batch_id}: graph_effect must be none`);
  for (const item of batch.items) {
    assert(expectedIds.has(item.task_id), `${descriptor.batch_id}: unexpected ${item.task_id}`);
    assert(!seen.has(item.task_id), `${descriptor.batch_id}: duplicate ${item.task_id}`);
    assert(item.graph_effect === 'none', `${item.task_id}: graph_effect must be none`);
    assert(item.verification_status === 'machine_proposed_unverified', `${item.task_id}: unsafe verification status`);
    assert(item.requested_action, `${item.task_id}: missing bounded next action`);
    assert(allowedDiscoveryStatuses.has(item.discovery_status), `${item.task_id}: invalid or missing discovery_status`);
    assert(allowedCertaintyGrades.has(item.certainty_grade), `${item.task_id}: invalid or missing certainty_grade`);
    assert(allowedSourceAvailability.has(item.source_availability), `${item.task_id}: invalid or missing source_availability`);
    assert(allowedEvidenceStates.has(item.evidence_state), `${item.task_id}: invalid or missing evidence_state`);
    assert(evidenceLayerIds.has(item.evidence_layer), `${item.task_id}: invalid or missing evidence_layer`);
    if (item.origin === 'official-record-crawl') {
      assert(item.candidate_status === 'intake_only', `${item.task_id}: crawl candidate cannot self-promote`);
      assert(item.causal_status === 'not_established', `${item.task_id}: crawl candidate cannot assert causation`);
    }
    if (item.origin === 'official-record-crawl-rejection') {
      assert(item.candidate_status === 'intake_only', `${item.task_id}: held observation cannot self-promote`);
      assert(item.causal_status === 'not_established', `${item.task_id}: held observation cannot assert causation`);
      assert(item.publication_status === 'internal_intake', `${item.task_id}: held observation must remain internal intake`);
      assert(item.discovery_status === 'held_for_review', `${item.task_id}: held observation lost its review status`);
    }
    if (item.origin === 'official-record-crawl-source-gap') {
      assert(item.candidate_status === 'intake_only', `${item.task_id}: source gap cannot self-promote`);
      assert(item.causal_status === 'not_established', `${item.task_id}: source gap cannot assert causation`);
      assert(item.publication_status === 'internal_intake', `${item.task_id}: source gap must remain internal intake`);
      assert(item.certainty_grade === 'not_observed_due_to_source_gap', `${item.task_id}: source gap must remain explicitly unobserved`);
    }
    if (item.origin === 'linkedin-retrospective-attention') {
      assert(item.publication_status === 'private_intake', `${item.task_id}: retrospective attention must remain private intake`);
      assert(item.type === 'retrospective_attention_candidate', `${item.task_id}: unsafe attention candidate type`);
      const sourceObservation = attentionById.get(item.task_id);
      const hasPublicUrl = /^https?:\/\//i.test(sourceObservation?.url ?? '');
      const safeTitle = `${hasPublicUrl ? 'LinkedIn' : 'Private LinkedIn'} ${sourceObservation?.category} observation on ${sourceObservation?.observed_at}`.slice(0, 180);
      assert(item.title === safeTitle, `${item.task_id}: private activity or query prose may have leaked into fan-out title`);
    }
    if (item.origin === 'linkedin-retrospective-profile-capture') {
      assert(item.publication_status === 'private_intake', `${item.task_id}: profile capture must remain private intake`);
      assert(item.type === 'retrospective_profile_capture_candidate', `${item.task_id}: unsafe profile-capture candidate type`);
    }
    if (item.origin === 'public-interest-source-seed') {
      assert(item.type === 'bounded_public_interest_source_query', `${item.task_id}: unsafe public-interest task type`);
      assert(item.candidate_status === 'intake_only', `${item.task_id}: source seed cannot self-promote`);
      assert(item.causal_status === 'not_established', `${item.task_id}: source seed cannot assert causation`);
      assert(item.publication_status === 'internal_intake', `${item.task_id}: source seed must remain internal intake`);
      assert(item.evidence_layer === 'investigative_hypothesis', `${item.task_id}: source seed must remain a hypothesis`);
      assert(Array.isArray(item.allowed_predicates) && item.allowed_predicates.length > 0, `${item.task_id}: missing predicate boundary`);
      assert(Array.isArray(item.forbidden_inferences) && item.forbidden_inferences.length > 0, `${item.task_id}: missing inference boundary`);
      assert(item.privacy_handling, `${item.task_id}: missing privacy handling`);
    }
    seen.add(item.task_id);
  }
}

for (const id of expectedIds) assert(seen.has(id), `missing ${id}`);
assert(seen.size === expectedIds.size, `expected ${expectedIds.size} unique tasks, saw ${seen.size}`);
assert(manifest.source_counts.scout_findings === scout.findings.length, 'scout source count mismatch');
assert(manifest.source_counts.crawl_candidates === candidates.length, 'crawl source count mismatch');
assert(manifest.source_counts.crawl_rejections === rejections.length, 'crawl rejection count mismatch');
assert(manifest.source_counts.crawl_source_gaps === sourceGapIds.length, 'crawl source-gap count mismatch');
assert(manifest.source_counts.linkedin_attention === linkedinAttention.length, 'LinkedIn attention source count mismatch');
assert(
  manifest.source_counts.linkedin_profile_captures === linkedinProfileCaptures.length,
  'LinkedIn profile-capture source count mismatch',
);
assert(manifest.source_counts.public_interest_seeds === publicInterestSeeds.length, 'public-interest seed count mismatch');
assert(manifest.source_counts.total === expectedIds.size, 'total source count mismatch');

if (errors.length) {
  console.error('validate-research-fanout failed:');
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log(`validate-research-fanout: OK (${seen.size} tasks, ${manifest.batches.length} batches)`);

