import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { once } from 'node:events';
import { normalizePayeeName } from './fec-payee-inventory.mjs';

export const SEC_INTAKE_VERSION = 'sec-exact-overlap-intake@1';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const jsonLine = value => `${JSON.stringify(value)}\n`;
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;

async function write(stream, value) {
  if (!stream.write(jsonLine(value))) await once(stream, 'drain');
}

async function close(stream) {
  stream.end();
  await once(stream, 'finish');
}

async function hashFile(file) {
  const hash = crypto.createHash('sha256');
  let bytes = 0;
  for await (const chunk of fs.createReadStream(file)) {
    hash.update(chunk); bytes += chunk.length;
  }
  return { bytes, sha256: hash.digest('hex') };
}

function validSecRecord(record) {
  return text(record?.query_name)
    && text(record?.sec_title)
    && /^\d{10}$/.test(record?.cik ?? '')
    && text(record?.ticker)
    && /^https:\/\/www\.sec\.gov\//.test(record?.source_url ?? '')
    && /^https:\/\/www\.sec\.gov\//.test(record?.entity_url ?? '');
}

function candidateId(overlapId, cik) {
  return `sec-identifier-candidate:${sha256(`${SEC_INTAKE_VERSION}\u0000${overlapId}\u0000${cik}`).slice(0, 32)}`;
}

function candidateRecord(overlap, sec, candidateSetSize, secInput) {
  const ambiguous = candidateSetSize > 1;
  return {
    schema_version: 'sec-identifier-candidate@1',
    identifier_candidate_id: candidateId(overlap.overlap_candidate_id, sec.cik),
    intake_version: SEC_INTAKE_VERSION,
    disposition: ambiguous ? 'ambiguous_official_identifier_candidate' : 'official_identifier_candidate_unresolved',
    identity_resolution_status: 'unresolved',
    reason_identity_not_resolved: ambiguous
      ? 'The source label produces multiple SEC registrant candidates and has no discriminator.'
      : 'The SEC record identifies a registrant, but the OGE and FEC rows reach it only through a name-based candidate mapping; no second independent strong anchor connects either row to this registrant.',
    candidate_set_size: candidateSetSize,
    weak_cross_source_anchor: {
      kind: 'name_candidate_mapping',
      overlap_normalized_name: overlap.match.normalized_interest_name,
      curated_query_name: sec.query_name,
      mapping_basis: sec.mapping_basis,
      strength: 'weak',
    },
    official_identifier_anchor: {
      kind: 'sec_cik',
      identifier: sec.cik,
      ticker: sec.ticker,
      sec_registrant_title: sec.sec_title,
      establishes: 'The cited SEC source associates this registrant title and ticker with this CIK.',
      does_not_establish: 'That the OGE interest or FEC payee is this registrant, its parent, its subsidiary, its franchisee, its property, or its operating affiliate.',
    },
    sec_receipt: {
      source_url: sec.source_url,
      entity_url: sec.entity_url,
      observed_on: sec.observed_on,
      source_capture_status: sec.source_capture_status,
      curated_snapshot_file: path.basename(secInput.path),
      curated_snapshot_sha256: secInput.sha256,
    },
    oge_fec_overlap_ref: {
      overlap_candidate_id: overlap.overlap_candidate_id,
      match_rule: overlap.match_rule,
      oge_interest_ref: overlap.oge_interest_ref,
      holder: overlap.holder,
      interest_dates: overlap.interest_dates,
      fec_payee_ref: overlap.fec_payee_ref,
    },
    entity_boundary: {
      candidate_node_type: 'sec_registrant',
      parent_relationship: 'unresolved',
      subsidiary_relationship: 'unresolved',
      brand_relationship: 'unresolved',
      franchise_or_operator_relationship: 'unresolved',
      merge_permitted: false,
    },
    allowed_language: 'The unresolved OGE/FEC lexical-overlap row has the listed SEC registrant as an official-identifier candidate requiring independent identity evidence.',
    forbidden_inferences: [
      'name_equality_resolves_identity',
      'sec_registrant_is_fec_payee_without_second_anchor',
      'sec_registrant_is_oge_interest_without_second_anchor',
      'parent_subsidiary_brand_property_or_franchise_are_aliases',
      'candidate_identifier_establishes_beneficial_ownership',
      'candidate_identifier_establishes_temporal_overlap',
      'candidate_identifier_establishes_coordination_intent_self_dealing_or_wrongdoing',
    ],
    verification_status: 'machine_generated_unreviewed',
    causal_status: 'not_established',
    graph_effect: 'none',
  };
}

