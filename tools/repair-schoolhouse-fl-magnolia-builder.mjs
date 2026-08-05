import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(target)) {
  throw new Error('usage: node tools/repair-schoolhouse-fl-magnolia-builder.mjs <builder-path>');
}

const replaceOnce = (source, before, after, label) => {
  const count = source.split(before).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected one replacement anchor, found ${count}`);
  }
  return source.replace(before, after);
};

let source = fs.readFileSync(target, 'utf8');
const opening = 'const magnoliaValidatorBlock = `';
const closing = '\n`;\nvalidator = replaceExact';
const start = source.indexOf(opening);
if (start < 0) throw new Error('Magnolia validator block opening not found');
const contentStart = start + opening.length;
const end = source.indexOf(closing, contentStart);
if (end < 0) throw new Error('Magnolia validator block closing not found');
let block = source.slice(contentStart, end);
const nestedBackticks = (block.match(/`/g) || []).length;
if (nestedBackticks !== 20) {
  throw new Error(`expected 20 nested validator backticks, found ${nestedBackticks}`);
}
block = block
  .replaceAll('`', '\\`')
  .replaceAll('${member.', '\\${member.')
  .replaceAll('${key}', '\\${key}')
  .replaceAll('${record.', '\\${record.');
source = source.slice(0, contentStart) + block + source.slice(end);

source = replaceOnce(
  source,
  "if (artifactRequests.length !== 9 || !unique(artifactRequests.map(row => row.request_id))) fail('Magnolia range-request receipts drift');\nif (artifactRequests[0].request_id !== 'head-source' || artifactRequests[0].status !== 200) fail('Magnolia HEAD receipt drift');\nif (artifactRequests.slice(1).some(row => row.status !== 206 || !row.content_range || row.state !== 'captured')) {\n  fail('Magnolia range receipts must be terminal HTTP 206 captures');\n}",
  "if (artifactRequests.length !== 9 || !unique(artifactRequests.map(row => row.request_id))) fail('Magnolia range-request receipts drift');\nconst artifactHeadRequest = artifactRequests.find(row => row.request_id === 'head-source');\nconst artifactRangeRequests = artifactRequests.filter(row => row.request_id !== 'head-source');\nif (!artifactHeadRequest || artifactHeadRequest.status !== 200 || artifactHeadRequest.state !== 'captured') fail('Magnolia HEAD receipt drift');\nif (artifactRangeRequests.length !== 8 || artifactRangeRequests.some(row => row.status !== 206 || !row.content_range || row.state !== 'captured')) {\n  fail('Magnolia range receipts must be eight terminal HTTP 206 captures');\n}",
  'builder range-receipt validation repair'
);

source = replaceOnce(
  source,
  "  check(schoolhouseFlMagnoliaRequests.length === 9 && unique(schoolhouseFlMagnoliaRequests.map(row => row.request_id)), 'Magnolia range-request receipt drift');\n  check(schoolhouseFlMagnoliaRequests[0].request_id === 'head-source' && schoolhouseFlMagnoliaRequests[0].status === 200, 'Magnolia HEAD receipt drift');\n  check(schoolhouseFlMagnoliaRequests.slice(1).every(row => row.status === 206 && Boolean(row.content_range) && row.state === 'captured'), 'Magnolia range receipts must be terminal HTTP 206 captures');\n  check(schoolhouseFlMagnoliaRequests.every(row => row.source_receipt_id === '${SOURCE_RECEIPT_ID}' && row.public_credential_password_retained === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'Magnolia range-request authority drift');",
  "  check(schoolhouseFlMagnoliaRequests.length === 9 && unique(schoolhouseFlMagnoliaRequests.map(row => row.request_id)), 'Magnolia range-request receipt drift');\n  const schoolhouseFlMagnoliaHeadRequest = schoolhouseFlMagnoliaRequests.find(row => row.request_id === 'head-source');\n  const schoolhouseFlMagnoliaRangeRequests = schoolhouseFlMagnoliaRequests.filter(row => row.request_id !== 'head-source');\n  check(Boolean(schoolhouseFlMagnoliaHeadRequest) && schoolhouseFlMagnoliaHeadRequest.status === 200 && schoolhouseFlMagnoliaHeadRequest.state === 'captured', 'Magnolia HEAD receipt drift');\n  check(schoolhouseFlMagnoliaRangeRequests.length === 8 && schoolhouseFlMagnoliaRangeRequests.every(row => row.status === 206 && Boolean(row.content_range) && row.state === 'captured'), 'Magnolia range receipts must be eight terminal HTTP 206 captures');\n  check(schoolhouseFlMagnoliaRequests.every(row => row.source_receipt_id === '${SOURCE_RECEIPT_ID}' && row.public_credential_password_retained === false && row.outside_human_dependency === false && row.graph_effect === 'none'), 'Magnolia range-request authority drift');",
  'validator range-receipt validation repair'
);

fs.writeFileSync(target, source);
console.log(JSON.stringify({
  patched_file: target,
  escaped_nested_backticks: nestedBackticks,
  range_receipt_validation: 'order_independent_one_head_eight_ranges',
  state: 'builder_syntax_and_receipt_order_repaired'
}));
