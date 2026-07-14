import { readJson } from './ledger.mjs';

// Place-centered formation signatures. A signature is a reusable discovery
// shape: an ordered spine of stages plus optional signals. Expanding a
// signature over a place produces BOUNDED CANDIDATE SEARCHES (game trails),
// never findings. A match means "this place is worth the same bounded
// questions" — it never asserts coordination, wrongdoing, or geomancy.

export const SIGNATURE_REGISTRY = 'data/signatures/formation-signatures.json';

export function loadSignatures() {
  return readJson(SIGNATURE_REGISTRY);
}

export function validateSignature(signature) {
  const errors = [];
  if (!signature.signature_id) errors.push('signature lacks signature_id');
  if (signature.graph_effect !== 'none') errors.push(`signature ${signature.signature_id} must carry graph_effect none`);
  if (signature.promotes_to !== 'candidate_only') errors.push(`signature ${signature.signature_id} must promote to candidate_only`);
  if (!(signature.spine?.length >= 3)) errors.push(`signature ${signature.signature_id} needs an ordered spine of stages`);
  for (const stage of signature.spine ?? []) {
    if (!stage.stage_id || !stage.label || !(stage.search_templates?.length > 0)) {
      errors.push(`signature ${signature.signature_id} stage ${stage.stage_id ?? '?'} lacks label or search templates`);
    }
  }
  for (const signal of signature.optional_signals ?? []) {
    if (!signal.signal_id || !signal.label) errors.push(`signature ${signature.signature_id} has a malformed optional signal`);
  }
  if (!signature.forbidden_inference) {
    errors.push(`signature ${signature.signature_id} must carry its forbidden-inference note`);
  }
  return errors;
}

function fill(template, place) {
  return template
    .replaceAll('{place}', place.place_name)
    .replaceAll('{region}', place.region ?? place.place_name)
    .replaceAll('{transit}', place.transit_project ?? 'transit project');
}

// Expand a signature over a place descriptor into bounded candidate searches.
// Every emitted row is a candidate: graph_effect none, no claim fields, no
// verdicts. Promotion into any ledger is a separate, human-reviewed change.
export function generateTrailSearches(signature, place) {
  const errors = validateSignature(signature);
  if (errors.length) throw new Error(errors.join('\n'));
  if (!place?.place_name) throw new Error('place descriptor requires place_name');
  const searches = [];
  for (const stage of signature.spine) {
    for (const template of stage.search_templates) {
      searches.push({
        status: 'candidate',
        graph_effect: 'none',
        signature_id: signature.signature_id,
        stage_id: stage.stage_id,
        query: fill(template, place),
        target_domain: stage.target_domain ?? 'public_records',
        bounded: true,
      });
    }
  }
  for (const signal of signature.optional_signals ?? []) {
    for (const template of signal.search_templates ?? []) {
      searches.push({
        status: 'candidate',
        graph_effect: 'none',
        signature_id: signature.signature_id,
        stage_id: `signal:${signal.signal_id}`,
        query: fill(template, place),
        target_domain: signal.target_domain ?? 'public_records',
        bounded: true,
        optional_signal: true,
      });
    }
  }
  return searches;
}
