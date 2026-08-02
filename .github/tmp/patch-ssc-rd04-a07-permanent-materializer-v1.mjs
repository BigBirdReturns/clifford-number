#!/usr/bin/env node
import fs from 'node:fs';

const source = '.github/tmp/ssc-rd04-a07-permanent-materializer-v1.sh';
const target = '/tmp/ssc-rd04-a07-permanent-materializer-v1.patched.sh';
let value = fs.readFileSync(source, 'utf8');

value = value.replace(
  /latest_success_run\(\) \{[\s\S]*?\n\}\n\nshn_run=/,
  `latest_success_run() {
  local branch="$1"
  local expected_name="$2"
  local output
  output="$(gh run list --repo "$repo" --branch "$branch" --status success --limit 100 --json databaseId,name,workflowName,headSha,conclusion,createdAt,url)"
  RUNS_JSON="$output" EXPECTED_NAME="$expected_name" node --input-type=module <<'NODE'
const rows = JSON.parse(process.env.RUNS_JSON);
const expected = process.env.EXPECTED_NAME;
const match = rows
  .filter((row) => row.conclusion === 'success' && (row.name === expected || row.workflowName === expected))
  .sort((a, b) => String(b.createdAt).localeCompare(String(a.createdAt)))[0];
if (!match) process.exit(1);
process.stdout.write(String(match.databaseId));
NODE
}

shn_run=`
);

value = value.replace(
  `node --input-type=module <<'NODE' "$shn_readable/summary.json" "$candidate_readable/summary.json" "$sitemap_readable/summary.json" "$crawl_readable/summary.json"`,
  `SHN_SUMMARY="$shn_readable/summary.json" CANDIDATE_SUMMARY="$candidate_readable/summary.json" SITEMAP_SUMMARY="$sitemap_readable/summary.json" CRAWL_SUMMARY="$crawl_readable/summary.json" node --input-type=module <<'NODE'`
);
value = value.replace(
  `const [shnPath, candidatePath, sitemapPath, crawlPath] = process.argv.slice(2);`,
  `const shnPath = process.env.SHN_SUMMARY;
const candidatePath = process.env.CANDIDATE_SUMMARY;
const sitemapPath = process.env.SITEMAP_SUMMARY;
const crawlPath = process.env.CRAWL_SUMMARY;`
);

value = value.replace(
  `node --input-type=module <<'NODE' "$tmp_root/release-changed-paths.txt"`,
  `CHANGED_PATHS="$tmp_root/release-changed-paths.txt" node --input-type=module <<'NODE'`
);
value = value.replace(
  `const list = process.argv[2];`,
  `const list = process.env.CHANGED_PATHS;`
);

value = value.replaceAll(
  `path.relative(root, partPath).replaceAll(path.sep, '/')`,
  `path.relative(root, path.resolve(root, partPath)).replaceAll(path.sep, '/')`
);

value = value.replace(
  `for stage in shn candidate sitemap crawl; do
  gh run view "\${stage}_run" >/dev/null 2>&1 || true
done

`,
  ``
);

value = value.replace(
  `permanent_paths=(`,
  `for branch in \\
  agent/ssc-rd04-a07-shn-semantics-base-v2 \\
  agent/ssc-rd04-a07-candidate-receipts-base-v3 \\
  agent/ssc-rd04-a07-official-sitemap-probe-base \\
  agent/ssc-rd04-a07-official-crawl-base-v1; do
  git fetch --no-tags origin "+refs/heads/$branch:refs/remotes/origin/$branch"
done

permanent_paths=(`
);

if (value.includes(`<<'NODE' <<<`)) throw new Error('stdin redirection defect survived');
if (value.includes('process.argv.slice(2)')) throw new Error('summary positional-argument defect survived');
if (value.includes('const list = process.argv[2]')) throw new Error('release positional-argument defect survived');
if (!value.includes('path.resolve(root, partPath)')) throw new Error('archive path repair missing');

fs.writeFileSync(target, value, { mode: 0o755 });
console.log(target);
