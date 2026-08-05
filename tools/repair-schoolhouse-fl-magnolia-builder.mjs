import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(target)) {
  throw new Error('usage: node tools/repair-schoolhouse-fl-magnolia-builder.mjs <builder-path>');
}

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
fs.writeFileSync(target, source);
console.log(JSON.stringify({
  patched_file: target,
  escaped_nested_backticks: nestedBackticks,
  state: 'builder_syntax_repaired'
}));
