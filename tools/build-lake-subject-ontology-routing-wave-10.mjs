#!/usr/bin/env node
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const policyPath = 'data/project/lake-subject-ontology-routing-wave-10-policy.json';
const full = relative => path.join(root, relative);

function readJson(relative) {
  return JSON.parse(fs.readFileSync(full(relative), 'utf8'));
}

function readJsonl(relative) {
  return fs.readFileSync(full(relative), 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
    try { return JSON.parse(line); }
    catch (error) { throw new Error(`${relative}:${index + 1}: ${error.message}`); }
  });
}

function writeJson(relative, value) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), `${JSON.stringify(value, null, 2)}\n`);
}

function writeJsonl(relative, rows) {
  fs.mkdirSync(path.dirname(full(relative)), { recursive: true });
  fs.writeFileSync(full(relative), rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
}

function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

function stableId(prefix, parts) {
  return `${prefix}-${sha256(Buffer.from(parts.join('\0'))).slice(0, 24)}`;
}

function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(value => value !== null && value !== undefined && String(value).length > 0).map(String))]
    .sort((left, right) => left.localeCompare(right));
}

function titleSuggestion(value) {
  return String(value)
    .replace(/^(?:case|geo|infra|org|p|proj|role|site|product|program)-/, '')
    .split('-')
    .filter(Boolean)
    .map(token => /^(?:ai|adl|gao|hm|hx\d|nato|ngc2|pac|sam|uk|us|usmc)$/i.test(token)
      ? token.toUpperCase()
      : `${token.slice(0, 1).toUpperCase()}${token.slice(1)}`)
    .join(' ');
}

const policy = readJson(policyPath);
assert.equal(policy.schema_version, 'lake-subject-ontology-routing-wave-10-policy@1');
const implementationPaths = [
  'tools/build-lake-subject-ontology-routing-wave-10.mjs',
  'tools/reconcile-lake-subject-ontology-routing-wave-10.mjs',
  'tools/validate-lake-subject-ontology-routing-wave-10.mjs',
  'test/lake-subject-ontology-routing-wave-10.test.js'
];
for (const relative of [...policy.input_paths, ...implementationPaths]) {
  if (!fs.existsSync(full(relative))) throw new Error(`missing Wave 10 input: ${relative}`);
}

const wave09Receipt = readJson('data/project/lake-canonical-identity-census-wave-09.json');
const wave09Reconciliation = readJson('build/lake-actions/canonical-identity-census-wave-09-reconciliation.json');
const mentions = readJsonl('data/project/lake-canonical-identity-mention-registry-wave-09.jsonl');
assert.equal(wave09Receipt.counts.uncovered_name_like_mentions, policy.expected.uncovered_name_like_rows);
assert.equal(wave09Receipt.counts.opaque_identifier_mentions, policy.expected.opaque_identifier_rows);
assert.equal(wave09Reconciliation.completion?.every_case_local_identity_value_classified, true);
const targetStatuses = new Set(policy.target_mapping_statuses);
const targets = mentions.filter(row => targetStatuses.has(row.mapping_status))
  .sort((left, right) => `${left.case_id}\0${left.normalized_identity_value}`.localeCompare(`${right.case_id}\0${right.normalized_identity_value}`));
assert.equal(targets.length, policy.expected.target_rows, 'Wave 10 target denominator drift');

const typeSet = new Set(policy.semantic_types);
const organizationTokens = new Set(policy.typing_rules.organization_tokens);
const programTokens = new Set([...policy.typing_rules.program_tokens, 'action', 'plan', 'product', 'resource', 'taskforce', 'unit', 'zone', 'zones']);
const procurementTokens = new Set(policy.typing_rules.procurement_tokens);
const legalTokens = new Set(policy.typing_rules.legal_policy_tokens);
const placeTokens = new Set(policy.typing_rules.place_tokens);
const infrastructureTokens = new Set(policy.typing_rules.infrastructure_tokens);
const projectTokens = new Set(policy.typing_rules.project_tokens);
const internalTokens = new Set(policy.typing_rules.internal_tokens);

