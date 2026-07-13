import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixture = fs.mkdtempSync(path.join(os.tmpdir(), 'clifford-fanout-'));
const attentionPath = path.join(fixture, 'linkedin-attention.jsonl');
const profileCapturePath = path.join(fixture, 'linkedin-profile-captures.jsonl');
const candidatesPath = path.join(fixture, 'candidates.jsonl');
const rejectionsPath = path.join(fixture, 'rejections.jsonl');
const crawlSourcesPath = path.join(fixture, 'sources.json');
const crawlStatePath = path.join(fixture, 'state.json');
const publicInterestSeedsPath = path.join(fixture, 'public-interest-seeds.jsonl');
fs.writeFileSync(attentionPath, `${JSON.stringify({
  schema_version: 'linkedin-attention@1',
  attention_id: 'liattn_testfixture',
  source_platform: 'linkedin',
  category: 'search_queries',
  observed_at: '2026-06-02T00:00:00.000Z',
  activity_summary: 'private cheat-code handshake query',
  publication_status: 'private_intake',
  graph_effect: 'none',
  verification_status: 'machine_proposed_unverified',
})}\n`);
fs.writeFileSync(profileCapturePath, `${JSON.stringify({
  schema_version: 'linkedin-profile-capture@1',
  capture_id: 'liprof_testfixture',
  series_id: 'liseries_testfixture',
  source_platform: 'linkedin',
  observed_at: '2025-05-16T15:21:43Z',
  subject: { label: 'Example Public Actor', profile_url: 'https://www.linkedin.com/in/example-public-actor' },
  provenance: { raw_copy: 'data/local/linkedin-profile-captures/raw/liprof_testfixture.pdf' },
  publication_status: 'private_intake',
  graph_effect: 'none',
  verification_status: 'machine_proposed_unverified',
})}\n`);
fs.writeFileSync(candidatesPath, `${JSON.stringify({
  candidate_id: 'cand_testfixture',
  source_id: 'fixture-ok',
  source_record_id: 'record-1',
  source_url: 'https://example.gov/record-1',
  label: 'Fixture accepted candidate',
  match_basis: 'fixture term',
  observation_ids: ['obs_testfixture'],
  entity_hints: [],
  event_hints: [],
  priority: 'medium',
  status: 'intake_only',
  causal_status: 'not_established',
  next_step: 'Review the public source record and preserve a bounded receipt.',
})}\n`);
fs.writeFileSync(rejectionsPath, [
  {
    rejection_id: 'reject_relevance_fixture',
    source_id: 'fixture-ok',
    source_record_id: 'record-2',
    term: 'sensitive rejected frontier term',
    reason: 'record failed local relevance gate',
    graph_effect: 'none',
  },
  {
    rejection_id: 'reject_privacy_fixture',
    source_id: 'fixture-ok',
    source_record_id: 'record-private',
    term: 'private address search',
    reason: 'record exposes contact or address data',
    graph_effect: 'none',
  },
].map(row => JSON.stringify(row)).join('\n') + '\n');
fs.writeFileSync(crawlSourcesPath, `${JSON.stringify({
  sources: [
    { id: 'fixture-ok', label: 'Fixture OK', enabled: true },
    { id: 'fixture-unavailable', label: 'Fixture unavailable', enabled: true },
    { id: 'fixture-partial', label: 'Fixture partial', enabled: true },
    { id: 'fixture-never-run', label: 'Fixture never run', enabled: true },
    { id: 'fixture-disabled', label: 'Fixture disabled', enabled: false },
  ],
}, null, 2)}\n`);
fs.writeFileSync(crawlStatePath, `${JSON.stringify({
  sources: {
    'fixture-ok': { status: 'ok', records_seen: 0 },
    'fixture-unavailable': { status: 'skipped_missing_credential', credential_env: 'FIXTURE_API_KEY' },
    'fixture-partial': { status: 'partial', errors: ['secret adapter diagnostic must not enter task packets'] },
  },
}, null, 2)}\n`);
fs.writeFileSync(publicInterestSeedsPath, `${JSON.stringify({
  schema_version: 'public-interest-discovery-seed@1',
  seed_id: 'fixture-public-interest-source',
  topic: 'fixture-topic',
  source_id: 'fixture-public-registry',
  source_url: 'https://example.gov/public-registry',
  source_class: 'official_registry',
  source_availability: 'available',
  query_kind: 'entity_registry',
  priority: 'high',
  title: 'Query the fixture public registry',
  bounded_action: 'Retrieve bounded public-role records and preserve exact record identifiers.',
  allowed_predicates: ['listed_in_registry'],
  forbidden_inferences: ['wrongdoing', 'coordination'],
  privacy_handling: 'Exclude private contact data and protected-person information.',
  graph_effect: 'none',
})}\n`);
const env = {
  ...process.env,
  LINKEDIN_ATTENTION_PATH: attentionPath,
  LINKEDIN_PROFILE_CAPTURES_PATH: profileCapturePath,
  CRAWL_CANDIDATES_PATH: candidatesPath,
  CRAWL_REJECTIONS_PATH: rejectionsPath,
  CRAWL_SOURCES_PATH: crawlSourcesPath,
  CRAWL_STATE_PATH: crawlStatePath,
  PUBLIC_INTEREST_SEEDS_PATH: publicInterestSeedsPath,
};
execFileSync(process.execPath, ['tools/build-research-fanout.mjs', '--batch-size', '20'], { cwd: root, stdio: 'pipe', env });
execFileSync(process.execPath, ['tools/validate-research-fanout.mjs'], { cwd: root, stdio: 'pipe', env });

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'build/research-fanout/manifest.json'), 'utf8'));
assert.equal(manifest.graph_effect, 'none');
assert.equal(
  manifest.source_counts.total,
  manifest.source_counts.scout_findings
    + manifest.source_counts.crawl_candidates
    + manifest.source_counts.crawl_rejections
    + manifest.source_counts.crawl_source_gaps
    + manifest.source_counts.linkedin_attention
    + manifest.source_counts.linkedin_profile_captures
    + manifest.source_counts.public_interest_seeds,
);
assert.equal(manifest.source_counts.linkedin_attention, 1);
assert.equal(manifest.source_counts.linkedin_profile_captures, 1);
assert.equal(manifest.source_counts.crawl_candidates, 1);
assert.equal(manifest.source_counts.crawl_rejections, 2);
assert.equal(manifest.source_counts.crawl_source_gaps, 3);
assert.equal(manifest.source_counts.public_interest_seeds, 1);
assert.ok(manifest.batches.length > 1, 'fan-out must create multiple bounded batches');
assert.ok(manifest.batches.every(batch => batch.item_count <= 20));
assert.equal(manifest.matrix.include.length, manifest.batches.length);
const items = manifest.batches.flatMap(batch => JSON.parse(fs.readFileSync(path.join(root, batch.json_path), 'utf8')).items);
assert.ok(items.some(item => item.task_id === 'linkedin:liattn_testfixture'));
assert.ok(items.some(item => item.task_id === 'linkedin-profile:liprof_testfixture'));
assert.ok(items.some(item => item.task_id === 'crawl-rejection:reject_relevance_fixture'));
assert.ok(items.some(item => item.task_id === 'crawl-rejection:reject_privacy_fixture'));
assert.ok(items.some(item => item.task_id === 'crawl-source-gap:fixture-unavailable'));
assert.ok(items.some(item => item.task_id === 'crawl-source-gap:fixture-partial'));
assert.ok(items.some(item => item.task_id === 'crawl-source-gap:fixture-never-run'));
assert.ok(items.some(item => item.task_id === 'public-interest:fixture-public-interest-source'));
assert.ok(!items.some(item => item.task_id === 'crawl-source-gap:fixture-ok'), 'zero results from a completed scan is not a source gap');
assert.ok(!items.some(item => item.task_id === 'crawl-source-gap:fixture-disabled'), 'disabled sources are outside scan coverage');
assert.ok(items.every(item => ['observed', 'self_claimed', 'inferred'].includes(item.evidence_state)));
const publicInterestItem = items.find(item => item.task_id === 'public-interest:fixture-public-interest-source');
assert.equal(publicInterestItem.graph_effect, 'none');
assert.deepEqual(publicInterestItem.allowed_predicates, ['listed_in_registry']);
assert.deepEqual(publicInterestItem.forbidden_inferences, ['wrongdoing', 'coordination']);
const renderedFanout = [
  JSON.stringify(items),
  ...manifest.batches.map(batch => fs.readFileSync(path.join(root, batch.markdown_path), 'utf8')),
].join('\n');
assert.ok(!renderedFanout.includes('private cheat-code handshake query'), 'private LinkedIn query leaked into task packets');
assert.ok(!renderedFanout.includes('sensitive rejected frontier term'), 'rejected crawl term leaked into task packets');
assert.ok(!renderedFanout.includes('private address search'), 'privacy rejection term leaked into task packets');
assert.ok(!renderedFanout.includes('secret adapter diagnostic'), 'source error detail leaked into task packets');
fs.rmSync(fixture, { recursive: true, force: true });
execFileSync(process.execPath, ['tools/build-research-fanout.mjs', '--batch-size', '20'], { cwd: root, stdio: 'pipe' });
console.log('research-fanout.test.js: OK');

