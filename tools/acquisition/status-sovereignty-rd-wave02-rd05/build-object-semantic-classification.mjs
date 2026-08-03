import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const ROOT = 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition';
const CAPTURE_INDEX_PATH = process.env.RD05_CAPTURE_INDEX || `${ROOT}/exact-object-capture-index.json`;
const RECOVERY_INDEX_PATH = process.env.RD05_RECOVERY_INDEX || `${ROOT}/same-object-api-recovery-index.json`;
const RULES_PATH = process.env.RD05_SEMANTIC_RULES || `${ROOT}/object-semantic-rules.json`;
const FRONTIER_PATH = process.env.RD05_LINK_FRONTIER || `${ROOT}/source-custody/exact-object-capture-v1/new-official-links.json`;
const OUTPUT_PATH = process.env.RD05_SEMANTIC_OUTPUT || `${ROOT}/object-semantic-classification.json`;
export const MATERIALIZED_RULES_SHA256 = '63142548480a6d21b966677ed89d9ab85f95427a6b95477de1c9d6f4ce2094fe';

const readJson = (p) => JSON.parse(fs.readFileSync(p, 'utf8'));
const sha256 = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');
const assert = (condition, message) => { if (!condition) throw new Error(message); };
const field = (state, value, note, terminal = true) => ({ state, value, note, terminal });

export function embeddedRuleSet() {
  const gzipBytes = Buffer.from(EMBEDDED_RULES_GZIP_BASE64, 'base64');
  assert(sha256(gzipBytes) === EMBEDDED_RULES_GZIP_SHA256, 'embedded rules gzip digest');
  const compactBytes = zlib.gunzipSync(gzipBytes);
  assert(sha256(compactBytes) === EMBEDDED_RULES_COMPACT_SHA256, 'embedded rules compact digest');
  const value = JSON.parse(compactBytes.toString('utf8'));
  assert(value.schema_version === 'ssc-rd05-wave02-object-semantic-rule-set@1', 'rules schema');
  assert(value.wave_id === 'SSC-RD-W02' && value.class_id === 'RD-05-C03' && value.issue === 790, 'rules identity');
  assert(value.object_count === 58 && value.objects.length === 58, 'rules denominator');
  return value;
}

export function materializedRuleSetBytes() {
  return Buffer.from(`${JSON.stringify(embeddedRuleSet(), null, 2)}\n`, 'utf8');
}

export function materializeRuleSet(rulesPath = RULES_PATH) {
  const bytes = materializedRuleSetBytes();
  assert(sha256(bytes) === MATERIALIZED_RULES_SHA256, 'materialized rules digest');
  fs.mkdirSync(path.dirname(rulesPath), { recursive: true });
  fs.writeFileSync(rulesPath, bytes);
  return bytes;
}

function decodeEntities(value) {
  const named = new Map([
    ['nbsp', ' '], ['amp', '&'], ['lt', '<'], ['gt', '>'], ['quot', '"'], ['apos', "'"],
    ['ndash', '–'], ['mdash', '—'], ['lsquo', '‘'], ['rsquo', '’'], ['ldquo', '“'], ['rdquo', '”']
  ]);
  return value
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#([0-9]+);/g, (_, dec) => String.fromCodePoint(Number.parseInt(dec, 10)))
    .replace(/&([a-z]+);/gi, (whole, name) => named.get(name.toLowerCase()) ?? whole);
}

function normalizedText(bytes, contentType) {
  let type = String(contentType || '').toLowerCase();
  const prefix = bytes.subarray(0, 512).toString('utf8').trimStart().toLowerCase();
  if (!type && (prefix.startsWith('<!doctype html') || prefix.includes('<html'))) type = 'text/html';
  if (!type && (prefix.startsWith('{') || prefix.startsWith('['))) type = 'application/json';
  if (!(type.includes('html') || type.includes('json') || type.startsWith('text/'))) return '';
  let value = bytes.toString('utf8');
  if (type.includes('html')) {
    value = value
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<svg\b[\s\S]*?<\/svg>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
  }
  return decodeEntities(value).replace(/\s+/g, ' ').trim();
}

function stableCounts(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) || 0) + 1);
  return Object.fromEntries([...counts.entries()].sort(([a], [b]) => a.localeCompare(b)));
}

