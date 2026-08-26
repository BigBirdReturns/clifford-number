from pathlib import Path

PATH = Path("tools/lib/industrial-exhaust.mjs")
text = PATH.read_text()

constant_anchor = """const OPENING_IDENTIFIER_WRAPPER_PATTERN = /[\\(\\[\\{（［【]/u;
"""
constant_block = """const OPENING_IDENTIFIER_WRAPPER_PATTERN = /[\\(\\[\\{（［【]/u;
const CLOSING_OBSERVATION_WRAPPER_PATTERN = /[)）]/u;
"""
if text.count(constant_anchor) != 1:
    raise SystemExit(
        f"closing-wrapper constant anchor count={text.count(constant_anchor)}"
    )
text = text.replace(constant_anchor, constant_block)

gate_anchor = """    const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[first].index);
    if (!/[\\s/／.．]/u.test(separator)
        && !OPENING_IDENTIFIER_WRAPPER_PATTERN.test(
          separator.normalize('NFKC')
        )) continue;

    const remainingCandidate = candidate.slice(groups[first].index);
"""
gate_block = """    const previousEnd = groups[first - 1].index + groups[first - 1][0].length;
    const separator = candidate.slice(previousEnd, groups[first].index);
    const normalizedSeparator = separator.normalize('NFKC');
    if (!/[\\s/／.．]/u.test(separator)
        && !OPENING_IDENTIFIER_WRAPPER_PATTERN.test(normalizedSeparator)
        && !CLOSING_OBSERVATION_WRAPPER_PATTERN.test(normalizedSeparator)) {
      continue;
    }

    const remainingCandidate = candidate.slice(groups[first].index);
"""
if text.count(gate_anchor) != 1:
    raise SystemExit(
        f"closing-wrapper separator gate anchor count={text.count(gate_anchor)}"
    )
text = text.replace(gate_anchor, gate_block)

PATH.write_text(text)
