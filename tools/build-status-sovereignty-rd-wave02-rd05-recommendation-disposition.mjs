#!/usr/bin/env node
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const CLASSIFICATION_PATH = 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/object-semantic-classification.json';
export const CENSUS_ROOT = 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/source-custody/successor-census-v1';
export const EXECUTION_RECEIPT_PATH = 'data/intake/status-sovereignty-rd-wave02-rd05-recommendation-disposition/successor-census-execution-receipt.json';
export const SEED_PATH = 'data/project/ssc-residual-wave02/seeds/RD-05-C03.json';
export const CLOSURE_REFERENCE_PATH = 'data/project/ssc-residual-wave02/closures/RD-05-C03.json';
export const PRODUCT_ROOT = 'data/research/status-sovereignty-rd-wave02-rd05-recommendation-disposition';
export const SCHEMA_PATH = 'schemas/status-sovereignty-rd-wave02-rd05-recommendation-disposition.schema.json';

export const RESEARCH_HEAD = '03d0c627308b86ad75e8cdad6a90756c97e592ce';
export const CLASSIFICATION_SHA256 = 'ed35fbd41027497742d5db4473d8675978d37eab52f95c35628616aa7fba6f13';
export const CENSUS_ARTIFACT_ID = 8852846428;
export const CENSUS_ARTIFACT_SHA256 = '9a7524164ad5594ac720ec914a84812005aef8e79d0a82ebb561b268089c08fb';
export const CENSUS_MANIFEST_SHA256 = '0fb07dd92ff7e8c27a7e4b3e6b3db18842538516b1badd05afe194fd07446c32';
export const OPEN_CHAIN_IDS = Object.freeze(['RD05-OBJ-023', 'RD05-OBJ-024', 'RD05-OBJ-025', 'RD05-OBJ-029']);
export const CLASS_LABEL = 'recommendation, agency response, adoption, rejection, implementation, and outcome ledger';

