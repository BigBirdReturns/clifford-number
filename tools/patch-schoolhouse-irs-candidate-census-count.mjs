import fs from 'node:fs';
import path from 'node:path';

const target = path.resolve(process.argv[2] || '');
if (!process.argv[2] || !fs.existsSync(target)) {
  throw new Error('usage: node tools/patch-schoolhouse-irs-candidate-census-count.mjs <builder-path>');
}

let source = fs.readFileSync(target, 'utf8');
const numericMatches = source.match(/4394541/g) || [];
const formattedMatches = source.match(/4,394,541/g) || [];
if (numericMatches.length === 0) {
  throw new Error('no numeric scanned-row fixtures found');
}
if (formattedMatches.length === 0) {
  throw new Error('no formatted scanned-row fixtures found');
}
source = source.replaceAll('4394541', '7020930').replaceAll('4,394,541', '7,020,930');
if (source.includes('4394541') || source.includes('4,394,541')) {
  throw new Error('stale scanned-row fixture survived patch');
}
fs.writeFileSync(target, source);
console.log(JSON.stringify({
  patched_file: target,
  prior_scanned_rows: 4394541,
  corrected_scanned_rows: 7020930,
  numeric_replacements: numericMatches.length,
  formatted_replacements: formattedMatches.length
}));
