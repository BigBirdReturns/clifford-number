#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const ROOT = process.cwd();
const A07 = 'status-sovereignty-rd04-public-implementation-receipts-a07';
const A07_ROOT = path.join(ROOT, 'data/intake', A07);
const CUSTODY = path.join(A07_ROOT, 'source-custody');
const CORE_PATH = path.join(A07_ROOT, 'core.json');
const RELEASE_PATH = path.join(ROOT, 'data/project', `${A07}-release-manifest.json`);
const ARCHIVE_LEDGER_PATH = path.join(CUSTODY, 'artifact-archive-ledger.json');
const OUT = path.join(ROOT, 'a08-internal-adjudication');
const EXTRACT = path.join(OUT, 'extracted');
const EXPECTED_EXECUTION = 'SSC-RD04-PUBLIC-IMPLEMENTATION-RECEIPTS-A07';

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const writeJson = (file, value) => { ensureDir(path.dirname(file)); fs.writeFileSync(file, stable(value)); };
const normalize = (value) => String(value ?? '').replace(/\r/g, '').replace(/\s+/g, ' ').trim();
const lower = (value) => normalize(value).toLowerCase();

fs.rmSync(OUT, { recursive: true, force: true });
ensureDir(EXTRACT);
const failures = [];
const fail = (condition, message, context = null) => { if (!condition) failures.push({ message, context }); };

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: options.cwd ?? ROOT,
    encoding: options.encoding ?? 'utf8',
    maxBuffer: options.maxBuffer ?? 512 * 1024 * 1024,
    timeout: options.timeout ?? 600_000
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(' ')} failed: ${(result.stderr || result.stdout || '').trim()}`);
  }
  return result.stdout;
}

function parseDate(value) {
  const match = String(value ?? '').trim().match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!match) return null;
  return Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
}

function collectFiles(target) {
  if (!fs.existsSync(target)) return [];
  if (fs.statSync(target).isFile()) return [target];
  return fs.readdirSync(target, { withFileTypes: true })
    .flatMap((entry) => collectFiles(path.join(target, entry.name)));
}

function exactActionContexts(text) {
  const normalized = normalize(text);
  const patterns = [
    /\b(?:the\s+)?(?:county|agency|department|state)\s+(?:has|had)\s+restored\b/gi,
    /\bbenefits?\s+(?:have|had)\s+been\s+restored\b/gi,
    /\bbenefits?\s+were\s+restored\b/gi,
    /\b(?:the\s+)?(?:county|agency|department|state)\s+(?:has|had)\s+reinstated\b/gi,
    /\bbenefits?\s+(?:have|had)\s+been\s+reinstated\b/gi,
    /\b(?:the\s+)?(?:county|agency|department|state)\s+(?:has|had)\s+issued\s+(?:a\s+)?(?:payment|benefits?|allotment|corrective\s+payment)\b/gi,
    /\b(?:payment|benefits?|allotment)\s+(?:has|have|had)\s+been\s+(?:issued|paid|provided)\b/gi,
    /\b(?:payment|benefits?|allotment)\s+(?:was|were)\s+(?:issued|paid|provided)\b/gi,
    /\b(?:the\s+)?(?:county|agency|department|state)\s+(?:has|had)\s+paid\b/gi,
    /\b(?:the\s+)?(?:county|agency|department|state)\s+(?:has|had)\s+complied\b/gi,
    /\bcompliance\s+(?:has|had)\s+been\s+(?:completed|achieved|verified)\b/gi,
    /\bcompliance\s+was\s+(?:completed|achieved|verified)\b/gi,
    /\bcorrective\s+(?:payment|benefits?)\s+(?:has|have|had)\s+been\s+(?:issued|paid|provided)\b/gi,
    /\bretroactive\s+benefits?\s+(?:has|have|had)\s+been\s+(?:issued|paid|restored|provided)\b/gi,
    /\bretroactive\s+benefits?\s+(?:was|were)\s+(?:issued|paid|restored|provided)\b/gi
  ];
  const disqualifiers = [
    /\b(?:appellant|claimant|plaintiff|petitioner|respondent|county|agency)\s+(?:states|stated|alleges|alleged|claims|claimed|contends|contended|argues|argued)\b/i,
    /\b(?:shall|must|should|may|will|would|could)\s+(?:be\s+)?(?:restored|reinstated|issued|paid|provided|complied)\b/i,
    /\b(?:is|was|were|are)\s+ordered\s+to\b/i,
    /\border(?:s|ed)?\s+(?:the\s+)?(?:county|agency|department|state)\s+to\b/i,
    /\bif\s+(?:the\s+)?(?:county|agency|department|state)\b/i,
    /\bupon\s+(?:the\s+)?(?:county|agency|department|state)\b/i,
    /\brequest(?:s|ed)?\s+that\b/i,
    /\bnot\s+(?:yet\s+)?(?:restored|reinstated|issued|paid|provided|complied)\b/i,
    /\b(?:failed|fails|failure)\s+to\s+(?:restore|reinstate|issue|pay|provide|comply)\b/i,
    /\b(?:no|without)\s+(?:evidence|proof)\s+(?:that|of)\b/i
  ];
  const contexts = [];
  for (const pattern of patterns) {
    for (const match of normalized.matchAll(pattern)) {
      const start = Math.max(0, match.index - 500);
      const end = Math.min(normalized.length, match.index + match[0].length + 500);
      const context = normalized.slice(start, end);
      contexts.push({
        phrase: match[0],
        context,
        context_sha256: sha256(Buffer.from(context, 'utf8')),
        disqualified: disqualifiers.some((rule) => rule.test(context)),
        disqualifier_classes: disqualifiers
          .map((rule, index) => ({ index, hit: rule.test(context) }))
          .filter((row) => row.hit)
          .map((row) => row.index)
      });
    }
  }
  const unique = new Map();
  for (const row of contexts) unique.set(row.context_sha256, row);
  return [...unique.values()].sort((a, b) => a.context_sha256.localeCompare(b.context_sha256));
}

function explicitSameMatter(text, shn) {
  const normalized = normalize(text);
  const escaped = shn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const shnPattern = new RegExp(`(?:SHN|state\\s+hearing\\s+(?:number|no\\.?))?\\s*${escaped}`, 'i');
  const priorMatter = /\b(?:prior|previous|earlier)\s+(?:state\s+hearing|hearing|decision|order|appeal)\b/i;
  const complianceMatter = /\b(?:compliance|implement(?:ation|ed)?|restore(?:d|ation)?|reinstate(?:d|ment)?|corrective\s+payment|retroactive\s+benefits?)\b/i;
  return {
    exact_shn_in_text: shnPattern.test(normalized),
    explicit_prior_matter_reference: priorMatter.test(normalized),
    implementation_or_compliance_vocabulary: complianceMatter.test(normalized)
  };
}

function independentRuleA(text, shn, sourceDate, latestD1Date) {
  const actions = exactActionContexts(text).filter((row) => !row.disqualified);
  const matter = explicitSameMatter(text, shn);
  const later = Number.isFinite(sourceDate) && Number.isFinite(latestD1Date) && sourceDate > latestD1Date;
  return {
    pass: later && matter.exact_shn_in_text && matter.implementation_or_compliance_vocabulary && actions.length > 0,
    later_than_latest_D1: later,
    matter,
    qualified_action_contexts: actions
  };
}

function independentRuleB(text, shn, sourceDate, latestD1Date) {
  const normalized = normalize(text);
  const sentences = normalized.split(/(?<=[.!?])\s+(?=[A-Z])/).filter(Boolean);
  const escaped = shn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const shnPattern = new RegExp(escaped, 'i');
  const completed = /\b(?:has|have|had|was|were)\s+(?:already\s+)?(?:restored|reinstated|issued|paid|provided|complied|completed|implemented)\b/i;
  const object = /\b(?:benefits?|allotment|payment|compliance|restoration|reinstatement|corrective\s+action|retroactive)\b/i;
  const prospective = /\b(?:shall|must|should|may|will|would|could|ordered\s+to|is\s+ordered|was\s+ordered|if|not|failed\s+to)\b/i;
  const joined = sentences.filter((sentence, index) => {
    const neighborhood = [sentences[index - 1], sentence, sentences[index + 1]].filter(Boolean).join(' ');
    return shnPattern.test(neighborhood) && completed.test(neighborhood) && object.test(neighborhood) && !prospective.test(neighborhood);
  }).map((sentence) => ({ sentence, sentence_sha256: sha256(Buffer.from(sentence, 'utf8')) }));
  const later = Number.isFinite(sourceDate) && Number.isFinite(latestD1Date) && sourceDate > latestD1Date;
  return { pass: later && joined.length > 0, later_than_latest_D1: later, joined_sentences: joined };
}

function verifyArchiveParts(entry) {
  const archivePath = path.join(OUT, 'archives', entry.stage, `${sha256(Buffer.from(entry.artifact_name, 'utf8')).slice(0, 20)}.tar.gz`);
  ensureDir(path.dirname(archivePath));
  const buffers = [];
  for (const part of entry.parts ?? []) {
    const partPath = path.join(ROOT, part.path);
    fail(fs.existsSync(partPath), `missing archive part ${part.path}`);
    if (!fs.existsSync(partPath)) continue;
    const body = fs.readFileSync(partPath);
    fail(body.length === part.bytes, `archive part byte drift ${part.path}`);
    fail(sha256(body) === part.sha256, `archive part digest drift ${part.path}`);
    buffers.push(body);
  }
  const archive = Buffer.concat(buffers);
  fail(archive.length === entry.deterministic_archive_bytes, `archive byte drift ${entry.artifact_name}`);
  fail(sha256(archive) === entry.deterministic_archive_sha256, `archive digest drift ${entry.artifact_name}`);
  fs.writeFileSync(archivePath, archive);
  const extractPath = path.join(EXTRACT, entry.stage, sha256(Buffer.from(entry.artifact_name, 'utf8')).slice(0, 20));
  fs.rmSync(extractPath, { recursive: true, force: true });
  ensureDir(extractPath);
  run('tar', ['-xzf', archivePath, '-C', extractPath]);
  return extractPath;
}

function findJsonByPredicate(root, basename, predicate) {
  for (const file of collectFiles(root).filter((row) => path.basename(row) === basename).sort()) {
    try {
      const value = readJson(file);
      if (predicate(value, file)) return { value, file };
    } catch {}
  }
  return null;
}

function findTextNearFetch(root, predicate) {
  const found = findJsonByPredicate(root, 'fetch.json', predicate);
  if (!found) return null;
  const directory = path.dirname(found.file);
  const textCandidates = ['document.txt', 'body.txt', 'page.txt'];
  for (const name of textCandidates) {
    const file = path.join(directory, name);
    if (fs.existsSync(file)) return { fetch: found.value, fetchFile: found.file, textFile: file, text: fs.readFileSync(file, 'utf8') };
  }
  return { fetch: found.value, fetchFile: found.file, textFile: null, text: null };
}

function loadA07() {
  for (const file of [CORE_PATH, RELEASE_PATH, ARCHIVE_LEDGER_PATH]) fail(fs.existsSync(file), `missing A07 path ${path.relative(ROOT, file)}`);
  const core = readJson(CORE_PATH);
  const release = readJson(RELEASE_PATH);
  const archiveLedger = readJson(ARCHIVE_LEDGER_PATH);
  fail(core.execution_id === EXPECTED_EXECUTION, `A07 execution ${core.execution_id}`);
  fail(core.counts.verified_public_implementation_receipts === 0, 'A07 implementation authority must be zero');
  fail(core.counts.verified_public_restoration_receipts === 0, 'A07 restoration authority must be zero');
  fail(core.counts.external_contacts === 0 && core.counts.external_reviews === 0, 'A07 outside participation must be zero');
  fail(core.boundaries.missing_public_material_is_noncompliance === false, 'A07 missing-public boundary drift');
  fail(release.combined_sha256 && /^[0-9a-f]{64}$/.test(release.combined_sha256), 'A07 release digest');
  fail(archiveLedger.schema_version === 'ssc-rd04-a07-artifact-archive-ledger@1', 'A07 archive ledger schema');
  return { core, release, archiveLedger };
}

let summary;
try {
  const a07 = loadA07();
  if (failures.length) throw new Error('A07 canonical validation failed');

  const explicitPath = path.join(CUSTODY, 'candidate-receipts', 'explicit-language-candidates.json');
  const casePath = path.join(CUSTODY, 'official-crawl', 'case-joined-machine-candidates.json');
  const candidateCustodyPath = path.join(CUSTODY, 'candidate-receipts', 'candidate-document-custody.json');
  for (const file of [explicitPath, casePath, candidateCustodyPath]) fail(fs.existsSync(file), `missing candidate ledger ${path.relative(ROOT, file)}`);
  if (failures.length) throw new Error('candidate ledgers missing');

  const explicitCandidates = readJson(explicitPath);
  const caseCandidates = readJson(casePath);
  const candidateCustody = readJson(candidateCustodyPath);
  fail(Array.isArray(explicitCandidates), 'explicit candidates not array');
  fail(Array.isArray(caseCandidates), 'case candidates not array');
  fail(Array.isArray(candidateCustody), 'candidate custody not array');
  if (failures.length) throw new Error('candidate ledger structure failed');

  const relevantArchives = new Map();
  const candidateArchives = (a07.archiveLedger.archives ?? []).filter((entry) => entry.stage === 'candidate');
  for (const entry of candidateArchives) relevantArchives.set(`${entry.stage}\0${entry.artifact_name}`, entry);
  for (const candidate of caseCandidates) {
    const url = String(candidate.url ?? '').trim();
    const shard = Number.parseInt(sha256(Buffer.from(`A07-OFFICIAL-CRAWL-V1\n${url}`, 'utf8')).slice(0, 8), 16) % 16;
    const expectedName = `ssc-rd04-a07-official-crawl-${String(shard).padStart(2, '0')}`;
    const entry = (a07.archiveLedger.archives ?? []).find((row) => row.stage === 'crawl' && row.artifact_name === expectedName);
    fail(Boolean(entry), `missing crawl archive ${expectedName}`, { url });
    if (entry) relevantArchives.set(`${entry.stage}\0${entry.artifact_name}`, entry);
  }
  if ((explicitCandidates.length || candidateCustody.length) && candidateArchives.length === 0) fail(false, 'candidate artifact archive absent');
  if (failures.length) throw new Error('relevant archives missing');

  const extracted = new Map();
  for (const [key, entry] of relevantArchives) extracted.set(key, verifyArchiveParts(entry));
  if (failures.length) throw new Error('artifact archive verification failed');

  const candidateArchiveRoots = [...extracted.entries()].filter(([key]) => key.startsWith('candidate\0')).map(([, value]) => value);
  const adjudications = [];
  const verified = [];
  const rejected = [];

  for (const candidate of explicitCandidates) {
    const identity = String(candidate.document_identity ?? '').trim();
    const custodyRow = candidateCustody.find((row) => String(row.document_identity ?? '').trim() === identity);
    fail(Boolean(custodyRow), `missing candidate custody row ${identity}`);
    const sourceDate = Number(candidate.earliest_candidate_release_date_utc ?? custodyRow?.earliest_candidate_release_date_utc);
    const latestD1 = Number(candidate.latest_d1_relief_date_utc ?? custodyRow?.latest_d1_relief_date_utc);
    const shns = [...new Set((candidate.matched_d1_shns ?? custodyRow?.matched_d1_shns ?? []).map(String))].sort();
    let exactSource = null;
    for (const root of candidateArchiveRoots) {
      exactSource = findTextNearFetch(root, (fetch) => String(fetch.document_identity ?? '').trim() === identity);
      if (exactSource) break;
    }
    fail(Boolean(exactSource?.text), `exact candidate text not found ${identity}`);
    const perShn = [];
    for (const shn of shns) {
      const ruleA = exactSource?.text ? independentRuleA(exactSource.text, shn, sourceDate, latestD1) : { pass: false };
      const ruleB = exactSource?.text ? independentRuleB(exactSource.text, shn, sourceDate, latestD1) : { pass: false };
      const pass = ruleA.pass && ruleB.pass;
      perShn.push({ shn, rule_A: ruleA, rule_B: ruleB, pass });
    }
    const pass = perShn.some((row) => row.pass);
    const record = {
      candidate_type: 'same_shn_decision_document',
      candidate_id: `decision:${identity}`,
      document_identity: identity,
      registry_ids: candidate.candidate_registry_ids ?? custodyRow?.registry_ids ?? [],
      source_fetch_sha256: exactSource?.fetch?.sha256 ?? null,
      source_text_sha256: exactSource?.text ? sha256(Buffer.from(exactSource.text.replace(/\r\n/g, '\n'), 'utf8')) : null,
      source_date_utc: sourceDate,
      latest_D1_date_utc: latestD1,
      matched_D1_shns: shns,
      independent_rules: perShn,
      disposition: pass ? 'internally_supported_public_completed_action_receipt' : 'rejected_or_unresolved_machine_candidate',
      verified_public_implementation_receipt: pass,
      verified_public_restoration_receipt: pass && /restor|reinstat|retroactive\s+benefit/i.test(exactSource?.text ?? ''),
      authority: {
        external_review: false,
        same_shn_alone_was_sufficient: false,
        exact_source_and_two_independent_rules_required: true
      }
    };
    adjudications.push(record);
    (pass ? verified : rejected).push(record);
  }

  for (const candidate of caseCandidates) {
    const url = String(candidate.url ?? '').trim();
    const shard = Number.parseInt(sha256(Buffer.from(`A07-OFFICIAL-CRAWL-V1\n${url}`, 'utf8')).slice(0, 8), 16) % 16;
    const archiveName = `ssc-rd04-a07-official-crawl-${String(shard).padStart(2, '0')}`;
    const root = extracted.get(`crawl\0${archiveName}`);
    const exactSource = root ? findTextNearFetch(root, (fetch) => String(fetch.url ?? '').trim() === url) : null;
    fail(Boolean(exactSource?.text), `exact official-page text not found ${url}`);
    const shns = [...new Set((candidate.shn_hits ?? []).map(String))].sort();
    const sourceDateHeader = exactSource?.fetch?.final_url ? null : null;
    const actionContexts = exactSource?.text ? exactActionContexts(exactSource.text).filter((row) => !row.disqualified) : [];
    const joined = [];
    if (exactSource?.text) {
      const text = normalize(exactSource.text);
      for (const shn of shns) {
        const shnIndex = text.indexOf(shn);
        for (const action of actionContexts) {
          const actionIndex = text.indexOf(action.phrase);
          if (shnIndex >= 0 && actionIndex >= 0 && Math.abs(shnIndex - actionIndex) <= 2000) {
            joined.push({ shn, distance_chars: Math.abs(shnIndex - actionIndex), action_context: action });
          }
        }
      }
    }
    const pass = false;
    const record = {
      candidate_type: 'official_page_shn_and_completed_action_language',
      candidate_id: `page:${sha256(Buffer.from(url, 'utf8'))}`,
      url,
      source_fetch_sha256: exactSource?.fetch?.body_sha256 ?? exactSource?.fetch?.sha256 ?? null,
      source_text_sha256: exactSource?.text ? sha256(Buffer.from(exactSource.text.replace(/\r\n/g, '\n'), 'utf8')) : null,
      matched_D1_shns: shns,
      proximity_joins: joined,
      disposition: 'unresolved_machine_candidate_without_case_identity_and_date_chain',
      verified_public_implementation_receipt: pass,
      verified_public_restoration_receipt: false,
      authority: {
        exact_shn_string_is_claimant_identity: false,
        generic_page_language_is_case_specific: false,
        external_review: false
      }
    };
    adjudications.push(record);
    rejected.push(record);
  }

  fail(adjudications.length === explicitCandidates.length + caseCandidates.length,
    `adjudication denominator ${adjudications.length} != ${explicitCandidates.length + caseCandidates.length}`);
  const verifiedImplementation = verified.filter((row) => row.verified_public_implementation_receipt);
  const verifiedRestoration = verified.filter((row) => row.verified_public_restoration_receipt);

  const negativeControls = [
    'The county must restore benefits.',
    'The appellant alleges the county has restored benefits.',
    'The county has not restored benefits.',
    'If the county restores benefits, the appeal may be withdrawn.',
    'The county was ordered to issue payment.'
  ];
  for (const control of negativeControls) {
    const qualified = exactActionContexts(`SHN 000000 ${control}`).filter((row) => !row.disqualified);
    fail(qualified.length === 0, `negative control incorrectly qualified: ${control}`, qualified);
  }

  summary = {
    schema_version: 'ssc-rd04-a08-internal-adjudication@1',
    issue_title: 'SSC RD-04 A08 · Internal adjudication and public-source refresh',
    status: failures.length === 0 ? 'pass' : 'fail',
    parent: {
      execution_id: a07.core.execution_id,
      release_sha256: a07.release.combined_sha256,
      machine_candidate_denominator: explicitCandidates.length + caseCandidates.length,
      verified_public_implementation_receipts: a07.core.counts.verified_public_implementation_receipts,
      verified_public_restoration_receipts: a07.core.counts.verified_public_restoration_receipts
    },
    counts: {
      same_shn_decision_candidates: explicitCandidates.length,
      official_page_candidates: caseCandidates.length,
      total_machine_candidates: adjudications.length,
      adjudicated_candidates: adjudications.length,
      internally_supported_public_completed_action_receipts: verifiedImplementation.length,
      internally_supported_public_restoration_receipts: verifiedRestoration.length,
      rejected_or_unresolved_candidates: rejected.length,
      negative_controls: negativeControls.length,
      negative_control_failures: failures.filter((row) => row.message.startsWith('negative control')).length,
      source_or_structure_failures: failures.filter((row) => !row.message.startsWith('negative control')).length,
      external_contacts: 0,
      external_reviews: 0,
      graph_effects: 0
    },
    authority: {
      internal_adjudication_is_external_review: false,
      same_shn_alone_proves_claimant_identity: false,
      official_page_string_hit_proves_case_specific_implementation: false,
      internally_supported_receipt_requires_exact_source_and_two_independent_rules: true,
      missing_public_material_is_noncompliance: false,
      project_blocking: false,
      external_contacts: 0,
      external_reviews: 0,
      graph_effect: 'none'
    },
    failures
  };
  writeJson(path.join(OUT, 'summary.json'), summary);
  writeJson(path.join(OUT, 'adjudications.json'), adjudications);
  writeJson(path.join(OUT, 'internally-supported-receipts.json'), verified);
  writeJson(path.join(OUT, 'rejected-or-unresolved-candidates.json'), rejected);
  writeJson(path.join(OUT, 'failure-ledger.json'), failures);
  writeJson(path.join(OUT, 'negative-controls.json'), negativeControls.map((text) => ({ text, contexts: exactActionContexts(`SHN 000000 ${text}`) })));
  console.log(JSON.stringify(summary.counts));
  if (failures.length) throw new Error(`A08 adjudication failed with ${failures.length} errors`);
} catch (error) {
  if (!summary) {
    summary = {
      schema_version: 'ssc-rd04-a08-internal-adjudication@1',
      status: 'fail',
      counts: { source_or_structure_failures: failures.length + 1, external_contacts: 0, external_reviews: 0, graph_effects: 0 },
      authority: {
        internal_adjudication_is_external_review: false,
        same_shn_alone_proves_claimant_identity: false,
        missing_public_material_is_noncompliance: false,
        project_blocking: false,
        external_contacts: 0,
        graph_effect: 'none'
      },
      failures: [...failures, { message: error.message }]
    };
    writeJson(path.join(OUT, 'summary.json'), summary);
    writeJson(path.join(OUT, 'failure-ledger.json'), summary.failures);
  }
  console.error(error.stack || error.message);
  process.exit(1);
}
