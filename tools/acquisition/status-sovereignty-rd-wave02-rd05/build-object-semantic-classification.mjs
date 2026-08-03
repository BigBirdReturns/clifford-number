import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const ROOT = 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition';
const CAPTURE_INDEX_PATH = process.env.RD05_CAPTURE_INDEX || `${ROOT}/exact-object-capture-index.json`;
const RULES_PATH = process.env.RD05_SEMANTIC_RULES || `${ROOT}/object-semantic-rules.json`;
const FRONTIER_PATH = process.env.RD05_LINK_FRONTIER || `${ROOT}/source-custody/exact-object-capture-v1/new-official-links.json`;
const OUTPUT_PATH = process.env.RD05_SEMANTIC_OUTPUT || `${ROOT}/object-semantic-classification.json`;
const EMBEDDED_RULES_COMPACT_SHA256 = 'cf3f2b8cfe29bf6cf63b2810cf62d0c4d730d587933f6ad351500ab045e9216c';
const EMBEDDED_RULES_GZIP_SHA256 = '7fb288234f4ed7505b76cec695fa50882ca4691aea4bea533c3e49927742fd44';
export const MATERIALIZED_RULES_SHA256 = '2430933e1f616dfdc3d754285fac3be9768f1576619246437d5ec0f3a98845bd';
const EMBEDDED_RULES_GZIP_BASE64 = [
  "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",
].join('');

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

function buildObject(indexObject, rule, requiredFields) {
  assert(rule.id === indexObject.object_id, `object id ${rule.id}`);
  assert(rule.scope === indexObject.source_scope, `scope ${rule.id}`);
  assert(rule.url === indexObject.frozen_url, `url ${rule.id}`);
  assert(rule.sha === indexObject.body_sha256, `body hash ${rule.id}`);
  assert(rule.bytes === indexObject.body_bytes, `body bytes ${rule.id}`);
  assert(rule.ctype === indexObject.content_type, `content type ${rule.id}`);

  const body = fs.readFileSync(indexObject.body_path);
  assert(body.length === indexObject.body_bytes, `body file bytes ${rule.id}`);
  assert(sha256(body) === indexObject.body_sha256, `body file hash ${rule.id}`);
  const text = normalizedText(body, indexObject.content_type).toLocaleLowerCase('en-US');
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
        terminal_transport_state: indexObject.terminal_state
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
      exact_body_sha256: indexObject.body_sha256
    },
    fields,
    successor_actions: structuredClone(rule.actions)
  };
}

export function buildSemanticClassification({
  captureIndexPath = CAPTURE_INDEX_PATH,
  rulesPath = RULES_PATH,
  frontierPath = FRONTIER_PATH
} = {}) {
  const captureIndexBytes = fs.readFileSync(captureIndexPath);
  const captureIndex = JSON.parse(captureIndexBytes);
  const ruleSet = embeddedRuleSet();
  const expectedRuleBytes = materializedRuleSetBytes();
  if (fs.existsSync(rulesPath)) {
    const observedRuleBytes = fs.readFileSync(rulesPath);
    assert(sha256(observedRuleBytes) === MATERIALIZED_RULES_SHA256, 'materialized rules file digest');
    assert(observedRuleBytes.equals(expectedRuleBytes), 'materialized rules file exact bytes');
  }
  const frontier = readJson(frontierPath);

  assert(captureIndex.schema_version === 'ssc-rd05-wave02-exact-object-capture-index@1', 'capture index schema');
  assert(sha256(captureIndexBytes) === ruleSet.source_product.capture_index_sha256, 'capture index digest');
  assert(captureIndex.objects.length === 58, 'capture index denominator');
  assert(ruleSet.source_product.research_head === '74dc76adee359b7f4c6b58fa898d2ecf3c2c0222', 'source product head');
  assert(ruleSet.objects.length === 58, 'rules denominator');
  assert(frontier.schema_version === 'ssc-rd05-new-official-links@1', 'frontier schema');
  assert(frontier.extraction_is_denominator_admission === false, 'frontier admission boundary');

  const expectedIds = Array.from({ length: 58 }, (_, i) => `RD05-OBJ-${String(i + 1).padStart(3, '0')}`);
  assert(JSON.stringify(captureIndex.objects.map((o) => o.object_id)) === JSON.stringify(expectedIds), 'capture ids');
  assert(JSON.stringify(ruleSet.objects.map((o) => o.id)) === JSON.stringify(expectedIds), 'rule ids');

  const ruleById = new Map(ruleSet.objects.map((rule) => [rule.id, rule]));
  const objects = captureIndex.objects.map((object) => buildObject(object, ruleById.get(object.object_id), ruleSet.required_fields));
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
    status: 'all_frozen_objects_semantically_classified_successor_protocols_open',
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
      recommendation_disposition_protocol_complete: false,
      complete_official_object_universe_frozen: false,
      class_closed: false,
      project_blocking: false
    },
    authority: {
      exact_byte_custody_complete: true,
      semantic_classification_complete_for_frozen_objects: true,
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
  materializeRuleSet();
  const result = buildSemanticClassification();
  fs.mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(result, null, 2)}\n`);
  console.log(`build-rd05-object-semantics: ${result.counts.semantic_classifications_complete}/${result.counts.object_denominator} classified; ${result.counts.completed_recommendation_objects} completed recommendations; ${result.counts.open_recommendation_disposition_chains} open chains`);
}
