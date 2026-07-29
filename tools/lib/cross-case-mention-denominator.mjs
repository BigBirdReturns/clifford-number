import crypto from 'node:crypto';
import { entityId } from './axm-id.mjs';

const DISALLOWED_EVIDENCE = new Set(['judgment', 'open']);
const MACHINE_KEY = /(^id$|_id$|_ids$|sha256|hash$|^path$|_path$|^url$|_url$|^version$)/i;
const RECEIPT_METADATA_FIELDS = new Set(['label', 'publisher', 'title', 'description', 'notes', 'snippet']);

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function uniqueSorted(values) {
  const iterable = values === null || values === undefined
    ? []
    : Array.isArray(values)
      ? values
      : typeof values[Symbol.iterator] === 'function'
        ? [...values]
        : [values];
  return [...new Set(iterable.filter(value => value !== null && value !== undefined && String(value).length > 0).map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
}

export function stableDigest(value) {
  return sha256(Buffer.from(JSON.stringify(canonical(value))));
}

export function normalizeMentionLexeme(value) {
  return String(value ?? '')
    .normalize('NFC')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

function normalizeKind(kind, registryType) {
  if (registryType === 'actor') return 'actor';
  if (registryType === 'organization') return 'organization';
  return kind ?? null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isUpperAcronym(value, minimumLength) {
  const compact = String(value).replace(/[^A-Za-z0-9]/g, '');
  return compact.length >= minimumLength
    && compact.length <= 10
    && compact === compact.toUpperCase()
    && /[A-Z]/.test(compact);
}

function lexemeDisposition(raw, sourceType, policy) {
  const normalized = normalizeMentionLexeme(raw);
  const tokens = normalized.split(' ').filter(Boolean);
  const compactLength = normalized.replace(/\s+/g, '').length;
  if (!normalized) return { active: false, reason: 'empty_after_normalization', match_mode: null };
  if (sourceType === 'canonical_id') return { active: true, reason: null, match_mode: 'case_sensitive_exact_token' };
  if (tokens.length >= 2) return { active: true, reason: null, match_mode: 'case_insensitive_phrase' };
  if (policy.text_scan.generic_single_token_stoplist.includes(normalized)) {
    return { active: false, reason: 'generic_single_token_stoplist', match_mode: null };
  }
  if (isUpperAcronym(raw, policy.text_scan.minimum_case_sensitive_acronym_length)) {
    return { active: true, reason: null, match_mode: 'case_sensitive_acronym' };
  }
  if (compactLength >= policy.text_scan.minimum_case_insensitive_single_token_length) {
    return { active: true, reason: null, match_mode: 'case_insensitive_token' };
  }
  return { active: false, reason: 'unsafe_short_single_token', match_mode: null };
}

export function buildMentionLexicon({ actors = [], organizations = [], aliases = [], policy }) {
  const canonicalById = new Map();
  const rawEntries = [];

  function addCanonical(row, registryType) {
    const canonicalRow = {
      canonical_id: row.id,
      canonical_label: row.label,
      canonical_kind: normalizeKind(row.kind, registryType),
      registry_type: registryType,
      axm_entity_id: entityId(policy.shared_identity_namespace, row.label)
    };
    canonicalById.set(row.id, canonicalRow);
    rawEntries.push({ ...canonicalRow, lexeme: row.id, lexeme_source: 'canonical_id' });
    rawEntries.push({ ...canonicalRow, lexeme: row.label, lexeme_source: 'canonical_label' });
  }

  for (const actor of actors) addCanonical(actor, 'actor');
  for (const organization of organizations) addCanonical(organization, 'organization');
  for (const alias of aliases) {
    const canonicalRow = canonicalById.get(alias.canonical_id);
    if (!canonicalRow) {
      rawEntries.push({
        canonical_id: alias.canonical_id,
        canonical_label: null,
        canonical_kind: alias.kind ?? null,
        registry_type: 'alias',
        axm_entity_id: null,
        lexeme: alias.alias,
        lexeme_source: 'orphan_alias'
      });
      continue;
    }
    rawEntries.push({ ...canonicalRow, lexeme: alias.alias, lexeme_source: 'canonical_alias' });
  }

  const deduped = new Map();
  for (const entry of rawEntries) {
    const normalized = normalizeMentionLexeme(entry.lexeme);
    const key = `${entry.canonical_id}\0${normalized}\0${entry.lexeme_source}`;
    if (!deduped.has(key)) deduped.set(key, { ...entry, normalized_lexeme: normalized });
  }

  const ownerByNormalized = new Map();
  for (const entry of deduped.values()) {
    if (!entry.normalized_lexeme) continue;
    if (!ownerByNormalized.has(entry.normalized_lexeme)) ownerByNormalized.set(entry.normalized_lexeme, new Set());
    ownerByNormalized.get(entry.normalized_lexeme).add(entry.canonical_id);
  }

  const active = [];
  const excluded = [];
  for (const entry of deduped.values()) {
    const owners = ownerByNormalized.get(entry.normalized_lexeme) ?? new Set();
    const disposition = lexemeDisposition(entry.lexeme, entry.lexeme_source, policy);
    let exclusionReason = disposition.reason;
    if (entry.lexeme_source === 'orphan_alias') exclusionReason = 'alias_missing_canonical_registry_entry';
    if (owners.size > 1) exclusionReason = 'ambiguous_normalized_lexeme';
    const row = {
      schema_version: 'cross-case-mention-lexeme@1',
      ...entry,
      match_mode: exclusionReason ? null : disposition.match_mode,
      active: !exclusionReason,
      exclusion_reason: exclusionReason ?? null,
      owner_canonical_ids: uniqueSorted(owners),
      graph_effect: 'none'
    };
    if (row.active) active.push(row);
    else excluded.push(row);
  }

  const sourcePriority = { canonical_id: 0, canonical_label: 1, canonical_alias: 2 };
  active.sort((left, right) => {
    const lengthDelta = String(right.lexeme).length - String(left.lexeme).length;
    if (lengthDelta) return lengthDelta;
    const sourceDelta = (sourcePriority[left.lexeme_source] ?? 9) - (sourcePriority[right.lexeme_source] ?? 9);
    if (sourceDelta) return sourceDelta;
    return `${left.canonical_id}:${left.lexeme}`.localeCompare(`${right.canonical_id}:${right.lexeme}`);
  });
  excluded.sort((left, right) => `${left.exclusion_reason}:${left.normalized_lexeme}:${left.canonical_id}`.localeCompare(`${right.exclusion_reason}:${right.normalized_lexeme}:${right.canonical_id}`));

  const conflicts = excluded
    .filter(row => row.exclusion_reason === 'ambiguous_normalized_lexeme')
    .map(row => row.normalized_lexeme)
    .filter((value, index, rows) => rows.indexOf(value) === index)
    .sort()
    .map(normalizedLexeme => ({
      conflict_type: 'ambiguous_normalized_lexeme',
      normalized_lexeme: normalizedLexeme,
      canonical_ids: uniqueSorted(ownerByNormalized.get(normalizedLexeme))
    }));

  return {
    schema_version: 'cross-case-mention-lexicon@1',
    shared_identity_namespace: policy.shared_identity_namespace,
    counts: {
      canonical_entities: canonicalById.size,
      raw_lexemes: rawEntries.length,
      active_lexemes: active.length,
      excluded_lexemes: excluded.length,
      ambiguity_conflicts: conflicts.length
    },
    active,
    excluded,
    conflicts,
    boundaries: {
      fuzzy_matching_authorized: false,
      ambiguous_lexeme_authorizes_match: false,
      generic_short_token_authorizes_match: false,
      lexicon_match_proves_relationship: false,
      graph_effect: 'none'
    }
  };
}

function pointerEscape(value) {
  return String(value).replace(/~/g, '~0').replace(/\//g, '~1');
}

function collectTextLeaves(value, { recordType, pointer = '', parentKey = '', policy, rows = [] }) {
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectTextLeaves(item, {
      recordType,
      pointer: `${pointer}/${index}`,
      parentKey,
      policy,
      rows
    }));
    return rows;
  }
  if (value && typeof value === 'object') {
    for (const [key, child] of Object.entries(value)) {
      collectTextLeaves(child, {
        recordType,
        pointer: `${pointer}/${pointerEscape(key)}`,
        parentKey: key,
        policy,
        rows
      });
    }
    return rows;
  }
  if (typeof value !== 'string') return rows;
  if (recordType === 'receipts' && !RECEIPT_METADATA_FIELDS.has(parentKey)) return rows;
  if (policy.text_scan.skip_machine_id_keys && MACHINE_KEY.test(parentKey)) return rows;
  if (policy.text_scan.skip_url_and_hash_fields && /(url|sha256|hash)/i.test(parentKey)) return rows;
  if (value.trim().length < 3) return rows;
  rows.push({ json_pointer: pointer || '/', parent_key: parentKey, text: value });
  return rows;
}

function collectIdsByKey(value, pattern, rows = []) {
  if (Array.isArray(value)) {
    value.forEach(item => collectIdsByKey(item, pattern, rows));
    return rows;
  }
  if (!value || typeof value !== 'object') return rows;
  for (const [key, child] of Object.entries(value)) {
    if (pattern.test(key)) {
      if (Array.isArray(child)) rows.push(...child.filter(item => typeof item === 'string'));
      else if (typeof child === 'string') rows.push(child);
    }
    collectIdsByKey(child, pattern, rows);
  }
  return rows;
}

function recordId(record, recordType, rowNumber) {
  const preferred = [`${recordType.slice(0, -1)}_id`, 'claim_id', 'event_id', 'relation_id', 'beacon_id', 'trail_id', 'receipt_id'];
  for (const key of preferred) if (typeof record?.[key] === 'string') return record[key];
  for (const [key, value] of Object.entries(record ?? {})) if (/_id$/.test(key) && typeof value === 'string') return value;
  return `${recordType}-row-${rowNumber}`;
}

function locatorOf(receipt) {
  return receipt?.url ?? receipt?.archive_url ?? null;
}

export function mentionSourceFamily(receipt) {
  const locator = locatorOf(receipt);
  if (!locator) return null;
  try {
    const host = new URL(locator).hostname.toLowerCase().replace(/^www\./, '');
    return host ? `host:${host}` : null;
  } catch {
    return `locator:${normalizeMentionLexeme(locator).replace(/\s+/g, '-')}`;
  }
}

function evidenceRank(value) {
  const order = {
    government_record: 8,
    official: 7,
    primary_public: 6,
    public_filing: 6,
    reported: 5,
    derived: 4,
    judgment: 2,
    open: 1
  };
  return order[value] ?? 0;
}

function strongestEvidence(values) {
  return uniqueSorted(values).sort((left, right) => evidenceRank(right) - evidenceRank(left))[0] ?? null;
}

function recordCustody({ record, recordType, claimById, receiptById }) {
  const claimIds = uniqueSorted([
    ...(recordType === 'claims' && record.claim_id ? [record.claim_id] : []),
    ...collectIdsByKey(record, /(^|_)claim_ids?$/)
  ]);
  const claims = claimIds.map(id => claimById.get(id)).filter(Boolean);
  const directReceiptIds = collectIdsByKey(record, /(^|_)receipt_ids?$/);
  const receiptIds = uniqueSorted([
    ...directReceiptIds,
    ...claims.flatMap(claim => claim.receipt_ids ?? []),
    ...(recordType === 'receipts' && record.receipt_id ? [record.receipt_id] : [])
  ]);
  const receipts = receiptIds.map(id => receiptById.get(id)).filter(Boolean);
  const publicReceipts = receipts.filter(receipt => Boolean(locatorOf(receipt)));
  const publicSourceFamilies = uniqueSorted(publicReceipts.map(mentionSourceFamily));
  const evidenceClasses = uniqueSorted([
    record.evidence_class,
    ...claims.map(claim => claim.evidence_class),
    ...receipts.map(receipt => receipt.evidence_class)
  ]);
  const strongest = strongestEvidence(evidenceClasses);
  const eligibleClaim = claims.some(claim => !DISALLOWED_EVIDENCE.has(claim.evidence_class) && !['rejected', 'superseded'].includes(claim.claim_status));
  const eligibleReceiptMetadata = recordType === 'receipts'
    && Boolean(locatorOf(record))
    && !DISALLOWED_EVIDENCE.has(record.evidence_class);
  const recurrenceEligible = publicReceipts.length > 0
    && (eligibleClaim || eligibleReceiptMetadata || (!claims.length && strongest && !DISALLOWED_EVIDENCE.has(strongest)));
  return {
    claim_ids: claimIds,
    receipt_ids: receiptIds,
    public_receipt_ids: uniqueSorted(publicReceipts.map(receipt => receipt.receipt_id)),
    public_source_families: publicSourceFamilies,
    evidence_classes: evidenceClasses,
    strongest_evidence_class: strongest,
    recurrence_eligible: Boolean(recurrenceEligible)
  };
}

function buildRegex(lexeme) {
  const escaped = escapeRegex(lexeme.lexeme);
  const flags = lexeme.match_mode.startsWith('case_insensitive') ? 'giu' : 'gu';
  return new RegExp(`(?<![\\p{L}\\p{N}_])${escaped}(?![\\p{L}\\p{N}_])`, flags);
}

function excerpt(text, start, end, radius = 100) {
  const from = Math.max(0, start - radius);
  const to = Math.min(text.length, end + radius);
  return `${from > 0 ? '…' : ''}${text.slice(from, to)}${to < text.length ? '…' : ''}`;
}

function matchesForLeaf(text, activeLexemes) {
  const matches = [];
  for (const lexeme of activeLexemes) {
    const regex = buildRegex(lexeme);
    for (const match of text.matchAll(regex)) {
      matches.push({
        canonical_id: lexeme.canonical_id,
        canonical_label: lexeme.canonical_label,
        canonical_kind: lexeme.canonical_kind,
        axm_entity_id: lexeme.axm_entity_id,
        lexeme: lexeme.lexeme,
        normalized_lexeme: lexeme.normalized_lexeme,
        lexeme_source: lexeme.lexeme_source,
        match_mode: lexeme.match_mode,
        matched_text: match[0],
        start: match.index,
        end: match.index + match[0].length
      });
    }
  }
  matches.sort((left, right) => left.start - right.start || right.end - right.start - (left.end - left.start) || `${left.canonical_id}:${left.lexeme_source}`.localeCompare(`${right.canonical_id}:${right.lexeme_source}`));
  const retained = [];
  for (const candidate of matches) {
    const nestedSameCanonical = retained.some(existing => existing.canonical_id === candidate.canonical_id
      && existing.start <= candidate.start
      && existing.end >= candidate.end);
    if (!nestedSameCanonical) retained.push(candidate);
  }
  return retained;
}

export function scanCaseMentions({ caseId, caseTitle, recordsByType, claims, receipts, lexicon, policy }) {
  const claimById = new Map(claims.map(row => [row.claim_id, row]));
  const receiptById = new Map(receipts.map(row => [row.receipt_id, row]));
  const mentions = [];
  const metrics = {
    source_records_scanned: 0,
    text_leaves_scanned: 0,
    text_characters_scanned: 0,
    by_record_type: {}
  };

  for (const recordType of policy.source_record_types) {
    const records = recordsByType[recordType] ?? [];
    metrics.by_record_type[recordType] = {
      records: records.length,
      text_leaves: 0,
      text_characters: 0,
      mentions: 0
    };
    records.forEach((record, index) => {
      const rowNumber = index + 1;
      const sourcePath = `cases/${caseId}/${recordType}.jsonl`;
      const leaves = collectTextLeaves(record, { recordType, policy });
      const custody = recordCustody({ record, recordType, claimById, receiptById });
      metrics.source_records_scanned += 1;
      metrics.text_leaves_scanned += leaves.length;
      metrics.by_record_type[recordType].text_leaves += leaves.length;
      for (const leaf of leaves) {
        metrics.text_characters_scanned += leaf.text.length;
        metrics.by_record_type[recordType].text_characters += leaf.text.length;
        const leafMatches = matchesForLeaf(leaf.text, lexicon.active);
        for (const match of leafMatches) {
          const mentionPreimage = [
            caseId,
            sourcePath,
            rowNumber,
            leaf.json_pointer,
            match.start,
            match.end,
            match.canonical_id,
            match.lexeme_source
          ].join('\0');
          mentions.push({
            schema_version: 'cross-case-exact-mention@1',
            mention_id: `CCMENT-${sha256(Buffer.from(mentionPreimage)).slice(0, 24)}`,
            case_id: caseId,
            case_title: caseTitle,
            record_type: recordType,
            source_path: sourcePath,
            source_row_number: rowNumber,
            source_record_id: recordId(record, recordType, rowNumber),
            source_record_sha256: stableDigest(record),
            json_pointer: leaf.json_pointer,
            parent_key: leaf.parent_key,
            source_text_sha256: sha256(Buffer.from(leaf.text)),
            source_text_length: leaf.text.length,
            span_start: match.start,
            span_end: match.end,
            matched_text: match.matched_text,
            excerpt: excerpt(leaf.text, match.start, match.end),
            canonical_id: match.canonical_id,
            canonical_label: match.canonical_label,
            canonical_kind: match.canonical_kind,
            axm_entity_id: match.axm_entity_id,
            lexeme: match.lexeme,
            normalized_lexeme: match.normalized_lexeme,
            lexeme_source: match.lexeme_source,
            match_mode: match.match_mode,
            claim_ids: custody.claim_ids,
            receipt_ids: custody.receipt_ids,
            public_receipt_ids: custody.public_receipt_ids,
            public_source_families: custody.public_source_families,
            evidence_classes: custody.evidence_classes,
            strongest_evidence_class: custody.strongest_evidence_class,
            recurrence_eligible: custody.recurrence_eligible,
            graph_effect: 'none'
          });
          metrics.by_record_type[recordType].mentions += 1;
        }
      }
    });
  }

  mentions.sort((left, right) => `${left.source_path}:${String(left.source_row_number).padStart(8, '0')}:${left.json_pointer}:${String(left.span_start).padStart(8, '0')}:${left.canonical_id}`.localeCompare(`${right.source_path}:${String(right.source_row_number).padStart(8, '0')}:${right.json_pointer}:${String(right.span_start).padStart(8, '0')}:${right.canonical_id}`));
  return { mentions, metrics };
}

function groupMentionsByCaseEntity(mentions) {
  const groups = new Map();
  for (const mention of mentions) {
    const key = `${mention.case_id}\0${mention.canonical_id}`;
    if (!groups.has(key)) {
      groups.set(key, {
        schema_version: 'cross-case-mentioned-entity@1',
        mentioned_entity_id: `CCMEntity-${sha256(Buffer.from(key)).slice(0, 24)}`,
        case_id: mention.case_id,
        case_title: mention.case_title,
        canonical_id: mention.canonical_id,
        canonical_label: mention.canonical_label,
        canonical_kind: mention.canonical_kind,
        axm_entity_id: mention.axm_entity_id,
        mention_ids: new Set(),
        record_types: new Set(),
        source_paths: new Set(),
        source_record_ids: new Set(),
        matched_lexemes: new Set(),
        match_kinds: new Set(),
        claim_ids: new Set(),
        receipt_ids: new Set(),
        public_receipt_ids: new Set(),
        public_source_families: new Set(),
        evidence_classes: new Set(),
        eligible_mention_ids: new Set()
      });
    }
    const group = groups.get(key);
    group.mention_ids.add(mention.mention_id);
    group.record_types.add(mention.record_type);
    group.source_paths.add(mention.source_path);
    group.source_record_ids.add(`${mention.source_path}:${mention.source_record_id}`);
    group.matched_lexemes.add(mention.lexeme);
    group.match_kinds.add(mention.lexeme_source);
    mention.claim_ids.forEach(id => group.claim_ids.add(id));
    mention.receipt_ids.forEach(id => group.receipt_ids.add(id));
    mention.public_receipt_ids.forEach(id => group.public_receipt_ids.add(id));
    mention.public_source_families.forEach(id => group.public_source_families.add(id));
    mention.evidence_classes.forEach(value => group.evidence_classes.add(value));
    if (mention.recurrence_eligible) group.eligible_mention_ids.add(mention.mention_id);
  }

  return [...groups.values()].map(group => ({
    schema_version: group.schema_version,
    mentioned_entity_id: group.mentioned_entity_id,
    case_id: group.case_id,
    case_title: group.case_title,
    canonical_id: group.canonical_id,
    canonical_label: group.canonical_label,
    canonical_kind: group.canonical_kind,
    axm_entity_id: group.axm_entity_id,
    mention_ids: uniqueSorted(group.mention_ids),
    mention_count: group.mention_ids.size,
    eligible_mention_ids: uniqueSorted(group.eligible_mention_ids),
    eligible_mention_count: group.eligible_mention_ids.size,
    record_types: uniqueSorted(group.record_types),
    source_paths: uniqueSorted(group.source_paths),
    source_record_ids: uniqueSorted(group.source_record_ids),
    source_record_count: group.source_record_ids.size,
    matched_lexemes: uniqueSorted(group.matched_lexemes),
    match_kinds: uniqueSorted(group.match_kinds),
    claim_ids: uniqueSorted(group.claim_ids),
    receipt_ids: uniqueSorted(group.receipt_ids),
    public_receipt_ids: uniqueSorted(group.public_receipt_ids),
    public_source_families: uniqueSorted(group.public_source_families),
    evidence_classes: uniqueSorted(group.evidence_classes),
    strongest_evidence_class: strongestEvidence(group.evidence_classes),
    bilateral_recurrence_custody_eligible: group.eligible_mention_ids.size > 0 && group.public_receipt_ids.size > 0,
    graph_effect: 'none'
  })).sort((left, right) => `${left.case_id}:${left.canonical_id}`.localeCompare(`${right.case_id}:${right.canonical_id}`));
}

function bilateralIndependentFamilies(leftFamilies, rightFamilies, minimum) {
  if ((leftFamilies ?? []).length === 0 || (rightFamilies ?? []).length === 0) return false;
  const pairs = [];
  for (const left of leftFamilies) for (const right of rightFamilies) pairs.push([left, right]);
  return uniqueSorted([...(leftFamilies ?? []), ...(rightFamilies ?? [])]).length >= minimum
    && pairs.some(([left, right]) => left !== right);
}

function buildRecurrenceDecision(left, right, policy) {
  const [a, b] = left.case_id.localeCompare(right.case_id) <= 0 ? [left, right] : [right, left];
  const independent = bilateralIndependentFamilies(
    a.public_source_families,
    b.public_source_families,
    policy.source_custody.minimum_distinct_source_families_for_independent_corroboration
  );
  const bilateralCustody = a.bilateral_recurrence_custody_eligible && b.bilateral_recurrence_custody_eligible;
  const status = bilateralCustody ? 'accepted' : 'unresolved';
  const reason = bilateralCustody
    ? 'same_canonical_entity_exactly_mentioned_with_bilateral_public_custody'
    : !a.bilateral_recurrence_custody_eligible && !b.bilateral_recurrence_custody_eligible
      ? 'missing_bilateral_eligible_public_custody'
      : !a.bilateral_recurrence_custody_eligible
        ? 'missing_left_eligible_public_custody'
        : 'missing_right_eligible_public_custody';
  const confidence = status === 'accepted'
    ? independent ? 'independent_source_family_corroboration' : 'bounded_shared_source_family'
    : 'exact_mention_recurrence_missing_eligible_custody';
  const preimage = `${a.case_id}\0${b.case_id}\0${a.canonical_id}`;
  return {
    schema_version: 'cross-case-mention-recurrence-decision@1',
    decision_id: `CCMDEC-${sha256(Buffer.from(preimage)).slice(0, 24)}`,
    status,
    reason,
    confidence,
    recurrence_key: status === 'accepted' ? `CCMREC-${sha256(Buffer.from(`${policy.shared_identity_namespace}\0${preimage}`)).slice(0, 24)}` : null,
    authorized_scope: status === 'accepted' ? 'exact_source_custodied_graph_inert_cross_case_mention_recurrence_only' : null,
    canonical_id: a.canonical_id,
    canonical_label: a.canonical_label,
    canonical_kind: a.canonical_kind,
    axm_entity_id: a.axm_entity_id,
    left_case_id: a.case_id,
    left_mentioned_entity_id: a.mentioned_entity_id,
    left_mention_ids: a.mention_ids,
    left_mention_count: a.mention_count,
    left_eligible_mention_count: a.eligible_mention_count,
    left_record_types: a.record_types,
    left_public_receipt_ids: a.public_receipt_ids,
    left_public_source_families: a.public_source_families,
    right_case_id: b.case_id,
    right_mentioned_entity_id: b.mentioned_entity_id,
    right_mention_ids: b.mention_ids,
    right_mention_count: b.mention_count,
    right_eligible_mention_count: b.eligible_mention_count,
    right_record_types: b.record_types,
    right_public_receipt_ids: b.public_receipt_ids,
    right_public_source_families: b.public_source_families,
    combined_public_source_families: uniqueSorted([...a.public_source_families, ...b.public_source_families]),
    bilateral_independent_source_family_corroboration: independent,
    records_merged: false,
    relationship_created: false,
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    active_projection_cross_case_join_authorized: false,
    review_dependency: {
      required_to_decide: false,
      effect: 'later source or identity evidence may supersede this bounded recurrence judgment but no unspecified reviewer is permission to decide'
    },
    correction_mode: 'append_preserving_supersession',
    graph_effect: 'none'
  };
}

export function compileCrossCaseMentionDenominator({ policy, cases, actors, organizations, aliases, baseline }) {
  const lexicon = buildMentionLexicon({ actors, organizations, aliases, policy });
  const caseResults = cases.map(caseItem => {
    const result = scanCaseMentions({
      caseId: caseItem.case_id,
      caseTitle: caseItem.title,
      recordsByType: caseItem.records_by_type,
      claims: caseItem.records_by_type.claims ?? [],
      receipts: caseItem.records_by_type.receipts ?? [],
      lexicon,
      policy
    });
    return { case_id: caseItem.case_id, title: caseItem.title, ...result };
  }).sort((left, right) => left.case_id.localeCompare(right.case_id));

  const mentions = caseResults.flatMap(row => row.mentions);
  const caseEntityRegistry = groupMentionsByCaseEntity(mentions);
  const groupsByCase = new Map();
  for (const row of caseEntityRegistry) {
    if (!groupsByCase.has(row.case_id)) groupsByCase.set(row.case_id, new Map());
    groupsByCase.get(row.case_id).set(row.canonical_id, row);
  }

  const pairDenominator = [];
  const decisions = [];
  for (let i = 0; i < caseResults.length; i++) {
    for (let j = i + 1; j < caseResults.length; j++) {
      const leftCase = caseResults[i];
      const rightCase = caseResults[j];
      const leftGroups = groupsByCase.get(leftCase.case_id) ?? new Map();
      const rightGroups = groupsByCase.get(rightCase.case_id) ?? new Map();
      const candidateCanonicalIds = [...leftGroups.keys()].filter(id => rightGroups.has(id)).sort();
      const pairDecisions = candidateCanonicalIds.map(id => buildRecurrenceDecision(leftGroups.get(id), rightGroups.get(id), policy));
      decisions.push(...pairDecisions);
      const unionCanonicalIds = uniqueSorted([...leftGroups.keys(), ...rightGroups.keys()]);
      pairDenominator.push({
        schema_version: 'cross-case-mention-pair-denominator@1',
        pair_id: `CCMPAIR-${sha256(Buffer.from(`${leftCase.case_id}\0${rightCase.case_id}`)).slice(0, 20)}`,
        left_case_id: leftCase.case_id,
        left_exact_mentions: leftCase.mentions.length,
        left_mentioned_canonical_entities: leftGroups.size,
        right_case_id: rightCase.case_id,
        right_exact_mentions: rightCase.mentions.length,
        right_mentioned_canonical_entities: rightGroups.size,
        mentioned_entity_pair_cartesian: leftGroups.size * rightGroups.size,
        candidate_canonical_entities: candidateCanonicalIds.length,
        noncandidate_canonical_entities_in_union: unionCanonicalIds.length - candidateCanonicalIds.length,
        accepted_recurrences: pairDecisions.filter(row => row.status === 'accepted').length,
        accepted_independent_recurrences: pairDecisions.filter(row => row.status === 'accepted' && row.bilateral_independent_source_family_corroboration).length,
        accepted_shared_source_family_recurrences: pairDecisions.filter(row => row.status === 'accepted' && !row.bilateral_independent_source_family_corroboration).length,
        unresolved_recurrences: pairDecisions.filter(row => row.status === 'unresolved').length,
        rejected_recurrences: pairDecisions.filter(row => row.status === 'rejected').length,
        candidate_canonical_ids: candidateCanonicalIds,
        denominator_complete_for_declared_exact_lexicon: true,
        review_dependency: { required_to_decide: false },
        graph_effect: 'none'
      });
    }
  }

  pairDenominator.sort((left, right) => `${left.left_case_id}:${left.right_case_id}`.localeCompare(`${right.left_case_id}:${right.right_case_id}`));
  decisions.sort((left, right) => left.decision_id.localeCompare(right.decision_id));
  const accepted = decisions.filter(row => row.status === 'accepted');
  const unresolved = decisions.filter(row => row.status === 'unresolved');
  const rejected = decisions.filter(row => row.status === 'rejected');
  const scanMetrics = {
    source_records_scanned: caseResults.reduce((total, row) => total + row.metrics.source_records_scanned, 0),
    text_leaves_scanned: caseResults.reduce((total, row) => total + row.metrics.text_leaves_scanned, 0),
    text_characters_scanned: caseResults.reduce((total, row) => total + row.metrics.text_characters_scanned, 0),
    by_case: Object.fromEntries(caseResults.map(row => [row.case_id, row.metrics]))
  };

  return {
    schema_version: 'cross-case-mention-denominator-result@1',
    baseline: {
      native_cases: baseline.counts.native_cases,
      case_pairs: baseline.counts.case_pairs,
      structured_entity_occurrences: baseline.counts.entity_occurrences,
      structured_candidate_decisions: baseline.counts.candidate_decisions,
      structured_zero_candidate_silo_finding_preserved: baseline.counts.candidate_decisions === 0
    },
    case_ids: caseResults.map(row => row.case_id),
    lexicon,
    scan_metrics: scanMetrics,
    mentions,
    case_entity_registry: caseEntityRegistry,
    pair_denominator: pairDenominator,
    decisions,
    counts: {
      native_cases: caseResults.length,
      case_pairs: pairDenominator.length,
      active_lexemes: lexicon.counts.active_lexemes,
      excluded_lexemes: lexicon.counts.excluded_lexemes,
      ambiguity_conflicts: lexicon.counts.ambiguity_conflicts,
      source_records_scanned: scanMetrics.source_records_scanned,
      text_leaves_scanned: scanMetrics.text_leaves_scanned,
      text_characters_scanned: scanMetrics.text_characters_scanned,
      exact_mentions: mentions.length,
      eligible_mentions: mentions.filter(row => row.recurrence_eligible).length,
      mentioned_case_entities: caseEntityRegistry.length,
      candidate_decisions: decisions.length,
      accepted_recurrences: accepted.length,
      accepted_independent_recurrences: accepted.filter(row => row.bilateral_independent_source_family_corroboration).length,
      accepted_shared_source_family_recurrences: accepted.filter(row => !row.bilateral_independent_source_family_corroboration).length,
      unresolved_recurrences: unresolved.length,
      rejected_recurrences: rejected.length
    },
    boundaries: policy.boundaries
  };
}
