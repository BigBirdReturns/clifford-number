import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

const read = file => JSON.parse(fs.readFileSync(file, 'utf8'));
const runBuilder = () => spawnSync(process.execPath, ['tools/build-graph.mjs'], { encoding: 'utf8' });

const graph = read('graph.json');
const registeredCase = read('cases/uk-ai-policy.json');
const clock = read('data/project/build-clock.json');
const compiledCase = read('build/cases/uk-ai-policy.json');
const builderSource = fs.readFileSync('tools/build-graph.mjs', 'utf8');
const compileSource = fs.readFileSync('tools/compile.mjs', 'utf8');

assert.deepEqual(registeredCase, graph, 'registered UK case must remain byte-semantic equivalent to graph.json');
assert.equal(graph.generated, clock.timestamp, 'Research projection must use the admitted deterministic build clock');
assert.match(graph.corpus_as_of, /^\d{4}-\d{2}-\d{2}$/u);
assert.notEqual(graph.corpus_as_of, graph.generated, 'corpus cutoff must remain distinct from projection time');
assert.equal(compiledCase.as_of, graph.corpus_as_of, 'public case as_of must describe admitted corpus coverage');
assert.doesNotMatch(builderSource, /new Date\s*\(/u, 'Research graph builder must not read the wall clock');
assert.match(builderSource, /buildTimestamp\(\)/u);
assert.match(compileSource, /build-research-graph/u, 'release compiler must rebuild the Research projection');

const beforeGraph = fs.readFileSync('graph.json');
const beforeCase = fs.readFileSync('cases/uk-ai-policy.json');
const first = runBuilder();
assert.equal(first.status, 0, first.stderr);
assert.deepEqual(fs.readFileSync('graph.json'), beforeGraph, 'first rebuild must be byte deterministic');
assert.deepEqual(fs.readFileSync('cases/uk-ai-policy.json'), beforeCase, 'registered case rebuild must be byte deterministic');

const second = runBuilder();
assert.equal(second.status, 0, second.stderr);
assert.deepEqual(fs.readFileSync('graph.json'), beforeGraph, 'repeated rebuild must be byte deterministic');
assert.deepEqual(fs.readFileSync('cases/uk-ai-policy.json'), beforeCase, 'repeated registered-case rebuild must be byte deterministic');

console.log('research-graph-projection.test: OK');
