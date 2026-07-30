#!/usr/bin/env node
import assert from 'node:assert/strict';
import { loadSg06Context, validateSg06 } from '../tools/validate-project-stable-ground-sg06.mjs';

const clean = loadSg06Context({ transitionVerifier: () => [], historicalVerifier: () => [] });
assert.deepEqual(validateSg06(clean), [], 'clean current SG-06 checkpoint must validate under injected custody');
const cloneContext = () => Object.fromEntries(Object.entries(clean).map(([key, value]) => [key, typeof value === 'function' ? value : structuredClone(value)]));

const mutations = [
  ['duplicate checkpoint identity', (c) => { c.pointer.history[5].checkpoint_id = 'SG-2026-07-30-05'; }, 'pointer history order'],
  ['reorder history', (c) => { c.pointer.history.reverse(); }, 'pointer history order'],
  ['weaken append-only governor', (c) => { c.governor.history_law.append_only = false; }, 'governor append-only law'],
  ['remove publication trigger class', (c) => { c.governor.trigger_classes = c.governor.trigger_classes.filter((x) => !x.includes('status-aware publication')); }, 'governor missing publication trigger class'],
  ['rewrite SG-05 preservation', (c) => { c.checkpoint.supersedes.preserved_unchanged = false; }, 'SG-05 preservation'],
  ['rewrite SG-05 receipt', (c) => { c.checkpoint.supersedes.merge_commit = 'f'.repeat(40); }, 'SG-05 final custody receipt'],
  ['rewrite trigger PR', (c) => { c.checkpoint.trigger.pull_request = 478; }, 'SG-06 trigger PR'],
  ['delete transition denominator', (c) => { c.checkpoint.trigger.transition_paths = []; }, 'SG-06 transition path denominator missing'],
  ['replace visual runtime retirement', (c) => { c.checkpoint.trigger.transition_paths[c.checkpoint.trigger.transition_paths.indexOf('src/visual-aperture-part-11.js')] = 'src/not-a-runtime.js'; }, 'SG-06 transition missing secondary runtime retirement'],
  ['weaken SG-04 successor-aware lifecycle', (c) => { c.checkpoint.lifecycle_repair.SG04.state = 'single_successor_only'; }, 'SG-04 successor-aware lifecycle state'],
  ['weaken SG-05 successor-aware lifecycle', (c) => { c.checkpoint.lifecycle_repair.SG05.state = 'single_successor_only'; }, 'SG-05 successor-aware lifecycle state'],
  ['switch default to include', (c) => { c.publicationPlan.default_decision = 'include'; }, 'live publication default decision'],
  ['delete held surface', (c) => { c.publicationPlan.held_surfaces.pop(); }, 'live publication held-surface count'],
  ['drift public digest', (c) => { c.publicationManifest.combined_sha256 = 'f'.repeat(64); }, 'live publication manifest digest'],
  ['restore recursive copy', (c) => { c.checkpoint.canonical_snapshot.publication_safety.recursive_repository_copy = true; }, 'frozen recursive copy boundary'],
  ['permit unclassified dependency', (c) => { c.checkpoint.canonical_snapshot.publication_safety.unclassified_dependency_allowed = true; }, 'frozen unclassified dependency boundary'],
  ['restore graph route', (c) => { c.checkpoint.canonical_snapshot.publication_safety.generic_graph_public_route = true; }, 'frozen graph route boundary'],
  ['publish legacy route', (c) => { c.checkpoint.canonical_snapshot.publication_safety.legacy_public_route = true; }, 'frozen legacy route boundary'],
  ['deploy POOF', (c) => { c.poofAperture.publication.deployed = true; }, 'live POOF deployment'],
  ['publish SSC', (c) => { c.checkpoint.canonical_snapshot.publication_safety.ssc_publication_status = 'public'; }, 'frozen SSC publication state'],
  ['drift SSC release custody', (c) => { c.statusRelease.combined_sha256 = 'f'.repeat(64); }, 'live SSC release digest'],
  ['promote K0 event', (c) => { c.k0.execution.included_events = 1; }, 'live K0 event count'],
  ['promote DCA execution', (c) => { c.denominator.execution.query_templates_executed = 1; }, 'live DCA execution'],
  ['advance adoption', (c) => { c.sprint09.current_result.maximum_verified_adoption_level = 'A1'; }, 'live adoption'],
  ['drift exact manifest', (c) => { c.manifest.combined_sha256 = 'f'.repeat(64); }, 'current SG-06 exact-byte manifest'],
  ['lose historical SG-05 custody', (c) => { c.historicalVerifier = () => ['historical SG-05 merge receipt is not a full commit SHA']; }, 'historical SG-05 merge receipt is not a full commit SHA']
];
for (const [name, mutate, expected] of mutations) {
  const context = cloneContext();
  mutate(context);
  const errors = validateSg06(context);
  assert(errors.some((error) => error.includes(expected)), `${name}: expected ${expected}; observed ${JSON.stringify(errors)}`);
}
console.log(`project-stable-ground-sg06.test: ${mutations.length} adversarial mutations PASS`);
