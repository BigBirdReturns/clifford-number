#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync, execFileSync } from 'node:child_process';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const expectedA08Release = '0f53625ade42bf3278429040d50a74a6a52714d28e6f8e754b11f31acb710356';
const expectedEmptyBlob = 'fe51488c7066f6687ef680d6bfaa4f7768ef205c';
const frozenUrl = 'https://courts.ca.gov/california-courts-where-balance-restored';
const baseline = Object.freeze({
  http_status: 500,
  final_url: frozenUrl,
  body_bytes: 68,
  body_sha256: '1f883abab1679fe55395f88313619fa1ed2236c6875895ac37cd4a1f11e511ce'
});
const ledgerPaths = Object.freeze([
  'data/intake/status-sovereignty-rd04-public-implementation-receipts-a07/source-custody/candidate-receipts/explicit-language-candidates.json',
  'data/intake/status-sovereignty-rd04-public-implementation-receipts-a07/source-custody/official-crawl/case-joined-machine-candidates.json'
]);
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });

export function gitBlobSha1(body) {
  const buffer = Buffer.isBuffer(body) ? body : Buffer.from(body);
  return crypto.createHash('sha1').update(Buffer.from(`blob ${buffer.length}\0`)).update(buffer).digest('hex');
}

export function classifyChangedInput({ candidateInputChanged, curlExit, httpStatus, finalUrl, bodyBytes, bodySha256 }) {
  const responseClassifiable = Number(httpStatus) > 0 && Boolean(finalUrl);
  const publicSourceChanged = responseClassifiable && (
    Number(httpStatus) !== baseline.http_status ||
    finalUrl !== baseline.final_url ||
    Number(bodyBytes) !== baseline.body_bytes ||
    bodySha256 !== baseline.body_sha256
  );
  let terminalState;
  if (candidateInputChanged) terminalState = 'candidate_denominator_changed_requires_internal_adjudication';
  else if (!responseClassifiable || Number(curlExit) !== 0) terminalState = 'source_request_unresolved_without_change_classification';
  else if (publicSourceChanged) terminalState = 'public_source_changed_requires_exact_source_adjudication';
  else terminalState = 'no_changed_input_observed';
  return {
    terminal_state: terminalState,
    changed_input_observed: Boolean(candidateInputChanged || publicSourceChanged),
    candidate_denominator_changed: Boolean(candidateInputChanged),
    public_source_changed: publicSourceChanged,
    response_classifiable: responseClassifiable,
    case_specific_implementation_receipt_supported: false,
    restoration_receipt_supported: false,
    broader_crawl_authorized: Boolean(candidateInputChanged || publicSourceChanged),
    project_blocking: false
  };
}

export function buildCandidateInputReceipt(repositoryRoot = root) {
  const releasePath = path.join(repositoryRoot, 'data/project/status-sovereignty-rd04-internal-adjudication-a08-release-manifest.json');
  const release = JSON.parse(fs.readFileSync(releasePath, 'utf8'));
  if (release.combined_sha256 !== expectedA08Release) throw new Error(`A08 release drift: ${release.combined_sha256}`);
  const ledgers = ledgerPaths.map((relative) => {
    const target = path.join(repositoryRoot, relative);
    const body = fs.readFileSync(target);
    const parsed = JSON.parse(body.toString('utf8'));
    if (!Array.isArray(parsed)) throw new Error(`candidate ledger is not an array: ${relative}`);
    const blob = gitBlobSha1(body);
    return {
      path: relative,
      bytes: body.length,
      sha256: sha256(body),
      git_blob_sha1: blob,
      entries: parsed.length,
      changed_from_A08_baseline: blob !== expectedEmptyBlob || parsed.length !== 0
    };
  });
  return {
    schema_version: 'ssc-rd04-a09-candidate-input-receipt@1',
    parent_a08_release_sha256: release.combined_sha256,
    expected_empty_blob_sha1: expectedEmptyBlob,
    ledgers,
    combined_candidate_denominator: ledgers.reduce((sum, row) => sum + row.entries, 0),
    candidate_input_changed: ledgers.some((row) => row.changed_from_A08_baseline),
    authority: {
      unchanged_zero_ledgers_are_failed_work: false,
      same_shn_is_claimant_identity: false,
      external_contacts: 0,
      external_reviews: 0,
      graph_effect: 'none'
    }
  };
}

function parseArgs(argv) {
  const args = { output: path.join(root, 'a09-changed-input') };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--output') args.output = path.resolve(argv[++i]);
    else throw new Error(`unknown argument: ${argv[i]}`);
  }
  return args;
}

