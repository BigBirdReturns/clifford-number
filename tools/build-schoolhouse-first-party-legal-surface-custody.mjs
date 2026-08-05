import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

const DATA_DIR = path.resolve('data/intake/bvvc-defense-capital');
const ARTIFACT_RUN_ID = 30990750394;
const ARTIFACT_ID = 8923990465;
const ARTIFACT_DIGEST = 'sha256:096bad980f5323fd04c1d75fcf3f2e7c954d13fdbb0ae47f8f06c8a160fbae8e';
const ACQUISITION_HEAD = '71b13676c36c44d5e59d543c240f923304b5a4fb';
const NEW_SOURCE_INVENTORY_ROWS = 46;
const EXPECTED_SOURCE_INVENTORY_ROWS = 336;
const EXPECTED_COVERAGE_ROWS = 23;
const EXPECTED_GAP_ROWS = 16;

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8')
  .split(/\r?\n/)
  .filter(Boolean)
  .map((line, index) => {
    try {
      return JSON.parse(line);
    } catch (error) {
      throw new Error(`${file}:${index + 1}: ${error.message}`);
    }
  });
const writeJson = (file, value) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n');
};
const writeJsonl = (file, rows) => {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : ''));
};
const sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const unique = values => new Set(values).size === values.length;
const countBy = (rows, keyFn) => Object.fromEntries(
  [...rows.reduce((map, row) => map.set(keyFn(row), (map.get(keyFn(row)) || 0) + 1), new Map())]
    .sort(([a], [b]) => String(a).localeCompare(String(b)))
);
const replaceOnce = (text, oldValue, newValue, label) => {
  const first = text.indexOf(oldValue);
  const last = text.lastIndexOf(oldValue);
  assert(first >= 0 && first === last, `${label} replacement count drift`);
  return text.slice(0, first) + newValue + text.slice(first + oldValue.length);
};
const fileReceipt = filename => ({ bytes: fs.statSync(path.join(DATA_DIR, filename)).size, sha256: sha256(path.join(DATA_DIR, filename)) });