function chainNote(fieldName) {
  if (fieldName === 'agency_response_state') {
    return 'No agency response is inferred without an exact completed recommendation object and an exact response object.';
  }
  if (fieldName === 'adoption_or_rejection_state') {
    return 'Neither adoption nor rejection is inferred from agenda language, agency proximity, termination, or later policy activity.';
  }
  return 'Implementation and outcome claims require a completed recommendation, a disposition, and exact implementation or outcome evidence.';
}


function resolveSemanticSource(indexObject, rule, recoveryIndex) {
  if (rule.id !== 'RD05-OBJ-051') {
    return {
      ...indexObject,
      source_access_recovered: false
    };
  }

  assert(recoveryIndex.schema_version === 'ssc-rd05-same-object-api-recovery-index@1', 'recovery index schema');
  assert(recoveryIndex.counts.frozen_object_denominator === 58, 'recovery denominator');
  assert(recoveryIndex.counts.frozen_object_denominator_changed === 0, 'recovery denominator unchanged');
  assert(recoveryIndex.counts.same_object_recoveries === 1, 'recovery count');
  assert(recoveryIndex.counts.linked_urls_fetched === 0 && recoveryIndex.counts.links_admitted === 0, 'recovery link boundary');

  const recovery = recoveryIndex.recovery;
  assert(recovery.object_id === indexObject.object_id, 'recovery object identity');
  assert(recovery.document_number === '2024-08630', 'recovery document number');
  assert(recovery.original_representation.frozen_url === indexObject.frozen_url, 'recovery frozen URL');
  assert(recovery.original_representation.final_url === indexObject.final_url, 'recovery original final URL');
  assert(recovery.original_representation.body_sha256 === indexObject.body_sha256, 'recovery original body hash');
  assert(recovery.original_representation.semantic_target_delivered === false, 'recovery original target boundary');
  assert(recovery.same_object_binding.document_number_locator_match === true, 'recovery locator binding');
  assert(recovery.same_object_binding.api_document_number_match === true, 'recovery API identity binding');
  assert(recovery.same_object_binding.frozen_url_html_url_match === true, 'recovery HTML URL binding');

  const api = recovery.official_api_representation;
  const receipt = readJson(api.receipt.path);
  const record = readJson(api.document_record.path);
  assert(receipt.schema_version === 'ssc-rd05-same-object-api-attempt-receipt@1', 'recovery receipt schema');
  assert(receipt.object_id === indexObject.object_id && receipt.document_number === recovery.document_number, 'recovery receipt identity');
  assert(receipt.target_delivered === true && receipt.same_object_document_match === true, 'recovery target delivery');
  assert(receipt.http_status === 200 && receipt.curl_exit === 0, 'recovery transport');
  assert(receipt.final_url === api.final_url, 'recovery final URL');
  assert(receipt.observed_body_sha256 === api.body.sha256 && receipt.observed_body_bytes === api.body.bytes, 'recovery body receipt');
  assert(receipt.observed_headers_sha256 === api.headers.sha256 && receipt.observed_headers_bytes === api.headers.bytes, 'recovery headers receipt');
  assert(record.schema_version === 'ssc-rd05-federal-register-document-record@1', 'recovery document schema');
  assert(record.object_id === indexObject.object_id && record.same_object_document_number === recovery.document_number, 'recovery document identity');
  assert(record.exact_api_body_sha256 === api.body.sha256 && record.exact_api_body_bytes === api.body.bytes, 'recovery document body binding');
  assert(record.linked_urls_fetched === 0 && record.links_admitted === 0, 'recovery document link boundary');

  return {
    ...indexObject,
    final_url: api.final_url,
    receipt_path: api.receipt.path,
    body_path: api.body.path,
    body_bytes: api.body.bytes,
    body_sha256: api.body.sha256,
    headers_path: api.headers.path,
    headers_bytes: api.headers.bytes,
    headers_sha256: api.headers.sha256,
    content_type: api.body.content_type,
    custody_mode: 'same_object_official_api_recovery',
    attempts: recoveryIndex.counts.attempts_executed,
    terminal_state: 'official_api_same_object_delivered',
    source_access_recovered: true,
    original_representation: {
      frozen_url: indexObject.frozen_url,
      final_url: indexObject.final_url,
      receipt_path: indexObject.receipt_path,
      body_path: indexObject.body_path,
      body_bytes: indexObject.body_bytes,
      body_sha256: indexObject.body_sha256,
      headers_path: indexObject.headers_path,
      headers_bytes: indexObject.headers_bytes,
      headers_sha256: indexObject.headers_sha256,
      content_type: indexObject.content_type,
      custody_mode: indexObject.custody_mode,
      attempts: indexObject.attempts,
      terminal_transport_state: indexObject.terminal_state,
      semantic_target_delivered: false
    },
    same_object_binding: structuredClone(recovery.same_object_binding)
  };
}

