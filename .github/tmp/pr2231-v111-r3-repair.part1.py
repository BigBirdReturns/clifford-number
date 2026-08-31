function collectPhoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
  const previousWork = activePhoneRedactionWork;
  const work = {
    rootLength: candidate.length,
    queue: [{
      candidate,
      externalPrefix,
      externalSuffix,
      allowInitialGroup,
      indeterminatePhoneContext,
      inheritedExplicitPhoneLabelContext,
      offset: 0
    }],
    cursor: 0,
    current: null,
    ranges: []
  };
  activePhoneRedactionWork = work;
  try {
    while (work.cursor < work.queue.length) {
      if (work.queue.length > work.rootLength + 1) {
        throw new Error('phone redaction worklist failed to make source progress');
      }
      const task = work.queue[work.cursor++];
      work.current = task;
      const localRanges = phoneRedactionRangesStep(
        task.candidate,
        task.externalPrefix,
        task.externalSuffix,
        task.allowInitialGroup,
        task.indeterminatePhoneContext,
        task.inheritedExplicitPhoneLabelContext
      );
      work.ranges.push(...localRanges.map(range => ({
        start: range.start + task.offset,
        end: range.end + task.offset
      })));
    }
    const seen = new Set();
    return work.ranges
      .sort((left, right) => left.start - right.start || left.end - right.end)
      .filter(range => {
        const key = `${range.start}:${range.end}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  } finally {
    activePhoneRedactionWork = previousWork;
  }
}

function phoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
  if (activePhoneRedactionWork) {
    const current = activePhoneRedactionWork.current;
    const relativeOffset = current.candidate.length - candidate.length;
    if (relativeOffset <= 0
        || current.candidate.slice(relativeOffset) !== candidate) {
      throw new Error('phone redaction continuation is not a strict source suffix');
    }
    activePhoneRedactionWork.queue.push({
      candidate,
      externalPrefix,
      externalSuffix,
      allowInitialGroup,
      indeterminatePhoneContext,
      inheritedExplicitPhoneLabelContext,
      offset: current.offset + relativeOffset
    });
    return [];
  }
  return collectPhoneRedactionRanges(
    candidate,
    externalPrefix,
    externalSuffix,
    allowInitialGroup,
    indeterminatePhoneContext,
    inheritedExplicitPhoneLabelContext
  );
}

'''

    lib = once(lib,
'''function phoneRedactionRanges(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
''',
worklist + '''function phoneRedactionRangesStep(
  candidate,
  externalPrefix,
  externalSuffix,
  allowInitialGroup = true,
  indeterminatePhoneContext = false,
  inheritedExplicitPhoneLabelContext = false
) {
''', "iterative worklist")

    lib = once(lib,
'''  const groups = [...candidate.matchAll(DIGIT_RUN_PATTERN)];
  if (!groups.length) return [];

  const normalizedExternalPrefix = externalPrefix.normalize('NFKC');
''',
'''  const leadingGroups = leadingDigitGroups(candidate, 1);
  if (!leadingGroups.length) return [];

  const normalizedExternalPrefix = externalPrefix.normalize('NFKC');
''', "lazy leading census")

    lib = once(lib,
'''        candidate,
        groups,
        externalPrefix
      ) ?? leadingFormattedObservationPhoneTransition(
        candidate,
        groups,
        externalPrefix,
''',
'''        candidate,
        leadingGroups,
        externalPrefix
      ) ?? leadingFormattedObservationPhoneTransition(
        candidate,
        leadingGroups,
        externalPrefix,
''', "lazy leading transition groups")

    lib = once(lib,
'''    return [laterPhone, ...remainderRanges];
  }

  // Resolve an exact context-free telephone before a dash-attached complete
''',
'''    return [laterPhone, ...remainderRanges];
  }

  const groups = [...candidate.matchAll(DIGIT_RUN_PATTERN)];

  // Resolve an exact context-free telephone before a dash-attached complete
''', "deferred full census")

    lib = once(lib,
'''    const suffixRanges = phoneRedactionRanges(
      candidate.slice(start),
      `${externalPrefix}${protectedPrefix}`,
      externalSuffix,
      true,
      indeterminatePhoneContext
    );
''',
'''    const suffixRanges = collectPhoneRedactionRanges(
      candidate.slice(start),
      `${externalPrefix}${protectedPrefix}`,
      externalSuffix,
      true,
      indeterminatePhoneContext
    );
''', "nested suffix collector")

    marker = "// PR2231_V111_R3_FIVE_FINDING_REGRESSIONS"
    if marker in tests:
        raise SystemExit("regressions already present")
    tests += '''

// PR2231_V111_R3_FIVE_FINDING_REGRESSIONS
const v111R3SourceBoundaryInput = `Archive 90${' '.repeat(254)}03-6216-8041 people`;
const v111R3Cases = [
  ['Archive +33 1 42 68 53 00 17-20 people', 'Archive [contact omitted] 17-20 people'],
  [v111R3SourceBoundaryInput, v111R3SourceBoundaryInput.replace('03-6216-8041', '[contact omitted]')],
  ['Archive 09012345678 62-16-03-6216-8041', 'Archive [contact omitted] 62-16-[contact omitted]'],
  ['Archive 123,456.03.6216.8041', 'Archive 123,456.[contact omitted]'],
  ['Archive +33 1 42 68 53 00–2026 people', 'Archive [contact omitted]–2026 people'],
  ['Archive +33 1 42 68 53 00–17-20 people', 'Archive [contact omitted]–17-20 people'],
  ['Archive 3.12/03-6216-8041', 'Archive 3.12/03-6216-8041'],
  ['Archive 192.0.2.1/01/42/68/53/00', 'Archive 192.0.2.1/01/42/68/53/00']
];
for (const [input, expected] of v111R3Cases) {
  assert.equal(redactContactData(input), expected, `V111 R3 source custody: ${input}`);
}
const v111R3RepeatedTransitions = `Archive ${'3.14/03-6216-8041 '.repeat(1300)}`;
const v111R3RepeatedOutput = redactContactData(v111R3RepeatedTransitions);
assert.equal(v111R3RepeatedOutput.split('[contact omitted]').length - 1, 1300);
assert.equal(v111R3RepeatedOutput, `Archive ${'3.14/[contact omitted] '.repeat(1300)}`);
'''

    lib_path.write_text(lib)
    test_path.write_text(tests)
    receipt = {
        "library_sha256": digest(lib_path),
        "test_sha256": digest(test_path),
        "library_bytes": lib_path.stat().st_size,
        "test_bytes": test_path.stat().st_size,
    }
    receipt_path.parent.mkdir(parents=True, exist_ok=True)
    receipt_path.write_text(json.dumps(receipt, indent=2) + "\n")
    print(json.dumps(receipt, indent=2))


if __name__ == "__main__":
    main()
