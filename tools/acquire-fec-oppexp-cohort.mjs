#!/usr/bin/env node
// Resumable, checkpointed acquisition of official FEC operating-expenditure cycle files
// for the neutral presidential cohort's resolved authorized committees.
//
// Pipeline per cycle: enumerate/confirm official URL -> download zip -> hash -> extract ->
// hash extracted -> stream-scan with committee-ID filter -> corrected amendment audit ->
// normalize retained rows (privacy-projected) -> per-cycle durable manifest -> checkpoint.
//
// Discipline: graph_effect:none throughout; committee-ID filter only (never name search);
// preserve source rows scanned, matched rows, per-committee counts, amendment audit, hashes;
// null cycles (0 matched) are preserved, not dropped. Raw/extracted caches are deleted after
// hashing+scan (reproducible from the recorded URL + sha256 + parser + committee filter).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  parseOperatingExpenditureLine,
  normalizeBulkOperatingExpenditure,
  createReportAmendmentAudit,
  operatingExpenditureUrl,
} from './lib/fec-bulk-oppexp.mjs';
import { shouldResumeSkip, classifyEnumeration } from './lib/acquisition-state.mjs';

const PARSER_VERSION = 'fec-bulk-oppexp-cohort-acquire@1';
const __dir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dir, '..');
const arg = (name, fallback) => {
  const hit = process.argv.find(a => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const runId = arg('run-id', 'fec-oppexp-cohort-v1');
const runDir = path.join(repoRoot, 'build', 'source-acquisition', runId);
for (const d of ['raw', 'extracted', 'normalized', 'checkpoints', 'manifests']) fs.mkdirSync(path.join(runDir, d), { recursive: true });
const keepRaw = process.argv.includes('--keep-raw');

// Latest completed 2-year cycle relative to the run. 2026 is in progress at capture time.
const firstCycle = 2004;
const lastCycle = Number(arg('last-cycle', '2024'));
const cyclesArg = arg('cycles', '');
const cycles = cyclesArg
  ? cyclesArg.split(',').map(Number)
  : Array.from({ length: (lastCycle - firstCycle) / 2 + 1 }, (_, i) => firstCycle + i * 2);

const identifiers = JSON.parse(fs.readFileSync(path.join(repoRoot, 'data/research/openfec-presidential-identifiers.json'), 'utf8'));
const committees = new Map();
for (const identity of identifiers.identities) {
  for (const committee of identity.authorized_committees) {
    committees.set(committee.committee_id, {
      committee_id: committee.committee_id,
      committee_name: committee.name,
      person_id: identity.person_id,
      person_name: identity.person_name,
      candidate_id: identity.candidate_id,
      cohort_id: identifiers.cohort_id,
    });
  }
}

const now = () => new Date().toISOString();
const append = (file, obj) => fs.appendFileSync(path.join(runDir, file), JSON.stringify(obj) + '\n');
const writeJson = (rel, obj) => fs.writeFileSync(path.join(runDir, rel), JSON.stringify(obj, null, 2) + '\n');
const sha256File = file => {
  const hash = crypto.createHash('sha256');
  hash.update(fs.readFileSync(file));
  return hash.digest('hex');
};
const log = msg => console.log(`[${now()}] ${msg}`);

function runJson(patch) {
  const file = path.join(runDir, 'run.json');
  const base = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : {
    schema_version: 'source-acquisition-run@1', run_id: runId, lane: 'trump-office-business-capital',
    cohort_id: identifiers.cohort_id, source_family: 'fec-operating-expenditure-cycle-files',
    official_index_url: 'https://www.fec.gov/data/browse-data/?tab=bulk-data',
    committees_total: committees.size, started_at: now(), graph_effect: 'none', cycles: {},
  };
  Object.assign(base, patch, { updated_at: now(), cycles: { ...base.cycles, ...(patch.cycles || {}) } });
  fs.writeFileSync(file, JSON.stringify(base, null, 2) + '\n');
}

// Enumerate by confirming the documented FEC bulk pattern against the live server (HEAD, follow
// redirects). This records the authoritative resolved URL + byte length rather than guessing.
function confirmSource(cycle) {
  const patternUrl = operatingExpenditureUrl(cycle);
  const out = execFileSync('curl', ['-sIL', '--max-time', '60', patternUrl], { encoding: 'utf8', maxBuffer: 1 << 20 });
  const statuses = [...out.matchAll(/^HTTP\/[\d.]+ (\d+)/gim)].map(m => Number(m[1]));
  const finalStatus = statuses.at(-1);
  const locationLines = [...out.matchAll(/^location:\s*(\S+)/gim)].map(m => m[1]);
  const resolvedUrl = locationLines.at(-1) || patternUrl;
  const lenMatch = [...out.matchAll(/^content-length:\s*(\d+)/gim)].map(m => Number(m[1]));
  const enumeration_state = classifyEnumeration(finalStatus);
  return { patternUrl, resolvedUrl, finalStatus, statuses, content_length: lenMatch.at(-1) ?? null, enumeration_state, exists: enumeration_state === 'available' };
}

async function scanCycle(cycle, extractedFile, sourceUrl, sourceSha256) {
  const audit = createReportAmendmentAudit();
  const perCommittee = new Map();
  const perPerson = new Map();
  const normalizedPath = path.join(runDir, 'normalized', `oppexp-${cycle}.jsonl`);
  fs.writeFileSync(normalizedPath, '');
  const stream = readline.createInterface({ input: fs.createReadStream(extractedFile), crlfDelay: Infinity });
  let sourceRows = 0, matched = 0, sourceLine = 0, malformed = 0, buffer = [];
  const committeesObserved = new Set();
  for await (const line of stream) {
    sourceLine += 1;
    if (!line.trim()) continue;
    sourceRows += 1;
    let row;
    try { row = parseOperatingExpenditureLine(line); } catch { malformed += 1; continue; }
    const committee = committees.get(row.CMTE_ID);
    if (!committee) continue;
    audit.observe(row);
    let normalized;
    try {
      normalized = normalizeBulkOperatingExpenditure(row, {
        ...committee, source_url: sourceUrl, source_sha256: sourceSha256, source_line: sourceLine,
      });
    } catch (err) {
      malformed += 1;
      append('rejections.jsonl', { cycle, source_line: sourceLine, reason: String(err?.message ?? err), cmte_id: row.CMTE_ID ?? null });
      continue;
    }
    matched += 1;
    committeesObserved.add(row.CMTE_ID);
    perCommittee.set(row.CMTE_ID, (perCommittee.get(row.CMTE_ID) ?? 0) + 1);
    perPerson.set(committee.person_id, (perPerson.get(committee.person_id) ?? 0) + 1);
    buffer.push(JSON.stringify(normalized));
    if (buffer.length >= 5000) { fs.appendFileSync(normalizedPath, buffer.join('\n') + '\n'); buffer = []; }
    if (matched % 10000 === 0) {
      writeJson(`checkpoints/${cycle}-progress.json`, { cycle, source_rows: sourceRows, matched, at: now() });
    }
  }
  if (buffer.length) fs.appendFileSync(normalizedPath, buffer.join('\n') + '\n');
  return {
    source_rows_scanned: sourceRows, matched_rows: matched, malformed_rows: malformed,
    committees_observed: [...committeesObserved].sort(),
    per_committee: Object.fromEntries([...perCommittee.entries()].sort()),
    per_person: Object.fromEntries([...perPerson.entries()].sort()),
    amendment_audit: audit.summarize(), normalized_path: path.relative(repoRoot, normalizedPath),
  };
}

async function processCycle(cycle) {
  const manifestPath = path.join(runDir, 'manifests', `oppexp-${cycle}.json`);
  if (fs.existsSync(manifestPath)) {
    const prior = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    if (shouldResumeSkip(prior)) {
      log(`cycle ${cycle}: resume — manifest present (${prior.matched_rows} matched), skipping`);
      return prior;
    }
  }
  append('attempts.jsonl', { cycle, stage: 'start', at: now() });
  const rawZip = path.join(runDir, 'raw', `oppexp${String(cycle).slice(-2)}.zip`);
  const extractDir = path.join(runDir, 'extracted', String(cycle));
  try {
    const enumeration = confirmSource(cycle);
    append('attempts.jsonl', { cycle, stage: 'enumerated', at: now(), ...enumeration });
    if (!enumeration.exists) {
      append('source-failures.jsonl', { cycle, stage: 'enumerate', status: enumeration.finalStatus, url: enumeration.patternUrl, at: now() });
      const failManifest = { schema_version: 'fec-oppexp-cycle-manifest@1', cycle, terminal_state: 'unavailable_after_search', enumeration, graph_effect: 'none', at: now() };
      writeJson(`manifests/oppexp-${cycle}.json`, failManifest);
      return failManifest;
    }
    execFileSync('curl', ['-sSL', '--max-time', '600', '-o', rawZip, enumeration.resolvedUrl], { stdio: 'ignore' });
    const zipBytes = fs.statSync(rawZip).size;
    const zipSha = sha256File(rawZip);
    append('attempts.jsonl', { cycle, stage: 'downloaded', at: now(), zip_bytes: zipBytes, zip_sha256: zipSha });
    writeJson(`checkpoints/${cycle}-downloaded.json`, { cycle, zip_bytes: zipBytes, zip_sha256: zipSha, at: now() });

    fs.rmSync(extractDir, { recursive: true, force: true });
    fs.mkdirSync(extractDir, { recursive: true });
    execFileSync('unzip', ['-o', '-d', extractDir, rawZip], { stdio: 'ignore' });
    const txt = fs.readdirSync(extractDir).find(f => f.toLowerCase().endsWith('.txt'));
    if (!txt) throw new Error('no .txt member in zip');
    const extractedFile = path.join(extractDir, txt);
    const extractedBytes = fs.statSync(extractedFile).size;
    const extractedSha = sha256File(extractedFile);
    append('attempts.jsonl', { cycle, stage: 'extracted', at: now(), extracted_bytes: extractedBytes, extracted_sha256: extractedSha });

    const scan = await scanCycle(cycle, extractedFile, enumeration.resolvedUrl, extractedSha);
    const manifest = {
      schema_version: 'fec-oppexp-cycle-manifest@1', run_id: runId, cycle,
      official_index_url: 'https://www.fec.gov/data/browse-data/?tab=bulk-data',
      documentation_url: 'https://www.fec.gov/campaign-finance-data/operating-expenditures-file-description/',
      access_mode: 'public_bulk_download_no_api_key', enumeration_method: 'confirmed_by_head_against_documented_pattern',
      source_pattern_url: enumeration.patternUrl, resolved_url: enumeration.resolvedUrl,
      zip_bytes: zipBytes, zip_sha256: zipSha, extracted_bytes: extractedBytes, extracted_sha256: extractedSha,
      parser_version: PARSER_VERSION, retrieved_at: now(), terminal_state: 'scanned',
      cohort_committees_expected: committees.size, ...scan,
      interpretation: 'Matched rows are reported itemization rows filtered by official committee ID, not deduplicated unique payments. AMNDT_IND is a containing-report filing status, not a duplicate-row flag.',
      verification_status: 'machine_proposed_unverified', causal_status: 'not_established', graph_effect: 'none',
    };
    writeJson(`manifests/oppexp-${cycle}.json`, manifest);
    writeJson(`checkpoints/${cycle}-scanned.json`, { cycle, matched: scan.matched_rows, distinct_keys: scan.amendment_audit.distinct_transaction_report_keys, at: now() });
    runJson({ cycles: { [cycle]: { terminal_state: 'scanned', matched_rows: scan.matched_rows, committees_observed: scan.committees_observed.length } } });
    log(`cycle ${cycle}: ${scan.source_rows_scanned} scanned, ${scan.matched_rows} matched, ${scan.committees_observed.length} committee(s), distinct keys ${scan.amendment_audit.distinct_transaction_report_keys}`);
    return manifest;
  } catch (err) {
    append('source-failures.jsonl', { cycle, stage: 'process', error: String(err?.message ?? err), at: now() });
    log(`cycle ${cycle}: FAILED ${String(err?.message ?? err)}`);
    return { cycle, terminal_state: 'transient_failure', error: String(err?.message ?? err) };
  } finally {
    if (!keepRaw) { fs.rmSync(rawZip, { force: true }); fs.rmSync(extractDir, { recursive: true, force: true }); }
  }
}

(async () => {
  runJson({ committees_total: committees.size, cycles_queued: cycles });
  for (const cycle of cycles) append('queue.jsonl', { task: 'fec-oppexp-cycle', cycle, state: 'queued', at: now() });
  const results = [];
  for (const cycle of cycles) results.push(await processCycle(cycle));
  const scanned = results.filter(r => r.terminal_state === 'scanned');
  const summary = {
    schema_version: 'fec-oppexp-cohort-summary@1', run_id: runId, cohort_id: identifiers.cohort_id,
    generated_at: now(), cycles_queued: cycles, cycles_scanned: scanned.map(r => r.cycle),
    cycles_unavailable: results.filter(r => r.terminal_state === 'unavailable_after_search').map(r => r.cycle),
    cycles_failed: results.filter(r => r.terminal_state === 'transient_failure').map(r => r.cycle),
    committees_total: committees.size,
    committees_with_rows: [...new Set(scanned.flatMap(r => r.committees_observed))].sort(),
    total_source_rows_scanned: scanned.reduce((n, r) => n + r.source_rows_scanned, 0),
    total_matched_rows: scanned.reduce((n, r) => n + r.matched_rows, 0),
    per_person_matched_rows: scanned.reduce((acc, r) => {
      for (const [p, n] of Object.entries(r.per_person)) acc[p] = (acc[p] ?? 0) + n;
      return acc;
    }, {}),
    per_cycle: scanned.map(r => ({ cycle: r.cycle, matched_rows: r.matched_rows, distinct_transaction_report_keys: r.amendment_audit.distinct_transaction_report_keys, committees_observed: r.committees_observed })),
    interpretation: 'Cross-era raw row counts are NOT comparable as conduct: operating-expenditure cycle files begin in 2004, so pre-2004 members are outside this source window, not clean. Matched rows are reported itemizations, not unique payments.',
    graph_effect: 'none',
  };
  writeJson('manifests/cohort-summary.json', summary);
  runJson({ finished_at: now(), summary_path: 'manifests/cohort-summary.json' });
  log(`DONE: ${summary.cycles_scanned.length}/${cycles.length} cycles scanned, ${summary.total_matched_rows} total matched rows across ${summary.committees_with_rows.length} committee(s)`);
})();