function buildObject(indexObject, rule, requiredFields, recoveryIndex) {
  assert(rule.id === indexObject.object_id, `object id ${rule.id}`);
  assert(rule.scope === indexObject.source_scope, `scope ${rule.id}`);
  assert(rule.url === indexObject.frozen_url, `url ${rule.id}`);
  const source = resolveSemanticSource(indexObject, rule, recoveryIndex);
  assert(rule.sha === source.body_sha256, `body hash ${rule.id}`);
  assert(rule.bytes === source.body_bytes, `body bytes ${rule.id}`);
  assert(rule.ctype === source.content_type, `content type ${rule.id}`);

  const body = fs.readFileSync(source.body_path);
  assert(body.length === source.body_bytes, `body file bytes ${rule.id}`);
  assert(sha256(body) === source.body_sha256, `body file hash ${rule.id}`);
  const text = normalizedText(body, source.content_type).toLocaleLowerCase('en-US');
  for (const anchor of rule.anchors) {
    assert(text.includes(anchor.toLocaleLowerCase('en-US')), `evidence anchor ${rule.id}: ${anchor}`);
  }

  const chain = (name) => field(rule.chain.state, null, chainNote(name), rule.chain.terminal);
  const fields = {
    record_class_and_issuing_authority: field(
      'observed_exact_object_classification',
      { record_class: rule.class, issuing_authority: rule.authority, source_scope: rule.scope },
      'Record class and issuing authority are classified against the exact captured bytes.',
      true
    ),
    meeting_or_workstream_identity: field(
      rule.identity.state,
      structuredClone(rule.identity.value),
      'Meeting or workstream identity is kept separate from recommendation, response, and disposition authority.',
      true
    ),
    publication_and_operative_dates: field(
      rule.dates.state,
      structuredClone(rule.dates.value),
      'Publication, event, filing, cancellation, termination, and other operative dates are distinct; absent dates are not inferred.',
      true
    ),
    member_or_subcommittee_authorship: field(
      rule.authorship.state,
      structuredClone(rule.authorship.value),
      'Page subject, listed membership, presenter, signatory, and work-product authorship are not collapsed.',
      true
    ),
    recommendation_state: field(
      'observed_semantic_classification',
      { status: rule.recommendation.status, completed_recommendation_observed: false },
      rule.recommendation.note,
      rule.recommendation.terminal
    ),
    agency_response_state: chain('agency_response_state'),
    adoption_or_rejection_state: chain('adoption_or_rejection_state'),
    implementation_and_outcome_state: chain('implementation_and_outcome_state'),
    exact_source_locator_and_byte_custody: field(
      'observed_exact_byte_custody',
      {
        frozen_url: indexObject.frozen_url,
        final_url: source.final_url,
        receipt_path: source.receipt_path,
        body_path: source.body_path,
        body_bytes: source.body_bytes,
        body_sha256: source.body_sha256,
        headers_path: source.headers_path,
        headers_bytes: source.headers_bytes,
        headers_sha256: source.headers_sha256,
        content_type: source.content_type,
        custody_mode: source.custody_mode,
        attempts: source.attempts,
        terminal_transport_state: source.terminal_state,
        source_access_recovered: source.source_access_recovered,
        ...(source.source_access_recovered ? {
          original_representation: structuredClone(source.original_representation),
          same_object_binding: structuredClone(source.same_object_binding)
        } : {})
      },
      'Transport success, exact byte custody, and semantic target delivery remain distinct.',
      true
    ),
    duplicate_supersession_or_archive_relationship: field(
      rule.relation.state,
      structuredClone(rule.relation.value),
      'Representation, related-subject, alias, archive, duplicate, and supersession relationships remain distinct.',
      true
    ),
    terminal_record_state: field(
      'observed_current_object_terminal_state',
      { status: rule.terminal_state, semantic_classification_complete: true },
      'This terminal state applies to the current frozen object only; it does not close the complete official universe or the RD-05 class.',
      true
    )
  };
  assert(JSON.stringify(Object.keys(fields)) === JSON.stringify(requiredFields), `field order/denominator ${rule.id}`);

  return {
    object_id: rule.id,
    source_scope: indexObject.source_scope,
    frozen_url: indexObject.frozen_url,
    observed_title: rule.title,
    record_class: rule.class,
    evidence: {
      method: rule.anchors.length ? 'normalized_text_anchor_plus_exact_sha256' : 'exact_sha256_bound_manual_document_review',
      normalized_text_anchors: structuredClone(rule.anchors),
      exact_body_sha256: source.body_sha256,
      source_representation: source.source_access_recovered
        ? 'same_object_official_api_recovery'
        : 'frozen_exact_capture'
    },
    fields,
    successor_actions: structuredClone(rule.actions)
  };
}

