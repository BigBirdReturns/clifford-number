#!/usr/bin/env node
// Mechanical gates for BUILD-INSTRUCTIONS section 1 rules 1.6 and 1.9.
//
// Blocking scope (any finding fails the run, with the offending file, line and row):
//   data/ledger/*.jsonl, data/canonical/*.json, cases/*/*.jsonl, and every JSON/JSONL
//   data file on the publication allowlist (data/project/publication-allowlist.json).
// Non-blocking scope (warnings, owner decides): data/intake/**/*.json[l]. Intake is
//   repository_only, so its cohort definitions are reported but do not fail the run
//   unless an intake file with findings is itself publishable.
//
// 1.6  No identity-adjacent aggregation (ethnicity, religion, ancestry, national origin,
//      unit affiliation). Checks: protected-attribute field names; surface/cohort/score
//      basis fields (bounded_by, *_linkage_basis, cohort_definition, ...) and surface
//      types that name a protected attribute; free text in which one sentence both
//      builds a group/rollup and names a protected attribute. Country-named linkage
//      fields (e.g. *_israel_*) are review warnings, never blocking.
// 1.9  Capture. Checks: no paid-placement field (paid_placement, sponsored_placement,
//      featured, promoted, advertiser, ...) anywhere in blocking scope; any sponsor /
//      sponsored_by field on a data/canonical registry row needs sponsor_disclosure.
//      NOT checked (cannot be, offline): private forks presenting divergent facts as
//      this instrument; that needs the Phase 2 signed-release verifier (4.1).
//
// Usage: node tools/validate-constitution-gates.mjs [--root <repo-root>] [--strict]
//   --strict   treat warnings as failures (for after the owner has decided)
import path from 'node:path';
import {
  checkConstitutionGates,
  formatFinding,
  groupWarnings,
} from './lib/constitution-gates.mjs';
import { root as defaultRoot } from './lib/ledger.mjs';

const args = { root: defaultRoot, strict: false };
const argv = process.argv.slice(2);
for (let i = 0; i < argv.length; i += 1) {
  if (argv[i] === '--root') args.root = path.resolve(argv[++i] ?? '');
  else if (argv[i] === '--strict') args.strict = true;
  else {
    console.error(`validate-constitution-gates: unknown argument ${argv[i]}`);
    process.exit(2);
  }
}

let result;
try {
  result = checkConstitutionGates({ root: args.root });
} catch (error) {
  console.error(`validate-constitution-gates: ${error.message}`);
  process.exit(1);
}

const { errors, warnings, stats } = result;
const warningGroups = groupWarnings(warnings);

if (warningGroups.length > 0) {
  console.log(`validate-constitution-gates: ${warnings.length} non-blocking warning${warnings.length === 1 ? '' : 's'} in ${warningGroups.length} group${warningGroups.length === 1 ? '' : 's'} (owner decision; data is preserved, not deleted)`);
  for (const group of warningGroups) {
    const lines = group.lines.length ? ` lines ${group.lines.join(',')}${group.count > group.lines.length ? ',…' : ''}` : '';
    console.log(`  WARN [${group.rule}] (${group.scope}) ${group.file}${lines} x${group.count} field ${group.field}`);
    console.log(`       e.g. ${group.sample.value}`);
  }
}

if (errors.length > 0) {
  console.error(`validate-constitution-gates: FAILED (${errors.length} violation${errors.length === 1 ? '' : 's'})`);
  for (const finding of errors) console.error(`  - ${formatFinding(finding)}`);
  process.exit(1);
}
if (args.strict && warnings.length > 0) {
  console.error('validate-constitution-gates: FAILED (--strict: warnings present)');
  process.exit(1);
}

console.log(
  `validate-constitution-gates: OK 1.6 and 1.9 clean over ${stats.blocking_files} blocking files `
  + `(ledger, canonical, cases, publication allowlist; ${(stats.blocking_bytes / 1e6).toFixed(1)} MB); `
  + `${stats.intake_files} intake files scanned for warnings only`,
);
