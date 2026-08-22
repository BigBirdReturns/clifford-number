#!/usr/bin/env python3
from __future__ import annotations

import argparse
from pathlib import Path


def replace_once(text: str, old: str, new: str, label: str) -> str:
    count = text.count(old)
    if count != 1:
        raise RuntimeError(f"{label}: expected one target, found {count}")
    return text.replace(old, new, 1)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("root", type=Path)
    args = parser.parse_args()
    root = args.root.resolve()

    workflow_path = root / ".github/workflows/m05-five-domain-route-watch.yml"
    workflow = workflow_path.read_text()
    workflow = replace_once(
        workflow,
        """            gh api --method GET \\
              "repos/${GITHUB_REPOSITORY}/actions/workflows/m05-five-domain-route-watch.yml/runs?branch=main&status=success&per_page=30" \\
              --jq '.workflow_runs[].id'
""",
        """            gh api --method GET --paginate \\
              "repos/${GITHUB_REPOSITORY}/actions/workflows/m05-five-domain-route-watch.yml/runs?status=success&per_page=100" \\
              --jq '.workflow_runs[] | select(.head_branch=="main") | .id'
""",
        "workflow main-run selection",
    )
    workflow_path.write_text(workflow)

    test_path = root / "test/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.test.js"
    test = test_path.read_text()
    test = replace_once(
        test,
        "assert(workflow.includes('status=success'));\n",
        "assert(workflow.includes('status=success'));\nassert(!workflow.includes('branch=main&status=success'));\nassert(workflow.includes('select(.head_branch==\"main\")'));\n",
        "workflow run-selection assertions",
    )
    test_path.write_text(test)


if __name__ == "__main__":
    main()
