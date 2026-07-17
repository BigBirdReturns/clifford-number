import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { once } from 'node:events';
import { normalizePayeeName } from './fec-payee-inventory.mjs';
import { significantNameTokens } from './oge-fec-overlap.mjs';

export const EMBEDDED_NAME_VERSION = 'oge-fec-embedded-name@1';
const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const jsonLine = value => `${JSON.stringify(value)}\n`;

async function write(stream, value) {
  if (!stream.write(jsonLine(value))) await once(stream, 'drain');
}
async function close(stream) { stream.end(); await once(stream, 'finish'); }
async function hashFile(file) {
  const hash = crypto.createHash('sha256'); let bytes = 0;
  for await (const chunk of fs.createReadStream(file)) { hash.update(chunk); bytes += chunk.length; }
  return { bytes, sha256: hash.digest('hex') };
}
function tokens(value) { return String(value ?? '').split(/\s+/).filter(Boolean); }
function contiguousPositions(haystack, needle) {
  const positions = [];
  for (let start = 0; start <= haystack.length - needle.length; start += 1) {
    if (needle.every((token, offset) => haystack[start + offset] === token)) positions.push(start);
  }
  return positions;
}
function interestId(record) {
  return `oge-interest:${sha256(JSON.stringify([
    record.source_document_id ?? null, record.source_page ?? null,
    record.source_row_label ?? null, record.raw_text_sha256 ?? null,
  ])).slice(0, 32)}`;
}

