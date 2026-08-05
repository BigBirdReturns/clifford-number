#!/usr/bin/env python3
from __future__ import annotations

from pathlib import Path


LIB_PATH = Path("tools/lib/preference-custody-manifest-v46.mjs")
TEST_PATH = Path("test/preference-custody-manifest-v46.test.js")


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected one anchor, found {count}")
    return text.replace(old, new, 1)


lib = LIB_PATH.read_text()
test = TEST_PATH.read_text()

exact_keys_anchor = """function requireExactKeys(value, expected, label, errors) {
  const keys = Reflect.ownKeys(object(value));
  const stringKeys = keys.filter(key => typeof key === 'string');
  if (
    stringKeys.length !== keys.length ||
    stable(sorted(stringKeys)) !== stable(sorted(expected)) ||
    stringKeys.length !== expected.length
  ) errors.push(`${label} key ledger mismatch`);
}
"""
cache_helpers = exact_keys_anchor + """function validateCacheSafeJsonTree(value, label, errors) {
  const seen = new WeakSet();
  const walk = (current, path) => {
    const type = typeof current;
    if (current === null || type === 'string' || type === 'boolean') return;
    if (type === 'number') {
      if (!Number.isFinite(current)) errors.push(`${path} must contain only finite JSON numbers`);
      return;
    }
    if (type !== 'object') {
      errors.push(`${path} contains unsupported JSON value type ${type}`);
      return;
    }
    if (seen.has(current)) {
      errors.push(`${path} contains a repeated or cyclic object`);
      return;
    }
    seen.add(current);
    let prototype;
    let keys;
    try {
      prototype = Object.getPrototypeOf(current);
      keys = Reflect.ownKeys(current);
    } catch {
      errors.push(`${path} must be inspectable cache-safe JSON data`);
      return;
    }
    if (Array.isArray(current)) {
      if (prototype !== Array.prototype) errors.push(`${path} must use the canonical array prototype`);
      const expectedKeys = new Set(['length', ...Array.from({ length: current.length }, (_, index) => String(index))]);
      if (keys.length !== expectedKeys.size || keys.some(key => typeof key !== 'string' || !expectedKeys.has(key))) {
        errors.push(`${path} array key ledger mismatch`);
      }
      for (let index = 0; index < current.length; index += 1) {
        const key = String(index);
        if (!Object.hasOwn(current, key)) {
          errors.push(`${path}[${index}] must not be sparse`);
          continue;
        }
        let descriptor;
        try {
          descriptor = Object.getOwnPropertyDescriptor(current, key);
        } catch {
          descriptor = null;
        }
        if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
          errors.push(`${path}[${index}] must be an enumerable data property`);
          continue;
        }
        walk(descriptor.value, `${path}[${index}]`);
      }
      return;
    }
    if (prototype !== Object.prototype) errors.push(`${path} must use the canonical object prototype`);
    for (const key of keys) {
      if (typeof key !== 'string') {
        errors.push(`${path} must not contain symbol keys`);
        continue;
      }
      let descriptor;
      try {
        descriptor = Object.getOwnPropertyDescriptor(current, key);
      } catch {
        descriptor = null;
      }
      if (!descriptor || !descriptor.enumerable || !Object.hasOwn(descriptor, 'value')) {
        errors.push(`${path}.${key} must be an enumerable data property`);
        continue;
      }
      walk(descriptor.value, `${path}.${key}`);
    }
  };
  walk(value, label);
}
function snapshotCacheSafeV45Inputs(baseBuild, baseSources, errors) {
  validateCacheSafeJsonTree(baseBuild, 'v46 v45 base build cache input', errors);
  validateCacheSafeJsonTree(baseSources, 'v46 v45 source bundle cache input', errors);
  if (errors.length) return null;
  let snapshot;
  try {
    snapshot = structuredClone({ baseBuild, baseSources });
  } catch {
    errors.push('v46 v45 cache inputs must be structured-cloneable canonical JSON data');
    return null;
  }
  const snapshotErrors = [];
  validateCacheSafeJsonTree(snapshot.baseBuild, 'v46 v45 base build cache snapshot', snapshotErrors);
  validateCacheSafeJsonTree(snapshot.baseSources, 'v46 v45 source bundle cache snapshot', snapshotErrors);
  errors.push(...snapshotErrors);
  return errors.length ? null : snapshot;
}
"""
lib = replace_once(lib, exact_keys_anchor, cache_helpers, "cache helper insertion")