const abs = (root, rel) => path.join(root, rel);
const readBytes = (root, rel) => fs.readFileSync(abs(root, rel));
const readJson = (root, rel) => JSON.parse(readBytes(root, rel).toString('utf8'));
const writeJson = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`);
};
const sha256 = (value) => crypto.createHash('sha256').update(value).digest('hex');
const ok = (condition, message) => { if (!condition) throw new Error(message); };
const same = (actual, expected, message) => ok(JSON.stringify(actual) === JSON.stringify(expected), message);
const unique = (values, message) => ok(new Set(values).size === values.length, message);
const countBy = (values) => Object.fromEntries([...values.reduce((map, value) => map.set(value, (map.get(value) || 0) + 1), new Map())].sort(([a], [b]) => a.localeCompare(b)));

function censusPath(name) { return `${CENSUS_ROOT}/${name}`; }

export function readInputs(root = ROOT) {
  return {
    classification: readJson(root, CLASSIFICATION_PATH),
    classificationBytes: readBytes(root, CLASSIFICATION_PATH),
    executionReceipt: readJson(root, EXECUTION_RECEIPT_PATH),
    seed: readJson(root, SEED_PATH),
    census: {
      plan: readJson(root, censusPath('plan.json')),
      routeResults: readJson(root, censusPath('route-results.json')),
      candidateHits: readJson(root, censusPath('candidate-hits.json')),
      routeTextIndex: readJson(root, censusPath('route-text-index.json')),
      transportLedger: readJson(root, censusPath('terminal-ledger.json')),
      summary: readJson(root, censusPath('summary.json')),
      manifest: readJson(root, censusPath('manifest.json')),
    },
  };
}

function selectedAttempt(route) {
  ok(Number.isInteger(route.selected_attempt), `${route.route_id}: selected attempt missing`);
  const attempt = route.attempts[route.selected_attempt - 1];
  ok(attempt, `${route.route_id}: selected attempt unavailable`);
  return attempt;
}

function routeMap(inputs) {
  return new Map(inputs.census.routeResults.routes.map((row) => [row.route_id, row]));
}

function bodyJson(root, inputs, routeId) {
  const route = routeMap(inputs).get(routeId);
  ok(route, `${routeId}: route missing`);
  const attempt = selectedAttempt(route);
  return readJson(root, `${CENSUS_ROOT}/${attempt.body_path}`);
}

function acesBoundSearchRows(rows) {
  return rows.filter((row) => /advisory-committee-on-excellence-in-space-aces|first-aces-public-meeting|aces-public-meeting/i.test(String(row.url || row.link || '')));
}

function relevantFederalRegisterRows(results) {
  return results.filter((row) => row.document_number === '2025-10398' || /Advisory Committee (?:for|on) Excellence in Space|Advisory Committee on Excellence in Space|Renewal of the Advisory Committee on Excellence in Space/i.test(String(row.title || '')));
}

export function validateInputData(inputs) {
  const { classification, executionReceipt, seed, census } = inputs;
  ok(classification?.schema_version === 'ssc-rd05-wave02-object-semantic-classification@1', 'classification schema changed');
  ok(classification?.wave_id === 'SSC-RD-W02' && classification?.class_id === 'RD-05-C03' && classification?.issue === 790, 'classification identity changed');
  ok(classification?.counts?.object_denominator === 58 && classification?.objects?.length === 58, '58-object denominator changed');
  unique(classification.objects.map((row) => row.object_id), 'duplicate classification object id');
  ok(classification.counts.semantic_classifications_complete === 58, 'semantic classification denominator changed');
  ok(classification.counts.completed_recommendation_objects === 0, 'completed recommendation authority changed');
  ok(classification.counts.agency_response_objects === 0, 'agency response authority changed');
  ok(classification.counts.adopted_or_rejected_objects === 0, 'disposition authority changed');
  ok(classification.counts.implementation_or_outcome_objects === 0, 'implementation authority changed');
  ok(classification.counts.open_recommendation_disposition_chains === 4, 'four open chains required before closure');
  ok(classification.counts.source_access_interstitial_rows === 0, 'same-object source recovery not reconciled');
  ok(classification.counts.same_object_recovered_notice_rows === 1, 'same-object recovery count changed');

  const byId = new Map(classification.objects.map((row) => [row.object_id, row]));
  same(OPEN_CHAIN_IDS, classification.objects.filter((row) => [
    row.fields.recommendation_state.terminal,
    row.fields.agency_response_state.terminal,
    row.fields.adoption_or_rejection_state.terminal,
    row.fields.implementation_and_outcome_state.terminal,
  ].some((value) => value !== true)).map((row) => row.object_id), 'open chain identity changed');
  for (const objectId of OPEN_CHAIN_IDS) {
    const row = byId.get(objectId);
    ok(row, `${objectId}: missing`);
    ok(row.fields.recommendation_state.terminal === false, `${objectId}: recommendation prematurely terminal`);
    ok(row.fields.agency_response_state.terminal === false, `${objectId}: response prematurely terminal`);
    ok(row.fields.adoption_or_rejection_state.terminal === false, `${objectId}: disposition prematurely terminal`);
    ok(row.fields.implementation_and_outcome_state.terminal === false, `${objectId}: implementation prematurely terminal`);
    ok(row.successor_actions.some((action) => action.blocking === false), `${objectId}: no-magic-human continuation changed`);
  }

  ok(executionReceipt?.schema_version === 'ssc-rd05-wave02-successor-census-execution-receipt@1', 'execution receipt schema changed');
  ok(executionReceipt?.workflow_run === 30806151404 && executionReceipt?.job_id === 91661876762, 'execution custody changed');
  ok(executionReceipt?.artifact_id === CENSUS_ARTIFACT_ID && executionReceipt?.artifact_zip_sha256 === CENSUS_ARTIFACT_SHA256, 'artifact identity changed');
  ok(executionReceipt?.manifest_entry_count === 398 && executionReceipt?.manifest_combined_sha256 === CENSUS_MANIFEST_SHA256, 'execution manifest binding changed');
  ok(executionReceipt?.first_attempt?.source_requests_executed === 0, 'failed preflight created source requests');
  ok(executionReceipt?.authority?.outside_human_dependency === false, 'outside-human dependency introduced');

  ok(seed?.schema_version === 'ssc-residual-denominator-wave02-lane-seed-reference@1', 'seed schema changed');
  ok(seed?.wave_issue === 785 && seed?.child_issue === 790 && seed?.class_id === 'RD-05-C03', 'seed identity changed');
  ok(seed?.closure_target === CLASS_LABEL, 'seed closure target changed');

  ok(census.plan?.schema_version === 'ssc-rd05-wave02-successor-census-plan@1', 'census plan schema changed');
  ok(census.plan.research_head === RESEARCH_HEAD, 'census research head changed');
  ok(census.plan.frozen_object_denominator === 58, 'census denominator widened');
  same(census.plan.open_chain_object_ids, OPEN_CHAIN_IDS, 'census open-chain list changed');
  ok(census.plan.routes.length === 49, '49 fixed routes required');
  unique(census.plan.routes.map((row) => row.route_id), 'duplicate census route id');
  ok(census.plan.protocol.fixed_before_execution === true, 'route plan was not fixed before execution');
  ok(census.plan.protocol.result_spawned_requests_allowed === false, 'recursive requests authorized');
  ok(census.plan.protocol.maximum_attempts_per_route === 2, 'route attempt ceiling changed');
  ok(census.plan.protocol.denominator_widening === false, 'denominator widening authorized');

  ok(census.routeResults?.schema_version === 'ssc-rd05-wave02-successor-route-results@1', 'route-results schema changed');
  ok(census.routeResults.research_head === RESEARCH_HEAD && census.routeResults.route_count === 49, 'route-results identity changed');
  ok(census.routeResults.routes.length === 49, 'route-results denominator changed');
  unique(census.routeResults.routes.map((row) => row.route_id), 'duplicate result route id');
  same([...census.routeResults.routes.map((row) => row.route_id)].sort(), [...census.plan.routes.map((row) => row.route_id)].sort(), 'route plan/result identity mismatch');
  for (const row of census.routeResults.routes) {
    ok(row.transport_terminal === true, `${row.route_id}: transport not terminal`);
    ok(row.attempts.length >= 1 && row.attempts.length <= 2, `${row.route_id}: attempt ceiling violated`);
    ok(row.result_spawned_requests === 0, `${row.route_id}: result-spawned request observed`);
    ok(row.external_contacts === 0 && row.external_reviews === 0, `${row.route_id}: external dependency introduced`);
  }
  const statusCounts = countBy(census.routeResults.routes.map((row) => row.terminal_transport_state));
  same(statusCounts, {http_success: 45, http_terminal_non_success: 4}, 'terminal transport state counts changed');
  ok(census.routeResults.routes.reduce((sum, row) => sum + row.attempts.length, 0) === 49, 'route attempt count changed');

  ok(census.candidateHits?.schema_version === 'ssc-rd05-wave02-successor-candidate-hits@1', 'candidate-hit schema changed');
  ok(census.candidateHits.candidate_rows === 77 && census.candidateHits.routes_with_candidate_rows === 34, 'candidate-hit counts changed');
  ok(census.candidateHits.authority.candidate_hit_is_admitted_work_product === false, 'candidate hit promoted');
  ok(census.candidateHits.authority.keyword_match_is_completed_recommendation === false, 'keyword promoted');
  ok(census.candidateHits.authority.link_is_denominator_admission === false, 'link promoted');

  ok(census.routeTextIndex?.schema_version === 'ssc-rd05-wave02-successor-route-text-index@1', 'route-text schema changed');
  ok(census.routeTextIndex.routes.length === 49, 'route-text denominator changed');
  unique(census.routeTextIndex.routes.map((row) => row.route_id), 'duplicate route-text id');

  ok(census.transportLedger?.schema_version === 'ssc-rd05-wave02-successor-terminal-ledger@1', 'transport-ledger schema changed');
  ok(census.transportLedger.chains.length === 4, 'transport-ledger chain denominator changed');
  same(census.transportLedger.chains.map((row) => row.object_id), OPEN_CHAIN_IDS, 'transport-ledger chain ids changed');
  ok(census.transportLedger.transport_census_complete === true, 'transport census incomplete');
  ok(census.transportLedger.substantive_adjudication_complete === false && census.transportLedger.class_closed === false, 'acquisition census overclaimed closure');
  ok(census.transportLedger.chains.every((row) => row.transport_protocol_terminal === true && row.substantive_chain_terminal === false), 'transport/substance boundary changed');

  ok(census.summary?.schema_version === 'ssc-rd05-wave02-successor-census-summary@1', 'census summary schema changed');
  ok(census.summary.fixed_routes === 49 && census.summary.route_attempts === 49, 'summary route counts changed');
  same(census.summary.terminal_transport_states, {http_terminal_non_success: 4, http_success: 45}, 'summary transport states changed');
  ok(census.summary.transport_census_complete === true && census.summary.substantive_adjudication_complete === false, 'summary transport/substance boundary changed');
  ok(census.summary.result_spawned_requests === 0 && census.summary.denominator_widened === false, 'summary recursion or denominator changed');
  for (const key of ['completed_recommendations','agency_responses','adopted_outputs','rejected_outputs','implementation_or_outcomes','external_contacts','external_reviews']) ok(census.summary[key] === 0, `${key} changed`);
  ok(census.summary.outside_human_dependency === false, 'summary outside-human dependency changed');

  ok(census.manifest?.schema_version === 'ssc-rd05-wave02-successor-census-manifest@1', 'census manifest schema changed');
  ok(census.manifest.entry_count === 398 && census.manifest.entries.length === 398, 'census manifest denominator changed');
  unique(census.manifest.entries.map((row) => row.path), 'duplicate census manifest path');
  ok(census.manifest.combined_sha256 === CENSUS_MANIFEST_SHA256, 'census manifest digest changed');

  return { byId, statusCounts };
}

export function validateRawManifestFiles(root, manifest) {
  for (const entry of manifest.entries) {
    ok(!path.isAbsolute(entry.path) && !entry.path.split('/').includes('..'), `${entry.path}: unsafe manifest path`);
    const bytes = readBytes(root, `${CENSUS_ROOT}/${entry.path}`);
    ok(bytes.length === entry.bytes, `${entry.path}: byte count changed`);
    ok(sha256(bytes) === entry.sha256, `${entry.path}: digest changed`);
  }
  const combined = sha256(Buffer.from(manifest.entries.map((row) => `${row.sha256}  ${row.path}`).join('\n'), 'utf8'));
  ok(combined === manifest.combined_sha256, 'census manifest recomputation changed');
  return combined;
}

export function validateInputs(inputs, root = ROOT) {
  const facts = validateInputData(inputs);
  if (process.env.RD05_ALLOW_FIXTURE_INPUT !== '1') ok(sha256(inputs.classificationBytes) === CLASSIFICATION_SHA256, 'classification byte custody changed');
  validateRawManifestFiles(root, inputs.census.manifest);
  return facts;
}

function buildExclusionLedger(root, inputs) {
  const mediaAces = bodyJson(root, inputs, 'WP-MEDIA-001');
  const mediaSubcommittee = bodyJson(root, inputs, 'WP-MEDIA-002');
  const mediaRecommendation = bodyJson(root, inputs, 'WP-MEDIA-003');
  const mediaOctober = bodyJson(root, inputs, 'WP-MEDIA-004');
  const searchSubcommitteeReport = bodyJson(root, inputs, 'WP-SEARCH-003');
  const searchFinalize = bodyJson(root, inputs, 'WP-SEARCH-007');
  const searchRecommendations = bodyJson(root, inputs, 'WP-SEARCH-008');
  const searchMinutes = bodyJson(root, inputs, 'WP-SEARCH-009');
  const searchMajorActions = bodyJson(root, inputs, 'WP-SEARCH-010');
  const frExact = bodyJson(root, inputs, 'FR-SEARCH-001');
  const frAgency = bodyJson(root, inputs, 'FR-SEARCH-002');

  const title = (row) => String(row?.title?.rendered ?? row?.title ?? '');
  const acesMediaRows = mediaAces.map((row) => {
    let classification = 'search_noise_unrelated_to_aces_output';
    if ([8306, 8305, 8303].includes(row.id)) classification = 'agency_briefing_deck_not_committee_recommendation';
    else if (row.id === 6820) classification = 'committee_charter_not_recommendation';
    else if ([8422,8421,8420,8419,8417,8416,8415,8414,8412].includes(row.id)) classification = 'branding_asset_not_semantic_output';
    return { id: row.id, date: row.date, title: title(row), mime_type: row.mime_type, source_url: row.source_url, classification };
  });
  const relevantFr = [...new Map([...relevantFederalRegisterRows(frExact.results), ...relevantFederalRegisterRows(frAgency.results)].map((row) => [row.document_number, row])).values()]
    .sort((a, b) => String(a.publication_date).localeCompare(String(b.publication_date)))
    .map((row) => ({ document_number: row.document_number, publication_date: row.publication_date, type: row.type, title: row.title, html_url: row.html_url, classification: 'formation_meeting_cancellation_or_termination_notice_not_recommendation_disposition' }));

  return {
    schema_version: 'ssc-rd05-wave02-candidate-exclusion-ledger@1',
    wave_id: 'SSC-RD-W02',
    class_id: 'RD-05-C03',
    issue: 790,
    source_census: { research_head: RESEARCH_HEAD, artifact_id: CENSUS_ARTIFACT_ID, manifest_combined_sha256: CENSUS_MANIFEST_SHA256 },
    wordpress_media: {
      aces_search: { route_id: 'WP-MEDIA-001', result_count: mediaAces.length, rows: acesMediaRows, completed_committee_outputs: 0 },
      subcommittee_search: { route_id: 'WP-MEDIA-002', result_count: mediaSubcommittee.length, completed_committee_outputs: 0 },
      recommendation_search: {
        route_id: 'WP-MEDIA-003', result_count: mediaRecommendation.length,
        rows: mediaRecommendation.map((row) => ({ id: row.id, date: row.date, title: title(row), source_url: row.source_url, classification: 'not_aces_bound_by_title_slug_source_or_workstream' })),
        aces_bound_results: mediaRecommendation.filter((row) => /aces/i.test(`${title(row)} ${row.slug || ''} ${row.source_url || ''}`)).length,
        completed_committee_outputs: 0,
      },
      october_3_search: {
        route_id: 'WP-MEDIA-004', result_count: mediaOctober.length,
        rows: mediaOctober.map((row) => ({ id: row.id, date: row.date, title: title(row), source_url: row.source_url, classification: 'october_2023_newsletter_not_october_3_2024_aces_meeting_record' })),
        completed_committee_outputs: 0,
      },
    },
    wordpress_full_text: {
      subcommittee_report: { route_id: 'WP-SEARCH-003', result_count: searchSubcommitteeReport.length, aces_bound_results: acesBoundSearchRows(searchSubcommitteeReport).map((row) => ({id: row.id, title: row.title, url: row.url, classification: 'canceled_meeting_agenda_not_report'})), completed_reports: 0 },
      finalize_recommendations: { route_id: 'WP-SEARCH-007', result_count: searchFinalize.length, aces_bound_results: acesBoundSearchRows(searchFinalize).map((row) => ({id: row.id, title: row.title, url: row.url, classification: 'agenda_phrase_not_completed_recommendation'})), completed_recommendations: 0 },
      recommendations: { route_id: 'WP-SEARCH-008', result_count: searchRecommendations.length, aces_bound_results: acesBoundSearchRows(searchRecommendations).map((row) => ({id: row.id, title: row.title, url: row.url, classification: 'existing_aces_context_page_not_independent_completed_output'})), completed_recommendations: 0 },
      minutes: { route_id: 'WP-SEARCH-009', result_count: searchMinutes.length, aces_bound_results: acesBoundSearchRows(searchMinutes).length, completed_minutes: 0 },
      major_actions: { route_id: 'WP-SEARCH-010', result_count: searchMajorActions.length, aces_bound_results: acesBoundSearchRows(searchMajorActions).length, completed_major_action_ledgers: 0 },
    },
    federal_register: { relevant_notice_count: relevantFr.length, rows: relevantFr, completed_recommendations: 0, agency_responses: 0, dispositions: 0, implementation_or_outcomes: 0 },
    archive_and_transfer: {
      accessible_context_routes: ['NARA-FACA-001','NARA-FACA-002','NARA-FACA-003','GSA-FACA-001'],
      typed_non_success_routes: [
        {route_id: 'DOC-FACA-001', http_status: 403, state: 'source_restricted'},
        {route_id: 'GSA-FACA-002', http_status: 401, state: 'source_restricted'},
        {route_id: 'SC-MAP-004', http_status: 404, state: 'source_unavailable_after_fixed_protocol'},
        {route_id: 'SC-MAP-005', http_status: 404, state: 'source_unavailable_after_fixed_protocol'},
      ],
      aces_specific_transfer_receipt_recovered: false,
      record_destruction_inferred: false,
      suppression_inferred: false,
    },
    authority: {
      keyword_match_is_completed_output: false,
      agenda_item_is_completed_recommendation: false,
      agency_briefing_is_committee_recommendation: false,
      generic_records_rule_is_aces_transfer_receipt: false,
      missing_public_output_is_no_private_influence: false,
      source_restriction_is_record_absence: false,
    },
  };
}

function chainTitle(objectId) {
  return ({
    'RD05-OBJ-023': 'Commercial Space Mission Authorization subcommittee work-product chain',
    'RD05-OBJ-024': 'Private Remote Sensing Licensing subcommittee work-product chain',
    'RD05-OBJ-025': 'Space Sustainability subcommittee work-product chain',
    'RD05-OBJ-029': 'October 3 meeting minutes, major-actions, and recommendation-output chain',
  })[objectId];
}

function deriveChainLedger(inputs, exclusionLedger) {
  const results = routeMap(inputs);
  const sourceRows = new Map(inputs.census.transportLedger.chains.map((row) => [row.object_id, row]));
  return {
    schema_version: 'ssc-rd05-wave02-chain-terminal-ledger@1',
    wave_id: 'SSC-RD-W02', class_id: 'RD-05-C03', issue: 790,
    source_census: { research_head: RESEARCH_HEAD, artifact_id: CENSUS_ARTIFACT_ID, manifest_combined_sha256: CENSUS_MANIFEST_SHA256 },
    chains: OPEN_CHAIN_IDS.map((objectId) => {
      const source = sourceRows.get(objectId);
      const states = countBy(source.fixed_route_ids.map((routeId) => results.get(routeId).terminal_transport_state));
      const subcommittee = objectId !== 'RD05-OBJ-029';
      return {
        object_id: objectId,
        title: chainTitle(objectId),
        fixed_route_ids: source.fixed_route_ids,
        fixed_routes: source.fixed_routes,
        terminal_transport_routes: source.terminal_transport_routes,
        terminal_transport_states: states,
        transport_protocol_terminal: true,
        exact_scope_or_meeting_page_observed: true,
        planned_or_agenda_activity_observed: true,
        agency_briefing_decks_observed: objectId === 'RD05-OBJ-029' ? 3 : 0,
        wordpress_subcommittee_media_results: subcommittee ? exclusionLedger.wordpress_media.subcommittee_search.result_count : null,
        aces_bound_minutes_results: objectId === 'RD05-OBJ-029' ? exclusionLedger.wordpress_full_text.minutes.aces_bound_results : null,
        aces_bound_major_actions_results: objectId === 'RD05-OBJ-029' ? exclusionLedger.wordpress_full_text.major_actions.aces_bound_results : null,
        completed_recommendation_observed: false,
        agency_response_observed: false,
        adoption_or_rejection_observed: false,
        implementation_or_outcome_observed: false,
        terminal_state: 'official_record_exhausted_no_completed_output_recovered',
        substantive_chain_terminal: true,
        closure_scope: 'bounded_public_official_record',
        limitations: ['no_private_advice_absence_inferred','no_informal_influence_absence_inferred','no_unpublished_action_absence_inferred','no_suppression_or_destruction_inferred'],
      };
    }),
    counts: { chains: 4, terminal_chains: 4, bounded_non_link_chains: 4, completed_recommendations: 0, agency_responses: 0, dispositions: 0, implementation_or_outcomes: 0 },
    substantive_adjudication_complete: true,
    class_effect: 'bounded_non_link_candidate',
  };
}

function terminalizeObject(row, chain) {
  const next = structuredClone(row);
  const commonNote = 'The fixed, source-derived public official-record protocol reached terminal transport across every declared route and recovered no completed recommendation or work product for this chain. This is a bounded public-record non-link, not proof that no private advice, informal influence, or unpublished action occurred.';
  next.fields.recommendation_state = {
    state: 'official_record_exhausted_no_completed_output_recovered',
    value: { status: 'official_record_exhausted_no_completed_output_recovered', completed_recommendation_observed: false, scope: 'bounded_public_official_record' },
    note: commonNote,
    terminal: true,
  };
  next.fields.agency_response_state = {
    state: 'terminal_no_completed_recommendation_recovered',
    value: { agency_response_observed: false, reason: 'no_completed_recommendation_object_recovered_after_fixed_protocol' },
    note: 'No response is inferred without a completed recommendation object and an exact response object.',
    terminal: true,
  };
  next.fields.adoption_or_rejection_state = {
    state: 'terminal_no_completed_recommendation_recovered',
    value: { adoption_observed: false, rejection_observed: false, reason: 'no_completed_recommendation_object_recovered_after_fixed_protocol' },
    note: 'Cancellation and termination are not adoption, rejection, suppression, or destruction.',
    terminal: true,
  };
  next.fields.implementation_and_outcome_state = {
    state: 'terminal_no_completed_recommendation_or_disposition_recovered',
    value: { implementation_observed: false, outcome_observed: false, reason: 'no_completed_recommendation_or_disposition_object_recovered_after_fixed_protocol' },
    note: 'Implementation and outcome claims require a completed recommendation, a disposition, and exact implementation or outcome evidence.',
    terminal: true,
  };
  next.fields.terminal_record_state = {
    state: 'bounded_public_record_terminal_state',
    value: { status: 'bounded_non_link_public_output_chain_terminal', semantic_classification_complete: true, substantive_chain_terminal: true },
    note: 'The frozen object and its declared successor chain are terminal for the bounded public official-record protocol; the state does not deny private or unpublished activity.',
    terminal: true,
  };
  next.successor_actions = next.successor_actions.filter((action) => !action.action_type.startsWith('acquire_'));
  next.terminal_adjudication = { source_manifest_sha256: CENSUS_MANIFEST_SHA256, fixed_route_ids: chain.fixed_route_ids, terminal_state: chain.terminal_state, scope: chain.closure_scope };
  return next;
}

function deriveTerminalClassification(inputs, chainLedger) {
  const byChain = new Map(chainLedger.chains.map((row) => [row.object_id, row]));
  const objects = inputs.classification.objects.map((row) => byChain.has(row.object_id) ? terminalizeObject(row, byChain.get(row.object_id)) : structuredClone(row));
  const counts = structuredClone(inputs.classification.counts);
  counts.open_recommendation_disposition_chains = 0;
  counts.successor_action_rows = objects.reduce((sum, row) => sum + row.successor_actions.length, 0);
  counts.bounded_non_link_chains = 4;
  counts.terminal_substantive_objects = objects.filter((row) => [
    row.fields.recommendation_state.terminal,
    row.fields.agency_response_state.terminal,
    row.fields.adoption_or_rejection_state.terminal,
    row.fields.implementation_and_outcome_state.terminal,
  ].every((value) => value === true)).length;
  counts.class_closed = true;
  return {
    ...structuredClone(inputs.classification),
    schema_version: 'ssc-rd05-wave02-terminal-object-classification@1',
    status: 'all_frozen_objects_terminal_four_chains_bounded_non_link_class_closed',
    source_classification: { path: CLASSIFICATION_PATH, sha256: CLASSIFICATION_SHA256 },
    terminal_overlay: { source_manifest_sha256: CENSUS_MANIFEST_SHA256, object_ids: OPEN_CHAIN_IDS, terminal_state: 'official_record_exhausted_no_completed_output_recovered' },
    counts,
    objects,
  };
}

function deriveClassReceipt(inputs, terminalClassification, chainLedger, exclusionLedger) {
  return {
    schema_version: 'ssc-rd05-wave02-class-receipt@1',
    wave_id: 'SSC-RD-W02', lane_id: 'RD-05', class_id: 'RD-05-C03', issue: 790, source_pr: 805,
    class_label: CLASS_LABEL,
    terminal_state: 'bounded_non_link',
    class_closed: true,
    closure_basis: [
      'the immutable 58-object official ACES denominator was frozen before outcome adjudication',
      'all 58 frozen objects are semantically classified and the sole same-object access interstitial was recovered through an exact official API representation',
      'the four residual recommendation and disposition chains were assigned 49 fixed official routes before execution and every route reached a terminal transport state',
      'exact WordPress media, full-text, sitemap, Federal Register, Commerce, NARA, and GSA routes recovered no ACES subcommittee report, committee minutes, completed recommendation, agency response, disposition, implementation, or outcome object',
      'agenda language, agency briefing decks, unrelated recommendation media, cancellation, termination, generic recordkeeping rules, and source restrictions were excluded from substantive promotion',
      'the remaining result is a bounded public-record non-link and does not deny private advice, informal influence, or unpublished action',
    ],
    counts: {
      frozen_objects: 58,
      terminal_objects: terminalClassification.counts.terminal_substantive_objects,
      bounded_non_link_chains: chainLedger.counts.bounded_non_link_chains,
      open_chains: terminalClassification.counts.open_recommendation_disposition_chains,
      fixed_routes: inputs.census.plan.routes.length,
      route_attempts: inputs.census.routeResults.routes.reduce((sum, row) => sum + row.attempts.length, 0),
      http_success_routes: inputs.census.routeResults.routes.filter((row) => row.terminal_transport_state === 'http_success').length,
      terminal_non_success_routes: inputs.census.routeResults.routes.filter((row) => row.terminal_transport_state === 'http_terminal_non_success').length,
      raw_manifest_entries: inputs.census.manifest.entry_count,
      completed_recommendations: 0,
      agency_responses: 0,
      adopted_or_rejected_outputs: 0,
      implementation_or_outcomes: 0,
    },
    source_custody: {
      base_classification_path: CLASSIFICATION_PATH,
      base_classification_sha256: CLASSIFICATION_SHA256,
      successor_census_root: CENSUS_ROOT,
      workflow_run: 30806151404,
      job_id: 91661876762,
      artifact_id: CENSUS_ARTIFACT_ID,
      artifact_zip_sha256: CENSUS_ARTIFACT_SHA256,
      manifest_combined_sha256: CENSUS_MANIFEST_SHA256,
    },
    archive_limit: {
      aces_specific_transfer_receipt_recovered: exclusionLedger.archive_and_transfer.aces_specific_transfer_receipt_recovered,
      restricted_routes: exclusionLedger.archive_and_transfer.typed_non_success_routes.filter((row) => row.state === 'source_restricted').map((row) => row.route_id),
      unavailable_routes: exclusionLedger.archive_and_transfer.typed_non_success_routes.filter((row) => row.state === 'source_unavailable_after_fixed_protocol').map((row) => row.route_id),
      record_absence_inferred: false,
      suppression_inferred: false,
      destruction_inferred: false,
    },
    authority: {
      outside_human_dependency: false,
      external_contacts: 0,
      external_reviews: 0,
      denominator_widened: false,
      reviewed_disposition_changed: false,
      complete_compact_finding: false,
      racial_order_finding: false,
      suppression_finding: false,
      record_destruction_finding: false,
      no_private_influence_inferred: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
    },
  };
}

function productManifest(entries) {
  const rows = entries.map(([name, value]) => {
    const bytes = Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    return { path: name, bytes: bytes.length, sha256: sha256(bytes) };
  });
  return {
    schema_version: 'ssc-rd05-wave02-terminal-product-manifest@1',
    entries: rows,
    entry_count: rows.length,
    combined_sha256: sha256(Buffer.from(rows.map((row) => `${row.sha256}  ${row.path}`).join('\n'), 'utf8')),
  };
}

export function deriveProduct(root = ROOT, { write = true } = {}) {
  const inputs = readInputs(root);
  validateInputs(inputs, root);
  const exclusionLedger = buildExclusionLedger(root, inputs);
  const chainLedger = deriveChainLedger(inputs, exclusionLedger);
  const terminalClassification = deriveTerminalClassification(inputs, chainLedger);
  const classReceipt = deriveClassReceipt(inputs, terminalClassification, chainLedger, exclusionLedger);
  const summary = {
    schema_version: 'ssc-rd05-wave02-terminal-summary@1',
    wave_id: 'SSC-RD-W02', lane_id: 'RD-05', class_id: 'RD-05-C03', issue: 790,
    terminal_state: classReceipt.terminal_state,
    class_closed: classReceipt.class_closed,
    counts: classReceipt.counts,
    result: 'fifty_eight_objects_terminal_four_public_output_chains_bounded_non_link',
    limitations: ['no_private_advice_absence_inferred','no_informal_influence_absence_inferred','no_unpublished_action_absence_inferred','no_suppression_or_destruction_inferred','no_affected_party_counterpower_finding'],
    authority: classReceipt.authority,
  };
  const manifest = productManifest([
    ['candidate-exclusion-ledger.json', exclusionLedger],
    ['chain-terminal-ledger.json', chainLedger],
    ['terminal-classification.json', terminalClassification],
    ['class-receipt.json', classReceipt],
    ['summary.json', summary],
  ]);
  const closureReference = {
    schema_version: 'ssc-residual-denominator-wave02-class-closure-reference@1',
    wave_issue: 785, child_issue: 790, source_pr: 805,
    lane_id: 'RD-05', class_id: 'RD-05-C03', exact_label: CLASS_LABEL,
    terminal_state: classReceipt.terminal_state, class_closed: true,
    product: { root: PRODUCT_ROOT, manifest_path: `${PRODUCT_ROOT}/manifest.json`, manifest_combined_sha256: manifest.combined_sha256, class_receipt_path: `${PRODUCT_ROOT}/class-receipt.json` },
    source_custody: classReceipt.source_custody,
    authority: classReceipt.authority,
    residual_atlas_effect_if_promoted_after_rd04: { canonical_classes: 42, open_before: 41, closed_before: 1, open_after: 40, closed_after: 2 },
  };
  const derived = { exclusionLedger, chainLedger, terminalClassification, classReceipt, summary, manifest, closureReference };
  validateDerived(inputs, derived);
  if (write) {
    writeJson(root, `${PRODUCT_ROOT}/candidate-exclusion-ledger.json`, exclusionLedger);
    writeJson(root, `${PRODUCT_ROOT}/chain-terminal-ledger.json`, chainLedger);
    writeJson(root, `${PRODUCT_ROOT}/terminal-classification.json`, terminalClassification);
    writeJson(root, `${PRODUCT_ROOT}/class-receipt.json`, classReceipt);
    writeJson(root, `${PRODUCT_ROOT}/summary.json`, summary);
    writeJson(root, `${PRODUCT_ROOT}/manifest.json`, manifest);
    writeJson(root, CLOSURE_REFERENCE_PATH, closureReference);
  }
  return { inputs, derived };
}

export function validateDerived(inputs, derived) {
  const { exclusionLedger, chainLedger, terminalClassification, classReceipt, summary, manifest, closureReference } = derived;
  ok(exclusionLedger.schema_version === 'ssc-rd05-wave02-candidate-exclusion-ledger@1', 'exclusion ledger schema changed');
  ok(exclusionLedger.wordpress_media.aces_search.result_count === 16, 'ACES media result count changed');
  ok(exclusionLedger.wordpress_media.aces_search.rows.filter((row) => row.classification === 'agency_briefing_deck_not_committee_recommendation').length === 3, 'three agency briefing decks required');
  ok(exclusionLedger.wordpress_media.subcommittee_search.result_count === 0, 'subcommittee media search no longer empty');
  ok(exclusionLedger.wordpress_media.recommendation_search.result_count === 8 && exclusionLedger.wordpress_media.recommendation_search.aces_bound_results === 0, 'recommendation media exclusion changed');
  ok(exclusionLedger.wordpress_media.october_3_search.result_count === 2, 'October media search changed');
  ok(exclusionLedger.wordpress_full_text.subcommittee_report.completed_reports === 0, 'subcommittee report promoted');
  ok(exclusionLedger.wordpress_full_text.minutes.aces_bound_results === 0 && exclusionLedger.wordpress_full_text.minutes.completed_minutes === 0, 'minutes promoted');
  ok(exclusionLedger.wordpress_full_text.major_actions.aces_bound_results === 0 && exclusionLedger.wordpress_full_text.major_actions.completed_major_action_ledgers === 0, 'major actions promoted');
  ok(exclusionLedger.federal_register.relevant_notice_count === 6, 'Federal Register relevant notice count changed');
  ok(exclusionLedger.archive_and_transfer.aces_specific_transfer_receipt_recovered === false, 'ACES transfer receipt manufactured');
  ok(exclusionLedger.archive_and_transfer.record_destruction_inferred === false && exclusionLedger.archive_and_transfer.suppression_inferred === false, 'archive gap promoted');

  ok(chainLedger.schema_version === 'ssc-rd05-wave02-chain-terminal-ledger@1', 'chain ledger schema changed');
  same(chainLedger.chains.map((row) => row.object_id), OPEN_CHAIN_IDS, 'terminal chain ids changed');
  ok(chainLedger.chains.every((row) => row.transport_protocol_terminal && row.substantive_chain_terminal), 'chain terminality incomplete');
  ok(chainLedger.chains.every((row) => row.terminal_state === 'official_record_exhausted_no_completed_output_recovered'), 'terminal state changed');
  ok(chainLedger.chains.every((row) => !row.completed_recommendation_observed && !row.agency_response_observed && !row.adoption_or_rejection_observed && !row.implementation_or_outcome_observed), 'substantive zero changed');
  ok(chainLedger.counts.chains === 4 && chainLedger.counts.terminal_chains === 4 && chainLedger.counts.bounded_non_link_chains === 4, 'chain counts changed');

  ok(terminalClassification.schema_version === 'ssc-rd05-wave02-terminal-object-classification@1', 'terminal classification schema changed');
  ok(terminalClassification.objects.length === 58, 'terminal object denominator changed');
  unique(terminalClassification.objects.map((row) => row.object_id), 'duplicate terminal object id');
  same(terminalClassification.objects.map((row) => row.object_id), inputs.classification.objects.map((row) => row.object_id), 'terminal object identity/order changed');
  ok(terminalClassification.counts.open_recommendation_disposition_chains === 0, 'open chain remains');
  ok(terminalClassification.counts.bounded_non_link_chains === 4, 'bounded non-link count changed');
  ok(terminalClassification.counts.terminal_substantive_objects === 58, 'all 58 substantive objects must be terminal');
  ok(terminalClassification.counts.class_closed === true, 'terminal classification not closed');
  ok(terminalClassification.objects.every((row) => [row.fields.recommendation_state.terminal,row.fields.agency_response_state.terminal,row.fields.adoption_or_rejection_state.terminal,row.fields.implementation_and_outcome_state.terminal].every((value) => value === true)), 'nonterminal substantive field remains');
  for (const objectId of OPEN_CHAIN_IDS) {
    const row = terminalClassification.objects.find((item) => item.object_id === objectId);
    ok(row.fields.recommendation_state.state === 'official_record_exhausted_no_completed_output_recovered', `${objectId}: terminal recommendation state changed`);
    ok(row.successor_actions.every((action) => !action.action_type.startsWith('acquire_')), `${objectId}: acquisition successor remains`);
  }

  ok(classReceipt.schema_version === 'ssc-rd05-wave02-class-receipt@1', 'class receipt schema changed');
  ok(classReceipt.terminal_state === 'bounded_non_link' && classReceipt.class_closed === true, 'class receipt closure changed');
  ok(classReceipt.counts.frozen_objects === 58 && classReceipt.counts.terminal_objects === 58, 'class object accounting changed');
  ok(classReceipt.counts.bounded_non_link_chains === 4 && classReceipt.counts.open_chains === 0, 'class chain accounting changed');
  ok(classReceipt.counts.fixed_routes === 49 && classReceipt.counts.route_attempts === 49, 'class route accounting changed');
  ok(classReceipt.counts.http_success_routes === 45 && classReceipt.counts.terminal_non_success_routes === 4, 'class transport accounting changed');
  ok(classReceipt.counts.raw_manifest_entries === 398, 'class raw manifest count changed');
  for (const key of ['completed_recommendations','agency_responses','adopted_or_rejected_outputs','implementation_or_outcomes']) ok(classReceipt.counts[key] === 0, `${key} changed`);
  ok(classReceipt.authority.outside_human_dependency === false, 'outside-human dependency changed');
  ok(classReceipt.authority.external_contacts === 0 && classReceipt.authority.external_reviews === 0, 'external participation changed');
  ok(classReceipt.authority.denominator_widened === false && classReceipt.authority.reviewed_disposition_changed === false, 'authority widened');
  ok(classReceipt.authority.complete_compact_finding === false && classReceipt.authority.racial_order_finding === false, 'compact finding created');
  ok(classReceipt.authority.suppression_finding === false && classReceipt.authority.record_destruction_finding === false, 'suppression/destruction finding created');
  ok(classReceipt.authority.no_private_influence_inferred === false, 'private-influence absence inferred');
  ok(classReceipt.authority.publication_effect === 'none' && classReceipt.authority.adoption_effect === 'none' && classReceipt.authority.graph_effect === 'none', 'effect authority changed');

  ok(summary.terminal_state === classReceipt.terminal_state && summary.class_closed === true, 'summary closure changed');
  same(summary.counts, classReceipt.counts, 'summary counts changed');
  same(summary.authority, classReceipt.authority, 'summary authority changed');

  ok(manifest.schema_version === 'ssc-rd05-wave02-terminal-product-manifest@1', 'product manifest schema changed');
  ok(manifest.entry_count === 5 && manifest.entries.length === 5, 'product manifest denominator changed');
  same(manifest.entries.map((row) => row.path), ['candidate-exclusion-ledger.json','chain-terminal-ledger.json','terminal-classification.json','class-receipt.json','summary.json'], 'product manifest paths changed');
  ok(/^[0-9a-f]{64}$/.test(manifest.combined_sha256), 'product manifest digest invalid');

  ok(closureReference.schema_version === 'ssc-residual-denominator-wave02-class-closure-reference@1', 'closure reference schema changed');
  ok(closureReference.wave_issue === 785 && closureReference.child_issue === 790 && closureReference.source_pr === 805, 'closure reference custody changed');
  ok(closureReference.class_id === 'RD-05-C03' && closureReference.terminal_state === 'bounded_non_link' && closureReference.class_closed === true, 'closure reference state changed');
  ok(closureReference.product.manifest_combined_sha256 === manifest.combined_sha256, 'closure manifest binding changed');
  same(closureReference.authority, classReceipt.authority, 'closure authority changed');
  same(closureReference.residual_atlas_effect_if_promoted_after_rd04, {canonical_classes:42,open_before:41,closed_before:1,open_after:40,closed_after:2}, 'atlas effect changed');
  return derived;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { derived } = deriveProduct(ROOT, { write: true });
  console.log(`build-rd05-terminal-closure: ${derived.classReceipt.counts.terminal_objects}/58 terminal; 4 bounded non-links; class closed`);
}
