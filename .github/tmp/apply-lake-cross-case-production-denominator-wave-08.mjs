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

updateText('tools/lib/cross-case-production-denominator.mjs', source => {
  const before = `function uniqueSorted(values) {
  return [...new Set((values ?? []).filter(value => value !== null && value !== undefined && String(value).length > 0).map(String))]
    .sort((left, right) => left.localeCompare(right));
}`;
  const after = `function uniqueSorted(values) {
  const iterable = values === null || values === undefined
    ? []
    : Array.isArray(values)
      ? values
      : typeof values[Symbol.iterator] === 'function'
        ? [...values]
        : [values];
  return [...new Set(iterable.filter(value => value !== null && value !== undefined && String(value).length > 0).map(String))]
    .sort((left, right) => left.localeCompare(right));
}`;
  if (!source.includes(before)) throw new Error('Wave 08 iterable-fix target missing');
  return source.replace(before, after);
});

updateText('BUILD-INSTRUCTIONS.md', source => {
  if (/Production cross-case identity denominator — executed 2026-07-29/i.test(source)) return source;
  const marker = '2.2 **Surface-type audit for density.**';
  if (!source.includes(marker)) throw new Error('BUILD-INSTRUCTIONS Wave 08 insertion marker missing');
  const insertion = `2.1.1 **Production cross-case identity denominator — executed 2026-07-29.**
The Wave 08 program scans every current native case directory under one declared
extraction law, measures every case pair, and preserves the complete current
candidate denominator in
\`data/project/lake-cross-case-production-pair-denominator-wave-08.jsonl\`.
Entity occurrences, accepted judgments, unresolved candidates, and rejections are
separate append-preserving registries rather than a hand-selected list of notable
overlaps.

A production identity resolution is accepted only when both case occurrences map
to the same canonical identity and each side has public receipt custody attached
to an identity-eligible claim. Distinct source families raise the recorded
confidence; they are not permission to decide. Matching labels, slugs, or AXM
tokens without canonical identity remain unresolved. Canonical or kind conflicts
are rejected. Every decision records its reason and correction route.

Accepted production identity decisions remain graph-inert. They merge no records,
create no relationship, add no edge or hop, and do not enable automatic joining.
The broad \`cross_case_join_authorized\` flag remains \`false\`; the production lane
is the same bounded scope proved in Wave 07:
\`explicit_source_custodied_graph_inert_identity_resolution_only\`.

`;
  return source.replace(marker, `${insertion}${marker}`);
});

updateText('README.md', source => {
  if (/### Production cross-case identity decisions/i.test(source)) return source;
  const marker = '`query:hops --from` / `--to` accept local IDs, current Genesis IDs, and retired predecessor IDs:';
  if (!source.includes(marker)) throw new Error('README Wave 08 insertion marker missing');
  const insertion = `### Production cross-case identity decisions

Wave 08 applies the bounded Wave 07 law to every current native case pair. The
entity registry, complete pair denominator, and accepted/unresolved/rejected
decisions are committed under \`data/project/lake-cross-case-production-*wave-08*\`.
The denominator includes all noncandidate Cartesian pairs as counts, so the visible
bridges cannot impersonate the whole search universe.

A decision can accept a graph-inert identity bridge when both case occurrences
resolve to the same canonical identity and both carry public receipt custody on
identity-eligible claims. Independent source families are measured and reported as
stronger corroboration, not treated as an external permission gate. Missing
canonical identity or custody remains a named unresolved state; conflicting
identity or kind is rejected. No accepted row merges records or creates a graph
edge or hop, and all automatic cross-case joins remain disabled.

`;
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
