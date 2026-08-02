#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const DOWNLOAD = path.join(ROOT, 'a07-shn-download');
const OUT = path.join(ROOT, 'a07-shn-full-reconciled');
const SHARD_COUNT = 32;
const A06_SLUG = 'status-sovereignty-rd04-calfresh-decision-corpus-a06';
const A06_SHARDS = path.join(ROOT, 'data/intake', A06_SLUG, 'denominator-shards');
const A06_RELEASE = path.join(ROOT, 'data/project', `${A06_SLUG}-release-manifest.json`);
const EXPECTED_A06_RELEASE = 'f9d1c128da51b43c3e06cca74ba9bc9cd5848729af4b1c4ca0269891ae85c7a5';
const RELIEF = new Set(['Grant', 'Partial Grant', 'Stipulation']);

const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const stable = (value) => `${JSON.stringify(value, null, 2)}\n`;
const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));
const writeJson = (file, value) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, stable(value)); };
const increment = (map, key) => map.set(key, (map.get(key) ?? 0) + 1);

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });
const failures = [];
const fail = (condition, message, context = null) => { if (!condition) failures.push({ message, context }); };

function loadCanonical() {
  const release = readJson(A06_RELEASE);
  fail(release.combined_sha256 === EXPECTED_A06_RELEASE,
    `canonical A06 release ${release.combined_sha256} != ${EXPECTED_A06_RELEASE}`);
  const allRegistryIds = new Set();
  const allDocumentIds = new Set();
  const reliefRows = [];
  const reliefDocuments = new Set();
  const shnMap = new Map();

  for (let index = 0; index < 64; index += 1) {
    const id = String(index).padStart(2, '0');
    const file = path.join(A06_SHARDS, `${id}.json`);
    fail(fs.existsSync(file), `missing canonical A06 shard ${id}`);
    if (!fs.existsSync(file)) continue;
    const shard = readJson(file);
    fail(shard.schema_version === 'ssc-rd04-a06-document-shard-plan@1', `canonical shard ${id} schema`);
    for (const document of shard.documents ?? []) {
      const documentIdentity = String(document.document_identity ?? '').trim();
      if (documentIdentity) allDocumentIds.add(documentIdentity);
      for (const row of document.registry_rows ?? []) {
        const registryId = String(row.registry_id ?? '').trim();
        fail(Boolean(registryId), `canonical shard ${id} row missing registryId`);
        fail(!allRegistryIds.has(registryId), `canonical duplicate registryId ${registryId}`);
        if (registryId) allRegistryIds.add(registryId);
        if (RELIEF.has(String(row.disposition ?? '').trim())) {
          const normalized = {
            registry_id: registryId,
            document_identity: documentIdentity,
            shn_number: String(row.shn_number ?? '').trim(),
            release_date: String(row.release_date ?? '').trim(),
            disposition: String(row.disposition ?? '').trim()
          };
          reliefRows.push(normalized);
          reliefDocuments.add(documentIdentity);
          const bucket = shnMap.get(normalized.shn_number) ?? [];
          bucket.push(normalized);
          shnMap.set(normalized.shn_number, bucket);
        }
      }
    }
  }

  fail(allRegistryIds.size === 12282, `A06 registry rows ${allRegistryIds.size} != 12282`);
  fail(allDocumentIds.size === 11672, `A06 documents ${allDocumentIds.size} != 11672`);
  fail(reliefRows.length === 6633, `D1 relief rows ${reliefRows.length} != 6633`);
  fail(reliefDocuments.size === 6294, `D1 relief documents ${reliefDocuments.size} != 6294`);
  fail(shnMap.size === 6292, `D1 unique SHNs ${shnMap.size} != 6292`);

  const shardFor = (shn) => Number.parseInt(sha256(Buffer.from(`A07-SHN-FULL-V2\n${shn}`, 'utf8')).slice(0, 8), 16) % SHARD_COUNT;
  return { release, allRegistryIds, allDocumentIds, reliefRows, reliefDocuments, shnMap, shardFor };
}

