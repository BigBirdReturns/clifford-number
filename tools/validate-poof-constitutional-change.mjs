#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const moduleRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
export const canonicalChangeLogPath = 'data/project/poof-clifford-constitutional-change-log.json';
const stable = (value) => JSON.stringify(value);
const sortedUnique = (values) => [...new Set(values || [])].sort();

export function remoteBranchForCandidate(candidate) {
  if (!candidate?.startsWith('origin/')) return null;
  const branch = candidate.slice('origin/'.length);
  if (!branch || branch.startsWith('/') || branch.endsWith('/') || branch.includes('..') || branch.includes('@{') || !/^[A-Za-z0-9._/-]+$/.test(branch)) return null;
  return branch;
}

export function resolveComparisonBase({ candidates, verify, fetchRemoteBranch }) {
  const uniqueCandidates = [...new Set((candidates || []).filter(Boolean))];
  for (const candidate of uniqueCandidates) if (verify(candidate)) return candidate;
  for (const candidate of uniqueCandidates) {
    const branch = remoteBranchForCandidate(candidate);
    if (!branch) continue;
    fetchRemoteBranch(branch);
    if (verify(candidate)) return candidate;
  }
  return null;
}

export function resolveCommittedPathDiff({ mergeBaseDiff, treeDiff }) {
  const mergeBaseOutput = mergeBaseDiff();
  if (mergeBaseOutput !== null) return { mode: 'merge_base', output: mergeBaseOutput };
  const treeOutput = treeDiff();
  if (treeOutput !== null) return { mode: 'tree_delta', output: treeOutput };
  throw new Error('Unable to compare constitutional paths with the selected base');
}

export function validateConstitutionalChangePlan({ baseContract, currentContract, baseLog, currentLog, changedPaths }) {
  const failures = [];
  const fail = (message) => failures.push(message);
  const baseProtected = new Set(baseContract?.constitutional_amendment_law?.protected_paths || []);
  const currentProtected = new Set(currentContract?.constitutional_amendment_law?.protected_paths || []);
  const protectedUnion = new Set([...baseProtected, ...currentProtected]);
  const changed = new Set(changedPaths || []);
  const touched = sortedUnique([...changed].filter((item) => protectedUnion.has(item)));
  const declaredProtected = sortedUnique(currentLog?.protected_paths || []);
  if (stable(declaredProtected) !== stable(sortedUnique([...currentProtected]))) fail('change log protected path registry does not match the current constitution');

  const baseChanges = baseLog?.changes || [];
  const currentChanges = currentLog?.changes || [];
  if (currentChanges.length < baseChanges.length) fail('constitutional change history was truncated');
  for (let index = 0; index < baseChanges.length; index += 1) {
    if (stable(currentChanges[index]) !== stable(baseChanges[index])) fail(`constitutional change history rewrote prior receipt ${baseChanges[index]?.change_id || index}`);
  }
  const appended = currentChanges.slice(baseChanges.length);
  const logChanged = changed.has(canonicalChangeLogPath);
  if (touched.length && !logChanged) fail('protected constitutional paths changed without changing the constitutional change log');
  if (logChanged && appended.length === 0) fail('constitutional change log changed without an appended receipt');

  const required = currentContract?.constitutional_amendment_law?.required_fields || [];
  const covered = [];
  for (const record of appended) {
    for (const field of required) if (!(field in record)) fail(`${record.change_id || 'new constitutional receipt'}: missing ${field}`);
    const recordPaths = sortedUnique(record.protected_paths_touched || []);
    if (recordPaths.length !== (record.protected_paths_touched || []).length) fail(`${record.change_id}: protected path coverage contains duplicates`);
    for (const item of recordPaths) {
      if (!protectedUnion.has(item)) fail(`${record.change_id}: path outside constitutional registry: ${item}`);
      covered.push(item);
    }
    if (record.graph_effect !== 'none') fail(`${record.change_id}: constitutional receipt cannot create graph authority`);
    if (record.emergency_override === true) {
      if (currentContract?.constitutional_amendment_law?.emergency_override_rule?.permitted !== true) fail(`${record.change_id}: emergency override not permitted`);
      if (!record.expires_at || Number.isNaN(Date.parse(record.expires_at))) fail(`${record.change_id}: emergency override lacks a valid expiry`);
      if (record.effective_at && Date.parse(record.expires_at) <= Date.parse(record.effective_at)) fail(`${record.change_id}: emergency override expiry is not later than its effective time`);
    }
  }
  if (stable(sortedUnique(covered)) !== stable(touched)) {
    fail(`new receipt coverage does not equal protected path diff; touched=${touched.join(',') || 'none'} covered=${sortedUnique(covered).join(',') || 'none'}`);
  }
  return { ok: failures.length === 0, failures, touched, appended: appended.map((row) => row.change_id) };
}

