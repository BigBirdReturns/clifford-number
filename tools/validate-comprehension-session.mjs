#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJsonl, root } from './lib/ledger.mjs';

export const TERMINAL_RESULT = 'bounded structural context; no pairwise hop.';
export const VALIDATOR_STATES = Object.freeze([
  'READY_FOR_ADJUDICATION',
  'FAIL',
  'INCONCLUSIVE',
  'INADMISSIBLE',
]);

const REQUIRED_BLOCKS = Object.freeze([
  'pathfinding',
  'clifford_score_changes',
  'printable_output',
  'newsroom_narration',
  'quotable_narrative',
  'public_ui_linkage',
]);
const CONTAMINATION_FLAGS = Object.freeze([
  'assessor_is_builder',
  'prior_route_exposure',
  'answer_key_access',
  'coordination_with_builder',
]);
const SEMANTIC_FIELDS = Object.freeze([
  'recognized_context_only',
  'rejected_pairwise_hop',
  'rejected_roster_as_path',
  'rejected_attendance_inference',
  'rejected_agreement_inference',
  'rejected_wrongdoing_inference',
]);
const PRESENTATION_FALSE_FIELDS = Object.freeze([
  'printable_output_generated',
  'newsroom_narration_generated',
  'quotable_narrative_generated',
  'generalized_connection_claimed',
  'pairwise_hop_claimed',
]);

