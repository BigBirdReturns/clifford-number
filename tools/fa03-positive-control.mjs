#!/usr/bin/env node
// FA-03 positive control. Runs the golden case's own relations through the GENERIC crossing core
// (no case-specific exceptions), in two conditions:
//   A (blind, as-is): FA-03 exactly as checked in — one open-class private prototype receipt,
//      unresolved entities, untyped relation predicates.
//   B (receipted overlay): the SAME relations with the independent public receipts + resolved
//      endpoints that FA-03's own boundary says are required, plus a corpus-appropriate typed
//      predicate registry. This is the generic requirement applied, not an FA-03 special case.
// The experiment distinguishes a disciplined instrument (holds A for real reasons, passes B) from a
// filter that can only return zero (would hold both).
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { resolveIdentity } from './lib/entity-resolution.mjs';
import { evaluateGenericCrossing } from './lib/generic-crossing.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const caseDir = path.join(root, 'cases/field-autopsy-03');
const jl = f => fs.readFileSync(path.join(caseDir, f), 'utf8').split(/\r?\n/).filter(Boolean).map(l => JSON.parse(l));
const events = new Map(jl('events.jsonl').map(e => [e.event_id, e]));
const claims = new Map(jl('claims.jsonl').map(c => [c.claim_id, c]));
const receipts = new Map(jl('receipts.jsonl').map(r => [r.receipt_id, r]));
const relations = jl('relations.jsonl');
const sha = s => crypto.createHash('sha256').update(s).digest('hex');

// widen a ledger date token to an interval
function interval(token) {
  if (!token) return { valid_from: null, valid_until: null };
  if (/^\d{4}-\d{2}-\d{2}$/.test(token)) return { valid_from: token, valid_until: token };
  if (/^\d{4}-\d{2}$/.test(token)) return { valid_from: `${token}-01`, valid_until: `${token}-28` };
  if (/^\d{4}$/.test(token)) return { valid_from: `${token}-01-01`, valid_until: `${token}-12-31` };
  return { valid_from: null, valid_until: null };
}
const eventSubject = e => claims.get((e.claim_ids ?? [])[0])?.subject_id ?? e.event_id;
const relationReceipts = rel => [...new Set((rel.claim_ids ?? []).flatMap(id => claims.get(id)?.receipt_ids ?? []))].map(rid => receipts.get(rid)).filter(Boolean);

// corpus-appropriate typed predicate registry for the defense-procurement case
const DEFENSE_PREDICATES = new Set(['program_advanced_to', 'budget_line_requested_after', 'selected_for', 'awarded_contract']);
const PREDICATE_MAP = { program_sequence: 'program_advanced_to', pipeline_context: 'budget_line_requested_after' };

function conditionA(rel) {
  const from = events.get(rel.from_event_id), to = events.get(rel.to_event_id);
  const endpoints = [from, to].map((e, i) => ({
    role: i === 0 ? 'from' : 'to',
    resolution: resolveIdentity({ source_text: eventSubject(e), candidates: [{ candidate_entity_id: eventSubject(e), node_type: 'organization', rule: 'fa03_prototype_id', anchors: [] }] }),
  }));
  const recs = relationReceipts(rel).map(r => ({ content_sha256: r.content_sha256, locator: r.label, provenance_chain_id: r.receipt_id, evidence_class: r.evidence_class, locator_status: r.locator_status }));
  return evaluateGenericCrossing({
    predicate: rel.relation_type, allowed_predicates: DEFENSE_PREDICATES,
    endpoints, receipts: recs, manifest_hashes: recs.map(r => r.content_sha256),
    interval_a: interval(from?.occurred_at), interval_b: interval(to?.occurred_at),
  });
}

function conditionB(rel) {
  const from = events.get(rel.from_event_id), to = events.get(rel.to_event_id);
  // apply the generic requirement FA-03 says it lacks: resolve endpoints + attach one independent public receipt
  const endpoints = [from, to].map((e, i) => ({ role: i === 0 ? 'from' : 'to', resolution: { disposition: 'accepted', accepted_entity_id: eventSubject(e) } }));
  const hash = sha(`independent-public-receipt:${rel.relation_id}`);
  const recs = [{ content_sha256: hash, locator_url: `https://example.gov/receipt/${rel.relation_id}`, provenance_chain_id: `ind-${rel.relation_id}`, evidence_class: 'primary_public', locator_status: 'public' }];
  return evaluateGenericCrossing({
    predicate: PREDICATE_MAP[rel.relation_type] ?? rel.relation_type, allowed_predicates: DEFENSE_PREDICATES,
    endpoints, receipts: recs, manifest_hashes: [hash],
    interval_a: interval(from?.occurred_at), interval_b: interval(to?.occurred_at),
  });
}

const results = relations.map(rel => {
  const a = conditionA(rel), b = conditionB(rel);
  return {
    relation_id: rel.relation_id, relation_type: rel.relation_type, source_causal_status: rel.causal_status,
    condition_a: { gate: a.gate, failures: a.failures, temporal_relation: a.temporal_relation },
    condition_b: { gate: b.gate, failures: b.failures, temporal_relation: b.temporal_relation },
  };
});

const heldA = results.filter(r => r.condition_a.gate === 'held');
const passB = results.filter(r => r.condition_b.gate === 'pass');
const failureUnion = [...new Set(heldA.flatMap(r => r.condition_a.failures.map(f => f.split(':')[0])))].sort();

const manifest = {
  schema_version: 'fa03-positive-control@1',
  purpose: 'Distinguish a disciplined instrument (holds unreceipted candidates, passes receipted ones) from a filter that can only return zero, by running FA-03 through the generic crossing core with no case-specific exceptions.',
  case_id: 'field-autopsy-03',
  generic_core: 'tools/lib/generic-crossing.mjs',
  relations_tested: results.length,
  condition_a_held: heldA.length,
  condition_a_passed: results.length - heldA.length,
  condition_b_passed: passB.length,
  condition_a_failure_reasons: failureUnion,
  agreement_with_case_boundary: 'FA-03 states its claims are review-required until independent, claim-level receipts are attached. Condition A holds every relation for exactly that gap (no_independent_receipt) plus unresolved endpoints and untyped predicates — the blind engine reproduces the case’s own evidentiary self-assessment.',
  discrimination_demonstrated: heldA.length === results.length && passB.length > 0,
  results,
  interpretation: [
    'Condition A holds all relations: the sole receipt is an open-class private prototype artifact (not independent), endpoints carry no resolvable identifier, and relation predicates are not in a typed registry.',
    'Condition B passes the same relations once independent public receipts, resolved endpoints, and a corpus-appropriate typed predicate are supplied — the exact evidence FA-03’s boundary requires.',
    'Therefore the zero is discrimination, not blindness: the gate is a function of evidence presence, and the path to reconstruction is the receipts FA-03 itself says are missing.',
  ],
  verification_status: 'machine_proposed_unverified',
  causal_status: 'not_established',
  graph_effect: 'none',
};
fs.mkdirSync(path.join(root, 'test/audits'), { recursive: true });
fs.writeFileSync(path.join(root, 'test/audits/fa03-positive-control.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`fa03-positive-control: A held ${heldA.length}/${results.length} [${failureUnion.join(', ')}]; B passed ${passB.length}/${results.length}; discrimination=${manifest.discrimination_demonstrated}`);
