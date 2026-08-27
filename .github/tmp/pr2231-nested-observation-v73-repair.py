#!/usr/bin/env python3
"""Materialize the bounded PR #2231 nested-observation repair on the exact v71 product head."""

from __future__ import annotations

import argparse
import os
from pathlib import Path
import subprocess
import sys
import tempfile

PRODUCT_HEAD = "8aae3b90e7506856f41e96e14c6e4727872779b8"
PRODUCT_LIBRARY_BLOB = "994ad06d13e8ea0df28b988d7ec21ddfcd1d640b"
PRODUCT_TEST_BLOB = "2629ce7d8942f75687772426c11c70bfe8fa8973"
LIBRARY_PATH = Path("tools/lib/industrial-exhaust.mjs")
TEST_PATH = Path("test/industrial-exhaust.test.js")

HELPER_ANCHOR = "function redactPhoneSpanCandidate(\n"
HELPER = r"""function nestedObservationEndAtPhoneEntry(
  candidate,
  externalPrefix,
  externalSuffix,
  inheritedExplicitPhoneLabelContext,
  localExplicitPhoneLabelContext
) {
  if (inheritedExplicitPhoneLabelContext || !localExplicitPhoneLabelContext) {
    return null;
  }

  const normalizedPrefix = externalPrefix.normalize('NFKC');
  const labelEnd = terminalIdentifierLabelEnd(
    normalizedPrefix,
    normalizedPrefix.length
  );
  const prefixOpeners = Array.from(normalizedPrefix.slice(labelEnd))
    .filter(character =>
      Object.hasOwn(OBSERVATION_WRAPPER_PAIRS, character)
    );
  if (!prefixOpeners.length) return null;

  let sourceOffset = candidate.length - candidate.trimStart().length;
  const candidateOpeners = [];
  while (sourceOffset < candidate.length) {
    const character = candidate[sourceOffset];
    const normalizedCharacter = character.normalize('NFKC');
    if (!Object.hasOwn(OBSERVATION_WRAPPER_PAIRS, normalizedCharacter)) break;
    candidateOpeners.push(normalizedCharacter);
    sourceOffset += character.length;
    while (sourceOffset < candidate.length
        && /\s/u.test(candidate[sourceOffset])) {
      sourceOffset += 1;
    }
  }

  const observationSource = candidate.slice(sourceOffset);
  const observation = numericObservationMatch(
    observationSource,
    externalSuffix
  );
  if (!observation
      || isWeakBareRangeObservation(observationSource, externalSuffix)) {
    return null;
  }

  const context = `${observationSource}${externalSuffix}`;
  let closeOffset = sourceEndForNormalizedPrefix(
    context,
    observation[0].length
  );
  const openers = [...prefixOpeners, ...candidateOpeners];
  for (let index = openers.length - 1; index >= 0; index -= 1) {
    while (closeOffset < context.length && /\s/u.test(context[closeOffset])) {
      closeOffset += 1;
    }
    const sourceCharacter = context[closeOffset] ?? '';
    if (sourceCharacter.normalize('NFKC') !== OBSERVATION_WRAPPER_PAIRS[
      openers[index]
    ]) return null;
    closeOffset += sourceCharacter.length;
  }

  return sourceOffset + closeOffset;
}

"""

CONTEXT_START = "  const allowInitialGroup = prefixContext.indeterminate\n"
CONTEXT_END = "  const ownedWrapper = findOwnedNarrativePhoneWrapper(\n"
CONTEXT_REPLACEMENT = r"""  const localExplicitPhoneLabelContext = hasPhoneLabelPrefix(prefix);
  const allowInitialGroup = prefixContext.indeterminate
    || !/[\p{L}\p{N}]/u.test(adjacentCharacter)
    || localExplicitPhoneLabelContext;
  const explicitPhoneLabelContext = inheritedExplicitPhoneLabelContext
    || localExplicitPhoneLabelContext;
  const nestedObservationEnd = nestedObservationEndAtPhoneEntry(
    candidate,
    prefix,
    suffix,
    inheritedExplicitPhoneLabelContext,
    localExplicitPhoneLabelContext
  );
  if (nestedObservationEnd !== null) {
    const protectedEnd = Math.min(nestedObservationEnd, candidate.length);
    const protectedPrefix = candidate.slice(0, protectedEnd);
    const remainder = candidate.slice(protectedEnd);
    const localRemainderRanges = nestedObservationEnd <= candidate.length
      ? phoneRedactionRanges(
          remainder,
          `${prefix}${protectedPrefix}`,
          suffix,
          true,
          false,
          false
        )
      : [];
    return {
      output: `${protectedPrefix}${renderPhoneRedactionRanges(
        remainder,
        localRemainderRanges
      )}`,
      ranges: localRemainderRanges.map(range => ({
        start: range.start + protectedEnd,
        end: range.end + protectedEnd
      })),
      explicitPhoneLabelContext: false
    };
  }
"""