export async function buildEmbeddedNameIntake({ ogeInterestsFile, fecPayeesFile, outputDir }) {
  const ogePath = path.resolve(ogeInterestsFile);
  const fecPath = path.resolve(fecPayeesFile);
  const ogeInput = await hashFile(ogePath);
  const fecInput = await hashFile(fecPath);
  fs.mkdirSync(outputDir, { recursive: true });
  const candidatesPath = path.join(outputDir, 'embedded-name-candidates.jsonl');
  const rejectionsPath = path.join(outputDir, 'rejections.jsonl');
  const candidateTmp = `${candidatesPath}.tmp`, rejectionTmp = `${rejectionsPath}.tmp`;
  for (const file of [candidateTmp, rejectionTmp]) fs.rmSync(file, { force: true });
  const candidateOut = fs.createWriteStream(candidateTmp, { encoding: 'utf8' });
  const rejectionOut = fs.createWriteStream(rejectionTmp, { encoding: 'utf8' });
  const firstTokenIndex = new Map();
  const payees = new Map();
  const counts = {
    fec_input_lines: 0, fec_indexed_distinctive_candidates: 0, fec_rejected_insufficient_distinctiveness: 0,
    fec_invalid_records: 0, oge_input_lines: 0, oge_valid_named_interests: 0, oge_invalid_records: 0,
    token_postings_visited: 0, exact_equal_pairs_deferred: 0, embedded_candidate_pairs_emitted: 0,
    oge_interests_with_embedded_candidates: 0, oge_interests_without_embedded_candidates: 0,
    trump_token_candidate_pairs: 0,
  };

  let lineNumber = 0;
  const fecLines = readline.createInterface({ input: fs.createReadStream(fecPath), crlfDelay: Infinity });
  for await (const line of fecLines) {
    lineNumber += 1; counts.fec_input_lines += 1;
    let record;
    try { record = JSON.parse(line); } catch { record = null; }
    const normalized = normalizePayeeName(record?.normalized_payee_name);
    const fullTokens = tokens(normalized);
    const distinctive = significantNameTokens(normalized);
    if (!record || !text(record.candidate_id) || !normalized) {
      counts.fec_invalid_records += 1;
      await write(rejectionOut, { schema_version: 'oge-fec-embedded-name-rejection@1', input_side: 'fec_payee', input_line: lineNumber, disposition: 'invalid_payee_candidate', line_sha256: sha256(line), graph_effect: 'none' });
      continue;
    }
    const legalStyleSingleDistinctive = fullTokens.length >= 3
      && distinctive.length >= 1
      && distinctive.some(token => token.length >= 5);
    if (fullTokens.length < 2 || (distinctive.length < 2 && !legalStyleSingleDistinctive)) {
      counts.fec_rejected_insufficient_distinctiveness += 1;
      continue;
    }
    const payee = {
      candidate_id: record.candidate_id, normalized_name: normalized, tokens: fullTokens,
      source_ref: {
        input_file: path.basename(fecPath), input_sha256: fecInput.sha256, input_line: lineNumber,
        candidate_id: record.candidate_id, observed_name_variants: record.observed_name_variants ?? [],
        observed_cycles: record.observed_cycles ?? [], observed_committee_ids: record.observed_committee_ids ?? [],
        source_record_count: record.source_record_count ?? null,
        example_source_record_ids: record.example_source_record_ids ?? [],
        date_range_observed: record.date_range_observed ?? { earliest: null, latest: null },
      },
    };
    payees.set(payee.candidate_id, payee);
    if (!firstTokenIndex.has(fullTokens[0])) firstTokenIndex.set(fullTokens[0], new Set());
    firstTokenIndex.get(fullTokens[0]).add(payee.candidate_id);
    counts.fec_indexed_distinctive_candidates += 1;
  }

  lineNumber = 0;
  const ogeLines = readline.createInterface({ input: fs.createReadStream(ogePath), crlfDelay: Infinity });
  for await (const line of ogeLines) {
    lineNumber += 1; counts.oge_input_lines += 1;
    let record;
    try { record = JSON.parse(line); } catch { record = null; }
    const rawName = text(record?.asset_or_entity_name_as_reported);
    const normalized = normalizePayeeName(rawName);
    if (!record || !rawName || !normalized) {
      counts.oge_invalid_records += 1;
      await write(rejectionOut, { schema_version: 'oge-fec-embedded-name-rejection@1', input_side: 'oge_interest', input_line: lineNumber, disposition: 'invalid_or_blank_interest_name', line_sha256: sha256(line), graph_effect: 'none' });
      continue;
    }
    counts.oge_valid_named_interests += 1;
    const ogeTokens = tokens(normalized);
    const retrieved = new Set();
    for (const token of new Set(ogeTokens)) {
      const postings = firstTokenIndex.get(token);
      if (!postings) continue;
      counts.token_postings_visited += postings.size;
      for (const payeeId of postings) retrieved.add(payeeId);
    }
    let emitted = 0;
    for (const payeeId of [...retrieved].sort()) {
      const payee = payees.get(payeeId);
      if (payee.normalized_name === normalized) { counts.exact_equal_pairs_deferred += 1; continue; }
      const positions = contiguousPositions(ogeTokens, payee.tokens);
      if (!positions.length) continue;
      const id = interestId(record);
      await write(candidateOut, {
        schema_version: 'oge-fec-embedded-name-candidate@1',
        embedded_candidate_id: `oge-fec-embedded:${sha256(`${EMBEDDED_NAME_VERSION}\u0000${id}\u0000${payeeId}`).slice(0, 32)}`,
        candidate_status: 'unresolved_embedded_name_candidate', match_version: EMBEDDED_NAME_VERSION,
        match_rule: 'payee_name_exact_contiguous_token_subsequence',
        match: {
          normalized_oge_label: normalized, normalized_fec_payee_name: payee.normalized_name,
          matched_tokens: payee.tokens, start_token_positions: positions,
          oge_prefix_tokens: ogeTokens.slice(0, positions[0]),
          oge_suffix_tokens: ogeTokens.slice(positions[0] + payee.tokens.length),
          boundary_warning: 'The OGE extraction may concatenate an entity name with descriptive text; token containment identifies a review candidate, not an entity boundary.',
        },
        oge_interest_ref: {
          input_file: path.basename(ogePath), input_sha256: ogeInput.sha256, input_line: lineNumber,
          interest_id: id, source_document_id: record.source_document_id ?? null,
          source_url: record.source_url ?? null, source_sha256: record.source_sha256 ?? null,
          source_page: record.source_page ?? null, source_row_label: record.source_row_label ?? null,
          raw_text_ref: record.raw_text_ref ?? null, raw_text_sha256: record.raw_text_sha256 ?? null,
          asset_or_entity_name_as_reported: rawName,
        },
        holder: {
          person_id: record.person_id ?? null, person_name: record.person_name ?? null,
          interest_holder_scope: record.interest_holder_scope ?? 'unknown', record_kind: record.record_kind ?? null,
          interest_type_as_reported: record.interest_type_as_reported ?? null,
        },
        interest_dates: {
          valid_from: record.valid_from ?? null, valid_until: record.valid_until ?? null,
          transaction_date_as_reported: record.transaction_date_as_reported ?? null, report_date: record.report_date ?? null,
        },
        fec_payee_ref: payee.source_ref,
        allowed_language: 'The full normalized FEC payee label appears as an exact contiguous token sequence inside the longer machine-extracted OGE label.',
        forbidden_inferences: [
          'embedded_name_resolves_identity', 'embedded_text_defines_legal_entity_boundary',
          'parent_subsidiary_brand_property_or_franchise_are_aliases',
          'embedded_name_establishes_beneficial_ownership_or_control',
          'embedded_name_establishes_temporal_overlap_coordination_intent_self_dealing_or_wrongdoing',
        ],
        verification_status: 'machine_generated_unreviewed', causal_status: 'not_established', graph_effect: 'none',
      });
      counts.embedded_candidate_pairs_emitted += 1; emitted += 1;
      if (payee.tokens.includes('TRUMP')) counts.trump_token_candidate_pairs += 1;
    }
    if (emitted) counts.oge_interests_with_embedded_candidates += 1;
    else counts.oge_interests_without_embedded_candidates += 1;
  }
  await close(candidateOut); await close(rejectionOut);
  for (const file of [candidatesPath, rejectionsPath]) fs.rmSync(file, { force: true });
  fs.renameSync(candidateTmp, candidatesPath); fs.renameSync(rejectionTmp, rejectionsPath);
  const manifest = {
    schema_version: 'oge-fec-embedded-name-manifest@1', match_version: EMBEDDED_NAME_VERSION,
    inputs: {
      oge_interests: { path: path.basename(ogePath), ...ogeInput },
      fec_payee_candidates: { path: path.basename(fecPath), ...fecInput },
    },
    outputs: {
      candidates: { path: path.basename(candidatesPath), ...await hashFile(candidatesPath) },
      rejections: { path: path.basename(rejectionsPath), ...await hashFile(rejectionsPath) },
    },
    coverage: counts,
    retrieval_contract: 'FEC payees with at least two distinctive tokens are indexed by their first normalized token. A legal-style name of at least three full tokens may also enter with one distinctive token of at least five characters. A candidate emits only when the complete payee token sequence occurs contiguously inside a strictly longer OGE label.',
    interpretation: [
      'This pass preserves possible entity-name boundaries hidden inside concatenated OGE descriptions; it does not resolve identity.',
      'Exact full-label matches are intentionally deferred to the separate exact-match intake.',
      'Nested legal names, parents, subsidiaries, brands, properties, franchisees, and operators remain distinct candidates.',
    ],
    verification_status: 'machine_generated_unreviewed', causal_status: 'not_established', graph_effect: 'none',
  };
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, manifestPath };
}
