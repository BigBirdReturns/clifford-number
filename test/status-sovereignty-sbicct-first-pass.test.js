#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSbicctFirstPassContext, validateSbicctFirstPass } from '../tools/validate-status-sovereignty-sbicct-first-pass.mjs';

const clean = loadSbicctFirstPassContext();
assert.deepEqual(validateSbicctFirstPass(clean), [], 'clean SBIC Critical Technologies first pass must validate');
const clone = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'string' ? value : structuredClone(value)]));
const mutations = [
  ['record schema', (c) => { c.record.schema_version = 'other'; }, 'Record schema'],
  ['hypothesis identity', (c) => { c.record.hypothesis_id = 'OTHER'; }, 'Hypothesis identity'],
  ['issue identity', (c) => { c.record.issue = 0; }, 'Issue identity'],
  ['observation identity', (c) => { c.record.observation_id = 'OTHER'; }, 'Observation identity'],
  ['lane identity', (c) => { c.record.lane_id = 'SSC-F11'; }, 'Lane identity'],
  ['record status', (c) => { c.record.status = 'complete'; }, 'Record status'],
  ['authority inflation', (c) => { c.record.authority = 'adjudication'; }, 'Authority ceiling'],
  ['parent path', (c) => { c.record.parent_custody.path = 'other'; }, 'Parent custody path'],
  ['parent state', (c) => { c.record.parent_custody.state = 'closed'; }, 'Parent custody state'],
  ['source removed', (c) => { c.record.sources.pop(); }, 'Source count'],
  ['source ID duplicate', (c) => { c.record.sources[1].source_id = c.record.sources[0].source_id; }, 'Source IDs must be unique'],
  ['source URL duplicate', (c) => { c.record.sources[1].url = c.record.sources[0].url; }, 'Source URLs must be unique'],
  ['source class drift', (c) => { c.record.sources[1].source_class = 'press_summary'; }, 'Source class 2'],
  ['source facts erased', (c) => { c.record.sources[0].retrieved_facts = []; }, 'Recovered fact count 1'],
  ['source URL insecure', (c) => { c.record.sources[0].url = 'http://example.test'; }, 'Source URL 1 must be HTTPS'],
  ['interest checkpoint inflation', (c) => { c.record.recovered_checkpoints.expressions_of_interest_minimum = 101; }, 'Recovered checkpoints'],
  ['application checkpoint drift', (c) => { c.record.recovered_checkpoints.formal_applications_as_of_2024_10_22 = 23; }, 'Recovered checkpoints'],
  ['approval checkpoint drift', (c) => { c.record.recovered_checkpoints.approved_as_of_2024_10_22 = 14; }, 'Recovered checkpoints'],
  ['cohort checkpoint drift', (c) => { c.record.recovered_checkpoints.first_published_cohort = 19; }, 'Recovered checkpoints'],
  ['named cohort drift', (c) => { c.record.recovered_checkpoints.publicly_named_first_cohort = 18; }, 'Recovered checkpoints'],
  ['withheld cohort erased', (c) => { c.record.recovered_checkpoints.withheld_first_cohort = 0; }, 'Recovered checkpoints'],
  ['licensed checkpoint inflated', (c) => { c.record.recovered_checkpoints.fully_licensed_as_of_2025_01_17 = 18; }, 'Recovered checkpoints'],
  ['state boundary removed', (c) => { c.record.state_distinctions.pop(); }, 'State distinctions'],
  ['state boundary rewritten', (c) => { c.record.state_distinctions[3] = 'license_equals_draw'; }, 'State distinctions'],
  ['state boundary duplicated', (c) => { c.record.state_distinctions[1] = c.record.state_distinctions[0]; }, 'State distinctions'],
  ['open denominator removed', (c) => { c.record.open_denominators.pop(); }, 'Open denominator count'],
  ['open denominator duplicated', (c) => { c.record.open_denominators[1] = c.record.open_denominators[0]; }, 'Open denominators must be unique'],
  ['terminal state closed', (c) => { c.record.current_result.terminal_state = 'complete'; }, 'Current result'],
  ['reviewed disposition changed', (c) => { c.record.current_result.reviewed_disposition_changed = true; }, 'Current result'],
  ['risk/recovery chain invented', (c) => { c.record.current_result.complete_public_private_risk_and_recovery_chain = true; }, 'Current result'],
  ['capital conversion invented', (c) => { c.record.current_result.capital_conversion_finding = true; }, 'Current result'],
  ['compact finding invented', (c) => { c.record.current_result.complete_compact_finding = true; }, 'Current result'],
  ['graph effect invented', (c) => { c.record.current_result.graph_effect = 'edge'; }, 'Current result'],
  ['publication effect invented', (c) => { c.record.current_result.publication_effect = 'public'; }, 'Current result'],
  ['membership favoritism shortcut', (c) => { c.record.boundaries.program_membership_proves_favoritism = true; }, 'Authority boundaries'],
  ['license draw shortcut', (c) => { c.record.boundaries.license_proves_leverage_draw = true; }, 'Authority boundaries'],
  ['projection performance shortcut', (c) => { c.record.boundaries.projected_portfolio_count_proves_realized_investment = true; }, 'Authority boundaries'],
  ['private return recovery shortcut', (c) => { c.record.boundaries.private_return_proves_public_recovery = true; }, 'Authority boundaries'],
  ['public leverage extraction shortcut', (c) => { c.record.boundaries.public_leverage_proves_extraction = true; }, 'Authority boundaries'],
  ['shared program coordination shortcut', (c) => { c.record.boundaries.shared_program_proves_coordination = true; }, 'Authority boundaries'],
  ['schema issue drift', (c) => { c.schema.properties.issue.const = 0; }, 'Schema issue'],
  ['schema source minimum drift', (c) => { c.schema.properties.sources.minItems = 1; }, 'Schema source minimum'],
  ['manifest drift', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'Exact-byte release manifest'],
  ['build manifest drift', (c) => { c.buildManifest.combined_sha256 = 'e'.repeat(64); }, 'Build manifest drift'],
  ['report drift', (c) => { c.publicReport.counts.observed_public_recovery_denominators = 1; }, 'Build/public report drift'],
  ['report count inflation', (c) => { c.buildReport.counts.complete_fund_flow_denominators = 1; c.publicReport.counts.complete_fund_flow_denominators = 1; }, 'Report count complete_fund_flow_denominators'],
  ['HTML license boundary erased', (c) => { c.html = c.html.replace('LICENSE NOT DRAW', 'LICENSE IS DRAW'); }, 'HTML license/draw boundary missing'],
  ['HTML performance boundary erased', (c) => { c.html = c.html.replace('PROJECTED INVESTMENT NOT REALIZED PERFORMANCE', 'PROJECTED INVESTMENT IS PERFORMANCE'); }, 'HTML projection/performance boundary missing'],
  ['HTML recovery boundary erased', (c) => { c.html = c.html.replace('PUBLIC RECOVERY UNOBSERVED', 'PUBLIC RECOVERY OBSERVED'); }, 'HTML public-recovery boundary missing'],
  ['HTML digest erased', (c) => { c.html = c.html.replace(c.manifest.combined_sha256, '0'.repeat(64)); }, 'HTML release digest missing'],
  ['HTML noindex erased', (c) => { c.html = c.html.replace('noindex,nofollow', 'index,follow'); }, 'HTML noindex boundary missing']
];

for (const [name, mutate, expected] of mutations) {
  const context = clone();
  mutate(context);
  const errors = validateSbicctFirstPass(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`status-sovereignty-sbicct-first-pass.test: ${mutations.length} adversarial mutations PASS`);
