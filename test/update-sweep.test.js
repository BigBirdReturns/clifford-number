import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';

const output = execFileSync(process.execPath, ['tools/update-sweep.mjs', '--check-only', '--json'], {
  encoding: 'utf8'
});

const report = JSON.parse(output);
assert.equal(report.directory_rows_checked, 113);
assert.equal(report.directory_missing.length, 0);
assert.ok(report.watchlist.some((item) => item.name === 'Alex Karp' && item.in_graph));
assert.ok(report.watchlist.some((item) => item.name === 'Sam Altman'));
assert.ok(Array.isArray(report.disconnected_expansion_nodes));

console.log('Update sweep tests OK.');
