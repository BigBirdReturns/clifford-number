#!/usr/bin/env node
import fs from 'node:fs';

const file = 'tools/validate-security-state-organism.mjs';
let source = fs.readFileSync(file, 'utf8');
const replacements = [
  [
`for (const issue of issuePlan.issues) {
  if (!issue.issue_id || !issue.issue_class || !issue.title || !issue.purpose || !issue.package_ids.length) fail(\`issue plan incomplete \${issue.issue_id}\`);
  for (const id of issue.package_ids) if (!packageIds.has(id)) fail(\`\${issue.issue_id}: unknown packet \${id}\`);
}
for (const handoff of issuePlan.estate_handoffs) {`,
`unique(issuePlan.issues, 'issue_id', 'issue');
for (const issue of issuePlan.issues) {
  if (!issue.issue_id || !issue.issue_class || !issue.title || !issue.purpose || !issue.package_ids.length) fail(\`issue plan incomplete \${issue.issue_id}\`);
  for (const id of issue.package_ids) if (!packageIds.has(id)) fail(\`\${issue.issue_id}: unknown packet \${id}\`);
}
if (issuePlan.issues.filter((x) => x.issue_class === 'cluster_index').length !== 12) fail('cluster issue count');
for (const handoff of issuePlan.estate_handoffs) {`
  ],
  [
`const builderSource = fs.readFileSync(path.join(root, 'tools/build-security-state-organism.mjs'), 'utf8');
for (const [label, source] of [['builder', builderSource]]) {
  if (source.includes('https://www.usa.gov/')) fail(\`\${label}: generic placeholder embedded\`);
  if (/\\b(?:round.?robin|count.?balanc|synthetic.?coverage)\\b/i.test(source)) fail(\`\${label}: synthetic routing vocabulary\`);
}
for (const p of [`,
`const builderSource = fs.readFileSync(path.join(root, 'tools/build-security-state-organism.mjs'), 'utf8');
const dispatcherSource = fs.readFileSync(path.join(root, 'tools/dispatch-security-state-organism.mjs'), 'utf8');
for (const [label, source] of [['builder', builderSource]]) {
  if (source.includes('https://www.usa.gov/')) fail(\`\${label}: generic placeholder embedded\`);
  if (/\\b(?:round.?robin|count.?balanc|synthetic.?coverage)\\b/i.test(source)) fail(\`\${label}: synthetic routing vocabulary\`);
}
for (const required of ["GITHUB_ACTIONS === 'true'", "GITHUB_EVENT_NAME === 'push'", "GITHUB_REF === 'refs/heads/main'", "group.issue_class === 'cluster_index'", "\`ENTITY-\${group.issue_id.replace('CLUSTER-', '')}\`", 'multiple current or legacy issue lanes found', 'multiple current or legacy estate handoffs found']) {
  if (!dispatcherSource.includes(required)) fail(\`dispatcher integrity guard missing: \${required}\`);
}
for (const p of [`
  ],
];

for (const [before, after] of replacements) {
  const count = source.split(before).length - 1;
  if (count !== 1) throw new Error(`validator patch anchor count ${count}`);
  source = source.replace(before, after);
}
fs.writeFileSync(file, source);