const actorRelationPatterns = [
  /(?:^|-)adviser-to(?:-|$)/,
  /(?:^|-)author-of(?:-|$)/,
  /(?:^|-)ceo-of(?:-|$)/,
  /(?:^|-)chair-of(?:-|$)/,
  /(?:^|-)co-founded(?:-|$)/,
  /(?:^|-)commissioned-into(?:-|$)/,
  /(?:^|-)director-of(?:-|$)/,
  /(?:^|-)founder-of(?:-|$)/,
  /(?:^|-)investor-in(?:-|$)/,
  /(?:^|-)member-of(?:-|$)/,
  /(?:^|-)president-of(?:-|$)/,
  /(?:^|-)secretary-of(?:-|$)/,
  /(?:^|-)served-as(?:-|$)/
];
const organizationRelationPatterns = [
  /(?:^|-)procurement(?:-|$)/,
  /(?:^|-)state-surface(?:-|$)/,
  /(?:^|-)vendor(?:-|$)/,
  /(?:^|-)portfolio(?:-|$)/
];

function tokensOf(value) {
  return String(value).toLowerCase().split('-').filter(Boolean);
}

function hasAny(tokens, set) {
  return tokens.some(token => set.has(token));
}

function ruleResult(semanticType, confidence, ruleId, rationale) {
  assert.ok(typeSet.has(semanticType), `unknown Wave 10 semantic type ${semanticType}`);
  return { semantic_type: semanticType, confidence, rule_id: ruleId, rationale };
}

function classify(row) {
  const value = row.identity_value;
  const tokens = tokensOf(value);
  const recordIds = row.record_ids ?? [];
  const prefix = Object.keys(policy.typing_rules.prefixes).find(candidate => value.startsWith(candidate));

  if (row.mapping_status === 'opaque_identifier') {
    const awardLike = recordIds.some(recordId => /award|contract|gao|procurement|protest/i.test(recordId));
    return awardLike
      ? ruleResult('procurement_award_or_protest_identifier', 'high', 'opaque-award-context', 'Opaque identifier appears in award, contract, procurement, or protest context.')
      : ruleResult('opaque_record_identifier', 'high', 'opaque-shape', 'Opaque non-name identifier is routed as a record identifier, not an entity.');
  }

  if (prefix) {
    return ruleResult(policy.typing_rules.prefixes[prefix], 'high', `declared-prefix:${prefix}`,
      `The case-local identifier declares the ${prefix.slice(0, -1)} prefix.`);
  }
  if (tokens[0] === 'program' || tokens[0] === 'product') {
    return ruleResult('program_or_capability', 'high', `declared-leading-token:${tokens[0]}`,
      `The case-local identifier begins with ${tokens[0]}.`);
  }
  if (tokens[0] === 'award' || tokens[0] === 'contract' || tokens[0] === 'gao') {
    return ruleResult('procurement_award_or_protest_identifier', 'high', `declared-leading-token:${tokens[0]}`,
      `The case-local identifier begins with procurement token ${tokens[0]}.`);
  }
  if (tokens[0] === 'law' || tokens[0] === 'policy' || tokens[0] === 'statute') {
    return ruleResult('legal_or_policy_instrument', 'high', `declared-leading-token:${tokens[0]}`,
      `The case-local identifier begins with legal/policy token ${tokens[0]}.`);
  }

  if (recordIds.some(recordId => actorRelationPatterns.some(pattern => pattern.test(recordId)))) {
    return ruleResult('actor_candidate', 'high', 'actor-relation-record', 'Source record identifiers describe person-specific office, founder, adviser, investor, or service predicates.');
  }
  if (recordIds.some(recordId => /dialog-directory|person-router|profile/i.test(recordId))) {
    return ruleResult('actor_candidate', 'high', 'person-roster-record', 'Source record identifiers place the subject on a person directory or profile surface.');
  }
  if (recordIds.some(recordId => organizationRelationPatterns.some(pattern => pattern.test(recordId)))) {
    return ruleResult('organization_candidate', 'medium', 'organization-relation-record', 'Source record identifiers describe vendor, portfolio, procurement, or institutional surface predicates.');
  }

  if (hasAny(tokens, procurementTokens) || /^(?:[a-z]+-)?\d{2,}[a-z0-9-]*$/i.test(value)) {
    return ruleResult('procurement_award_or_protest_identifier', 'medium', 'procurement-lexicon', 'Identifier contains procurement, contract, award, order, solicitation, or protest vocabulary.');
  }
  if (hasAny(tokens, legalTokens)) {
    return ruleResult('legal_or_policy_instrument', 'medium', 'legal-policy-lexicon', 'Identifier contains legal or policy instrument vocabulary.');
  }
  if (hasAny(tokens, placeTokens)) {
    return ruleResult('geographic_feature', 'medium', 'geographic-lexicon', 'Identifier contains a geographic feature token.');
  }
  if (hasAny(tokens, infrastructureTokens)) {
    return ruleResult('infrastructure_or_facility', 'medium', 'infrastructure-lexicon', 'Identifier contains infrastructure, facility, parcel, station, track, or water-system vocabulary.');
  }
  if (hasAny(tokens, projectTokens)) {
    return ruleResult('project_or_development', 'medium', 'project-lexicon', 'Identifier contains project or development vocabulary.');
  }
  if (hasAny(tokens, internalTokens)) {
    return ruleResult('case_internal_or_analytic_object', 'medium', 'analytic-object-lexicon', 'Identifier contains case, control, score, axis, bundle, or analytic vocabulary.');
  }
  if (hasAny(tokens, organizationTokens)
    || tokens.includes('centre') || tokens.includes('detachment') || tokens.includes('lab') || tokens.includes('laboratory')
    || tokens.includes('society') || tokens.includes('taskforce') || tokens.includes('treasury') || tokens.includes('unit')) {
    return ruleResult('organization_candidate', 'medium', 'organization-lexicon', 'Identifier contains organizational, institutional, fund, office, unit, or corporate vocabulary.');
  }
  if (hasAny(tokens, programTokens) || tokens.some(token => /^(?:cuas|eairc2|ngc2|sdanet)\d*$/i.test(token))) {
    return ruleResult('program_or_capability', 'medium', 'program-capability-lexicon', 'Identifier contains program, platform, network, capability, taskforce, unit, resource, plan, or mission vocabulary.');
  }

  const alphaTokens = tokens.filter(token => /^[a-z]+$/i.test(token));
  const containsDigits = tokens.some(token => /\d/.test(token));
  if (!containsDigits && alphaTokens.length >= 2 && alphaTokens.length <= 5) {
    return ruleResult('actor_candidate', 'low', 'person-name-shape', 'Identifier has a bounded multi-token personal-name shape and lacks stronger non-person type evidence.');
  }
  if (!containsDigits && alphaTokens.length === 1) {
    return ruleResult('organization_candidate', 'low', 'single-brand-shape', 'Single-token name-like subject is routed as a possible organization/brand rather than silently treated as a person.');
  }
  return ruleResult('unresolved_name_like', 'low', 'no-stable-type-signal', 'Available identifier and source context do not support a more specific semantic type.');
}