cache_anchor = """function validateQualifiedV45Base(baseBuild, baseSources) {
  const keyErrors = [];
  requireExactKeys(baseBuild, EXPECTED_BUILD_KEYS, 'v46 v45 base build', keyErrors);
  requireExactKeys(baseSources, EXPECTED_BASE_SOURCE_KEYS, 'v46 v45 source bundle', keyErrors);
  if (keyErrors.length) return keyErrors;
  const cacheKey = sha256({ baseBuild, baseSources });
  const cached = QUALIFIED_V45_BASE_VALIDATION_CACHE.get(cacheKey);
  if (cached) return [...cached];
  const errors = validatePreferenceCustodyManifestV45Build(
    baseBuild,
    baseSources?.manifest,
    baseSources?.baseBuild,
    baseSources?.targetBuild,
    baseSources?.targetFixture,
    baseSources?.baseSources
  );
  QUALIFIED_V45_BASE_VALIDATION_CACHE.set(cacheKey, Object.freeze([...errors]));
  return errors;
}
"""
cache_replacement = """function validateQualifiedV45Base(baseBuild, baseSources) {
  const keyErrors = [];
  requireExactKeys(baseBuild, EXPECTED_BUILD_KEYS, 'v46 v45 base build', keyErrors);
  requireExactKeys(baseSources, EXPECTED_BASE_SOURCE_KEYS, 'v46 v45 source bundle', keyErrors);
  const snapshot = snapshotCacheSafeV45Inputs(baseBuild, baseSources, keyErrors);
  if (!snapshot) return keyErrors;
  const cacheKey = sha256(snapshot);
  if (sha256({ baseBuild, baseSources }) !== cacheKey) return ['v46 v45 cache inputs changed during snapshot preflight'];
  const cached = QUALIFIED_V45_BASE_VALIDATION_CACHE.get(cacheKey);
  if (cached) return [...cached];
  const errors = validatePreferenceCustodyManifestV45Build(
    snapshot.baseBuild,
    snapshot.baseSources?.manifest,
    snapshot.baseSources?.baseBuild,
    snapshot.baseSources?.targetBuild,
    snapshot.baseSources?.targetFixture,
    snapshot.baseSources?.baseSources
  );
  if (sha256({ baseBuild, baseSources }) !== cacheKey) errors.push('v46 v45 cache inputs changed during full validation');
  QUALIFIED_V45_BASE_VALIDATION_CACHE.set(cacheKey, Object.freeze([...errors]));
  return errors;
}
"""
lib = replace_once(lib, cache_anchor, cache_replacement, "qualified v45 cache replacement")

compile_anchor = """export function compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const qualifiedBaseErrors = validateQualifiedV45Base(baseBuild, baseSources);
  const errors = [
    ...validatePreferenceCustodyManifestV46(manifest),
    ...validateBaseSources(baseBuild, baseSources),
    ...qualifiedBaseErrors.map(error => `v46 v45 build invalid: ${error}`),
    ...validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild(targetBuild, targetFixture),
    ...validateSourceChronology(manifest?.captured_at, baseBuild, targetBuild, targetFixture, baseSources)
  ];
"""
compile_replacement = """export function compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, baseSources) {
  const qualifiedBaseErrors = validateQualifiedV45Base(baseBuild, baseSources);
  const baseSourceErrors = qualifiedBaseErrors.length ? [] : validateBaseSources(baseBuild, baseSources);
  const chronologyErrors = qualifiedBaseErrors.length ? [] : validateSourceChronology(manifest?.captured_at, baseBuild, targetBuild, targetFixture, baseSources);
  const errors = [
    ...validatePreferenceCustodyManifestV46(manifest),
    ...baseSourceErrors,
    ...qualifiedBaseErrors.map(error => `v46 v45 build invalid: ${error}`),
    ...validatePreferenceLinkageIntervalMethodPartitionReplicationDeploymentBuild(targetBuild, targetFixture),
    ...chronologyErrors
  ];
"""
lib = replace_once(lib, compile_anchor, compile_replacement, "compile preflight replacement")

