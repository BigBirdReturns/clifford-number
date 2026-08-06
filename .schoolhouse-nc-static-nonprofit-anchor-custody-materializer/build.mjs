import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const DATA_DIR = path.resolve('data/intake/bvvc-defense-capital');
const AS_OF = '2026-08-05';
const CANONICAL_PARENT_COMMIT = 'a564aeb99bed19c1f0b0d216c08f08f6b422bc0e';
const ACQUISITION = {
  pr: 1244,
  workflow_run_id: 31071324356,
  workflow_head: 'ddf25f02e52da1066519f8f9aded9dfd850bf4a1',
  artifact_id: 8955740770,
  artifact_digest: 'sha256:7df4b608694beb278c0accd8708b202de7de03ffff80411f83a2b5ae034d40cd',
};
const ARTIFACT_SHA256 = {
  SHA256SUMS: '539db4e32e9bd247eb1d9d6ae26e5e888c765f77aaa12ce1f6322c62062f4bb6',
  'artifact-manifest.json': 'e12da8436c72f17b4dccf0a6e7a3a9acedfbc27c533c07a821631076be001af8',
  'fixed-term-observations.jsonl': 'a9e68d981c265d93546684a5273f42553549c703e366b4b8dbc531a3b6a39f6d',
  'form-observations.jsonl': 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
  'link-observations.jsonl': '433467e072dcc1f65b0a4957ad84a16b9ddd3dfa839cae1c7e663f2ffb99f096',
  'page-receipts.jsonl': '2b3f8ce283d82cb496a8ac7ac7d907e5ebc15e6dc4137f525ee10545c4726cef',
  'route-policy.json': '3fd28321f99fd4aa00811bd3765dddd4f1e3106783d95a2b3352894fb875c392',
  'script-route-observations.jsonl': '4b0e6a5bcdbf2e5df97d68c0a20740701000e7d7c5c317a26a6fc97709225971',
  'successor-routes.jsonl': '860819e8391c52b938104a4999cffa7adaa0fe064435330ae241edfd3e6545b4',
  'summary.json': '363a282ff0fb1095b903b15e6fc2c6490b4e564e596f163dc06a383224454f7e',
};
const PREDECESSOR_SOURCE_ROWS = 480;
const PREDECESSOR_COVERAGE_ROWS = 30;
const EXPECTED_SOURCE_ROWS = 482;
const EXPECTED_COVERAGE_ROWS = 31;
const EXPECTED_GAP_ROWS = 16;
const FILES = {
  pageReceipts: 'schoolhouse-nc-static-nonprofit-anchor-census-page-receipts.jsonl',
  linkObservations: 'schoolhouse-nc-static-nonprofit-anchor-census-link-observations.jsonl',
  successorRoutes: 'schoolhouse-nc-static-nonprofit-anchor-census-successor-routes.jsonl',
  fixedTerms: 'schoolhouse-nc-static-nonprofit-anchor-census-fixed-term-observations.jsonl',
  forms: 'schoolhouse-nc-static-nonprofit-anchor-census-form-observations.jsonl',
  scripts: 'schoolhouse-nc-static-nonprofit-anchor-census-script-route-observations.jsonl',
  routePolicy: 'schoolhouse-nc-static-nonprofit-anchor-census-route-policy.json',
  adjudication: 'schoolhouse-nc-static-nonprofit-anchor-census-adjudication.json',
  custody: 'schoolhouse-nc-static-nonprofit-anchor-census-custody.json',
  sourceInventory: 'source-inventory-21.jsonl',
};
const PERMANENT_PATHS = [
  'data/intake/bvvc-defense-capital/README.md',
  'data/intake/bvvc-defense-capital/acquisition-frontier.json',
  'data/intake/bvvc-defense-capital/coverage-matrix.json',
  'data/intake/bvvc-defense-capital/manifest.json',
  `data/intake/bvvc-defense-capital/${FILES.pageReceipts}`,
  `data/intake/bvvc-defense-capital/${FILES.linkObservations}`,
  `data/intake/bvvc-defense-capital/${FILES.successorRoutes}`,
  `data/intake/bvvc-defense-capital/${FILES.fixedTerms}`,
  `data/intake/bvvc-defense-capital/${FILES.forms}`,
  `data/intake/bvvc-defense-capital/${FILES.scripts}`,
  `data/intake/bvvc-defense-capital/${FILES.routePolicy}`,
  `data/intake/bvvc-defense-capital/${FILES.adjudication}`,
  `data/intake/bvvc-defense-capital/${FILES.custody}`,
  'data/intake/bvvc-defense-capital/schoolhouse.json',
  `data/intake/bvvc-defense-capital/${FILES.sourceInventory}`,
  'tools/build-schoolhouse-nc-static-nonprofit-anchor-custody.mjs',
  'tools/validate-bvvc-defense-capital.mjs',
  'tools/validate-schoolhouse-honor-foundation-990-custody.mjs',
  'tools/validate-schoolhouse-nc-static-nonprofit-anchor-custody.mjs',
  'tools/validate-schoolhouse-nc-static-nonprofit-custody.mjs',
].sort();

const readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const readJsonl = file => fs.readFileSync(file, 'utf8').split(/\r?\n/).filter(Boolean).map((line, index) => {
  try { return JSON.parse(line); } catch (error) { throw new Error(`${file}:${index + 1}: ${error.message}`); }
});
const canonicalJson = value => `${JSON.stringify(value, null, 2)}\n`;
const canonicalJsonl = rows => rows.map(row => JSON.stringify(row)).join('\n') + (rows.length ? '\n' : '');
const writeJson = (file, value) => fs.writeFileSync(file, canonicalJson(value));
const writeJsonl = (file, rows) => fs.writeFileSync(file, canonicalJsonl(rows));
const sha256Buffer = buffer => crypto.createHash('sha256').update(buffer).digest('hex');
const sha256File = file => sha256Buffer(fs.readFileSync(file));
const fileReceipt = filename => {
  const file = path.join(DATA_DIR, filename);
  return { bytes: fs.statSync(file).size, sha256: sha256File(file) };
};
const countOccurrences = (value, needle) => value.split(needle).length - 1;
const replaceOnce = (value, from, to, label) => {
  assert.equal(countOccurrences(value, from), 1, `${label}: expected exactly one occurrence`);
  return value.replace(from, to);
};
const replaceAllChecked = (value, from, to, label) => {
  const count = countOccurrences(value, from);
  assert(count > 0, `${label}: no occurrences`);
  return value.replaceAll(from, to);
};
const currentCommit = () => execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
const currentTree = () => execFileSync('git', ['rev-parse', 'HEAD^{tree}'], { encoding: 'utf8' }).trim();
const selfSource = () => fs.readFileSync(fileURLToPath(import.meta.url), 'utf8');

