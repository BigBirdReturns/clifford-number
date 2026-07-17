import assert from 'node:assert/strict';
import fs from 'node:fs';
import { parseCsvRecord } from '../tools/lib/csv-records.mjs';

assert.deepEqual(parseCsvRecord('1,"ACME, LTD.","A ""quoted"" value"'), ['1', 'ACME, LTD.', 'A "quoted" value']);
assert.deepEqual(parseCsvRecord('1,"line one\nline two",x'), ['1', 'line one\nline two', 'x']);
assert.throws(() => parseCsvRecord('1,"unterminated'));

const manifest = JSON.parse(fs.readFileSync('data/research/icij-panama-import-manifest.json', 'utf8'));
assert.equal(manifest.schema_version, 'icij-panama-import-manifest@1');
assert.equal(manifest.inputs.archive.sha256, 'a2e37e8b878c12fb8f946d4e85026a4ae9026dc866b1aa925730bc1b50e52914');
assert.ok(manifest.coverage.panama_nodes_retained > 500000);
assert.ok(manifest.coverage.panama_relationships_retained > 500000);
assert.equal(manifest.real_positive_control.selection_rule.includes('no name or target filter'), true);
assert.equal(manifest.real_positive_control.gate.gate, 'pass');
assert.deepEqual(manifest.real_positive_control.gate.receipt_roles_satisfied, ['relationship', 'officer_node', 'entity_node']);
assert.equal(manifest.real_positive_control.relationship.relationship_type, 'officer_of');
assert.match(manifest.real_positive_control.establishes, /ICIJ dataset reports/i);
assert.ok(manifest.real_positive_control.does_not_establish.includes('illegality'));
assert.equal(manifest.graph_effect, 'none');
console.log('icij-panama-import.test.js: OK');
