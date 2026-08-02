#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  authorityClass,
  authorityUnitId,
  deriveUnits,
  locatorStrategy
} from '../tools/acquisition/status-sovereignty-rd-wave02-rd04/derive-authority-units.mjs';

const fixture = [
  {
    reference_id: '7-CFR-273.7(m)(6)(i)(a)',
    reference_class: 'cfr',
    disposition: 'new_cross_reference_candidate',
    occurrence_count: 2,
    source_ids: ['S1'],
    occurrences: [{ source_id: 'S1' }, { source_id: 'S1' }]
  },
  {
    reference_id: '7-CFR-273.7(m)(6)(i)(b)',
    reference_class: 'cfr',
    disposition: 'new_cross_reference_candidate',
    occurrence_count: 1,
    source_ids: ['S2'],
    occurrences: [{ source_id: 'S2' }]
  },
  {
    reference_id: 'CA-WIC-11403(b)(4)',
    reference_class: 'california_welfare_and_institutions_code',
    disposition: 'new_cross_reference_candidate',
    occurrence_count: 1,
    source_ids: ['S3'],
    occurrences: [{ source_id: 'S3' }]
  },
  {
    reference_id: 'US-FNA-2008',
    reference_class: 'food_and_nutrition_act_2008',
    disposition: 'new_cross_reference_candidate',
    occurrence_count: 3,
    source_ids: ['S4'],
    occurrences: [{ source_id: 'S4' }, { source_id: 'S4' }, { source_id: 'S4' }]
  },
  {
    reference_id: 'US-FNA-2008-SEC-6(o)',
    reference_class: 'statutory_section',
    disposition: 'new_cross_reference_candidate',
    occurrence_count: 3,
    source_ids: ['S4'],
    occurrences: [{ source_id: 'S4' }, { source_id: 'S4' }, { source_id: 'S4' }]
  },
  {
    reference_id: 'CA-ACL-25-93',
    reference_class: 'california_all_county_letter',
    disposition: 'seed_alias',
    occurrence_count: 1,
    source_ids: ['SEED'],
    occurrences: [{ source_id: 'SEED' }]
  }
];

assert.equal(authorityUnitId('7-CFR-273.7(m)(6)(i)(a)', 'cfr'), 'AUTH-7-CFR-273.7');
assert.equal(authorityUnitId('25-USC-1603(13)', 'usc'), 'AUTH-25-USC-1603');
assert.equal(
  authorityUnitId(
    'CA-MPP-42-701.2(d)(3)-(5)',
    'california_manual_of_policies_and_procedures'
  ),
  'AUTH-CA-MPP-42-701.2'
);
assert.equal(
  authorityUnitId(
    'CA-WIC-11403(b)(4)',
    'california_welfare_and_institutions_code'
  ),
  'AUTH-CA-WIC-11403'
);
assert.equal(
  authorityUnitId('US-FNA-2008-SEC-6(o)', 'statutory_section'),
  'AUTH-US-FNA-2008'
);
assert.equal(authorityClass('cfr'), 'federal_regulation_section');
assert.equal(authorityClass('fns_memo'), 'federal_guidance_document');
assert.equal(
  locatorStrategy('california_manual_section'),
  'cdss_manual_exact_section_and_revision_history'
);

const units = deriveUnits(fixture);
assert.equal(units.length, 3, 'seed alias entered candidate-unit denominator');
assert.deepEqual(
  units.find((unit) => unit.authority_unit_id === 'AUTH-7-CFR-273.7').reference_ids,
  ['7-CFR-273.7(m)(6)(i)(a)', '7-CFR-273.7(m)(6)(i)(b)']
);
assert.equal(
  units.find((unit) => unit.authority_unit_id === 'AUTH-7-CFR-273.7').occurrence_count,
  3
);
assert.deepEqual(
  units.find((unit) => unit.authority_unit_id === 'AUTH-US-FNA-2008').reference_ids,
  ['US-FNA-2008', 'US-FNA-2008-SEC-6(o)']
);
assert.equal(units.flatMap((unit) => unit.reference_ids).length, 5);

for (const unit of units) {
  assert.equal(unit.source_state, 'fixed_protocol_not_yet_executed');
  assert.equal(unit.chronology_state, 'not_adjudicated');
  assert.equal(unit.version_edges_adjudicated, 0);
  assert.equal(unit.class_effect, 'none');
}

console.log(
  'status-sovereignty-rd-wave02-rd04-authority-units.test: ' +
    'exact-once mapping, root grouping, seed exclusion, locator, and authority controls passed'
);