build_source_anchor = """  if (!baseSources) errors.push('compiled v46 complete v45 source bundle is required');
  if (manifest) errors.push(...validateDirectSourceChronology(manifest.captured_at, baseBuild, targetBuild, targetFixture, baseSources));
  if (baseBuild) {
"""
build_source_replacement = """  if (!baseSources) errors.push('compiled v46 complete v45 source bundle is required');
  const qualifiedBaseErrors = baseBuild && baseSources ? validateQualifiedV45Base(baseBuild, baseSources) : [];
  if (qualifiedBaseErrors.length) errors.push(...qualifiedBaseErrors.map(error => `compiled v46 base invalid: ${error}`));
  if (manifest && !qualifiedBaseErrors.length) errors.push(...validateDirectSourceChronology(manifest.captured_at, baseBuild, targetBuild, targetFixture, baseSources));
  if (baseBuild && !qualifiedBaseErrors.length) {
"""
lib = replace_once(lib, build_source_anchor, build_source_replacement, "build validator early preflight")

open_guard_anchor = """  if (baseBuild) {
    const expectedOpen = unique([...array(baseBuild.open_frontiers).filter(frontier => frontier !== RESOLVED_FRONTIER), ...REQUIRED_SUCCESSORS]);
"""
open_guard_replacement = """  if (baseBuild && !qualifiedBaseErrors.length) {
    const expectedOpen = unique([...array(baseBuild.open_frontiers).filter(frontier => frontier !== RESOLVED_FRONTIER), ...REQUIRED_SUCCESSORS]);
"""
lib = replace_once(lib, open_guard_anchor, open_guard_replacement, "open-frontier guard")

ledger_guard_anchor = """  if (manifest && baseBuild && targetBuild) {
    const expectedIdentification = [...array(baseBuild.identification_requirements), canonical(REQUIRED_IDENTIFICATION_REQUIREMENT)];
"""
ledger_guard_replacement = """  if (manifest && baseBuild && targetBuild && !qualifiedBaseErrors.length) {
    const expectedIdentification = [...array(baseBuild.identification_requirements), canonical(REQUIRED_IDENTIFICATION_REQUIREMENT)];
"""
lib = replace_once(lib, ledger_guard_anchor, ledger_guard_replacement, "base-ledger guard")

base_mutation_anchor = """  ['symbol extra key after cache warmup', x => x[Symbol('controller')] = undefined]
];
"""
base_mutation_replacement = """  ['symbol extra key after cache warmup', x => x[Symbol('controller')] = undefined],
  ['nested undefined extra key after cache warmup', x => x.controls[0].controller = undefined],
  ['nested function extra key after cache warmup', x => x.controls[0].controller = () => 'external'],
  ['nested non-enumerable extra key after cache warmup', x => Object.defineProperty(x.controls[0], 'controller', { value: undefined, enumerable: false, configurable: true })],
  ['nested symbol extra key after cache warmup', x => x.controls[0][Symbol('controller')] = undefined],
  ['nested accessor after cache warmup', x => Object.defineProperty(x.controls[0], 'controller', { get: () => undefined, enumerable: true, configurable: true })],
  ['nested custom prototype after cache warmup', x => Object.setPrototypeOf(x.controls[0], { controller: undefined })],
  ['nested cycle after cache warmup', x => x.controls[0].cycle = x.controls[0]],
  ['nested sparse array after cache warmup', x => delete x.controls[0].required_refusal_rules[0]]
];
"""
test = replace_once(test, base_mutation_anchor, base_mutation_replacement, "base mutation expansion")

