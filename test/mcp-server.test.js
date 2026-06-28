import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['src/mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';
child.stdout.setEncoding('utf8');
child.stderr.setEncoding('utf8');
child.stdout.on('data', (chunk) => { stdout += chunk; });
child.stderr.on('data', (chunk) => { stderr += chunk; });

let nextId = 1;
function request(method, params) {
  const id = nextId++;
  child.stdin.write(`${JSON.stringify({ jsonrpc: '2.0', id, method, params })}\n`);
  return waitFor(id);
}

function waitFor(id) {
  return new Promise((resolve, reject) => {
    const started = Date.now();
    const timer = setInterval(() => {
      const lines = stdout.trim().split('\n').filter(Boolean);
      for (const line of lines) {
        const message = JSON.parse(line);
        if (message.id === id) {
          clearInterval(timer);
          if (message.error) reject(new Error(message.error.message));
          else resolve(message.result);
          return;
        }
      }
      if (Date.now() - started > 3000) {
        clearInterval(timer);
        reject(new Error(`Timed out waiting for ${id}. stderr=${stderr}`));
      }
    }, 10);
  });
}

const init = await request('initialize', { protocolVersion: '2024-11-05' });
assert.equal(init.serverInfo.name, 'clifford-number');
assert.ok(init.capabilities.tools);

const list = await request('tools/list');
assert.ok(list.tools.some((tool) => tool.name === 'clifford_number'));
assert.ok(list.tools.some((tool) => tool.name === 'search_clifford_nodes'));

const search = await request('tools/call', {
  name: 'search_clifford_nodes',
  arguments: { query: 'Elizabeth Blackburn', limit: 3 }
});
const searchPayload = JSON.parse(search.content[0].text);
assert.equal(searchPayload.results[0].label, 'Elizabeth Blackburn');

const path = await request('tools/call', {
  name: 'clifford_number',
  arguments: { query: 'Elizabeth Blackburn' }
});
const pathPayload = JSON.parse(path.content[0].text);
assert.equal(pathPayload.adjacent, true);
assert.equal(pathPayload.clifford_number, 3);
assert.match(pathPayload.path_text, /Elizabeth Blackburn -> Dialog -> Matt Clifford -> Clifford Policy Machine/);
assert.equal(pathPayload.weakest_evidence, 'reported');

const karpPath = await request('tools/call', {
  name: 'clifford_number',
  arguments: { query: 'Alex Karp' }
});
const karpPayload = JSON.parse(karpPath.content[0].text);
assert.equal(karpPayload.adjacent, true);
assert.match(karpPayload.path_text, /Alex Karp -> Palantir/);

const absent = await request('tools/call', {
  name: 'clifford_number',
  arguments: { query: 'zzzzqqqqnonexistent' }
});
const absentPayload = JSON.parse(absent.content[0].text);
assert.equal(absentPayload.adjacent, false);
assert.match(absentPayload.claim, /cannot claim adjacency/);

child.kill();
console.log('MCP server tests OK.');