function priorityOf(row, classification) {
  const occurrenceCount = row.occurrence_ids?.length ?? 0;
  const receiptCount = row.receipt_ids?.length ?? 0;
  const verified = row.claim_statuses?.includes('verified') ? 1 : 0;
  const source = row.source_custody_present ? 1 : 0;
  const publicCustody = row.publicly_inspectable_custody_present ? 1 : 0;
  const canonicalRoute = ['actor_candidate', 'organization_candidate'].includes(classification.semantic_type) ? 1 : 0;
  const confidenceWeight = classification.confidence === 'high' ? 8 : classification.confidence === 'medium' ? 4 : 1;
  const score = (occurrenceCount * 8) + (receiptCount * 2) + (verified * 8) + (source * 5) + (publicCustody * 7) + (canonicalRoute * 10) + confidenceWeight;
  return {
    score,
    band: score >= 55 ? 'P0' : score >= 40 ? 'P1' : score >= 25 ? 'P2' : 'P3'
  };
}

const routingRows = targets.map(row => {
  const classification = classify(row);
  const route = policy.routes[classification.semantic_type];
  assert.ok(route, `${row.mention_id}: no route for ${classification.semantic_type}`);
  const priority = priorityOf(row, classification);
  const canonicalEligible = ['actor_candidate', 'organization_candidate'].includes(classification.semantic_type)
    && row.source_custody_present === true;
  return {
    schema_version: 'subject-ontology-routing-decision@1',
    routing_id: stableId('SUBJROUTE', [row.case_id, row.identity_value]),
    source_mention_id: row.mention_id,
    case_id: row.case_id,
    case_title: row.case_title,
    identity_value: row.identity_value,
    suggested_label: titleSuggestion(row.identity_value),
    prior_mapping_status: row.mapping_status,
    occurrence_ids: row.occurrence_ids,
    occurrence_count: row.occurrence_ids.length,
    record_ids: row.record_ids,
    receipt_ids: row.receipt_ids,
    receipt_count: row.receipt_ids.length,
    source_custody_present: row.source_custody_present,
    publicly_inspectable_custody_present: row.publicly_inspectable_custody_present,
    claim_statuses: row.claim_statuses,
    evidence_classes: row.evidence_classes,
    semantic_type: classification.semantic_type,
    typing_confidence: classification.confidence,
    typing_rule_id: classification.rule_id,
    typing_rationale: classification.rationale,
    destination_registry: route,
    canonical_acquisition_eligible: canonicalEligible,
    canonical_mutation_applied: false,
    accepted_identity_bridge: false,
    priority_score: priority.score,
    priority_band: priority.band,
    next_action: canonicalEligible
      ? 'build_source_custodied_canonical_record_proposal_without_mutating_the_active_registry'
      : classification.semantic_type === 'unresolved_name_like'
        ? 'acquire_semantic_type_evidence_from_the_named_case_receipts'
        : `register_in:${route}`,
    uncertainty: classification.confidence === 'high'
      ? 'type_is_supported_by_an_explicit_local_prefix_or_strong_record_context_but_not_real_world_identity'
      : classification.confidence === 'medium'
        ? 'type_is_a_bounded_lexical_or_record_context_judgment_and_may_be_superseded'
        : 'type_is_a_low_confidence_working_judgment_retained_for_acquisition_and_correction',
    review_dependency: {
      required_to_decide: false,
      effect: 'new_evidence_may_correct_the_type_or_route_but_missing_review_does_not_block_the_current_reversible_routing_decision'
    },
    reversibility: {
      mode: 'append_preserving_supersession',
      correction_route: 'a_later_typed_source_record_may_supersede_this_route_without_deleting_the_original_case_local_subject'
    },
    automatic_cross_case_join_authorized: false,
    cross_case_graph_join_authorized: false,
    cross_case_hop_creation_authorized: false,
    graph_effect: 'none'
  };
}).sort((left, right) => (right.priority_score - left.priority_score)
  || `${left.case_id}\0${left.identity_value}`.localeCompare(`${right.case_id}\0${right.identity_value}`));
