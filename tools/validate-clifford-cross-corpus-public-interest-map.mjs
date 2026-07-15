#!/usr/bin/env node
import { loadCliffordCrossCorpusPublicInterestMap, validateCliffordCrossCorpusPublicInterestMap } from './lib/clifford-cross-corpus-public-interest-map.mjs';

const errors = validateCliffordCrossCorpusPublicInterestMap(loadCliffordCrossCorpusPublicInterestMap());
if (errors.length) {
  console.error(`validate-clifford-cross-corpus-public-interest-map: ${errors.length} error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('validate-clifford-cross-corpus-public-interest-map: OK (all nine public-interest lanes visible; SAM gap and USAspending acquisitions distinct)');
