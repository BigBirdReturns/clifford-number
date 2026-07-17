import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import readline from 'node:readline';
import { once } from 'node:events';
import { normalizePayeeName } from './fec-payee-inventory.mjs';

export const OVERLAP_MATCH_VERSION = 'oge-fec-payee-overlap@1';
export const HIGH_SIMILARITY_THRESHOLDS = Object.freeze({
  minimum_shared_tokens: 2,
  minimum_jaccard: 0.75,
  subset_minimum_containment: 1,
  subset_minimum_dice: 0.8,
  maximum_posting_fraction: 0.02,
  minimum_maximum_posting_size: 250,
});

const LEGAL_SUFFIXES = new Set([
  'LLC', 'LLP', 'LP', 'LTD', 'LIMITED', 'INC', 'INCORPORATED', 'CORP', 'CORPORATION',
  'CO', 'COMPANY', 'PLC', 'PLLC', 'PC', 'PA', 'NA', 'NV',
]);
const NON_DISTINCTIVE_TOKENS = new Set([
  'THE', 'A', 'AN', 'AND', 'OR', 'OF', 'FOR', 'TO', 'AT', 'IN', 'ON', 'BY', 'FROM',
  'US', 'USA', 'UNITED', 'STATES', ...LEGAL_SUFFIXES,
  'GROUP', 'HOLDING', 'HOLDINGS', 'SERVICE', 'SERVICES', 'ASSOCIATES', 'PARTNERS',
  'ENTERPRISE', 'ENTERPRISES', 'MANAGEMENT', 'CONSULTING', 'SOLUTIONS',
]);
const RULE_RANK = Object.freeze({
  exact_normalized_name: 1,
  conservative_parenthetical_or_base_name: 2,
  token_indexed_high_similarity: 3,
});
const MAX_REJECTED_EXAMPLES = 5;

const sha256 = value => crypto.createHash('sha256').update(value).digest('hex');
const text = value => typeof value === 'string' && value.trim() ? value.trim() : null;
const jsonLine = value => `${JSON.stringify(value)}\n`;

function stableObject(value) {
  if (Array.isArray(value)) return value.map(stableObject);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, stableObject(value[key])]));
}

function stableJson(value) {
  return JSON.stringify(stableObject(value));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

function increment(object, key, amount = 1) {
  object[key] = (object[key] ?? 0) + amount;
}

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
    hash.update(chunk);
    bytes += chunk.length;
  }
  return { bytes, sha256: hash.digest('hex') };
}

function addIndex(index, key, value) {
  if (!key) return;
  if (!index.has(key)) index.set(key, new Set());
  index.get(key).add(value);
}

export function significantNameTokens(normalizedName) {
  return uniqueSorted(String(normalizedName ?? '')
    .split(/\s+/)
    .filter(token => token && /[A-Z0-9]/.test(token) && !NON_DISTINCTIVE_TOKENS.has(token)));
}

function stripTrailingParentheticals(rawName) {
  let value = String(rawName ?? '').trim();
  let changed = false;
  while (/\s*\([^()]{1,120}\)\s*$/.test(value)) {
    value = value.replace(/\s*\([^()]{1,120}\)\s*$/, '').trim();
    changed = true;
  }
  return { value, changed };
}

function stripLegalSuffixes(normalizedName) {
  const tokens = String(normalizedName ?? '').split(/\s+/).filter(Boolean);
  let changed = false;
  while (tokens.length && LEGAL_SUFFIXES.has(tokens.at(-1))) {
    tokens.pop();
    changed = true;
  }
  return { value: tokens.join(' '), changed };
}

function distinctiveBase(value) {
  const tokens = significantNameTokens(value);
  return tokens.length >= 2 || (tokens.length === 1 && tokens[0].length >= 8);
}

