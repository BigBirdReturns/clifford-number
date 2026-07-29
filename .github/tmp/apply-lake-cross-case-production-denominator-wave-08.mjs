#!/usr/bin/env node
import fs from 'node:fs';

const changedPaths = new Set();

function updateText(file, transform) {
  const before = fs.readFileSync(file, 'utf8');
  const after = transform(before);
  if (after === before) return;
  fs.writeFileSync(file, after);
  changedPaths.add(file);
}

updateText('BUILD-INSTRUCTIONS.md', source => {
  if (/Production cross-case identity denominator — executed 2026-07-29/i.test(source)) return source;
  const marker = '2.2 **Surface-type audit for density.**';
  if (!source.includes(marker)) throw new Error('BUILD-INSTRUCTIONS Wave 08 insertion marker missing');
  const insertion = `2.1.1 **Production cross-case identity denominator — executed 2026-07-29.**\nThe Wave 08 program scans every current native case directory under one declared\nextraction law, measures every case pair, and preserves the complete current\ncandidate denominator in\n\`data/project/lake-cross-case-production-pair-denominator-wave-08.jsonl\`.\nEntity occurrences, accepted judgments, unresolved candidates, and rejections are\nseparate append-preserving registries rather than a hand-selected list of notable\noverlaps.\n\nA production identity resolution is accepted only when both case occurrences map\nto the same canonical identity and each side has public receipt custody attached\nto an identity-eligible claim. Distinct source families raise the recorded\nconfidence; they are not permission to decide. Matching labels, slugs, or AXM\ntokens without canonical identity remain unresolved. Canonical or kind conflicts\nare rejected. Every decision records its reason and correction route.\n\nAccepted production identity decisions remain graph-inert. They merge no records,\ncreate no relationship, add no edge or hop, and do not enable automatic joining.\nThe broad \`cross_case_join_authorized\` flag remains \`false\`; the production lane\nis the same bounded scope proved in Wave 07:\n\`explicit_source_custodied_graph_inert_identity_resolution_only\`.\n\n`;
  return source.replace(marker, `${insertion}${marker}`);
});

updateText('README.md', source => {
  if (/### Production cross-case identity decisions/i.test(source)) return source;
  const marker = '`query:hops --from` / `--to` accept local IDs, current Genesis IDs, and retired predecessor IDs:';
  if (!source.includes(marker)) throw new Error('README Wave 08 insertion marker missing');
  const insertion = `### Production cross-case identity decisions\n\nWave 08 applies the bounded Wave 07 law to every current native case pair. The\nentity registry, complete pair denominator, and accepted/unresolved/rejected\ndecisions are committed under \`data/project/lake-cross-case-production-*wave-08*\`.\nThe denominator includes all noncandidate Cartesian pairs as counts, so the visible\nbridges cannot impersonate the whole search universe.\n\nA decision can accept a graph-inert identity bridge when both case occurrences\nresolve to the same canonical identity and both carry public receipt custody on\nidentity-eligible claims. Independent source families are measured and reported as\nstronger corroboration, not treated as an external permission gate. Missing\ncanonical identity or custody remains a named unresolved state; conflicting\nidentity or kind is rejected. No accepted row merges records or creates a graph\nedge or hop, and all automatic cross-case joins remain disabled.\n\n`;
  return source.replace(marker, `${insertion}${marker}`);
});

const lakePolicyPath = 'data/project/lake-index-policy.json';
const lakePolicy = JSON.parse(fs.readFileSync(lakePolicyPath, 'utf8'));
for (const file of [
  'data/project/lake-cross-case-production-denominator-wave-08-policy.json',
  'data/project/lake-cross-case-production-entity-registry-wave-08.jsonl',
  'data/project/lake-cross-case-production-pair-denominator-wave-08.jsonl',
  'data/project/lake-cross-case-production-join-decisions-wave-08.jsonl',
  'data/project/lake-cross-case-production-denominator-wave-08.json'
]) {
  if (!lakePolicy.authoritative_roots.includes(file)) lakePolicy.authoritative_roots.push(file);
}
lakePolicy.authoritative_roots.sort((left, right) => left.localeCompare(right));
for (const file of [
  'build/lake-actions/cross-case-production-denominator-wave-08.json',
  'build/lake-actions/cross-case-production-denominator-wave-08-reconciliation.json',
  'reports/lake-cross-case-production-denominator-wave-08.md',
  'reports/lake-cross-case-production-denominator-wave-08-reconciliation.md',
  '.github/tmp/lake-cross-case-production-denominator-wave-08-trigger.json',
  '.github/tmp/apply-lake-cross-case-production-denominator-wave-08.mjs',
  '.github/tmp/lake-cross-case-production-denominator-wave-08-source-paths.json'
]) {
  if (!lakePolicy.excluded_paths.includes(file)) lakePolicy.excluded_paths.push(file);
}
lakePolicy.excluded_paths.sort((left, right) => left.localeCompare(right));
lakePolicy.boundaries.production_identity_decision_proves_relationship = false;
lakePolicy.boundaries.production_identity_decision_creates_graph_edge = false;
lakePolicy.boundaries.production_identity_denominator_proves_semantic_completeness = false;
fs.writeFileSync(lakePolicyPath, `${JSON.stringify(lakePolicy, null, 2)}\n`);
changedPaths.add(lakePolicyPath);

fs.writeFileSync('.github/tmp/lake-cross-case-production-denominator-wave-08-source-paths.json', `${JSON.stringify({
  schema_version: 'lake-cross-case-production-denominator-wave-08-source-paths@1',
  changed_paths: [...changedPaths].sort()
}, null, 2)}\n`);

console.log(`Wave 08 production denominator carrier applied: ${changedPaths.size} checked source paths`);