assert.equal(routingRows.length, policy.expected.target_rows);
assert.equal(new Set(routingRows.map(row => row.routing_id)).size, routingRows.length, 'duplicate Wave 10 routing ID');

const canonicalQueue = routingRows.filter(row => row.canonical_acquisition_eligible).map(row => ({
  schema_version: 'canonical-acquisition-candidate@1',
  acquisition_id: stableId('CANACQ', [row.case_id, row.identity_value, row.semantic_type]),
  source_routing_id: row.routing_id,
  source_mention_id: row.source_mention_id,
  case_id: row.case_id,
  identity_value: row.identity_value,
  suggested_label: row.suggested_label,
  candidate_kind: row.semantic_type === 'actor_candidate' ? 'actor' : 'organization',
  typing_confidence: row.typing_confidence,
  typing_rule_id: row.typing_rule_id,
  occurrence_count: row.occurrence_count,
  receipt_ids: row.receipt_ids,
  source_custody_present: row.source_custody_present,
  publicly_inspectable_custody_present: row.publicly_inspectable_custody_present,
  claim_statuses: row.claim_statuses,
  evidence_classes: row.evidence_classes,
  priority_score: row.priority_score,
  priority_band: row.priority_band,
  status: 'acquisition_candidate_only',
  canonical_mutation_applied: false,
  accepted_identity_bridge: false,
  required_evidence_transition: 'confirm_subject_type_and_label_from_the_named_receipts_then_write_an_append_preserving_canonical_proposal',
  review_dependency: row.review_dependency,
  reversibility: row.reversibility,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  graph_effect: 'none'
})).sort((left, right) => (right.priority_score - left.priority_score) || left.acquisition_id.localeCompare(right.acquisition_id));

const noncanonicalRows = routingRows.filter(row => !row.canonical_acquisition_eligible).map(row => ({
  schema_version: 'noncanonical-subject-routing@1',
  route_id: stableId('NONCANON', [row.case_id, row.identity_value, row.semantic_type]),
  source_routing_id: row.routing_id,
  source_mention_id: row.source_mention_id,
  case_id: row.case_id,
  identity_value: row.identity_value,
  suggested_label: row.suggested_label,
  semantic_type: row.semantic_type,
  typing_confidence: row.typing_confidence,
  typing_rule_id: row.typing_rule_id,
  destination_registry: row.destination_registry,
  receipt_ids: row.receipt_ids,
  source_custody_present: row.source_custody_present,
  publicly_inspectable_custody_present: row.publicly_inspectable_custody_present,
  priority_score: row.priority_score,
  priority_band: row.priority_band,
  status: row.semantic_type === 'unresolved_name_like' ? 'bounded_acquisition_required' : 'typed_routing_decision',
  canonical_mutation_applied: false,
  accepted_identity_bridge: false,
  review_dependency: row.review_dependency,
  reversibility: row.reversibility,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  graph_effect: 'none'
})).sort((left, right) => (right.priority_score - left.priority_score) || left.route_id.localeCompare(right.route_id));

