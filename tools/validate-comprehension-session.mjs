#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REQUIRED = [
  'schema_version', 'session_id', 'claim_id', 'artifact', 'independence',
  'ordinary_surface_actions', 'post_action_explanation'
];

function result(state, errors = []) {
  return { state, ok: errors.length === 0, errors };
}

export function validateComprehensionSession(session) {
  const errors = [];
  if (!session || typeof session !== 'object') return result('INADMISSIBLE', ['session must be an object']);
  for (const field of REQUIRED) if (!(field in session)) errors.push(`missing required field: ${field}`);
  if (session.schema_version !== 'clifford-comprehension-session@1') errors.push('unsupported schema_version');
  if (!session.artifact?.id || !/^[a-f0-9]{64}$/.test(session.artifact?.sha256 ?? '')) errors.push('artifact must have an id and lowercase SHA-256');
  if (session.independence?.fresh_operator !== true) errors.push('operator is not recorded as fresh');
  if (!Array.isArray(session.independence?.forbidden_channels_used)) errors.push('forbidden_channels_used must be an array');
  if (errors.length) return result('INADMISSIBLE', errors);
  if (session.independence.forbidden_channels_used.length) return result('INADMISSIBLE', ['forbidden evidence channel used']);
  if (!String(session.precommit_expectation ?? '').trim()) return result('INCONCLUSIVE', ['missing precommit expectation']);
  if (!Array.isArray(session.ordinary_surface_actions) || !session.ordinary_surface_actions.length) return result('INCONCLUSIVE', ['no ordinary-surface action recorded']);
  if (!String(session.post_action_explanation ?? '').trim()) return result('INCONCLUSIVE', ['missing post-action explanation']);
  const verdict = session.adjudication?.semantic_verdict;
  if (verdict === 'FAIL') return result('FAIL');
  if (verdict === 'INCONCLUSIVE') return result('INCONCLUSIVE');
  if (verdict === 'READY_FOR_ADJUDICATION') return result('READY_FOR_ADJUDICATION');
  return result('READY_FOR_ADJUDICATION');
}

function main() {
  const packet = process.argv[2];
  if (!packet) throw new Error('usage: node tools/validate-comprehension-session.mjs <session.json>');
  const session = JSON.parse(fs.readFileSync(path.resolve(packet), 'utf8'));
  const checked = validateComprehensionSession(session);
  console.log(JSON.stringify(checked, null, 2));
  if (checked.state === 'INADMISSIBLE') process.exitCode = 1;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