function git(args, { allowFailure = false } = {}) {
  try { return execFileSync('git', args, { cwd: moduleRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', allowFailure ? 'ignore' : 'pipe'] }).trim(); }
  catch (error) { if (allowFailure) return null; throw error; }
}

function jsonAt(ref, relative) {
  const value = git(['show', `${ref}:${relative}`], { allowFailure: true });
  return value === null ? null : JSON.parse(value);
}

function resolveBase(explicit) {
  const candidates = [explicit, process.env.GITHUB_BASE_REF ? `origin/${process.env.GITHUB_BASE_REF}` : null, 'origin/main', 'HEAD^'].filter(Boolean);
  const verify = (candidate) => Boolean(git(['rev-parse', '--verify', candidate], { allowFailure: true }));
  const fetchRemoteBranch = (branch) => {
    git(['fetch', '--no-tags', '--depth=1', 'origin', `+refs/heads/${branch}:refs/remotes/origin/${branch}`], { allowFailure: true });
  };
  const resolved = resolveComparisonBase({ candidates, verify, fetchRemoteBranch });
  if (resolved) return resolved;
  throw new Error('Unable to resolve a constitutional comparison base');
}

export function validateRepositoryConstitutionalChange({ root = moduleRoot, baseRef } = {}) {
  const resolvedBase = resolveBase(baseRef);
  const currentContract = JSON.parse(fs.readFileSync(path.join(root, 'data/project/poof-clifford-ecology-contract.json'), 'utf8'));
  const currentLog = JSON.parse(fs.readFileSync(path.join(root, canonicalChangeLogPath), 'utf8'));
  const baseContract = jsonAt(resolvedBase, 'data/project/poof-clifford-ecology-contract.json');
  const baseLog = jsonAt(resolvedBase, canonicalChangeLogPath);
  const committedComparison = resolveCommittedPathDiff({
    mergeBaseDiff: () => git(['diff', '--name-only', `${resolvedBase}...HEAD`], { allowFailure: true }),
    treeDiff: () => git(['diff', '--name-only', resolvedBase, 'HEAD'], { allowFailure: true })
  });
  const committed = committedComparison.output.split('\n').filter(Boolean);
  const working = git(['diff', '--name-only']).split('\n').filter(Boolean);
  const staged = git(['diff', '--cached', '--name-only']).split('\n').filter(Boolean);
  const untracked = git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean);
  const changedPaths = sortedUnique([...committed, ...working, ...staged, ...untracked]);
  return { baseRef: resolvedBase, comparisonMode: committedComparison.mode, ...validateConstitutionalChangePlan({ baseContract, currentContract, baseLog, currentLog, changedPaths }) };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = validateRepositoryConstitutionalChange({ baseRef: process.argv[2] });
  if (!result.ok) {
    console.error(`POOF constitutional change validation failed against ${result.baseRef}:\n${result.failures.map((row) => `- ${row}`).join('\n')}`);
    process.exit(1);
  }
  console.log(`validate-poof-constitutional-change: OK (${result.appended.length} appended receipt(s), ${result.touched.length} protected path(s), ${result.comparisonMode})`);
}
