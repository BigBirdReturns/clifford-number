#!/usr/bin/env node
import { loadCliffordCrossCorpusGameBoard, validateCliffordCrossCorpusGameBoard } from './lib/clifford-cross-corpus-game-board.mjs';

const errors = validateCliffordCrossCorpusGameBoard(loadCliffordCrossCorpusGameBoard());
if (errors.length) {
  console.error(`validate-clifford-cross-corpus-game-board: ${errors.length} error(s)`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}
console.log('validate-clifford-cross-corpus-game-board: OK (all nine discovery lanes visible; SAM gap and USAspending acquisitions distinct)');
