#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
  ROOT,
  DATA_DIR,
  EXECUTION_RECEIPT_PATH,
  ROUTE_ADJUDICATIONS_PATH,
  STATE_OBSERVATIONS_PATH,
  LINK_CANDIDATES_PATH,
  FOLLOWUP_PROTOCOL_PATH,
  INDEX_PATH,
  PRODUCT_MANIFEST_PATH,
  SCHEMA_PATH,
  PERMANENT_PATHS,
  SUCCESSOR_TRIGGER_PATH,
  DEFERRED_APPEAL_REASON,
  candidateDigest,
  validateExecutionReceipt,
  validateRouteAdjudication,
  validateStateObservation,
  validateLinkCandidate,
  validateFollowupRoute,
  validateAuthoredRows,
  deriveFollowupProtocol,
  deriveIndex,
  deriveProductManifest,
  expectedSuccessorTriggerText,
  validateSuccessorTriggerText,
  classifyChangedPathSurface,
} from '../tools/build-status-sovereignty-rd-wave03-rd04-state-source-adjudication.mjs';
import {
  validateSchemaContract,
  validateValue,
} from '../tools/validate-status-sovereignty-rd-wave03-rd04-state-source-adjudication.mjs';

const abs = (root, rel) => path.join(root, rel);
const readJson = (root, rel) => JSON.parse(fs.readFileSync(abs(root, rel), 'utf8'));
const readJsonl = (root, rel) => fs.readFileSync(abs(root, rel), 'utf8').trimEnd().split('\n').filter(Boolean).map((line) => JSON.parse(line));
const writeJson = (root, rel, value) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${JSON.stringify(value, null, 2)}\n`, 'utf8');
};
const writeJsonl = (root, rel, rows) => {
  fs.mkdirSync(path.dirname(abs(root, rel)), { recursive: true });
  fs.writeFileSync(abs(root, rel), `${rows.map((row) => JSON.stringify(row)).join('\n')}\n`, 'utf8');
};
const clone = (value) => structuredClone(value);
const tests = [];
const refuses = (name, fn) => tests.push({ name, run: () => assert.throws(fn, undefined, name) });
const copyValidationRoot = () => {
  const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'rd04-state-source-adjudication-'));
  fs.cpSync(abs(ROOT, DATA_DIR), abs(temp, DATA_DIR), { recursive: true });
  fs.mkdirSync(path.dirname(abs(temp, SCHEMA_PATH)), { recursive: true });
  fs.copyFileSync(abs(ROOT, SCHEMA_PATH), abs(temp, SCHEMA_PATH));
  return temp;
};

const receipt = readJson(ROOT, EXECUTION_RECEIPT_PATH);
const routes = readJsonl(ROOT, ROUTE_ADJUDICATIONS_PATH);
const observations = readJsonl(ROOT, STATE_OBSERVATIONS_PATH);
const candidates = readJsonl(ROOT, LINK_CANDIDATES_PATH);
const protocol = readJson(ROOT, FOLLOWUP_PROTOCOL_PATH);
const index = readJson(ROOT, INDEX_PATH);
const manifest = readJson(ROOT, PRODUCT_MANIFEST_PATH);
const schema = readJson(ROOT, SCHEMA_PATH);
const routeById = new Map(routes.map((row) => [row.route_id, row]));
const selected = candidates.filter((row) => row.selected_for_followup).sort((a, b) => a.followup_ordinal - b.followup_ordinal);

assert.equal(validateExecutionReceipt(receipt), true);
const authored = validateAuthoredRows(ROOT);
assert.equal(authored.routes.length, 54);
assert.equal(authored.observations.length, 50);
assert.equal(authored.candidates.length, 329);
assert.equal(authored.selected.length, 62);
assert.equal(candidates.filter((row) => row.deferred_reason === DEFERRED_APPEAL_REASON).length, 17);
routes.forEach((row, indexValue) => assert.equal(validateRouteAdjudication(row, indexValue + 1), true));
observations.forEach((row, indexValue) => assert.equal(validateStateObservation(row, indexValue + 1, routes[indexValue + 4], candidates), true));
candidates.forEach((row) => assert.equal(validateLinkCandidate(row, routeById.get(row.parent_route_id)), true));
protocol.routes.forEach((row, indexValue) => assert.equal(validateFollowupRoute(row, indexValue + 1, selected[indexValue]), true));
assert.deepEqual(protocol, deriveFollowupProtocol(candidates));
assert.deepEqual(index, deriveIndex(ROOT));
assert.deepEqual(manifest, deriveProductManifest(ROOT));
assert.equal(validateSchemaContract(schema), true);
assert.equal(validateValue(ROOT), true);
assert.equal(validateSuccessorTriggerText(expectedSuccessorTriggerText(ROOT), ROOT), true);
assert.equal(classifyChangedPathSurface([]), 'canonical_main');
assert.equal(classifyChangedPathSurface(PERMANENT_PATHS), 'permanent_product');
assert.equal(classifyChangedPathSurface([SUCCESSOR_TRIGGER_PATH]), 'responsive_link_trigger');

for (let indexValue = 0; indexValue < routes.length; indexValue += 1) {
  refuses(`route ${indexValue + 1} field authority`, () => {
    const row = clone(routes[indexValue]);
    row.field_classification_effect = 'invented';
    validateRouteAdjudication(row, indexValue + 1);
  });
  refuses(`route ${indexValue + 1} malformed body hash`, () => {
    const row = clone(routes[indexValue]);
    row.body_sha256 = 'changed';
    validateRouteAdjudication(row, indexValue + 1);
  });
  refuses(`route ${indexValue + 1} source admission`, () => {
    const row = clone(routes[indexValue]);
    row.source_admitted = !row.source_admitted;
    validateRouteAdjudication(row, indexValue + 1);
  });
}

for (let indexValue = 0; indexValue < observations.length; indexValue += 1) {
  refuses(`observation ${indexValue + 1} substantive terminalization`, () => {
    const row = clone(observations[indexValue]);
    row.substantive_field_terminalizations = 1;
    validateStateObservation(row, indexValue + 1, routes[indexValue + 4], candidates);
  });
  refuses(`observation ${indexValue + 1} route binding`, () => {
    const row = clone(observations[indexValue]);
    row.route_id = 'RD04-W03-NEXT-STATE-99';
    validateStateObservation(row, indexValue + 1, routes[indexValue + 4], candidates);
  });
  refuses(`observation ${indexValue + 1} candidate accounting`, () => {
    const row = clone(observations[indexValue]);
    row.responsive_link_candidates += 1;
    validateStateObservation(row, indexValue + 1, routes[indexValue + 4], candidates);
  });
}

for (let indexValue = 0; indexValue < candidates.length; indexValue += 1) {
  const parent = routeById.get(candidates[indexValue].parent_route_id);
  refuses(`candidate ${indexValue + 1} source admission`, () => {
    const row = clone(candidates[indexValue]);
    row.admitted_source = true;
    validateLinkCandidate(row, parent);
  });
  refuses(`candidate ${indexValue + 1} parent body custody`, () => {
    const row = clone(candidates[indexValue]);
    row.parent_body_sha256 = '0'.repeat(64);
    row.candidate_id = candidateDigest(row);
    validateLinkCandidate(row, parent);
  });
  refuses(`candidate ${indexValue + 1} execution metadata`, () => {
    const row = clone(candidates[indexValue]);
    if (row.selected_for_followup || row.deferred_reason !== null) {
      row.selected_for_followup = true;
      row.selection_category = 'appeal_hearing';
      row.selection_reason = 'unauthorized current-class execution';
      row.followup_ordinal = 999;
      row.deferred_reason = null;
    } else {
      row.followup_ordinal = 1;
    }
    validateLinkCandidate(row, parent);
  });
}

for (let indexValue = 0; indexValue < protocol.routes.length; indexValue += 1) {
  refuses(`followup ${indexValue + 1} automatic admission`, () => {
    const row = clone(protocol.routes[indexValue]);
    row.automatic_source_admission = true;
    validateFollowupRoute(row, indexValue + 1, selected[indexValue]);
  });
  refuses(`followup ${indexValue + 1} candidate binding`, () => {
    const row = clone(protocol.routes[indexValue]);
    row.candidate_id = '0'.repeat(64);
    validateFollowupRoute(row, indexValue + 1, selected[indexValue]);
  });
}

const schemaMutations = [
  (value) => { value.$schema = 'changed'; },
  (value) => { value.$id = 'changed'; },
  (value) => { value.additionalProperties = true; },
  (value) => { value.properties.schema_version.const = 'changed'; },
  (value) => { value.properties.counts.properties.routes_adjudicated.const = 55; },
  (value) => { value.properties.counts.properties.state_landing_page_context_sources_admitted.const = 35; },
  (value) => { value.properties.counts.properties.state_http_success_nonresponsive_or_script_only_surfaces.const = 1; },
  (value) => { value.properties.counts.properties.responsive_link_candidates.const = 328; },
  (value) => { value.properties.counts.properties.selected_followup_routes.const = 61; },
  (value) => { value.properties.counts.properties.deferred_out_of_class_candidates.const = 16; },
  (value) => { value.properties.counts.properties.terminal_field_cells_after.const = 101; },
  (value) => { value.properties.counts.properties.still_open_field_cells.const = 349; },
  (value) => { value.properties.current_result.properties.class_closed.const = true; },
];
schemaMutations.forEach((mutate, indexValue) => refuses(`schema contract ${indexValue + 1}`, () => {
  const value = clone(schema);
  mutate(value);
  validateSchemaContract(value);
}));

const trigger = expectedSuccessorTriggerText(ROOT);
const triggerLines = trigger.trimEnd().split('\n');
triggerLines.forEach((line, indexValue) => refuses(`successor trigger line ${indexValue + 1}`, () => {
  const lines = [...triggerLines];
  const key = line.slice(0, line.indexOf('='));
  lines[indexValue] = `${key}=changed`;
  validateSuccessorTriggerText(`${lines.join('\n')}\n`, ROOT);
}));
refuses('successor trigger line removal', () => validateSuccessorTriggerText(`${triggerLines.slice(0, -1).join('\n')}\n`, ROOT));
refuses('successor trigger line reorder', () => {
  const lines = [...triggerLines];
  [lines[0], lines[1]] = [lines[1], lines[0]];
  validateSuccessorTriggerText(`${lines.join('\n')}\n`, ROOT);
});
refuses('successor trigger extra authority', () => validateSuccessorTriggerText(`${trigger}automatic_publication=true\n`, ROOT));
refuses('successor trigger final newline removal', () => validateSuccessorTriggerText(trigger.trimEnd(), ROOT));

refuses('partial permanent product surface', () => classifyChangedPathSurface(PERMANENT_PATHS.slice(0, -1)));
refuses('permanent product plus trigger surface', () => classifyChangedPathSurface([...PERMANENT_PATHS, SUCCESSOR_TRIGGER_PATH]));
refuses('trigger plus extra path surface', () => classifyChangedPathSurface([SUCCESSOR_TRIGGER_PATH, 'README.md']));
refuses('wrong trigger path surface', () => classifyChangedPathSurface(['.ssc-rd04-wave03-responsive-link-trigger/RUN']));
refuses('permanent product missing workflow surface', () => classifyChangedPathSurface(PERMANENT_PATHS.filter((rel) => !rel.startsWith('.github/workflows/'))));
refuses('duplicate permanent path surface', () => classifyChangedPathSurface([...PERMANENT_PATHS, PERMANENT_PATHS[0]]));
refuses('arbitrary path surface', () => classifyChangedPathSurface(['README.md']));

refuses('execution receipt admission denominator', () => {
  const value = clone(receipt);
  value.counts.admitted_state_landing_page_context_sources = 38;
  validateExecutionReceipt(value);
});
refuses('malformed retained link execution', () => {
  const original = candidates.find((row) => row.url_parse_state === 'malformed_retained_link_text');
  const row = clone(original);
  row.selected_for_followup = true;
  row.selection_category = 'policy_manual';
  row.selection_reason = 'malformed text executed';
  row.followup_ordinal = 1;
  validateLinkCandidate(row, routeById.get(row.parent_route_id));
});
refuses('protocol deferred count', () => {
  const value = clone(protocol);
  value.denominator.deferred_out_of_class_candidates = 16;
  assert.deepEqual(value, deriveFollowupProtocol(candidates));
});
refuses('protocol appeal boundary', () => {
  const value = clone(protocol);
  value.boundaries.appeal_or_hearing_route_is_current_rd04_c02_field = true;
  assert.deepEqual(value, deriveFollowupProtocol(candidates));
});
refuses('index class closure', () => {
  const value = clone(index);
  value.current_result.class_closed = true;
  assert.deepEqual(value, deriveIndex(ROOT));
});
refuses('product manifest digest', () => {
  const value = clone(manifest);
  value.combined_sha256 = '0'.repeat(64);
  assert.deepEqual(value, deriveProductManifest(ROOT));
});

refuses('authored route body hash tamper survives regenerated derivatives', () => {
  const temp = copyValidationRoot();
  try {
    const value = readJsonl(temp, ROUTE_ADJUDICATIONS_PATH);
    value[0].body_sha256 = '0'.repeat(64);
    writeJsonl(temp, ROUTE_ADJUDICATIONS_PATH, value);
    const tempCandidates = readJsonl(temp, LINK_CANDIDATES_PATH);
    writeJson(temp, FOLLOWUP_PROTOCOL_PATH, deriveFollowupProtocol(tempCandidates));
    writeJson(temp, INDEX_PATH, deriveIndex(temp));
    writeJson(temp, PRODUCT_MANIFEST_PATH, deriveProductManifest(temp));
    validateValue(temp);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

refuses('fabricated selected URL survives regenerated derivatives', () => {
  const temp = copyValidationRoot();
  try {
    const value = readJsonl(temp, LINK_CANDIDATES_PATH);
    const target = value.find((row) => row.selected_for_followup);
    target.url = 'https://example.gov/fabricated-snap-policy';
    target.url_host = 'example.gov';
    target.candidate_id = candidateDigest(target);
    writeJsonl(temp, LINK_CANDIDATES_PATH, value);
    const derivedProtocol = deriveFollowupProtocol(value);
    writeJson(temp, FOLLOWUP_PROTOCOL_PATH, derivedProtocol);
    writeJson(temp, INDEX_PATH, deriveIndex(temp));
    writeJson(temp, PRODUCT_MANIFEST_PATH, deriveProductManifest(temp));
    validateValue(temp);
  } finally {
    fs.rmSync(temp, { recursive: true, force: true });
  }
});

assert.equal(tests.length, 1466, `adversarial refusal denominator changed: ${tests.length}`);
for (const test of tests) test.run();
console.log(`RD-04 state-source adversarial suite: ${tests.length} mutations refused; 54 routes typed, 36 context admissions, 2 HTTP-success content gaps, 329 candidates preserved, 17 appeal/hearing candidates deferred, 62 current-class followups, matrix remains 100/450 terminal`);