function verifyPredecessor() {
  assert.equal(currentCommit(), CANONICAL_PARENT_COMMIT, 'builder must run on exact canonical parent');
  const manifest = readJson(path.join(DATA_DIR, 'manifest.json'));
  const coverage = readJson(path.join(DATA_DIR, 'coverage-matrix.json'));
  const schoolhouse = readJson(path.join(DATA_DIR, 'schoolhouse.json'));
  const frontier = readJson(path.join(DATA_DIR, 'acquisition-frontier.json'));
  assert.equal(manifest.counts.source_inventory_rows, PREDECESSOR_SOURCE_ROWS);
  assert.equal(manifest.counts.coverage_denominator_rows, PREDECESSOR_COVERAGE_ROWS);
  assert.equal(manifest.counts.explicit_gap_rows, EXPECTED_GAP_ROWS);
  assert.equal(coverage.denominators.length, PREDECESSOR_COVERAGE_ROWS);
  assert.equal(coverage.explicit_nulls_and_gaps.length, EXPECTED_GAP_ROWS);
  assert.equal(manifest.storage_contract.source_inventory_parts.at(-1), 'source-inventory-20.jsonl');
  assert.equal(manifest.source_inventory.evidence_class_counts.official, 255);
  assert.equal(manifest.source_inventory.source_state_counts.captured_nc_static_nonprofit_html_surface, 2);
  assert(schoolhouse.state_registry_identity_census?.north_carolina_static_nonprofit_census, 'prior NC static custody missing');
  assert(!schoolhouse.state_registry_identity_census?.north_carolina_static_nonprofit_anchor_census, 'anchor census projection already exists');
  const task = frontier.tasks.find(row => row.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
  assert(task?.prior_nc_static_nonprofit_census, 'prior NC frontier projection missing');
  assert(!task?.prior_nc_static_nonprofit_anchor_census, 'anchor frontier projection already exists');
  assert(!coverage.denominators.some(row => row.surface === 'School.House North Carolina static nonprofit current-anchor denominator'));
}

function verifyChecksums(dir) {
  const checksum = path.join(dir, 'SHA256SUMS');
  assert(fs.existsSync(checksum), 'artifact SHA256SUMS missing');
  assert.equal(sha256File(checksum), ARTIFACT_SHA256.SHA256SUMS, 'artifact SHA256SUMS drift');
  for (const line of fs.readFileSync(checksum, 'utf8').split(/\r?\n/).filter(Boolean)) {
    const match = /^([0-9a-f]{64})  (.+)$/.exec(line);
    assert(match, `malformed artifact checksum row: ${line}`);
    const target = path.join(dir, match[2]);
    assert(fs.existsSync(target), `artifact file missing: ${match[2]}`);
    assert.equal(sha256File(target), match[1], `artifact checksum drift: ${match[2]}`);
  }
  for (const [filename, expected] of Object.entries(ARTIFACT_SHA256)) {
    assert.equal(sha256File(path.join(dir, filename)), expected, `sealed artifact SHA drift: ${filename}`);
  }
}

function verifyAuthority(rows, label) {
  const forbidden = new Set(['raw_html','raw_text','raw_script','street_address','mailing_address','postal_code','email','phone','cookie_value','hidden_value']);
  for (const row of rows) {
    assert(![...forbidden].some(key => Object.hasOwn(row, key)), `${label}: forbidden field retained`);
    if (Object.hasOwn(row, 'fetch_executed')) assert.equal(row.fetch_executed, false, `${label}: fetch authority drift`);
    if (Object.hasOwn(row, 'query_submitted')) assert.equal(row.query_submitted, false, `${label}: query authority drift`);
    if (Object.hasOwn(row, 'form_submitted')) assert.equal(row.form_submitted, false, `${label}: form authority drift`);
    if (Object.hasOwn(row, 'raw_source_retained')) assert.equal(row.raw_source_retained, false, `${label}: raw-source drift`);
    if (Object.hasOwn(row, 'full_visible_text_retained')) assert.equal(row.full_visible_text_retained, false, `${label}: visible-text drift`);
    if (Object.hasOwn(row, 'full_script_text_retained')) assert.equal(row.full_script_text_retained, false, `${label}: script-text drift`);
    if (Object.hasOwn(row, 'hidden_form_values_retained')) assert.equal(row.hidden_form_values_retained, false, `${label}: hidden-form drift`);
    if (Object.hasOwn(row, 'identity_admitted')) assert.equal(row.identity_admitted, false, `${label}: identity authority drift`);
    if (Object.hasOwn(row, 'relationship_admitted')) assert.equal(row.relationship_admitted, false, `${label}: relationship authority drift`);
    if (Object.hasOwn(row, 'negative_existence_claim_created')) assert.equal(row.negative_existence_claim_created, false, `${label}: absence-claim drift`);
    if (Object.hasOwn(row, 'outside_human_dependency')) assert.equal(row.outside_human_dependency, false, `${label}: outside-human drift`);
    if (Object.hasOwn(row, 'publication_effect')) assert.equal(row.publication_effect, 'none', `${label}: publication drift`);
    if (Object.hasOwn(row, 'adoption_effect')) assert.equal(row.adoption_effect, 'none', `${label}: adoption drift`);
    if (Object.hasOwn(row, 'graph_effect')) assert.equal(row.graph_effect, 'none', `${label}: graph drift`);
  }
}

function verifyArtifact(dir) {
  verifyChecksums(dir);
  const summary = readJson(path.join(dir, 'summary.json'));
  const artifactManifest = readJson(path.join(dir, 'artifact-manifest.json'));
  const routePolicy = readJson(path.join(dir, 'route-policy.json'));
  const pageReceipts = readJsonl(path.join(dir, 'page-receipts.jsonl'));
  const links = readJsonl(path.join(dir, 'link-observations.jsonl'));
  const successors = readJsonl(path.join(dir, 'successor-routes.jsonl'));
  const fixedTerms = readJsonl(path.join(dir, 'fixed-term-observations.jsonl'));
  const forms = readJsonl(path.join(dir, 'form-observations.jsonl'));
  const scripts = readJsonl(path.join(dir, 'script-route-observations.jsonl'));

  assert.equal(summary.schema_version, 'schoolhouse-nc-static-nonprofit-anchor-census@1');
  assert.equal(summary.terminal_state, 'terminal_two_route_current_anchor_denominator');
  assert.equal(summary.declared_source_routes, 2);
  assert.equal(summary.terminal_source_routes, 2);
  assert.equal(summary.accessible_source_routes, 2);
  assert.equal(summary.transport_or_provider_error_routes, 0);
  assert.equal(summary.source_requests, 2);
  assert.equal(summary.aggregate_response_bytes, 1039582);
  assert.equal(summary.current_anchor_rows, 1552);
  assert.equal(summary.prior_anchor_rows, 1552);
  assert.equal(summary.anchor_count_changed_routes, 0);
  assert.equal(summary.source_changed_routes, 2);
  assert.equal(summary.eligible_successor_unique_routes, 2);
  assert.equal(summary.report_or_listing_unique_routes, 2);
  assert.equal(summary.query_bearing_report_unique_routes, 0);
  assert.equal(summary.entity_detail_candidate_unique_routes, 0);
  assert.equal(summary.static_data_unique_routes, 0);
  assert.equal(summary.static_document_unique_routes, 0);
  assert.equal(summary.fixed_term_observation_rows, 70);
  assert.deepEqual(summary.fixed_term_counts, {
    'location:cumberland': 2,
    'location:fayetteville': 3,
    'location:north_carolina': 65,
  });
  assert.equal(summary.form_observation_rows, 0);
  assert.equal(summary.script_route_observation_rows, 78);
  assert.equal(summary.successor_fetches_executed, 0);
  for (const key of ['query_submissions','forms_submitted','cookie_replays','subscription_purchases','street_address_rows_retained','mailing_address_rows_retained','postal_code_rows_retained','contact_detail_rows_retained','officer_rows_retained','private_support_rows','identities_admitted','relationships_admitted','negative_existence_claims_created']) assert.equal(summary[key], 0, `${key} drift`);
  assert.equal(summary.raw_source_retained, false);
  assert.equal(summary.full_visible_text_retained, false);
  assert.equal(summary.full_script_text_retained, false);
  assert.equal(summary.hidden_form_values_retained, false);
  assert.equal(summary.outside_human_dependency, false);
  assert.equal(summary.publication_effect, 'none');
  assert.equal(summary.adoption_effect, 'none');
  assert.equal(summary.graph_effect, 'none');

  assert.equal(pageReceipts.length, 2);
  assert.deepEqual(pageReceipts.map(row => row.route_id), ['nc-nonprofits-by-county','nc-unincorporated-nonprofits']);
  assert.deepEqual(pageReceipts.map(row => row.observed_anchor_rows), [246,1306]);
  assert(pageReceipts.every(row => row.state === 'accessible_html_anchor_denominator' && row.http_status === 200 && row.request_method === 'GET'));
  assert(pageReceipts.every(row => row.body_changed_since_permanent_custody === true && row.anchor_count_changed_since_permanent_custody === false));
  assert.equal(pageReceipts.reduce((sum, row) => sum + row.content_bytes, 0), 1039582);
  assert.equal(links.length, 1552);
  assert.equal(new Set(links.map(row => `${row.source_route_id}\u0000${row.anchor_ordinal}`)).size, 1552);
  assert.equal(successors.length, 2);
  assert.equal(new Set(successors.map(row => row.candidate_url)).size, 2);
  assert(successors.every(row => row.route_class === 'report_or_listing_route' && row.query_pair_count === 0));
  assert(successors.every(row => row.fixed_term_matches.subject.length === 0 && row.fixed_term_matches.person.length === 0 && row.fixed_term_matches.location.length === 0));
  assert.equal(fixedTerms.length, 70);
  assert(fixedTerms.every(row => row.fixed_term_matches.subject.length === 0 && row.fixed_term_matches.person.length === 0 && row.fixed_term_matches.location.length > 0));
  assert.equal(forms.length, 0);
  assert.equal(scripts.length, 78);
  assert.equal(links.filter(row => row.eligible_successor_route).length, 2);
  verifyAuthority(pageReceipts, 'page receipts');
  verifyAuthority(links, 'link observations');
  verifyAuthority(successors, 'successor routes');
  verifyAuthority(fixedTerms, 'fixed-term observations');
  verifyAuthority(forms, 'form observations');
  verifyAuthority(scripts, 'script observations');

  assert.equal(routePolicy.schema_version, 'schoolhouse-nc-static-nonprofit-anchor-census@1');
  assert.equal(routePolicy.request_bounds.maximum_total_requests, 2);
  assert.equal(routePolicy.request_bounds.successor_fetches, 0);
  assert.equal(routePolicy.selection_contract.complete_anchor_observation_denominator_required, true);
  assert.equal(routePolicy.selection_contract.no_successor_fetches, true);
  assert.equal(routePolicy.outside_human_dependency, false);
  assert.equal(routePolicy.graph_effect, 'none');
  assert.equal(artifactManifest.schema_version, 'schoolhouse-nc-static-nonprofit-anchor-census@1');
  assert.deepEqual(artifactManifest.counts, {
    anchor_observations: 1552,
    fixed_term_observations: 70,
    form_observations: 0,
    script_route_observations: 78,
    source_requests: 2,
    source_routes: 2,
    successor_fetches: 0,
    successor_routes: 2,
  });
  return { summary, artifactManifest, routePolicy, pageReceipts, links, successors, fixedTerms, forms, scripts };
}

function copyArtifactFile(dir, sourceName, targetName) {
  fs.copyFileSync(path.join(dir, sourceName), path.join(DATA_DIR, targetName));
}

function sourceInventoryRows(artifact) {
  return artifact.pageReceipts.map(route => {
    const fixed = artifact.fixedTerms.filter(row => row.source_route_id === route.route_id);
    const scripts = artifact.scripts.filter(row => row.source_route_id === route.route_id);
    return {
      receipt_id: `r-schoolhouse-nc-static-anchor-${route.route_id}-2026-08-05`,
      source_id: `schoolhouse-nc-static-anchor-${route.route_id}`,
      locator_url: route.requested_url,
      source_type: 'official_north_carolina_static_nonprofit_current_anchor_denominator',
      evidence_class: 'official',
      source_state: 'captured_nc_static_nonprofit_anchor_denominator',
      retrieved_at: AS_OF,
      content_sha256: route.content_sha256,
      workflow_run_id: ACQUISITION.workflow_run_id,
      artifact_id: ACQUISITION.artifact_id,
      artifact_digest: ACQUISITION.artifact_digest,
      acquisition_head: ACQUISITION.workflow_head,
      route_id: route.route_id,
      request_method: 'GET',
      http_status: route.http_status,
      response_bytes: route.content_bytes,
      content_type: route.content_type,
      observed_anchor_rows: route.observed_anchor_rows,
      prior_anchor_rows: route.prior_anchor_count,
      anchor_count_changed_since_prior_custody: route.anchor_count_changed_since_permanent_custody,
      body_changed_since_prior_custody: route.body_changed_since_permanent_custody,
      fixed_term_observation_rows: fixed.length,
      script_route_observation_rows: scripts.length,
      eligible_successor_routes: artifact.successors.filter(row => row.source_route_ids.includes(route.route_id)).length,
      source_rows_acquired: 0,
      candidate_rows: 0,
      query_submitted: false,
      form_submitted: false,
      successor_fetches_executed: 0,
      raw_source_retained: false,
      full_visible_text_retained: false,
      full_script_text_retained: false,
      hidden_form_values_retained: false,
      street_address_rows_retained: 0,
      mailing_address_rows_retained: 0,
      postal_code_rows_retained: 0,
      contact_detail_rows_retained: 0,
      officer_rows_retained: 0,
      private_support_rows: 0,
      identity_admitted: false,
      relationship_admitted: false,
      negative_existence_claim_created: false,
      outside_human_dependency: false,
      publication_effect: 'none',
      adoption_effect: 'none',
      graph_effect: 'none',
      promotes_to: 'candidate_only',
      note: 'Exact current official North Carolina static nonprofit page anchor denominator. Stable anchor cardinality and changed page bytes are source-structure custody, not entity, filing, relationship, or absence evidence.',
    };
  });
}

function buildAdjudication(artifact) {
  return {
    schema_version: 'schoolhouse-nc-static-nonprofit-anchor-census-adjudication@1',
    as_of: AS_OF,
    counts: {
      source_routes: 2,
      current_anchor_rows: 1552,
      prior_anchor_rows: 1552,
      body_changed_routes: 2,
      anchor_count_changed_routes: 0,
      fixed_term_observation_rows: 70,
      subject_term_observation_rows: 0,
      person_term_observation_rows: 0,
      location_term_observation_rows: 70,
      eligible_successor_routes: 2,
      query_bearing_report_routes: 0,
      entity_detail_candidate_routes: 0,
      successor_fetches_executed: 0,
      identity_admitted_rows: 0,
      relationship_admitted_rows: 0,
      negative_existence_claims_created: 0,
    },
    successor_route_dispositions: artifact.successors.map(row => ({
      candidate_url: row.candidate_url,
      route_class: row.route_class,
      disposition: row.candidate_url.endsWith('/Non_Participating_Tobacco')
        ? 'unrelated_program_listing_not_schoolhouse_entity_or_nonprofit_record'
        : 'generic_business_registration_landing_page_already_below_registry_grade_identity_threshold',
      fetch_executed: false,
      identity_admitted: false,
      relationship_admitted: false,
      graph_effect: 'none',
    })),
    identity_decision: {
      state: 'unresolved_after_current_nc_static_nonprofit_anchor_denominator_no_entity_detail_or_query_surface',
      public_schoolhouse_identity_admitted: false,
      admitted_legal_name: null,
      admitted_ein: null,
      admitted_formation_record: null,
      admitted_officer_or_director: null,
      admitted_fiscal_sponsor: null,
      relationship_admitted: false,
      negative_existence_claim_created: false,
      boundary: 'The two current pages contain 1,552 anchors, but no School.House or source-listed-person anchor signal, no query-bearing report route, and no entity-detail candidate route. Location labels are report navigation, not legal-entity evidence. The two generic successor routes do not justify another identity acquisition lane.',
    },
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };
}

function buildCustody(artifact, parentTree) {
  return {
    schema_version: 'schoolhouse-nc-static-nonprofit-anchor-census-custody@1',
    as_of: AS_OF,
    canonical_parent: { commit: CANONICAL_PARENT_COMMIT, tree: parentTree },
    acquisition: {
      pr: ACQUISITION.pr,
      workflow_run_id: ACQUISITION.workflow_run_id,
      workflow_head: ACQUISITION.workflow_head,
      artifact_id: ACQUISITION.artifact_id,
      artifact_digest: ACQUISITION.artifact_digest,
      artifact_manifest_sha256: ARTIFACT_SHA256['artifact-manifest.json'],
      artifact_sha256s: ARTIFACT_SHA256,
    },
    predecessor: {
      permanent_merge: artifact.summary.permanent_predecessor_merge,
      custody_blob: artifact.summary.permanent_predecessor_custody_blob,
      route_results_blob: artifact.summary.permanent_predecessor_route_results_blob,
      prior_anchor_rows: 1552,
    },
    counts: {
      source_routes: 2,
      terminal_source_routes: 2,
      accessible_source_routes: 2,
      source_requests: 2,
      aggregate_response_bytes: 1039582,
      current_anchor_rows: 1552,
      prior_anchor_rows: 1552,
      body_changed_routes: 2,
      anchor_count_changed_routes: 0,
      fixed_term_observation_rows: 70,
      subject_term_observation_rows: 0,
      person_term_observation_rows: 0,
      location_term_observation_rows: 70,
      form_observation_rows: 0,
      script_route_observation_rows: 78,
      eligible_successor_routes: 2,
      report_or_listing_successor_routes: 2,
      query_bearing_report_routes: 0,
      entity_detail_candidate_routes: 0,
      static_data_routes: 0,
      static_document_routes: 0,
      successor_fetches_executed: 0,
      source_rows_acquired: 0,
      identity_admitted_rows: 0,
      relationship_admitted_rows: 0,
      negative_existence_claims_created: 0,
    },
    fixed_term_counts: artifact.summary.fixed_term_counts,
    refusal_counts: artifact.summary.refusal_counts,
    files: {
      page_receipts: FILES.pageReceipts,
      link_observations: FILES.linkObservations,
      successor_routes: FILES.successorRoutes,
      fixed_term_observations: FILES.fixedTerms,
      form_observations: FILES.forms,
      script_route_observations: FILES.scripts,
      route_policy: FILES.routePolicy,
      adjudication: FILES.adjudication,
      source_inventory: FILES.sourceInventory,
    },
    interpretation: {
      stable_anchor_count_is_not_stable_record_content: true,
      changed_page_bytes_are_not_changed_registry_records: true,
      location_navigation_labels_are_not_schoolhouse_identity_evidence: true,
      generic_business_registration_route_is_not_entity_detail: true,
      unrelated_program_listing_is_not_schoolhouse_evidence: true,
      zero_schoolhouse_or_person_anchor_signals_are_not_absence_evidence: true,
      no_identity_or_relationship_may_be_admitted_by_this_lane: true,
    },
    privacy: {
      raw_source_retained: false,
      full_visible_text_retained: false,
      full_script_text_retained: false,
      hidden_form_values_retained: false,
      street_address_rows_retained: 0,
      mailing_address_rows_retained: 0,
      postal_code_rows_retained: 0,
      contact_detail_rows_retained: 0,
      officer_rows_retained: 0,
      private_support_rows: 0,
    },
    terminal_frontier: {
      current_two_route_anchor_denominator_terminal: true,
      generic_successor_route_dispositions_terminal: true,
      repeat_only_after_material_source_or_provider_change: true,
      next_waterline: 'materially_distinct_registry_grade_legal_name_ein_exemption_formation_officer_board_funding_fiscal_sponsor_related_party_or_state_only_evidence',
      outside_human_dependency: false,
    },
    identity_state: 'unresolved_after_current_nc_static_nonprofit_anchor_denominator_no_entity_detail_or_query_surface',
    public_schoolhouse_identity_admitted: false,
    admitted_legal_name: null,
    admitted_ein: null,
    admitted_formation_record: null,
    admitted_officer_or_director: null,
    admitted_fiscal_sponsor: null,
    relationship_admitted: false,
    negative_existence_claim_created: false,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
    promotes_to: 'candidate_only',
  };
}

function updateSchoolhouse() {
  const file = path.join(DATA_DIR, 'schoolhouse.json');
  const schoolhouse = readJson(file);
  const state = schoolhouse.state_registry_identity_census;
  assert(state?.north_carolina_static_nonprofit_census, 'prior NC static projection missing');
  assert(!state.north_carolina_static_nonprofit_anchor_census, 'anchor projection already exists');
  state.north_carolina_static_nonprofit_anchor_census = {
    workflow_run_id: ACQUISITION.workflow_run_id,
    artifact_id: ACQUISITION.artifact_id,
    artifact_digest: ACQUISITION.artifact_digest,
    source_routes: 2,
    current_anchor_rows: 1552,
    prior_anchor_rows: 1552,
    body_changed_routes: 2,
    anchor_count_changed_routes: 0,
    fixed_term_observation_rows: 70,
    subject_term_observation_rows: 0,
    person_term_observation_rows: 0,
    location_term_observation_rows: 70,
    eligible_successor_routes: 2,
    query_bearing_report_routes: 0,
    entity_detail_candidate_routes: 0,
    successor_fetches_executed: 0,
    public_schoolhouse_identity_admitted: false,
    negative_existence_claim_created: false,
    identity_state: 'unresolved_after_current_nc_static_nonprofit_anchor_denominator_no_entity_detail_or_query_surface',
    custody_file: FILES.custody,
    adjudication_file: FILES.adjudication,
    boundary: 'Both current static report pages retain the same 1,552-anchor denominator as the prior custody while their page bytes changed. The seventy fixed-term rows are location-navigation observations only. No School.House, source-listed-person, query-bearing report, entity-detail, static-data, or static-document route was observed.',
  };
  state.identity_state = 'unresolved_after_current_nc_static_nonprofit_anchor_denominator_no_entity_detail_or_query_surface';
  state.boundary += ' The current North Carolina report-page anchor census froze all 1,552 anchors and found only location-navigation terms plus two generic report/listing routes. Stable anchor cardinality, changed page bytes, and zero School.House or person anchor signals do not establish identity or absence.';
  writeJson(file, schoolhouse);
}

function updateFrontier() {
  const file = path.join(DATA_DIR, 'acquisition-frontier.json');
  const frontier = readJson(file);
  const task = frontier.tasks.find(row => row.task_id === 'bvvc-frontier-schoolhouse-legal-governance');
  assert(task?.prior_nc_static_nonprofit_census, 'prior NC frontier projection missing');
  assert(!task.prior_nc_static_nonprofit_anchor_census, 'anchor frontier projection already exists');
  task.prior_nc_static_nonprofit_anchor_census = {
    workflow_run_id: ACQUISITION.workflow_run_id,
    artifact_id: ACQUISITION.artifact_id,
    artifact_digest: ACQUISITION.artifact_digest,
    source_routes: 2,
    current_anchor_rows: 1552,
    prior_anchor_rows: 1552,
    body_changed_routes: 2,
    anchor_count_changed_routes: 0,
    fixed_term_observation_rows: 70,
    subject_term_observation_rows: 0,
    person_term_observation_rows: 0,
    eligible_successor_routes: 2,
    query_bearing_report_routes: 0,
    entity_detail_candidate_routes: 0,
    successor_fetches_executed: 0,
    admitted_identities: 0,
    state: 'terminal_two_route_current_anchor_denominator_no_entity_detail_or_query_surface',
    custody_file: FILES.custody,
  };
  task.next_transition = 'Do not repeat the frozen North Carolina route/PDF, first-party, Archive, Florida charity, complete July 2026 Florida corporate, prior two-page North Carolina static report, or current 1,552-anchor denominators unless a material source or provider condition changes. The current anchor census found no School.House or source-listed-person anchor signal, no query-bearing report route, and no entity-detail candidate route. Continue only with materially distinct registry-grade legal-name, EIN, exemption, formation, officer, board, funding, fiscal-sponsor, related-party, differently named corporation, or state-only registration evidence.';
  writeJson(file, frontier);
}

function updateCoverage() {
  const file = path.join(DATA_DIR, 'coverage-matrix.json');
  const coverage = readJson(file);
  assert.equal(coverage.denominators.length, PREDECESSOR_COVERAGE_ROWS);
  coverage.denominators.push({
    surface: 'School.House North Carolina static nonprofit current-anchor denominator',
    declared_total: 2,
    enumerated_total: 2,
    current_anchor_rows: 1552,
    prior_anchor_rows: 1552,
    body_changed_routes: 2,
    anchor_count_changed_routes: 0,
    fixed_term_observation_rows: 70,
    subject_term_observation_rows: 0,
    person_term_observation_rows: 0,
    location_term_observation_rows: 70,
    eligible_successor_routes: 2,
    query_bearing_report_routes: 0,
    entity_detail_candidate_routes: 0,
    static_data_routes: 0,
    static_document_routes: 0,
    successor_fetches_executed: 0,
    query_submissions: 0,
    form_submissions: 0,
    admitted_identities: 0,
    coverage_state: 'terminal_current_anchor_denominator_stable_cardinality_changed_page_bytes_no_entity_or_query_surface',
  });
  const gapIndex = coverage.explicit_nulls_and_gaps.findIndex(value => value.startsWith('School.House public identity remains unresolved after the complete first-party live-surface census'));
  assert(gapIndex >= 0, 'School.House cumulative gap missing');
  coverage.explicit_nulls_and_gaps[gapIndex] += ' The current North Carolina static nonprofit anchor census then enumerated all 1,552 anchors across both exact pages. Both body hashes changed while each page retained its prior anchor count. Seventy fixed-term rows were location-navigation labels only; no School.House or source-listed-person anchor signal, query-bearing report route, entity-detail route, static data file, or static document was observed. This terminates the current anchor denominator without creating an identity or absence finding.';
  writeJson(file, coverage);
}

function updateReadme() {
  const file = path.join(DATA_DIR, 'README.md');
  let text = fs.readFileSync(file, 'utf8');
  text = replaceOnce(text, 'public-source receipts                        480', 'public-source receipts                        482', 'README source count');
  const countMarker = 'North Carolina static nonprofit identities admitted        0\n';
  const countBlock = [
    'North Carolina current static anchor rows             1,552',
    'North Carolina prior/current anchor rows       1,552 / 1,552',
    'North Carolina body/anchor-count changes             2 / 0',
    'North Carolina fixed location-term anchor rows          70',
    'North Carolina SchoolHouse/person anchor rows          0 / 0',
    'North Carolina query/entity-detail successor routes    0 / 0',
    'North Carolina current-anchor identities admitted         0',
  ].join('\n') + '\n';
  text = replaceOnce(text, countMarker, countMarker + countBlock, 'README anchor counts');
  const filesMarker = '- `schoolhouse-nc-static-nonprofit-census-custody.json`, `schoolhouse-nc-static-nonprofit-census-source-receipt.json`, `schoolhouse-nc-static-nonprofit-census-route-results.jsonl`, `schoolhouse-nc-static-nonprofit-census-target-matrix.json`, `schoolhouse-nc-static-nonprofit-census-adjudication.json`, `schoolhouse-nc-static-nonprofit-census-candidate-rows.jsonl`, `schoolhouse-nc-static-nonprofit-census-block-hit-receipts.jsonl`, and `source-inventory-20.jsonl` preserve the exact two-route North Carolina static nonprofit report census. Both pages were acquired and hashed; neither rendered a table row or candidate. The lane retains no response body, address, contact detail, officer row, private support, identity, relationship, or absence claim.\n';
  const filesAddition = `- \`${FILES.custody}\`, \`${FILES.pageReceipts}\`, \`${FILES.linkObservations}\`, \`${FILES.successorRoutes}\`, \`${FILES.fixedTerms}\`, \`${FILES.forms}\`, \`${FILES.scripts}\`, \`${FILES.routePolicy}\`, \`${FILES.adjudication}\`, and \`${FILES.sourceInventory}\` preserve the exact current 1,552-anchor denominator for the same two official North Carolina static nonprofit pages. Both body hashes changed while anchor cardinality remained 246 and 1,306. Seventy location-navigation observations and two generic report/listing routes were retained; no School.House, source-listed-person, query-bearing report, entity-detail, static-data, static-document, identity, relationship, or absence finding was admitted.\n`;
  text = replaceOnce(text, filesMarker, filesMarker + filesAddition, 'README anchor files');
  const narrativeMarker = 'The lawful-route successor then enumerated eight official roots';
  const narrativeAddition = 'The current-anchor successor then enumerated every anchor on those same two North Carolina pages: 246 on the nonprofits-by-county page and 1,306 on the unincorporated-nonprofits page. Both response bodies changed, but neither anchor denominator changed. The seventy fixed-term rows are Cumberland, Fayetteville, or North Carolina navigation labels; subject and source-listed-person anchor hits remain zero. The only eligible same-host successors are a generic Business Registration landing page and an unrelated Non-Participating Tobacco listing. Neither is an entity-detail or query-bearing School.House surface, so the current static anchor frontier is terminal without another fetch.\n\n';
  text = replaceOnce(text, narrativeMarker, narrativeAddition + narrativeMarker, 'README anchor narrative');
  fs.writeFileSync(file, text);
}

function standaloneValidatorSource(parentTree) {
  return `import crypto from 'node:crypto';\nimport fs from 'node:fs';\nimport path from 'node:path';\nimport { fileURLToPath } from 'node:url';\n\nconst DEFAULT_DIR = 'data/intake/bvvc-defense-capital';\nconst readJson = file => JSON.parse(fs.readFileSync(file, 'utf8'));\nconst readJsonl = file => fs.readFileSync(file, 'utf8').split(/\\r?\\n/).filter(Boolean).map(JSON.parse);\nconst sha256 = file => crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');\n\nexport function validateSchoolhouseNcStaticNonprofitAnchorCustody(dir = DEFAULT_DIR) {\n  const errors = [];\n  const check = (condition, message) => { if (!condition) errors.push(message); };\n  const manifest = readJson(path.join(dir, 'manifest.json'));\n  const coverage = readJson(path.join(dir, 'coverage-matrix.json'));\n  const frontier = readJson(path.join(dir, 'acquisition-frontier.json'));\n  const schoolhouse = readJson(path.join(dir, 'schoolhouse.json'));\n  const pages = readJsonl(path.join(dir, '${FILES.pageReceipts}'));\n  const links = readJsonl(path.join(dir, '${FILES.linkObservations}'));\n  const successors = readJsonl(path.join(dir, '${FILES.successorRoutes}'));\n  const fixed = readJsonl(path.join(dir, '${FILES.fixedTerms}'));\n  const forms = readJsonl(path.join(dir, '${FILES.forms}'));\n  const scripts = readJsonl(path.join(dir, '${FILES.scripts}'));\n  const policy = readJson(path.join(dir, '${FILES.routePolicy}'));\n  const adjudication = readJson(path.join(dir, '${FILES.adjudication}'));\n  const custody = readJson(path.join(dir, '${FILES.custody}'));\n  const sourceRows = readJsonl(path.join(dir, '${FILES.sourceInventory}'));\n\n  check(manifest.counts.source_inventory_rows === 482, 'source inventory denominator');\n  check(manifest.counts.coverage_denominator_rows === 31, 'coverage denominator');\n  check(manifest.counts.explicit_gap_rows === 16, 'gap denominator');\n  check(manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-20.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === '${FILES.sourceInventory}', 'source inventory tail');\n  check(manifest.source_inventory.evidence_class_counts.official === 257, 'official evidence count');\n  check(manifest.source_inventory.source_state_counts.captured_nc_static_nonprofit_anchor_denominator === 2, 'anchor source-state count');\n  check(coverage.denominators.length === 31, 'coverage length');\n  check(coverage.denominators.some(row => row.surface === 'School.House North Carolina static nonprofit current-anchor denominator' && row.current_anchor_rows === 1552 && row.prior_anchor_rows === 1552 && row.query_bearing_report_routes === 0 && row.entity_detail_candidate_routes === 0 && row.admitted_identities === 0), 'coverage projection');\n\n  check(pages.length === 2 && pages.reduce((sum, row) => sum + row.observed_anchor_rows, 0) === 1552, 'page/anchor denominator');\n  check(pages.every(row => row.body_changed_since_permanent_custody === true && row.anchor_count_changed_since_permanent_custody === false && row.http_status === 200 && row.request_method === 'GET'), 'page state');\n  check(links.length === 1552 && new Set(links.map(row => row.source_route_id + '\\u0000' + row.anchor_ordinal)).size === 1552, 'link denominator');\n  check(successors.length === 2 && successors.every(row => row.route_class === 'report_or_listing_route' && row.query_pair_count === 0 && row.fetch_executed === false), 'successor denominator');\n  check(fixed.length === 70 && fixed.every(row => row.fixed_term_matches.subject.length === 0 && row.fixed_term_matches.person.length === 0 && row.fixed_term_matches.location.length > 0), 'fixed-term denominator');\n  check(forms.length === 0 && scripts.length === 78, 'form/script denominator');\n  check(policy.request_bounds.maximum_total_requests === 2 && policy.request_bounds.successor_fetches === 0 && policy.outside_human_dependency === false && policy.graph_effect === 'none', 'policy boundary');\n  check(adjudication.counts.current_anchor_rows === 1552 && adjudication.counts.entity_detail_candidate_routes === 0 && adjudication.identity_decision.public_schoolhouse_identity_admitted === false && adjudication.identity_decision.negative_existence_claim_created === false, 'adjudication');\n  check(custody.canonical_parent.commit === '${CANONICAL_PARENT_COMMIT}' && custody.canonical_parent.tree === '${parentTree}', 'parent custody');\n  check(custody.acquisition.workflow_run_id === ${ACQUISITION.workflow_run_id} && custody.acquisition.artifact_id === ${ACQUISITION.artifact_id} && custody.acquisition.artifact_digest === '${ACQUISITION.artifact_digest}', 'acquisition custody');\n  check(custody.counts.current_anchor_rows === 1552 && custody.counts.prior_anchor_rows === 1552 && custody.counts.body_changed_routes === 2 && custody.counts.anchor_count_changed_routes === 0 && custody.counts.entity_detail_candidate_routes === 0, 'custody counts');\n  check(custody.terminal_frontier.current_two_route_anchor_denominator_terminal === true && custody.terminal_frontier.generic_successor_route_dispositions_terminal === true && custody.terminal_frontier.outside_human_dependency === false, 'terminal frontier');\n  check(custody.public_schoolhouse_identity_admitted === false && custody.relationship_admitted === false && custody.negative_existence_claim_created === false && custody.outside_human_dependency === false && custody.graph_effect === 'none', 'custody authority');\n  check(sourceRows.length === 2 && new Set(sourceRows.map(row => row.receipt_id)).size === 2, 'source inventory rows');\n  check(sourceRows.every(row => row.evidence_class === 'official' && row.source_state === 'captured_nc_static_nonprofit_anchor_denominator' && row.observed_anchor_rows > 0 && row.source_rows_acquired === 0 && row.candidate_rows === 0), 'source inventory semantics');\n  check(sourceRows.every(row => row.query_submitted === false && row.form_submitted === false && row.successor_fetches_executed === 0 && row.raw_source_retained === false && row.street_address_rows_retained === 0 && row.contact_detail_rows_retained === 0 && row.private_support_rows === 0), 'source inventory privacy');\n  check(sourceRows.every(row => row.identity_admitted === false && row.relationship_admitted === false && row.negative_existence_claim_created === false && row.outside_human_dependency === false && row.publication_effect === 'none' && row.adoption_effect === 'none' && row.graph_effect === 'none'), 'source inventory authority');\n  const projection = schoolhouse.state_registry_identity_census?.north_carolina_static_nonprofit_anchor_census;\n  check(projection?.current_anchor_rows === 1552 && projection?.query_bearing_report_routes === 0 && projection?.entity_detail_candidate_routes === 0 && projection?.public_schoolhouse_identity_admitted === false, 'School.House projection');\n  const task = frontier.tasks.find(row => row.task_id === 'bvvc-frontier-schoolhouse-legal-governance')?.prior_nc_static_nonprofit_anchor_census;\n  check(task?.current_anchor_rows === 1552 && task?.query_bearing_report_routes === 0 && task?.entity_detail_candidate_routes === 0 && task?.admitted_identities === 0, 'frontier projection');\n  for (const filename of ['${FILES.pageReceipts}','${FILES.linkObservations}','${FILES.successorRoutes}','${FILES.fixedTerms}','${FILES.forms}','${FILES.scripts}','${FILES.routePolicy}','${FILES.adjudication}','${FILES.custody}','${FILES.sourceInventory}']) {\n    const expected = manifest.files[filename];\n    const file = path.join(dir, filename);\n    check(Boolean(expected) && fs.existsSync(file), 'manifest-bound file missing: ' + filename);\n    if (expected && fs.existsSync(file)) { check(fs.statSync(file).size === expected.bytes, 'byte drift: ' + filename); check(sha256(file) === expected.sha256, 'hash drift: ' + filename); }\n  }\n  return errors;\n}\n\nif (process.argv[1] === fileURLToPath(import.meta.url)) {\n  const errors = validateSchoolhouseNcStaticNonprofitAnchorCustody(process.argv[2] || DEFAULT_DIR);\n  if (errors.length) { for (const error of errors) console.error('ERROR: ' + error); process.exit(1); }\n  console.log('School.House NC static nonprofit anchor custody: PASS');\n}\n`;
}

function updateValidators(parentTree) {
  const mainFile = path.resolve('tools/validate-bvvc-defense-capital.mjs');
  let main = fs.readFileSync(mainFile, 'utf8');
  main = replaceAllChecked(main, 'source_inventory_rows === 480', 'source_inventory_rows === 482', 'main source denominators');
  main = replaceAllChecked(main, 'coverage_denominator_rows === 30', 'coverage_denominator_rows === 31', 'main coverage denominators');
  main = replaceAllChecked(main, 'sourceInventory.length === 480', 'sourceInventory.length === 482', 'main source length');
  main = replaceAllChecked(main, 'coverage.denominators.length === 30', 'coverage.denominators.length === 31', 'main coverage length');
  main = replaceAllChecked(main, 'evidence_class_counts.official === 255', 'evidence_class_counts.official === 257', 'main official counts');
  const longTail = "manifest.storage_contract.source_inventory_parts.at(-4) === 'source-inventory-17.jsonl' && manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-18.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-20.jsonl'";
  const longerTail = "manifest.storage_contract.source_inventory_parts.at(-5) === 'source-inventory-17.jsonl' && manifest.storage_contract.source_inventory_parts.at(-4) === 'source-inventory-18.jsonl' && manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-20.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-21.jsonl'";
  main = replaceOnce(main, longTail, longerTail, 'main historical source tail');
  const corporateTail = "manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-20.jsonl'";
  const corporateTailNext = "manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-20.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-21.jsonl'";
  main = replaceOnce(main, corporateTail, corporateTailNext, 'main corporate source tail');
  const importMarker = "import { validateSchoolhouseNcStaticNonprofitCustody } from './validate-schoolhouse-nc-static-nonprofit-custody.mjs';\n";
  main = replaceOnce(main, importMarker, importMarker + "import { validateSchoolhouseNcStaticNonprofitAnchorCustody } from './validate-schoolhouse-nc-static-nonprofit-anchor-custody.mjs';\n", 'main anchor validator import');
  const callMarker = "  for (const error of validateSchoolhouseNcStaticNonprofitCustody(dir)) errors.push(`School.House NC static nonprofit: ${error}`);\n";
  main = replaceOnce(main, callMarker, "  for (const error of validateSchoolhouseNcStaticNonprofitAnchorCustody(dir)) errors.push(`School.House NC static nonprofit anchors: ${error}`);\n\n" + callMarker, 'main anchor validator call');
  fs.writeFileSync(mainFile, main);

  const priorFile = path.resolve('tools/validate-schoolhouse-nc-static-nonprofit-custody.mjs');
  let prior = fs.readFileSync(priorFile, 'utf8');
  prior = replaceOnce(prior, 'source_inventory_rows === 480', 'source_inventory_rows === 482', 'prior NC source denominator');
  prior = replaceOnce(prior, 'coverage_denominator_rows === 30', 'coverage_denominator_rows === 31', 'prior NC coverage denominator');
  prior = replaceOnce(prior, 'evidence_class_counts.official === 255', 'evidence_class_counts.official === 257', 'prior NC official count');
  prior = replaceOnce(prior, 'coverage.denominators.length === 30', 'coverage.denominators.length === 31', 'prior NC coverage length');
  prior = replaceOnce(prior, "manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-20.jsonl'", "manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-20.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-21.jsonl'", 'prior NC source tail');
  fs.writeFileSync(priorFile, prior);

  const honorFile = path.resolve('tools/validate-schoolhouse-honor-foundation-990-custody.mjs');
  let honor = fs.readFileSync(honorFile, 'utf8');
  honor = replaceOnce(honor, 'source_inventory_rows === 480', 'source_inventory_rows === 482', 'Honor source denominator');
  honor = replaceOnce(honor, 'coverage_denominator_rows === 30', 'coverage_denominator_rows === 31', 'Honor coverage denominator');
  honor = replaceOnce(honor, 'evidence_class_counts.official === 255', 'evidence_class_counts.official === 257', 'Honor official count');
  honor = replaceOnce(honor, "manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-18.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-20.jsonl'", "manifest.storage_contract.source_inventory_parts.at(-4) === 'source-inventory-18.jsonl' && manifest.storage_contract.source_inventory_parts.at(-3) === 'source-inventory-19.jsonl' && manifest.storage_contract.source_inventory_parts.at(-2) === 'source-inventory-20.jsonl' && manifest.storage_contract.source_inventory_parts.at(-1) === 'source-inventory-21.jsonl'", 'Honor source tail');
  fs.writeFileSync(honorFile, honor);

  fs.writeFileSync(path.resolve('tools/validate-schoolhouse-nc-static-nonprofit-anchor-custody.mjs'), standaloneValidatorSource(parentTree));
}

function updateManifest() {
  const file = path.join(DATA_DIR, 'manifest.json');
  const manifest = readJson(file);
  manifest.counts.source_inventory_rows = EXPECTED_SOURCE_ROWS;
  manifest.counts.coverage_denominator_rows = EXPECTED_COVERAGE_ROWS;
  Object.assign(manifest.counts, {
    schoolhouse_nc_static_nonprofit_anchor_source_routes: 2,
    schoolhouse_nc_static_nonprofit_anchor_current_rows: 1552,
    schoolhouse_nc_static_nonprofit_anchor_prior_rows: 1552,
    schoolhouse_nc_static_nonprofit_anchor_body_changed_routes: 2,
    schoolhouse_nc_static_nonprofit_anchor_count_changed_routes: 0,
    schoolhouse_nc_static_nonprofit_anchor_fixed_term_rows: 70,
    schoolhouse_nc_static_nonprofit_anchor_subject_term_rows: 0,
    schoolhouse_nc_static_nonprofit_anchor_person_term_rows: 0,
    schoolhouse_nc_static_nonprofit_anchor_location_term_rows: 70,
    schoolhouse_nc_static_nonprofit_anchor_form_rows: 0,
    schoolhouse_nc_static_nonprofit_anchor_script_route_rows: 78,
    schoolhouse_nc_static_nonprofit_anchor_eligible_successor_routes: 2,
    schoolhouse_nc_static_nonprofit_anchor_query_bearing_report_routes: 0,
    schoolhouse_nc_static_nonprofit_anchor_entity_detail_routes: 0,
    schoolhouse_nc_static_nonprofit_anchor_successor_fetches: 0,
    schoolhouse_nc_static_nonprofit_anchor_admitted_identity_rows: 0,
    schoolhouse_nc_static_nonprofit_anchor_negative_existence_claims: 0,
  });
  assert.equal(manifest.storage_contract.source_inventory_parts.at(-1), 'source-inventory-20.jsonl');
  manifest.storage_contract.source_inventory_parts.push(FILES.sourceInventory);
  Object.assign(manifest.storage_contract, {
    schoolhouse_nc_static_nonprofit_anchor_page_receipts: FILES.pageReceipts,
    schoolhouse_nc_static_nonprofit_anchor_link_observations: FILES.linkObservations,
    schoolhouse_nc_static_nonprofit_anchor_successor_routes: FILES.successorRoutes,
    schoolhouse_nc_static_nonprofit_anchor_fixed_term_observations: FILES.fixedTerms,
    schoolhouse_nc_static_nonprofit_anchor_form_observations: FILES.forms,
    schoolhouse_nc_static_nonprofit_anchor_script_route_observations: FILES.scripts,
    schoolhouse_nc_static_nonprofit_anchor_route_policy: FILES.routePolicy,
    schoolhouse_nc_static_nonprofit_anchor_adjudication: FILES.adjudication,
    schoolhouse_nc_static_nonprofit_anchor_custody: FILES.custody,
  });
  manifest.source_inventory.evidence_class_counts.official += 2;
  manifest.source_inventory.source_state_counts.captured_nc_static_nonprofit_anchor_denominator = 2;
  manifest.coverage.schoolhouse_nc_static_nonprofit_anchor_census = '2_of_2_current_pages_1552_of_1552_stable_anchor_rows_2_changed_bodies_70_location_terms_zero_subject_person_entity_query_identity';
  manifest.boundaries.push('A static page anchor, location label, generic Business Registration link, or unrelated program listing is not a registry-grade School.House legal identity, formation, officer, sponsor, funding, governance, or control record.');
  manifest.boundaries.push('Stable anchor cardinality across changed North Carolina page bytes and zero School.House or source-listed-person anchor signals do not establish record stability, identity, or entity absence.');
  manifest.custody.next_waterline = 'materially_distinct_registry_grade_schoolhouse_legal_name_ein_exemption_formation_officer_board_funding_fiscal_sponsor_related_party_or_state_only_evidence';
  for (const filename of [
    'acquisition-frontier.json','coverage-matrix.json','schoolhouse.json',
    FILES.pageReceipts,FILES.linkObservations,FILES.successorRoutes,FILES.fixedTerms,FILES.forms,FILES.scripts,FILES.routePolicy,FILES.adjudication,FILES.custody,FILES.sourceInventory,
  ]) manifest.files[filename] = fileReceipt(filename);
  writeJson(file, manifest);
}

function main() {
  const artifactDir = process.argv[2];
  assert(artifactDir, 'usage: node build-schoolhouse-nc-static-nonprofit-anchor-custody.mjs <artifact-dir>');
  verifyPredecessor();
  const parentTree = currentTree();
  const artifact = verifyArtifact(path.resolve(artifactDir));

  fs.mkdirSync(path.resolve('tools'), { recursive: true });
  fs.writeFileSync(path.resolve('tools/build-schoolhouse-nc-static-nonprofit-anchor-custody.mjs'), selfSource());
  copyArtifactFile(artifactDir, 'page-receipts.jsonl', FILES.pageReceipts);
  copyArtifactFile(artifactDir, 'link-observations.jsonl', FILES.linkObservations);
  copyArtifactFile(artifactDir, 'successor-routes.jsonl', FILES.successorRoutes);
  copyArtifactFile(artifactDir, 'fixed-term-observations.jsonl', FILES.fixedTerms);
  copyArtifactFile(artifactDir, 'form-observations.jsonl', FILES.forms);
  copyArtifactFile(artifactDir, 'script-route-observations.jsonl', FILES.scripts);
  copyArtifactFile(artifactDir, 'route-policy.json', FILES.routePolicy);
  writeJsonl(path.join(DATA_DIR, FILES.sourceInventory), sourceInventoryRows(artifact));
  writeJson(path.join(DATA_DIR, FILES.adjudication), buildAdjudication(artifact));
  writeJson(path.join(DATA_DIR, FILES.custody), buildCustody(artifact, parentTree));

  updateSchoolhouse();
  updateFrontier();
  updateCoverage();
  updateReadme();
  updateValidators(parentTree);
  updateManifest();

  const actualPaths = PERMANENT_PATHS.filter(file => fs.existsSync(file));
  assert.deepEqual(actualPaths, PERMANENT_PATHS, 'permanent path creation drift');
  const output = {
    schema_version: 'schoolhouse-nc-static-nonprofit-anchor-custody-build@1',
    canonical_parent_commit: CANONICAL_PARENT_COMMIT,
    canonical_parent_tree: parentTree,
    acquisition_workflow_run_id: ACQUISITION.workflow_run_id,
    acquisition_artifact_id: ACQUISITION.artifact_id,
    acquisition_artifact_digest: ACQUISITION.artifact_digest,
    source_inventory_rows: EXPECTED_SOURCE_ROWS,
    coverage_denominator_rows: EXPECTED_COVERAGE_ROWS,
    explicit_gap_rows: EXPECTED_GAP_ROWS,
    current_anchor_rows: 1552,
    prior_anchor_rows: 1552,
    body_changed_routes: 2,
    anchor_count_changed_routes: 0,
    fixed_term_observation_rows: 70,
    subject_term_observation_rows: 0,
    person_term_observation_rows: 0,
    eligible_successor_routes: 2,
    query_bearing_report_routes: 0,
    entity_detail_candidate_routes: 0,
    identity_admitted_rows: 0,
    permanent_files: PERMANENT_PATHS.length,
    permanent_paths: PERMANENT_PATHS,
    outside_human_dependency: false,
    publication_effect: 'none',
    adoption_effect: 'none',
    graph_effect: 'none',
  };
  console.log(canonicalJson(output));
}

main();
