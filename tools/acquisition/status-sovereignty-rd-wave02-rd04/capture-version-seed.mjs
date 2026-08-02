#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { ROOT, INPUT_PATH, validateSeedRepository } from './validate-version-seed.mjs';

const OUTPUT = path.resolve(
  process.env.RD04_VERSION_OUTPUT ||
  path.join(ROOT, 'build/acquisition/status-sovereignty-rd-wave02-rd04-version-seed')
);
const sha256 = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const iso = () => new Date().toISOString();
const writeJson = (target, value) => fs.writeFileSync(target, `${JSON.stringify(value, null, 2)}\n`);
const ensureFile = (target) => { if (!fs.existsSync(target)) fs.writeFileSync(target, Buffer.alloc(0)); };
const relative = (target) => path.relative(OUTPUT, target).split(path.sep).join('/');
const walk = (root) => fs.readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
  const target = path.join(root, entry.name);
  return entry.isDirectory() ? walk(target) : [target];
});

function captureAttempt(source, attempt, contract, sourceDir) {
  const attemptDir = path.join(sourceDir, `attempt-${attempt}`);
  fs.mkdirSync(attemptDir, { recursive: true });
  const headersPath = path.join(attemptDir, 'headers.txt');
  const bodyPath = path.join(attemptDir, 'body.bin');
  const stderrPath = path.join(attemptDir, 'curl-stderr.txt');
  const metaPath = path.join(attemptDir, 'curl-meta.txt');
  const startedAt = iso();
  const format = '%{http_code}\n%{url_effective}\n%{content_type}\n%{size_download}\n';
  const args = [
    '--location',
    '--silent',
    '--show-error',
    '--connect-timeout', String(contract.connect_timeout_seconds),
    '--max-time', String(contract.total_timeout_seconds),
    '--user-agent', 'clifford-number-rd04-version-custody/1.0',
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', format,
    source.url
  ];
  const result = spawnSync('curl', args, { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  const finishedAt = iso();
  ensureFile(headersPath);
  ensureFile(bodyPath);
  fs.writeFileSync(stderrPath, result.stderr || '', 'utf8');
  fs.writeFileSync(metaPath, result.stdout || '', 'utf8');
  const lines = String(result.stdout || '').split(/\r?\n/);
  const httpStatus = Number(lines[0] || 0);
  const finalUrl = lines[1] || source.url;
  const contentType = lines[2] || '';
  const reportedBytes = Number(lines[3] || 0);
  const body = fs.readFileSync(bodyPath);
  const headers = fs.readFileSync(headersPath);
  const curlExit = Number.isInteger(result.status) ? result.status : 255;
  const resolved = curlExit === 0 && httpStatus === 200 && body.length > 0;
  return {
    attempt,
    started_at: startedAt,
    finished_at: finishedAt,
    request_url: source.url,
    final_url: finalUrl,
    curl_exit: curlExit,
    http_status: httpStatus,
    content_type: contentType,
    reported_download_bytes: reportedBytes,
    headers_path: relative(headersPath),
    headers_bytes: headers.length,
    headers_sha256: sha256(headers),
    body_path: relative(bodyPath),
    body_bytes: body.length,
    body_sha256: sha256(body),
    stderr_path: relative(stderrPath),
    stderr_bytes: Buffer.byteLength(result.stderr || ''),
    meta_path: relative(metaPath),
    resolved
  };
}

function terminalState(attempts) {
  const last = attempts.at(-1);
  if (last.resolved) return 'http_success';
  if (last.curl_exit !== 0) return 'transport_failure_after_bounded_retry';
  if (last.http_status !== 200) return 'http_non_200_after_bounded_retry';
  return 'empty_body_after_bounded_retry';
}

function verifyOutput(summary) {
  if (summary.counts.seed_sources !== 14) throw new Error(`seed source count ${summary.counts.seed_sources}`);
  if (summary.counts.terminal_source_receipts !== 14) throw new Error(`terminal receipts ${summary.counts.terminal_source_receipts}`);
  if (summary.sources.length !== 14) throw new Error(`source ledger length ${summary.sources.length}`);
  const ids = new Set(summary.sources.map((source) => source.source_id));
  if (ids.size !== 14) throw new Error('duplicate source receipt ID');
  for (const source of summary.sources) {
    if (source.attempts.length < 1 || source.attempts.length > 2) throw new Error(`${source.source_id}: invalid attempt count`);
    if (!source.terminal_state) throw new Error(`${source.source_id}: terminal state missing`);
    for (const attempt of source.attempts) {
      const body = fs.readFileSync(path.join(OUTPUT, attempt.body_path));
      const headers = fs.readFileSync(path.join(OUTPUT, attempt.headers_path));
      if (body.length !== attempt.body_bytes || sha256(body) !== attempt.body_sha256) throw new Error(`${source.source_id}: body receipt mismatch`);
      if (headers.length !== attempt.headers_bytes || sha256(headers) !== attempt.headers_sha256) throw new Error(`${source.source_id}: header receipt mismatch`);
    }
  }
  if (summary.authority.external_contacts !== 0 || summary.authority.external_reviews !== 0) throw new Error('outside-human authority changed');
  if (summary.authority.graph_effect !== 'none' || summary.authority.publication_effect !== 'none') throw new Error('effect authority changed');
}

export function capture() {
  const input = validateSeedRepository(ROOT);
  fs.rmSync(OUTPUT, { recursive: true, force: true });
  fs.mkdirSync(OUTPUT, { recursive: true });
  fs.copyFileSync(path.join(ROOT, INPUT_PATH), path.join(OUTPUT, 'input.json'));

  const receipts = [];
  for (const source of input.sources) {
    const sourceDir = path.join(OUTPUT, 'sources', source.source_id);
    fs.mkdirSync(sourceDir, { recursive: true });
    const attempts = [];
    for (let attempt = 1; attempt <= input.capture_contract.maximum_attempts_per_source; attempt += 1) {
      const receipt = captureAttempt(source, attempt, input.capture_contract, sourceDir);
      attempts.push(receipt);
      if (receipt.resolved) break;
    }
    receipts.push({
      ordinal: source.ordinal,
      source_id: source.source_id,
      jurisdiction: source.jurisdiction,
      instrument_type: source.instrument_type,
      display_id: source.display_id,
      title: source.title,
      expected_content_class: source.expected_content_class,
      publication_or_enactment_date: source.publication_or_enactment_date,
      effective_date: source.effective_date,
      attempts,
      terminal_state: terminalState(attempts),
      resolved: attempts.at(-1).resolved
    });
  }

  const resolved = receipts.filter((source) => source.resolved).length;
  const unresolved = receipts.length - resolved;
  const totalAttempts = receipts.reduce((sum, source) => sum + source.attempts.length, 0);
  const summary = {
    schema_version: 'ssc-rd-wave02-rd04-version-seed-capture@1',
    wave_id: input.wave_id,
    lane_id: input.lane_id,
    class_id: input.class_id,
    issue: input.issue,
    captured_at: iso(),
    input_path: INPUT_PATH,
    input_sha256: sha256(fs.readFileSync(path.join(ROOT, INPUT_PATH))),
    source_page: input.direct_california_source,
    capture_contract: input.capture_contract,
    sources: receipts,
    counts: {
      seed_sources: receipts.length,
      terminal_source_receipts: receipts.length,
      resolved_sources: resolved,
      unresolved_sources: unresolved,
      total_attempts: totalAttempts,
      federal_sources: receipts.filter((source) => source.jurisdiction === 'federal').length,
      california_sources: receipts.filter((source) => source.jurisdiction === 'california').length,
      version_edges_adjudicated: 0,
      class_closed: 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0,
      publication_effects: 0
    },
    terminal_state: unresolved === 0 ? 'all_seed_sources_terminally_recovered' : 'partial_seed_source_recovery_with_typed_unresolved_receipts',
    candidate_universe_complete: false,
    cross_reference_expansion_complete: false,
    version_adjudication_complete: false,
    class_closed: false,
    authority: {
      successful_fetch_proves_implementation: false,
      failed_fetch_is_record_absence: false,
      failed_fetch_is_noncompliance: false,
      source_title_proves_version_relationship: false,
      publication_date_is_effective_date: false,
      outside_human_dependency: false,
      project_blocking: false,
      external_contacts: 0,
      external_reviews: 0,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    }
  };
  writeJson(path.join(OUTPUT, 'summary.json'), summary);
  verifyOutput(summary);

  const manifestEntries = walk(OUTPUT)
    .filter((target) => path.basename(target) !== 'manifest.json')
    .sort()
    .map((target) => {
      const bytes = fs.readFileSync(target);
      return { path: relative(target), bytes: bytes.length, sha256: sha256(bytes) };
    });
  const combined = sha256(Buffer.from(manifestEntries.map((entry) => `${entry.path}\0${entry.bytes}\0${entry.sha256}\n`).join(''), 'utf8'));
  writeJson(path.join(OUTPUT, 'manifest.json'), {
    schema_version: 'ssc-rd-wave02-rd04-version-seed-manifest@1',
    hash_mode: 'sha256_exact_bytes',
    self_included: false,
    entries: manifestEntries,
    combined_sha256: combined
  });

  console.log(`capture-version-seed: ${receipts.length} terminal receipts, ${resolved} resolved, ${unresolved} unresolved, ${totalAttempts} attempts`);
  console.log(`capture-version-seed: manifest ${manifestEntries.length} entries ${combined}`);
  return summary;
}

try {
  capture();
} catch (error) {
  console.error(`capture-version-seed: ${error.stack || error.message}`);
  process.exit(1);
}