explicit_anchor = """const deepExtraKeyBaseSources = clone(baseSources);
"""
explicit_replacement = """const topLevelNonEnumerableBaseAfterCacheWarmup = clone(baseBuild);
Object.defineProperty(topLevelNonEnumerableBaseAfterCacheWarmup, 'controller', { value: undefined, enumerable: false, configurable: true });
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, topLevelNonEnumerableBaseAfterCacheWarmup, targetBuild, targetFixture, baseSources),
  /v46 v45 base build key ledger mismatch/,
  'non-enumerable v45 base extra key reused cached validation'
);

const topLevelSymbolBaseAfterCacheWarmup = clone(baseBuild);
topLevelSymbolBaseAfterCacheWarmup[Symbol('controller')] = undefined;
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, topLevelSymbolBaseAfterCacheWarmup, targetBuild, targetFixture, baseSources),
  /v46 v45 base build key ledger mismatch/,
  'symbol v45 base extra key reused cached validation'
);

const nestedUndefinedExtraBaseAfterCacheWarmup = clone(baseBuild);
nestedUndefinedExtraBaseAfterCacheWarmup.controls[0].controller = undefined;
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, nestedUndefinedExtraBaseAfterCacheWarmup, targetBuild, targetFixture, baseSources),
  /unsupported JSON value type undefined/,
  'nested undefined-valued v45 base extra key reused cached validation'
);

const nestedFunctionExtraBaseAfterCacheWarmup = clone(baseBuild);
nestedFunctionExtraBaseAfterCacheWarmup.controls[0].controller = () => 'external';
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, nestedFunctionExtraBaseAfterCacheWarmup, targetBuild, targetFixture, baseSources),
  /unsupported JSON value type function/,
  'nested function-valued v45 base extra key reused cached validation'
);

const nestedNonEnumerableBaseAfterCacheWarmup = clone(baseBuild);
Object.defineProperty(nestedNonEnumerableBaseAfterCacheWarmup.controls[0], 'controller', { value: undefined, enumerable: false, configurable: true });
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, nestedNonEnumerableBaseAfterCacheWarmup, targetBuild, targetFixture, baseSources),
  /must be an enumerable data property/,
  'nested non-enumerable v45 base key reused cached validation'
);

const nestedSymbolBaseAfterCacheWarmup = clone(baseBuild);
nestedSymbolBaseAfterCacheWarmup.controls[0][Symbol('controller')] = undefined;
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, nestedSymbolBaseAfterCacheWarmup, targetBuild, targetFixture, baseSources),
  /must not contain symbol keys/,
  'nested symbol v45 base key reused cached validation'
);

const nestedAccessorBaseAfterCacheWarmup = clone(baseBuild);
Object.defineProperty(nestedAccessorBaseAfterCacheWarmup.controls[0], 'controller', { get: () => undefined, enumerable: true, configurable: true });
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, nestedAccessorBaseAfterCacheWarmup, targetBuild, targetFixture, baseSources),
  /must be an enumerable data property/,
  'nested accessor v45 base key reused cached validation'
);

const nestedPrototypeBaseAfterCacheWarmup = clone(baseBuild);
Object.setPrototypeOf(nestedPrototypeBaseAfterCacheWarmup.controls[0], { controller: undefined });
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, nestedPrototypeBaseAfterCacheWarmup, targetBuild, targetFixture, baseSources),
  /must use the canonical object prototype/,
  'nested custom prototype v45 base reused cached validation'
);

const cyclicBaseAfterCacheWarmup = clone(baseBuild);
cyclicBaseAfterCacheWarmup.controls[0].cycle = cyclicBaseAfterCacheWarmup.controls[0];
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, cyclicBaseAfterCacheWarmup, targetBuild, targetFixture, baseSources),
  /repeated or cyclic object/,
  'cyclic v45 base reached canonical cache hashing'
);

const sparseBaseAfterCacheWarmup = clone(baseBuild);
delete sparseBaseAfterCacheWarmup.controls[0].required_refusal_rules[0];
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, sparseBaseAfterCacheWarmup, targetBuild, targetFixture, baseSources),
  /array key ledger mismatch|must not be sparse/,
  'sparse v45 base array reused cached validation'
);

const nestedUndefinedExtraSourceAfterCacheWarmup = clone(baseSources);
nestedUndefinedExtraSourceAfterCacheWarmup.baseBuild.controls[0].controller = undefined;
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, nestedUndefinedExtraSourceAfterCacheWarmup),
  /unsupported JSON value type undefined/,
  'nested undefined-valued v45 source extra key reused cached validation'
);

const nestedFunctionExtraSourceAfterCacheWarmup = clone(baseSources);
nestedFunctionExtraSourceAfterCacheWarmup.baseBuild.controls[0].controller = () => 'external';
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, nestedFunctionExtraSourceAfterCacheWarmup),
  /unsupported JSON value type function/,
  'nested function-valued v45 source extra key reused cached validation'
);

const nestedNonEnumerableSourceAfterCacheWarmup = clone(baseSources);
Object.defineProperty(nestedNonEnumerableSourceAfterCacheWarmup.baseBuild.controls[0], 'controller', { value: undefined, enumerable: false, configurable: true });
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, nestedNonEnumerableSourceAfterCacheWarmup),
  /must be an enumerable data property/,
  'nested non-enumerable v45 source key reused cached validation'
);

const nestedSymbolSourceAfterCacheWarmup = clone(baseSources);
nestedSymbolSourceAfterCacheWarmup.baseBuild.controls[0][Symbol('controller')] = undefined;
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, nestedSymbolSourceAfterCacheWarmup),
  /must not contain symbol keys/,
  'nested symbol v45 source key reused cached validation'
);

const nestedAccessorSourceAfterCacheWarmup = clone(baseSources);
Object.defineProperty(nestedAccessorSourceAfterCacheWarmup.baseBuild.controls[0], 'controller', { get: () => undefined, enumerable: true, configurable: true });
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, nestedAccessorSourceAfterCacheWarmup),
  /must be an enumerable data property/,
  'nested accessor v45 source key reused cached validation'
);

const cyclicSourceAfterCacheWarmup = clone(baseSources);
cyclicSourceAfterCacheWarmup.baseBuild.controls[0].cycle = cyclicSourceAfterCacheWarmup.baseBuild.controls[0];
assert.throws(
  () => compilePreferenceCustodyManifestV46(manifest, baseBuild, targetBuild, targetFixture, cyclicSourceAfterCacheWarmup),
  /repeated or cyclic object/,
  'cyclic v45 source reached canonical cache hashing'
);

const deepExtraKeyBaseSources = clone(baseSources);
"""
test = replace_once(test, explicit_anchor, explicit_replacement, "explicit cache refusal insertion")

