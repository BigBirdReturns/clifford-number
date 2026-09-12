import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const BUILD_CLOCK_SCHEMA = 'clifford-build-clock@1';
export const BUILD_CLOCK_PATH = 'data/project/build-clock.json';

export function parseSourceEpoch(value) {
  if (typeof value !== 'string' || !/^[0-9]+$/u.test(value)) {
    throw new Error('SOURCE_DATE_EPOCH must be nonnegative integer Unix seconds');
  }
  const epoch = Number(value);
  if (!Number.isSafeInteger(epoch) || epoch > 253402300799) {
    throw new Error('SOURCE_DATE_EPOCH is outside the supported UTC range');
  }
  return epoch;
}

export function validateBuildClock(clock) {
  if (!clock || clock.schema_version !== BUILD_CLOCK_SCHEMA) {
    throw new Error(`build clock must use ${BUILD_CLOCK_SCHEMA}`);
  }
  const epoch = parseSourceEpoch(clock.source_date_epoch);
  const timestamp = new Date(epoch * 1000).toISOString();
  if (clock.timestamp !== timestamp) {
    throw new Error(`build clock timestamp mismatch: expected ${timestamp}`);
  }
  if (clock.not_evidence_date !== true) {
    throw new Error('build clock must preserve the not_evidence_date boundary');
  }
  return { ...clock, epoch, timestamp };
}

export function readBuildClock({ root = defaultRoot, readFileSync = fs.readFileSync } = {}) {
  const file = path.join(root, BUILD_CLOCK_PATH);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(file, 'utf8'));
  } catch (error) {
    throw new Error(`cannot read admitted build clock ${BUILD_CLOCK_PATH}: ${error.message}`, { cause: error });
  }
  return validateBuildClock(parsed);
}

export function sourceEpoch({ env = process.env, clock = readBuildClock() } = {}) {
  const admitted = validateBuildClock(clock).epoch;
  if (env.SOURCE_DATE_EPOCH === undefined) return admitted;
  const explicit = parseSourceEpoch(env.SOURCE_DATE_EPOCH);
  if (explicit !== admitted) {
    throw new Error(`SOURCE_DATE_EPOCH ${explicit} does not match admitted release input ${admitted}`);
  }
  return explicit;
}

export function buildTimestamp(options = {}) {
  return new Date(sourceEpoch(options) * 1000).toISOString();
}
