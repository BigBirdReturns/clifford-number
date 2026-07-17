#!/usr/bin/env node
// Validate the research-track harnesses: every track carries the four things a
// repeatable-pattern instance needs — a signature/scan, a source-adapter set
// (structured|photonic, the intake seam), the epistemic contract, and a Genesis
// custody target — and the index agrees with what is on disk.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const dir = path.join(root, 'data', 'research-tracks');

const AXES = new Set(['place-formation', 'person-router', 'disclosure-crossing']);
const MODES = new Set(['structured', 'photonic']);
const INTAKE = new Set(['screenghost', 'ghostbox', 'direct']);
const CONTRACT_KEYS = ['graph_effect', 'promotes_to', 'forbidden_inference', 'coverage_honesty', 'denominator_discipline'];

const errors = [];
const fail = (id, msg) => errors.push(`${id}: ${msg}`);

function readJson(p) {
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

const index = readJson(path.join(dir, 'index.json'));
const trackDirs = fs.readdirSync(dir, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => e.name)
  .sort();

if (trackDirs.length !== 10) fail('index', `expected 10 track dirs, found ${trackDirs.length}`);

const indexIds = new Set(index.tracks.map((t) => t.track_id));
for (const d of trackDirs) if (!indexIds.has(d)) fail('index', `on-disk track '${d}' missing from index`);
for (const id of indexIds) if (!trackDirs.includes(id)) fail('index', `index track '${id}' has no directory`);

const axisCount = { 'place-formation': 0, 'person-router': 0, 'disclosure-crossing': 0 };

for (const id of trackDirs) {
  const tdir = path.join(dir, id);
  const hp = path.join(tdir, 'harness.json');
  if (!fs.existsSync(hp)) { fail(id, 'missing harness.json'); continue; }
  if (!fs.existsSync(path.join(tdir, 'README.md'))) fail(id, 'missing README.md');

  let h;
  try { h = readJson(hp); } catch (e) { fail(id, `harness.json invalid JSON: ${e.message}`); continue; }

  if (h.track_id !== id) fail(id, `track_id '${h.track_id}' != directory name`);
  if (!AXES.has(h.axis)) fail(id, `unknown axis '${h.axis}'`);
  else axisCount[h.axis]++;

  // 1. signature / scan
  if (!h.scan || typeof h.scan !== 'object') fail(id, 'missing scan (signature/spine)');
  else {
    const hasSpine = Array.isArray(h.scan.spine) && h.scan.spine.length > 0;
    const hasPredicates = Array.isArray(h.scan.predicates) && h.scan.predicates.length > 0;
    const hasStages = Array.isArray(h.scan.stages) && h.scan.stages.length > 0;
    if (!hasSpine && !hasPredicates && !hasStages)
      fail(id, 'scan carries no spine, predicates, or stages');
  }

  // 2. source adapters — the intake seam
  if (!Array.isArray(h.source_adapters) || h.source_adapters.length === 0) {
    fail(id, 'no source_adapters');
  } else {
    let photonic = 0, structured = 0;
    for (const a of h.source_adapters) {
      if (!a.adapter_id) fail(id, 'adapter missing adapter_id');
      if (!MODES.has(a.mode)) fail(id, `adapter '${a.adapter_id}' bad mode '${a.mode}'`);
      if (!INTAKE.has(a.intake_layer)) fail(id, `adapter '${a.adapter_id}' bad intake_layer '${a.intake_layer}'`);
      // the seam invariant: photonic ⇒ ScreenGhost, structured ⇒ ghostbox|direct
      if (a.mode === 'photonic' && a.intake_layer !== 'screenghost')
        fail(id, `adapter '${a.adapter_id}' is photonic but not routed through screenghost`);
      if (a.mode === 'structured' && a.intake_layer === 'screenghost')
        fail(id, `adapter '${a.adapter_id}' is structured but routed through screenghost`);
      if (a.status === 'reuse' && !a.reuses)
        fail(id, `adapter '${a.adapter_id}' status reuse but names no tool`);
      if (a.mode === 'photonic') photonic++; else structured++;
    }
    const ie = index.tracks.find((t) => t.track_id === id);
    if (ie && (ie.adapters.photonic !== photonic || ie.adapters.structured !== structured))
      fail(id, `index adapter counts (${ie.adapters.photonic}/${ie.adapters.structured}) != disk (${photonic}/${structured})`);
  }

  // 3. epistemic contract
  if (!h.epistemic_contract) fail(id, 'missing epistemic_contract');
  else {
    for (const k of CONTRACT_KEYS) if (!h.epistemic_contract[k]) fail(id, `contract missing '${k}'`);
    if (h.epistemic_contract.graph_effect !== 'none') fail(id, `graph_effect must be 'none'`);
    if (h.epistemic_contract.promotes_to !== 'candidate_only') fail(id, `promotes_to must be 'candidate_only'`);
  }

  // 4. custody target (layer-0 seal)
  if (!h.custody) fail(id, 'missing custody');
  else {
    if (h.custody.seals_into !== 'axm-genesis') fail(id, `custody must seal into axm-genesis`);
    if (!h.custody.shard_profile) fail(id, 'custody missing shard_profile');
    if (h.custody.status !== 'declared_not_wired') fail(id, `custody status expected 'declared_not_wired', got '${h.custody.status}'`);
  }

  // coverage seed honesty
  if (!Array.isArray(h.coverage_seed) || h.coverage_seed.length === 0) fail(id, 'no coverage_seed');
  else for (const c of h.coverage_seed)
    if (c.state !== 'not_searched') fail(id, `coverage seed '${c.topic}' must start not_searched`);
}

if (axisCount['place-formation'] !== 5) fail('axes', `place-formation expected 5, got ${axisCount['place-formation']}`);
if (axisCount['person-router'] !== 3) fail('axes', `person-router expected 3, got ${axisCount['person-router']}`);
if (axisCount['disclosure-crossing'] !== 2) fail('axes', `disclosure-crossing expected 2, got ${axisCount['disclosure-crossing']}`);

if (errors.length) {
  console.error(`validate-research-tracks: ${errors.length} FAILURE(S)`);
  for (const e of errors) console.error('  FAIL: ' + e);
  process.exit(1);
}
console.log(`validate-research-tracks: OK — 10 tracks (5 place / 3 router / 2 crossing), every harness carries scan + adapters + contract + custody; index reconciled.`);