export async function buildSecExactOverlapIntake({ overlapFile, secCandidatesFile, outputDir }) {
  const overlapPath = path.resolve(overlapFile);
  const secPath = path.resolve(secCandidatesFile);
  const overlapInput = await hashFile(overlapPath);
  const secInput = { path: secPath, ...await hashFile(secPath) };
  fs.mkdirSync(outputDir, { recursive: true });
  const candidatesPath = path.join(outputDir, 'sec-identifier-candidates.jsonl');
  const rejectionsPath = path.join(outputDir, 'rejections.jsonl');
  const candidateTmp = `${candidatesPath}.tmp`;
  const rejectionTmp = `${rejectionsPath}.tmp`;
  for (const file of [candidateTmp, rejectionTmp]) fs.rmSync(file, { force: true });
  const candidateOut = fs.createWriteStream(candidateTmp, { encoding: 'utf8' });
  const rejectionOut = fs.createWriteStream(rejectionTmp, { encoding: 'utf8' });
  const secByQuery = new Map();
  const counts = {
    sec_snapshot_lines: 0, sec_snapshot_valid_records: 0, sec_snapshot_invalid_records: 0,
    overlap_input_lines: 0, exact_overlap_rows_in_scope: 0, non_exact_overlap_rows_ignored: 0,
    exact_rows_with_single_sec_candidate: 0, exact_rows_with_ambiguous_sec_candidates: 0,
    exact_rows_without_sec_candidate: 0, identifier_candidate_rows_emitted: 0,
    accepted_identity_resolutions: 0, rows_not_promoted_name_only: 0,
  };
  const exactNames = new Set();
  const exactPairs = new Set();
  const singleNames = new Set();
  const ambiguousNames = new Set();
  const unmatchedNames = new Set();

  let lineNumber = 0;
  const secLines = readline.createInterface({ input: fs.createReadStream(secPath), crlfDelay: Infinity });
  for await (const line of secLines) {
    lineNumber += 1; counts.sec_snapshot_lines += 1;
    let record;
    try { record = JSON.parse(line); } catch { record = null; }
    if (!validSecRecord(record)) {
      counts.sec_snapshot_invalid_records += 1;
      await write(rejectionOut, {
        schema_version: 'sec-exact-overlap-rejection@1', input_side: 'sec_candidate_snapshot', input_line: lineNumber,
        disposition: 'invalid_sec_candidate_record', line_sha256: sha256(line), graph_effect: 'none',
      });
      continue;
    }
    const query = normalizePayeeName(record.query_name);
    if (!secByQuery.has(query)) secByQuery.set(query, []);
    secByQuery.get(query).push(record);
    counts.sec_snapshot_valid_records += 1;
  }
  for (const records of secByQuery.values()) records.sort((a, b) => a.cik.localeCompare(b.cik));

  lineNumber = 0;
  const overlapLines = readline.createInterface({ input: fs.createReadStream(overlapPath), crlfDelay: Infinity });
  for await (const line of overlapLines) {
    lineNumber += 1; counts.overlap_input_lines += 1;
    let overlap;
    try { overlap = JSON.parse(line); } catch { overlap = null; }
    if (!overlap || typeof overlap !== 'object') {
      await write(rejectionOut, {
        schema_version: 'sec-exact-overlap-rejection@1', input_side: 'oge_fec_overlap', input_line: lineNumber,
        disposition: 'invalid_overlap_record', line_sha256: sha256(line), graph_effect: 'none',
      });
      continue;
    }
    if (overlap.match_rule !== 'exact_normalized_name') {
      counts.non_exact_overlap_rows_ignored += 1;
      continue;
    }
    counts.exact_overlap_rows_in_scope += 1;
    const normalizedName = normalizePayeeName(overlap.match?.normalized_interest_name);
    exactNames.add(normalizedName);
    exactPairs.add(`${normalizedName}\u0000${overlap.fec_payee_ref?.candidate_id ?? ''}`);
    const secCandidates = secByQuery.get(normalizedName) ?? [];
    if (!secCandidates.length) {
      counts.exact_rows_without_sec_candidate += 1;
      unmatchedNames.add(normalizedName);
      await write(rejectionOut, {
        schema_version: 'sec-exact-overlap-rejection@1', input_side: 'candidate_resolution', input_line: lineNumber,
        disposition: 'no_official_sec_identifier_candidate', overlap_candidate_id: overlap.overlap_candidate_id,
        normalized_name: normalizedName,
        note: 'No curated SEC registrant candidate was located. This is not evidence that no legal entity exists or that the payee is not an SEC registrant affiliate.',
        graph_effect: 'none',
      });
      continue;
    }
    if (secCandidates.length === 1) {
      counts.exact_rows_with_single_sec_candidate += 1;
      singleNames.add(normalizedName);
    } else {
      counts.exact_rows_with_ambiguous_sec_candidates += 1;
      ambiguousNames.add(normalizedName);
    }
    counts.rows_not_promoted_name_only += 1;
    for (const sec of secCandidates) {
      await write(candidateOut, candidateRecord(overlap, sec, secCandidates.length, secInput));
      counts.identifier_candidate_rows_emitted += 1;
    }
    await write(rejectionOut, {
      schema_version: 'sec-exact-overlap-rejection@1', input_side: 'candidate_resolution', input_line: lineNumber,
      disposition: secCandidates.length > 1 ? 'ambiguous_official_identifier_candidates' : 'identity_not_promoted_name_only',
      overlap_candidate_id: overlap.overlap_candidate_id, normalized_name: normalizedName,
      candidate_ciks: secCandidates.map(record => record.cik),
      missing_discriminator: 'Independent official identifier, contemporaneous address, account/vendor identifier, contract, invoice, or source-native cross-reference connecting the OGE/FEC row to the SEC registrant.',
      graph_effect: 'none',
    });
  }

  await close(candidateOut); await close(rejectionOut);
  for (const file of [candidatesPath, rejectionsPath]) fs.rmSync(file, { force: true });
  fs.renameSync(candidateTmp, candidatesPath); fs.renameSync(rejectionTmp, rejectionsPath);
  const manifest = {
    schema_version: 'sec-exact-overlap-intake-manifest@1', intake_version: SEC_INTAKE_VERSION,
    inputs: {
      oge_fec_overlap_candidates: { path: path.basename(overlapPath), ...overlapInput },
      curated_sec_identifier_candidates: { path: path.basename(secPath), bytes: secInput.bytes, sha256: secInput.sha256 },
    },
    outputs: {
      candidates: { path: path.basename(candidatesPath), ...await hashFile(candidatesPath) },
      rejections: { path: path.basename(rejectionsPath), ...await hashFile(rejectionsPath) },
    },
    coverage: {
      ...counts,
      unique_exact_names: exactNames.size,
      unique_exact_name_payee_pairs: exactPairs.size,
      unique_names_with_single_sec_candidate: singleNames.size,
      unique_names_with_ambiguous_sec_candidates: ambiguousNames.size,
      unique_names_without_sec_candidate: unmatchedNames.size,
    },
    receipt_limitation: 'The official SEC URLs were observable through public web retrieval, but direct raw snapshot download returned HTTP 403. The curated derivative is hash-pinned here; official source content hashes remain unavailable. No candidate is promoted to resolved identity.',
    interpretation: [
      'A CIK identifies the cited SEC registrant. It does not identify an OGE interest or FEC payee unless a separate source connects that row to the registrant.',
      'Name equality is a weak candidate-generation anchor and never resolves identity in this intake.',
      'Parents, subsidiaries, brands, properties, franchisees, licensees, and operating affiliates remain distinct and unresolved.',
    ],
    verification_status: 'machine_generated_unreviewed', causal_status: 'not_established', graph_effect: 'none',
  };
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, manifestPath };
}
