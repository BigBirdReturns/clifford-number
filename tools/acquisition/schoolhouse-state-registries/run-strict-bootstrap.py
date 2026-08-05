#!/usr/bin/env python3
"""Execute the strict runner with repaired import and name-history semantics."""

from __future__ import annotations

from pathlib import Path

TARGET = Path(__file__).with_name("run-strict.py")
source = TARGET.read_text(encoding="utf-8")
source = source.replace(
    "import re\nimport urllib.parse\n",
    "import re\nimport sys\nimport urllib.parse\n",
    1,
)
source = source.replace(
    "MODULE = importlib.util.module_from_spec(SPEC)\nSPEC.loader.exec_module(MODULE)\n",
    "MODULE = importlib.util.module_from_spec(SPEC)\n"
    "sys.modules[SPEC.name] = MODULE\n"
    "SPEC.loader.exec_module(MODULE)\n",
    1,
)
name_history_patch = r'''

def strict_merge_candidate_detail(candidate: dict[str, Any], detail: dict[str, Any]) -> dict[str, Any]:
    merged = dict(candidate)
    matched_name = MODULE.normalize_space(candidate.get("legal_name")) or None
    matched_normalized = MODULE.normalize_name(matched_name)
    current_name = MODULE.normalize_space(detail.get("legal_name")) or None
    current_normalized = MODULE.normalize_name(current_name)
    for key, value in detail.items():
        if key in {"legal_name", "normalized_name"}:
            continue
        if value is not None and merged.get(key) is None:
            merged[key] = value
    merged["matched_name_as_recorded"] = matched_name
    merged["matched_normalized_name"] = matched_normalized
    merged["current_legal_name"] = current_name
    merged["current_normalized_name"] = current_normalized
    merged["name_transition_state"] = (
        "current_name_matches_search_name"
        if current_normalized == matched_normalized
        else "historical_or_alias_name_current_name_differs"
    )
    return merged


MODULE.merge_candidate_detail = strict_merge_candidate_detail
'''
marker = "MODULE.extract_sunbiz_list_candidates = extract_sunbiz_list_candidates\n"
source = source.replace(marker, name_history_patch + "\n" + marker, 1)
if "sys.modules[SPEC.name] = MODULE" not in source:
    raise RuntimeError("strict runner bootstrap seam not found")
if "MODULE.merge_candidate_detail = strict_merge_candidate_detail" not in source:
    raise RuntimeError("strict name-history seam not found")
namespace = {
    "__name__": "__main__",
    "__file__": str(TARGET),
    "__package__": None,
}
exec(compile(source, str(TARGET), "exec"), namespace, namespace)
