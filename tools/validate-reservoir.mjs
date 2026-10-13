#!/usr/bin/env node
import path from 'node:path';
import { root } from './lib/ledger.mjs';
import { buildReservoir, readJsonlFile, validateCanonical, validateInquiry, HUMAN_ORIGIN_KINDS } from './lib/reservoir.mjs';

try {
  const canonical = {
    inquiries: readJsonlFile(path.join(root, 'data/reservoir/inquiries.jsonl')),
    decisions: readJsonlFile(path.join(root, 'data/decisions/prune-decisions.jsonl')),
    disagreements: readJsonlFile(path.join(root, 'data/reservoir/disagreements.jsonl')),
  };
  const errors = validateCanonical(canonical);
  if (errors.length) throw new Error(`canonical rows invalid:\n  ${errors.join('\n  ')}`);

  const built = buildReservoir({ write: false });
  const again = buildReservoir({ write: false });
  if (JSON.stringify(built.manifest) !== JSON.stringify(again.manifest)) throw new Error('build is not deterministic');

  const derivedErrors = [];
  built.inquiries.forEach((row, i) => validateInquiry(row, i, derivedErrors));
  if (derivedErrors.length) throw new Error(`compiled rows invalid:\n  ${derivedErrors.join('\n  ')}`);

  // Origin discipline: the owner's words never appear on a derived row, and a
  // derived row never claims to be an observation.
  for (const row of built.inquiries) {
    if (row.derived && HUMAN_ORIGIN_KINDS.includes(row.question_origin.kind)) {
      throw new Error(`${row.inquiry_id}: a derived row cannot carry a human origin`);
    }
    if (row.derived && !['derived_from_record', 'retrospective_interpretation'].includes(row.question_origin.kind)) {
      throw new Error(`${row.inquiry_id}: derived rows must be derived_from_record or retrospective_interpretation`);
    }
  }

  // Import discipline: nothing imported from the retrospective or a view
  // acquires a disposition or a review chore merely by being imported, and
  // a later headline never stands in for the original prompt.
  for (const row of built.inquiries) {
    const imported = row.derived && (row.derived.source === 'retrospective-2026-10-12' || String(row.derived.source).endsWith('.view.jsonl'));
    if (!imported) continue;
    const state = row.dispositions[row.dispositions.length - 1].state;
    if (state !== 'held') throw new Error(`${row.inquiry_id}: imported rows stay held, found ${state}`);
    if (row.next_examination) throw new Error(`${row.inquiry_id}: an import must not generate a review chore`);
    if (row.derived.source === 'retrospective-2026-10-12' && row.prompting_observation) throw new Error(`${row.inquiry_id}: a retrospective headline is not a prompting observation`);
    if (row.derived.source === 'retrospective-2026-10-12' && !(row.assessments || []).some((a) => a.assessment_id.startsWith('tier-'))) throw new Error(`${row.inquiry_id}: the retrospective tier must be kept as an attributed assessment`);
  }

  const c = built.manifest.counts;
  if (c.retrospective_inquiries !== 79) throw new Error(`expected 79 retrospective inquiries, found ${c.retrospective_inquiries}`);
  if (built.manifest.boundaries.graph_effect !== 'none') throw new Error('graph_effect must stay none');

  console.log(`validate-reservoir: OK (${c.total_inquiries} inquiries, ${c.held} held, ${c.decisions} decisions, ${c.disagreements} disagreements, ${c.contradictions} contradictions, ${c.without_prompting_observation} whose original prompt is not located in these inputs)`);
} catch (error) {
  console.error(`validate-reservoir failed: ${error.message}`);
  process.exit(1);
}
