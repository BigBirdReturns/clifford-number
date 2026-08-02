#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  verifyCoreObject,
  validateRepository
} from '../tools/validate-status-sovereignty-rd04-public-implementation-receipts-a07.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const custody = path.join(root, 'data/intake/status-sovereignty-rd04-public-implementation-receipts-a07/source-custody');
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const clone = (value) => JSON.parse(JSON.stringify(value));

const core = readJson(path.join(root, 'data/intake/status-sovereignty-rd04-public-implementation-receipts-a07/core.json'));
const evidence = {
  shn: readJson(path.join(custody, 'shn-full/summary.json')),
  candidate: readJson(path.join(custody, 'candidate-receipts/summary.json')),
  sitemap: readJson(path.join(custody, 'sitemap-probe/summary.json')),
  crawl: readJson(path.join(custody, 'official-crawl/summary.json'))
};

assert.deepEqual(verifyCoreObject(core, evidence), [], 'canonical A07 core must verify');
assert.deepEqual(validateRepository(), [], 'canonical A07 repository must verify');

const mutations = [];
const add = (name, mutate) => mutations.push({ name, mutate });

add('schema version', (x) => { x.schema_version = 'ssc-rd04-a07-core@0'; });
add('hypothesis', (x) => { x.hypothesis_id = 'SSC-H00'; });
add('lane', (x) => { x.lane_id = 'SSC-RDXX'; });
add('execution', (x) => { x.execution_id = 'SSC-RD04-A07-OTHER'; });
add('issue', (x) => { x.issue = 0; });
add('date', (x) => { x.as_of = '2026-08-03'; });
add('status', (x) => { x.status = 'complete'; });

for (const [key, replacement] of [
  ['execution_id', 'OTHER'],
  ['release_sha256', '0'.repeat(64)],
  ['registry_rows', 12281],
  ['documents', 11671],
  ['D1_relief_rows', 6632],
  ['D1_relief_documents', 6293],
  ['D1_unique_nonblank_shns', 6291]
]) add(`parent ${key}`, (x) => { x.parent[key] = replacement; });

add('denominator D1', (x) => { x.denominator_contract.D1_shns = 6291; });
add('outcome selection', (x) => { x.denominator_contract.outcome_selection_before_search = true; });
add('outside dependency', (x) => { x.denominator_contract.outside_human_dependency = true; });
add('project blocking', (x) => { x.denominator_contract.project_blocking = true; });
add('empty sitemap seeds', (x) => { x.denominator_contract.official_sitemap_seeds = []; });

add('remove stage', (x) => { x.stages.pop(); });
add('duplicate stage', (x) => { x.stages[6].stage_id = 'A07-S1'; });
add('missing stage title', (x) => { x.stages[2].title = ''; });
add('missing stage state', (x) => { x.stages[3].state = ''; });
add('missing stage finding', (x) => { x.stages[4].finding = ''; });

for (const key of Object.keys(core.counts)) {
  add(`negative count ${key}`, (x) => { x.counts[key] = -1; });
}
add('query receipts below denominator', (x) => { x.counts.exact_shn_query_receipts = 6291; });
add('candidate partition', (x) => { x.counts.valid_candidate_pdfs += 1; });
add('selected attempt mismatch', (x) => { x.counts.official_attempted_urls += 1; });
add('success unresolved mismatch', (x) => { x.counts.official_successful_bodies += 1; });
add('implementation receipt fabricated', (x) => { x.counts.verified_public_implementation_receipts = 1; });
add('restoration receipt fabricated', (x) => { x.counts.verified_public_restoration_receipts = 1; });
add('contact fabricated', (x) => { x.counts.external_contacts = 1; });
add('review fabricated', (x) => { x.counts.external_reviews = 1; });
add('adjudication fabricated', (x) => { x.counts.adjudications = 1; });
add('publication fabricated', (x) => { x.counts.publication_clearances = 1; });
add('graph fabricated', (x) => { x.counts.graph_effects = 1; });

for (const [key, replacement] of [
  ['terminal_state', 'success'],
  ['exact_shn_denominator_complete', false],
  ['candidate_document_custody_complete', false],
  ['selected_official_url_attempt_denominator_complete', false],
  ['complete_official_public_web_universe', true],
  ['verified_implementation_supported', true],
  ['verified_restoration_supported', true],
  ['missing_public_receipt_is_noncompliance', true],
  ['residual_class_closed', true],
  ['publication_effect', 'advanced'],
  ['graph_effect', 'advanced'],
  ['adoption_effect', 'A1']
]) add(`current result ${key}`, (x) => { x.current_result[key] = replacement; });