const typeCounts = {};
const confidenceCounts = {};
const routeCounts = {};
const priorityCounts = {};
for (const row of routingRows) {
  typeCounts[row.semantic_type] = (typeCounts[row.semantic_type] ?? 0) + 1;
  confidenceCounts[row.typing_confidence] = (confidenceCounts[row.typing_confidence] ?? 0) + 1;
  routeCounts[row.destination_registry] = (routeCounts[row.destination_registry] ?? 0) + 1;
  priorityCounts[row.priority_band] = (priorityCounts[row.priority_band] ?? 0) + 1;
}
const sortObject = object => Object.fromEntries(Object.entries(object).sort(([left], [right]) => left.localeCompare(right)));
const unresolved = routingRows.filter(row => row.semantic_type === 'unresolved_name_like').length;
const publiclyCustodiedCanonical = canonicalQueue.filter(row => row.publicly_inspectable_custody_present).length;

const fingerprintPaths = [...new Set([policyPath, ...policy.input_paths, ...implementationPaths])].sort();
const inputs = fingerprintPaths.map(relative => {
  const bytes = fs.readFileSync(full(relative));
  return { path: relative, bytes: bytes.length, sha256: sha256(bytes) };
});
const sourceFingerprint = sha256(Buffer.from(inputs.map(row => `${row.path}\0${row.sha256}\0${row.bytes}\n`).join('')));

writeJsonl(policy.routing_registry_path, routingRows);
writeJsonl(policy.canonical_acquisition_queue_path, canonicalQueue);
writeJsonl(policy.noncanonical_routing_registry_path, noncanonicalRows);

const projection = {
  schema_version: 'subject-ontology-routing-index-wave-10@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  source_paths: {
    routing_registry: policy.routing_registry_path,
    canonical_acquisition_queue: policy.canonical_acquisition_queue_path,
    noncanonical_routing_registry: policy.noncanonical_routing_registry_path
  },
  counts: {
    routing_rows: routingRows.length,
    canonical_acquisition_rows: canonicalQueue.length,
    noncanonical_routing_rows: noncanonicalRows.length,
    unresolved_rows: unresolved,
    canonical_mutations_applied: 0,
    accepted_identity_bridges: 0
  },
  semantic_type_counts: sortObject(typeCounts),
  confidence_counts: sortObject(confidenceCounts),
  route_counts: sortObject(routeCounts),
  priority_counts: sortObject(priorityCounts),
  routing_rows: routingRows,
  canonical_acquisition_queue: canonicalQueue,
  noncanonical_routing_rows: noncanonicalRows,
  automatic_cross_case_join_authorized: false,
  cross_case_graph_join_authorized: false,
  cross_case_hop_creation_authorized: false,
  graph_effect: 'none'
};
writeJson(policy.projection_path, projection);

const receipt = {
  schema_version: 'lake-subject-ontology-routing-wave-10@1',
  program_key: policy.program_key,
  as_of: policy.as_of,
  source_fingerprint_sha256: sourceFingerprint,
  counts: {
    target_rows: routingRows.length,
    canonical_acquisition_rows: canonicalQueue.length,
    publicly_inspectable_canonical_acquisition_rows: publiclyCustodiedCanonical,
    noncanonical_routing_rows: noncanonicalRows.length,
    unresolved_rows: unresolved,
    canonical_mutations_applied: 0,
    accepted_identity_bridges: 0,
    graph_effects_created: 0
  },
  semantic_type_counts: sortObject(typeCounts),
  confidence_counts: sortObject(confidenceCounts),
  route_counts: sortObject(routeCounts),
  priority_counts: sortObject(priorityCounts),
  decisions_requiring_human_permission: 0,
  correction_mode: 'append_preserving_supersession',
  boundaries: policy.boundaries
};
writeJson(policy.receipt_path, receipt);