export function conservativeBaseForms(rawName) {
  const forms = new Map();
  const add = (value, method) => {
    const normalized = normalizePayeeName(value);
    if (!normalized || !distinctiveBase(normalized)) return;
    if (!forms.has(normalized)) forms.set(normalized, new Set());
    forms.get(normalized).add(method);
    const suffix = stripLegalSuffixes(normalized);
    if (suffix.changed && suffix.value && distinctiveBase(suffix.value)) {
      if (!forms.has(suffix.value)) forms.set(suffix.value, new Set());
      forms.get(suffix.value).add(`${method}+terminal_legal_suffix_removed`);
    }
  };
  add(rawName, 'as_reported_normalized');
  const parenthetical = stripTrailingParentheticals(rawName);
  if (parenthetical.changed) add(parenthetical.value, 'trailing_parenthetical_removed');
  return forms;
}

export function scoreTokenSets(leftTokens, rightTokens) {
  const left = new Set(leftTokens);
  const right = new Set(rightTokens);
  const shared = [...left].filter(token => right.has(token)).sort();
  const unionSize = new Set([...left, ...right]).size;
  const jaccard = unionSize ? shared.length / unionSize : 0;
  const dice = left.size + right.size ? (2 * shared.length) / (left.size + right.size) : 0;
  const minimumSize = Math.min(left.size, right.size);
  const containment = minimumSize ? shared.length / minimumSize : 0;
  return {
    shared_tokens: shared,
    interest_only_tokens: [...left].filter(token => !right.has(token)).sort(),
    payee_only_tokens: [...right].filter(token => !left.has(token)).sort(),
    jaccard: Number(jaccard.toFixed(6)),
    dice: Number(dice.toFixed(6)),
    containment: Number(containment.toFixed(6)),
  };
}

export function passesHighSimilarity(score) {
  if (score.shared_tokens.length < HIGH_SIMILARITY_THRESHOLDS.minimum_shared_tokens) return false;
  if (score.jaccard >= HIGH_SIMILARITY_THRESHOLDS.minimum_jaccard) return true;
  return score.containment >= HIGH_SIMILARITY_THRESHOLDS.subset_minimum_containment
    && score.dice >= HIGH_SIMILARITY_THRESHOLDS.subset_minimum_dice;
}

function interestId(record) {
  const material = stableJson({
    source_document_id: record.source_document_id ?? null,
    source_page: record.source_page ?? null,
    source_row_label: record.source_row_label ?? null,
    raw_text_sha256: record.raw_text_sha256 ?? null,
    name: record.asset_or_entity_name_as_reported ?? null,
  });
  return `oge-interest:${sha256(material).slice(0, 32)}`;
}

function overlapId(ogeInterestId, payeeCandidateId, rule) {
  return `oge-fec-overlap:${sha256(`${OVERLAP_MATCH_VERSION}\u0000${ogeInterestId}\u0000${payeeCandidateId}\u0000${rule}`).slice(0, 32)}`;
}

function payeeProjection(record, inputFile, inputSha256, inputLine) {
  return {
    candidate_id: record.candidate_id,
    normalized_name: record.normalized_payee_name,
    tokens: significantNameTokens(record.normalized_payee_name),
    base_forms: (() => {
      const forms = new Map();
      const variants = Array.isArray(record.observed_name_variants) ? record.observed_name_variants : [];
      for (const raw of [record.normalized_payee_name, ...variants.map(value => value?.value)]) {
        for (const [form, methods] of conservativeBaseForms(raw)) {
          if (!forms.has(form)) forms.set(form, new Set());
          for (const method of methods) forms.get(form).add(method);
        }
      }
      return forms;
    })(),
    source_ref: {
      input_file: inputFile,
      input_sha256: inputSha256,
      input_line: inputLine,
      candidate_id: record.candidate_id,
      grouping_basis: record.grouping_basis ?? null,
      observed_name_variants: record.observed_name_variants ?? [],
      observed_cycles: record.observed_cycles ?? [],
      observed_committee_ids: record.observed_committee_ids ?? [],
      source_record_count: record.source_record_count ?? null,
      example_source_record_ids: record.example_source_record_ids ?? [],
      date_range_observed: record.date_range_observed ?? { earliest: null, latest: null },
    },
  };
}

