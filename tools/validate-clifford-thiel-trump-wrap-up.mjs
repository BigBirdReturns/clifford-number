#!/usr/bin/env node
import { loadCliffordThielTrumpWrapUp, validateCliffordThielTrumpWrapUp } from './lib/clifford-thiel-trump-wrap-up.mjs';

const errors = validateCliffordThielTrumpWrapUp(loadCliffordThielTrumpWrapUp());
if (errors.length) {
  console.error(`validate-clifford-thiel-trump-wrap-up: ${errors.length} error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('validate-clifford-thiel-trump-wrap-up: OK (public-interest evidence infrastructure; all signal states visible; no machine-generated verdict)');