source_mutation_anchor = """  ['deep extra source field', x => x.baseSources.baseSources.controller = 'external'],
"""
source_mutation_replacement = source_mutation_anchor + """  ['nested source undefined extra key after cache warmup', x => x.baseBuild.controls[0].controller = undefined],
  ['nested source function extra key after cache warmup', x => x.baseBuild.controls[0].controller = () => 'external'],
  ['nested source non-enumerable extra key after cache warmup', x => Object.defineProperty(x.baseBuild.controls[0], 'controller', { value: undefined, enumerable: false, configurable: true })],
  ['nested source symbol extra key after cache warmup', x => x.baseBuild.controls[0][Symbol('controller')] = undefined],
  ['nested source accessor after cache warmup', x => Object.defineProperty(x.baseBuild.controls[0], 'controller', { get: () => undefined, enumerable: true, configurable: true })],
  ['nested source cycle after cache warmup', x => x.baseBuild.controls[0].cycle = x.baseBuild.controls[0]],
"""
test = replace_once(test, source_mutation_anchor, source_mutation_replacement, "base source mutation expansion")

console_anchor = """console.log(`Preference custody floor v46 adversarial tests: PASS (${cases.length} mutations plus unqualified-v45-base and unhashable-cache-key compile refusals, chronology-bound fresh-manifest, fresh-PC-48, stale-build, and transitive-source succession checks)`);
"""
console_replacement = """console.log(`Preference custody floor v46 adversarial tests: PASS (${cases.length} mutations plus unqualified-v45-base and recursive cache-safety compile refusals, chronology-bound fresh-manifest, fresh-PC-48, stale-build, and transitive-source succession checks)`);
"""
test = replace_once(test, console_anchor, console_replacement, "test summary replacement")

LIB_PATH.write_text(lib)
TEST_PATH.write_text(test)
