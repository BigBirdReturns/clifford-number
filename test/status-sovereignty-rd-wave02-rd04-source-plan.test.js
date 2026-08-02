#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  buildPlan,
  locatorsForUnit
} from '../tools/acquisition/status-sovereignty-rd-wave02-rd04/build-source-plan.mjs';

const unit = (authorityUnitId, authorityClass, referenceIds) => ({
  authority_unit_id: authorityUnitId,
  authority_class: authorityClass,
  reference_ids: referenceIds
});

const acl = locatorsForUnit(unit(
  'AUTH-CA-ACL-25-79',
  'california_all_county_letter',
  ['CA-ACL-25-79']
));
assert.equal(acl.length, 1);
assert.equal(
  acl[0].url,
  'https://www.cdss.ca.gov/Portals/9/Additional-Resources/Letters-and-Notices/ACLs/2025/25-79.pdf'
);
assert.equal(acl[0].expected_content_class, 'pdf');

const acin = locatorsForUnit(unit(
  'AUTH-CA-ACIN-I-35-25',
  'california_all_county_information_notice',
  ['CA-ACIN-I-35-25']
));
assert.equal(
  acin[0].url,
  'https://www.cdss.ca.gov/Portals/9/Additional-Resources/Letters-and-Notices/ACINs/2025/I-35_25.pdf'
);

const manual = locatorsForUnit(unit(
  'AUTH-CA-MPP-42-701.2',
  'california_manual_section',
  ['CA-MPP-42-701.2(d)(3)-(5)']
));
assert.equal(manual.length, 2);
assert.deepEqual(manual.map((row) => row.priority), [1, 2]);
assert(manual.every((row) => row.expected_content_class === 'docx'));

const cfr = locatorsForUnit(unit(
  'AUTH-7-CFR-273.24',
  'federal_regulation_section',
  ['7-CFR-273.24(b)(2)']
));
assert.equal(
  cfr[0].url,
  'https://www.ecfr.gov/current/title-7/subtitle-B/chapter-II/subchapter-C/part-273/section-273.24'
);

const statute = locatorsForUnit(unit(
  'AUTH-US-FNA-2008',
  'federal_statute',
  ['US-FNA-2008', 'US-FNA-2008-SEC-6(o)']
));
assert.equal(
  statute[0].url,
  'https://www.govinfo.gov/content/pkg/COMPS-10331/pdf/COMPS-10331.pdf'
);

const syntheticAuthority = {
  authority_units: [
    unit('AUTH-CA-ACL-25-79', 'california_all_county_letter', ['CA-ACL-25-79']),
    unit('AUTH-CA-MPP-21-115.2', 'california_manual_section', ['CA-MPP-21-115.2'])
  ]
};
const syntheticSeed = {
  execution: { workflow_run: 1, artifact_id: 2 },
  source_terminal_ledger: [
    {
      ordinal: 1,
      source_id: 'FED-PL119-21',
      terminal_state: 'http_non_200_after_bounded_retry',
      attempts: 2,
      http_status: 403,
      body_bytes: 1,
      body_sha256: '0'.repeat(64)
    },
    {
      ordinal: 2,
      source_id: 'SEED-OK',
      terminal_state: 'http_success',
      attempts: 1,
      http_status: 200,
      body_bytes: 2,
      body_sha256: '1'.repeat(64)
    }
  ]
};
const plan = buildPlan(syntheticAuthority, syntheticSeed);
assert.equal(plan.reused_seed_units.length, 1);
assert.equal(plan.target_units.length, 3);
assert.equal(plan.target_units.at(-1).execution_unit_id, 'SEED-FED-PL119-21');
assert.equal(
  plan.target_units.at(-1).locator_candidates[0].url,
  'https://www.govinfo.gov/content/pkg/PLAW-119publ21/pdf/PLAW-119publ21.pdf'
);
assert.equal(plan.routes.length, 3);
assert(plan.routes.every((route) => route.target_unit_ids.length >= 1));
assert.equal(plan.protocol.fixed_before_fetch, true);
assert.equal(plan.protocol.outcome_selected_retry, false);
assert.equal(plan.boundaries.locator_is_source_custody, false);
assert.equal(plan.boundaries.failed_route_is_noncompliance, false);

console.log(
  'status-sovereignty-rd-wave02-rd04-source-plan.test: ' +
    'exact official locators, shared routes, seed recovery, and authority boundaries passed'
);