add('handoff id', (x) => { x.next_handoff.acquisition_id = 'SSC-RD04-A99'; });
add('handoff status', (x) => { x.next_handoff.status = 'blocked'; });
add('handoff dependency', (x) => { x.next_handoff.outside_human_dependency = true; });
add('handoff blocking', (x) => { x.next_handoff.project_blocking = true; });
add('handoff shortcuts too short', (x) => { x.next_handoff.forbidden_shortcuts = []; });
add('handoff permits outside waiting', (x) => {
  x.next_handoff.forbidden_shortcuts = x.next_handoff.forbidden_shortcuts.filter((value) => !/outside person|agency response/i.test(value));
});

for (const key of [
  'same_shn_proves_same_claimant',
  'same_shn_proves_implementation',
  'order_proves_compliance',
  'machine_language_candidate_is_verified_receipt',
  'selected_url_denominator_is_complete_official_web_universe',
  'failed_fetch_is_record_absence',
  'missing_public_material_is_noncompliance',
  'result_proves_effective_counterpower',
  'result_proves_national_prevalence',
  'result_proves_racial_hierarchy',
  'result_proves_unlawful_motive',
  'result_proves_coordination',
  'result_proves_common_purpose',
  'result_is_external_review'
]) add(`boundary ${key}`, (x) => { x.boundaries[key] = true; });
add('boundary graph', (x) => { x.boundaries.graph_effect = 'advanced'; });

add('SHN summary status', (_x, e) => { e.shn.status = 'fail'; });
add('SHN summary parent digest', (_x, e) => { e.shn.parent.a06_release_sha256 = '0'.repeat(64); });
add('SHN summary D1 count', (_x, e) => { e.shn.counts.D1_shns = 6291; });
add('SHN summary query receipts', (_x, e) => { e.shn.counts.query_receipts += 1; });
add('SHN summary candidate rows', (_x, e) => { e.shn.counts.public_followup_candidate_rows += 1; });
add('SHN summary candidate documents', (_x, e) => { e.shn.counts.public_followup_candidate_documents += 1; });
add('SHN summary cap', (_x, e) => { e.shn.counts.unresolved_capped_shns = 1; });
add('SHN summary failure', (_x, e) => { e.shn.counts.failures = 1; });

add('candidate summary status', (_x, e) => { e.candidate.status = 'fail'; });
add('candidate D1', (_x, e) => { e.candidate.input.D1_shns = 6291; });
add('candidate row count', (_x, e) => { e.candidate.counts.candidate_rows += 1; });
add('candidate document count', (_x, e) => { e.candidate.counts.candidate_documents += 1; });
add('candidate valid PDFs', (_x, e) => { e.candidate.counts.valid_candidate_pdfs += 1; });
add('candidate invalid documents', (_x, e) => { e.candidate.counts.invalid_candidate_documents += 1; });
add('candidate later documents', (_x, e) => { e.candidate.counts.later_same_shn_documents += 1; });
add('candidate fabricated implementation', (_x, e) => { e.candidate.counts.verified_public_implementation_receipts = 1; });
add('candidate fabricated restoration', (_x, e) => { e.candidate.counts.verified_public_restoration_receipts = 1; });
add('candidate failure', (_x, e) => { e.candidate.counts.failures = 1; });

add('sitemap status', (_x, e) => { e.sitemap.status = 'complete'; });
add('sitemap parent', (_x, e) => { e.sitemap.parent_a06_release_sha256 = '0'.repeat(64); });
add('sitemap seeds', (_x, e) => { e.sitemap.counts.seeds += 1; });
add('sitemap pages', (_x, e) => { e.sitemap.counts.discovered_page_urls += 1; });
add('sitemap candidate URLs', (_x, e) => { e.sitemap.counts.lexical_candidate_urls += 1; });
add('sitemap contact', (_x, e) => { e.sitemap.counts.external_contacts = 1; });

add('crawl status', (_x, e) => { e.crawl.status = 'fail'; });
add('crawl selected', (_x, e) => { e.crawl.counts.selected_urls += 1; });
add('crawl attempted', (_x, e) => { e.crawl.counts.attempted_urls += 1; });
add('crawl successful', (_x, e) => { e.crawl.counts.successful_bodies += 1; });
add('crawl unresolved', (_x, e) => { e.crawl.counts.unresolved_urls += 1; });
add('crawl SHN pages', (_x, e) => { e.crawl.counts.pages_with_exact_D1_shn_strings += 1; });
add('crawl language pages', (_x, e) => { e.crawl.counts.pages_with_qualified_completed_action_language += 1; });
add('crawl structural failure', (_x, e) => { e.crawl.counts.structural_failures = 1; });

for (const { name, mutate } of mutations) {
  const mutatedCore = clone(core);
  const mutatedEvidence = clone(evidence);
  mutate(mutatedCore, mutatedEvidence);
  const errors = verifyCoreObject(mutatedCore, mutatedEvidence);
  assert.ok(errors.length > 0, `mutation must fail: ${name}`);
}

console.log(`status-sovereignty-rd04-public-implementation-receipts-a07.test: ${mutations.length} adversarial mutations PASS`);