TEST_ANCHOR = "const crawlerRuntimeSource = fs.readFileSync(\n"
TEST_BLOCK = r"""for (const [nestedObservationCase, input] of [
  [
    'nested ASCII date',
    'Phone: ((2026-08-17)) 12:30:45 555-1212'
  ],
  [
    'nested fullwidth date',
    '電話：（（２０２６－０８－１７）） １２：３０：４５ ５５５－１２１２'
  ],
  [
    'nested long decimal',
    'Phone: ((123456789.123456)) 12:30:45 555-1212'
  ],
  [
    'nested unit-bearing observation',
    'Phone: ((123456789 people)) 12:30:45 555-1212'
  ],
  [
    'nested mixed wrapper date',
    'Phone: [((2026-08-17))] 12:30:45 555-1212'
  ]
]) {
  assert.equal(
    redactContactData(input),
    input,
    `${nestedObservationCase}: a complete wrapped observation must revoke local phone-label authority`
  );
}

const nestedObservationThenIntrinsicPhone = redactContactData(
  'Phone: ((2026-08-17)) +81 90 1234 5678'
);
assert.ok(
  nestedObservationThenIntrinsicPhone.includes('((2026-08-17))'),
  'revoking nested-observation label authority must preserve the complete observation'
);
assert.equal(
  (nestedObservationThenIntrinsicPhone.match(/\[contact omitted\]/gu) ?? []).length,
  1,
  'a later intrinsically valid phone must still redact on its own evidence'
);
assert.doesNotMatch(
  nestedObservationThenIntrinsicPhone.normalize('NFKC'),
  /\+81 90 1234 5678/u,
  'the indepently valid later phone must not survive redaction'
);

"""


def patch_library(source: str) -> str:
    if "function nestedObservationEndAtPhoneEntry(" in source:
        raise RuntimeError("library already contains the v72 helper")
    if source.count(HELPER_ANCHOR) != 1:
        raise RuntimeError(f"helper anchor count={source.count(HELPER_ANCHOR)}")

    helper_index = source.index(HELPER_ANCHOR)
    source = source[:helper_index] + HELPER + source[helper_index:]
    function_start = source.index(HELPER_ANCHOR, helper_index + len(HELPER))

    try:
        context_start = source.index(CONTEXT_START, function_start)
        context_end = source.index(CONTEXT_END, context_start)
    except ValueError as exc:
        raise RuntimeError("redactPhoneSpanCandidate context seam is absent") from exc

    return source[:context_start] + CONTEXT_REPLACEMENT + source[context_end:]


def patch_tests(source: str) -> str:
    if "nested ASCII date" in source:
        raise RuntimeError("test file already contains the v72 regression block")
    if source.count(TEST_ANCHOR) != 1:
        raise RuntimeError(f"test anchor count={source.count(TEST_ANCHOR)}")
    index = source.index(TEST_ANCHOR)
    return source[:index] + TEST_BLOCK + source[index:]


def run(command: list[str], cwd: Path, *, capture: bool = False) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        command,
        cwd=cwd,
        check=True,
        text=True,
        capture_output=capture,
    )


def git_output(repo: Path, *args: str) -> str:
    return run(["git", *args], repo, capture=True).stdout.strip()


def atomic_write(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(prefix=f".{path.name}.", dir=path.parent)
    temporary_path = Path(temporary)
    try:
        with os.fdopen(fd, "w", encoding="utf-8", newline="") as handle:
            handle.write(content)
        temporary_path.replace(path)
    except Exception:
        temporary_path.unlink(missing_ok=True)
        raise


def verify_exact_parent(repo: Path) -> None:
    head = git_output(repo, "rev-parse", "HEAD")
    if head != PRODUCT_HEAD:
        raise RuntimeError(f"expected HEAD {PRODUCT_HEAD}, found {head}")

    library_blob = git_output(repo, "hash-object", str(LIBRARY_PATH))
    test_blob = git_output(repo, "hash-object", str(TEST_PATH))
    if library_blob != PRODUCT_LIBRARY_BLOB:
        raise RuntimeError(
            f"expected library blob {PRODUCT_LIBRARY_BLOB}, found {library_blob}"
        )
    if test_blob != PRODUCT_TEST_BLOB:
        raise RuntimeError(f"expected test blob {PRODUCT_TEST_BLOB}, found {test_blob}")

    for target in (LIBRARY_PATH, TEST_PATH):
        if subprocess.run(["git", "diff", "--quiet", "--", str(target)], cwd=repo).returncode:
            raise RuntimeError(f"working-tree mutation already exists at {target}")
        if subprocess.run(
            ["git", "diff", "--cached", "--quiet", "--", str(target)], cwd=repo
        ).returncode:
            raise RuntimeError(f"staged mutation already exists at {target}")


def materialize(repo: Path, *, run_tests: bool, release_check: bool) -> None:
    verify_exact_parent(repo)
    library = repo / LIBRARY_PATH
    tests = repo / TEST_PATH
    original_library = library.read_text(encoding="utf-8")
    original_tests = tests.read_text(encoding="utf-8")
    patched_library = patch_library(original_library)
    patched_tests = patch_tests(original_tests)

    try:
        atomic_write(library, patched_library)
        atomic_write(tests, patched_tests)
        run(["git", "diff", "--check"], repo)
        run(["node", "--check", str(LIBRARY_PATH)], repo)
        if run_tests:
            run(["node", str(TEST_PATH)], repo)
        if release_check: 
            run(["npm", "run", "release:check"], repo)
    except Exception:
        atomic_write(library, original_library)
        atomic_write(tests, original_tests)
        raise

    print("V72_PRODUCT_MATERIALIZED")
    print(f"parent={PRODUCT_HEAD}")
    print(f"library={LIBRARY_PATH}")
    print(f"tests={TEST_PATH}")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("repo", nargs="?", default=".", help="repository root")
    parser.add_argument(
        "--skip-tests",
        action="store_true",
        help="run syntax and diff checks but skip the focused Node test suite",
    )
    parser.add_argument(
        "--release-check",
        action="store_true",
        help="also run npm run release:check after the focused test suite",
   )
    return parser.parse_args()


def main() -> int:
    args = parse_args()
    repo = Path(args.repo).resolve()
    try:
        materialize(
            repo,
            run_tests=not args.skip_tests,
            release_check=args.release_check,
        )
    except (RuntimeError, subprocess.CalledProcessError, OSError) as exc:
        print(f"V72_PRODUCT_REFUSED: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