const plan = {
  schema_version: 'lake-subject-ontology-routing-wave-10-plan@1',
  program_key: policy.program_key,
  source_fingerprint_sha256: sourceFingerprint,
  input_manifest: inputs,
  before: {
    noncovered_identity_rows: targets.length,
    semantic_types_assigned: 0,
    canonical_acquisition_queue_present: false,
    noncanonical_routing_registry_present: false,
    canonical_mutations_applied: 0,
    accepted_identity_bridges: 0
  },
  routing: {
    semantic_type_counts: sortObject(typeCounts),
    confidence_counts: sortObject(confidenceCounts),
    route_counts: sortObject(routeCounts),
    priority_counts: sortObject(priorityCounts),
    routing_registry_path: policy.routing_registry_path,
    canonical_acquisition_queue_path: policy.canonical_acquisition_queue_path,
    noncanonical_routing_registry_path: policy.noncanonical_routing_registry_path,
    projection_path: policy.projection_path
  },
  decisions: [
    {
      decision_key: 'W10-TYPE-THE-NONCOVERED-DENOMINATOR',
      judgment: 'every_wave09_noncovered_subject_has_a_bounded_semantic_type_route_confidence_and_correction_path',
      action: `retain:${policy.routing_registry_path}`,
      evidence_count: routingRows.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W10-SEPARATE-CANONICAL-ACQUISITION',
      judgment: 'only_custodied_actor_and_organization_candidates_enter_the_canonical_acquisition_queue',
      action: `retain:${policy.canonical_acquisition_queue_path}`,
      evidence_count: canonicalQueue.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    },
    {
      decision_key: 'W10-ROUTE-NONIDENTITY-SUBJECTS',
      judgment: 'programs_awards_laws_places_infrastructure_projects_roles_and_internal_objects_are_routed_outside_actor_organization_identity',
      action: `retain:${policy.noncanonical_routing_registry_path}`,
      evidence_count: noncanonicalRows.length,
      review_dependency: { required_to_decide: false },
      graph_effect: 'none'
    }
  ],
  completion: {
    every_target_row_typed_and_routed: routingRows.length === targets.length,
    canonical_acquisition_queue_present: true,
    noncanonical_routing_registry_present: true,
    unresolved_rows_preserved: true,
    canonical_mutations_applied: 0,
    accepted_identity_bridges: 0,
    post_execution_reconciliation_complete: false,
    evidence_truth_determined: false,
    publication_cleared: false,
    decisions_requiring_human_permission: 0
  },
  boundaries: policy.boundaries
};
writeJson(policy.plan_path, plan);

const report = `# Subject ontology routing Wave 10\n\nSource fingerprint: \`${sourceFingerprint}\`\n\n## Result\n\n\`\`\`text\nWave 09 non-covered rows:                    ${routingRows.length}\ncanonical actor/organization acquisition:    ${canonicalQueue.length}\npublicly inspectable canonical candidates:   ${publiclyCustodiedCanonical}\nnoncanonical typed routes:                   ${noncanonicalRows.length}\nunresolved name-like rows:                   ${unresolved}\ncanonical mutations applied:                 0\naccepted identity bridges:                   0\ngraph effects created:                       0\ndecisions requiring human permission:        0\n\`\`\`\n\n## Semantic type counts\n\n${Object.entries(sortObject(typeCounts)).map(([key, value]) => `- ${key}: ${value}`).join('\n')}\n\n## Judgment\n\nThe Wave 09 uncovered denominator was not one identity problem. It contains people and organizations that may warrant canonical records, but also programs, products, awards, legal instruments, places, infrastructure, projects, roles, and case-internal analytical objects. This wave routes each row according to its current evidence rather than forcing every noun into actor/organization identity.\n\n## Boundary\n\nA semantic type is a reversible working judgment, not proof of real-world identity. No canonical file is mutated, no identity bridge is accepted, and no relationship, graph edge, or hop is created.\n`;
fs.mkdirSync(path.dirname(full(policy.report_path)), { recursive: true });
fs.writeFileSync(full(policy.report_path), report);

console.log('subject ontology routing Wave 10 built');
console.log(`  routing rows: ${routingRows.length}`);
console.log(`  canonical acquisition / noncanonical / unresolved: ${canonicalQueue.length} / ${noncanonicalRows.length} / ${unresolved}`);
console.log(`  type counts: ${JSON.stringify(sortObject(typeCounts))}`);
console.log('  canonical mutations / identity bridges / graph effects: 0 / 0 / 0');
