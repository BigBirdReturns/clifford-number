import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import {
  buildProduct,
  checkProduct,
} from '../tools/build-status-sovereignty-rd-wave03-rd04-ca-sd-wa-capture-adjudication.mjs';
import {
  loadProductBundle,
  validateBundle,
  validateProduct,
} from '../tools/validate-status-sovereignty-rd-wave03-rd04-ca-sd-wa-capture-adjudication.mjs';

const TARGET_REFUSALS = 2477;

function collectLeafPaths(value, prefix = [], out = []) {
  if (value === null || typeof value !== 'object') {
    out.push(prefix);
    return out;
  }
  if (Array.isArray(value)) {
    value.forEach((item, index) => collectLeafPaths(item, [...prefix, index], out));
    return out;
  }
  for (const [key, item] of Object.entries(value)) collectLeafPaths(item, [...prefix, key], out);
  return out;
}

function getParent(root, path) {
  let parent = root;
  for (const part of path.slice(0, -1)) parent = parent[part];
  return { parent, key: path.at(-1) };
}

function mutateValue(value, ordinal) {
  if (typeof value === 'string') return `${value}__adversarial_${ordinal}`;
  if (typeof value === 'number') return value + ordinal + 1;
  if (typeof value === 'boolean') return !value;
  if (value === null) return `adversarial_null_${ordinal}`;
  throw new TypeError(`unsupported leaf type ${typeof value}`);
}

await checkProduct();
const { expected } = await validateProduct();
const bundle = await loadProductBundle();
validateBundle(bundle, expected);

assert.equal(bundle.summary.composition.canonical_predecessor_terminal_cells, 181);
assert.equal(bundle.summary.composition.newly_terminalized_cells, 6);
assert.equal(bundle.summary.composition.terminal_evidence_updates, 3);
assert.equal(bundle.summary.composition.canonical_terminal_cells_after, 187);
assert.equal(bundle.summary.composition.double_counted_terminal_cells_refused, 3);
assert.equal(bundle.matrix.current_result.still_open_substantive_cells, 213);
assert.deepEqual(bundle.matrix.current_result.target_rows_ready_for_separate_row_state_adjudication, ['CA', 'SD', 'WA']);

const mutationSurfaces = {
  inputs: bundle.inputs,
  terminalLedger: bundle.terminalLedger,
  matrix: bundle.matrix,
  openCensus: bundle.openCensus,
  summary: bundle.summary,
  index: bundle.index,
  manifest: bundle.manifest,
};
const leaves = collectLeafPaths(mutationSurfaces);
assert(leaves.length >= TARGET_REFUSALS, `insufficient adversarial leaf surface: ${leaves.length}`);

const started = performance.now();
for (let ordinal = 0; ordinal < TARGET_REFUSALS; ordinal += 1) {
  const path = leaves[ordinal];
  const { parent, key } = getParent(mutationSurfaces, path);
  const original = parent[key];
  parent[key] = mutateValue(original, ordinal);
  let refused = false;
  try {
    validateBundle(bundle, expected);
  } catch {
    refused = true;
  } finally {
    parent[key] = original;
  }
  assert(refused, `mutation was not refused at ${path.join('.')}`);
}
validateBundle(bundle, expected);

const rebuilt = await buildProduct({ write: false });
assert.equal(rebuilt.matrix.counts.terminal_cells, 187);
assert.equal(rebuilt.openCensus.counts.still_open_substantive_cells, 213);
assert.equal(rebuilt.terminalLedger.counts.newly_terminalized_cells, 6);
assert.equal(rebuilt.terminalLedger.counts.terminal_evidence_updates, 3);

const elapsedMs = Math.round(performance.now() - started);
console.log(`rd04_ca_sd_wa_targeted_adversarial_refusals=${TARGET_REFUSALS}`);
console.log(`rd04_ca_sd_wa_adversarial_runtime_ms=${elapsedMs}`);
console.log('rd04_ca_sd_wa_composed_test=pass');
