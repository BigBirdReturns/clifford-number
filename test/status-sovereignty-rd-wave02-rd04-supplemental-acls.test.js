#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  classifyPdfText,
  SUPPLEMENTAL_UNITS
} from '../tools/acquisition/status-sovereignty-rd-wave02-rd04/capture-supplemental-acls.mjs';

for (const unit of SUPPLEMENTAL_UNITS) {
  const positive = classifyPdfText(unit, unit.expected_markers.join(' -- '));
  assert.equal(positive.exact_identity_observed, true, unit.execution_unit_id);
  const negative = classifyPdfText(unit, unit.expected_markers.slice(1).join(' '));
  assert.equal(negative.exact_identity_observed, false, unit.execution_unit_id);
}
const errata = SUPPLEMENTAL_UNITS.find((unit) => unit.reference_id === 'CA-ACL-21-101E');
assert.equal(classifyPdfText(errata, '21-101 CalFresh Mid-Period Actions').exact_identity_observed, false);
assert.equal(classifyPdfText(errata, '21-101E Errata CalFresh Mid-Period Actions').exact_identity_observed, true);
assert.equal(new Set(SUPPLEMENTAL_UNITS.map((unit) => unit.reference_id)).size, 5);
assert.equal(new Set(SUPPLEMENTAL_UNITS.map((unit) => unit.official_url)).size, 5);
console.log('status-sovereignty-rd-wave02-rd04-supplemental-acls.test: five fixed units, identity positives, missing-marker refusals and errata distinction passed');