function object(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function validTime(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}
function sameSet(actual, expected) {
  return Array.isArray(actual)
    && actual.length === expected.length
    && new Set(actual).size === expected.length
    && expected.every(value => actual.includes(value));
}
function emptyArray(value) {
  return Array.isArray(value) && value.length === 0;
}

export function loadComprehensionLedger() {
  return {
    surfaces: readJsonl('data/ledger/surfaces.jsonl'),
    receipts: readJsonl('data/ledger/receipts.jsonl'),
  };
}

export function validateRouteContract(contract, ledger = loadComprehensionLedger()) {
  const errors = [];
  const warnings = [];
  const require = (condition, message) => { if (!condition) errors.push(message); };

  if (!object(contract)) return { errors: ['route contract must be a JSON object'], warnings };

  require(contract.schema_version === 'comprehension-route@1', 'route schema_version must be comprehension-route@1');
  require(contract.route_id === 'dialog-structural-context', 'route_id must be dialog-structural-context');
  require(contract.contract_version === 'dialog-structural-context@1', 'contract_version must be dialog-structural-context@1');
  require(contract.phase === 'phase-0', 'Dialog route must remain phase-0');
  require(contract.classification === 'comprehension_harness', 'Dialog route must remain a comprehension_harness');
  require(contract.visibility === 'local_or_limited', 'Dialog route visibility must remain local_or_limited');
  require(contract.public_facing === false, 'Dialog route must not be public-facing');
  require(contract.source_surface_id === 'dialog-society-membership', 'Dialog route must bind only to dialog-society-membership');
  require(contract.terminal_result === TERMINAL_RESULT, `terminal_result must equal ${JSON.stringify(TERMINAL_RESULT)}`);

  require(object(contract.blocked_capabilities), 'blocked_capabilities declaration is required');
  for (const capability of REQUIRED_BLOCKS) {
    require(contract.blocked_capabilities?.[capability] === true, `blocked capability must remain true: ${capability}`);
  }

  const rendering = contract.rendering;
  require(object(rendering), 'rendering declaration is required');
  require(rendering?.quotable_narrative_paragraphs === false, 'quotable narrative paragraphs must be disabled');
  require(rendering?.generalized_connection_output === false, 'generalized connection output must be disabled');
  const permittedOutputs = new Set(['bounded_surface_metadata', 'receipt_metadata', 'terminal_result']);
  require(Array.isArray(rendering?.allowed_output_types) && rendering.allowed_output_types.length > 0,
    'rendering.allowed_output_types must be a non-empty array');
  for (const type of rendering?.allowed_output_types ?? []) {
    require(permittedOutputs.has(type), `route permits forbidden output type: ${type}`);
  }

  const selection = contract.selection;
  require(object(selection), 'deterministic selection declaration is required');
  require(selection?.strategy === 'all_actor_participations', 'selection.strategy must be all_actor_participations');
  require(selection?.source_surface_id === contract.source_surface_id, 'selection source must equal the route source surface');
  require(selection?.randomness === 'none', 'selection randomness must be none');
  require(selection?.manual_override === false, 'selection manual_override must be false');
  require(Array.isArray(selection?.ordering) && selection.ordering.length > 0, 'selection ordering must be declared');

  const audit = contract.neighboring_hop_control_audit;
  require(object(audit), 'neighboring hop/control audit is required');
  require(audit?.status === 'empty_by_design', 'neighboring audit status must be empty_by_design');
  require(emptyArray(audit?.referenced_hop_ids), 'neighboring hop audit must be empty');
  require(emptyArray(audit?.referenced_control_ids), 'neighboring control audit must be empty');
  require(typeof audit?.reason === 'string' && audit.reason.trim().length > 0, 'empty neighboring audit must carry a reason');

  const session = contract.session_requirements;
  require(object(session), 'session_requirements declaration is required');
  require(session?.pre_exposure_prediction_required === true, 'pre-exposure prediction must be required');
  require(session?.independent_assessor_required === true, 'independent assessor must be required');
  require(session?.contamination_disqualifies === true, 'contamination must disqualify a session');
  require(session?.automatic_pass_forbidden === true, 'automatic PASS must remain forbidden');
  require(sameSet(session?.allowed_validator_states, VALIDATOR_STATES),
    `allowed validator states must be exactly: ${VALIDATOR_STATES.join(', ')}`);
  require(!session?.allowed_validator_states?.includes('PASS'), 'PASS must not appear in allowed validator states');

  const surface = ledger.surfaces?.find(row => row.surface_id === contract.source_surface_id);
  require(Boolean(surface), `source surface is missing from the ledger: ${contract.source_surface_id}`);
  require(surface?.hop_eligible === false, 'dialog-society-membership must remain hop_eligible: false');

  const receiptById = new Map((ledger.receipts ?? []).map(row => [row.receipt_id, row]));
  const requirementById = new Map((contract.evidence_requirements ?? []).map(row => [row.receipt_id, row]));
  for (const [receiptId, evidenceClass] of [
    ['wired-dialog-leak', 'reported'],
    ['dialog-directory-extract', 'primary_public'],
  ]) {
    require(requirementById.get(receiptId)?.required_evidence_class === evidenceClass,
      `${receiptId} contract class must remain ${evidenceClass}`);
    require(receiptById.get(receiptId)?.evidence_class === evidenceClass,
      `${receiptId} ledger evidence_class must remain ${evidenceClass}`);
    require(surface?.receipt_ids?.includes(receiptId), `${surface?.surface_id ?? 'source surface'} must cite ${receiptId}`);
  }

  if (!Array.isArray(contract.semantic_constraints) || contract.semantic_constraints.length < 4) {
    warnings.push('semantic_constraints should cover context, hops, inferred conduct, and the terminal result');
  }
  return { errors, warnings };
}

function inadmissibilityReasons(packet, contract) {
  const reasons = [];
  if (!object(packet)) return ['session packet must be a JSON object'];
  if (packet.schema_version !== 'comprehension-session@1') reasons.push('session schema_version must be comprehension-session@1');
  if (packet.route_id !== contract.route_id) reasons.push('session route_id does not match the route contract');
  if (packet.route_contract_version !== contract.contract_version) reasons.push('session route_contract_version does not match the route contract');
  if (packet.status === 'PASS' || packet.validator_status === 'PASS') reasons.push('session packet attempts to assert forbidden automatic PASS');

  const prediction = packet.prediction;
  if (!object(prediction)) {
    reasons.push('pre-exposure prediction is missing');
  } else {
    if (prediction.recorded_before_exposure !== true) reasons.push('prediction was not declared as recorded before exposure');
    if (!validTime(prediction.recorded_at) || !validTime(prediction.exposure_started_at)) {
      reasons.push('prediction and exposure timestamps must be valid');
    } else if (Date.parse(prediction.recorded_at) >= Date.parse(prediction.exposure_started_at)) {
      reasons.push('prediction timestamp must precede exposure timestamp');
    }
    if (prediction.expected_terminal_class !== 'bounded_structural_context_no_pairwise_hop') {
      reasons.push('prediction must declare the bounded context/no-hop terminal class');
    }
  }

  const independence = packet.independence;
  if (!object(independence)) {
    reasons.push('independence declaration is missing');
  } else {
    for (const flag of CONTAMINATION_FLAGS) {
      if (typeof independence[flag] !== 'boolean') reasons.push(`independence flag must be boolean: ${flag}`);
      else if (independence[flag]) reasons.push(`session contamination declared: ${flag}`);
    }
    if (!Array.isArray(independence.conflicts_disclosed)) reasons.push('independence.conflicts_disclosed must be an array');
  }
  return reasons;
}

function presentationFailures(packet, contract) {
  const presentation = packet.presentation;
  if (!object(presentation)) return [];
  const failures = [];
  if (presentation.terminal_result !== contract.terminal_result) failures.push('terminal result is absent or semantically changed');
  if (presentation.pathfinding_output !== null && presentation.pathfinding_output !== undefined) failures.push('pathfinding output was produced');
  if (presentation.score_delta !== 0) failures.push('a Clifford score change was produced');
  for (const field of PRESENTATION_FALSE_FIELDS) {
    if (presentation[field] !== false) failures.push(`prohibited presentation behavior: ${field}`);
  }
  if (!emptyArray(presentation.neighboring_hop_ids)) failures.push('neighboring hops were referenced');
  if (!emptyArray(presentation.neighboring_control_ids)) failures.push('neighboring controls were referenced');
  return failures;
}

function semanticFailures(packet) {
  if (!object(packet.semantic_assessment)) return [];
  return SEMANTIC_FIELDS
    .filter(field => packet.semantic_assessment[field] === false)
    .map(field => `semantic check failed: ${field}`);
}

function inconclusiveReasons(packet) {
  const reasons = [];
  if (!object(packet.presentation)) reasons.push('presentation record is missing');
  if (!object(packet.semantic_assessment)) {
    reasons.push('semantic assessment is missing');
  } else {
    for (const field of SEMANTIC_FIELDS) {
      if (packet.semantic_assessment[field] !== true && packet.semantic_assessment[field] !== false) {
        reasons.push(`semantic check is unresolved: ${field}`);
      }
    }
  }
  if (!object(packet.completeness)) {
    reasons.push('completeness declaration is missing');
  } else {
    if (packet.completeness.response_captured !== true) reasons.push('response was not fully captured');
    if (packet.completeness.assessor_confidence !== 'sufficient') reasons.push('assessor confidence is insufficient');
  }
  return reasons;
}

function result(packet, contract, status, reasons, adjudicationRequired = false) {
  return {
    schema_version: 'comprehension-validation@1',
    route_id: contract.route_id,
    session_id: packet?.session_id ?? null,
    status,
    automatic_pass: false,
    adjudication_required: adjudicationRequired,
    reasons,
  };
}

export function classifyComprehensionSession(packet, contract) {
  const inadmissible = inadmissibilityReasons(packet, contract);
  if (inadmissible.length) return result(packet, contract, 'INADMISSIBLE', inadmissible);

  const failures = [...presentationFailures(packet, contract), ...semanticFailures(packet)];
  if (failures.length) return result(packet, contract, 'FAIL', failures);

  const inconclusive = inconclusiveReasons(packet);
  if (inconclusive.length) return result(packet, contract, 'INCONCLUSIVE', inconclusive);

  return result(packet, contract, 'READY_FOR_ADJUDICATION', [
    'The packet is admissible and semantically complete; a human adjudicator must determine the final evidentiary finding.',
  ], true);
}

function parseArgs(argv) {
  const positional = [];
  let requireReady = false;
  for (const arg of argv) {
    if (arg === '--require-ready') requireReady = true;
    else if (arg.startsWith('--')) throw new Error(`unknown option: ${arg}`);
    else positional.push(arg);
  }
  return { positional, requireReady };
}

export function runCli(argv = process.argv.slice(2)) {
  let options;
  try {
    options = parseArgs(argv);
  } catch (error) {
    console.error(`validate-comprehension-session: ${error.message}`);
    return 2;
  }
  const [packetArg, contractArg] = options.positional;
  if (!packetArg || options.positional.length > 2) {
    console.error('usage: node tools/validate-comprehension-session.mjs <session-packet.json> [route-contract.json] [--require-ready]');
    return 2;
  }

  try {
    const packet = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), packetArg), 'utf8'));
    const contractPath = contractArg
      ? path.resolve(process.cwd(), contractArg)
      : path.join(root, 'comprehension/routes/dialog-structural-context.json');
    const contract = JSON.parse(fs.readFileSync(contractPath, 'utf8'));
    const routeValidation = validateRouteContract(contract);
    if (routeValidation.errors.length) {
      console.error('validate-comprehension-session: invalid route contract');
      for (const error of routeValidation.errors) console.error(`- ${error}`);
      return 1;
    }
    for (const warning of routeValidation.warnings) console.warn(`warning: ${warning}`);
    const classified = classifyComprehensionSession(packet, contract);
    console.log(JSON.stringify(classified, null, 2));
    return options.requireReady && classified.status !== 'READY_FOR_ADJUDICATION' ? 1 : 0;
  } catch (error) {
    console.error(`validate-comprehension-session: ${error.message}`);
    return 2;
  }
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath && fileURLToPath(import.meta.url) === invokedPath) process.exitCode = runCli();
