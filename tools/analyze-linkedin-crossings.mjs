#!/usr/bin/env node
// Analytical pass over the LinkedIn review projection's 430 role-crossing CANDIDATES (not crossings).
// Four reductions requested: deduplication, chronological adjacency, recurring transitions, and
// source-explicit classification — plus the generic crossing gate applied unchanged, so "candidate"
// keeps meaning candidate. Every candidate is a single person's self-claimed public role paired with
// a self-claimed private role from one preserved (private) profile PDF; evidence is self-claimed and
// hash-pinned, never independently corroborated here.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateGenericCrossing } from './lib/generic-crossing.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dir = path.join(root, 'data/intake/linkedin-targeted-review');
const candidates = fs.readFileSync(path.join(dir, 'crossing-candidates.jsonl'), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const norm = s => String(s ?? '').toUpperCase().replace(/[.,'"()\-/&]/g, ' ').replace(/\s+/g, ' ').trim();
const months = (a, b) => (a && b) ? Math.round((Date.parse(b) - Date.parse(a)) / (30.4375 * 86400000)) : null;

// --- (1) DEDUP: collapse combinatorial role-pair fan-out to distinct institutional transitions ---
const transitions = new Map();
for (const c of candidates) {
  const key = [c.subject.label, norm(c.public_role.organization), norm(c.private_role.organization)].join(' || ');
  if (!transitions.has(key)) transitions.set(key, { subject: c.subject.label, public_org: c.public_role.organization, private_org: c.private_role.organization, pair_count: 0 });
  transitions.get(key).pair_count += 1;
}

// --- (2) CHRONOLOGICAL ADJACENCY: gap between public role end and private role start ---
const adjacency = { concurrent_dual_hat: 0, immediate_transition_le_3mo: 0, within_year_transition: 0, gap_transition_gt_12mo: 0, undated: 0 };
const adjacencyByCandidate = candidates.map(c => {
  const pubEnd = c.public_role.stated_interval?.end, privStart = c.private_role.stated_interval?.start;
  const pubStart = c.public_role.stated_interval?.start, privEnd = c.private_role.stated_interval?.end;
  let cls;
  if (c.temporal_state === 'observed_dual_hat_at_capture' || (pubStart && privEnd && Date.parse(pubStart) <= Date.parse(privEnd) && Date.parse(privStart) <= Date.parse(pubEnd))) cls = 'concurrent_dual_hat';
  else if (pubEnd && privStart) {
    const g = months(pubEnd, privStart);
    cls = g === null ? 'undated' : g <= 3 ? 'immediate_transition_le_3mo' : g <= 12 ? 'within_year_transition' : 'gap_transition_gt_12mo';
  } else cls = 'undated';
  adjacency[cls] += 1;
  return { candidate_id: c.candidate_id, subject: c.subject.label, adjacency_class: cls, gap_months: (pubEnd && privStart) ? months(pubEnd, privStart) : null };
});

// --- (3) RECURRING TRANSITIONS: origin/destination institutions shared across >=2 subjects ---
const destByOrg = new Map(), origByOrg = new Map();
for (const t of transitions.values()) {
  for (const [map, org] of [[destByOrg, t.private_org], [origByOrg, t.public_org]]) {
    const k = norm(org);
    if (!map.has(k)) map.set(k, { label: org, subjects: new Set() });
    map.get(k).subjects.add(t.subject);
  }
}
const recurring = (map, kind) => [...map.values()].filter(v => v.subjects.size >= 2).map(v => ({ kind, organization: v.label, distinct_subjects: v.subjects.size })).sort((a, b) => b.distinct_subjects - a.distinct_subjects);

// --- (4) SOURCE-EXPLICIT CLASSIFICATION + generic gate applied unchanged ---
const holdReasons = {};
let passed = 0;
for (const c of candidates) {
  const receipt = { content_sha256: 'f'.repeat(64), locator_url: c.subject.profile_url, provenance_chain_id: (c.source_capture_ids ?? ['cap'])[0], evidence_class: 'self_claimed', locator_status: 'public' };
  const g = evaluateGenericCrossing({
    predicate: 'held_public_and_private_role', allowed_predicates: ['held_public_and_private_role'],
    endpoints: [
      { role: 'public_org', resolution: { disposition: 'unresolved' } },
      { role: 'private_org', resolution: { disposition: 'unresolved' } },
    ],
    receipts: [receipt], manifest_hashes: ['f'.repeat(64)],
    interval_a: { valid_from: c.public_role.stated_interval?.start ?? null, valid_until: c.public_role.stated_interval?.end ?? null },
    interval_b: { valid_from: c.private_role.stated_interval?.start ?? null, valid_until: c.private_role.stated_interval?.end ?? null },
  });
  if (g.gate === 'pass') passed += 1;
  for (const f of g.failures) { const k = f.split(':')[0]; holdReasons[k] = (holdReasons[k] ?? 0) + 1; }
}

const sortedTransitions = [...transitions.values()].sort((a, b) => b.pair_count - a.pair_count);
const analysis = {
  schema_version: 'linkedin-crossing-analysis@1',
  source_projection: 'data/intake/linkedin-targeted-review',
  candidates_analyzed: candidates.length,
  distinct_subjects: new Set(candidates.map(c => c.subject.label)).size,
  deduplication: {
    method: 'collapse person×(public_role×private_role) pair fan-out to distinct (subject, public_org, private_org) institutional transitions',
    role_pair_candidates: candidates.length,
    distinct_institutional_transitions: transitions.size,
    reduction_ratio: Number((candidates.length / transitions.size).toFixed(2)),
    top_fanned_out_transitions: sortedTransitions.filter(t => t.pair_count > 1).slice(0, 8),
  },
  chronological_adjacency: {
    note: 'Where LinkedIn month-level precision adds transition timing that OGE/USAspending omit. Gap = months between self-claimed public-role end and private-role start.',
    classes: adjacency,
    immediate_transitions: adjacencyByCandidate.filter(a => a.adjacency_class === 'immediate_transition_le_3mo').slice(0, 10),
    concurrent_dual_hats: adjacencyByCandidate.filter(a => a.adjacency_class === 'concurrent_dual_hat'),
  },
  recurring_transitions: {
    note: 'Institutions appearing as an origin or destination across two or more distinct subjects — the structural recrossing signal.',
    recurring_private_destinations: recurring(destByOrg, 'private_destination'),
    recurring_public_origins: recurring(origByOrg, 'public_origin'),
  },
  source_explicit_classification: {
    all_candidates_evidence_state: 'inferred_from_two_self_claims',
    generic_gate_core: 'tools/lib/generic-crossing.mjs',
    gate_passed: passed,
    gate_held: candidates.length - passed,
    hold_reason_counts: holdReasons,
    interpretation: 'Every candidate is HELD by the same generic gate that held FA-03. A LinkedIn self-claim is not an independent public receipt, and the organizations are unresolved identities, so no candidate advances to an established crossing. The reductions organize the candidates; they do not promote them.',
  },
  evidence_limit: 'Self-claimed, hash-pinned to a private profile PDF. Hashes identify the original bytes but do not replace them; independent identity resolution and visual source verification remain required and are absent here.',
  verification_status: 'machine_proposed_unverified',
  causal_status: 'not_established',
  graph_effect: 'none',
};
fs.writeFileSync(path.join(dir, 'crossing-analysis.json'), JSON.stringify(analysis, null, 2) + '\n');
console.log(`linkedin-crossing-analysis: ${candidates.length} candidates -> ${transitions.size} distinct transitions (${analysis.deduplication.reduction_ratio}x); adjacency ${JSON.stringify(adjacency)}; gate passed ${passed}/${candidates.length}`);
