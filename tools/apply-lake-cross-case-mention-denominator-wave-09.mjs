#!/usr/bin/env node
import fs from 'node:fs';

const phase = process.argv.includes('--phase=gate') ? 'gate' : 'source';
const changed = [];

function updateText(file, transform) {
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after === before) return;
  fs.writeFileSync(file, after);
  changed.push(file);
}

function updateJson(file, transform) {
  const before = JSON.parse(fs.readFileSync(file, 'utf8'));
  const after = transform(before);
  const rendered = `${JSON.stringify(after, null, 2)}\n`;
  if (rendered === fs.readFileSync(file, 'utf8')) return;
  fs.writeFileSync(file, rendered);
  changed.push(file);
}

if (phase === 'source') {
  updateText('BUILD-INSTRUCTIONS.md', source => {
    if (/2\.1\.2 \*\*Exact cross-case mention denominator/i.test(source)) return source;
    const marker = '2.2 **Surface-type audit for density.**';
    if (!source.includes(marker)) throw new Error('BUILD-INSTRUCTIONS Wave 09 insertion marker missing');
    const insertion = `2.1.2 **Exact cross-case mention denominator — executed 2026-07-29.**\nWave 08 proved that the current native case ledgers are structurally siloed at\ntheir exact machine-identity layer: no cross-case candidate survives the declared\ncanonical-ID rules. That finding is preserved rather than rewritten. Wave 09\nexpands the denominator into source-bearing prose and metadata by scanning every\ncurrent claim, event, relation, beacon, trail, and receipt record against one\nchecked canonical-label and declared-alias lexicon.\n\nEvery mention records the exact source path, row, JSON pointer, byte-independent\ncharacter span, matched lexeme, canonical identity, claim references, receipt\nreferences, public source families, evidence class, and eligibility state. Fuzzy\nmatching is prohibited. Ambiguous normalized lexemes, generic institutional words,\nand unsafe short tokens remain explicit lexicon exclusions.\n\nA cross-case mention recurrence is accepted only when the same canonical entity is\nmentioned exactly in both cases and each side has at least one recurrence-eligible\nmention with public receipt custody. Independent source families increase the\nrecorded confidence; they are not permission to decide. Missing eligible custody\nremains unresolved. Accepted recurrences merge no records, create no relationship,\nedge, or hop, and do not enable automatic cross-case joining.\n\n`;
    return source.replace(marker, `${insertion}${marker}`);
  });

  updateText('README.md', source => {
    if (/### Exact cross-case mention recurrence/i.test(source)) return source;
    const marker = '`query:hops --from` / `--to` accept local IDs, current Genesis IDs, and retired predecessor IDs:';
    if (!source.includes(marker)) throw new Error('README Wave 09 insertion marker missing');
    const insertion = `### Exact cross-case mention recurrence\n\nWave 08 found zero cross-case candidates in the exact structured-ID layer. Wave 09\nkeeps that result and scans source-bearing text in claims, events, relations,\nbeacons, trails, and receipt metadata for exact canonical labels and declared\naliases. Every match is span-addressed and tied back to its claim and receipt\ncustody. Ambiguous, generic, and unsafe-short lexemes remain excluded controls;\nfuzzy matching is not used.\n\nThe case-pair denominator and recurrence decisions are committed under\n\`data/project/lake-cross-case-mention-*wave-09*\`. An accepted row means only that\nthe same canonical entity is exactly mentioned in two cases with eligible public\ncustody on both sides. It does not merge records or create a relationship, graph\nedge, or hop. Independent source families raise confidence without becoming a\npermission gate, and all automatic cross-case joins remain disabled.\n\n`;
    return source.replace(marker, `${insertion}${marker}`);
  });

  updateJson('data/project/lake-index-policy.json', policy => {
    for (const file of [
      'data/project/lake-cross-case-mention-denominator-wave-09-policy.json',
      'data/project/lake-cross-case-mention-registry-wave-09.jsonl',
      'data/project/lake-cross-case-mentioned-entity-registry-wave-09.jsonl',
      'data/project/lake-cross-case-mention-pair-denominator-wave-09.jsonl',
      'data/project/lake-cross-case-mention-decision-registry-wave-09.jsonl',
      'data/project/lake-cross-case-mention-denominator-wave-09.json'
    ]) {
      if (!policy.authoritative_roots.includes(file)) policy.authoritative_roots.push(file);
    }
    policy.authoritative_roots.sort((left, right) => left.localeCompare(right));
    for (const file of [
      'build/lake-actions/cross-case-mention-denominator-wave-09.json',
      'build/lake-actions/cross-case-mention-denominator-wave-09-reconciliation.json',
      'reports/lake-cross-case-mention-denominator-wave-09.md',
      'reports/lake-cross-case-mention-denominator-wave-09-reconciliation.md',
      '.github/tmp/lake-cross-case-mention-denominator-wave-09-trigger.json'
    ]) {
      if (!policy.excluded_paths.includes(file)) policy.excluded_paths.push(file);
    }
    policy.excluded_paths.sort((left, right) => left.localeCompare(right));
    policy.boundaries.exact_mention_proves_relationship = false;
    policy.boundaries.repeated_mention_proves_coordination = false;
    policy.boundaries.repeated_mention_proves_common_purpose = false;
    policy.boundaries.exact_mention_denominator_proves_semantic_completeness = false;
    return policy;
  });
} else {
  updateJson('package.json', pkg => {
    pkg.scripts['build:cross-case-mentions'] = 'node tools/build-lake-cross-case-mention-denominator-wave-09.mjs';
    pkg.scripts['reconcile:cross-case-mentions'] = 'node tools/reconcile-lake-cross-case-mention-denominator-wave-09.mjs';
    pkg.scripts['validate:cross-case-mentions'] = 'node tools/validate-lake-cross-case-mention-denominator-wave-09.mjs';
    pkg.scripts['test:cross-case-mentions'] = 'node test/lake-cross-case-mention-denominator-wave-09.test.js';
    if (!pkg.scripts.check.includes('npm run validate:cross-case-mentions')) {
      const marker = 'npm run validate:k0 && npm test';
      if (!pkg.scripts.check.includes(marker)) throw new Error('package check insertion marker missing');
      pkg.scripts.check = pkg.scripts.check.replace(marker, 'npm run validate:k0 && npm run validate:cross-case-mentions && npm test');
    }
    return pkg;
  });
}

console.log(`Wave 09 ${phase} contract applied: ${changed.length} changed file(s)`);
for (const file of changed) console.log(`  ${file}`);