let summary;
try {
  const canonical = loadCanonical();
  const artifactDirectories = fs.existsSync(DOWNLOAD)
    ? fs.readdirSync(DOWNLOAD, { withFileTypes: true })
      .filter((entry) => entry.isDirectory() && entry.name.startsWith('ssc-rd04-a07-shn-full-'))
      .map((entry) => path.join(DOWNLOAD, entry.name))
      .sort()
    : [];
  fail(artifactDirectories.length === SHARD_COUNT,
    `downloaded shard artifacts ${artifactDirectories.length} != ${SHARD_COUNT}`,
    artifactDirectories.map((row) => path.basename(row)));

  const shardSummaries = [];
  const allResults = [];
  const observedShards = new Set();
  const observedShns = new Map();
  const observedRegistryIds = new Map();
  const candidateRegistryIds = new Map();
  let queryReceipts = 0;
  let cappedParentSlices = 0;
  let unresolvedCappedShns = 0;
  let shardFailures = 0;

  for (const directory of artifactDirectories) {
    const summaryPath = path.join(directory, 'summary.json');
    const resultsPath = path.join(directory, 'results.json');
    fail(fs.existsSync(summaryPath), `missing shard summary ${directory}`);
    fail(fs.existsSync(resultsPath), `missing shard results ${directory}`);
    if (!fs.existsSync(summaryPath) || !fs.existsSync(resultsPath)) continue;
    const shardSummary = readJson(summaryPath);
    const results = readJson(resultsPath);
    const shardId = String(shardSummary.shard ?? '');
    fail(/^\d{2}$/.test(shardId), `invalid shard id ${shardId}`);
    fail(!observedShards.has(shardId), `duplicate shard artifact ${shardId}`);
    observedShards.add(shardId);
    fail(shardSummary.status === 'pass', `shard ${shardId} status ${shardSummary.status}`, shardSummary.failures);
    fail(shardSummary.shard_count === SHARD_COUNT, `shard ${shardId} shard_count ${shardSummary.shard_count}`);
    fail(Array.isArray(results), `shard ${shardId} results not array`);
    fail(results.length === shardSummary.counts.assigned_shns,
      `shard ${shardId} results ${results.length} != assigned ${shardSummary.counts.assigned_shns}`);
    queryReceipts += Number(shardSummary.counts.query_receipts ?? 0);
    cappedParentSlices += Number(shardSummary.counts.capped_parent_slices ?? 0);
    unresolvedCappedShns += Number(shardSummary.counts.unresolved_capped_shns ?? 0);
    shardFailures += Number(shardSummary.counts.failures ?? 0);
    shardSummaries.push(shardSummary);

    for (const result of results) {
      const shn = String(result.shn ?? '').trim();
      fail(Boolean(shn), `shard ${shardId} blank SHN result`);
      fail(!observedShns.has(shn), `duplicate SHN across shards ${shn}`,
        { first: observedShns.get(shn), second: shardId });
      observedShns.set(shn, shardId);
      fail(canonical.shnMap.has(shn), `unknown SHN in shard results ${shn}`);
      fail(canonical.shardFor(shn) === Number(shardId),
        `SHN ${shn} assigned to shard ${shardId} but expected ${String(canonical.shardFor(shn)).padStart(2, '0')}`);
      fail(result.known_ids_reproduced === true, `SHN ${shn} did not reproduce known IDs`);
      fail(result.unresolved_cap === false, `SHN ${shn} unresolved source cap`);
      fail(Array.isArray(result.rows), `SHN ${shn} rows not array`);
      fail(Array.isArray(result.candidate_rows), `SHN ${shn} candidate_rows not array`);

      const expectedKnown = (canonical.shnMap.get(shn) ?? []).map((row) => row.registry_id).sort();
      const observedKnown = [...(result.known_d1_registry_ids ?? [])].sort();
      fail(stable(expectedKnown) === stable(observedKnown), `SHN ${shn} known D1 identity drift`);

      for (const row of result.rows ?? []) {
        const registryId = String(row.registry_id ?? '').trim();
        fail(Boolean(registryId), `SHN ${shn} row missing registryId`);
        fail(String(row.shn_number ?? '').trim() === shn,
          `SHN ${shn} result row leaked SHN ${String(row.shn_number ?? '').trim()}`);
        fail(!observedRegistryIds.has(registryId), `registryId ${registryId} appears in multiple SHN results`,
          { first: observedRegistryIds.get(registryId), second: shn });
        observedRegistryIds.set(registryId, shn);
      }
      for (const row of result.candidate_rows ?? []) {
        const registryId = String(row.registry_id ?? '').trim();
        fail(!canonical.allRegistryIds.has(registryId), `candidate ${registryId} already belongs to A06`);
        fail(!candidateRegistryIds.has(registryId), `duplicate candidate registryId ${registryId}`);
        candidateRegistryIds.set(registryId, { ...row, matched_d1_shn: shn });
      }
      allResults.push(result);
    }
  }

  for (let index = 0; index < SHARD_COUNT; index += 1) {
    const id = String(index).padStart(2, '0');
    fail(observedShards.has(id), `missing reconciled shard ${id}`);
  }
  for (const shn of canonical.shnMap.keys()) fail(observedShns.has(shn), `missing D1 SHN ${shn}`);

  fail(observedShns.size === 6292, `reconciled SHNs ${observedShns.size} != 6292`);
  fail(shardFailures === 0, `shard failure count ${shardFailures}`);
  fail(unresolvedCappedShns === 0, `unresolved capped SHNs ${unresolvedCappedShns}`);

  const candidateRows = [...candidateRegistryIds.values()]
    .sort((a, b) => a.registry_id.localeCompare(b.registry_id));
  const candidateDocuments = new Map();
  const programCounts = new Map();
  const dispositionCounts = new Map();
  const releaseDateCounts = new Map();
  const candidateShns = new Set();
  let crossProgramCandidates = 0;
  let postFyCandidates = 0;

  for (const row of candidateRows) {
    candidateShns.add(row.matched_d1_shn);
    increment(programCounts, row.program || '<empty>');
    increment(dispositionCounts, row.disposition || '<empty>');
    increment(releaseDateCounts, row.release_date || '<empty>');
    if (row.program !== 'CalFresh') crossProgramCandidates += 1;
    const match = String(row.release_date ?? '').match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (match) {
      const date = Date.UTC(Number(match[3]), Number(match[1]) - 1, Number(match[2]));
      if (date > Date.UTC(2026, 5, 30)) postFyCandidates += 1;
    }
    const identity = String(row.document_identity ?? '').trim();
    fail(Boolean(identity), `candidate ${row.registry_id} missing document identity`);
    const document = candidateDocuments.get(identity) ?? {
      document_identity: identity,
      archived: Boolean(row.archived),
      decision_id: String(row.decision_id ?? '').trim(),
      archive_registry_id: String(row.archive_registry_id ?? '').trim(),
      registry_ids: [],
      matched_d1_shns: [],
      rows: []
    };
    document.registry_ids.push(row.registry_id);
    document.matched_d1_shns.push(row.matched_d1_shn);
    document.rows.push(row);
    candidateDocuments.set(identity, document);
  }

  const documentRows = [...candidateDocuments.values()].map((document) => ({
    ...document,
    registry_ids: [...new Set(document.registry_ids)].sort(),
    matched_d1_shns: [...new Set(document.matched_d1_shns)].sort(),
    rows: document.rows.sort((a, b) => a.registry_id.localeCompare(b.registry_id))
  })).sort((a, b) => a.document_identity.localeCompare(b.document_identity));

  summary = {
    schema_version: 'ssc-rd04-a07-shn-full-reconciliation@2',
    issue: 739,
    status: failures.length === 0 ? 'pass' : 'fail',
    as_of_cutoff: '2026-08-02T00:00:00Z',
    parent: {
      a06_release_sha256: canonical.release.combined_sha256,
      a06_registry_rows: canonical.allRegistryIds.size,
      a06_documents: canonical.allDocumentIds.size,
      d1_relief_rows: canonical.reliefRows.length,
      d1_relief_documents: canonical.reliefDocuments.size,
      d1_unique_nonblank_shns: canonical.shnMap.size
    },
    query_contract: {
      released_after: '07/01/2025',
      released_before: '08/01/2026',
      exact_shn_queries: 6292,
      program_filter: 'omitted_all_programs',
      outcome_filter: 'none',
      source_cap_resolution: 'recursive_nonoverlapping_date_partition'
    },
    counts: {
      shard_artifacts: artifactDirectories.length,
      reconciled_shards: observedShards.size,
      D1_shns: observedShns.size,
      query_receipts: queryReceipts,
      capped_parent_slices: cappedParentSlices,
      unresolved_capped_shns: unresolvedCappedShns,
      unique_registry_rows_returned: observedRegistryIds.size,
      public_followup_candidate_rows: candidateRows.length,
      public_followup_candidate_documents: documentRows.length,
      D1_shns_with_public_followup_candidates: candidateShns.size,
      cross_program_candidate_rows: crossProgramCandidates,
      post_FY_candidate_rows: postFyCandidates,
      failures: failures.length
    },
    candidate_distributions: {
      programs: Object.fromEntries([...programCounts.entries()].sort()),
      dispositions: Object.fromEntries([...dispositionCounts.entries()].sort()),
      release_dates: Object.fromEntries([...releaseDateCounts.entries()].sort())
    },
    authority: {
      complete_exact_shn_public_registry_denominator: failures.length === 0,
      candidate_is_same_public_shn: true,
      same_shn_proves_same_claimant: false,
      same_shn_proves_implementation: false,
      same_shn_proves_restoration: false,
      same_shn_proves_payment: false,
      same_shn_proves_timeliness: false,
      missing_public_followup_is_noncompliance: false,
      external_contacts: 0,
      external_reviews: 0,
      graph_effect: 'none',
      publication_effect: 'none',
      adoption_effect: 'none'
    },
    failures
  };

  allResults.sort((a, b) => a.shn.localeCompare(b.shn));
  writeJson(path.join(OUT, 'summary.json'), summary);
  writeJson(path.join(OUT, 'shard-summaries.json'), shardSummaries.sort((a, b) => a.shard.localeCompare(b.shard)));
  writeJson(path.join(OUT, 'all-shn-results.json'), allResults);
  writeJson(path.join(OUT, 'candidate-rows.json'), candidateRows);
  writeJson(path.join(OUT, 'candidate-documents.json'), documentRows);
  writeJson(path.join(OUT, 'failure-ledger.json'), failures);
  console.log(JSON.stringify(summary.counts));
  if (failures.length) throw new Error(`A07 exact-SHN reconciliation failed with ${failures.length} errors`);
} catch (error) {
  if (!summary) {
    summary = {
      schema_version: 'ssc-rd04-a07-shn-full-reconciliation@2',
      issue: 739,
      status: 'fail',
      counts: { failures: failures.length + 1 },
      authority: {
        complete_exact_shn_public_registry_denominator: false,
        same_shn_proves_implementation: false,
        missing_public_followup_is_noncompliance: false,
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
