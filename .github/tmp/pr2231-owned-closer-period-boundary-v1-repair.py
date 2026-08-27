#!/usr/bin/env python3
from pathlib import Path


def replace_once(path: Path, old: str, new: str, label: str) -> None:
    text = path.read_text(encoding="utf-8")
    count = text.count(old)
    if count != 1:
        raise SystemExit(f"{label}: expected exactly one anchor, found {count}")
    path.write_text(text.replace(old, new), encoding="utf-8")


lib = Path("tools/lib/industrial-exhaust.mjs")
test = Path("test/industrial-exhaust.test.js")

replace_once(
    lib,
    """function hasFreshCrossCallbackNarrativeBoundary(value) {\n  const normalized = value.normalize('NFKC');\n  return /[\\r\\n!?。！？]/u.test(normalized)\n    || /(?:^|[^0-9])\\.\\s/u.test(normalized);\n}\n""",
    """function hasFreshCrossCallbackNarrativeBoundary(value) {\n  const normalized = value.normalize('NFKC');\n  return /[\\r\\n!?。！？]/u.test(normalized)\n    || /(?:^|[^0-9])\\.(?:\\s*[)\\]}】])*\\s/u.test(normalized);\n}\n""",
    "cross-callback narrative-boundary predicate",
)

replace_once(
    test,
    """  [\n    'fresh sentence',\n    '(Phone: 09012345678). 12:30:45 555-1212',\n    '(Phone: [contact omitted]). 12:30:45 555-1212'\n  ],\n""",
    """  [\n    'fresh sentence',\n    '(Phone: 09012345678). 12:30:45 555-1212',\n    '(Phone: [contact omitted]). 12:30:45 555-1212'\n  ],\n  [\n    'fresh sentence period before an owned closer',\n    'Context (Phone: 09012345678.) 12:30:45 555-1212',\n    'Context (Phone: [contact omitted].) 12:30:45 555-1212'\n  ],\n  [\n    'fresh sentence period before nested owned closers',\n    'Context ((Phone: 09012345678.)) 12:30:45 555-1212',\n    'Context ((Phone: [contact omitted].)) 12:30:45 555-1212'\n  ],\n  [\n    'fullwidth fresh sentence period before an owned closer',\n    '文脈（電話：０９０１２３４５６７８．） １２：３０：４５ ５５５－１２１２',\n    '文脈（電話：[contact omitted]．） １２：３０：４５ ５５５－１２１２'\n  ],\n""",
    "owned-closer period regressions",
)
