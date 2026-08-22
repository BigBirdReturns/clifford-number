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
        """            gh api \\
              "repos/${GITHUB_REPOSITORY}/actions/artifacts/${artifact_id}/zip" \\
              > "$previous_dir/artifact.zip"
            unzip -q "$previous_dir/artifact.zip" -d "$previous_dir/extracted"
            candidate="$(find "$previous_dir/extracted" -type f -name 'm05-five-domain-route-watch-receipt.json' -print -quit)"
            if [[ -z "$candidate" ]]; then
              echo "Prior successful run ${run_id} has a malformed watcher artifact" >&2
              exit 2
            fi
            if node tools/validate-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs --receipt "$candidate"; then
              cp "$candidate" "$previous_dir/previous-receipt.json"
              echo "previous_receipt=$previous_dir/previous-receipt.json" >> "$GITHUB_OUTPUT"
              echo "previous_run_id=$run_id" >> "$GITHUB_OUTPUT"
              exit 0
            fi
            echo "::notice::Skipping prior run ${run_id} because its receipt is incompatible with the current contract"
""",
        """            gh api \\
              "repos/${GITHUB_REPOSITORY}/actions/artifacts/${artifact_id}/zip" \\
              > "$previous_dir/artifact.zip"
            unzip -tq "$previous_dir/artifact.zip" >/dev/null
            unzip -q "$previous_dir/artifact.zip" -d "$previous_dir/extracted"
            mapfile -t candidates < <(find "$previous_dir/extracted" -type f -name 'm05-five-domain-route-watch-receipt.json' -print)
            if [[ "${#candidates[@]}" -ne 1 ]]; then
              echo "Prior successful run ${run_id} has ${#candidates[@]} watcher receipts; exactly one is required" >&2
              exit 2
            fi
            candidate="${candidates[0]}"
            compatibility="$(node --input-type=module - "$candidate" <<'NODE'
            import fs from 'node:fs';
            import {canonicalJson,semanticSha256,sha256} from './tools/lib/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs';
            const receipt=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
            const contract=JSON.parse(fs.readFileSync('data/project/m05-answerable-power-sprint-03-leg-07-five-domain-route-watch-contract.json','utf8'));
            if(receipt?.schema_version!=='m05-answerable-power-s03-l7-five-domain-route-watch-receipt@1')throw new Error('prior receipt schema is malformed');
            if(receipt?.object_class!=='bounded_five_domain_official_route_watch_receipt')throw new Error('prior receipt object class is malformed');
            if(!/^[0-9a-f]{64}$/u.test(receipt?.contract_semantic_sha256||''))throw new Error('prior contract digest is malformed');
            const {proof_sha256:proof,...core}=receipt;
            if(!/^[0-9a-f]{64}$/u.test(proof||''))throw new Error('prior receipt proof is malformed');
            if(proof!==sha256(Buffer.from(canonicalJson(core),'utf8')))throw new Error('prior receipt proof does not recompute');
            process.stdout.write(receipt.contract_semantic_sha256===semanticSha256(contract)?'compatible':'incompatible');
            NODE
            )"
            if [[ "$compatibility" == 'incompatible' ]]; then
              echo "::notice::Skipping prior run ${run_id} because its authenticated receipt targets a different contract"
              continue
            fi
            node tools/validate-m05-answerable-power-sprint-03-leg-07-five-domain-route-watch.mjs --receipt "$candidate"
            cp "$candidate" "$previous_dir/previous-receipt.json"
            echo "previous_receipt=$previous_dir/previous-receipt.json" >> "$GITHUB_OUTPUT"
            echo "previous_run_id=$run_id" >> "$GITHUB_OUTPUT"
            exit 0
""",
        "workflow prior-artifact fail closure",
    )
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
        "assert(workflow.includes('status=success'));\nassert(!workflow.includes('branch=main&status=success'));\nassert(workflow.includes('select(.head_branch==\"main\")'));\nassert(workflow.includes('unzip -tq'));\nassert(workflow.includes('exactly one is required'));\nassert(workflow.includes('prior receipt proof does not recompute'));\nassert(workflow.includes(\"compatibility == 'incompatible'\"));\n",
        "workflow run-selection assertions",
    )
    test_path.write_text(test)


if __name__ == "__main__":
    main()
