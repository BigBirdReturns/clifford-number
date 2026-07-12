#!/usr/bin/env node
import { compileAllCases } from './lib/case-ledger.mjs';

const cases = compileAllCases();
for (const item of cases) console.log(`case ${item.case_id}: ${item.counts.events} events, ${item.counts.claims} claims, ${item.counts.receipts} receipts`);