export function buildSemanticClassification({
  captureIndexPath = CAPTURE_INDEX_PATH,
  recoveryIndexPath = RECOVERY_INDEX_PATH,
  rulesPath = RULES_PATH,
  frontierPath = FRONTIER_PATH
} = {}) {
  const captureIndexBytes = fs.readFileSync(captureIndexPath);
  const captureIndex = JSON.parse(captureIndexBytes);
  const recoveryIndexBytes = fs.readFileSync(recoveryIndexPath);
  const recoveryIndex = JSON.parse(recoveryIndexBytes);
  const observedRuleBytes = fs.readFileSync(rulesPath);
  assert(sha256(observedRuleBytes) === MATERIALIZED_RULES_SHA256, 'materialized rules file digest');
  const ruleSet = JSON.parse(observedRuleBytes);
  assert(ruleSet.schema_version === 'ssc-rd05-wave02-object-semantic-rule-set@1', 'rules schema');
  assert(ruleSet.wave_id === 'SSC-RD-W02' && ruleSet.class_id === 'RD-05-C03' && ruleSet.issue === 790, 'rules identity');
  assert(ruleSet.object_count === 58 && ruleSet.objects.length === 58, 'rules denominator');
  const frontier = readJson(frontierPath);

  assert(captureIndex.schema_version === 'ssc-rd05-wave02-exact-object-capture-index@1', 'capture index schema');
  assert(sha256(captureIndexBytes) === ruleSet.source_product.capture_index_sha256, 'capture index digest');
  assert(captureIndex.objects.length === 58, 'capture index denominator');
  assert(recoveryIndex.schema_version === 'ssc-rd05-same-object-api-recovery-index@1', 'recovery index schema');
  assert(sha256(recoveryIndexBytes) === ruleSet.source_product.same_object_recovery_index_sha256, 'recovery index digest');
  assert(ruleSet.source_product.research_head === '0d1e0744e6e9391a1bff12053918362ad389bcfa', 'source product head');
  assert(ruleSet.source_product.exact_capture_product_head === '74dc76adee359b7f4c6b58fa898d2ecf3c2c0222', 'exact capture head');
  assert(ruleSet.source_product.semantic_parent_head === '205537aa7d550741b2e95df0a43484f0879559bc', 'semantic parent head');
  assert(ruleSet.source_product.same_object_recovery_product_head === '0d1e0744e6e9391a1bff12053918362ad389bcfa', 'recovery product head');
  assert(ruleSet.source_product.same_object_recoveries_applied === 1, 'recovery application count');
  assert(ruleSet.objects.length === 58, 'rules denominator');
  assert(frontier.schema_version === 'ssc-rd05-new-official-links@1', 'frontier schema');
  assert(frontier.extraction_is_denominator_admission === false, 'frontier admission boundary');

  const expectedIds = Array.from({ length: 58 }, (_, i) => `RD05-OBJ-${String(i + 1).padStart(3, '0')}`);
  assert(JSON.stringify(captureIndex.objects.map((o) => o.object_id)) === JSON.stringify(expectedIds), 'capture ids');
  assert(JSON.stringify(ruleSet.objects.map((o) => o.id)) === JSON.stringify(expectedIds), 'rule ids');

  const ruleById = new Map(ruleSet.objects.map((rule) => [rule.id, rule]));
  const objects = captureIndex.objects.map((object) => buildObject(object, ruleById.get(object.object_id), ruleSet.required_fields, recoveryIndex));
  const recommendationStatuses = objects.map((o) => o.fields.recommendation_state.value.status);
  const completedRecommendations = objects.filter((o) => o.fields.recommendation_state.value.completed_recommendation_observed === true);
  const openChains = objects.filter((o) =>
    ['recommendation_state', 'agency_response_state', 'adoption_or_rejection_state', 'implementation_and_outcome_state']
      .some((fieldName) => o.fields[fieldName].terminal === false)
  );
  const successorActions = objects.flatMap((o) => o.successor_actions.map((action) => ({ object_id: o.object_id, ...action })));

  return {
    schema_version: 'ssc-rd05-wave02-object-semantic-classification@1',
    wave_id: 'SSC-RD-W02',
    class_id: 'RD-05-C03',
    issue: 790,
    as_of: ruleSet.as_of,
    status: 'all_frozen_objects_semantically_classified_one_same_object_recovery_applied_successor_protocols_open',
    source_product: structuredClone(ruleSet.source_product),
    classification_contract: structuredClone(ruleSet.classification_contract),
    required_fields: structuredClone(ruleSet.required_fields),
    counts: {
      object_denominator: objects.length,
      aces_target_objects: objects.filter((o) => o.source_scope === 'aces_target').length,
      matched_control_objects: objects.filter((o) => o.source_scope === 'matched_nsb_control').length,
      semantic_classifications_complete: objects.filter((o) => o.fields.terminal_record_state.value.semantic_classification_complete === true).length,
      record_class_counts: stableCounts(objects.map((o) => o.record_class)),
      recommendation_status_counts: stableCounts(recommendationStatuses),
      member_profile_rows: objects.filter((o) => o.record_class === 'committee_member_profile').length,
      oembed_representation_rows: objects.filter((o) => o.record_class === 'oembed_representation').length,
      recommendation_activity_only_rows: objects.filter((o) =>
        ['agenda_activity_only_canceled_before_event', 'agenda_activity_only_no_recommendation_text', 'drafting_mandate_only_no_work_product']
          .includes(o.fields.recommendation_state.value.status)
      ).length,
      completed_recommendation_objects: completedRecommendations.length,
      agency_response_objects: 0,
      adopted_or_rejected_objects: 0,
      implementation_or_outcome_objects: 0,
      open_recommendation_disposition_chains: openChains.length,
      source_access_interstitial_rows: objects.filter((o) => o.record_class === 'federal_register_access_interstitial').length,
      same_object_recovered_notice_rows: objects.filter((o) => o.record_class === 'federal_register_membership_solicitation_notice').length,
      successor_action_rows: successorActions.length,
      new_official_links_not_admitted: frontier.new_official_links.length,
      new_relevance_candidates_not_admitted: frontier.new_relevance_candidates.length
    },
    objects,
    successor_work_queues: {
      object_actions: successorActions,
      nonadmitted_link_frontier: {
        source_path: frontierPath,
        extraction_is_denominator_admission: false,
        new_official_links: frontier.new_official_links.length,
        new_relevance_candidates: frontier.new_relevance_candidates.length,
        disposition: 'retained_for_separate_normalization_deduplication_and_admission_protocol'
      }
    },
    current_result: {
      all_frozen_objects_semantically_classified: true,
      same_object_source_recoveries_applied: 1,
      source_access_successor_actions_open: 0,
      recommendation_disposition_protocol_complete: false,
      complete_official_object_universe_frozen: false,
      class_closed: false,
      project_blocking: false
    },
    authority: {
      exact_byte_custody_complete: true,
      semantic_classification_complete_for_frozen_objects: true,
      same_object_source_recoveries_applied: 1,
      completed_recommendations_observed: 0,
      agency_responses_observed: 0,
      adoptions_or_rejections_observed: 0,
      implementations_or_outcomes_observed: 0,
      external_contacts: 0,
      external_reviews: 0,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none'
    }
  };
}

const self = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (self) {
  const result = buildSemanticClassification();
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`build-rd05-object-semantics: ${result.counts.semantic_classifications_complete}/${result.counts.object_denominator} classified; ${result.counts.completed_recommendation_objects} completed recommendations; ${result.counts.open_recommendation_disposition_chains} open chains`);
}