function adjudicateCandidate(row) {
  const value = String(row.candidate_value || '');
  let adjudicationState = 'first_party_phrase_candidate_not_registry_grade';
  let evidenceTier = 'first_party_self_description';
  let legalNameEffect = 'none';
  let taxStatusEffect = 'candidate_self_claim_only';
  if (row.candidate_class === 'footer_copyright_entity_phrase') {
    adjudicationState = 'footer_brand_string_not_legal_entity_name';
    evidenceTier = 'first_party_footer_brand_string';
    taxStatusEffect = 'none';
  } else if (value.includes('Global SOF Foundation')) {
    adjudicationState = 'context_pattern_collision_not_schoolhouse_legal_status';
    evidenceTier = 'first_party_visible_context_collision';
    taxStatusEffect = 'none';
  } else if (/501\s*\(?\s*c/i.test(value) || /non[-\s]?profit/i.test(value)) {
    adjudicationState = 'first_party_501c3_or_nonprofit_claim_not_registry_grade';
    evidenceTier = 'first_party_tax_status_self_description';
  }
  return {
    ...row,
    adjudication_state: adjudicationState,
    evidence_tier: evidenceTier,
    legal_name_effect: legalNameEffect,
    tax_status_effect: taxStatusEffect,
    admitted_legal_name: null,
    admitted_ein: null,
    public_schoolhouse_identity_admitted: false,
  };
}

function build(inputDir) {
  const summary = readJson(path.join(inputDir, 'summary.json'));
  const routePolicy = readJson(path.join(inputDir, 'route-policy.json'));
  const artifactManifest = readJson(path.join(inputDir, 'artifact-manifest.json'));
  const roots = readJsonl(path.join(inputDir, 'root-route-results.jsonl'));
  const followed = readJsonl(path.join(inputDir, 'followed-route-results.jsonl'));
  const discovered = readJsonl(path.join(inputDir, 'discovered-links.jsonl'));
  const html = readJsonl(path.join(inputDir, 'html-surfaces.jsonl'));
  const structured = readJsonl(path.join(inputDir, 'structured-data.jsonl'));
  const candidates = readJsonl(path.join(inputDir, 'legal-governance-candidates.jsonl'));
  const external = readJsonl(path.join(inputDir, 'external-link-inventory.jsonl'));
  const forms = readJsonl(path.join(inputDir, 'form-metadata.jsonl'));

  assert(summary.schema_version === 'schoolhouse-first-party-legal-surface-census@1', 'artifact schema drift');
  assert(summary.declared_root_routes === 5 && roots.length === 5, 'root denominator drift');
  assert(summary.followed_routes === 41 && followed.length === 41, 'followed denominator drift');
  assert(summary.terminal_route_rows === 46, 'terminal route denominator drift');
  assert(summary.discovered_link_rows === 555 && discovered.length === 555, 'discovered-link denominator drift');
  assert(summary.unique_discovered_links === 78, 'unique-link denominator drift');
  assert(summary.same_schoolhouse_host_link_rows === 444, 'same-host link denominator drift');
  assert(summary.html_surface_rows === 39 && html.length === 39, 'HTML denominator drift');
  assert(summary.structured_data_rows === 0 && structured.length === 0, 'structured-data denominator drift');
  assert(summary.legal_governance_candidate_rows === 78 && candidates.length === 78, 'candidate denominator drift');
  assert(summary.external_link_rows === 111 && external.length === 111, 'external-link denominator drift');
  assert(summary.unique_external_hosts === 31, 'external-host denominator drift');
  assert(summary.form_rows === 8 && forms.length === 8, 'form denominator drift');
  assert(summary.legal_term_total_hits === 123 && summary.subject_term_total_hits === 77, 'term-count denominator drift');
  assert(summary.search_submissions === 0 && summary.form_submissions === 0 && summary.application_submissions === 0, 'submission boundary drift');
  assert(summary.source_rows_acquired === 0 && summary.identity_admitted === false && summary.graph_effect === 'none', 'authority boundary drift');
  assert(routePolicy.maximum_total_routes === 120 && routePolicy.maximum_depth === 2, 'route-policy bound drift');
  assert(routePolicy.query_string_routes_followed === 0 && routePolicy.external_links_fetched === 0, 'route-policy fetch boundary drift');
  assert(artifactManifest.terminal_route_rows === 46 && artifactManifest.legal_governance_candidate_rows === 78, 'artifact-manifest denominator drift');

  const routeRows = [
    ...roots.map(row => ({ ...row, route_class: 'fixed_root' })),
    ...followed.map(row => ({ ...row, route_class: 'query_free_same_host_follow' })),
  ];
  assert(routeRows.length === 46 && unique(routeRows.map(row => row.route_id)) && unique(routeRows.map(row => row.receipt_id)), 'route IDs or receipts drift');
  assert(routeRows.every(row => row.status === 200 && ['accessible_html', 'accessible_xml', 'accessible_text'].includes(row.state)), 'route terminal-state drift');
  assert(routeRows.every(row => row.request_method === 'GET' && row.request_attempts === 1 && row.query_submitted === false && row.form_submitted === false), 'route request boundary drift');
  assert(routeRows.every(row => row.raw_source_retained === false && row.visible_text_retained === false && row.hidden_form_values_retained === false), 'route privacy drift');

  const requestedUrls = new Set(routeRows.map(row => row.requested_url));
  const eligibleUnique = new Set(discovered.filter(row => row.eligible_follow).map(row => row.href_without_query));
  const unfollowedEligible = [...eligibleUnique].filter(url => !requestedUrls.has(url));
  assert(eligibleUnique.size === 43 && unfollowedEligible.length === 0, 'same-host eligible-link closure drift');
  assert(discovered.every(row => row.href === row.href_without_query && row.query_value_retained === false), 'query-value retention drift');

  const htmlByRoute = new Map(html.map(row => [row.route_id, row]));
  const sourceInventory = routeRows.map(row => {
    const sourceState = row.state === 'accessible_html'
      ? 'captured_first_party_html_surface'
      : row.state === 'accessible_xml'
        ? 'captured_first_party_xml_surface'
        : 'captured_first_party_text_surface';
    const title = htmlByRoute.get(row.route_id)?.title || null;
    return {
      receipt_id: row.receipt_id,
      locator_url: row.requested_url,
      evidence_class: 'primary_public_first_party_route_custody',
      source_state: sourceState,
      retrieved_at: '2026-08-05',
      content_sha256: row.complete_body_hash_claimed ? row.captured_sha256 : null,
      note: `${row.route_class} ${row.state}${title ? `; title ${title}` : ''}; no search, form, account, payment, upload, or contact submission.`,
      graph_effect: 'none',
      promotes_to: 'candidate_only',
    };
  });
  assert(sourceInventory.length === NEW_SOURCE_INVENTORY_ROWS && unique(sourceInventory.map(row => row.receipt_id)), 'source-inventory shard drift');

  const surfaceEvidence = [
    ...html.map(row => ({ surface_evidence_type: 'html_surface', ...row })),
    ...forms.map(row => ({ surface_evidence_type: 'form_metadata', ...row })),
  ].sort((a, b) => a.route_id.localeCompare(b.route_id) || a.surface_evidence_type.localeCompare(b.surface_evidence_type) || (a.form_index || 0) - (b.form_index || 0));
  const candidateLedger = candidates.map(adjudicateCandidate);
  const externalLedger = external.map(row => ({ ...row, adjudication_state: 'external_public_lead_not_fetched_or_identity_joined' }));

  const taxStatusRows = candidateLedger.filter(row => row.adjudication_state === 'first_party_501c3_or_nonprofit_claim_not_registry_grade');
  const footerRows = candidateLedger.filter(row => row.adjudication_state === 'footer_brand_string_not_legal_entity_name');
  const collisionRows = candidateLedger.filter(row => row.adjudication_state === 'context_pattern_collision_not_schoolhouse_legal_status');
  const distinctCandidateValues = new Set(candidateLedger.map(row => row.candidate_value));
  assert(taxStatusRows.length === 39 && footerRows.length === 38 && collisionRows.length === 1, 'candidate adjudication count drift');
  assert(distinctCandidateValues.size === 5, 'distinct candidate-value count drift');
  assert(summary.explicit_schoolhouse_legal_name_candidate_rows === 0, 'unexpected explicit legal-name candidate');
  assert(candidateLedger.every(row => row.identifier_grade === false && row.registry_grade === false && row.public_schoolhouse_identity_admitted === false), 'candidate authority drift');

  const routeStateCounts = countBy(routeRows, row => row.state);
  const externalRouteClassCounts = countBy(externalLedger, row => row.route_class);
  assert(routeStateCounts.accessible_html === 39 && routeStateCounts.accessible_xml === 6 && routeStateCounts.accessible_text === 1, 'route-state count drift');
  assert(externalRouteClassCounts.external_public_link_not_fetched === 69 && externalRouteClassCounts.public_social_platform === 42, 'external route-class count drift');

  const custody = {
    schema_version: 'schoolhouse-first-party-legal-surface-custody@1',
    as_of: '2026-08-05',
    acquisition: {
      workflow_run_id: ARTIFACT_RUN_ID,
      artifact_id: ARTIFACT_ID,
      artifact_name: 'schoolhouse-first-party-legal-surface-census',
      artifact_digest: ARTIFACT_DIGEST,
      acquisition_head: ACQUISITION_HEAD,
      artifact_manifest_sha256: sha256(path.join(inputDir, 'artifact-manifest.json')),
    },
    bounds: {
      fixed_root_routes: 5,
      maximum_total_routes: 120,
      maximum_depth: 2,
      allowed_follow_hosts: ['school.house', 'www.school.house'],
      fixed_connect_url_only: 'https://connect.bv.vc/schoolhouse',
      request_methods: ['GET'],
      query_string_routes_followed: 0,
      external_links_fetched: 0,
    },
    counts: {
      root_route_rows: 5,
      followed_route_rows: 41,
      terminal_route_rows: 46,
      accessible_html_routes: 39,
      accessible_xml_routes: 6,
      accessible_text_routes: 1,
      discovered_link_rows: 555,
      unique_discovered_links: 78,
      same_schoolhouse_host_link_rows: 444,
      eligible_query_free_same_host_unique_links: 43,
      unfollowed_eligible_query_free_same_host_links: 0,
      legal_governance_relevant_link_rows: 224,
      html_surface_rows: 39,
      structured_data_rows: 0,
      surface_form_rows: 8,
      legal_governance_candidate_rows: 78,
      distinct_candidate_values: 5,
      first_party_501c3_or_nonprofit_claim_rows: 39,
      footer_brand_string_rows: 38,
      context_pattern_collision_rows: 1,
      explicit_schoolhouse_legal_name_candidate_rows: 0,
      legal_term_total_hits: 123,
      subject_term_hit_rows: 39,
      subject_term_total_hits: 77,
      external_link_rows: 111,
      unique_external_hosts: 31,
      search_submissions: 0,
      form_submissions: 0,
      source_rows_acquired: 0,
      admitted_identities: 0,
    },
    candidate_adjudication: {
      repeated_first_party_tax_status_claim: 'first_party_self_description_not_registry_grade',
      repeated_footer_copyright_string: 'brand_string_not_legal_entity_name',
      global_sof_foundation_context_match: 'pattern_collision_not_schoolhouse_legal_status',
      exact_legal_name_candidate_state: 'none_observed_in_declared_query_free_first_party_denominator',
      structured_organization_data_state: 'none_observed',
      identity_effect: 'none',
    },
    terminal_frontier: {
      fixed_root_denominator_terminal: true,
      discovered_query_free_same_host_route_denominator_terminal: true,
      route_cap_exhausted: false,
      remaining_registry_grade_fields: [
        'exact legal name', 'EIN', 'exemption record', 'formation documents', 'officers', 'board',
        'governance', 'funding', 'fiscal sponsor', 'related parties', 'differently named corporation',
        'state-only registration', 'archive locators',
      ],
      outside_human_dependency: false,
    },
    privacy: {
      raw_source_retained: false,
      visible_text_retained: false,
      hidden_form_values_retained: false,
      street_address_rows_retained: 0,
      contact_detail_rows_retained: 0,
      private_support_rows: 0,
    },
    public_schoolhouse_identity_admitted: false,
    admitted_legal_name: null,
    admitted_ein: null,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };

  const outFiles = {
    'source-inventory-13.jsonl': sourceInventory,
    'schoolhouse-first-party-legal-surface-route-results.jsonl': routeRows,
    'schoolhouse-first-party-legal-surface-discovered-links.jsonl': discovered,
    'schoolhouse-first-party-legal-surface-evidence.jsonl': surfaceEvidence,
    'schoolhouse-first-party-legal-surface-candidate-ledger.jsonl': candidateLedger,
    'schoolhouse-first-party-legal-surface-external-link-inventory.jsonl': externalLedger,
  };
  for (const [filename, rows] of Object.entries(outFiles)) writeJsonl(path.join(DATA_DIR, filename), rows);
  writeJson(path.join(DATA_DIR, 'schoolhouse-first-party-legal-surface-custody.json'), custody);

  const manifestPath = path.join(DATA_DIR, 'manifest.json');
  const coveragePath = path.join(DATA_DIR, 'coverage-matrix.json');
  const frontierPath = path.join(DATA_DIR, 'acquisition-frontier.json');
  const schoolhousePath = path.join(DATA_DIR, 'schoolhouse.json');
  const readmePath = path.join(DATA_DIR, 'README.md');
  const validatorPath = path.resolve('tools/validate-bvvc-defense-capital.mjs');

  const manifest = readJson(manifestPath);
  const coverage = readJson(coveragePath);
  const frontier = readJson(frontierPath);
  const schoolhouse = readJson(schoolhousePath);
  let readme = fs.readFileSync(readmePath, 'utf8');
  let validator = fs.readFileSync(validatorPath, 'utf8');

  assert(manifest.counts.source_inventory_rows === 290, 'predecessor source-inventory count drift');
  assert(manifest.counts.coverage_denominator_rows === 22, 'predecessor coverage count drift');
  assert(manifest.counts.explicit_gap_rows === 16, 'predecessor gap count drift');
  assert(manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-12.jsonl', 'predecessor source-inventory order drift');

  manifest.counts.source_inventory_rows = EXPECTED_SOURCE_INVENTORY_ROWS;
  manifest.counts.coverage_denominator_rows = EXPECTED_COVERAGE_ROWS;
  manifest.counts.explicit_gap_rows = EXPECTED_GAP_ROWS;
  Object.assign(manifest.counts, {
    schoolhouse_first_party_legal_surface_root_route_rows: 5,
    schoolhouse_first_party_legal_surface_followed_route_rows: 41,
    schoolhouse_first_party_legal_surface_terminal_route_rows: 46,
    schoolhouse_first_party_legal_surface_html_route_rows: 39,
    schoolhouse_first_party_legal_surface_xml_route_rows: 6,
    schoolhouse_first_party_legal_surface_text_route_rows: 1,
    schoolhouse_first_party_legal_surface_discovered_link_rows: 555,
    schoolhouse_first_party_legal_surface_unique_discovered_links: 78,
    schoolhouse_first_party_legal_surface_same_host_link_rows: 444,
    schoolhouse_first_party_legal_surface_eligible_same_host_unique_links: 43,
    schoolhouse_first_party_legal_surface_unfollowed_eligible_links: 0,
    schoolhouse_first_party_legal_surface_html_surface_rows: 39,
    schoolhouse_first_party_legal_surface_structured_data_rows: 0,
    schoolhouse_first_party_legal_surface_form_rows: 8,
    schoolhouse_first_party_legal_surface_candidate_rows: 78,
    schoolhouse_first_party_legal_surface_distinct_candidate_values: 5,
    schoolhouse_first_party_legal_surface_tax_status_claim_rows: 39,
    schoolhouse_first_party_legal_surface_footer_brand_rows: 38,
    schoolhouse_first_party_legal_surface_context_collision_rows: 1,
    schoolhouse_first_party_legal_surface_exact_legal_name_candidate_rows: 0,
    schoolhouse_first_party_legal_surface_legal_term_hits: 123,
    schoolhouse_first_party_legal_surface_subject_term_hits: 77,
    schoolhouse_first_party_legal_surface_external_link_rows: 111,
    schoolhouse_first_party_legal_surface_unique_external_hosts: 31,
    schoolhouse_first_party_legal_surface_search_submissions: 0,
    schoolhouse_first_party_legal_surface_source_rows_acquired: 0,
    schoolhouse_first_party_legal_surface_admitted_identity_rows: 0,
  });
  for (const boundary of [
    'A repeated first-party 501(c)(3), tax-exempt, nonprofit, or public-charity description is a self-description and not a registry-grade legal name, EIN, exemption, filing, fiscal-sponsor, governance, funding, or control record.',
    'The repeated footer string © 2026 School House is a brand copyright string and not an admitted legal-entity name.',
    'Zero exact legal-name candidates and zero organization JSON-LD rows in the complete query-free first-party surface denominator are bounded source observations, not evidence that no entity, filing, officer, board, sponsor, or differently named organization exists.',
  ]) {
    if (!manifest.boundaries.includes(boundary)) manifest.boundaries.push(boundary);
  }
  manifest.coverage.schoolhouse_first_party_legal_surface_census = '5_root_41_followed_46_terminal_39_html_6_xml_1_text_43_of_43_query_free_same_host_routes_terminal_39_tax_status_self_claims_zero_exact_legal_name_zero_identity';
  manifest.custody.next_waterline = 'first_party_claim_to_registry_grade_legal_identity_and_archive_locator_custody';
  manifest.purpose = manifest.purpose.replace(
    'coverage nulls, and deterministic continuation work.',
    'query-free first-party legal-surface and form-mechanics custody, coverage nulls, and deterministic continuation work.',
  );
  manifest.source_inventory.evidence_class_counts.primary_public_first_party_route_custody = 46;
  manifest.source_inventory.source_state_counts.captured_first_party_html_surface = 39;
  manifest.source_inventory.source_state_counts.captured_first_party_xml_surface = 6;
  manifest.source_inventory.source_state_counts.captured_first_party_text_surface = 1;
  manifest.storage_contract.source_inventory_parts.push('source-inventory-13.jsonl');
  Object.assign(manifest.storage_contract, {
    schoolhouse_first_party_legal_surface_custody: 'schoolhouse-first-party-legal-surface-custody.json',
    schoolhouse_first_party_legal_surface_route_results: 'schoolhouse-first-party-legal-surface-route-results.jsonl',
    schoolhouse_first_party_legal_surface_discovered_links: 'schoolhouse-first-party-legal-surface-discovered-links.jsonl',
    schoolhouse_first_party_legal_surface_evidence: 'schoolhouse-first-party-legal-surface-evidence.jsonl',
    schoolhouse_first_party_legal_surface_candidate_ledger: 'schoolhouse-first-party-legal-surface-candidate-ledger.jsonl',
    schoolhouse_first_party_legal_surface_external_link_inventory: 'schoolhouse-first-party-legal-surface-external-link-inventory.jsonl',
  });

  const surfaceName = 'School.House query-free first-party legal and governance surface census';
  coverage.denominators = coverage.denominators.filter(row => row.surface !== surfaceName);
  coverage.denominators.push({
    surface: surfaceName,
    declared_total: 46,
    enumerated_total: 46,
    root_route_total: 5,
    followed_route_total: 41,
    accessible_html_routes: 39,
    accessible_xml_routes: 6,
    accessible_text_routes: 1,
    discovered_link_rows: 555,
    unique_discovered_links: 78,
    eligible_query_free_same_host_unique_links: 43,
    unfollowed_eligible_query_free_same_host_links: 0,
    first_party_tax_status_claim_rows: 39,
    exact_legal_name_candidate_rows: 0,
    structured_data_rows: 0,
    form_rows: 8,
    search_submissions: 0,
    coverage_state: 'terminal_query_free_first_party_surface_census_no_registry_identity_admitted',
  });
  const previousGapIndex = coverage.explicit_nulls_and_gaps.findIndex(value => value.startsWith('School.House public identity remains unresolved after complete SHA-256 custody'));
  assert(previousGapIndex >= 0, 'complete-PDF gap row not found');
  coverage.explicit_nulls_and_gaps[previousGapIndex] = 'School.House public identity remains unresolved after terminal custody for five fixed roots and all forty-three discovered query-free same-host first-party routes. Thirty-nine route-specific first-party 501(c)(3), tax-exempt, nonprofit, or public-charity phrases repeat the same self-description; thirty-eight footer strings say © 2026 School House; no exact legal-name candidate or organization JSON-LD row was observed. Those bounded observations are not registry-grade identity or absence evidence. Legal name, EIN, exemption, formation documents, officers, board, governance, funding, fiscal sponsor, related parties, differently named corporations, state-only registrations, and archive locators remain open.';

  const legalTask = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
  assert(legalTask, 'School.House legal-governance frontier task missing');
  legalTask.prior_first_party_legal_surface_census = {
    workflow_run_id: ARTIFACT_RUN_ID,
    artifact_id: ARTIFACT_ID,
    artifact_digest: ARTIFACT_DIGEST,
    acquisition_head: ACQUISITION_HEAD,
    fixed_root_routes: 5,
    followed_routes: 41,
    terminal_routes: 46,
    accessible_html_routes: 39,
    accessible_xml_routes: 6,
    accessible_text_routes: 1,
    eligible_query_free_same_host_unique_links: 43,
    unfollowed_eligible_query_free_same_host_links: 0,
    first_party_tax_status_claim_rows: 39,
    footer_brand_string_rows: 38,
    exact_legal_name_candidate_rows: 0,
    structured_data_rows: 0,
    form_rows: 8,
    search_submissions: 0,
    source_rows_acquired: 0,
    admitted_identities: 0,
    state: 'terminal_query_free_first_party_surface_census_repeated_tax_status_self_claim_no_registry_identity_admitted',
    custody_file: 'schoolhouse-first-party-legal-surface-custody.json',
  };
  legalTask.next_transition = 'Do not repeat the frozen fifty-one-route North Carolina residual, fifteen-PDF complete-hash set, or forty-six-route query-free first-party surface census, and do not submit a scripted interactive search or public form. Treat the repeated 501(c)(3), tax-exempt, nonprofit, and public-charity language as first-party self-description only. Continue registry-grade legal-name, EIN, exemption, formation, officer, board, governance, funding, fiscal-sponsor, related-party, differently named corporation, state-only registration, and archive-locator evidence. Preserve the Magnolia shared-EIN conflict and admit no identity without identifier, time, place, organization class, and brand convergence.';

  schoolhouse.state_registry_identity_census.first_party_legal_surface_census = {
    as_of: '2026-08-05',
    workflow_run_id: ARTIFACT_RUN_ID,
    artifact_id: ARTIFACT_ID,
    fixed_root_routes: 5,
    followed_routes: 41,
    terminal_routes: 46,
    eligible_query_free_same_host_unique_links: 43,
    unfollowed_eligible_query_free_same_host_links: 0,
    html_surface_rows: 39,
    structured_data_rows: 0,
    form_rows: 8,
    first_party_501c3_or_nonprofit_claim_rows: 39,
    footer_brand_string_rows: 38,
    context_pattern_collision_rows: 1,
    exact_legal_name_candidate_rows: 0,
    exact_ein_candidate_rows: 0,
    identity_state: 'unresolved_after_terminal_first_party_surface_census_no_registry_identity_admitted',
    first_party_tax_status_claim_state: 'repeated_self_description_not_registry_grade',
    footer_brand_state: 'copyright_brand_string_not_legal_name',
    admitted_legal_name: null,
    admitted_ein: null,
    search_submissions: 0,
    source_rows_acquired: 0,
    public_schoolhouse_identity_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    graph_effect: 'none',
    promotes_to: 'candidate_only',
    custody_file: 'schoolhouse-first-party-legal-surface-custody.json',
  };

  readme = replaceOnce(readme, 'public-source receipts                        290', 'public-source receipts                        336', 'README public-source count');
  readme = replaceOnce(
    readme,
    'charity/NC complete PDF public identities admitted            0\n',
    'charity/NC complete PDF public identities admitted            0\nfirst-party legal-surface fixed roots                     5 / 5\nfirst-party legal-surface followed routes               41 / 41\nfirst-party legal-surface terminal routes               46 / 46\nfirst-party legal-surface HTML/XML/text routes          39 / 6 / 1\nfirst-party legal-surface query-free same-host routes    43 / 43\nfirst-party legal-surface first-party tax-status claims       39\nfirst-party legal-surface footer brand strings                38\nfirst-party legal-surface exact legal-name candidates          0\nfirst-party legal-surface structured-data rows                  0\nfirst-party legal-surface form mechanics rows                   8\nfirst-party legal-surface searches or submissions               0\nfirst-party legal-surface public identities admitted            0\n',
    'README first-party counts',
  );
  readme = replaceOnce(readme, '`source-inventory-01.jsonl` through `source-inventory-12.jsonl`', '`source-inventory-01.jsonl` through `source-inventory-13.jsonl`', 'README source-inventory range');
  readme = replaceOnce(
    readme,
    '- `schoolhouse-charity-nc-complete-pdf-custody.json`, the fixed input, complete-hash, content-classification, policy, and field-summary files, and `source-inventory-12.jsonl` preserve exact full-file SHA-256 custody for all fifteen accessible North Carolina PDFs, 377 privacy-minimized page mechanics, 332,175 screened text characters with no text retained, 586 fixed field-term hits, zero School.House/BVVC subject-term hits, zero searches, and zero identity admissions.\n',
    '- `schoolhouse-charity-nc-complete-pdf-custody.json`, the fixed input, complete-hash, content-classification, policy, and field-summary files, and `source-inventory-12.jsonl` preserve exact full-file SHA-256 custody for all fifteen accessible North Carolina PDFs, 377 privacy-minimized page mechanics, 332,175 screened text characters with no text retained, 586 fixed field-term hits, zero School.House/BVVC subject-term hits, zero searches, and zero identity admissions.\n- `schoolhouse-first-party-legal-surface-custody.json`, the combined route, link, surface-evidence, adjudicated-candidate, and external-link files, and `source-inventory-13.jsonl` preserve terminal custody for five fixed roots and all forty-three discovered query-free same-host routes. The package distinguishes thirty-nine repeated first-party tax-status self-descriptions, thirty-eight footer brand strings, one context-pattern collision, zero exact legal-name candidates, zero organization JSON-LD rows, eight unsubmitted form-mechanics rows, and zero identity admissions.\n',
    'README first-party files',
  );
  readme = replaceOnce(
    readme,
    '\n\nThe checked-in frontier now directs',
    '\n\nThe first-party successor then placed the home page, faculty surface, robots file, WordPress sitemap family, fixed BVVC connect page, and every discovered query-free same-host route into terminal custody. All forty-three eligible same-host URLs were acquired within the route and depth bounds. Thirty-nine route-specific phrases repeat a 501(c)(3), tax-exempt, nonprofit, or public-charity self-description, while thirty-eight footers repeat © 2026 School House. No exact legal-name candidate or organization JSON-LD row was observed. The tax-status phrases remain self-description, the copyright string remains a brand string, and neither supplies a registry-grade legal name, EIN, exemption, board, officer, governance, funding, sponsor, or control record. Eight public form surfaces were described mechanically and never submitted.\n\nThe checked-in frontier now directs',
    'README continuation',
  );

  writeJson(coveragePath, coverage);
  writeJson(frontierPath, frontier);
  writeJson(schoolhousePath, schoolhouse);
  fs.writeFileSync(readmePath, readme);

  const dataFilesToBind = [
    'acquisition-frontier.json',
    'coverage-matrix.json',
    'schoolhouse.json',
    'source-inventory-13.jsonl',
    'schoolhouse-first-party-legal-surface-custody.json',
    'schoolhouse-first-party-legal-surface-route-results.jsonl',
    'schoolhouse-first-party-legal-surface-discovered-links.jsonl',
    'schoolhouse-first-party-legal-surface-evidence.jsonl',
    'schoolhouse-first-party-legal-surface-candidate-ledger.jsonl',
    'schoolhouse-first-party-legal-surface-external-link-inventory.jsonl',
  ];
  for (const filename of dataFilesToBind) manifest.files[filename] = fileReceipt(filename);
  writeJson(manifestPath, manifest);

  const sourceCountPattern = "manifest.counts.source_inventory_rows === 290";
  const coverageCountPattern = "manifest.counts.coverage_denominator_rows === 22";
  assert(validator.split(sourceCountPattern).length - 1 === 3, 'validator predecessor source count occurrence drift');
  assert(validator.split(coverageCountPattern).length - 1 === 3, 'validator predecessor coverage count occurrence drift');
  validator = validator.split(sourceCountPattern).join("manifest.counts.source_inventory_rows === 336");
  validator = validator.split(coverageCountPattern).join("manifest.counts.coverage_denominator_rows === 23");
  assert(!validator.includes('schoolhouse-first-party-legal-surface-custody.json'), 'first-party validator block already present');

  const validatorBlock = String.raw`

  {
    const firstPartyCustody = readJson(path.join(dir, 'schoolhouse-first-party-legal-surface-custody.json'));
    const firstPartyRoutes = readJsonl(path.join(dir, 'schoolhouse-first-party-legal-surface-route-results.jsonl'));
    const firstPartyLinks = readJsonl(path.join(dir, 'schoolhouse-first-party-legal-surface-discovered-links.jsonl'));
    const firstPartyEvidence = readJsonl(path.join(dir, 'schoolhouse-first-party-legal-surface-evidence.jsonl'));
    const firstPartyCandidates = readJsonl(path.join(dir, 'schoolhouse-first-party-legal-surface-candidate-ledger.jsonl'));
    const firstPartyExternal = readJsonl(path.join(dir, 'schoolhouse-first-party-legal-surface-external-link-inventory.jsonl'));
    const firstPartyHtml = firstPartyEvidence.filter(row => row.surface_evidence_type === 'html_surface');
    const firstPartyForms = firstPartyEvidence.filter(row => row.surface_evidence_type === 'form_metadata');

    check(manifest.counts.source_inventory_rows === 336, 'first-party source-inventory denominator drift');
    check(manifest.counts.coverage_denominator_rows === 23, 'first-party coverage-denominator count drift');
    check(manifest.counts.explicit_gap_rows === 16, 'first-party explicit-gap count drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_root_route_rows === firstPartyRoutes.filter(row => row.route_class === 'fixed_root').length && manifest.counts.schoolhouse_first_party_legal_surface_root_route_rows === 5, 'first-party root-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_followed_route_rows === firstPartyRoutes.filter(row => row.route_class === 'query_free_same_host_follow').length && manifest.counts.schoolhouse_first_party_legal_surface_followed_route_rows === 41, 'first-party followed-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_terminal_route_rows === firstPartyRoutes.length && firstPartyRoutes.length === 46, 'first-party terminal-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_html_route_rows === firstPartyRoutes.filter(row => row.state === 'accessible_html').length && manifest.counts.schoolhouse_first_party_legal_surface_html_route_rows === 39, 'first-party HTML-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_xml_route_rows === firstPartyRoutes.filter(row => row.state === 'accessible_xml').length && manifest.counts.schoolhouse_first_party_legal_surface_xml_route_rows === 6, 'first-party XML-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_text_route_rows === firstPartyRoutes.filter(row => row.state === 'accessible_text').length && manifest.counts.schoolhouse_first_party_legal_surface_text_route_rows === 1, 'first-party text-route denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_discovered_link_rows === firstPartyLinks.length && firstPartyLinks.length === 555, 'first-party discovered-link denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_unique_discovered_links === new Set(firstPartyLinks.map(row => row.href)).size && manifest.counts.schoolhouse_first_party_legal_surface_unique_discovered_links === 78, 'first-party unique-link denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_same_host_link_rows === firstPartyLinks.filter(row => row.same_schoolhouse_host).length && manifest.counts.schoolhouse_first_party_legal_surface_same_host_link_rows === 444, 'first-party same-host link denominator drift');
    const firstPartyEligibleUrls = new Set(firstPartyLinks.filter(row => row.eligible_follow).map(row => row.href_without_query));
    const firstPartyRouteUrls = new Set(firstPartyRoutes.map(row => row.requested_url));
    const firstPartyUnfollowedEligible = [...firstPartyEligibleUrls].filter(url => !firstPartyRouteUrls.has(url));
    check(manifest.counts.schoolhouse_first_party_legal_surface_eligible_same_host_unique_links === firstPartyEligibleUrls.size && firstPartyEligibleUrls.size === 43, 'first-party eligible same-host denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_unfollowed_eligible_links === firstPartyUnfollowedEligible.length && firstPartyUnfollowedEligible.length === 0, 'first-party same-host closure drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_html_surface_rows === firstPartyHtml.length && firstPartyHtml.length === 39, 'first-party HTML-surface denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_structured_data_rows === 0, 'first-party structured-data denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_form_rows === firstPartyForms.length && firstPartyForms.length === 8, 'first-party form denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_candidate_rows === firstPartyCandidates.length && firstPartyCandidates.length === 78, 'first-party candidate denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_distinct_candidate_values === new Set(firstPartyCandidates.map(row => row.candidate_value)).size && manifest.counts.schoolhouse_first_party_legal_surface_distinct_candidate_values === 5, 'first-party distinct candidate-value drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_tax_status_claim_rows === firstPartyCandidates.filter(row => row.adjudication_state === 'first_party_501c3_or_nonprofit_claim_not_registry_grade').length && manifest.counts.schoolhouse_first_party_legal_surface_tax_status_claim_rows === 39, 'first-party tax-status claim denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_footer_brand_rows === firstPartyCandidates.filter(row => row.adjudication_state === 'footer_brand_string_not_legal_entity_name').length && manifest.counts.schoolhouse_first_party_legal_surface_footer_brand_rows === 38, 'first-party footer-brand denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_context_collision_rows === firstPartyCandidates.filter(row => row.adjudication_state === 'context_pattern_collision_not_schoolhouse_legal_status').length && manifest.counts.schoolhouse_first_party_legal_surface_context_collision_rows === 1, 'first-party context-collision denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_exact_legal_name_candidate_rows === 0, 'first-party exact legal-name candidate count drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_legal_term_hits === firstPartyHtml.reduce((sum, row) => sum + row.legal_term_total_hits, 0) && manifest.counts.schoolhouse_first_party_legal_surface_legal_term_hits === 123, 'first-party legal-term count drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_subject_term_hits === firstPartyHtml.reduce((sum, row) => sum + row.subject_term_total_hits, 0) && manifest.counts.schoolhouse_first_party_legal_surface_subject_term_hits === 77, 'first-party subject-term count drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_external_link_rows === firstPartyExternal.length && firstPartyExternal.length === 111, 'first-party external-link denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_unique_external_hosts === new Set(firstPartyExternal.map(row => row.host)).size && manifest.counts.schoolhouse_first_party_legal_surface_unique_external_hosts === 31, 'first-party external-host denominator drift');
    check(manifest.counts.schoolhouse_first_party_legal_surface_search_submissions === 0 && manifest.counts.schoolhouse_first_party_legal_surface_source_rows_acquired === 0 && manifest.counts.schoolhouse_first_party_legal_surface_admitted_identity_rows === 0, 'first-party authority count drift');

    check(unique(firstPartyRoutes.map(row => row.route_id)) && unique(firstPartyRoutes.map(row => row.receipt_id)), 'first-party route IDs and receipts must be unique');
    check(firstPartyRoutes.every(row => knownReceiptIds.has(row.receipt_id) && row.status === 200 && row.request_method === 'GET' && row.request_attempts === 1), 'first-party route receipt/request drift');
    check(firstPartyRoutes.every(row => row.query_submitted === false && row.form_submitted === false && row.application_submitted === false && row.account_action_submitted === false && row.payment_action_submitted === false && row.upload_submitted === false && row.contact_request_submitted === false), 'first-party submission boundary drift');
    check(firstPartyRoutes.every(row => row.source_rows_acquired === 0 && row.raw_source_retained === false && row.visible_text_retained === false && row.hidden_form_values_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'first-party route privacy drift');
    check(firstPartyRoutes.every(row => row.identity_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.graph_effect === 'none' && row.promotes_to === 'candidate_only'), 'first-party route authority drift');
    check(firstPartyLinks.every(row => knownReceiptIds.has(row.source_receipt_id) && row.href === row.href_without_query && row.query_value_retained === false && row.query_submission_required === false && row.identity_admitted === false && row.graph_effect === 'none'), 'first-party discovered-link boundary drift');
    check(firstPartyHtml.every(row => knownReceiptIds.has(row.receipt_id) && row.raw_html_retained === false && row.visible_text_retained === false && row.footer_text_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.identity_admitted === false && row.graph_effect === 'none'), 'first-party HTML privacy/authority drift');
    check(firstPartyForms.every(row => knownReceiptIds.has(row.receipt_id) && row.hidden_values_retained === false && row.control_values_retained === false && row.query_submitted === false && row.form_submitted === false && row.identity_admitted === false && row.graph_effect === 'none'), 'first-party form privacy/authority drift');
    check(firstPartyCandidates.every(row => knownReceiptIds.has(row.receipt_id) && row.identifier_grade === false && row.registry_grade === false && row.legal_name_effect === 'none' && row.admitted_legal_name === null && row.admitted_ein === null && row.public_schoolhouse_identity_admitted === false && row.graph_effect === 'none'), 'first-party candidate authority drift');
    check(firstPartyExternal.every(row => knownReceiptIds.has(row.source_receipt_id) && row.fetched === false && row.query_value_retained === false && row.query_submitted === false && row.identity_admitted === false && row.adjudication_state === 'external_public_lead_not_fetched_or_identity_joined' && row.graph_effect === 'none'), 'first-party external-link authority drift');
    check(firstPartyExternal.filter(row => row.route_class === 'public_social_platform').length === 42 && firstPartyExternal.filter(row => row.route_class === 'external_public_link_not_fetched').length === 69, 'first-party external route-class drift');

    check(firstPartyCustody.acquisition.workflow_run_id === 30990750394 && firstPartyCustody.acquisition.artifact_id === 8923990465 && firstPartyCustody.acquisition.artifact_digest === 'sha256:096bad980f5323fd04c1d75fcf3f2e7c954d13fdbb0ae47f8f06c8a160fbae8e' && firstPartyCustody.acquisition.acquisition_head === '71b13676c36c44d5e59d543c240f923304b5a4fb', 'first-party acquisition custody drift');
    check(firstPartyCustody.bounds.fixed_root_routes === 5 && firstPartyCustody.bounds.maximum_total_routes === 120 && firstPartyCustody.bounds.maximum_depth === 2 && firstPartyCustody.bounds.query_string_routes_followed === 0 && firstPartyCustody.bounds.external_links_fetched === 0, 'first-party bound custody drift');
    check(firstPartyCustody.counts.terminal_route_rows === 46 && firstPartyCustody.counts.eligible_query_free_same_host_unique_links === 43 && firstPartyCustody.counts.unfollowed_eligible_query_free_same_host_links === 0 && firstPartyCustody.counts.first_party_501c3_or_nonprofit_claim_rows === 39 && firstPartyCustody.counts.footer_brand_string_rows === 38 && firstPartyCustody.counts.explicit_schoolhouse_legal_name_candidate_rows === 0 && firstPartyCustody.counts.admitted_identities === 0, 'first-party custody denominator drift');
    check(firstPartyCustody.terminal_frontier.fixed_root_denominator_terminal === true && firstPartyCustody.terminal_frontier.discovered_query_free_same_host_route_denominator_terminal === true && firstPartyCustody.terminal_frontier.route_cap_exhausted === false && firstPartyCustody.terminal_frontier.outside_human_dependency === false, 'first-party terminal-frontier drift');
    check(firstPartyCustody.privacy.raw_source_retained === false && firstPartyCustody.privacy.visible_text_retained === false && firstPartyCustody.privacy.hidden_form_values_retained === false && firstPartyCustody.privacy.street_address_rows_retained === 0 && firstPartyCustody.privacy.contact_detail_rows_retained === 0 && firstPartyCustody.privacy.private_support_rows === 0, 'first-party custody privacy drift');
    check(firstPartyCustody.public_schoolhouse_identity_admitted === false && firstPartyCustody.admitted_legal_name === null && firstPartyCustody.admitted_ein === null && firstPartyCustody.negative_existence_claim_created === false && firstPartyCustody.outside_human_dependency === false && firstPartyCustody.publication_effect === 'none' && firstPartyCustody.adoption_effect === 'none' && firstPartyCustody.graph_effect === 'none' && firstPartyCustody.promotes_to === 'candidate_only', 'first-party custody authority drift');

    const firstPartyProjection = schoolhouse.state_registry_identity_census?.first_party_legal_surface_census;
    check(firstPartyProjection?.terminal_routes === 46 && firstPartyProjection?.eligible_query_free_same_host_unique_links === 43 && firstPartyProjection?.unfollowed_eligible_query_free_same_host_links === 0 && firstPartyProjection?.first_party_501c3_or_nonprofit_claim_rows === 39 && firstPartyProjection?.exact_legal_name_candidate_rows === 0, 'School.House first-party projection drift');
    check(firstPartyProjection?.identity_state === 'unresolved_after_terminal_first_party_surface_census_no_registry_identity_admitted' && firstPartyProjection?.admitted_legal_name === null && firstPartyProjection?.admitted_ein === null && firstPartyProjection?.public_schoolhouse_identity_admitted === false, 'School.House first-party identity authority drift');
    const firstPartyFrontier = frontier.tasks.find(task => task.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_first_party_legal_surface_census;
    check(firstPartyFrontier?.terminal_routes === 46 && firstPartyFrontier?.eligible_query_free_same_host_unique_links === 43 && firstPartyFrontier?.unfollowed_eligible_query_free_same_host_links === 0 && firstPartyFrontier?.first_party_tax_status_claim_rows === 39 && firstPartyFrontier?.exact_legal_name_candidate_rows === 0 && firstPartyFrontier?.admitted_identities === 0, 'School.House first-party frontier projection drift');
    check(coverage.denominators.some(row => row.surface === 'School.House query-free first-party legal and governance surface census' && row.enumerated_total === 46 && row.eligible_query_free_same_host_unique_links === 43 && row.unfollowed_eligible_query_free_same_host_links === 0 && row.first_party_tax_status_claim_rows === 39 && row.exact_legal_name_candidate_rows === 0 && row.search_submissions === 0), 'first-party coverage denominator missing');
  }
`;
  const returnMarker = '\n  return errors;\n}';
  const returnIndex = validator.lastIndexOf(returnMarker);
  assert(returnIndex >= 0, 'validator return marker missing');
  validator = validator.slice(0, returnIndex) + validatorBlock + validator.slice(returnIndex);
  fs.writeFileSync(validatorPath, validator);

  console.log(JSON.stringify({
    schema_version: 'schoolhouse-first-party-legal-surface-build@1',
    source_inventory_rows: EXPECTED_SOURCE_INVENTORY_ROWS,
    coverage_denominator_rows: EXPECTED_COVERAGE_ROWS,
    root_routes: 5,
    followed_routes: 41,
    terminal_routes: 46,
    eligible_query_free_same_host_unique_links: 43,
    unfollowed_eligible_query_free_same_host_links: 0,
    first_party_tax_status_claim_rows: 39,
    footer_brand_string_rows: 38,
    exact_legal_name_candidate_rows: 0,
    structured_data_rows: 0,
    form_rows: 8,
    search_submissions: 0,
    admitted_identities: 0,
    outside_human_dependency: false,
    graph_effect: 'none',
  }, null, 2));
}

const inputDir = process.argv[2];
assert(inputDir, 'usage: node build-schoolhouse-first-party-legal-surface-custody.mjs <artifact-dir>');
build(path.resolve(inputDir));