export function runChangedInputDetector({ repositoryRoot = root, output }) {
  const out = path.resolve(output);
  const responseDir = path.join(out, 'response');
  fs.rmSync(out, { recursive: true, force: true });
  ensureDir(responseDir);
  const candidate = buildCandidateInputReceipt(repositoryRoot);
  fs.writeFileSync(path.join(out, 'candidate-input-receipt.json'), stable(candidate));

  let startMain = null;
  try { startMain = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: repositoryRoot, encoding: 'utf8' }).trim(); } catch {}
  if (startMain) fs.writeFileSync(path.join(out, 'start-main.txt'), `${startMain}\n`);

  const headersPath = path.join(responseDir, 'headers.txt');
  const bodyPath = path.join(responseDir, 'body.bin');
  const curl = spawnSync('curl', [
    '--compressed', '--location', '--silent', '--show-error',
    '--max-time', '180',
    '--user-agent', 'clifford-number-public-record-change-detector/1.0',
    '--dump-header', headersPath,
    '--output', bodyPath,
    '--write-out', '%{http_code}\n%{url_effective}\n%{content_type}\n',
    frozenUrl
  ], { cwd: repositoryRoot, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
  const curlExit = curl.error ? 127 : Number(curl.status ?? 1);
  fs.writeFileSync(path.join(responseDir, 'curl-exit.txt'), `${curlExit}\n`);
  fs.writeFileSync(path.join(responseDir, 'curl-meta.txt'), curl.stdout ?? '');
  fs.writeFileSync(path.join(responseDir, 'curl-stderr.txt'), curl.error ? String(curl.error.message) : (curl.stderr ?? ''));
  const meta = String(curl.stdout ?? '').trim().split(/\n/);
  const [statusText = '0', finalUrl = '', contentType = ''] = meta;
  const headers = fs.existsSync(headersPath) ? fs.readFileSync(headersPath) : Buffer.alloc(0);
  const body = fs.existsSync(bodyPath) ? fs.readFileSync(bodyPath) : Buffer.alloc(0);
  const current = {
    curl_exit: curlExit,
    http_status: Number(statusText) || 0,
    final_url: finalUrl,
    content_type: contentType,
    headers_path: `${path.basename(out)}/response/headers.txt`,
    headers_bytes: headers.length,
    headers_sha256: sha256(headers),
    body_path: `${path.basename(out)}/response/body.bin`,
    body_bytes: body.length,
    body_sha256: sha256(body),
    stderr: fs.readFileSync(path.join(responseDir, 'curl-stderr.txt'), 'utf8').trim()
  };
  const result = classifyChangedInput({
    candidateInputChanged: candidate.candidate_input_changed,
    curlExit: current.curl_exit,
    httpStatus: current.http_status,
    finalUrl: current.final_url,
    bodyBytes: current.body_bytes,
    bodySha256: current.body_sha256
  });
  const summary = {
    schema_version: 'ssc-rd04-a09-changed-input-detector@1',
    issue: 777,
    as_of: new Date().toISOString().slice(0, 10),
    parent: {
      canonical_a08_merge: '68f4cb2aeccb129a3789b0b1b5da0f1e1c52cab6',
      a08_release_sha256: candidate.parent_a08_release_sha256,
      a08_terminal_state: 'zero_machine_candidates_adjudicated_one_public_url_unresolved_after_bounded_refresh'
    },
    candidate_input: candidate,
    public_source_input: {
      frozen_url: frozenUrl,
      frozen_url_sha256: sha256(Buffer.from(frozenUrl)),
      baseline,
      current,
      response_classifiable: result.response_classifiable,
      changed_from_A08_baseline: result.public_source_changed
    },
    result: { ...result, response_classifiable: undefined },
    counts: {
      candidate_ledgers: candidate.ledgers.length,
      candidate_entries: candidate.combined_candidate_denominator,
      frozen_urls: 1,
      requests: 1,
      changed_candidate_inputs: candidate.ledgers.filter((row) => row.changed_from_A08_baseline).length,
      changed_public_sources: result.public_source_changed ? 1 : 0,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0
    },
    authority: {
      changed_page_is_case_specific_implementation: false,
      http_failure_is_record_absence: false,
      missing_public_material_is_noncompliance: false,
      unchanged_inputs_are_failed_work: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    },
    failures: []
  };
  fs.writeFileSync(path.join(out, 'summary.json'), stable(summary));
  if (startMain) fs.writeFileSync(path.join(out, 'end-main.txt'), `${startMain}\n`);
  return summary;
}

const direct = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (direct) {
  const args = parseArgs(process.argv.slice(2));
  const summary = runChangedInputDetector({ repositoryRoot: root, output: args.output });
  console.log(JSON.stringify(summary.result));
}
