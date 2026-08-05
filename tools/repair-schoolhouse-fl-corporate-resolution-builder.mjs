import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(target)) {
  throw new Error('usage: node tools/repair-schoolhouse-fl-corporate-resolution-builder.mjs <builder-path>');
}

let source = fs.readFileSync(target, 'utf8');
const oldMembers = '  const expectedCorporateMembers = ${JSON.stringify(EXPECTED_MEMBERS)};\\n';
const oldNames = '  const expectedCorporateNames = ${JSON.stringify(EXPECTED_CORPORATE_NAMES)};\\n';
const newMembers = '  const expectedCorporateMembers = " + JSON.stringify(EXPECTED_MEMBERS) + ";\\n';
const newNames = '  const expectedCorporateNames = " + JSON.stringify(EXPECTED_CORPORATE_NAMES) + ";\\n';
if (source.split(oldMembers).length - 1 !== 1) {
  throw new Error('expected one stale member-map interpolation fixture');
}
if (source.split(oldNames).length - 1 !== 1) {
  throw new Error('expected one stale name-map interpolation fixture');
}
source = source.replace(oldMembers, newMembers).replace(oldNames, newNames);
if (source.includes(oldMembers) || source.includes(oldNames)) {
  throw new Error('stale validator interpolation fixture survived repair');
}
fs.writeFileSync(target, source);
console.log(JSON.stringify({ patched_file: target, repairs: 2 }));
