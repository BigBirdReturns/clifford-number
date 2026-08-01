#!/usr/bin/env node
import fs from 'node:fs';

const target = 'tools/validate-project-stable-ground-sg11.mjs';
const source = fs.readFileSync(target, 'utf8');
const oldBlock = `  const fetched = spawnSync('git', ['fetch', '--no-tags', '--no-write-fetch-head', \`--depth=\${depth}\`, 'origin', \`\${sha}:refs/sg11-history/\${sha}\`], { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  if (fetched.status !== 0) return [\`\${label} cannot be acquired: \${(fetched.stderr || fetched.stdout || '').trim()}\`];
  return spawnSync('git', ['cat-file', '-e', \`\${sha}^{commit}\`], { cwd: root }).status === 0 ? [] : [\`\${label} is unavailable after bounded acquisition\`];`;
const newBlock = `  const args = ['fetch', '--no-tags', '--no-write-fetch-head', \`--depth=\${depth}\`, 'origin', \`\${sha}:refs/sg11-history/\${sha}\`];
  let detail = '';
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    if (spawnSync('git', ['cat-file', '-e', \`\${sha}^{commit}\`], { cwd: root }).status === 0) return [];
    const fetched = spawnSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    detail = (fetched.stderr || fetched.stdout || '').trim();
    if (fetched.status === 0 || spawnSync('git', ['cat-file', '-e', \`\${sha}^{commit}\`], { cwd: root }).status === 0) return [];
    if (!/shallow file has changed since we read it/i.test(detail)) return [\`\${label} cannot be acquired: \${detail}\`];
  }
  return [\`\${label} cannot be acquired after bounded shallow-race retries: \${detail}\`];`;

const count = source.split(oldBlock).length - 1;
if (count !== 1) throw new Error(`expected one SG-11 acquisition block, observed ${count}`);
fs.writeFileSync(target, source.replace(oldBlock, newBlock));
console.log('sg12-sg11-shallow-repair: installed bounded shallow-race recovery');