function candidateRecord({ interest, payee, rule, match }) {
  const id = interest.interest_id;
  return {
    schema_version: 'oge-fec-payee-overlap-candidate@1',
    overlap_candidate_id: overlapId(id, payee.candidate_id, rule),
    candidate_status: 'unresolved_name_overlap_candidate',
    match_version: OVERLAP_MATCH_VERSION,
    match_rule: rule,
    rule_rank: RULE_RANK[rule],
    match,
    oge_interest_ref: interest.source_ref,
    holder: interest.holder,
    interest_dates: interest.dates,
    fec_payee_ref: payee.source_ref,
    allowed_language: 'An unresolved OGE interest label and an unresolved FEC payee candidate met the stated lexical candidate-generation rule.',
    forbidden_inferences: [
      'name_overlap_resolves_legal_entity_identity',
      'name_overlap_establishes_beneficial_ownership',
      'holder_scope_means_filer_direct_ownership',
      'date_ranges_establish_temporal_overlap',
      'reported_itemization_is_unique_payment',
      'candidate_overlap_establishes_coordination_intent_self_dealing_or_wrongdoing',
    ],
    verification_status: 'machine_generated_unreviewed',
    causal_status: 'not_established',
    graph_effect: 'none',
  };
}

function compareRejected(a, b) {
  return b.score.jaccard - a.score.jaccard
    || b.score.dice - a.score.dice
    || a.payee_candidate_id.localeCompare(b.payee_candidate_id);
}

