import assert from 'node:assert/strict';
import { parseScheduleIReviewCsv, scheduleIRowToAddEdgeCommand, slugify, validateScheduleIRows } from '../src/import-review.js';

const csv = `graph_node_id,node_label,normalized_ein,recipient_name,amount,purpose,source_zip,source_xml
charles-koch-foundation,Charles Koch Foundation,480918408,"Recipient, Inc.",2500,"Research, education",2024.zip,return.xml
`;
const rows = parseScheduleIReviewCsv(csv);
assert.equal(rows.length, 1);
assert.equal(rows[0].recipient_name, 'Recipient, Inc.');
assert.equal(rows[0].graph_node_id, 'charles-koch-foundation');
assert.equal(rows[0].recipient_type, 'organization');
assert.equal(slugify('Recipient, Inc.'), 'recipient-inc');
const command = scheduleIRowToAddEdgeCommand(rows[0]);
assert.match(command, /--from "charles-koch-foundation"/);
assert.match(command, /--to "recipient-inc"/);
assert.match(command, /--to-label "Recipient, Inc\."/);
assert.match(command, /--to-type "organization"/);
assert.match(command, /--type granted-to/);
assert.match(command, /--evidence primary_public/);

const graph = { nodes: [{ id: 'charles-koch-foundation', identifiers: { ein: '48-0918408' } }] };
const validated = validateScheduleIRows(rows, graph);
assert.equal(validated[0].valid, true);
assert.match(validateScheduleIRows([{ ...rows[0], normalized_ein: 'bad' }], graph)[0].errors.join('; '), /Invalid normalized_ein: bad/);
assert.match(validateScheduleIRows([{ ...rows[0], graph_node_id: 'missing-node' }], graph)[0].errors[0], /Unknown graph_node_id/);
assert.match(validateScheduleIRows([{ ...rows[0], normalized_ein: '000000000' }], graph)[0].errors[0], /EIN mismatch/);
const aliasRows = parseScheduleIReviewCsv('graph_node_id,node_label,normalized_ein,recipient,amount,purpose\ncharles-koch-foundation,Charles Koch Foundation,480918408,Alias Recipient,1,Test');
assert.equal(aliasRows[0].recipient_name, 'Alias Recipient');
assert.throws(() => parseScheduleIReviewCsv('graph_node_id,node_label\nfoo,bar'), /Missing Schedule I CSV column/);
console.log('Import review tests OK.');