export async function buildOgeFecOverlap({ ogeInterestsFile, fecPayeesFile, outputDir }) {
  const ogePath = path.resolve(ogeInterestsFile);
  const fecPath = path.resolve(fecPayeesFile);
  const ogeInput = await hashFile(ogePath);
  const fecInput = await hashFile(fecPath);
  fs.mkdirSync(outputDir, { recursive: true });
  const candidatesPath = path.join(outputDir, 'overlap-candidates.jsonl');
  const rejectionsPath = path.join(outputDir, 'rejections.jsonl');
  const candidateTmp = `${candidatesPath}.tmp`;
  const rejectionTmp = `${rejectionsPath}.tmp`;
  for (const file of [candidateTmp, rejectionTmp]) fs.rmSync(file, { force: true });
  const candidateOut = fs.createWriteStream(candidateTmp, { encoding: 'utf8' });
  const rejectionOut = fs.createWriteStream(rejectionTmp, { encoding: 'utf8' });

  const exactIndex = new Map();
  const baseIndex = new Map();
  const tokenIndex = new Map();
  const payees = new Map();
  const counts = {
    fec_input_lines: 0,
    fec_indexed_candidates: 0,
    fec_invalid_json_lines: 0,
    fec_malformed_candidate_lines: 0,
    oge_input_lines: 0,
    oge_parsed_interests: 0,
    oge_valid_named_interests: 0,
    oge_invalid_json_lines: 0,
    oge_malformed_interest_lines: 0,
    oge_blank_or_invalid_name_rows: 0,
    interests_with_candidates: 0,
    interests_without_candidates: 0,
    candidate_pairs_emitted: 0,
    token_postings_visited: 0,
    token_retrieved_pairs_scored: 0,
    token_retrieved_pairs_below_threshold: 0,
    lower_priority_duplicate_pairs_suppressed: 0,
    interests_with_no_searchable_token: 0,
  };
  const byRule = {};

  let lineNumber = 0;
  const fecLines = readline.createInterface({ input: fs.createReadStream(fecPath), crlfDelay: Infinity });
  for await (const line of fecLines) {
    lineNumber += 1;
    counts.fec_input_lines += 1;
    let record;
    try { record = JSON.parse(line); } catch (error) {
      counts.fec_invalid_json_lines += 1;
      await write(rejectionOut, {
        schema_version: 'oge-fec-overlap-rejection@1', input_side: 'fec_payee', input_line: lineNumber,
        disposition: 'invalid_json', line_sha256: sha256(line), error: String(error?.message ?? error), graph_effect: 'none',
      });
      continue;
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)
      || !text(record.candidate_id) || !text(record.normalized_payee_name)) {
      counts.fec_malformed_candidate_lines += 1;
      await write(rejectionOut, {
        schema_version: 'oge-fec-overlap-rejection@1', input_side: 'fec_payee', input_line: lineNumber,
        disposition: 'malformed_payee_candidate', line_sha256: sha256(line), graph_effect: 'none',
      });
      continue;
    }
    const payee = payeeProjection(record, path.basename(fecPath), fecInput.sha256, lineNumber);
    if (!payee.normalized_name || payees.has(payee.candidate_id)) {
      counts.fec_malformed_candidate_lines += 1;
      await write(rejectionOut, {
        schema_version: 'oge-fec-overlap-rejection@1', input_side: 'fec_payee', input_line: lineNumber,
        disposition: payees.has(payee.candidate_id) ? 'duplicate_payee_candidate_id' : 'invalid_normalized_payee_name',
        candidate_id: payee.candidate_id, graph_effect: 'none',
      });
      continue;
    }
    payees.set(payee.candidate_id, payee);
    addIndex(exactIndex, payee.normalized_name, payee.candidate_id);
    for (const base of payee.base_forms.keys()) addIndex(baseIndex, base, payee.candidate_id);
    for (const token of payee.tokens) addIndex(tokenIndex, token, payee.candidate_id);
    counts.fec_indexed_candidates += 1;
  }

  const maximumPostingSize = Math.max(
    HIGH_SIMILARITY_THRESHOLDS.minimum_maximum_posting_size,
    Math.floor(counts.fec_indexed_candidates * HIGH_SIMILARITY_THRESHOLDS.maximum_posting_fraction),
  );
  lineNumber = 0;
  const ogeLines = readline.createInterface({ input: fs.createReadStream(ogePath), crlfDelay: Infinity });
  for await (const line of ogeLines) {
    lineNumber += 1;
    counts.oge_input_lines += 1;
    let record;
    try { record = JSON.parse(line); } catch (error) {
      counts.oge_invalid_json_lines += 1;
      await write(rejectionOut, {
        schema_version: 'oge-fec-overlap-rejection@1', input_side: 'oge_interest', input_line: lineNumber,
        disposition: 'invalid_json', line_sha256: sha256(line), error: String(error?.message ?? error), graph_effect: 'none',
      });
      continue;
    }
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
      counts.oge_malformed_interest_lines += 1;
      await write(rejectionOut, {
        schema_version: 'oge-fec-overlap-rejection@1', input_side: 'oge_interest', input_line: lineNumber,
        disposition: 'malformed_interest_record', line_sha256: sha256(line), graph_effect: 'none',
      });
      continue;
    }
    counts.oge_parsed_interests += 1;
    const rawName = text(record.asset_or_entity_name_as_reported);
    const normalizedName = normalizePayeeName(rawName);
    if (!rawName || !normalizedName || !/[A-Z0-9]/.test(normalizedName)) {
      counts.oge_blank_or_invalid_name_rows += 1;
      await write(rejectionOut, {
        schema_version: 'oge-fec-overlap-rejection@1', input_side: 'oge_interest', input_line: lineNumber,
        disposition: 'blank_or_invalid_interest_name', source_document_id: record.source_document_id ?? null,
        source_row_label: record.source_row_label ?? null, graph_effect: 'none',
      });
      continue;
    }
    counts.oge_valid_named_interests += 1;
    const id = interestId(record);
    const interestTokens = significantNameTokens(normalizedName);
    const interestBases = conservativeBaseForms(rawName);
    const interest = {
      interest_id: id,
      normalized_name: normalizedName,
      tokens: interestTokens,
      base_forms: interestBases,
      source_ref: {
        input_file: path.basename(ogePath), input_sha256: ogeInput.sha256, input_line: lineNumber,
        interest_id: id, source_document_id: record.source_document_id ?? null,
        source_url: record.source_url ?? null, source_sha256: record.source_sha256 ?? null,
        source_page: record.source_page ?? null, source_row_label: record.source_row_label ?? null,
        raw_text_ref: record.raw_text_ref ?? null, raw_text_sha256: record.raw_text_sha256 ?? null,
        asset_or_entity_name_as_reported: rawName,
      },
      holder: {
        person_id: record.person_id ?? null, person_name: record.person_name ?? null,
        interest_holder_scope: record.interest_holder_scope ?? 'unknown',
        record_kind: record.record_kind ?? null, interest_type_as_reported: record.interest_type_as_reported ?? null,
      },
      dates: {
        valid_from: record.valid_from ?? null, valid_until: record.valid_until ?? null,
        transaction_date_as_reported: record.transaction_date_as_reported ?? null,
        report_date: record.report_date ?? null,
      },
    };

    const matches = new Map();
    const addMatch = (payeeId, rule, match) => {
      const prior = matches.get(payeeId);
      if (prior && RULE_RANK[prior.rule] <= RULE_RANK[rule]) {
        counts.lower_priority_duplicate_pairs_suppressed += 1;
        return;
      }
      matches.set(payeeId, { rule, match });
    };

    for (const payeeId of exactIndex.get(normalizedName) ?? []) {
      const payee = payees.get(payeeId);
      addMatch(payeeId, 'exact_normalized_name', {
        normalized_interest_name: normalizedName,
        normalized_payee_name: payee.normalized_name,
        exact_equal: true,
        token_scores: scoreTokenSets(interestTokens, payee.tokens),
      });
    }

    for (const [base, interestMethods] of interestBases) {
      for (const payeeId of baseIndex.get(base) ?? []) {
        const payee = payees.get(payeeId);
        addMatch(payeeId, 'conservative_parenthetical_or_base_name', {
          normalized_interest_name: normalizedName,
          normalized_payee_name: payee.normalized_name,
          matched_base_name: base,
          interest_base_methods: [...interestMethods].sort(),
          payee_base_methods: [...(payee.base_forms.get(base) ?? [])].sort(),
          token_scores: scoreTokenSets(interestTokens, payee.tokens),
        });
      }
    }

    const searchableTokens = interestTokens
      .map(token => ({ token, postings: tokenIndex.get(token) }))
      .filter(value => value.postings && value.postings.size <= maximumPostingSize)
      .sort((a, b) => a.postings.size - b.postings.size || a.token.localeCompare(b.token));
    if (!searchableTokens.length) counts.interests_with_no_searchable_token += 1;
    const retrieved = new Set();
    for (const { postings } of searchableTokens) {
      counts.token_postings_visited += postings.size;
      for (const payeeId of postings) retrieved.add(payeeId);
    }
    const rejectedExamples = [];
    let belowThreshold = 0;
    for (const payeeId of [...retrieved].sort()) {
      const payee = payees.get(payeeId);
      const score = scoreTokenSets(interestTokens, payee.tokens);
      counts.token_retrieved_pairs_scored += 1;
      if (passesHighSimilarity(score)) {
        addMatch(payeeId, 'token_indexed_high_similarity', {
          normalized_interest_name: normalizedName,
          normalized_payee_name: payee.normalized_name,
          searchable_interest_tokens: searchableTokens.map(value => value.token),
          token_scores: score,
        });
      } else {
        belowThreshold += 1;
        counts.token_retrieved_pairs_below_threshold += 1;
        rejectedExamples.push({ payee_candidate_id: payeeId, normalized_payee_name: payee.normalized_name, score });
      }
    }

    const orderedMatches = [...matches.entries()].sort(([, a], [, b]) => RULE_RANK[a.rule] - RULE_RANK[b.rule]
      || a.match.normalized_payee_name.localeCompare(b.match.normalized_payee_name));
    for (const [payeeId, generated] of orderedMatches) {
      await write(candidateOut, candidateRecord({ interest, payee: payees.get(payeeId), rule: generated.rule, match: generated.match }));
      counts.candidate_pairs_emitted += 1;
      increment(byRule, generated.rule);
    }
    if (orderedMatches.length) counts.interests_with_candidates += 1;
    else counts.interests_without_candidates += 1;

    if (belowThreshold) {
      rejectedExamples.sort(compareRejected);
      await write(rejectionOut, {
        schema_version: 'oge-fec-overlap-rejection@1', input_side: 'candidate_generation',
        disposition: 'token_retrieval_below_similarity_threshold', interest_id: id,
        oge_input_line: lineNumber, token_retrieved_pairs_rejected: belowThreshold,
        top_rejected_examples: rejectedExamples.slice(0, MAX_REJECTED_EXAMPLES),
        example_limit: MAX_REJECTED_EXAMPLES, graph_effect: 'none',
      });
    }
    if (!orderedMatches.length) {
      await write(rejectionOut, {
        schema_version: 'oge-fec-overlap-rejection@1', input_side: 'candidate_generation',
        disposition: 'no_overlap_candidate', interest_id: id, oge_input_line: lineNumber,
        normalized_interest_name: normalizedName, significant_interest_tokens: interestTokens,
        searchable_interest_tokens: searchableTokens.map(value => value.token),
        retrieved_candidate_count: retrieved.size,
        note: 'No lexical candidate met an exact, conservative base-name, or high-similarity rule. This is not evidence that no related entity exists.',
        graph_effect: 'none',
      });
    }
  }

  await close(candidateOut);
  await close(rejectionOut);
  for (const file of [candidatesPath, rejectionsPath]) fs.rmSync(file, { force: true });
  fs.renameSync(candidateTmp, candidatesPath);
  fs.renameSync(rejectionTmp, rejectionsPath);
  const outputCandidates = await hashFile(candidatesPath);
  const outputRejections = await hashFile(rejectionsPath);
  const manifest = {
    schema_version: 'oge-fec-payee-overlap-manifest@1',
    match_version: OVERLAP_MATCH_VERSION,
    inputs: {
      oge_interests: { path: path.basename(ogePath), ...ogeInput },
      fec_payee_candidates: { path: path.basename(fecPath), ...fecInput },
    },
    outputs: {
      candidates: { path: path.basename(candidatesPath), ...outputCandidates },
      rejections: { path: path.basename(rejectionsPath), ...outputRejections },
    },
    coverage: {
      denominator: {
        oge_input_lines: counts.oge_input_lines,
        oge_valid_named_interests: counts.oge_valid_named_interests,
        fec_input_lines: counts.fec_input_lines,
        fec_indexed_candidates: counts.fec_indexed_candidates,
        naive_cartesian_pairs_not_materialized: counts.oge_valid_named_interests * counts.fec_indexed_candidates,
      },
      dispositions: stableObject(counts),
      candidate_pairs_by_rule: stableObject(byRule),
    },
    retrieval_contract: {
      exact_rule: 'Equal normalized full labels.',
      base_rule: 'Equal distinctive base forms after only trailing-parenthetical and/or terminal legal-suffix removal.',
      high_similarity_rule: 'Token-index retrieval followed by the checked-in Jaccard/Dice/containment thresholds; no Cartesian all-pairs comparison is performed.',
      significant_token_exclusions: [...NON_DISTINCTIVE_TOKENS].sort(),
      thresholds: HIGH_SIMILARITY_THRESHOLDS,
      maximum_token_posting_size: maximumPostingSize,
      lower_priority_pair_rules_are_suppressed: true,
    },
    interpretation: [
      'Every emitted row is an unresolved lexical overlap candidate, not an entity resolution or graph edge.',
      'Candidate generation may miss aliases, subsidiaries, properties, brands, OCR-corrupted labels, or matches whose only shared tokens were pruned as non-distinctive or too common.',
      'A holder scope, reported interest, date range, or FEC payee itemization does not by itself establish direct ownership, temporal overlap, control, intent, self-dealing, coordination, or wrongdoing.',
    ],
    verification_status: 'machine_generated_unreviewed',
    causal_status: 'not_established',
    graph_effect: 'none',
  };
  const manifestPath = path.join(outputDir, 'manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  return { manifest, manifestPath };
}
